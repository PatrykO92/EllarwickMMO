import { z } from "zod";
import { prisma } from "../../../db/prismaClient.js";
import { readBody } from "../../../../utils/body.js";
import { verifyPassword } from "../../auth/password.js";
import { createUserSession, removeExpiredSessions } from "../../auth/session.js";

/** Handles POST /login requests using Prisma-backed credential checks. */

const loginSchema = z.object({
  identifier: z
    .string({ required_error: "identifier is required" })
    .trim()
    .min(3, "identifier must be at least 3 characters")
    .max(120, "identifier must be at most 120 characters"),
  password: z
    .string({ required_error: "password is required" })
    .min(8, "password must be at least 8 characters")
    .max(128, "password must be at most 128 characters"),
});

export async function handleLogin(req, res) {
  let rawBody = "";

  try {
    rawBody = await readBody(req);
  } catch (error) {
    console.error("[http] Failed to read request body for /login", error);
    sendJson(res, 400, { error: "invalid_request" });
    return;
  }

  let payload;
  try {
    payload = JSON.parse(rawBody || "{}");
  } catch {
    sendJson(res, 400, { error: "invalid_json" });
    return;
  }

  const parseResult = loginSchema.safeParse(payload);

  if (!parseResult.success) {
    sendJson(res, 400, {
      error: "validation_failed",
      details: parseResult.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }

  const { identifier, password } = parseResult.data;

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { username: identifier },
        { email: identifier },
      ],
    },
  });

  if (!user) {
    sendJson(res, 401, { error: "invalid_credentials" });
    return;
  }

  const { password_hash: passwordHash, password_salt: passwordSalt } = user;

  if (!verifyPassword(password, passwordHash, passwordSalt)) {
    sendJson(res, 401, { error: "invalid_credentials" });
    return;
  }

  await removeExpiredSessions(user.id);

  const session = await createUserSession(user.id);

  sendJson(res, 200, {
    token: session.token,
    expiresAt: session.expiresAt.toISOString(),
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
    },
  });
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Access-Control-Allow-Origin": "*",
  });
  res.end(body);
}
