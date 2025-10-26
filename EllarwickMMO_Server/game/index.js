import { handleChat } from "./handlers/chat.js";
import { handleMove } from "./handlers/movement.js";

/**
 * @param {WebSocketServer} wss
 * @param {WebSocket} ws
 * @param {object} msg
 */
export function handleGameMessage(wss, ws, msg) {
  switch (msg.type) {
    case "chat":
      return handleChat(wss, ws, msg);
    case "move":
      return handleMove(wss, ws, msg);

    default:
      ws.send(JSON.stringify({ type: "error", text: "Unknow message type" }));
  }
}
