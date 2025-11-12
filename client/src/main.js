import "./style.css";
import { startGameLoop } from "./gameLoop.js";
import { handleMovementKey, resetMovementTracking } from "./input/movement.js";
import { login } from "./network/http.js";
import { clearSession, connectWebSocket, disconnectWebSocket, sendChatMessage, sendPing } from "./network/websocket.js";
import { clientState } from "./state/store.js";
import { renderMessages, appendSystemMessage } from "./ui/messages.js";
import { renderPlayerRoster } from "./ui/roster.js";
import { renderAppShell, showAuthPanel } from "./ui/layout.js";
import { setAuthStatus, updateConnectionStatus, updateTickInfo, updateUserDetails } from "./ui/status.js";
import { setupCanvas } from "./canvas/renderer.js";

// Main client bootstrap: renders the UI, handles auth, and wires network events.
const app = document.querySelector("#app");
if (!app) {
  throw new Error("Missing #app root element");
}

// Bootstrap the DOM and initial render passes before wiring interactions.
renderAppShell(app);
setupCanvas();
renderMessages();
renderPlayerRoster();
updateConnectionStatus();
updateUserDetails();
updateTickInfo();
startGameLoop();

/** Handles authentication form submissions and starts the socket connection. */
async function handleLogin(event) {
  event.preventDefault();
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) {
    return;
  }

  const formData = new FormData(form);
  const identifier = String(formData.get("identifier") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!identifier || !password) {
    setAuthStatus("Please enter your credentials", true);
    return;
  }

  setAuthStatus("Signing in…");
  const submitButton = form.querySelector("button[type='submit']");
  if (submitButton) {
    submitButton.disabled = true;
  }

  try {
    const { token, user } = await login(identifier, password);
    clientState.token = token;
    clientState.user = user;
    clientState.localPlayerId = user.id;
    resetMovementTracking();

    setAuthStatus("Login successful");
    updateUserDetails();
    showAuthPanel(false);
    appendSystemMessage("Authenticated successfully");
    connectWebSocket();
    form.reset();
  } catch (error) {
    console.error("[client] Login request failed", error);
    setAuthStatus(error?.message ?? "Login failed", true);
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
    }
  }
}

/** Sends the current chat input contents to the server. */
function handleChatSubmit(event) {
  event.preventDefault();
  const input = document.querySelector("#chat-input");
  if (!(input instanceof HTMLInputElement)) {
    return;
  }

  const value = input.value.trim();
  if (!value) {
    return;
  }

  sendChatMessage(value);
  input.value = "";
}

/** Gracefully logs the player out and returns to the login screen. */
function handleLogout() {
  clearSession();
  showAuthPanel(true);
  appendSystemMessage("Logged out");
}

const loginForm = document.querySelector("#login-form");
loginForm?.addEventListener("submit", handleLogin);

document.querySelector("#chat-form")?.addEventListener("submit", handleChatSubmit);

document.querySelector("#ping-button")?.addEventListener("click", () => {
  sendPing();
});

document.querySelector("#logout-button")?.addEventListener("click", handleLogout);

window.addEventListener("beforeunload", () => {
  disconnectWebSocket();
});

window.addEventListener("keydown", (event) => handleMovementKey(event, true));
window.addEventListener("keyup", (event) => handleMovementKey(event, false));
