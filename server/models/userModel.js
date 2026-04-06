const { pool } = require("../config/db");

const toSafeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  createdAt: user.created_at,
});

const createUser = async ({ name, email, passwordHash }) => {
  const result = await pool.query(
    `
      INSERT INTO users (name, email, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id, name, email, created_at
    `,
    [name, email, passwordHash]
  );

  return toSafeUser(result.rows[0]);
};

const findByEmail = async (email) => {
  const result = await pool.query(
    `
      SELECT id, name, email, created_at
      FROM users
      WHERE email = $1
    `,
    [email]
  );

  return result.rows[0] ? toSafeUser(result.rows[0]) : null;
};

const findByEmailWithPassword = async (email) => {
  const result = await pool.query(
    `
      SELECT id, name, email, password_hash, created_at
      FROM users
      WHERE email = $1
    `,
    [email]
  );

  return result.rows[0] || null;
};

module.exports = {
  createUser,
  findByEmail,
  findByEmailWithPassword,
  toSafeUser,
};
