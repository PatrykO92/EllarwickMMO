import crypto from "crypto";
import { pool } from "../db/connect.js";

export async function register(username, password) {
  try {
    if (!username || !password) {
      return { ok: false, error: "No username or password" };
    }

    const salt = crypto.randomBytes(16);

    const hash = crypto.pbkdf2Sync(password, salt, 100000, 32, "sha256");

    await pool.query(
      "INSERT INTO users (username, password_hash, password_salt)  VALUES ($1, $2, $3)",
      [username, hash, salt]
    );
    return { ok: true };
  } catch (err) {
    if (err.code === "235505") {
      return { ok: false, error: "User exists" };
    }
    console.error("Registration error: ", err);
    return { ok: false, error: "Server Error" };
  }
}
