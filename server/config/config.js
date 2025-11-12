import { z } from "zod";
import { loadEnv } from "../utils/loadEnv.js";

/** Validates environment variables and exposes strongly typed configuration. */

loadEnv();

const envSchema = z
  .object({
    SERVER_HOST: z.string().optional(),
    SERVER_PORT: z
      .string()
      .regex(/^\d+$/, { message: "SERVER_PORT must be a positive integer" })
      .transform((value) => Number.parseInt(value, 10))
      .optional(),
    DATABASE_URL: z
      .string({ required_error: "DATABASE_URL is required" })
      .min(1, "DATABASE_URL cannot be empty"),
  })
  .superRefine((env, ctx) => {
    if (env.SERVER_PORT !== undefined && (Number.isNaN(env.SERVER_PORT) || env.SERVER_PORT <= 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "SERVER_PORT must be a positive number",
        path: ["SERVER_PORT"],
      });
    }
  });

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("[config] Environment validation failed:");
  for (const issue of parsedEnv.error.issues) {
    console.error(`  • ${issue.path.join(".") || "_"}: ${issue.message}`);
  }
  process.exit(1);
}

const env = parsedEnv.data;

export const SERVER_HOST = env.SERVER_HOST ?? "0.0.0.0";
export const SERVER_PORT = env.SERVER_PORT ?? 9090;

export const DATABASE_URL = env.DATABASE_URL;

export const cryptoConfig = { iterations: 1000, keylen: 32, digest: "sha256" };
