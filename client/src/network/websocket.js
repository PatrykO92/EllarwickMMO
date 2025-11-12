import { wsBaseUrl } from "../config.js";
import { clientState, resetMessages, resetMovementState, resetWorldSnapshot } from "../state/store.js";
import { appendMessage, appendSystemMessage, renderMessages } from "../ui/messages.js";
import { renderPlayerRoster } from "../ui/roster.js";
import { setAuthStatus, updateConnectionStatus, updateTickInfo, updateUserDetails } from "../ui/status.js";
import { applyPlayerSnapshot, getPlayers, removePlayer, syncWorldPlayers } from "../world/players.js";

// Manages the authenticated WebSocket connection and dispatches incoming events
// to the rest of the client subsystems.

/** Closes any open WebSocket connection and cleans up event listeners. */
export function disconnectWebSocket() {
  if (clientState.ws) {
    clientState.ws.removeEventListener("message", handleMessageEvent);
    clientState.ws.close();
    clientState.ws = null;
  }

  resetWorldSnapshot();
  resetMovementState();
  renderPlayerRoster();
  updateTickInfo();

  clientState.connectionState = "disconnected";
  updateConnectionStatus();
}

/** Opens a new authenticated WebSocket connection. */
export function connectWebSocket() {
  disconnectWebSocket();

  if (!clientState.token) {
    appendSystemMessage("Missing session token");
    return;
  }

  resetWorldSnapshot();
  resetMovementState();
  renderPlayerRoster();
  updateTickInfo();

  const url = `${wsBaseUrl}/?token=${encodeURIComponent(clientState.token)}`;
  const ws = new WebSocket(url);
  clientState.ws = ws;
  clientState.connectionState = "connecting";
  updateConnectionStatus();

  ws.addEventListener("open", () => {
    clientState.connectionState = "connected";
    clientState.lastSentVector = { x: 0, y: 0 };
    clientState.lastMoveSentAt = performance.now();
    updateConnectionStatus();
    appendSystemMessage("Connected to game server");
  });

  ws.addEventListener("close", (event) => {
    clientState.connectionState = "disconnected";
    updateConnectionStatus();
    if (clientState.ws === ws) {
      clientState.ws = null;
    }

    resetWorldSnapshot();
    renderPlayerRoster();
    updateTickInfo();

    appendSystemMessage(`Disconnected (${event.code}${event.reason ? ` – ${event.reason}` : ""})`);
  });

  ws.addEventListener("error", (error) => {
    console.error("[client] WebSocket error", error);
    clientState.connectionState = "error";
    updateConnectionStatus();
  });

  ws.addEventListener("message", handleMessageEvent);
}

/** Serialises and sends a movement intent to the server. */
export function sendMoveIntent(payload) {
  if (!clientState.ws || clientState.ws.readyState !== WebSocket.OPEN) {
    return;
  }

  clientState.ws.send(
    JSON.stringify({
      type: "move",
      requestId: payload.sequence,
      payload,
    })
  );
}

/** Sends a chat message through the socket. */
export function sendChatMessage(message) {
  if (!clientState.ws || clientState.ws.readyState !== WebSocket.OPEN) {
    appendSystemMessage("Cannot send message while disconnected");
    return;
  }

  clientState.ws.send(
    JSON.stringify({
      type: "chat:send",
      payload: { message },
    })
  );
}

/** Emits a ping packet so the server can reply with latency info. */
export function sendPing() {
  if (!clientState.ws || clientState.ws.readyState !== WebSocket.OPEN) {
    appendSystemMessage("Cannot ping while disconnected");
    return;
  }

  clientState.ws.send(
    JSON.stringify({
      type: "ping",
      payload: { timestamp: Date.now() },
    })
  );
}

function handleMessageEvent(event) {
  let data;
  try {
    data = JSON.parse(event.data);
  } catch (error) {
    console.warn("[client] Failed to parse WebSocket message", error);
    return;
  }

  switch (data.type) {
    case "world:state": {
      syncWorldPlayers(data.payload?.players ?? []);
      renderPlayerRoster();
      break;
    }
    case "world:update": {
      const payload = data.payload ?? {};

      if (Array.isArray(payload.players)) {
        syncWorldPlayers(payload.players);
        renderPlayerRoster();
      }

      if (typeof payload.tick === "number") {
        clientState.lastWorldTick = payload.tick;
      }

      if (typeof payload.delta === "number" && Number.isFinite(payload.delta)) {
        clientState.lastWorldDelta = payload.delta;
      } else {
        clientState.lastWorldDelta = null;
      }

      clientState.lastWorldTimestamp =
        typeof payload.timestamp === "number" && Number.isFinite(payload.timestamp)
          ? payload.timestamp
          : Date.now();

      updateTickInfo();
      break;
    }
    case "player:joined": {
      if (data.payload?.player) {
        const joined = applyPlayerSnapshot(data.payload.player);
        if (joined) {
          renderPlayerRoster();
        }

        if (data.payload.player.userId !== clientState.localPlayerId) {
          appendSystemMessage(`${data.payload.player.username ?? "Player"} entered the realm`);
        }
      }
      break;
    }
    case "player:left": {
      if (typeof data.payload?.userId !== "undefined") {
        const departed = getPlayers().get(data.payload.userId);
        if (departed && departed.userId !== clientState.localPlayerId) {
          appendSystemMessage(`${departed.username ?? "Player"} left the realm`);
        }

        if (removePlayer(data.payload.userId)) {
          renderPlayerRoster();
        }
      }
      break;
    }
    case "player:moved":
    case "move:ack": {
      if (data.payload?.player) {
        const updated = applyPlayerSnapshot(data.payload.player);
        if (updated) {
          renderPlayerRoster();
        }
      }
      break;
    }
    case "chat:message": {
      if (!data.payload) return;
      appendMessage({
        id: data.payload.id,
        type: "chat",
        message: data.payload.message,
        sentAt: data.payload.sentAt,
        user: data.payload.user,
      });
      break;
    }
    case "pong": {
      clientState.lastPong = data.payload;
      const latencyEl = document.querySelector("#latency-info");
      if (latencyEl && data.payload) {
        const { timestamp, receivedAt } = data.payload;
        const now = Date.now();
        const serverReceived = typeof receivedAt === "number" ? receivedAt : now;
        const clientSent = typeof timestamp === "number" ? timestamp : now;
        const roundTrip = now - clientSent;
        const serverProcessing = serverReceived - clientSent;
        latencyEl.textContent = `RTT: ${roundTrip} ms · Server processing: ${serverProcessing} ms`;
      }
      break;
    }
    case "error": {
      if (data.payload?.message) {
        appendSystemMessage(`Error: ${data.payload.message}`);
      }
      break;
    }
    default: {
      console.log("[client] Received unhandled message", data);
      break;
    }
  }
}

/** Utility used by logout to fully clear the client-side session. */
export function clearSession() {
  disconnectWebSocket();
  clientState.user = null;
  clientState.token = null;
  clientState.localPlayerId = null;
  resetMessages();
  renderMessages();
  renderPlayerRoster();
  updateUserDetails();
  updateConnectionStatus();
  updateTickInfo();
  setAuthStatus("Logged out");
}
