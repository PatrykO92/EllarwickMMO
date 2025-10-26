import { WorldManager } from "./GameWorld.js";

/**
 * @param {WebSocketServer} wss
 * @param {number} intervalMs
 */
export function startGameLoop(wss, intervalMs = 50) {
  console.log(`Game loop started (${intervalMs}ms interval)`);

  setInterval(() => {
    const worlds = WorldManager.getAllWorlds();
    for (const world of worlds) {
      // Convert players to network-safe data
      const playersData = Array.from(world.players.values()).map((player) =>
        player.getNetworkData()
      );

      const payload = {
        type: "world_state",
        map: world.name,
        players: playersData,
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
