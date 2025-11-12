import crypto from "crypto";
import { cryptoConfig } from "../../../config/config.js";

/** Password hashing helpers shared by HTTP and WebSocket auth flows. */

export function derivePasswordHash(password, salt = crypto.randomBytes(16)) {
  const { iterations, keylen, digest } = cryptoConfig;

  const derived = crypto.pbkdf2Sync(password, salt, iterations, keylen, digest);
  return { hash: derived, salt };
}

export function verifyPassword(password, storedHash, storedSalt) {
  if (!Buffer.isBuffer(storedHash) || !Buffer.isBuffer(storedSalt)) {
    return false;
  }

  const { hash } = derivePasswordHash(password, storedSalt);

  if (storedHash.length !== hash.length) {
    return false;
  }

  return crypto.timingSafeEqual(storedHash, hash);
}
