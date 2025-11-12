import { GAME_LOOP_INTERVAL_MS } from "../../../config/constants.js";
import { createTickLoop } from "./tickLoop.js";

/**
 * Registers the world heartbeat loop that periodically broadcasts player
 * snapshots. The dispatcher hands us state changes via events so we can throttle
 * updates intelligently.
 */

const HEARTBEAT_INTERVAL_MS = 1000;

export function registerTickLoop(dispatcher, options = {}) {
  if (!dispatcher?.emitter) {
    throw new Error("registerTickLoop requires a dispatcher with an event emitter");
  }

  const { playerState } = options;
  const intervalMs = options.intervalMs ?? GAME_LOOP_INTERVAL_MS;
  const heartbeatMs = options.heartbeatMs ?? HEARTBEAT_INTERVAL_MS;

  if (!playerState) {
    throw new Error("registerTickLoop requires a shared playerState store");
  }

  const heartbeatEveryTicks = Math.max(1, Math.round(heartbeatMs / intervalMs));
  let lastBroadcastTick = 0;
  let needsBroadcast = true;

  const markDirty = () => {
    needsBroadcast = true;
  };

  const eventsToWatch = [
    "connection:opened",
    "playerState:created",
    "playerState:attached",
    "playerState:updated",
    "playerState:removed",
    "player:moved",
  ];

  for (const eventName of eventsToWatch) {
    dispatcher.emitter.on(eventName, markDirty);
  }

  const tickLoop = createTickLoop({
    emitter: dispatcher.emitter,
    intervalMs,
    async onTick(context) {
      if (dispatcher.connections.size === 0) {
        return;
      }

      const shouldHeartbeat = context.tick - lastBroadcastTick >= heartbeatEveryTicks;

      if (!needsBroadcast && !shouldHeartbeat) {
        return;
      }

      const snapshot = playerState.snapshot();

      dispatcher.broadcast("world:update", {
        players: snapshot,
        tick: context.tick,
        timestamp: context.now,
        delta: context.delta,
      });

      needsBroadcast = false;
      lastBroadcastTick = context.tick;
    },
  });

  tickLoop.start();

  dispatcher.state = {
    ...(dispatcher.state ?? {}),
    tickLoop,
  };

  let disposed = false;
  let signalListener;

  function dispose() {
    if (disposed) {
      return;
    }
    disposed = true;

    for (const eventName of eventsToWatch) {
      dispatcher.emitter.off(eventName, markDirty);
    }

    if (signalListener) {
      process.removeListener("SIGINT", signalListener);
      process.removeListener("SIGTERM", signalListener);
      signalListener = null;
    }

    tickLoop.stop();
  }

  signalListener = () => {
    dispose();
  };

  process.prependOnceListener("SIGINT", signalListener);
  process.prependOnceListener("SIGTERM", signalListener);

  return {
    tickLoop,
    dispose,
  };
}
