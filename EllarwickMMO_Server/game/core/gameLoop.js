import { getAllWorlds } from "./world.js";

/**
 * @param {WebSocketServer} wss
 * @param {number} intervalMs
 */
export function startGameLoop(wss, intervalMs = 50) {
  console.log(`Game loop started (${intervalMs}ms interval)`);

  setInterval(() => {
    const worlds = getAllWorlds();
    for (const world of worlds) {
      const payload = {
        type: "world_state",
        map: world.name,
        players: Array.from(world.players.values()),
        time: Date.now(),
      };

      for (const client of wss.clients) {
        if (
          client.readyState === 1 &&
          client.user &&
          client.user.map === world.name
        ) {
          client.send(JSON.stringify(payload));
        }
      }
    }
  }, intervalMs);
}
