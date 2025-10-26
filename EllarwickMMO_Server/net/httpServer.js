import http from "http";

import { register } from "../auth/register.js";
import { login } from "../auth/login.js";
import { readBody } from "../util/body.js";
import { revokeToken } from "../auth/session.js";

export function createHTTPServer() {
  const httpServer = http.createServer(async (req, res) => {
    //CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    res.setHeader("Access-Control-Allow-HEADERS", "Content-Type");

    if (req.method === "OPTIONS") return res.end();

    try {
      if (req.url === "/register" && req.method === "POST") {
        const body = await readBody(req);
        const { username, password } = JSON.parse(body);
        const result = await register(username, password);
        return sendJSON(res, result);
      }

      if (req.url === "/login" && req.method === "POST") {
        const body = await readBody(req);
        const { username, password } = JSON.parse(body);
        const result = await login(username, password);
        return sendJSON(res, result);
      }

      if (req.url === "/logout" && req.method === "POST") {
        const body = await readBody(req);
        const { token } = JSON.parse(body);
        const result = await revokeToken(token);
        return sendJSON(res, result);
      }

      //default route
      res.writeHead(200, { "Content=Type": "text/plain" });
      res.end("EllarwickMMO backend is running. \n");
    } catch (err) {
      console.error("HTTP error: ");
      console.error(err);
      sendJSON(res, { ok: false, error: "Server error" }, 500);
    }
  });

  return httpServer;
}

function sendJSON(res, data, code = 200) {
  res.writeHead(code, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}
