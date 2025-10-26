import { initSchema } from "./db/connect.js";
import { createWSServer } from "./net/wsServer.js";
import { createHTTPServer } from "./net/httpServer.js";
import { startGameLoop } from "./game/core/gameLoop.js";
import loadEnv from "./util/loadEnv.js";

loadEnv();

async function main() {
  try {
    console.log("Starting backend...");

    // Init databes
    await initSchema();
    console.log("Database schema is ready.");

    // Start HTTP server
    const httpServer = createHTTPServer();

    // Start WebSocket server
    const wss = createWSServer(httpServer);
    startGameLoop(wss, 50);

    // Listen on configured port
    const port = process.env.SERVER_PORT || 9090;
    httpServer.listen(port, () => {
      console.log(`HTTP + WebSocket server listening on port ${port}`);
    });
  } catch (err) {
    console.error("Error on server starting: ");
    console.error(err);
    process.exit(1);
  }
}

main();
