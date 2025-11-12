import { createInputState } from "../input/inputState.js";

/**
 * Global UI + networking state for the client. Values in this object are
 * mutated by various modules but kept in one place for clarity.
 */
export const clientState = {
  user: null,
  token: null,
  ws: null,
  connectionState: "disconnected",
  messages: [],
  lastPong: null,
  localPlayerId: null,
  input: createInputState(),
  lastSentVector: { x: 0, y: 0 },
  lastMoveSentAt: 0,
  moveSequence: 0,
  lastWorldTick: null,
  lastWorldTimestamp: null,
  lastWorldDelta: null,
  lastTickLabel: "",
};

/** Snapshot of the server-authoritative world. */
export const worldState = {
  players: new Map(),
};

/** Restores movement-related state when reconnecting or logging out. */
export function resetMovementState() {
  clientState.input = createInputState();
  clientState.lastSentVector = { x: 0, y: 0 };
  clientState.lastMoveSentAt = 0;
  clientState.moveSequence = 0;
}

/** Clears world snapshot metadata while leaving auth/session data intact. */
export function resetWorldSnapshot() {
  worldState.players.clear();
  clientState.lastWorldTick = null;
  clientState.lastWorldTimestamp = null;
  clientState.lastWorldDelta = null;
  clientState.lastTickLabel = "";
}

/** Clears chat messages, typically used during logout. */
export function resetMessages() {
  clientState.messages = [];
}
