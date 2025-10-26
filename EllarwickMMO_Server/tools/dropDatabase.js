import pkg from "pg";
import loadEnv from "../util/loadEnv.js";

loadEnv();

const { Client } = pkg;
const DB_NAME = process.env.PGDATABASE || "ellarwick";

async function dropDatabse() {
  const client = new Client({
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: "postgres",
    password: process.env.PGPASSWORD,
    port: process.env.PGPORT,
  });

  await client.connect();
  await client.query(`DROP DATABASE IF EXISTS ${DB_NAME};`);
  await client.query(`CREATE DATABASE ${DB_NAME};`);
  await client.end();

  process.exit(0);
}

dropDatabse();
