/**
 * Simple GameWorld - just a container for players
 */

export class SimpleGameWorld {
  constructor(mapName) {
    this.mapName = mapName;
    this.players = new Map(); // id -> Player object
  }

  /**
   * Add player to world
   */
  addPlayer(player) {
    this.players.set(player.id, player);
    console.log(`${player.username} joined ${this.mapName}`);
  }

  /**
   * Remove player from world
   */
  removePlayer(playerId) {
    const player = this.players.get(playerId);
    if (player) {
      this.players.delete(playerId);
      console.log(`${player.username} left ${this.mapName}`);
      return true;
    }
    return false;
  }

  /**
   * Get player by ID
   */
  getPlayer(playerId) {
    return this.players.get(playerId);
  }

  /**
   * Get all players as array
   */
  getAllPlayers() {
    return Array.from(this.players.values());
  }

  /**
   * Get players near position
   */
  getPlayersNear(x, y, radius = 10) {
    return this.getAllPlayers().filter((player) => {
      const dx = player.x - x;
      const dy = player.y - y;
      return Math.sqrt(dx * dx + dy * dy) <= radius;
    });
  }

  /**
   * Get network data for all players
   */
  getNetworkData() {
    return this.getAllPlayers().map((player) => player.getNetworkData());
  }

  /**
   * Auto-save all players
   */
  async autoSaveAll() {
    const promises = this.getAllPlayers().map((player) => player.autoSave());
    await Promise.all(promises);
  }

  /**
   * Get world stats
   */
  getStats() {
    return {
      mapName: this.mapName,
      playerCount: this.players.size,
      onlineCount: this.getAllPlayers().filter((p) => p.isOnline).length,
    };
  }
}

/**
 * Super simple world manager
 */
class SimpleWorldManager {
  constructor() {
    this.worlds = new Map(); // mapName -> SimpleGameWorld
  }

  /**
   * Get or create world
   */
  getWorld(mapName) {
    if (!this.worlds.has(mapName)) {
      this.worlds.set(mapName, new SimpleGameWorld(mapName));
      console.log(`Created world: ${mapName}`);
    }
    return this.worlds.get(mapName);
  }

  /**
   * Move player between worlds
   */
  movePlayerToWorld(player, newMapName) {
    // Remove from current world
    const currentWorld = this.getWorld(player.map);
    currentWorld.removePlayer(player.id);

    // Update player map
    player.map = newMapName;

    // Add to new world
    const newWorld = this.getWorld(newMapName);
    newWorld.addPlayer(player);

    console.log(`${player.username} moved to ${newMapName}`);
  }

  /**
   * Auto-save all worlds
   */
  async autoSaveAll() {
    const promises = Array.from(this.worlds.values()).map((world) =>
      world.autoSaveAll()
    );
    await Promise.all(promises);
  }

  /**
   * Get all worlds stats
   */
  getStats() {
    const stats = {};
    this.worlds.forEach((world, mapName) => {
      stats[mapName] = world.getStats();
    });
    return stats;
  }
}

// Export singleton
export const simpleWorldManager = new SimpleWorldManager();
