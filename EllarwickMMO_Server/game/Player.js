/**
 * Simple Player class
 */
export class Player {
  constructor(id, username, x = 0, y = 0, map = "City") {
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
    this.isOnline = true;
    this.lastSeen = Date.now();
  }

  /**
   * Move player by direction
   */
  move(direction) {
    let newX = this.x;
    let newY = this.y;

    switch (direction) {
      case 'up': newY -= 1; break;
      case 'down': newY += 1; break;
      case 'left': newX -= 1; break;
      case 'right': newX += 1; break;
      default: return false;
    }

    // Simple boundary check
    if (newX < 0 || newY < 0 || newX >= 100 || newY >= 100) {
      return false;
    }

    this.x = newX;
    this.y = newY;
    return true;
  }

  /**
   * Set position directly
   */
  setPosition(x, y) {
    this.x = x;
    this.y = y;
  }

  /**
   * Get distance to target
   */
  distanceTo(target) {
    const dx = this.x - target.x;
    const dy = this.y - target.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Set online status
   */
  setOnline(online) {
    this.isOnline = online;
    if (online) this.lastSeen = Date.now();
  }

  /**
   * Add experience
   */
  addExperience(exp) {
    this.experience += exp;
    const needed = this.level * 100;
    
    if (this.experience >= needed) {
      this.level++;
      this.experience = 0;
      this.maxHp += 10;
      this.hp = this.maxHp; // Full heal
    }
  }

  /**
   * Take damage
   */
  takeDamage(damage) {
    this.hp = Math.max(0, this.hp - damage);
    return this.hp === 0; // Returns true if died
  }

  /**
   * Get network data
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
      isOnline: this.isOnline
    };
  }
}