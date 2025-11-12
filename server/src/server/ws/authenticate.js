import { z } from "zod";
import { verifySessionToken } from "../auth/session.js";

/** Validates WebSocket upgrade requests using the shared session token helper. */

const tokenSchema = z.object({
  token: z
    .string({ required_error: "token is required" })
    .trim()
    .regex(/^[a-f0-9]{64}$/i, "token must be a 64-character hex string"),
});

export class WebSocketAuthError extends Error {
  constructor(code, message, options = {}) {
    super(message ?? code);
    this.name = "WebSocketAuthError";
    this.code = code;
    this.closeCode = options.closeCode ?? 4401;
  }
}

export async function authenticateWebSocket(request) {
  let url;

  try {
    url = new URL(request.url ?? "", `http://${request.headers.host ?? "localhost"}`);
  } catch (error) {
    throw new WebSocketAuthError("invalid_request", "Unable to parse WebSocket request URL", {
      closeCode: 4400,
    });
  }

  const parseResult = tokenSchema.safeParse({
    token: url.searchParams.get("token"),
  });

  if (!parseResult.success) {
    const firstIssue = parseResult.error.issues[0];
    throw new WebSocketAuthError("invalid_token", firstIssue?.message ?? "Invalid token", {
      closeCode: 4401,
    });
  }

  const { token } = parseResult.data;

  const session = await verifySessionToken(token);

  if (!session) {
    throw new WebSocketAuthError("unauthorized", "Session token is invalid or expired", {
      closeCode: 4401,
    });
  }

  return {
    token: session.token,
    expiresAt: session.expiresAt,
    userId: session.userId,
    user: session.user,
  };
}
