import crypto from "crypto";
import { cryptoConfig } from "../../../config/config.js";

/** Password hashing helpers shared by HTTP and WebSocket auth flows. */

const HEX_REGEX = /^[0-9a-f]+$/i;
const BASE64_REGEX = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

export function derivePasswordHash(password, salt = crypto.randomBytes(16), overrides = {}) {
  const { iterations, keylen, digest } = { ...cryptoConfig, ...overrides };

  const derived = crypto.pbkdf2Sync(password, salt, iterations, keylen, digest);
  return { hash: derived, salt };
}

export function verifyPassword(password, storedHash, storedSalt) {
  const normalisedHash = normaliseBinarySecret(storedHash);
  const normalisedSalt = normaliseBinarySecret(storedSalt);

  if (normalisedHash && normalisedSalt) {
    const candidateKeyLengths = new Set([cryptoConfig.keylen, normalisedHash.length]);
    const candidateDigests = new Set([cryptoConfig.digest]);

    if (normalisedHash.length > cryptoConfig.keylen) {
      candidateDigests.add("sha512");
    }

    for (const keylen of candidateKeyLengths) {
      for (const digest of candidateDigests) {
        const { hash } = derivePasswordHash(password, normalisedSalt, { keylen, digest });

        if (hash.length === normalisedHash.length && crypto.timingSafeEqual(hash, normalisedHash)) {
          return true;
        }
      }
    }
  }

  return false;
}

function normaliseBinarySecret(value) {
  const buffer = coerceToBuffer(value);

  if (!buffer) {
    return null;
  }

  if (!isLikelyAscii(buffer)) {
    return buffer;
  }

  const ascii = buffer.toString("utf8").trim();

  if (ascii.length > 0 && ascii.length % 2 === 0 && HEX_REGEX.test(ascii)) {
    return Buffer.from(ascii, "hex");
  }

  if (ascii.length > 0 && ascii.length % 4 === 0 && BASE64_REGEX.test(ascii)) {
    try {
      return Buffer.from(ascii, "base64");
    } catch {
      // fall through to returning the original buffer
    }
  }

  return buffer;
}

function coerceToBuffer(value) {
  if (!value) {
    return null;
  }

  if (Buffer.isBuffer(value)) {
    return value;
  }

  if (typeof value === "string") {
    return Buffer.from(value, "utf8");
  }

  if (value instanceof Uint8Array) {
    return Buffer.from(value);
  }

  if (typeof value === "object" && value.type === "Buffer" && Array.isArray(value.data)) {
    return Buffer.from(value.data);
  }

  return null;
}

function isLikelyAscii(buffer) {
  for (const byte of buffer) {
    if (byte < 0x20 || byte > 0x7e) {
      return false;
    }
  }
  return true;
}
