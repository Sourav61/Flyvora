const { pool } = require("../config/db");

const toSafeAdminUser = (user) => ({
  id: user.id,
  email: user.email,
  createdAt: user.created_at,
});

const findByEmail = async (email) => {
  const result = await pool.query(
    `
      SELECT id, email, created_at
      FROM admin_users
      WHERE email = $1
    `,
    [email]
  );

  return result.rows[0] ? toSafeAdminUser(result.rows[0]) : null;
};

const findByEmailWithPassword = async (email) => {
  const result = await pool.query(
    `
      SELECT id, email, password_hash, created_at
      FROM admin_users
      WHERE email = $1
    `,
    [email]
  );

  return result.rows[0] || null;
};

module.exports = {
  findByEmail,
  findByEmailWithPassword,
  toSafeAdminUser,
};
