import { getMapData } from "../../data/maps/index.js";

/**
 * Simple GameWorld class
 */
export class GameWorld {
  constructor(name, mapData, spawn) {
    this.name = name;
    this.mapData = mapData;
    this.spawn = spawn;
    this.players = new Map();
  }

  addPlayer(player) {
    this.players.set(player.id, player);
    player.map = this.name;
    console.log(`Player ${player.username} joined ${this.name}`);
  }

  removePlayer(playerId) {
    const player = this.players.get(playerId);
    if (player) {
      player.setOnline(false);
      this.players.delete(playerId);
      console.log(`Player ${player.username} left ${this.name}`);
    }
    return player;
  }

  getPlayer(playerId) {
    return this.players.get(playerId);
  }

  getAllPlayers() {
    return Array.from(this.players.values());
  }

  movePlayer(playerId, direction) {
    const player = this.getPlayer(playerId);
    if (!player) return null;
    
    return player.move(direction) ? player : null;
  }

  getNearbyPlayers(x, y, radius = 10) {
    return this.getAllPlayers().filter(player => {
      return player.distanceTo({ x, y }) <= radius;
    });
  }

  spawnPlayer(player) {
    player.setPosition(this.spawn.x, this.spawn.y);
    this.addPlayer(player);
  }
}

/**
 * Simple WorldManager
 */
export class WorldManager {
  static worlds = new Map();

  static async getWorld(mapName) {
    if (this.worlds.has(mapName)) {
      return this.worlds.get(mapName);
    }

    const mapEntry = await getMapData(mapName);
    if (!mapEntry) {
      throw new Error(`Map not found: ${mapName}`);
    }

    const world = new GameWorld(
      mapName,
      mapEntry,
      { x: mapEntry.spawn.x, y: mapEntry.spawn.y }
    );

    this.worlds.set(mapName, world);
    console.log(`Created world: ${mapName}`);
    return world;
  }

  static getAllWorlds() {
    return Array.from(this.worlds.values());
  }

  static findPlayer(playerId) {
    for (const world of this.worlds.values()) {
      const player = world.getPlayer(playerId);
      if (player) return { world, player };
    }
    return null;
  }
}