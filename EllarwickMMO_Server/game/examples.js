/**
 * Example usage of unified Player system
 */

import { Player } from "./Player_unified.js";
import { simpleWorldManager } from "./SimpleGameWorld.js";

// ===== EXAMPLE: Player login =====
export async function handlePlayerLogin(userId, username) {
  // Try to load existing player
  let player = await Player.load(userId);

  if (!player) {
    // Create new player if doesn't exist
    player = await Player.create(userId, username);
  }

  if (!player) {
    throw new Error("Failed to load/create player");
  }

  // Set online and add to world
  await player.setOnline(true);
  const world = simpleWorldManager.getWorld(player.map);
  world.addPlayer(player);

  console.log(
    `${username} logged in to ${player.map} at ${player.x},${player.y}`
  );
  return player;
}

// ===== EXAMPLE: Player movement =====
export async function handlePlayerMovement(playerId, direction) {
  // Find player in any world
  for (const world of simpleWorldManager.worlds.values()) {
    const player = world.getPlayer(playerId);
    if (player) {
      // Player handles movement AND saving automatically
      const moved = await player.move(direction);

      if (moved) {
        console.log(
          `${player.username} moved ${direction} to ${player.x},${player.y}`
        );

        // Get nearby players for update
        const nearbyPlayers = world.getPlayersNear(player.x, player.y, 20);
        return {
          success: true,
          player: player.getNetworkData(),
          nearbyPlayers: nearbyPlayers.map((p) => p.getNetworkData()),
        };
      }

      return { success: false, reason: "Invalid movement" };
    }
  }

  return { success: false, reason: "Player not found" };
}

// ===== EXAMPLE: Player logout =====
export async function handlePlayerLogout(playerId) {
  for (const world of simpleWorldManager.worlds.values()) {
    const player = world.getPlayer(playerId);
    if (player) {
      // Player saves automatically
      await player.setOnline(false);
      await player.save(); // Final save

      world.removePlayer(playerId);
      console.log(`${player.username} logged out`);
      return true;
    }
  }
  return false;
}

// ===== EXAMPLE: Combat =====
export async function handleCombat(attackerId, targetId, damage) {
  let attacker = null;
  let target = null;

  // Find both players
  for (const world of simpleWorldManager.worlds.values()) {
    if (!attacker) attacker = world.getPlayer(attackerId);
    if (!target) target = world.getPlayer(targetId);
  }

  if (!attacker || !target) {
    return { success: false, reason: "Players not found" };
  }

  // Check if close enough
  if (attacker.distanceTo(target) > 5) {
    return { success: false, reason: "Too far away" };
  }

  // Deal damage (target saves automatically if died)
  const died = await target.takeDamage(damage);

  if (died) {
    // Give experience to attacker (saves automatically if level up)
    const leveledUp = await attacker.addExperience(target.level * 50);

    return {
      success: true,
      targetDied: true,
      attackerLeveledUp: leveledUp,
      attacker: attacker.getNetworkData(),
      target: target.getNetworkData(),
    };
  }

  return {
    success: true,
    targetDied: false,
    attacker: attacker.getNetworkData(),
    target: target.getNetworkData(),
  };
}

// ===== EXAMPLE: Auto-save all players every 30 seconds =====
export function startAutoSave() {
  setInterval(async () => {
    console.log("Auto-saving all players...");
    await simpleWorldManager.autoSaveAll();
    console.log("Auto-save complete");
  }, 30000); // 30 seconds
}
