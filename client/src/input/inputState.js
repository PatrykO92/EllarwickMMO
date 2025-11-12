/** Creates a fresh input state describing which movement keys are pressed. */
export function createInputState() {
  return { up: false, down: false, left: false, right: false };
}

/** Mapping from keyboard event codes to the matching directional flag. */
export const movementKeyMap = {
  KeyW: "up",
  ArrowUp: "up",
  KeyS: "down",
  ArrowDown: "down",
  KeyA: "left",
  ArrowLeft: "left",
  KeyD: "right",
  ArrowRight: "right",
};

/** Returns whether two movement vectors are effectively the same. */
export function vectorsEqual(a, b) {
  return Math.abs(a.x - b.x) < 0.001 && Math.abs(a.y - b.y) < 0.001;
}

/**
 * Normalizes the accumulated input flags into a unit direction vector so the
 * server receives consistent magnitude regardless of diagonal movement.
 */
export function computeMovementVector(input) {
  let x = 0;
  let y = 0;

  if (input.left) x -= 1;
  if (input.right) x += 1;
  if (input.up) y -= 1;
  if (input.down) y += 1;

  if (x === 0 && y === 0) {
    return { x: 0, y: 0 };
  }

  const length = Math.hypot(x, y);
  if (length === 0) {
    return { x: 0, y: 0 };
  }

  return { x: Number((x / length).toFixed(4)), y: Number((y / length).toFixed(4)) };
}
