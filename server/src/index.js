import http from "http";
import { WebSocketServer } from "ws";
import { SERVER_HOST, SERVER_PORT } from "../config/config.js";

const host = SERVER_HOST ?? "0.0.0.0";
const port = SERVER_PORT ?? 9090;

const server = http.createServer((req, res) => {
  res.statusCode = 404;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.end("Not Found");
});

const wss = new WebSocketServer({ server });

wss.on("connection", (ws, request) => {
  const { socket } = request;
  const remoteAddres = socket.remoteAddress ?? "unknown";
  const remotePort = socket.remotePort ?? "unknow";
  const connectedAt = new Date().toISOString();

  console.log(
    `WebSocket connextion established from ${remoteAddres}:${remotePort} at ${connectedAt}`
  );

  ws.on("close", (code, reason) => {
    const reasonText =
      typeof reason === "string"
        ? reason
        : reason instanceof Buffer
        ? reason.toString("utf-8")
        : "";

    console.log(
      `WebSocket connection closed from ${remoteAddres}:${remotePort} at ${new Date().toISOString()} with code ${code} and reason ${reasonText}`
    );
  });

  ws.on("error", (error) => {
    console.error(
      `WebScoket error from ${remoteAddres}:${remotePort} at${new Date().toISOString()}:`
    );
    console.error(error);
  });
});

server.listen(port, host, () => {
  console.log(`Server listining on http://${host}:${port}`);
});
