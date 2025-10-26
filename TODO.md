# ✅ ELLARWICK MMO — DEVELOPMENT TODO

## 📦 CORE / BACKEND

- [x] PostgreSQL integration
- [x] User registration / login / logout
- [x] WebSocket authentication via token
- [x] Chat broadcast system
- [x] Modular WS dispatcher
- [x] Player movement handler (`type: "move"`)
- [x] Unified player state management (removed duplicate state.js)
- [ ] Hardcoded "city" in wsServer.js, loop.js, movement.js etc.
- [ ] Spell handler (`type: "use_spell"`)
- [ ] Combat handler (`type: "attack"`)
- [ ] Ping/pong keepalive system
- [ ] Reconnect & session restore
- [x] Server tick loop (game heartbeat)
- [ ] Save/load player state to DB
- [x] Player position synchronization (for nearby players)

---

## 🧩 GAMEPLAY SYSTEMS

- [ ] Character stats (HP, MP, EXP, level)
- [ ] Leveling & experience gain
- [ ] Monsters and spawn logic
- [ ] Loot & item generation
- [ ] Inventory management
- [ ] Skills and cooldowns
- [ ] NPC interaction system
- [ ] Chat commands (e.g. `/whisper`, `/party`, `/help`)

---

## 🌐 NETWORK / INFRASTRUCTURE

- [x] Base HTTP endpoints (`/register`, `/login`, `/logout`)
- [x] WebSocket message routing
- [ ] Rate limiting (anti-spam)
- [ ] Message queue or job system (future scaling)
- [ ] Server metrics and logging
- [ ] Connection error handling
- [ ] Compression / optimization (for large payloads)
- [ ] Multi-server (zones / shards)

---

## 💾 DATABASE

- [x] users
- [x] sessions
- [ ] characters
- [ ] items
- [ ] monsters
- [ ] chat_log
- [ ] world_state (player positions, events)

---

## 🧰 TOOLS / DEV

- [ ] Basic admin panel (browser-based monitoring)
- [ ] Logging system (rotating file or db)
- [ ] TODO auto sync with GitHub issues
- [ ] Local chat history in client
- [ ] Dev commands (`/reload`, `/stats`, `/debug`)

## 🎨 FRONTEND (CANVAS CLIENT)

- [ ] Render map (tile-based)
- [ ] Draw player sprites & movement interpolation
- [ ] Display chat overlay
- [ ] Handle spell animations
- [ ] UI: HP/MP bars, inventory, skill bar
- [ ] Login screen + reconnect
- [ ] Sound & effects system

---

## 🧪 TESTING / QA

- [ ] Local test bots (simulate 10 players)
- [ ] Latency simulation
- [ ] DB stress test
- [ ] WS connection flood test
- [ ] Save/load consistency checks

---

## 🗺️ LONG TERM / ROADMAP

- [ ] Account management via web
- [ ] Multi-language client
- [ ] Cloud deployment (Docker + PostgreSQL)
- [ ] CDN for assets
- [ ] Player trading system
- [ ] Guilds / parties
- [ ] PvP arenas
- [ ] Persistent world state save
