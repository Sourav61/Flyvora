const { Pool } = require("pg");
const { comparePassword, hashPassword } = require("../utils/password");

const DEFAULT_ADMIN_SEED_EMAIL = "souravpahwa9@gmail.com";
const DEFAULT_ADMIN_SEED_PASSWORD = "flyvora-admin";

const normalizeEmail = (value = "") => String(value).trim().toLowerCase();

const getPoolConfig = () => {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : false,
    };
  }

  return {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "travel_pro",
  };
};

const pool = new Pool(getPoolConfig());

const ensureSeedAdminUser = async () => {
  const adminEmail = normalizeEmail(process.env.ADMIN_SEED_EMAIL || DEFAULT_ADMIN_SEED_EMAIL);
  const adminPassword = String(process.env.ADMIN_SEED_PASSWORD || DEFAULT_ADMIN_SEED_PASSWORD);

  if (!adminEmail || !adminPassword) {
    return;
  }

  const existingAdminResult = await pool.query(
    `
      SELECT id, password_hash
      FROM admin_users
      WHERE email = $1
    `,
    [adminEmail]
  );

  const existingAdmin = existingAdminResult.rows[0];

  if (!existingAdmin) {
    const passwordHash = await hashPassword(adminPassword);

    await pool.query(
      `
        INSERT INTO admin_users (email, password_hash)
        VALUES ($1, $2)
      `,
      [adminEmail, passwordHash]
    );

    return;
  }

  const isPasswordCurrent = await comparePassword(adminPassword, existingAdmin.password_hash);

  if (isPasswordCurrent) {
    return;
  }

  const passwordHash = await hashPassword(adminPassword);

  await pool.query(
    `
      UPDATE admin_users
      SET password_hash = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `,
    [existingAdmin.id, passwordHash]
  );
};

const initializeDatabase = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS flights (
      id SERIAL PRIMARY KEY,
      source VARCHAR(100) NOT NULL,
      destination VARCHAR(100) NOT NULL,
      departure_time TIMESTAMP NOT NULL,
      arrival_time TIMESTAMP NOT NULL,
      price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS seats (
      id SERIAL PRIMARY KEY,
      flight_id INTEGER NOT NULL REFERENCES flights(id) ON DELETE CASCADE,
      seat_number VARCHAR(10) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'available',
      reserved_until TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (flight_id, seat_number)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bookings (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      flight_id INTEGER NOT NULL REFERENCES flights(id) ON DELETE CASCADE,
      seat_id INTEGER NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
      amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`ALTER TABLE bookings ALTER COLUMN user_id DROP NOT NULL`);

  await pool.query(`
    ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS booking_reference VARCHAR(40),
    ADD COLUMN IF NOT EXISTS traveler_name VARCHAR(120),
    ADD COLUMN IF NOT EXISTS traveler_email VARCHAR(255),
    ADD COLUMN IF NOT EXISTS traveler_phone VARCHAR(32),
    ADD COLUMN IF NOT EXISTS provider_user_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS cabin_class VARCHAR(40) DEFAULT 'Economy',
    ADD COLUMN IF NOT EXISTS travelers_count INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS seat_number VARCHAR(10),
    ADD COLUMN IF NOT EXISTS base_fare NUMERIC(10, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS taxes_and_fees NUMERIC(10, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS service_fee NUMERIC(10, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS seat_fee NUMERIC(10, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    ADD COLUMN IF NOT EXISTS search_snapshot JSONB,
    ADD COLUMN IF NOT EXISTS flight_snapshot JSONB,
    ADD COLUMN IF NOT EXISTS hold_expires_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `);

  await pool.query(`
    ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS provider VARCHAR(40) DEFAULT 'dodo_payments',
    ADD COLUMN IF NOT EXISTS currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    ADD COLUMN IF NOT EXISTS receipt VARCHAR(40),
    ADD COLUMN IF NOT EXISTS provider_order_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS provider_payment_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS provider_signature TEXT,
    ADD COLUMN IF NOT EXISTS provider_method VARCHAR(40),
    ADD COLUMN IF NOT EXISTS notes JSONB,
    ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx
    ON users (email)
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS admin_users_email_unique_idx
    ON admin_users (email)
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS bookings_booking_reference_unique_idx
    ON bookings (booking_reference)
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS payments_provider_order_id_unique_idx
    ON payments (provider_order_id)
    WHERE provider_order_id IS NOT NULL
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS seats_flight_status_idx
    ON seats (flight_id, status, reserved_until)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS bookings_traveler_email_idx
    ON bookings (traveler_email)
  `);

  await ensureSeedAdminUser();
};

module.exports = {
  pool,
  initializeDatabase,
};

