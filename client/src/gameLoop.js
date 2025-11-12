import { renderGame } from "./canvas/renderer.js";
import { updateMovementHeartbeat } from "./input/movement.js";

/** Coordinates the render + input heartbeat via requestAnimationFrame. */

let animationFrameId = null;

/** Starts the requestAnimationFrame loop used by the canvas renderer. */
export function startGameLoop() {
  if (animationFrameId !== null) {
    return;
  }

  const step = (timestamp) => {
    updateMovementHeartbeat(timestamp);
    renderGame();
    animationFrameId = window.requestAnimationFrame(step);
  };

  animationFrameId = window.requestAnimationFrame(step);
}

/** Stops the loop if we ever need to suspend rendering. */
export function stopGameLoop() {
  if (animationFrameId !== null) {
    window.cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}
