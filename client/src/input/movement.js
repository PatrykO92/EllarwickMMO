import {
  LEVEL_ONE_SPEED,
  LEVEL_SPEED_INCREMENT,
  MOVE_RESEND_INTERVAL,
  MOVE_SPEED_MULTIPLIER,
} from "../constants.js";
import { clientState } from "../state/store.js";
import { computeMovementVector, movementKeyMap, vectorsEqual } from "./inputState.js";
import { sendMoveIntent } from "../network/websocket.js";
import { getLocalPlayer } from "../world/players.js";

/** Handles keyboard-driven movement intents and throttled resend logic. */

/** Resets movement tracking when we lose the socket. */
export function resetMovementTracking() {
  clientState.lastSentVector = { x: 0, y: 0 };
  clientState.lastMoveSentAt = performance.now();
  clientState.moveSequence = 0;
}

/** Queues movement updates at a regular cadence while keys are held. */
export function updateMovementHeartbeat(timestamp) {
  if (!clientState.ws || clientState.ws.readyState !== WebSocket.OPEN) {
    return;
  }

  const vector = computeMovementVector(clientState.input);
  const vectorChanged = !vectorsEqual(vector, clientState.lastSentVector);
  const shouldResend =
    (Math.abs(vector.x) > 0 || Math.abs(vector.y) > 0) &&
    timestamp - clientState.lastMoveSentAt >= MOVE_RESEND_INTERVAL;

  if (vectorChanged || shouldResend) {
    dispatchMoveIntent(vector);
  }
}

/** Handles keydown / keyup events triggered by the window. */
export function handleMovementKey(event, isDown) {
  const direction = movementKeyMap[event.code];
  if (!direction) {
    return;
  }

  const target = event.target;
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable) {
    return;
  }

  if (clientState.input[direction] === isDown) {
    return;
  }

  clientState.input[direction] = isDown;
  event.preventDefault();
  dispatchMoveIntent(computeMovementVector(clientState.input));
}

function dispatchMoveIntent(vector) {
  if (!clientState.ws || clientState.ws.readyState !== WebSocket.OPEN) {
    return;
  }

  const sequence = clientState.moveSequence + 1;
  clientState.moveSequence = sequence;

  sendMoveIntent({
    vector: {
      x: Number(vector.x.toFixed(4)),
      y: Number(vector.y.toFixed(4)),
    },
    speed: getCurrentMoveSpeed(),
    sequence,
  });

  clientState.lastSentVector = { ...vector };
  clientState.lastMoveSentAt = performance.now();
}

function normalizeLevel(level) {
  const numeric = Number(level);
  if (!Number.isFinite(numeric)) {
    return 1;
  }
  return Math.max(1, Math.round(numeric));
}

function getLevelSpeed(level) {
  const normalized = normalizeLevel(level);
  const bonus = (normalized - 1) * LEVEL_SPEED_INCREMENT;
  return LEVEL_ONE_SPEED + bonus;
}

function getCurrentMoveSpeed() {
  const player = getLocalPlayer();
  const level = player?.level ?? clientState.user?.level ?? 1;
  const levelSpeed = getLevelSpeed(level);
  return levelSpeed * MOVE_SPEED_MULTIPLIER;
}
