const DEFAULT_INTERVAL_MS = 50;

/**
 * Lightweight interval manager that emits lifecycle events around each tick.
 * Gameplay modules can subscribe without caring about timers or scheduling.
 */

export function createTickLoop(options = {}) {
  const {
    emitter,
    intervalMs = DEFAULT_INTERVAL_MS,
    onTick,
  } = options;

  if (!emitter) {
    throw new Error("createTickLoop requires an event emitter instance");
  }

  if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
    throw new Error("createTickLoop requires a positive intervalMs value");
  }

  let running = false;
  let timer = null;
  let lastTickAt = 0;
  let tickCount = 0;

  async function step() {
    if (!running) {
      return;
    }

    const now = Date.now();
    const delta = now - lastTickAt;
    lastTickAt = now;
    tickCount += 1;

    const context = {
      tick: tickCount,
      now,
      delta,
      intervalMs,
    };

    try {
      emitter.emit("tick", context);
    } catch (error) {
      console.error("[tick] Error while emitting tick event:", error);
      emitter.emit("tick:error", { context, error });
    }

    let result;

    try {
      result = onTick ? onTick(context) : null;
    } catch (error) {
      console.error("[tick] Error in tick handler:", error);
      emitter.emit("tick:error", { context, error });
      result = null;
    }

    try {
      await Promise.resolve(result);
    } catch (error) {
      console.error("[tick] Rejected promise in tick handler:", error);
      emitter.emit("tick:error", { context, error });
    }

    try {
      emitter.emit("tick:after", context);
    } catch (error) {
      console.error("[tick] Error while emitting tick:after event:", error);
      emitter.emit("tick:error", { context, error });
    }

    scheduleNextTick();
  }

  function scheduleNextTick() {
    if (!running) {
      return;
    }

    const targetNextTick = lastTickAt + intervalMs;
    const waitTime = Math.max(0, targetNextTick - Date.now());

    timer = setTimeout(() => {
      timer = null;
      step();
    }, waitTime);
  }

  function start() {
    if (running) {
      return false;
    }

    running = true;
    tickCount = 0;
    lastTickAt = Date.now();

    try {
      emitter.emit("tick:started", { intervalMs, startedAt: lastTickAt });
    } catch (error) {
      console.error("[tick] Error while emitting tick:started event:", error);
      emitter.emit("tick:error", { context: { tick: 0, now: lastTickAt, delta: 0, intervalMs }, error });
    }

    scheduleNextTick();
    return true;
  }

  function stop() {
    if (!running) {
      return false;
    }

    running = false;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }

    try {
      emitter.emit("tick:stopped", {
        tick: tickCount,
        stoppedAt: Date.now(),
        intervalMs,
      });
    } catch (error) {
      console.error("[tick] Error while emitting tick:stopped event:", error);
      emitter.emit("tick:error", { context: { tick: tickCount, now: Date.now(), delta: 0, intervalMs }, error });
    }

    return true;
  }

  function isRunning() {
    return running;
  }

  function getTickCount() {
    return tickCount;
  }

  return {
    start,
    stop,
    isRunning,
    getTickCount,
    get intervalMs() {
      return intervalMs;
    },
  };
}
