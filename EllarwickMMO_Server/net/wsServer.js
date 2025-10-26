import { WebSocketServer } from "ws";

import { validateToken } from "../auth/session.js";
import loadEnv from "../util/loadEnv.js";
import { handleGameMessage } from "../game/index.js";
import { WorldManager } from "../game/core/GameWorld.js";
import { PlayerService } from "../game/PlayerService.js";

loadEnv();

/**
 * Start WebSocket server and handle player connections.
 * @param {import('http').Server} httpServer
 */
export function createWSServer(httpServer) {
  const wss = new WebSocketServer({ server: httpServer });
  const baseUrl = process.env.SERVER_HOST || "http://localhost";

  wss.on("connection", async (ws, req) => {
    try {
      // 1. Pars token from URL
      const url = new URL(req.url, baseUrl);
      const token = url.searchParams.get("token");

      // 2. Validate token
      const user = await validateToken(token);
      if (!user) {
        ws.close(1008, "Unauthorized");
        return;
      }

      const defaultMapName = process.env.DEFAULT_MAP || "City";

      ws.user = { ...user, map: defaultMapName };
      console.log(`User connected: ${user.username} (id: ${user.id})`);

      // Load player from database
      let player = await PlayerService.loadPlayer(user.id);

      if (!player) {
        // Create new player if not found
        player = await PlayerService.createPlayer(
          user.id,
          user.username,
          defaultMapName
        );
      }

      if (!player) {
        ws.close(1011, "Failed to load player data");
        return;
      }

      // Add player to world
      const world = await WorldManager.getWorld(player.map);
      player.setOnline(true);
      world.addPlayer(player);

      ws.on("message", (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          handleGameMessage(wss, ws, msg);
        } catch (err) {
          ws.send(JSON.stringify({ type: "error", text: "Invalid JSON" }));
        }
      });

      ws.on("close", async () => {
        console.log(`User disconnected: ${user.username}`);
        // Remove player from world and save to database
        const world = WorldManager.worlds.get(player.map);
        if (world) {
          const removedPlayer = world.removePlayer(user.id);
          if (removedPlayer) {
            // Save player data to database
            await PlayerService.savePlayer(removedPlayer);
          }
        }
      });
    } catch (err) {
      console.error("WS connection error: ");
      console.error(err);
      ws.close(1011, "Server error");
    }
  });

  console.log(`WebSocket server running on: ${baseUrl}`);
  return wss;
}
