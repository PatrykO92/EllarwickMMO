/**
 * Unified Player class - all player state and operations in one place
 */

import { pool } from "../db/connect.js";

export class Player {
  constructor(id, username, x = 20, y = 20, map = "City") {
    // Basic info
    this.id = id;
    this.username = username;
    this.x = x;
    this.y = y;
    this.map = map;

    // Game stats
    this.level = 1;
    this.hp = 100;
    this.maxHp = 100;
    this.experience = 0;

    // Status
    this.isOnline = false;
    this.lastSeen = Date.now();

    // Internal flags
    this._dirty = false; // Track if needs saving
  }

  // ===== MOVEMENT & POSITION =====

  /**
   * Move player by direction and auto-save position
   */
  async move(direction) {
    let newX = this.x;
    let newY = this.y;

    switch (direction) {
      case "up":
        newY -= 1;
        break;
      case "down":
        newY += 1;
        break;
      case "left":
        newX -= 1;
        break;
      case "right":
        newX += 1;
        break;
      default:
        return false;
    }

    // Simple boundary check
    if (newX < 0 || newY < 0 || newX >= 100 || newY >= 100) {
      return false;
    }

    this.x = newX;
    this.y = newY;

    // Auto-save position to database (async, don't wait)
    this.savePosition().catch((err) =>
      console.error("Save position failed:", err)
    );

    return true;
  }

  /**
   * Set position directly and save
   */
  async setPosition(x, y, map = null) {
    this.x = x;
    this.y = y;
    if (map) this.map = map;

    await this.savePosition();
  }

  /**
   * Get distance to target
   */
  distanceTo(target) {
    const dx = this.x - target.x;
    const dy = this.y - target.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // ===== GAME MECHANICS =====

  /**
   * Add experience and auto-save if level up
   */
  async addExperience(exp) {
    this.experience += exp;
    const needed = this.level * 100;

    if (this.experience >= needed) {
      this.level++;
      this.experience = 0;
      this.maxHp += 10;
      this.hp = this.maxHp; // Full heal

      console.log(`${this.username} leveled up to ${this.level}!`);

      // Auto-save on level up
      await this.save();
      return true; // Leveled up
    }

    this._dirty = true;
    return false; // No level up
  }

  /**
   * Take damage and auto-save if died
   */
  async takeDamage(damage) {
    this.hp = Math.max(0, this.hp - damage);
    this._dirty = true;

    if (this.hp === 0) {
      console.log(`${this.username} died!`);
      await this.save(); // Save death
      return true; // Died
    }

    return false; // Still alive
  }

  /**
   * Heal player
   */
  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
    this._dirty = true;
  }

  // ===== CONNECTION STATUS =====

  /**
   * Set online status and save
   */
  async setOnline(online) {
    this.isOnline = online;
    this.lastSeen = Date.now();

    // Update last_seen in database
    try {
      await pool.query("UPDATE users SET last_seen = NOW() WHERE id = $1", [
        this.id,
      ]);
    } catch (error) {
      console.error("Failed to update last_seen:", error);
    }
  }

  // ===== DATABASE OPERATIONS =====

  /**
   * Save only position (fast, for movement)
   */
  async savePosition() {
    try {
      await pool.query(
        "UPDATE users SET x = $1, y = $2, map = $3 WHERE id = $4",
        [this.x, this.y, this.map, this.id]
      );
    } catch (error) {
      console.error(`Failed to save position for ${this.username}:`, error);
    }
  }

  /**
   * Save all player data
   */
  async save() {
    try {
      await pool.query(
        "UPDATE users SET lvl = $1, exp = $2, hp = $3, x = $4, y = $5, map = $6, last_seen = NOW() WHERE id = $7",
        [
          this.level,
          this.experience,
          this.hp,
          this.x,
          this.y,
          this.map,
          this.id,
        ]
      );

      this._dirty = false;
      console.log(`Saved ${this.username} to database`);
    } catch (error) {
      console.error(`Failed to save ${this.username}:`, error);
    }
  }

  /**
   * Auto-save if data is dirty (call periodically)
   */
  async autoSave() {
    if (this._dirty) {
      await this.save();
    }
  }

  // ===== STATIC METHODS (FACTORY) =====

  /**
   * Load player from database
   */
  static async load(userId) {
    try {
      const result = await pool.query(
        "SELECT id, username, lvl, exp, hp, x, y, map FROM users WHERE id = $1",
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const data = result.rows[0];

      const player = new Player(
        data.id,
        data.username,
        data.x || 20,
        data.y || 20,
        data.map || "City"
      );

      // Set stats from database
      player.level = data.lvl || 1;
      player.experience = data.exp || 0;
      player.hp = data.hp || 100;
      player.maxHp = Math.max(100, player.level * 10 + 90);

      console.log(`Loaded ${data.username} from database`);
      return player;
    } catch (error) {
      console.error("Error loading player:", error);
      return null;
    }
  }

  /**
   * Create new player in database
   */
  static async create(userId, username, map = "City") {
    try {
      // Set initial position
      await pool.query(
        "UPDATE users SET x = $1, y = $2, map = $3, hp = $4, lvl = $5, exp = $6 WHERE id = $7",
        [20, 20, map, 100, 1, 0, userId]
      );

      const player = new Player(userId, username, 20, 20, map);
      console.log(`Created new player ${username}`);
      return player;
    } catch (error) {
      console.error("Error creating player:", error);
      return null;
    }
  }

  // ===== NETWORK DATA =====

  /**
   * Get network data for sending to clients
   */
  getNetworkData() {
    return {
      id: this.id,
      username: this.username,
      x: this.x,
      y: this.y,
      map: this.map,
      level: this.level,
      hp: this.hp,
      maxHp: this.maxHp,
      isOnline: this.isOnline,
    };
  }

  // ===== UTILITY =====

  isAlive() {
    return this.hp > 0;
  }

  isDead() {
    return this.hp === 0;
  }

  toString() {
    return `Player(${this.username}, lvl:${this.level}, hp:${this.hp}/${this.maxHp}, pos:${this.x},${this.y})`;
  }
}
