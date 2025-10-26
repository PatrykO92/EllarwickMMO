import { WebSocketServer } from "ws";

import { validateToken } from "../auth/session.js";
import loadEnv from "../util/loadEnv.js";
import { handleGameMessage } from "../game/index.js";
import { addPlayerToWorld, removePlayerFromWorld } from "../game/core/world.js";

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
      await addPlayerToWorld(user, defaultMapName);

      ws.on("message", (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          handleGameMessage(wss, ws, msg);
        } catch (err) {
          ws.send(JSON.stringify({ type: "error", text: "Invalid JSON" }));
        }
      });

      ws.on("close", () => {
        console.log(`User disconnected: ${user.username}`);
        removePlayerFromWorld(user.id, ws.user?.map || defaultMapName);
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
