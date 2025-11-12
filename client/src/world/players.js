import { clientState, worldState } from "../state/store.js";

const POSITION_EPSILON = 0.001;
const DEFAULT_INTERPOLATION_MS = 120;
const MIN_INTERPOLATION_MS = 45;
const MAX_INTERPOLATION_MS = 250;
const MIN_LEVEL = 1;

function getTimestamp() {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }

  return Date.now();
}

function sanitizeCoordinate(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function positionsAlmostEqual(a, b) {
  if (!a || !b) {
    return false;
  }

  return Math.abs((a.x ?? 0) - (b.x ?? 0)) < POSITION_EPSILON && Math.abs((a.y ?? 0) - (b.y ?? 0)) < POSITION_EPSILON;
}

function computeInterpolationDuration(userId) {
  const base = Number.isFinite(clientState.lastWorldDelta) ? clientState.lastWorldDelta : DEFAULT_INTERPOLATION_MS;
  const adjusted = userId === clientState.localPlayerId ? base * 0.6 : base;
  return clamp(adjusted, MIN_INTERPOLATION_MS, MAX_INTERPOLATION_MS);
}

function getRenderStatePosition(renderState, fallback) {
  if (!renderState) {
    return { ...fallback };
  }

  const start = renderState.from ?? fallback;
  const end = renderState.to ?? fallback;
  return {
    x: sanitizeCoordinate(start.x ?? end.x ?? fallback.x ?? 0),
    y: sanitizeCoordinate(start.y ?? end.y ?? fallback.y ?? 0),
  };
}

function createRenderState(existing, targetPosition, userId, timestamp) {
  const fromPosition = existing ? getRenderablePosition(existing, timestamp) : { ...targetPosition };

  if (positionsAlmostEqual(fromPosition, targetPosition)) {
    return {
      from: { ...targetPosition },
      to: { ...targetPosition },
      startTime: timestamp,
      duration: 0,
    };
  }

  return {
    from: fromPosition,
    to: { ...targetPosition },
    startTime: timestamp,
    duration: computeInterpolationDuration(userId),
  };
}

const DEFAULT_OUTFIT = Object.freeze({
  clientName: 1,
  name: "Adventurer",
});

function normalizeOutfit(outfit) {
  if (!outfit || typeof outfit !== "object") {
    return { ...DEFAULT_OUTFIT };
  }

  const clientNameValue = Number(outfit.clientName ?? outfit.client_name);
  const clientName = Number.isFinite(clientNameValue) ? clientNameValue : DEFAULT_OUTFIT.clientName;
  const nameValue = typeof outfit.name === "string" ? outfit.name.trim() : "";
  const name = nameValue.length > 0 ? nameValue : DEFAULT_OUTFIT.name;

  return { clientName, name };
}

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

    const existing = worldState.players.get(snapshot.userId) ?? null;
    next.set(snapshot.userId, normalizePlayerSnapshot(snapshot, existing));
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
    level: MIN_LEVEL,
    position: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    updatedAt: 0,
    sequence: -1,
    outfit: normalizeOutfit(null),
  };

  const incomingSequence = typeof snapshot.sequence === "number" ? snapshot.sequence : existing.sequence;
  if (typeof incomingSequence === "number" && incomingSequence < (existing.sequence ?? -1)) {
    return existing;
  }

  const normalized = normalizePlayerSnapshot({ ...existing, ...snapshot }, existing);
  worldState.players.set(userId, normalized);
  if (userId === clientState.localPlayerId && clientState.user) {
    clientState.user = {
      ...clientState.user,
      level: normalized.level,
    };
  }
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
function normalizePlayerSnapshot(snapshot, existing = null) {
  const timestamp = getTimestamp();
  const position = {
    x: sanitizeCoordinate(snapshot.position?.x),
    y: sanitizeCoordinate(snapshot.position?.y),
  };
  const velocity = {
    x: sanitizeCoordinate(snapshot.velocity?.x),
    y: sanitizeCoordinate(snapshot.velocity?.y),
  };
  return {
    userId: snapshot.userId,
    username: snapshot.username ?? "Player",
    level: sanitizeLevel(snapshot.level ?? existing?.level ?? MIN_LEVEL),
    position,
    velocity,
    updatedAt: snapshot.updatedAt ? new Date(snapshot.updatedAt).getTime() : Date.now(),
    sequence: typeof snapshot.sequence === "number" ? snapshot.sequence : 0,
    outfit: normalizeOutfit(snapshot.outfit),
    renderState: createRenderState(existing, position, snapshot.userId, timestamp),
  };
}

export function getRenderablePosition(player, referenceTime = getTimestamp()) {
  if (!player) {
    return { x: 0, y: 0 };
  }

  const target = {
    x: sanitizeCoordinate(player.position?.x),
    y: sanitizeCoordinate(player.position?.y),
  };

  const renderState = player.renderState;
  if (!renderState || typeof renderState.startTime !== "number" || renderState.duration <= 0) {
    return target;
  }

  const elapsed = referenceTime - renderState.startTime;
  const progress = clamp(elapsed / (renderState.duration || 1), 0, 1);
  const eased = progress * (2 - progress);
  const from = getRenderStatePosition(renderState, target);
  const to = renderState.to ?? target;

  return {
    x: from.x + (sanitizeCoordinate(to.x) - from.x) * eased,
    y: from.y + (sanitizeCoordinate(to.y) - from.y) * eased,
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

function sanitizeLevel(value, fallback = MIN_LEVEL) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.max(MIN_LEVEL, Math.round(numeric));
}
