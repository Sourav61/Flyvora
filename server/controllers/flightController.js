const { pool } = require("../config/db");
const flightModel = require("../models/flightModel");
const { cleanupExpiredReservations } = require("../services/seatHoldService");

const SEAT_COLUMNS = ["A", "B", "C", "D", "E", "F"];
const CABIN_ROWS = Array.from({ length: 9 }, (_, index) => index + 10);
const isValidDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value);
const isValidTime = (value) => /^\d{2}:\d{2}$/.test(value);
const normalizeText = (value = "") => value.trim();
const normalizeEmail = (value = "") => value.trim().toLowerCase();

const searchFlights = async (req, res, next) => {
  try {
    const source = req.query.source?.trim() || "";
    const destination = req.query.destination?.trim() || "";
    const date = req.query.date?.trim() || "";
    const departureTime = req.query.departureTime?.trim() || "";
    const sortBy = req.query.sortBy?.trim() || "departure_asc";
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 6, 1), 20);
    const parsedMaxPrice = req.query.maxPrice ? Number.parseInt(req.query.maxPrice, 10) : null;
    const maxPrice = Number.isFinite(parsedMaxPrice) ? parsedMaxPrice : null;

    if (date && !isValidDate(date)) {
      return res.status(400).json({ message: "Date must be in YYYY-MM-DD format" });
    }

    if (departureTime && !isValidTime(departureTime)) {
      return res.status(400).json({ message: "Departure time must be in HH:MM format" });
    }

    if (req.query.maxPrice && maxPrice === null) {
      return res.status(400).json({ message: "Max price must be a valid number" });
    }

    const { flights, total } = await flightModel.searchFlights({
      source,
      destination,
      date,
      departureTime,
      maxPrice,
      sortBy,
      page,
      limit,
    });

    return res.status(200).json({
      flights,
      filters: {
        source,
        destination,
        date,
        departureTime,
        maxPrice,
        sortBy,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    });
  } catch (error) {
    return next(error);
  }
};

const getFlightSeatMap = async (req, res, next) => {
  try {
    const flightId = Number.parseInt(req.params.flightId, 10);
    const providerUserId = normalizeText(req.query.providerUserId || "");
    const travelerEmail = normalizeEmail(req.query.email || "");

    if (!Number.isInteger(flightId) || flightId <= 0) {
      return res.status(400).json({ message: "Flight id must be a valid number." });
    }

    await cleanupExpiredReservations();

    const flightResult = await pool.query(
      `
        SELECT id
        FROM flights
        WHERE id = $1
        LIMIT 1
      `,
      [flightId]
    );

    if (!flightResult.rows[0]) {
      return res.status(404).json({ message: "This flight is no longer available." });
    }

    await pool.query(
      `
        UPDATE seats
        SET status = 'available',
            reserved_until = NULL
        WHERE flight_id = $1
          AND status = 'reserved'
          AND reserved_until IS NOT NULL
          AND reserved_until <= CURRENT_TIMESTAMP
      `,
      [flightId]
    );

    const seatResult = await pool.query(
      `
        SELECT
          seats.seat_number,
          seats.status,
          seats.reserved_until,
          COALESCE(active_booking.reserved_by_current_traveler, FALSE) AS reserved_by_current_traveler
        FROM seats
        LEFT JOIN LATERAL (
          SELECT
            CASE
              WHEN (($2 <> '' AND bookings.provider_user_id = $2) OR ($3 <> '' AND bookings.traveler_email = $3))
              THEN TRUE
              ELSE FALSE
            END AS reserved_by_current_traveler
          FROM bookings
          WHERE bookings.seat_id = seats.id
            AND bookings.status IN ('reserved', 'payment_pending')
            AND COALESCE(
              bookings.hold_expires_at,
              bookings.created_at + INTERVAL '5 minutes'
            ) > CURRENT_TIMESTAMP
          ORDER BY bookings.updated_at DESC NULLS LAST, bookings.id DESC
          LIMIT 1
        ) active_booking ON TRUE
        WHERE seats.flight_id = $1
      `,
      [flightId, providerUserId, travelerEmail]
    );

    let activeReservation = null;

    if (providerUserId || travelerEmail) {
      const activeReservationResult = await pool.query(
        `
          SELECT
            bookings.id,
            bookings.seat_number,
            COALESCE(
              bookings.hold_expires_at,
              bookings.created_at + INTERVAL '5 minutes'
            ) AS hold_expires_at
          FROM bookings
          WHERE bookings.flight_id = $1
            AND bookings.status IN ('reserved', 'payment_pending')
            AND (($2 <> '' AND bookings.provider_user_id = $2) OR ($3 <> '' AND bookings.traveler_email = $3))
            AND COALESCE(
              bookings.hold_expires_at,
              bookings.created_at + INTERVAL '5 minutes'
            ) > CURRENT_TIMESTAMP
          ORDER BY bookings.updated_at DESC NULLS LAST, bookings.id DESC
          LIMIT 1
        `,
        [flightId, providerUserId, travelerEmail]
      );

      const reservationRow = activeReservationResult.rows[0];

      if (reservationRow) {
        activeReservation = {
          bookingId: reservationRow.id,
          seatCode: reservationRow.seat_number,
          holdExpiresAt: reservationRow.hold_expires_at,
        };
      }
    }

    const seatLookup = new Map(
      seatResult.rows.map((seat) => [String(seat.seat_number || "").toUpperCase(), seat])
    );
    const seats = CABIN_ROWS.flatMap((rowNumber) =>
      SEAT_COLUMNS.map((column) => {
        const seatCode = `${rowNumber}${column}`;
        const storedSeat = seatLookup.get(seatCode);
        const reservedUntil = storedSeat?.reserved_until ? new Date(storedSeat.reserved_until) : null;
        const hasActiveReservation = Boolean(
          storedSeat?.status === "reserved" && reservedUntil && reservedUntil.getTime() > Date.now()
        );
        const normalizedStatus =
          storedSeat?.status === "booked"
            ? "booked"
            : hasActiveReservation
              ? "reserved"
              : "available";

        return {
          seatCode,
          status: normalizedStatus,
          isOccupied: normalizedStatus === "booked",
          reservedUntil: hasActiveReservation ? storedSeat?.reserved_until || null : null,
          reservedByCurrentTraveler: hasActiveReservation && Boolean(storedSeat?.reserved_by_current_traveler),
        };
      })
    );

    return res.status(200).json({
      activeReservation,
      flightId,
      seats,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getFlightSeatMap,
  searchFlights,
};
