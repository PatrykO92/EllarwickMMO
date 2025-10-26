import { getMapData } from "../../data/maps/index.js";

const worlds = new Map();

/**
 * Initialize or get an instance of a map
 * Each map exists only once.
 */

export async function getWorld(mapName) {
  if (worlds.has(mapName)) return worlds.get(mapName);

  const mapEntry = await getMapData(mapName);
  if (!mapEntry) throw new Error(`Map not found in DB: ${mapName}`);

  const world = {
    name: mapName,
    mapData: mapEntry,
    spawn: { x: mapEntry.spawn.x, y: mapEntry.spawn.y },
    players: new Map(),
  };

  worlds.set(mapName, world);
  console.log(`Created World instance for map: ${mapName}`);
  return world;
}

/**
 * Add a player to given world
 * TODO: Load player position from database instead of always using spawn
 */
export async function addPlayerToWorld(user, mapName) {
  const world = await getWorld(mapName);

  // TODO: Check if player already exists in another world and move them
  // TODO: Load last position from database
  const { x, y } = world.spawn;

  const player = {
    id: user.id,
    username: user.username,
    x,
    y,
    map: mapName,
    // TODO: Add more player properties like HP, MP, level, etc.
  };

  world.players.set(user.id, player);
  console.log(
    `Player ${user.username} added to world ${mapName} at (${x}, ${y})`
  );
  return player;
}

/**
 * Remove a player from current world
 * TODO: Save player position to database before removing
 */
export async function removePlayerFromWorld(userId, mapName) {
  const world = worlds.get(mapName);
  if (world) {
    const player = world.players.get(userId);
    if (player) {
      // TODO: Save player state to database here
      console.log(`Player ${player.username} removed from world ${mapName}`);
      world.players.delete(userId);
    }
  }
}

/**
 * Get player's world instance
 */
export function getPlayerWorld(ws) {
  if (!ws.user) return null;
  const playerMap = ws.user.map;
  return worlds.get(playerMap);
}

/**
 * Move player in their own world
 */
export function movePlayerInWorld(ws, direction) {
  const world = getPlayerWorld(ws);
  if (!world) return null;
  const player = world.players.get(ws.user.id);
  if (!player) return null;

  switch (direction) {
    case "up":
      player.y -= 1;
      break;
    case "down":
      player.y += 1;
      break;
    case "left":
      player.x -= 1;
      break;
    case "right":
      player.x += 1;
      break;
  }
  return player;
}

/**
 * Get all players in a given map
 */
export function getWorldPlayers(mapName) {
  const world = worlds.get(mapName);
  return world ? Array.from(world.players.values()) : [];
}

/**
 * Get all active worlds
 */
export function getAllWorlds() {
  return Array.from(worlds.values());
}

/**
 * Get player by ID from any world
 */
export function findPlayerById(playerId) {
  for (const world of worlds.values()) {
    const player = world.players.get(playerId);
    if (player) return player;
  }
  return null;
}

/**
 * Update player position in their world
 */
export function updatePlayerPosition(playerId, x, y) {
  const player = findPlayerById(playerId);
  if (player) {
    player.x = x;
    player.y = y;
    return player;
  }
  return null;
}

/**
 * Get players near a specific position (for visibility/sync)
 */
export function getNearbyPlayers(mapName, x, y, radius = 10) {
  const world = worlds.get(mapName);
  if (!world) return [];

  return Array.from(world.players.values()).filter((player) => {
    const dx = Math.abs(player.x - x);
    const dy = Math.abs(player.y - y);
    return dx <= radius && dy <= radius;
  });
}
