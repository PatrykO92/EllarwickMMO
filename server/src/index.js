import http from "http";
import { WebSocketServer } from "ws";

/**
 * Entry point that wires HTTP routing, WebSocket dispatching, and the tick loop
 * together into a single Node.js process. The server is intentionally lean so
 * gameplay modules live in their own files.
 */
import { SERVER_HOST, SERVER_PORT } from "../config/config.js";
import { connectToDatabase } from "./db/prismaClient.js";
import { handleHttpRequest } from "./server/http/router.js";
import { authenticateWebSocket, WebSocketAuthError } from "./server/ws/authenticate.js";
import { createWebSocketDispatcher } from "./server/ws/dispatcher.js";
import { registerWebSocketModules } from "./server/ws/modules/index.js";
import { registerTickLoop } from "./server/tick/index.js";

await connectToDatabase();

const host = SERVER_HOST;
const port = SERVER_PORT;

const server = http.createServer(async (req, res) => {
  await handleHttpRequest(req, res);
});

const wss = new WebSocketServer({ server });
const dispatcher = createWebSocketDispatcher();

const { playerState } = registerWebSocketModules(dispatcher);
const { tickLoop, dispose: disposeTickLoop } = registerTickLoop(dispatcher, { playerState });

wss.on("connection", async (ws, request) => {
  const { socket } = request;
  const remoteAddress = socket.remoteAddress ?? "unknown";
  const remotePort = socket.remotePort ?? "unknown";
  const connectedAt = new Date().toISOString();

  let authContext;

  try {
    authContext = await authenticateWebSocket(request);
    ws.auth = authContext;
  } catch (error) {
    const isAuthError = error instanceof WebSocketAuthError;
    const closeCode = isAuthError ? error.closeCode : 1011;
    const reason = isAuthError ? error.code : "internal_error";

    console.warn(
      `WebSocket authentication failed from ${remoteAddress}:${remotePort} at ${connectedAt}: ${reason}`
    );

    if (!isAuthError) {
      console.error(error);
    }

    ws.close(closeCode, reason);
    ws.terminate();
    return;
  }

  const { connection: dispatcherConnection } = dispatcher.attachConnection(ws, {
    auth: authContext,
    remoteAddress,
    remotePort,
  });

  ws.connectionId = dispatcherConnection.id;

  console.log(
    `WebSocket dispatcher connection ${dispatcherConnection.id} established for user ${authContext.user.username} (#${authContext.userId}) from ${remoteAddress}:${remotePort} at ${connectedAt}`
  );

  ws.on("close", (code, reason) => {
    const reasonText =
      typeof reason === "string"
        ? reason
        : reason instanceof Buffer
        ? reason.toString("utf-8")
        : "";

    console.log(
      `WebSocket connection ${dispatcherConnection.id} (user ${authContext.user.username} #${authContext.userId}) closed from ${remoteAddress}:${remotePort} at ${new Date().toISOString()} with code ${code} and reason ${reasonText}`
    );
  });

  ws.on("error", (error) => {
    console.error(
      `WebSocket error on connection ${dispatcherConnection.id} (user ${authContext.user.username} #${authContext.userId}) from ${remoteAddress}:${remotePort} at ${new Date().toISOString()}:`
    );
    console.error(error);
  });
});

server.listen(port, host, () => {
  console.log(`Server listening on http://${host}:${port}`);
});

server.on("close", () => {
  disposeTickLoop();
});
