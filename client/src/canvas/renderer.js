import { WORLD_SCALE } from "../constants.js";
import { clientState } from "../state/store.js";
import { getLocalPlayer, getPlayers } from "../world/players.js";
import { updateTickInfo } from "../ui/status.js";
import { drawWorldMap, loadWorldMap } from "../world/map.js";

const PLAYER_SPRITE_URL = "/assets/outfits/outfit1.png";
const PLAYER_FRAME_WIDTH = 16;
const PLAYER_FRAME_HEIGHT = 16;
const PLAYER_MOVE_FRAMES = [0, 1, 2, 3, 4, 5, 6, 7];
const PLAYER_IDLE_FRAMES = [0, 1, 2, 3];
const PLAYER_MOVE_FRAME_DURATION = 100; // ms per frame when moving
const PLAYER_IDLE_FRAME_DURATION = 220; // ms per frame when idle
const MOVEMENT_EPSILON = 0.01;

let playerSpritePromise = null;
let playerSpriteImage = null;
let isPlayerSpriteLoaded = false;
let playerSpriteColumns = 1;

const playerAnimations = new Map();
let lastAnimationTimestamp = typeof performance !== "undefined" ? performance.now() : Date.now();

let canvas = null;
let ctx = null;

/** Configures the canvas for crisp rendering on high DPI displays. */
export function setupCanvas() {
  canvas = document.querySelector("#game-canvas");
  if (!canvas) {
    return;
  }

  ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  const baseWidth = 720;
  const baseHeight = 480;
  const ratio = window.devicePixelRatio ?? 1;

  canvas.width = baseWidth * ratio;
  canvas.height = baseHeight * ratio;
  canvas.style.width = `${baseWidth}px`;
  canvas.style.height = `${baseHeight}px`;

  ctx.scale(ratio, ratio);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.imageSmoothingEnabled = true;

  loadWorldMap().catch((error) => {
    console.error("[client] Unable to preload world map", error);
  });

  loadPlayerSprite().catch((error) => {
    console.error("[client] Unable to preload player sprite", error);
  });
}

/** Draws the current world snapshot. */
export function renderGame() {
  if (!canvas || !ctx) {
    return;
  }

  updateTickInfo();

  const width = canvas.width / (window.devicePixelRatio ?? 1);
  const height = canvas.height / (window.devicePixelRatio ?? 1);

  ctx.clearRect(0, 0, width, height);

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#0b1120");
  gradient.addColorStop(1, "#111c2e");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const local = getLocalPlayer();
  const offsetX = local ? local.position.x : 0;
  const offsetY = local ? local.position.y : 0;

  drawWorldMap(ctx, width, height, offsetX, offsetY);

  const players = getPlayers();
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  const deltaMs = Math.min(now - lastAnimationTimestamp, 250);
  lastAnimationTimestamp = now;

  updatePlayerAnimations(players, deltaMs);

  for (const player of players.values()) {
    drawPlayer(ctx, player, width, height, offsetX, offsetY);
  }
}

/** Ensures the module can be reset between test runs. */
export function destroyCanvas() {
  canvas = null;
  ctx = null;
  playerAnimations.clear();
  playerSpritePromise = null;
  playerSpriteImage = null;
  isPlayerSpriteLoaded = false;
  playerSpriteColumns = 1;
}

function loadPlayerSprite() {
  if (playerSpritePromise) {
    return playerSpritePromise;
  }

  playerSpritePromise = new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      playerSpriteImage = image;
      playerSpriteColumns = Math.max(1, Math.floor(image.width / PLAYER_FRAME_WIDTH));
      isPlayerSpriteLoaded = true;
      resolve(image);
    };
    image.onerror = () => {
      reject(new Error(`Failed to load player sprite '${PLAYER_SPRITE_URL}'`));
    };
    image.src = PLAYER_SPRITE_URL;
  });

  return playerSpritePromise;
}

function updatePlayerAnimations(players, deltaMs) {
  for (const [userId, state] of playerAnimations.entries()) {
    if (!players.has(userId)) {
      playerAnimations.delete(userId);
    }
  }

  for (const player of players.values()) {
    const state = ensureAnimationState(player.userId);
    const velocity = player.velocity ?? { x: 0, y: 0 };
    const speed = Math.hypot(velocity.x ?? 0, velocity.y ?? 0);
    const isMoving = speed > MOVEMENT_EPSILON;

    if (velocity.x > MOVEMENT_EPSILON) {
      state.facing = "right";
    } else if (velocity.x < -MOVEMENT_EPSILON) {
      state.facing = "left";
    }

    if (isMoving) {
      advanceAnimation(state, PLAYER_MOVE_FRAMES, deltaMs, PLAYER_MOVE_FRAME_DURATION, "move");
    } else {
      advanceAnimation(state, PLAYER_IDLE_FRAMES, deltaMs, PLAYER_IDLE_FRAME_DURATION, "idle");
    }
  }
}

function ensureAnimationState(userId) {
  let state = playerAnimations.get(userId);

  if (!state) {
    state = {
      frameIndex: 0,
      elapsed: 0,
      facing: "right",
      mode: "idle",
      currentFrame: 0,
    };
    playerAnimations.set(userId, state);
  }

  return state;
}

function advanceAnimation(state, frames, deltaMs, frameDuration, mode) {
  if (!frames.length || frameDuration <= 0) {
    state.currentFrame = 0;
    state.frameIndex = 0;
    state.elapsed = 0;
    state.mode = mode;
    return;
  }

  if (state.mode !== mode) {
    state.mode = mode;
    state.frameIndex = 0;
    state.elapsed = deltaMs;
  } else {
    state.elapsed += deltaMs;
  }

  while (state.elapsed >= frameDuration) {
    state.elapsed -= frameDuration;
    state.frameIndex = (state.frameIndex + 1) % frames.length;
  }

  state.currentFrame = frames[state.frameIndex];
}

function drawPlayer(ctx, player, viewportWidth, viewportHeight, offsetX, offsetY) {
  const screenX = viewportWidth / 2 + (player.position.x - offsetX) * WORLD_SCALE;
  const screenY = viewportHeight / 2 + (player.position.y - offsetY) * WORLD_SCALE;

  const state = ensureAnimationState(player.userId);
  const destSize = WORLD_SCALE;
  const destHalf = destSize / 2;

  if (isPlayerSpriteLoaded && playerSpriteImage) {
    const frameIndex = state.currentFrame ?? 0;
    const columns = playerSpriteColumns;
    const sourceX = (frameIndex % columns) * PLAYER_FRAME_WIDTH;
    const sourceY = Math.floor(frameIndex / columns) * PLAYER_FRAME_HEIGHT;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    if (state.facing === "left") {
      ctx.translate(screenX, screenY);
      ctx.scale(-1, 1);
      ctx.drawImage(
        playerSpriteImage,
        sourceX,
        sourceY,
        PLAYER_FRAME_WIDTH,
        PLAYER_FRAME_HEIGHT,
        -destHalf,
        -destHalf,
        destSize,
        destSize
      );
    } else {
      ctx.drawImage(
        playerSpriteImage,
        sourceX,
        sourceY,
        PLAYER_FRAME_WIDTH,
        PLAYER_FRAME_HEIGHT,
        screenX - destHalf,
        screenY - destHalf,
        destSize,
        destSize
      );
    }

    ctx.restore();
  } else {
    ctx.beginPath();
    ctx.fillStyle = player.userId === clientState.localPlayerId ? "#f97316" : "#38bdf8";
    ctx.arc(screenX, screenY, destHalf, 0, Math.PI * 2);
    ctx.fill();
  }

  const labelWidth = 96;
  const labelHeight = 18;
  const labelX = screenX - labelWidth / 2;
  const labelY = screenY - destHalf - labelHeight - 6;

  ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
  ctx.fillRect(labelX, labelY, labelWidth, labelHeight);

  ctx.fillStyle = "#f8fafc";
  ctx.font = "14px 'Fira Sans', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(player.username ?? "Player", screenX, labelY + labelHeight / 2);

  if (player.velocity && (Math.abs(player.velocity.x) > MOVEMENT_EPSILON || Math.abs(player.velocity.y) > MOVEMENT_EPSILON)) {
    ctx.beginPath();
    ctx.strokeStyle = "rgba(148, 163, 184, 0.6)";
    ctx.lineWidth = 2;
    ctx.moveTo(screenX, screenY);
    ctx.lineTo(screenX + player.velocity.x * 4, screenY + player.velocity.y * 4);
    ctx.stroke();
  }
}
