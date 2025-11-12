/**
 * Generates a short-lived identifier for client-side usage.
 * Falls back to a timestamp-based id when `crypto.randomUUID` is unavailable.
 */
export function createLocalId(prefix) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  const stamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `${prefix}-${stamp}-${random}`;
}
