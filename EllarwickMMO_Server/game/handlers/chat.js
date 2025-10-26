/**
 * Handle chat message
 * @param {WebSocketServer} wss
 * @param {WebSocket} ws
 * @param {object} msg
 */
export function handleChat(wss, ws, msg) {
  if (typeof msg.text !== "string" || !msg.text.trim()) return;

  const payload = {
    type: "chat",
    from: ws.user.username,
    text: msg.text.trim(),
    time: new Date().toISOString(),
  };

  for (const client of wss.clients) {
    if (
      client.readyState === 1 &&
      client.user &&
      client.user.map === ws.user.map
    ) {
      client.send(JSON.stringify(payload));
    }
  }
}
