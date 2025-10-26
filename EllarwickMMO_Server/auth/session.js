import { pool } from "../db/connect.js";

/**
 * Validate a session token and return the user payload.
 * @param {string} token
 * @return {Promise<{id: number, username: string} | null>}
 */
export async function validateToken(token) {
  if (!token || typeof token !== "string") return null;

  const q = `
    SELECT u.id, u.username
    FROM sessions s
    JOIN users u
    ON u.id = s.user_id
    WHERE s.token = $1 
    LIMIT 1
    `;

  const { rows } = await pool.query(q, [token]);
  return rows[0] ?? null;
}

/**
 * Optional: revoke a token (logout).
 * @param {string} token
 * @returns {Promise<boolean>}
 */
export async function revokeToken(token) {
  if (!token) return { ok: false, error: "Missing token" };
  const { rowCount } = await pool.query(
    "DELETE FROM sessions WHERE token = $1",
    [token]
  );
  return rowCount > 0 ? { ok: true } : { ok: false, error: "Invalid token" };
}
