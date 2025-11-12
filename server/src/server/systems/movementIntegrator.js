const MOVEMENT_EPSILON = 0.0001;
const DEFAULT_MAX_DELTA_MS = 150;

function clampDelta(delta, maxDeltaMs) {
  if (!Number.isFinite(delta) || delta <= 0) {
    return 0;
  }

  if (!Number.isFinite(maxDeltaMs) || maxDeltaMs <= 0) {
    return delta;
  }

  return Math.min(delta, maxDeltaMs);
}

function hasMovement(vector) {
  if (!vector) {
    return false;
  }

  return Math.abs(vector.x ?? 0) > MOVEMENT_EPSILON || Math.abs(vector.y ?? 0) > MOVEMENT_EPSILON;
}

/** Integrates stored movement intents into actual positions on each server tick. */
export function registerMovementIntegrator(dispatcher, options = {}) {
  if (!dispatcher?.emitter) {
    throw new Error("registerMovementIntegrator requires a dispatcher with an emitter");
  }

  const { playerState, worldMap, maxDeltaMs = DEFAULT_MAX_DELTA_MS } = options;

  if (!playerState?.players) {
    throw new Error("registerMovementIntegrator requires access to the playerState store");
  }

  if (!worldMap || typeof worldMap.resolveMovementWithCollisions !== "function") {
    throw new Error("registerMovementIntegrator requires worldMap collision helpers");
  }

  const handleTick = (context = {}) => {
    if (playerState.players.size === 0) {
      return;
    }

    const deltaMs = clampDelta(context.delta, maxDeltaMs);
    if (deltaMs <= 0) {
      return;
    }

    const deltaSeconds = deltaMs / 1000;

    for (const [userId, record] of playerState.players.entries()) {
      const intent = record.movementIntent ?? { x: 0, y: 0 };
      const intentHasMovement = hasMovement(intent);

      if (!intentHasMovement) {
        if (hasMovement(record.velocity)) {
          playerState.updatePlayer(userId, (current) => {
            current.velocity.x = 0;
            current.velocity.y = 0;
          });
        }
        continue;
      }

      const stepX = intent.x * deltaSeconds;
      const stepY = intent.y * deltaSeconds;

      if (!hasMovement({ x: stepX, y: stepY })) {
        continue;
      }

      const startPosition = record.position ?? { x: 0, y: 0 };
      const { position: resolvedPosition, velocity: resolvedDelta } = worldMap.resolveMovementWithCollisions(
        startPosition,
        stepX,
        stepY
      );

      if (!hasMovement(resolvedDelta)) {
        if (hasMovement(record.velocity)) {
          playerState.updatePlayer(userId, (current) => {
            current.velocity.x = 0;
            current.velocity.y = 0;
          });
        }
        continue;
      }

      const velocityPerSecond = {
        x: resolvedDelta.x / deltaSeconds,
        y: resolvedDelta.y / deltaSeconds,
      };

      playerState.updatePlayer(userId, (current) => {
        current.position.x = resolvedPosition.x;
        current.position.y = resolvedPosition.y;
        current.velocity.x = velocityPerSecond.x;
        current.velocity.y = velocityPerSecond.y;
      });
    }
  };

  dispatcher.emitter.on("tick", handleTick);

  function dispose() {
    dispatcher.emitter.off("tick", handleTick);
  }

  return { dispose };
}
