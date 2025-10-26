import { readFileSync } from "fs";
import { Pool } from "pg";
import loadEnv from "../util/loadEnv.js";

loadEnv();

export const pool = new Pool({
  host: process.env.PGHOST || "localhost",
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD || "",
  database: process.env.PGDATABASE || "ellarwick",
  max: 10,
});

export async function initSchema() {
  const sql = readFileSync(new URL("./schema.sql", import.meta.url), "utf8");
  await pool.query(sql);
}
