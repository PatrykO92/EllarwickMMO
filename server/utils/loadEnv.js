import dotenv from "dotenv";

export function loadEnv() {
  dotenv.config({ quiet: true });
}
