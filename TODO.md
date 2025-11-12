# ✅ **ELLARWICK — DEVELOPMENT PLAN**

A 2D online **action RPG** prototype built with **Node.js**, **WebSockets**, and **PostgreSQL**.  
Focus: responsive real-time combat, and server-authoritative gameplay.

---

## 📘 **Table of Contents**

- [📦 Core / Backend](#-core--backend)
- [⚔️ Combat System — Action-Based RPG](#-combat-system--action-based-rpg)
- [🧩 Gameplay Systems](#-gameplay-systems)
- [💾 Database](#-database)
- [🌐 Network / Infrastructure](#-network--infrastructure)
- [🧰 Tools / Dev](#-tools--dev)
- [🎨 Frontend (Canvas Client)](#-frontend-canvas-client)
- [🧪 Tests / QA](#-tests--qa)
- [🗺️ Long-Term Development](#-long-term-development)

---

## 📦 **CORE / BACKEND**

- [x] PostgreSQL integration
- [x] User login
- [x] WebSocket authorization via token
- [x] Chat system (broadcast)
- [x] Modular WS dispatcher
- [x] Player movement handling (`type: "move"`)
- [x] Unified player state system
- [x] Server loop (tick loop / heartbeat)
- [ ] Synchronization of nearby player positions
- [ ] Spell handling (`type: "use_spell"`)
- [ ] Combat handling (`type: "attack"`)
- [ ] Ping/pong system (connection keep-alive)
- [ ] Reconnect / session restoration system
- [ ] Saving/loading player state from database

---

## ⚔️ **COMBAT SYSTEM — ACTION-BASED RPG**

### Core Mechanics

- [ ] Implement **Action Points (AP) System**
- [ ] Basic attacks **generate AP** over time or on hit
- [ ] **Skills and abilities** consume AP
- [ ] AP **slowly decays** when idle
- [ ] Basic attacks are **always available** (no AP cost)
- [ ] Combat focuses on **timing, skill chaining, and resource management**

### Weapons and Armor

- [ ] Weapons:
  - [ ] `type`
  - [ ] `damage`
  - [ ] `range`
  - [ ] `critChance`
  - [ ] `critDamage`
  - [ ] `masteryLevel`
  - [ ] `tier`
- [ ] Armor:
  - [ ] `type`
  - [ ] `armorValue`
  - [ ] `masteryLevel`
  - [ ] `critChance`
  - [ ] `critDamage`
  - [ ] `tier`

###Level System

- [ ] Range: 1–∞
- [ ] Up to 100 lvl — progression takes about **300 hours**
- [ ] Above 100 lvl (e.g. up to 120) — about **900 hours** total
- [ ] Range 1-100 Gradual increase in HP(1 per level), AP(1per level), `movementSpeed` and `inventorySlots`
- [ ] Range 100+ Gradualy increase `movementSpeed` and `inventorySlots`
- [ ] Levels allows you to wear better equipment (EQ based on level)

### Weapon Mastery

- [ ] Range: 1–∞
- [ ] Up to 100 — progression takes about **300 hours**
- [ ] Above 100 (e.g. up to 120) — about **900 hours** total
- [ ] Gradual increase in `critChance` and `critMultiplier`

### Boss Fights (4-player Co-op)

- [ ] Anti-spam mechanics and cooldown synchronization
- [ ] Scaling difficulty with player count
- [ ] Each player has a unique combat style
- [ ] Emphasis on **pattern recognition** and **timed coordination**

### Visualization / UX

- [ ] **AP bar** for player and enemies
- [ ] Skill icons light up when AP is sufficient
- [ ] Visual feedback when AP is gained or consumed
- [ ] Subtle hit effects and impact animations

---

## 🧩 **GAMEPLAY SYSTEMS**

- [ ] Character stats (HP, EXP, Level, AP)
- [ ] Level and experience system
- [ ] Monsters and respawn logic
- [ ] Loot and item generation system
- [ ] Inventory and item management
- [ ] Skills and cooldowns
- [ ] NPC interactions
- [ ] Chat commands (`/whisper`, `/party`, `/help`)

---

## 💾 **DATABASE**

- [ ] `users`
- [ ] `sessions`
- [ ] `world_state` (player positions, events)

---

## 🌐 **NETWORK / INFRASTRUCTURE**

- [ ] HTTP endpoints (`/register`, `/login`, `/logout`)
- [ ] WebSocket message routing
- [ ] Rate limiting (anti-spam)
- [ ] Job queue / task system (scalability)
- [ ] Server logging and metrics
- [ ] Connection error handling
- [ ] Compression / large payload optimization
- [ ] Multi-server (zones / shards)

---

## 🧰 **TOOLS / DEV**

- [ ] Admin panel (browser-based monitoring)
- [ ] Logging system (file rotation or database)
- [ ] Auto-sync TODO with GitHub Issues
- [ ] Dev commands (`/reload`, `/stats`, `/debug`)

---

## 🎨 **FRONTEND (CANVAS CLIENT)**

- [ ] Map rendering (tile-based)
- [ ] Sprite drawing and movement interpolation
- [ ] Chat overlay
- [ ] Spell and skill animations
- [ ] UI: HP, AP, inventory, skill bar
- [ ] Login + reconnect screen
- [ ] Visual effects and feedback

---

## 🧪 **TESTS / QA**

- [ ] Latency simulation
- [ ] Database performance testing
- [ ] WebSocket flood testing
- [ ] Save/load consistency validation

---

## 🗺️ **LONG-TERM DEVELOPMENT**

- [ ] Web account management
- [ ] Multilingual client
- [ ] Player trading system
- [ ] Guilds / parties
- [ ] PvP arenas
- [ ] Persistent world state
