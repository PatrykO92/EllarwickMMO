import dotenv from "dotenv";

/** Loads environment variables from `.env` without crashing if missing. */
export function loadEnv() {
  dotenv.config({ quiet: true });
}
