import { z } from "zod";

/** Miscellaneous utility handlers that support connection diagnostics. */

export function registerSystemModule(dispatcher, _context = {}) {
  dispatcher.registerHandler({
    type: "ping",
    schema: z
      .object({
        timestamp: z.number().safe().optional(),
      })
      .optional(),
    handler: ({ payload, send }) => {
      const timestamp = typeof payload?.timestamp === "number" ? payload.timestamp : Date.now();

      send("pong", {
        timestamp,
        receivedAt: Date.now(),
      });
    },
    description: "Responds to ping messages with a pong payload",
  });
}
