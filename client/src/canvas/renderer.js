import { WORLD_SCALE } from "../constants.js";
import { clientState } from "../state/store.js";
import { getLocalPlayer, getPlayers } from "../world/players.js";
import { updateTickInfo } from "../ui/status.js";
import { drawWorldMap, loadWorldMap } from "../world/map.js";

const PLAYER_MOVE_FRAME_DURATION = 100; // ms per frame when moving
const PLAYER_IDLE_FRAME_DURATION = 220; // ms per frame when idle
const MOVEMENT_EPSILON = 0.01;
const OUTFITS_INDEX_PATH = "/assets/outfits/index.js";
const DEFAULT_OUTFIT_CLIENT_NAME = 1;
const DEFAULT_OUTFIT_CONFIG = Object.freeze({
  spriteUrl: "/assets/outfits/outfit1.png",
  frameWidth: 16,
  frameHeight: 32,
  scale: 2,
  moveFrames: [0, 1, 2, 3, 4, 5, 6, 7],
  idleFrames: [0, 1, 2, 3],
  name: "Adventurer",
});

let outfitsRegistry = { [DEFAULT_OUTFIT_CLIENT_NAME]: DEFAULT_OUTFIT_CONFIG };
let outfitsPromise = null;

const outfitSprites = new Map();
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

  loadOutfitRegistry()
    .then(() => preloadOutfitSprite(DEFAULT_OUTFIT_CLIENT_NAME))
    .catch((error) => {
      console.error("[client] Unable to preload outfit sprites", error);
      return preloadOutfitSprite(DEFAULT_OUTFIT_CLIENT_NAME);
    })
    .catch((error) => {
      console.error("[client] Unable to load fallback outfit sprite", error);
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
  outfitSprites.clear();
  outfitsPromise = null;
  outfitsRegistry = { [DEFAULT_OUTFIT_CLIENT_NAME]: DEFAULT_OUTFIT_CONFIG };
}

function loadOutfitRegistry() {
  if (outfitsPromise) {
    return outfitsPromise;
  }

  outfitsPromise = loadOutfitModule()
    .then((module) => {
      if (module && typeof module.outfits === "object" && module.outfits !== null) {
        const registry = { ...module.outfits };
        const defaultKey = String(DEFAULT_OUTFIT_CLIENT_NAME);
        const defaultEntry = registry[defaultKey]
          ? { ...DEFAULT_OUTFIT_CONFIG, ...registry[defaultKey] }
          : { ...DEFAULT_OUTFIT_CONFIG };
        registry[defaultKey] = defaultEntry;
        outfitsRegistry = registry;
        return outfitsRegistry;
      }

      throw new Error("Outfits index is missing an 'outfits' export");
    })
    .catch((error) => {
      outfitsRegistry = { [DEFAULT_OUTFIT_CLIENT_NAME]: DEFAULT_OUTFIT_CONFIG };
      outfitsPromise = null;
      throw error;
    });

  return outfitsPromise;
}

function loadOutfitModule() {
  if (
    typeof fetch !== "function" ||
    typeof Blob === "undefined" ||
    typeof URL === "undefined" ||
    typeof URL.createObjectURL !== "function" ||
    typeof URL.revokeObjectURL !== "function"
  ) {
    return Promise.reject(new Error("Outfit registry requires browser Fetch, Blob, and URL APIs"));
  }

  return fetch(OUTFITS_INDEX_PATH, { cache: "no-store" })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to fetch outfit registry: ${response.status}`);
      }
      return response.text();
    })
    .then((source) => {
      const blob = new Blob([source], { type: "text/javascript" });
      const moduleUrl = URL.createObjectURL(blob);

      return import(/* @vite-ignore */ moduleUrl)
        .finally(() => {
          URL.revokeObjectURL(moduleUrl);
        });
    });
}

function toRegistryKey(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? String(numeric) : String(DEFAULT_OUTFIT_CLIENT_NAME);
}

function getOutfitConfig(clientName) {
  const registry = outfitsRegistry ?? {};
  const fallback = registry[String(DEFAULT_OUTFIT_CLIENT_NAME)] ?? DEFAULT_OUTFIT_CONFIG;
  const entry = registry[toRegistryKey(clientName)];

  return {
    ...DEFAULT_OUTFIT_CONFIG,
    ...fallback,
    ...(entry ?? {}),
  };
}

function ensureOutfitResource(clientName) {
  const key = toRegistryKey(clientName);
  const config = getOutfitConfig(clientName);

  if (!config?.spriteUrl) {
    return null;
  }

  let resource = outfitSprites.get(key);

  if (resource) {
    return resource;
  }

  const frameWidth = Math.max(1, Number(config.frameWidth ?? DEFAULT_OUTFIT_CONFIG.frameWidth));
  const frameHeight = Math.max(1, Number(config.frameHeight ?? frameWidth));
  const scaleValue = Number(config.scale ?? DEFAULT_OUTFIT_CONFIG.scale ?? 1);
  const scale = Number.isFinite(scaleValue) && scaleValue > 0 ? scaleValue : 1;
  const image = new Image();

  resource = {
    key,
    config,
    frameWidth,
    frameHeight,
    scale,
    image,
    columns: 1,
    isLoaded: false,
  };

  resource.promise = new Promise((resolve, reject) => {
    image.onload = () => {
      resource.columns = Math.max(1, Math.floor(image.width / frameWidth));
      resource.isLoaded = true;
      resolve(resource);
    };
    image.onerror = () => {
      outfitSprites.delete(key);
      reject(new Error(`Failed to load outfit sprite '${config.spriteUrl}'`));
    };
  });

  image.src = config.spriteUrl;
  outfitSprites.set(key, resource);
  resource.promise.catch((error) => {
    console.error(`[client] Failed to load outfit sprite '${config.spriteUrl}'`, error);
  });

  return resource;
}

function preloadOutfitSprite(clientName) {
  const resource = ensureOutfitResource(clientName);

  if (!resource) {
    return Promise.resolve();
  }

  if (resource.isLoaded) {
    return Promise.resolve(resource);
  }

  return resource.promise ?? Promise.resolve(resource);
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
    const outfitClientName = player?.outfit?.clientName ?? DEFAULT_OUTFIT_CLIENT_NAME;
    const config = getOutfitConfig(outfitClientName);

    if (state.outfitClientName !== outfitClientName) {
      state.outfitClientName = outfitClientName;
      state.frameIndex = 0;
      state.elapsed = 0;
      state.currentFrame = 0;
      state.mode = "idle";
    }

    ensureOutfitResource(outfitClientName);
    const moveFrames = Array.isArray(config.moveFrames) ? config.moveFrames : DEFAULT_OUTFIT_CONFIG.moveFrames;
    const idleFrames = Array.isArray(config.idleFrames) ? config.idleFrames : DEFAULT_OUTFIT_CONFIG.idleFrames;

    if (velocity.x > MOVEMENT_EPSILON) {
      state.facing = "right";
    } else if (velocity.x < -MOVEMENT_EPSILON) {
      state.facing = "left";
    }

    if (isMoving) {
      advanceAnimation(state, moveFrames, deltaMs, PLAYER_MOVE_FRAME_DURATION, "move");
    } else {
      advanceAnimation(state, idleFrames, deltaMs, PLAYER_IDLE_FRAME_DURATION, "idle");
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
      outfitClientName: DEFAULT_OUTFIT_CLIENT_NAME,
    };
    playerAnimations.set(userId, state);
  }

  if (typeof state.outfitClientName === "undefined") {
    state.outfitClientName = DEFAULT_OUTFIT_CLIENT_NAME;
  }

  return state;
}

function advanceAnimation(state, frames, deltaMs, frameDuration, mode) {
  const sequence = Array.isArray(frames) ? frames : [];

  if (!sequence.length || frameDuration <= 0) {
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
    state.frameIndex = (state.frameIndex + 1) % sequence.length;
  }

  state.currentFrame = sequence[state.frameIndex];
}

function drawPlayer(ctx, player, viewportWidth, viewportHeight, offsetX, offsetY) {
  const screenX = viewportWidth / 2 + (player.position.x - offsetX) * WORLD_SCALE;
  const screenY = viewportHeight / 2 + (player.position.y - offsetY) * WORLD_SCALE;

  const state = ensureAnimationState(player.userId);
  const outfitClientName = player?.outfit?.clientName ?? DEFAULT_OUTFIT_CLIENT_NAME;
  const config = getOutfitConfig(outfitClientName);
  const resource = ensureOutfitResource(outfitClientName);
  const frameWidth = resource?.frameWidth ?? Math.max(1, Number(config.frameWidth ?? DEFAULT_OUTFIT_CONFIG.frameWidth));
  const frameHeight = resource?.frameHeight ?? Math.max(1, Number(config.frameHeight ?? frameWidth));
  const scaleValue = resource?.scale ?? Number(config.scale ?? DEFAULT_OUTFIT_CONFIG.scale ?? 1);
  const scale = Number.isFinite(scaleValue) && scaleValue > 0 ? scaleValue : 1;
  const destWidth = frameWidth * scale;
  const destHeight = frameHeight * scale;
  const destHalfWidth = destWidth / 2;
  const destHalfHeight = destHeight / 2;

  if (resource?.isLoaded && resource.image) {
    const frameIndex = state.currentFrame ?? 0;
    const columns = resource.columns ?? 1;
    const sourceX = (frameIndex % columns) * frameWidth;
    const sourceY = Math.floor(frameIndex / columns) * frameHeight;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    if (state.facing === "left") {
      ctx.translate(screenX, screenY);
      ctx.scale(-1, 1);
      ctx.drawImage(
        resource.image,
        sourceX,
        sourceY,
        frameWidth,
        frameHeight,
        -destHalfWidth,
        -destHalfHeight,
        destWidth,
        destHeight
      );
    } else {
      ctx.drawImage(
        resource.image,
        sourceX,
        sourceY,
        frameWidth,
        frameHeight,
        screenX - destHalfWidth,
        screenY - destHalfHeight,
        destWidth,
        destHeight
      );
    }

    ctx.restore();
  } else {
    const placeholderRadius = Math.max(4, Math.min(destHalfWidth, destHalfHeight));
    ctx.beginPath();
    ctx.fillStyle = player.userId === clientState.localPlayerId ? "#f97316" : "#38bdf8";
    ctx.arc(screenX, screenY, placeholderRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  const labelWidth = 96;
  const labelHeight = 18;
  const labelX = screenX - labelWidth / 2;
  const labelY = screenY - destHalfHeight - labelHeight - 6;

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
