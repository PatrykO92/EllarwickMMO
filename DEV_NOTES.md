# 🧠 ELLARWICK — DEV NOTES

Core development notes and principles for building **Ellarwick**,  
a fully server-authoritative 2D online action RPG built with **Node.js**, **WebSockets**, and **PostgreSQL**.

---

## ⚙️ General Philosophy

- **Server-authoritative architecture** — client sends _intentions_, server decides outcomes.
- **Modular, event-driven backend** — everything goes through `eventemitter3`.
- **Simple, deterministic frontend** — Canvas renders what the server tells it.
- **All inputs validated** with **Zod** before touching game logic or database.
- **No frameworks** like Express or React — full control over codebase.
- **Database through Prisma only** — no raw SQL in gameplay logic.
- **Fast tick loop (50 ms)** drives synchronization and combat logic.

---

## 🧩 Backend Key Points

### Core Runtime

- Node.js (ESM modules)
- WebSocket server (`ws`)
- Prisma ORM + PostgreSQL / Supabase
- Zod validation layer for every WS event
- EventEmitter3 for internal event bus
- Crypto (hash, token)
- UUID for unique identifiers
- Dotenv for environment config

### Architecture

```
src/
 ├── config/
 ├── db/              # prisma + extensions
 ├── server/
 │    ├── ws/         # socket dispatcher + schema validation
 │    ├── tick/       # main world loop (50ms)
 │    ├── modules/    # player, combat, chat, etc.
 ├── utils/
 └── tests/
```

### Rules

- Every WebSocket message → validated via Zod → dispatched via eventemitter3.
- Game logic modularized by domain (player, monster, chat, loot).
- Prisma extended with domain methods (`player.move`, `player.damage`, etc.).
- Tick loop handles physics, combat, and world sync.
- Server periodically emits `worldUpdate` snapshots to all clients.

---

## 🎮 Frontend Key Points

### Core Stack

- Vite for bundling / local dev
- JavaScript (ESM)
- HTML5 Canvas for all rendering
- WebSocket (native) for networking
- HTML + CSS for UI overlays

### Rules

- Client sends **intents only** (`move`, `attack`, `useSkill`, etc.)
- No authority on gameplay — just visual representation.
- Maintains a **clientState** snapshot from server updates.
- Handles smooth rendering and optional interpolation.
- All UI (inventory, chat, HUD) runs outside the game state.
- No frameworks — keep rendering and logic minimal.

---

## 🧱 Game Systems Overview

| System                    | Runs On         | Notes                                |
| ------------------------- | --------------- | ------------------------------------ |
| Movement, Combat, Loot    | Server          | Validated via Zod, synced every tick |
| Interpolation / Animation | Client          | Visual only                          |
| Inventory, Skills, Stats  | Server          | Stored and updated via Prisma        |
| UI / Chat                 | Client          | Basic HTML overlays                  |
| State Sync                | Server → Client | Snapshots via `worldUpdate`          |
| Input                     | Client → Server | Intent messages only                 |

---

## 🧭 Core Loop Flow

1. **Client:** sends `{ type: "moveRight" }`.
2. **Server:** validates → updates DB → updates world state.
3. **Tick (50ms):** server emits `worldUpdate` to all players.
4. **Client:** updates `clientState` and re-renders scene.

---

## 🔐 Security Principles

- Never trust client input.
- All positional, combat, or inventory data verified server-side.
- Client cannot modify HP, gold, stats, or movement directly.
- Zod rejects malformed or unexpected payloads.
- Prisma handles all data access to prevent SQL injection.

---

## 🧰 Dev Practices

- Keep all domain logic pure and modular.
- Store all constants / enums centrally.
- Each module (`player`, `monster`, etc.) emits and listens via eventemitter3.
- Maintain a single tick rate across systems (50 ms).
- Use `DEV_NOTES.md` and `TODO.md` for project alignment.
- Use Prisma Studio (`npx prisma studio`) for quick DB inspection.

---

## 🧩 Frontend Rendering Flow

```
WebSocket (worldUpdate) → clientState.update(snapshot)
clientState → renderer.js → Canvas draw loop (60 FPS)
```

Client-side interpolation and prediction are optional — visuals only, not logic.

---

## ✅ Core Priorities

- [ ] Stable WebSocket communication
- [ ] Zod-based validation pipeline
- [ ] Player movement + tick loop
- [ ] Combat with AP system
- [ ] Synchronization (50 ms tick)
- [ ] Prisma extensions for gameplay logic
- [ ] Minimal Canvas-based frontend

---

**In short:**

> Logic lives on the server.  
> Canvas visualizes the truth.  
> Every packet is validated.  
> Every system is modular.  
> No frameworks. No clutter. Just control.
