import { WorldManager } from "../core/GameWorld.js";
import { PlayerService } from "../PlayerService.js";

/**
 * Handle movement message
 * @param {WebSocketServer} wss
 * @param {WebSocket} ws
 * @param {object} msg
 */
export async function handleMove(wss, ws, msg) {
  if (!ws.user) {
    ws.send(JSON.stringify({ type: "error", text: "Not authenticated" }));
    return;
  }

  const world = WorldManager.worlds.get(ws.user.map);
  if (!world) {
    ws.send(JSON.stringify({ type: "error", text: "World not found" }));
    return;
  }

  const player = world.movePlayer(ws.user.id, msg.direction);
  if (!player) {
    ws.send(JSON.stringify({ type: "error", text: "Movement failed" }));
    return;
  }

  // Save position to database (async, don't wait)
  PlayerService.savePlayerPosition(player).catch((err) => {
    console.error("Failed to save player position:", err);
  });

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
