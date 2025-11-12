import { clientState, worldState } from "../state/store.js";

/** Data-access helpers for the client-side mirror of server player state. */

/** Returns an iterator over the tracked players. */
export function getPlayers() {
  return worldState.players;
}

/** Returns the player record for the local user if available. */
export function getLocalPlayer() {
  if (!clientState.localPlayerId) {
    return null;
  }

  return worldState.players.get(clientState.localPlayerId) ?? null;
}

/** Completely replaces the player map using a server-provided snapshot. */
export function syncWorldPlayers(players) {
  const next = new Map();

  for (const snapshot of Array.isArray(players) ? players : []) {
    if (typeof snapshot?.userId === "undefined") {
      continue;
    }

    next.set(snapshot.userId, normalizePlayerSnapshot(snapshot));
  }

  worldState.players = next;
  return next;
}

/** Adds or updates a single player entry. Returns the stored player. */
export function applyPlayerSnapshot(snapshot) {
  if (!snapshot || typeof snapshot.userId === "undefined") {
    return null;
  }

  const userId = snapshot.userId;
  const existing = worldState.players.get(userId) ?? {
    userId,
    username: snapshot.username ?? "Player",
    position: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    updatedAt: 0,
    sequence: -1,
  };

  const incomingSequence = typeof snapshot.sequence === "number" ? snapshot.sequence : existing.sequence;
  if (typeof incomingSequence === "number" && incomingSequence < (existing.sequence ?? -1)) {
    return existing;
  }

  const normalized = normalizePlayerSnapshot({ ...existing, ...snapshot });
  worldState.players.set(userId, normalized);
  return normalized;
}

/** Removes a player from the roster. */
export function removePlayer(userId) {
  if (typeof userId === "undefined") {
    return false;
  }

  return worldState.players.delete(userId);
}

/** Converts raw payloads into consistent player objects. */
function normalizePlayerSnapshot(snapshot) {
  return {
    userId: snapshot.userId,
    username: snapshot.username ?? "Player",
    position: {
      x: Number(snapshot.position?.x ?? 0),
      y: Number(snapshot.position?.y ?? 0),
    },
    velocity: {
      x: Number(snapshot.velocity?.x ?? 0),
      y: Number(snapshot.velocity?.y ?? 0),
    },
    updatedAt: snapshot.updatedAt ? new Date(snapshot.updatedAt).getTime() : Date.now(),
    sequence: typeof snapshot.sequence === "number" ? snapshot.sequence : 0,
  };
}

/**
 * Returns a sorted array of players prioritising the local user, used by the
 * roster renderer to keep the UI predictable.
 */
export function getPlayersForRoster() {
  const players = Array.from(worldState.players.values());

  players.sort((a, b) => {
    if (a.userId === clientState.localPlayerId) return -1;
    if (b.userId === clientState.localPlayerId) return 1;

    const nameA = (a.username ?? "").toLocaleLowerCase();
    const nameB = (b.username ?? "").toLocaleLowerCase();
    return nameA.localeCompare(nameB);
  });

  return players;
}
