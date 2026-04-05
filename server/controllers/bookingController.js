const { pool } = require("../config/db");
const { calculateCheckoutPricing } = require("../utils/checkoutPricing");
const {
  ACTIVE_RESERVATION_STATUSES,
  BOOKING_HOLD_EXPIRY_EXPRESSION,
  PENDING_PAYMENT_STATUSES,
  cleanupExpiredReservations,
  getHoldExpiresAt,
  releaseSeatIfNeeded,
  reserveSeatRecord,
} = require("../services/seatHoldService");

const normalizeText = (value = "") => value.trim();
const normalizeEmail = (value = "") => value.trim().toLowerCase();

const buildFlightPayload = (row) => {
  if (row.flight_snapshot && Object.keys(row.flight_snapshot).length > 0) {
    return row.flight_snapshot;
  }

  return {
    id: row.flight_id,
    source: row.source,
    destination: row.destination,
    departure_time: row.departure_time,
    arrival_time: row.arrival_time,
    price: row.price,
  };
};

const mapBookingRecord = (row) => ({
  id: row.id,
  bookingReference: row.booking_reference,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  holdExpiresAt: row.hold_expires_at,
  traveler: {
    name: row.traveler_name,
    email: row.traveler_email,
    phone: row.traveler_phone,
  },
  flight: buildFlightPayload(row),
  seatCode: row.seat_number,
  cabinClass: row.cabin_class,
  travelersCount: row.travelers_count,
  fare: {
    baseFare: Number(row.base_fare),
    taxesAndFees: Number(row.taxes_and_fees),
    serviceFee: Number(row.service_fee),
    seatFee: Number(row.seat_fee),
    totalAmount: Number(row.total_amount),
    currency: row.currency,
  },
  payment: {
    status: row.payment_status || "pending",
    providerPaymentId: row.provider_payment_id || null,
    providerOrderId: row.provider_order_id || null,
    method: row.provider_method || null,
  },
  searchState: row.search_snapshot || null,
});

const getFlightById = async (client, flightId) => {
  const result = await client.query(
    `
      SELECT id, source, destination, departure_time, arrival_time, price
      FROM flights
      WHERE id = $1
      LIMIT 1
    `,
    [flightId]
  );

  return result.rows[0] || null;
};

const clearTravelerActiveReservations = async ({ client, flightId, providerUserId, email }) => {
  if (!providerUserId && !email) {
    return;
  }

  const existingReservations = await client.query(
    `
      SELECT bookings.id, bookings.seat_id
      FROM bookings
      WHERE bookings.flight_id = $1
        AND (($2 <> '' AND bookings.provider_user_id = $2) OR ($3 <> '' AND bookings.traveler_email = $3))
        AND bookings.status = ANY($4::text[])
        AND (
          bookings.status = 'reserved'
          OR NOT EXISTS (
            SELECT 1
            FROM payments
            WHERE payments.booking_id = bookings.id
              AND payments.status <> ALL($5::text[])
          )
        )
      FOR UPDATE
    `,
    [flightId, providerUserId, email, ACTIVE_RESERVATION_STATUSES, PENDING_PAYMENT_STATUSES]
  );

  for (const reservation of existingReservations.rows) {
    await releaseSeatIfNeeded({ client, seatId: reservation.seat_id });
  }

  const reservationIds = existingReservations.rows.map((reservation) => reservation.id);

  if (reservationIds.length > 0) {
    await client.query(`DELETE FROM bookings WHERE id = ANY($1::int[])`, [reservationIds]);
  }
};

const reserveBookingSeat = async (req, res, next) => {
  const client = await pool.connect();

  try {
    const {
      flightId,
      seatCode,
      selectedFlight = {},
      searchState = {},
      traveler = {},
    } = req.body || {};

    const parsedFlightId = Number.parseInt(flightId, 10);
    const normalizedSeatCode = normalizeText(seatCode).toUpperCase();
    const providerUserId = normalizeText(traveler.providerUserId || "");
    const travelerEmail = normalizeEmail(traveler.email || "");
    const travelerName = normalizeText(traveler.name || travelerEmail || "Traveler");

    if (!Number.isInteger(parsedFlightId) || parsedFlightId <= 0 || !normalizedSeatCode) {
      return res.status(400).json({ message: "Flight and seat are required to reserve the booking." });
    }

    if (!providerUserId && !travelerEmail) {
      return res.status(400).json({ message: "Traveler identity is required to reserve a seat." });
    }

    await client.query("BEGIN");
    await cleanupExpiredReservations({ client });

    const flight = await getFlightById(client, parsedFlightId);

    if (!flight) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "This flight is no longer available." });
    }

    await clearTravelerActiveReservations({
      client,
      flightId: parsedFlightId,
      providerUserId,
      email: travelerEmail,
    });

    const holdExpiresAt = getHoldExpiresAt();
    const seatRecord = await reserveSeatRecord({
      client,
      flightId: parsedFlightId,
      seatCode: normalizedSeatCode,
      holdExpiresAt,
    });
    const pricing = calculateCheckoutPricing({
      flightPrice: flight.price,
      travelers: searchState.travelers || {},
      seatCode: normalizedSeatCode,
    });

    const bookingResult = await client.query(
      `
        INSERT INTO bookings (
          user_id,
          flight_id,
          seat_id,
          status,
          traveler_name,
          traveler_email,
          provider_user_id,
          cabin_class,
          travelers_count,
          seat_number,
          base_fare,
          taxes_and_fees,
          service_fee,
          seat_fee,
          total_amount,
          currency,
          search_snapshot,
          flight_snapshot,
          hold_expires_at,
          updated_at
        )
        VALUES (
          NULL,
          $1,
          $2,
          'reserved',
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11,
          $12,
          $13,
          $14,
          $15::jsonb,
          $16::jsonb,
          $17,
          CURRENT_TIMESTAMP
        )
        RETURNING id, status, hold_expires_at
      `,
      [
        parsedFlightId,
        seatRecord.id,
        travelerName,
        travelerEmail || null,
        providerUserId || null,
        normalizeText(searchState?.travelers?.cabinClass || "Economy"),
        pricing.travelerCount,
        normalizedSeatCode,
        pricing.baseFareTotal,
        pricing.taxesAndFees,
        pricing.serviceFee,
        pricing.seatFee,
        pricing.totalAmount,
        pricing.currency,
        JSON.stringify(searchState || {}),
        JSON.stringify(selectedFlight || {}),
        holdExpiresAt,
      ]
    );

    await client.query("COMMIT");

    return res.status(200).json({
      message: "Seat reserved successfully.",
      booking: {
        id: bookingResult.rows[0].id,
        status: bookingResult.rows[0].status,
        seatCode: normalizedSeatCode,
        holdExpiresAt: bookingResult.rows[0].hold_expires_at,
      },
      pricing,
    });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      // no-op
    }

    return next(error);
  } finally {
    client.release();
  }
};

const getTravelerBookings = async (req, res, next) => {
  const client = await pool.connect();
  let hasTransaction = false;

  try {
    const providerUserId = normalizeText(req.query.providerUserId || "");
    const email = normalizeEmail(req.query.email || "");

    if (!providerUserId && !email) {
      return res.status(400).json({ message: "Traveler identity is required to load bookings." });
    }

    await client.query("BEGIN");
    hasTransaction = true;
    await cleanupExpiredReservations({ client });

    const result = await client.query(
      `
        SELECT
          bookings.id,
          bookings.flight_id,
          bookings.status,
          bookings.booking_reference,
          bookings.traveler_name,
          bookings.traveler_email,
          bookings.traveler_phone,
          bookings.cabin_class,
          bookings.travelers_count,
          bookings.seat_number,
          bookings.base_fare,
          bookings.taxes_and_fees,
          bookings.service_fee,
          bookings.seat_fee,
          bookings.total_amount,
          bookings.currency,
          bookings.search_snapshot,
          bookings.flight_snapshot,
          ${BOOKING_HOLD_EXPIRY_EXPRESSION} AS hold_expires_at,
          bookings.created_at,
          bookings.updated_at,
          payments.status AS payment_status,
          payments.provider_payment_id,
          payments.provider_order_id,
          payments.provider_method,
          flights.source,
          flights.destination,
          flights.departure_time,
          flights.arrival_time,
          flights.price
        FROM bookings
        LEFT JOIN payments ON payments.booking_id = bookings.id
        LEFT JOIN flights ON flights.id = bookings.flight_id
        WHERE (($1 <> '' AND bookings.provider_user_id = $1) OR ($2 <> '' AND bookings.traveler_email = $2))
          AND bookings.status <> 'reserved'
        ORDER BY bookings.created_at DESC
      `,
      [providerUserId, email]
    );

    await client.query("COMMIT");
    hasTransaction = false;

    return res.status(200).json({
      bookings: result.rows.map(mapBookingRecord),
    });
  } catch (error) {
    if (hasTransaction) {
      await client.query("ROLLBACK");
    }

    return next(error);
  } finally {
    client.release();
  }
};

module.exports = {
  getTravelerBookings,
  reserveBookingSeat,
};

