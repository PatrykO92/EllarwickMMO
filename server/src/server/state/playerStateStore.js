import { z } from "zod";

/**
 * Centralised player state store that powers roster updates and movement
 * synchronisation. It emits lifecycle events so other systems can react to
 * players joining or leaving without tight coupling.
 */

export function createClientError(code, message, extras = {}) {
  const error = new Error(message ?? code);
  error.code = code;
  error.isClientError = true;
  if (extras.details) {
    error.details = extras.details;
  }
  return error;
}

const vectorSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
});

function clampToPrecision(value, precision = 3) {
  return Number(value.toFixed(precision));
}

function sanitizeVector(vector) {
  const result = vectorSchema.safeParse(vector);

  if (!result.success) {
    return { x: 0, y: 0 };
  }

  return {
    x: clampToPrecision(result.data.x),
    y: clampToPrecision(result.data.y),
  };
}

function sanitizePlayerRecord(record) {
  return {
    userId: record.userId,
    username: record.username,
    position: sanitizeVector(record.position ?? { x: 0, y: 0 }),
    velocity: sanitizeVector(record.velocity ?? { x: 0, y: 0 }),
    updatedAt: new Date(record.updatedAt ?? Date.now()).toISOString(),
    sequence: typeof record.sequence === "number" ? record.sequence : 0,
  };
}

export function createPlayerStateStore({ emitter } = {}) {
  if (!emitter) {
    throw new Error("createPlayerStateStore requires an event emitter instance");
  }

  const players = new Map();
  const connections = new Map();

  function ensureForConnection(connection, options = {}) {
    const auth = connection?.auth;

    if (!auth?.userId || !auth?.user) {
      throw createClientError("unauthorized", "Authentication required for player state");
    }

    const userId = auth.userId;
    const now = Date.now();
    let record = players.get(userId);

    if (!record) {
      record = {
        userId,
        username: auth.user.username,
        position: { x: options.initialPosition?.x ?? 0, y: options.initialPosition?.y ?? 0 },
        velocity: { x: options.initialVelocity?.x ?? 0, y: options.initialVelocity?.y ?? 0 },
        updatedAt: now,
        sequence: 0,
        connectionId: connection.id,
      };
      players.set(userId, record);
      connections.set(connection.id, userId);
      emitter.emit("playerState:created", {
        player: sanitizePlayerRecord(record),
        connection,
      });
    } else {
      record.username = auth.user.username;
      record.connectionId = connection.id;
      record.updatedAt = now;
      connections.set(connection.id, userId);
      emitter.emit("playerState:attached", {
        player: sanitizePlayerRecord(record),
        connection,
      });
    }

    return sanitizePlayerRecord(record);
  }

  function updatePlayer(userId, mutator) {
    if (!players.has(userId)) {
      throw createClientError("player_not_found", `Player '${userId}' is not registered in state store`);
    }

    const record = players.get(userId);
    const previous = sanitizePlayerRecord(record);

    if (typeof mutator === "function") {
      const result = mutator(record);

      if (result && typeof result === "object") {
        Object.assign(record, result);
      }
    }

    record.updatedAt = Date.now();
    const snapshot = sanitizePlayerRecord(record);

    emitter.emit("playerState:updated", {
      player: snapshot,
      previous,
    });

    return snapshot;
  }

  function removeForConnection(connection) {
    if (!connection) {
      return null;
    }

    const userId = connections.get(connection.id);

    if (!userId) {
      return null;
    }

    const record = players.get(userId);

    if (!record || record.connectionId !== connection.id) {
      connections.delete(connection.id);
      return null;
    }

    players.delete(userId);
    connections.delete(connection.id);
    const snapshot = sanitizePlayerRecord(record);

    emitter.emit("playerState:removed", {
      player: snapshot,
      connection,
    });

    return snapshot;
  }

  function getPlayer(userId) {
    const record = players.get(userId);
    return record ? sanitizePlayerRecord(record) : null;
  }

  function snapshot() {
    return Array.from(players.values()).map((record) => sanitizePlayerRecord(record));
  }

  function clear() {
    players.clear();
    connections.clear();
  }

  return {
    ensureForConnection,
    updatePlayer,
    removeForConnection,
    getPlayer,
    snapshot,
    clear,
    sanitize: sanitizePlayerRecord,
    players,
    connections,
  };
}
