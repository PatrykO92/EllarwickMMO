import { clientState } from "../state/store.js";

/** Status helpers for header badges, tick info, and auth hints. */

/** Updates the connection badge to mirror the current WebSocket state. */
export function updateConnectionStatus() {
  const statusEl = document.querySelector("#connection-status");
  if (!statusEl) return;

  const statusText = {
    connecting: "Connecting…",
    connected: "Connected",
    disconnected: "Disconnected",
    error: "Connection error",
  }[clientState.connectionState];

  statusEl.textContent = statusText ?? clientState.connectionState;
  statusEl.dataset.state = clientState.connectionState;
}

/** Writes the authenticated user into the header. */
export function updateUserDetails() {
  const userInfo = document.querySelector("#user-info");
  if (!userInfo) return;

  if (clientState.user) {
    userInfo.textContent = `Logged in as ${clientState.user.username}`;
  } else {
    userInfo.textContent = "Not authenticated";
  }
}

/** Renders the tick indicator describing the latest world heartbeat. */
export function updateTickInfo() {
  const tickInfo = document.querySelector("#tick-info");

  if (!tickInfo) {
    return;
  }

  let label = "Tick: —";
  let stale = "true";

  if (typeof clientState.lastWorldTick === "number") {
    const age = Math.max(0, Math.round(Date.now() - (clientState.lastWorldTimestamp ?? Date.now())));
    const delta = Number.isFinite(clientState.lastWorldDelta)
      ? Math.max(0, Math.round(clientState.lastWorldDelta))
      : null;

    const segments = [`Tick ${clientState.lastWorldTick}`];

    if (delta !== null) {
      segments.push(`Δ ${delta} ms`);
    }

    segments.push(`${age} ms ago`);

    label = segments.join(" · ");
    stale = age > 1500 ? "true" : "false";
  }

  if (clientState.lastTickLabel !== label) {
    tickInfo.textContent = label;
    clientState.lastTickLabel = label;
  }

  if (tickInfo.dataset.stale !== stale) {
    tickInfo.dataset.stale = stale;
  }
}

/** Updates the login panel helper text. */
export function setAuthStatus(message, isError = false) {
  const authStatus = document.querySelector("#auth-status");
  if (!authStatus) return;
  authStatus.textContent = message;
  authStatus.dataset.error = isError ? "true" : "false";
}
