import crypto from "crypto";

import { pool } from "../db/connect.js";
import { getMapData } from "../data/maps/index.js";

/**
 * @param {string} username
 * @param {string} password
 * @returns {Promise<{ok: boolean, token?: string, error?: string}>}
 */
export async function login(username, password) {
  try {
    if (!username || !password) {
      return { ok: false, error: "No username or password." };
    }

    const res = await pool.query(
      "SELECT id, password_hash, password_salt from users WHERE username=$1",
      [username]
    );
    if (res.rowCount === 0) return { ok: false, error: "Incorrect login data" };

    const user = res.rows[0];

    const newHash = crypto.pbkdf2Sync(
      password,
      user.password_salt,
      100000,
      32,
      "sha256"
    );

    if (Buffer.compare(newHash, user.password_hash) !== 0) {
      return { ok: false, error: "Invalid credentials" };
    }

    const token = crypto.randomBytes(16).toString("hex");
    await pool.query("INSERT INTO sessions (user_id, token) VALUES ($1, $2)", [
      user.id,
      token,
    ]);
    const hubMap = await getMapData("City");
    return { ok: true, token, map: hubMap };
  } catch (err) {
    console.error("Login error: ");
    console.error(err);

    return { ok: false, error: "Server error" };
  }
}
