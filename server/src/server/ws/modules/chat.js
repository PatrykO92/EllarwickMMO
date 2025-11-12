import { randomUUID } from "crypto";
import { z } from "zod";

/**
 * WebSocket chat module responsible for validating and broadcasting messages to
 * every connected player. Chat traffic doubles as an example of the dispatcher
 * workflow and event emitter usage.
 */

function createClientError(code, message) {
  const error = new Error(message ?? code);
  error.code = code;
  error.isClientError = true;
  return error;
}

const chatMessageSchema = z.object({
  message: z
    .string({ required_error: "message is required" })
    .trim()
    .min(1, "message cannot be empty")
    .max(500, "message must be at most 500 characters"),
});

export function registerChatModule(dispatcher, _context = {}) {
  dispatcher.registerHandler({
    type: "chat:send",
    schema: chatMessageSchema,
    description: "Broadcasts chat messages to all connected players",
    handler: ({ connection, payload, broadcast, emitter }) => {
      if (!connection.auth?.user) {
        throw createClientError("unauthorized", "You must be authenticated to send chat messages");
      }

      const sentAt = new Date();

      const message = {
        id: randomUUID(),
        message: payload.message,
        sentAt: sentAt.toISOString(),
        user: {
          id: connection.auth.userId,
          username: connection.auth.user.username,
        },
      };

      emitter.emit("chat:message", {
        connectionId: connection.id,
        message,
      });

      broadcast("chat:message", message);
    },
  });
}
