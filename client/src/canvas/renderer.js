import { WORLD_SCALE } from "../constants.js";
import { clientState } from "../state/store.js";
import { getLocalPlayer, getPlayers } from "../world/players.js";
import { updateTickInfo } from "../ui/status.js";

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

  for (const player of getPlayers().values()) {
    const screenX = width / 2 + (player.position.x - offsetX) * WORLD_SCALE;
    const screenY = height / 2 + (player.position.y - offsetY) * WORLD_SCALE;

    ctx.beginPath();
    ctx.fillStyle = player.userId === clientState.localPlayerId ? "#f97316" : "#38bdf8";
    ctx.arc(screenX, screenY, 16, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
    ctx.fillRect(screenX - 32, screenY - 32, 64, 20);

    ctx.fillStyle = "#f8fafc";
    ctx.font = "14px 'Fira Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(player.username ?? "Player", screenX, screenY - 22);

    if (player.velocity && (player.velocity.x !== 0 || player.velocity.y !== 0)) {
      ctx.beginPath();
      ctx.strokeStyle = "rgba(148, 163, 184, 0.6)";
      ctx.lineWidth = 2;
      ctx.moveTo(screenX, screenY);
      ctx.lineTo(screenX + player.velocity.x * 4, screenY + player.velocity.y * 4);
      ctx.stroke();
    }
  }
}

/** Ensures the module can be reset between test runs. */
export function destroyCanvas() {
  canvas = null;
  ctx = null;
}
