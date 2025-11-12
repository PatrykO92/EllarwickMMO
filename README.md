# ⚙️ Ellarwick

A lightweight, modular **2D top-down MMO** built from scratch using **Node.js**, **WebSocket**, **PostgreSQL**, and **HTML5 Canvas**.

---

## 📚 Documentation

- [Architecture Guide](docs/ARCHITECTURE.md) — explains the end-to-end data flow and each major module in the server and client.

---

## 🧠 Backend Stack

| Purpose               | Technology                                    |
| --------------------- | --------------------------------------------- |
| Runtime               | **Node.js (ESM)**                             |
| Networking            | **ws** – native WebSocket server              |
| Environment config    | **dotenv**                                    |
| ORM / Database        | **Prisma ORM** with **PostgreSQL / Supabase** |
| Schema validation     | **zod**                                       |
| Internal event system | **eventemitter3**                             |
| Unique identifiers    | **uuid**                                      |
| Security / hashing    | **crypto** _(built-in)_                       |
| Testing _(optional)_  | **vitest**                                    |

### Backend Principles

- **Server-authoritative** – all game logic validated server-side
- **Event-driven** – `eventemitter3` connects game systems
- **Schema-safe** – `zod` validates all incoming WebSocket data
- **Extensible ORM** – Prisma extensions encapsulate game operations

---

## 🎮 Frontend Stack

| Purpose           | Technology             |
| ----------------- | ---------------------- |
| Runtime / Bundler | **Vite**               |
| Language          | **JavaScript (ESM)**   |
| Rendering         | **HTML5 Canvas API**   |
| Networking        | **WebSocket (native)** |
| UI Layer          | **HTML + CSS**         |
| Code style        | **ESLint + Prettier**  |

### Frontend Principles

- **Server-authoritative client** – sends only intents (`move`, `attack`)
- **Canvas-based rendering** – pure 2D engine, no frameworks
- **Simple state snapshot** – local mirror of world state for rendering
- **Modular structure** – clear separation between render, network, and UI
