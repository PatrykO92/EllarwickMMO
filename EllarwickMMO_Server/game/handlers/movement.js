import { movePlayerInWorld } from "../core/world.js";

/**
 * Handle movement message
 * @param {WebSocketServer} wss
 * @param {WebSocket} ws
 * @param {object} msg
 */
export function handleMove(wss, ws, msg) {
  const player = movePlayerInWorld(ws, msg.direction);
  if (!player) {
    ws.send(JSON.stringify({ type: "error", text: "Movement failed" }));
    return;
  }

  const payload = {
    type: "position",
    username: player.username,
    x: player.x,
    y: player.y,
    map: player.map,
  };

  // Broadcast position to all players in the same map
  for (const client of wss.clients) {
    if (
      client.readyState === 1 &&
      client.user &&
      client.user.map === player.map
    ) {
      client.send(JSON.stringify(payload));
    }
  }
}
