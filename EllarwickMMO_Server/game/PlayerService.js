/**
 * Player Database Service
 * Handles loading and saving player data
 */

import { pool } from "../db/connect.js";
import { Player } from "./Player.js";

export class PlayerService {
  /**
   * Load player data from database
   * @param {number} userId - User ID
   * @returns {Promise<Player|null>}
   */
  static async loadPlayer(userId) {
    try {
      const result = await pool.query(
        "SELECT id, username, lvl, exp, hp, x, y, map FROM users WHERE id = $1",
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const userData = result.rows[0];

      // Create Player with database data
      const player = new Player(
        userData.id,
        userData.username,
        userData.x || 0,
        userData.y || 0,
        userData.map || "City"
      );

      // Set stats from database
      player.level = userData.lvl || 1;
      player.experience = userData.exp || 0;
      player.hp = userData.hp || 100;
      player.maxHp = Math.max(100, userData.lvl * 10 + 90); // Calculate max HP based on level

      console.log(`Loaded player ${userData.username} from database`);
      return player;
    } catch (error) {
      console.error("Error loading player:", error);
      return null;
    }
  }

  /**
   * Save player data to database
   * @param {Player} player - Player instance
   * @returns {Promise<boolean>}
   */
  static async savePlayer(player) {
    try {
      await pool.query(
        "UPDATE users SET lvl = $1, exp = $2, hp = $3, x = $4, y = $5, map = $6 WHERE id = $7",
        [
          player.level,
          player.experience,
          player.hp,
          player.x,
          player.y,
          player.map,
          player.id,
        ]
      );

      console.log(`Saved player ${player.username} to database`);
      return true;
    } catch (error) {
      console.error("Error saving player:", error);
      return false;
    }
  }

  /**
   * Save player position only (for frequent updates)
   * @param {Player} player - Player instance
   * @returns {Promise<boolean>}
   */
  static async savePlayerPosition(player) {
    try {
      await pool.query(
        "UPDATE users SET x = $1, y = $2, map = $3 WHERE id = $4",
        [player.x, player.y, player.map, player.id]
      );

      return true;
    } catch (error) {
      console.error("Error saving player position:", error);
      return false;
    }
  }

  /**
   * Create new player in database (for registration)
   * @param {number} userId - User ID
   * @param {string} username - Username
   * @param {string} map - Starting map
   * @returns {Promise<Player|null>}
   */
  static async createPlayer(userId, username, map = "City") {
    try {
      // Get spawn position for the map
      // For now, use default spawn (could be improved to get from map data)
      const x = 20;
      const y = 20;

      await pool.query(
        "UPDATE users SET x = $1, y = $2, map = $3 WHERE id = $4",
        [x, y, map, userId]
      );

      const player = new Player(userId, username, x, y, map);
      console.log(`Created new player ${username} in database`);
      return player;
    } catch (error) {
      console.error("Error creating player:", error);
      return null;
    }
  }

  /**
   * Update player stats (level, experience, etc.)
   * @param {Player} player - Player instance
   * @returns {Promise<boolean>}
   */
  static async savePlayerStats(player) {
    try {
      await pool.query(
        "UPDATE users SET lvl = $1, exp = $2, hp = $3 WHERE id = $4",
        [player.level, player.experience, player.hp, player.id]
      );

      return true;
    } catch (error) {
      console.error("Error saving player stats:", error);
      return false;
    }
  }

  /**
   * Get all online players from database
   * @returns {Promise<Array>}
   */
  static async getOnlinePlayers() {
    try {
      const result = await pool.query(
        "SELECT id, username, x, y, map FROM users WHERE last_seen > NOW() - INTERVAL '5 minutes'"
      );

      return result.rows;
    } catch (error) {
      console.error("Error getting online players:", error);
      return [];
    }
  }
}
