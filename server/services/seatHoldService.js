const { pool } = require("../config/db");

const HOLD_WINDOW_MINUTES = 5;
const CLEANUP_INTERVAL_MS = 5 * 1000;
const HOLD_WINDOW_INTERVAL_SQL = `INTERVAL '${HOLD_WINDOW_MINUTES} minutes'`;
const ACTIVE_RESERVATION_STATUSES = ["reserved", "payment_pending"];
const PENDING_PAYMENT_STATUSES = ["created", "processing", "pending"];
const BOOKING_HOLD_EXPIRY_EXPRESSION = `COALESCE(bookings.hold_expires_at, bookings.created_at + ${HOLD_WINDOW_INTERVAL_SQL})`;
let cleanupJobStarted = false;
let cleanupJobHandle = null;

const getHoldExpiresAt = () => new Date(Date.now() + HOLD_WINDOW_MINUTES * 60 * 1000);

const reserveSeatRecord = async ({ client, flightId, seatCode, holdExpiresAt }) => {
  const seatResult = await client.query(
    `
      SELECT id, status, reserved_until
      FROM seats
      WHERE flight_id = $1 AND seat_number = $2
      LIMIT 1
      FOR UPDATE
    `,
    [flightId, seatCode]
  );

  const existingSeat = seatResult.rows[0];

  if (!existingSeat) {
    const insertedSeat = await client.query(
      `
        INSERT INTO seats (flight_id, seat_number, status, reserved_until)
        VALUES ($1, $2, 'reserved', $3)
        RETURNING id, status, reserved_until
      `,
      [flightId, seatCode, holdExpiresAt]
    );

    return insertedSeat.rows[0];
  }

  const reservedUntil = existingSeat.reserved_until ? new Date(existingSeat.reserved_until) : null;
  const now = new Date();

  if (existingSeat.status === "booked") {
    const error = new Error("That seat was just booked by another traveler. Please choose another seat.");
    error.statusCode = 409;
    throw error;
  }

  if (existingSeat.status === "reserved" && reservedUntil && reservedUntil > now) {
    const error = new Error("That seat is being secured by another traveler right now. Please pick a different seat.");
    error.statusCode = 409;
    throw error;
  }

  const updatedSeat = await client.query(
    `
      UPDATE seats
      SET status = 'reserved',
          reserved_until = $2
      WHERE id = $1
      RETURNING id, status, reserved_until
    `,
    [existingSeat.id, holdExpiresAt]
  );

  return updatedSeat.rows[0];
};

const releaseSeatIfNeeded = async ({ client, seatId }) => {
  if (!seatId) {
    return;
  }

  await client.query(
    `
      UPDATE seats
      SET status = 'available',
          reserved_until = NULL
      WHERE id = $1 AND status <> 'booked'
    `,
    [seatId]
  );
};

const cleanupExpiredReservations = async ({ client } = {}) => {
  const dbClient = client || (await pool.connect());
  const manageTransaction = !client;

  try {
    if (manageTransaction) {
      await dbClient.query("BEGIN");
    }

    await dbClient.query(
      `
        WITH expired_bookings AS (
          SELECT DISTINCT bookings.id, bookings.seat_id
          FROM bookings
          LEFT JOIN payments ON payments.booking_id = bookings.id
          WHERE bookings.status = ANY($1::text[])
            AND ${BOOKING_HOLD_EXPIRY_EXPRESSION} <= CURRENT_TIMESTAMP
            AND (
              payments.status IS NULL
              OR payments.status = ANY($2::text[])
              OR bookings.status = 'reserved'
            )
        ), released_seats AS (
          UPDATE seats
          SET status = 'available',
              reserved_until = NULL
          WHERE id IN (SELECT seat_id FROM expired_bookings)
            AND status <> 'booked'
          RETURNING id
        )
        DELETE FROM bookings
        WHERE id IN (SELECT id FROM expired_bookings)
      `,
      [ACTIVE_RESERVATION_STATUSES, PENDING_PAYMENT_STATUSES]
    );

    await dbClient.query(
      `
        UPDATE seats
        SET status = 'available',
            reserved_until = NULL
        WHERE status = 'reserved'
          AND reserved_until IS NOT NULL
          AND reserved_until <= CURRENT_TIMESTAMP
      `
    );

    if (manageTransaction) {
      await dbClient.query("COMMIT");
    }
  } catch (error) {
    if (manageTransaction) {
      await dbClient.query("ROLLBACK");
    }

    throw error;
  } finally {
    if (!client) {
      dbClient.release();
    }
  }
};

const startSeatHoldCleanupJob = () => {
  if (cleanupJobStarted) {
    return cleanupJobHandle;
  }

  cleanupJobStarted = true;
  cleanupJobHandle = setInterval(() => {
    cleanupExpiredReservations().catch((error) => {
      console.error("Seat hold cleanup failed:", error.message);
    });
  }, CLEANUP_INTERVAL_MS);

  if (typeof cleanupJobHandle.unref === "function") {
    cleanupJobHandle.unref();
  }

  return cleanupJobHandle;
};

module.exports = {
  ACTIVE_RESERVATION_STATUSES,
  BOOKING_HOLD_EXPIRY_EXPRESSION,
  CLEANUP_INTERVAL_MS,
  HOLD_WINDOW_MINUTES,
  PENDING_PAYMENT_STATUSES,
  cleanupExpiredReservations,
  getHoldExpiresAt,
  releaseSeatIfNeeded,
  reserveSeatRecord,
  startSeatHoldCleanupJob,
};



