import { handleLogin } from "./routes/login.js";

/** Minimal HTTP router providing login + CORS preflight handling. */

export async function handleHttpRequest(req, res) {
  try {
    const url = new URL(req.url ?? "", `http://${req.headers.host ?? "localhost"}`);

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method === "POST" && url.pathname === "/login") {
      await handleLogin(req, res);
      return;
    }

    res.statusCode = 404;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "not_found" }));
  } catch (error) {
    console.error("[http] Unexpected error while handling request", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "internal_error" }));
  }
}
