import { loadEnv } from "../utils/loadEnv.js";

loadEnv();

export const SERVER_HOST = process.env.SERVER_HOST;
export const SERVER_PORT = Number(process.env.SERVER_PORT);

export const DATABASE_URL = String(process.env.DATABASE_URL);

export const cryptoConfig = { iterations: 1000, keylen: 32, digest: "sha256" };
