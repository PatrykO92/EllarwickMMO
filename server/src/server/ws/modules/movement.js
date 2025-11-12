import { z } from "zod";
import { createClientError } from "../../state/playerStateStore.js";

/**
 * Movement module keeps the server authoritative over player coordinates. It
 * validates intent vectors, updates shared state, and fans out updates to
 * everyone else in the shard.
 */

const DEFAULT_MOVE_SPEED = 1;
const MAX_MOVE_SPEED = 12;

const moveIntentSchema = z.object({
  vector: z
    .object({
      x: z.number({ required_error: "vector.x is required" }).finite(),
      y: z.number({ required_error: "vector.y is required" }).finite(),
    })
    .refine((value) => Math.abs(value.x) <= 1 && Math.abs(value.y) <= 1, {
      message: "vector components must be between -1 and 1",
    }),
  speed: z
    .number({ invalid_type_error: "speed must be a number" })
    .finite()
    .nonnegative()
    .max(MAX_MOVE_SPEED)
    .optional(),
  sequence: z.number().int().nonnegative().optional(),
});

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalizeVector(vector) {
  const length = Math.hypot(vector.x, vector.y);

  if (length === 0) {
    return { x: 0, y: 0, length: 0 };
  }

  return {
    x: vector.x / length,
    y: vector.y / length,
    length,
  };
}

export function registerMovementModule(dispatcher, context = {}) {
  const { playerState, worldMap } = context;

  if (!playerState) {
    throw new Error("registerMovementModule requires a playerState store");
  }

  if (!worldMap || typeof worldMap.resolveMovementWithCollisions !== "function") {
    throw new Error("registerMovementModule requires worldMap collision helpers");
  }

  function sendInitialState(connectionId) {
    const payload = {
      players: playerState.snapshot(),
    };

    dispatcher.broadcast(
      "world:state",
      payload,
      undefined,
      (connection) => connection.id === connectionId
    );
  }

  dispatcher.emitter.on("connection:opened", ({ connection }) => {
    try {
      playerState.ensureForConnection(connection);
      sendInitialState(connection.id);
    } catch (error) {
      if (error?.isClientError) {
        return;
      }

      console.warn(
        `Failed to initialise movement state for connection ${connection.id}:`,
        error
      );
    }
  });

  dispatcher.emitter.on("connection:closed", ({ connection }) => {
    playerState.removeForConnection(connection);
  });

  dispatcher.emitter.on("playerState:created", ({ player, connection }) => {
    dispatcher.broadcast(
      "player:joined",
      { player },
      undefined,
      (targetConnection) => targetConnection.id !== connection.id
    );
  });

  dispatcher.emitter.on("playerState:removed", ({ player }) => {
    dispatcher.broadcast("player:left", { userId: player.userId });
  });

  dispatcher.registerHandler({
    type: "move",
    schema: moveIntentSchema,
    description: "Updates the server-side player position based on intent vector",
    handler: ({ connection, payload, requestId, send, broadcast, emitter }) => {
      const auth = connection.auth;

      if (!auth?.userId || !auth?.user) {
        throw createClientError("unauthorized", "You must be authenticated to move");
      }

      const userId = auth.userId;

      if (!playerState.getPlayer(userId)) {
        playerState.ensureForConnection(connection);
      }

      const normalized = normalizeVector(payload.vector);
      const desiredSpeed = payload.speed ?? DEFAULT_MOVE_SPEED;
      const speed = clamp(desiredSpeed, 0, MAX_MOVE_SPEED);
      const deltaX = normalized.x * speed;
      const deltaY = normalized.y * speed;

      const snapshot = playerState.updatePlayer(userId, (record) => {
        record.position = record.position ?? { x: 0, y: 0 };
        record.velocity = record.velocity ?? { x: 0, y: 0 };

        if (normalized.length === 0) {
          record.velocity.x = 0;
          record.velocity.y = 0;
        } else {
          const { position, velocity } = worldMap.resolveMovementWithCollisions(
            record.position,
            deltaX,
            deltaY
          );

          record.position.x = position.x;
          record.position.y = position.y;
          record.velocity.x = velocity.x;
          record.velocity.y = velocity.y;
        }

        if (typeof payload.sequence === "number") {
          const current = typeof record.sequence === "number" ? record.sequence : 0;
          record.sequence = Math.max(current + 1, payload.sequence);
        } else {
          record.sequence = (record.sequence ?? 0) + 1;
        }
      });

      emitter.emit("player:moved", {
        connectionId: connection.id,
        player: snapshot,
      });

      const ackPayload = {
        player: snapshot,
      };

      if (requestId !== undefined) {
        ackPayload.requestId = requestId;
      }

      send("move:ack", ackPayload);

      broadcast(
        "player:moved",
        {
          player: snapshot,
        },
        undefined,
        (targetConnection) => targetConnection.id !== connection.id
      );
    },
  });
}
