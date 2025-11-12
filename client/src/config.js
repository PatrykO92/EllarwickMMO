// Client-side configuration helper that prefers Vite env vars but falls back to
// the current browser location when running locally.
const windowHost = typeof window !== "undefined" ? window.location.hostname : "localhost";
const windowProtocol = typeof window !== "undefined" ? window.location.protocol.replace(":", "") : "http";

const serverProtocol = import.meta.env.VITE_SERVER_PROTOCOL ?? windowProtocol ?? "http";
const serverWsProtocol =
  import.meta.env.VITE_SERVER_WS_PROTOCOL ?? (serverProtocol === "https" ? "wss" : "ws");
const serverHost = import.meta.env.VITE_SERVER_HOST ?? windowHost ?? "localhost";
const serverPort = import.meta.env.VITE_SERVER_PORT ?? "9090";

function buildBaseUrl(protocol, host, port) {
  if (!port) {
    return `${protocol}://${host}`;
  }

  return `${protocol}://${host}:${port}`;
}

export const httpBaseUrl = buildBaseUrl(serverProtocol, serverHost, serverPort);
export const wsBaseUrl = buildBaseUrl(serverWsProtocol, serverHost, serverPort);
