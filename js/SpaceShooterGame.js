/**
 * SpaceShooterGame.js - Vertical space shooter implementation using GameEngine
 * 
 * A vertical scrolling space shooter where enemies and asteroids come from above
 * and the player must shoot them down.
 */

import { GameEngine } from './GameEngine.js';

export class SpaceShooterGame {
  constructor(canvasId, config = {}) {
    // Initialize game engine
    this.engine = new GameEngine(canvasId, {
      width: 800,
      height: 600,
      highScoreKey: "space_shooter_high_score_v1",
      enableMouse: true,
      ...config
    });
    
    // Game configuration
    this.config = {
      // Player
      playerWidth: 50,
      playerHeight: 50,
      playerSpeed: 400,
      playerStartY: 500,
      
      // Bullets
      bulletWidth: 4,
      bulletHeight: 15,
      bulletSpeed: 500,
      bulletCooldown: 0.15, // seconds between shots
      
      // Enemies
      enemyWidth: 40,
      enemyHeight: 40,
      enemySpeed: 120,
      enemySpawnRate: 1.5, // seconds between spawns
      enemyShootRate: 2.0, // seconds between enemy shots
      enemyBulletSpeed: 300,
      
      // Asteroids
      asteroidMinSize: 30,
      asteroidMaxSize: 60,
      asteroidSpeed: 80,
      asteroidSpawnRate: 2.0,
      
      // Power-ups
      powerupSize: 25,
      powerupSpeed: 100,
      powerupSpawnRate: 10.0,
      
      // Gameplay
      startingLives: 3,
      enemyPoints: 100,
      asteroidPoints: 50,
      
      ...config
    };
    
    // Game objects
    this.player = {
      x: this.engine.canvas.width / 2 - this.config.playerWidth / 2,
      y: this.config.playerStartY,
      width: this.config.playerWidth,
      height: this.config.playerHeight,
      vx: 0,
      vy: 0
    };
    
    // Collections
    this.bullets = [];
    this.enemyBullets = [];
    this.enemies = [];
    this.asteroids = [];
    this.powerups = [];
    this.particles = [];
    
    // Game state
    this.gameState = {
      status: "READY", // READY | PLAYING | PAUSED | GAME_OVER
      score: 0,
      lives: this.config.startingLives,
      level: 1
    };
    
    // Timers
    this.bulletTimer = 0;
    this.enemySpawnTimer = 0;
    this.asteroidSpawnTimer = 0;
    this.powerupSpawnTimer = 0;
    
    // Power-up state
    this.rapidFire = false;
    this.rapidFireTimer = 0;
    this.rapidFireDuration = 5.0;
    
    this.dualGuns = false;
    this.dualGunsTimer = 0;
    this.dualGunsDuration = 8.0;
    
    this.shield = false;
    this.shieldTimer = 0;
    this.shieldDuration = 10.0;
    
    // Permanent upgrade
    this.upgraded = false;
    this.baseWidth = this.config.playerWidth;
    this.baseHeight = this.config.playerHeight;
    
    // Level-based permanent unlocks
    this.permanentRapidFire = false;
    this.permanentDualGuns = false;
    this.permanentTripleFire = false;
    
    // Setup callbacks
    this._setupCallbacks();
    
    // Load sounds
    this._setupSounds();
  }
  
  _setupCallbacks() {
    // Update game logic
    this.update = (dt) => {
      if (this.gameState.status === "PLAYING") {
        this._updateGame(dt);
      }
    };
    
    // Render game - always render, showing appropriate screen
    this.render = (ctx) => {
      this._renderGame(ctx);
    };
    
    // Set callbacks on engine
    this.engine.onUpdate = (dt) => this.update(dt);
    this.engine.onRender = (ctx) => this.render(ctx);
    
    // Keyboard controls
    this.engine.onKeyDown = (code) => {
      if (code === "Space") {
        if (this.gameState.status === "READY") {
          this.startGame();
        } else if (this.gameState.status === "PLAYING") {
          this.shoot();
        } else if (this.gameState.status === "GAME_OVER") {
          this.reset();
        }
      } else if (code === "KeyP" && this.gameState.status === "PLAYING") {
        this.engine.togglePause();
        this.gameState.status = this.engine.state.paused ? "PAUSED" : "PLAYING";
      } else if (code === "KeyM") {
        this.engine.toggleMute();
      }
    };
  }
  
  _setupSounds() {
    // Register sound effects
    this.engine.registerSound("shoot", {
      type: "square",
      frequency: 300,
      duration: 100,
      gain: 0.15
    });
    
    this.engine.registerSound("hit", {
      type: "sawtooth",
      frequency: 150,
      duration: 150,
      gain: 0.2
    });
    
    this.engine.registerSound("explosion", {
      type: "sawtooth",
      frequency: 80,
      duration: 300,
      gain: 0.2
    });
    
    this.engine.registerSound("powerup", {
      type: "sine",
      frequency: 500,
      duration: 200,
      gain: 0.2
    });
    
    this.engine.registerSound("death", {
      type: "sawtooth",
      frequency: 100,
      duration: 500,
      gain: 0.25
    });
  }
  
  // Helper methods for collision detection
  rectCollision(x1, y1, w1, h1, x2, y2, w2, h2) {
    return GameEngine.rectIntersects(
      {x: x1, y: y1, w: w1, h: h1},
      {x: x2, y: y2, w: w2, h: h2}
    );
  }
  
  circleCollision(x1, y1, r1, x2, y2, r2) {
    return GameEngine.circleIntersects(
      {x: x1, y: y1, r: r1},
      {x: x2, y: y2, r: r2}
    );
  }
  
  // ===== GAME LOOP =====
  
  _updateGame(dt) {
    // Update player
    this._updatePlayer(dt);
    
    // Update timers
    this.bulletTimer = Math.max(0, this.bulletTimer - dt);
    this.enemySpawnTimer -= dt;
    this.asteroidSpawnTimer -= dt;
    this.powerupSpawnTimer -= dt;
    
    // Update power-up timers
    if (this.rapidFire) {
      this.rapidFireTimer -= dt;
      if (this.rapidFireTimer <= 0) {
        this.rapidFire = false;
      }
    }
    
    if (this.dualGuns) {
      this.dualGunsTimer -= dt;
      if (this.dualGunsTimer <= 0) {
        this.dualGuns = false;
      }
    }
    
    if (this.shield) {
      this.shieldTimer -= dt;
      if (this.shieldTimer <= 0) {
        this.shield = false;
      }
    }
    
    // Spawn enemies
    if (this.enemySpawnTimer <= 0) {
      this.spawnEnemy();
      this.enemySpawnTimer = this.config.enemySpawnRate / Math.sqrt(this.gameState.level);
    }
    
    // Spawn asteroids
    if (this.asteroidSpawnTimer <= 0) {
      this.spawnAsteroid();
      this.asteroidSpawnTimer = this.config.asteroidSpawnRate / Math.sqrt(this.gameState.level);
    }
    
    // Spawn power-ups
    if (this.powerupSpawnTimer <= 0) {
      this.spawnPowerup();
      this.powerupSpawnTimer = this.config.powerupSpawnRate;
    }
    
    // Update bullets
    this._updateBullets(dt);
    
    // Update enemy bullets
    this._updateEnemyBullets(dt);
    
    // Update enemies
    this._updateEnemies(dt);
    
    // Update asteroids
    this._updateAsteroids(dt);
    
    // Update power-ups
    this._updatePowerups(dt);
    
    // Update particles
    this._updateParticles(dt);
    
    // Check collisions
    this._checkCollisions();
    
    // Check level up
    if (this.gameState.score >= this.gameState.level * 1000) {
      this.gameState.level++;
      
      // Unlock permanent abilities at certain levels
      if (this.gameState.level >= 3 && !this.permanentRapidFire) {
        this.permanentRapidFire = true;
        // Visual/audio feedback can be added here
      }
      if (this.gameState.level >= 5 && !this.permanentDualGuns) {
        this.permanentDualGuns = true;
      }
      if (this.gameState.level >= 10 && !this.permanentTripleFire) {
        this.permanentTripleFire = true;
      }
    }
  }
  
  _updatePlayer(dt) {
    // Keyboard controls
    this.player.vx = 0;
    this.player.vy = 0;
    
    if (this.engine.keys["ArrowLeft"] || this.engine.keys["KeyA"]) {
      this.player.vx = -this.config.playerSpeed;
    }
    if (this.engine.keys["ArrowRight"] || this.engine.keys["KeyD"]) {
      this.player.vx = this.config.playerSpeed;
    }
    if (this.engine.keys["ArrowUp"] || this.engine.keys["KeyW"]) {
      this.player.vy = -this.config.playerSpeed;
    }
    if (this.engine.keys["ArrowDown"] || this.engine.keys["KeyS"]) {
      this.player.vy = this.config.playerSpeed;
    }
    
    // Mouse controls (optional) - full 2D movement
    if (this.engine.mouse.active) {
      const targetX = this.engine.mouse.x - this.player.width / 2;
      const targetY = this.engine.mouse.y - this.player.height / 2;
      const dx = targetX - this.player.x;
      const dy = targetY - this.player.y;
      
      // Move towards mouse position if not close enough
      if (Math.abs(dx) > 5) {
        this.player.vx = Math.sign(dx) * this.config.playerSpeed;
      }
      if (Math.abs(dy) > 5) {
        this.player.vy = Math.sign(dy) * this.config.playerSpeed;
      }
    }
    
    // Update position
    this.player.x += this.player.vx * dt;
    this.player.y += this.player.vy * dt;
    
    // Keep player in bounds - can now move almost to the top
    this.player.x = Math.max(0, Math.min(this.engine.canvas.width - this.player.width, this.player.x));
    this.player.y = Math.max(50, Math.min(this.engine.canvas.height - this.player.height, this.player.y));
    
    // Auto-shoot with space held down
    if (this.engine.keys["Space"] && this.bulletTimer <= 0) {
      this.shoot();
    }
  }
  
  _updateBullets(dt) {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      bullet.y += bullet.vy * dt;
      
      // Remove bullets off screen
      if (bullet.y < -bullet.height) {
        this.bullets.splice(i, 1);
      }
    }
  }
  
  _updateEnemyBullets(dt) {
    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const bullet = this.enemyBullets[i];
      bullet.y += bullet.vy * dt;
      
      // Remove bullets off screen
      if (bullet.y > this.engine.canvas.height) {
        this.enemyBullets.splice(i, 1);
      }
    }
  }
  
  _updateEnemies(dt) {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      enemy.y += enemy.vy * dt;
      
      // Slight horizontal movement
      enemy.x += Math.sin(enemy.y * 0.01 + enemy.phase) * 50 * dt;
      
      // Enemy shooting (starts from level 2)
      if (this.gameState.level >= 2) {
        enemy.shootTimer -= dt;
        if (enemy.shootTimer <= 0 && enemy.y > 0 && enemy.y < this.engine.canvas.height - 100) {
          // Enemy shoots
          this.enemyBullets.push({
            x: enemy.x + enemy.width / 2 - 2,
            y: enemy.y + enemy.height,
            width: 4,
            height: 12,
            vy: this.config.enemyBulletSpeed
          });
          enemy.shootTimer = this.config.enemyShootRate / (this.gameState.level * 0.3);
        }
      }
      
      // Remove enemies off screen
      if (enemy.y > this.engine.canvas.height) {
        this.enemies.splice(i, 1);
      }
    }
  }
  
  _updateAsteroids(dt) {
    for (let i = this.asteroids.length - 1; i >= 0; i--) {
      const asteroid = this.asteroids[i];
      asteroid.y += asteroid.vy * dt;
      asteroid.rotation += asteroid.rotationSpeed * dt;
      
      // Remove asteroids off screen
      if (asteroid.y > this.engine.canvas.height + asteroid.size) {
        this.asteroids.splice(i, 1);
      }
    }
  }
  
  _updatePowerups(dt) {
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const powerup = this.powerups[i];
      powerup.y += powerup.vy * dt;
      powerup.rotation += 2 * dt;
      
      // Remove power-ups off screen
      if (powerup.y > this.engine.canvas.height) {
        this.powerups.splice(i, 1);
      }
    }
  }
  
  _updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      p.alpha = p.life / p.maxLife;
      
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }
  
  _checkCollisions() {
    // Bullets vs Enemies
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const enemy = this.enemies[j];
        
        if (this.rectCollision(
          bullet.x, bullet.y, bullet.width, bullet.height,
          enemy.x, enemy.y, enemy.width, enemy.height
        )) {
          // Hit!
          this.bullets.splice(i, 1);
          this.enemies.splice(j, 1);
          this.gameState.score += this.config.enemyPoints;
          this.engine.playSound("hit");
          this.createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, "#ff6b6b");
          break;
        }
      }
    }
    
    // Bullets vs Asteroids
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      
      for (let j = this.asteroids.length - 1; j >= 0; j--) {
        const asteroid = this.asteroids[j];
        
        if (this.circleCollision(
          bullet.x + bullet.width / 2, bullet.y + bullet.height / 2, bullet.width / 2,
          asteroid.x, asteroid.y, asteroid.size / 2
        )) {
          // Hit!
          this.bullets.splice(i, 1);
          asteroid.health--;
          
          if (asteroid.health <= 0) {
            this.asteroids.splice(j, 1);
            this.gameState.score += this.config.asteroidPoints;
            this.createExplosion(asteroid.x, asteroid.y, "#888888");
          }
          
          this.engine.playSound("hit");
          break;
        }
      }
    }
    
    // Player vs Enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      
      if (this.rectCollision(
        this.player.x, this.player.y, this.player.width, this.player.height,
        enemy.x, enemy.y, enemy.width, enemy.height
      )) {
        this.enemies.splice(i, 1);
        if (this.shield) {
          // Shield absorbs hit
          this.shield = false;
          this.shieldTimer = 0;
        } else {
          this.loseLife();
        }
        this.createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, "#ff6b6b");
      }
    }
    
    // Player vs Enemy Bullets
    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const bullet = this.enemyBullets[i];
      
      if (this.rectCollision(
        this.player.x, this.player.y, this.player.width, this.player.height,
        bullet.x, bullet.y, bullet.width, bullet.height
      )) {
        this.enemyBullets.splice(i, 1);
        if (this.shield) {
          // Shield absorbs hit
          this.shield = false;
          this.shieldTimer = 0;
        } else {
          this.loseLife();
        }
      }
    }
    
    // Player vs Asteroids
    for (let i = this.asteroids.length - 1; i >= 0; i--) {
      const asteroid = this.asteroids[i];
      
      if (this.circleCollision(
        this.player.x + this.player.width / 2, this.player.y + this.player.height / 2, this.player.width / 2,
        asteroid.x, asteroid.y, asteroid.size / 2
      )) {
        this.asteroids.splice(i, 1);
        if (this.shield) {
          // Shield absorbs hit
          this.shield = false;
          this.shieldTimer = 0;
        } else {
          this.loseLife();
        }
        this.createExplosion(asteroid.x, asteroid.y, "#888888");
      }
    }
    
    // Player vs Power-ups
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const powerup = this.powerups[i];
      
      if (this.rectCollision(
        this.player.x, this.player.y, this.player.width, this.player.height,
        powerup.x - powerup.size / 2, powerup.y - powerup.size / 2, powerup.size, powerup.size
      )) {
        this.powerups.splice(i, 1);
        this.collectPowerup(powerup);
      }
    }
  }
  
  // ===== GAME ACTIONS =====
  
  startGame() {
    this.gameState.status = "PLAYING";
    // Engine loop is already running, just change state
  }
  
  shoot() {
    if (this.bulletTimer > 0) return;
    
    // Rapid fire: temporary power-up OR permanent unlock from level 3+
    const hasRapidFire = this.rapidFire || this.permanentRapidFire;
    const cooldown = hasRapidFire ? this.config.bulletCooldown / 2 : this.config.bulletCooldown;
    this.bulletTimer = cooldown;
    
    // Triple fire from level 10: center + left + right
    if (this.permanentTripleFire) {
      // Left gun
      this.bullets.push({
        x: this.player.x + this.player.width / 4 - this.config.bulletWidth / 2,
        y: this.player.y,
        width: this.config.bulletWidth,
        height: this.config.bulletHeight,
        vy: -this.config.bulletSpeed
      });
      
      // Center gun
      this.bullets.push({
        x: this.player.x + this.player.width / 2 - this.config.bulletWidth / 2,
        y: this.player.y,
        width: this.config.bulletWidth,
        height: this.config.bulletHeight,
        vy: -this.config.bulletSpeed
      });
      
      // Right gun
      this.bullets.push({
        x: this.player.x + 3 * this.player.width / 4 - this.config.bulletWidth / 2,
        y: this.player.y,
        width: this.config.bulletWidth,
        height: this.config.bulletHeight,
        vy: -this.config.bulletSpeed
      });
    }
    // Dual guns: upgraded ship, temporary power-up, OR permanent unlock from level 5+
    else if (this.upgraded || this.dualGuns || this.permanentDualGuns) {
      // Left gun
      this.bullets.push({
        x: this.player.x + this.player.width / 4 - this.config.bulletWidth / 2,
        y: this.player.y,
        width: this.config.bulletWidth,
        height: this.config.bulletHeight,
        vy: -this.config.bulletSpeed
      });
      
      // Right gun
      this.bullets.push({
        x: this.player.x + 3 * this.player.width / 4 - this.config.bulletWidth / 2,
        y: this.player.y,
        width: this.config.bulletWidth,
        height: this.config.bulletHeight,
        vy: -this.config.bulletSpeed
      });
    } else {
      // Single center gun
      this.bullets.push({
        x: this.player.x + this.player.width / 2 - this.config.bulletWidth / 2,
        y: this.player.y,
        width: this.config.bulletWidth,
        height: this.config.bulletHeight,
        vy: -this.config.bulletSpeed
      });
    }
    
    this.engine.playSound("shoot");
  }
  
  spawnEnemy() {
    const x = Math.random() * (this.engine.canvas.width - this.config.enemyWidth);
    this.enemies.push({
      x: x,
      y: -this.config.enemyHeight,
      width: this.config.enemyWidth,
      height: this.config.enemyHeight,
      vy: this.config.enemySpeed * (1 + (this.gameState.level - 1) * 0.1),
      phase: Math.random() * Math.PI * 2,
      shootTimer: Math.random() * this.config.enemyShootRate
    });
  }
  
  spawnAsteroid() {
    const size = this.config.asteroidMinSize + Math.random() * (this.config.asteroidMaxSize - this.config.asteroidMinSize);
    const x = Math.random() * this.engine.canvas.width;
    this.asteroids.push({
      x: x,
      y: -size,
      size: size,
      vy: this.config.asteroidSpeed * (1 + (this.gameState.level - 1) * 0.1),
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 4,
      health: Math.ceil(size / 20)
    });
  }
  
  spawnPowerup() {
    const x = Math.random() * this.engine.canvas.width;
    // Upgrade apare mai rar (5% șansă)
    const rand = Math.random();
    let type;
    if (!this.upgraded && rand < 0.05) {
      type = "upgrade";
    } else {
      const types = ["rapidfire", "dualgun", "shield"];
      type = types[Math.floor(Math.random() * types.length)];
    }
    
    this.powerups.push({
      x: x,
      y: -this.config.powerupSize,
      size: this.config.powerupSize,
      vy: this.config.powerupSpeed,
      rotation: 0,
      type: type
    });
  }
  
  collectPowerup(powerup) {
    if (powerup.type === "rapidfire") {
      this.rapidFire = true;
      this.rapidFireTimer = this.rapidFireDuration;
    } else if (powerup.type === "dualgun") {
      this.dualGuns = true;
      this.dualGunsTimer = this.dualGunsDuration;
    } else if (powerup.type === "shield") {
      this.shield = true;
      // Triple shield duration after level 5
      const shieldMultiplier = this.gameState.level >= 5 ? 3 : 1;
      this.shieldTimer = this.shieldDuration * shieldMultiplier;
    } else if (powerup.type === "upgrade" && !this.upgraded) {
      // Permanent upgrade!
      this.upgraded = true;
      this.player.width = this.baseWidth * 1.3;
      this.player.height = this.baseHeight * 1.3;
    }
    this.engine.playSound("powerup");
  }
  
  loseLife() {
    this.gameState.lives--;
    this.engine.playSound("death");
    
    if (this.gameState.lives <= 0) {
      this.gameOver();
    } else {
      // Brief invincibility
      this.player.x = this.engine.canvas.width / 2 - this.player.width / 2;
      this.player.y = this.config.playerStartY;
    }
  }
  
  gameOver() {
    this.gameState.status = "GAME_OVER";
    this.engine.saveHighScore(this.gameState.score);
    this.engine.playSound("explosion");
  }
  
  createExplosion(x, y, color) {
    const particleCount = 15;
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const speed = 100 + Math.random() * 100;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 3,
        color: color,
        life: 0.5 + Math.random() * 0.5,
        maxLife: 1,
        alpha: 1
      });
    }
  }
  
  reset() {
    // Reset game state
    this.gameState.status = "READY";
    this.gameState.score = 0;
    this.gameState.lives = this.config.startingLives;
    this.gameState.level = 1;
    
    // Reset player (keep upgrade if exists)
    this.player.x = this.engine.canvas.width / 2 - this.player.width / 2;
    this.player.y = this.config.playerStartY;
    // Note: upgraded state persists through deaths
    
    // Clear collections
    this.bullets = [];
    this.enemyBullets = [];
    this.enemies = [];
    this.asteroids = [];
    this.powerups = [];
    this.particles = [];
    
    // Reset timers
    this.bulletTimer = 0;
    this.enemySpawnTimer = 0;
    this.asteroidSpawnTimer = 0;
    this.powerupSpawnTimer = this.config.powerupSpawnRate;
    this.rapidFire = false;
    this.rapidFireTimer = 0;
    this.dualGuns = false;
    this.dualGunsTimer = 0;
    this.shield = false;
    this.shieldTimer = 0;
  }
  
  // ===== RENDERING =====
  
  _renderGame(ctx) {
    // Background - space with stars
    this._drawBackground(ctx);
    
    // Render particles (behind everything)
    this._renderParticles(ctx);
    
    // Render player
    this._renderPlayer(ctx);
    
    // Render bullets
    this._renderBullets(ctx);
    
    // Render enemy bullets
    this._renderEnemyBullets(ctx);
    
    // Render enemies
    this._renderEnemies(ctx);
    
    // Render asteroids
    this._renderAsteroids(ctx);
    
    // Render power-ups
    this._renderPowerups(ctx);
    
    // UI
    this._renderUI(ctx);
    
    // Status overlays
    if (this.gameState.status === "READY") {
      this._renderReadyScreen(ctx);
    } else if (this.gameState.status === "PAUSED") {
      this._renderPausedScreen(ctx);
    } else if (this.gameState.status === "GAME_OVER") {
      this._renderGameOverScreen(ctx);
    }
  }
  
  _drawBackground(ctx) {
    // Dark space
    ctx.fillStyle = "#0a0e27";
    ctx.fillRect(0, 0, this.engine.canvas.width, this.engine.canvas.height);
    
    // Stars (simple static version)
    ctx.fillStyle = "#ffffff";
    for (let i = 0; i < 100; i++) {
      const x = (i * 137.5) % this.engine.canvas.width;
      const y = (i * 217.3) % this.engine.canvas.height;
      const size = (i % 3) + 1;
      ctx.fillRect(x, y, size, size);
    }
  }
  
  _renderPlayer(ctx) {
    // Advanced spaceship with gradients and details
    ctx.save();
    ctx.translate(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2);
    
    // Extra glow for upgraded ship
    if (this.upgraded) {
      ctx.shadowBlur = 20;
      ctx.shadowColor = 'rgba(255, 215, 0, 0.6)';
    }
    
    // Engine glow (animated)
    const glowIntensity = 0.5 + Math.sin(Date.now() * 0.01) * 0.3;
    if (!this.upgraded) {
      ctx.shadowBlur = 15;
      ctx.shadowColor = `rgba(78, 205, 196, ${glowIntensity})`;
    }
    
    // Main body with gradient
    const bodyGradient = ctx.createLinearGradient(0, -this.player.height / 2, 0, this.player.height / 2);
    if (this.upgraded) {
      // Gold/yellow colors for upgraded ship
      bodyGradient.addColorStop(0, '#ffd700');
      bodyGradient.addColorStop(0.5, '#ffc107');
      bodyGradient.addColorStop(1, '#ff9800');
    } else {
      bodyGradient.addColorStop(0, '#5eead4');
      bodyGradient.addColorStop(0.5, '#4ecdc4');
      bodyGradient.addColorStop(1, '#3bb5ad');
    }
    
    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    ctx.moveTo(0, -this.player.height / 2);
    ctx.lineTo(-this.player.width / 2, this.player.height / 2);
    ctx.lineTo(0, this.player.height / 3);
    ctx.lineTo(this.player.width / 2, this.player.height / 2);
    ctx.closePath();
    ctx.fill();
    
    // Wings
    ctx.fillStyle = this.upgraded ? '#ff6f00' : '#2d9b94';
    ctx.beginPath();
    ctx.moveTo(-this.player.width / 2, this.player.height / 4);
    ctx.lineTo(-this.player.width / 1.5, this.player.height / 2);
    ctx.lineTo(-this.player.width / 3, this.player.height / 4);
    ctx.closePath();
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(this.player.width / 2, this.player.height / 4);
    ctx.lineTo(this.player.width / 1.5, this.player.height / 2);
    ctx.lineTo(this.player.width / 3, this.player.height / 4);
    ctx.closePath();
    ctx.fill();
    
    ctx.shadowBlur = 0;
    
    // Cockpit with gradient
    const cockpitGradient = ctx.createRadialGradient(0, -5, 2, 0, -5, this.player.width / 4);
    cockpitGradient.addColorStop(0, '#e0f7fa');
    cockpitGradient.addColorStop(0.7, '#95e1d3');
    cockpitGradient.addColorStop(1, '#5eead4');
    
    ctx.fillStyle = cockpitGradient;
    ctx.beginPath();
    ctx.arc(0, -5, this.player.width / 5, 0, Math.PI * 2);
    ctx.fill();
    
    // Highlight on cockpit
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.arc(-3, -8, 4, 0, Math.PI * 2);
    ctx.fill();
    
    // Engine flames (animated)
    const flameLength = 10 + Math.random() * 8;
    const flameGradient = ctx.createLinearGradient(0, this.player.height / 3, 0, this.player.height / 3 + flameLength);
    flameGradient.addColorStop(0, 'rgba(255, 200, 50, 0.9)');
    flameGradient.addColorStop(0.5, 'rgba(255, 100, 50, 0.6)');
    flameGradient.addColorStop(1, 'rgba(255, 50, 50, 0)');
    
    ctx.fillStyle = flameGradient;
    ctx.beginPath();
    ctx.moveTo(-6, this.player.height / 3);
    ctx.lineTo(-6, this.player.height / 3 + flameLength);
    ctx.lineTo(-3, this.player.height / 3 + flameLength * 0.7);
    ctx.closePath();
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(6, this.player.height / 3);
    ctx.lineTo(6, this.player.height / 3 + flameLength);
    ctx.lineTo(3, this.player.height / 3 + flameLength * 0.7);
    ctx.closePath();
    ctx.fill();
    
    // Outline for definition
    ctx.strokeStyle = '#2d9b94';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -this.player.height / 2);
    ctx.lineTo(-this.player.width / 2, this.player.height / 2);
    ctx.lineTo(0, this.player.height / 3);
    ctx.lineTo(this.player.width / 2, this.player.height / 2);
    ctx.closePath();
    ctx.stroke();
    
    ctx.restore();
    
    // Draw shield if active
    if (this.shield) {
      ctx.save();
      ctx.translate(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2);
      
      // Pulsing shield effect
      const pulseIntensity = 0.3 + Math.sin(Date.now() * 0.005) * 0.2;
      
      ctx.strokeStyle = `rgba(29, 209, 161, ${pulseIntensity})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, this.player.width / 2 + 10, 0, Math.PI * 2);
      ctx.stroke();
      
      // Inner glow
      ctx.strokeStyle = `rgba(16, 172, 132, ${pulseIntensity * 0.6})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, this.player.width / 2 + 8, 0, Math.PI * 2);
      ctx.stroke();
      
      ctx.restore();
    }
  }
  
  _renderBullets(ctx) {
    for (const bullet of this.bullets) {
      // Bullet with gradient and glow
      ctx.save();
      
      // Glow effect
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#ffff00';
      
      const bulletGradient = ctx.createLinearGradient(
        bullet.x, bullet.y, 
        bullet.x, bullet.y + bullet.height
      );
      bulletGradient.addColorStop(0, '#ffff99');
      bulletGradient.addColorStop(0.3, '#ffff00');
      bulletGradient.addColorStop(1, '#ffcc00');
      
      ctx.fillStyle = bulletGradient;
      ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
      
      // Core bright line
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(bullet.x + bullet.width / 4, bullet.y, bullet.width / 2, bullet.height);
      
      ctx.restore();
    }
  }
  
  _renderEnemyBullets(ctx) {
    for (const bullet of this.enemyBullets) {
      // Enemy bullet - red
      ctx.save();
      
      // Glow effect
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#ff0000';
      
      const bulletGradient = ctx.createLinearGradient(
        bullet.x, bullet.y, 
        bullet.x, bullet.y + bullet.height
      );
      bulletGradient.addColorStop(0, '#ff4444');
      bulletGradient.addColorStop(0.5, '#ff0000');
      bulletGradient.addColorStop(1, '#cc0000');
      
      ctx.fillStyle = bulletGradient;
      ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
      
      ctx.restore();
    }
  }
  
  _renderEnemies(ctx) {
    for (const enemy of this.enemies) {
      ctx.save();
      ctx.translate(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
      
      // Glow effect
      ctx.shadowBlur = 10;
      ctx.shadowColor = 'rgba(255, 107, 107, 0.6)';
      
      // Enemy ship body with gradient
      const enemyGradient = ctx.createLinearGradient(0, -enemy.height / 2, 0, enemy.height / 2);
      enemyGradient.addColorStop(0, '#ff4757');
      enemyGradient.addColorStop(0.5, '#ff6b6b');
      enemyGradient.addColorStop(1, '#ee5a6f');
      
      ctx.fillStyle = enemyGradient;
      ctx.beginPath();
      ctx.moveTo(0, enemy.height / 2);
      ctx.lineTo(-enemy.width / 2, -enemy.height / 2);
      ctx.lineTo(0, -enemy.height / 3);
      ctx.lineTo(enemy.width / 2, -enemy.height / 2);
      ctx.closePath();
      ctx.fill();
      
      ctx.shadowBlur = 0;
      
      // Wings/fins
      ctx.fillStyle = '#d63447';
      ctx.beginPath();
      ctx.moveTo(-enemy.width / 2.5, 0);
      ctx.lineTo(-enemy.width / 1.8, -enemy.height / 3);
      ctx.lineTo(-enemy.width / 3, 0);
      ctx.closePath();
      ctx.fill();
      
      ctx.beginPath();
      ctx.moveTo(enemy.width / 2.5, 0);
      ctx.lineTo(enemy.width / 1.8, -enemy.height / 3);
      ctx.lineTo(enemy.width / 3, 0);
      ctx.closePath();
      ctx.fill();
      
      // Cockpit/core
      ctx.fillStyle = '#ffa502';
      ctx.beginPath();
      ctx.rect(-enemy.width / 8, -enemy.height / 8, enemy.width / 4, enemy.height / 3);
      ctx.fill();
      
      // Evil eye/sensor
      ctx.fillStyle = '#ff6348';
      ctx.beginPath();
      ctx.arc(0, 0, enemy.width / 10, 0, Math.PI * 2);
      ctx.fill();
      
      // Outline
      ctx.strokeStyle = '#c23616';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, enemy.height / 2);
      ctx.lineTo(-enemy.width / 2, -enemy.height / 2);
      ctx.lineTo(0, -enemy.height / 3);
      ctx.lineTo(enemy.width / 2, -enemy.height / 2);
      ctx.closePath();
      ctx.stroke();
      
      ctx.restore();
    }
  }
  
  _renderAsteroids(ctx) {
    for (const asteroid of this.asteroids) {
      ctx.save();
      ctx.translate(asteroid.x, asteroid.y);
      ctx.rotate(asteroid.rotation);
      
      // Shadow/glow
      ctx.shadowBlur = 8;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      
      // Draw irregular polygon with gradient
      const asteroidGradient = ctx.createRadialGradient(
        -asteroid.size / 6, -asteroid.size / 6, asteroid.size / 8,
        0, 0, asteroid.size / 2
      );
      asteroidGradient.addColorStop(0, '#a0a0a0');
      asteroidGradient.addColorStop(0.4, '#888888');
      asteroidGradient.addColorStop(1, '#555555');
      
      ctx.fillStyle = asteroidGradient;
      ctx.strokeStyle = "#444444";
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      const points = 8;
      for (let i = 0; i < points; i++) {
        const angle = (Math.PI * 2 * i) / points;
        // Make it more irregular
        const variation = 0.7 + Math.sin(i * 3) * 0.3;
        const radius = asteroid.size / 2 * variation;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      
      ctx.shadowBlur = 0;
      
      // Add craters for detail
      ctx.fillStyle = 'rgba(60, 60, 60, 0.6)';
      const craterCount = Math.floor(asteroid.size / 15);
      for (let i = 0; i < craterCount; i++) {
        const craterAngle = (Math.PI * 2 * i) / craterCount + i * 0.7;
        const craterDist = asteroid.size / 4 + (i % 2) * asteroid.size / 6;
        const craterX = Math.cos(craterAngle) * craterDist;
        const craterY = Math.sin(craterAngle) * craterDist;
        const craterSize = 3 + (i % 3) * 2;
        
        ctx.beginPath();
        ctx.arc(craterX, craterY, craterSize, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Highlight for 3D effect
      ctx.fillStyle = 'rgba(200, 200, 200, 0.3)';
      ctx.beginPath();
      ctx.arc(-asteroid.size / 4, -asteroid.size / 4, asteroid.size / 6, 0, Math.PI * 2);
      ctx.fill();
      
      // Health indicator (small bar)
      if (asteroid.health > 1) {
        ctx.fillStyle = '#ff6b6b';
        const barWidth = asteroid.size * 0.6;
        const barHeight = 3;
        const healthPercent = asteroid.health / Math.ceil(asteroid.size / 20);
        
        ctx.fillRect(-barWidth / 2, -asteroid.size / 2 - 8, barWidth, barHeight);
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(-barWidth / 2, -asteroid.size / 2 - 8, barWidth * healthPercent, barHeight);
      }
      
      ctx.restore();
    }
  }
  
  _renderPowerups(ctx) {
    for (const powerup of this.powerups) {
      ctx.save();
      ctx.translate(powerup.x, powerup.y);
      ctx.rotate(powerup.rotation);
      
      // Different colors for different power-ups
      let boxColor, strokeColor, symbol;
      if (powerup.type === "rapidfire") {
        boxColor = "#feca57";
        strokeColor = "#ff9ff3";
        symbol = "R";
      } else if (powerup.type === "dualgun") {
        boxColor = "#48dbfb";
        strokeColor = "#0abde3";
        symbol = "D";
      } else if (powerup.type === "shield") {
        boxColor = "#1dd1a1";
        strokeColor = "#10ac84";
        symbol = "S";
      } else if (powerup.type === "upgrade") {
        boxColor = "#ff6348";
        strokeColor = "#ff4757";
        symbol = "U";
      }
      
      // Glowing power-up box
      ctx.fillStyle = boxColor;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 3;
      
      ctx.fillRect(-powerup.size / 2, -powerup.size / 2, powerup.size, powerup.size);
      ctx.strokeRect(-powerup.size / 2, -powerup.size / 2, powerup.size, powerup.size);
      
      // Symbol
      ctx.fillStyle = "#000000";
      ctx.font = "bold 16px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(symbol, 0, 0);
      
      ctx.restore();
    }
  }
  
  _renderParticles(ctx) {
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      ctx.restore();
    }
  }
  
  _renderUI(ctx) {
    ctx.fillStyle = "#ffffff";
    ctx.font = "20px Arial";
    ctx.textAlign = "left";
    
    // Score
    ctx.fillText(`Score: ${this.gameState.score}`, 20, 30);
    
    // Lives
    ctx.fillText(`Lives: ${this.gameState.lives}`, 20, 60);
    
    // Level
    ctx.fillText(`Level: ${this.gameState.level}`, 20, 90);
    
    // High score
    ctx.fillText(`High: ${this.engine.highScore}`, this.engine.canvas.width - 150, 30);
    
    // Ship upgrade indicator
    if (this.upgraded) {
      ctx.fillStyle = "#ffd700";
      ctx.fillText("⚡ UPGRADED SHIP", 20, 120);
    }
    
    // Permanent unlocks
    if (this.permanentRapidFire) {
      ctx.fillStyle = "#feca57";
      ctx.fillText("⚡ RAPID FIRE", 20, this.upgraded ? 150 : 120);
    }
    if (this.permanentDualGuns) {
      ctx.fillStyle = "#48dbfb";
      ctx.fillText("⚡ DUAL GUNS", 20, this.upgraded ? (this.permanentRapidFire ? 180 : 150) : (this.permanentRapidFire ? 150 : 120));
    }
    if (this.permanentTripleFire) {
      ctx.fillStyle = "#ff6348";
      const yPos = 120 + (this.upgraded ? 30 : 0) + (this.permanentRapidFire ? 30 : 0) + (this.permanentDualGuns ? 30 : 0);
      ctx.fillText("⚡ TRIPLE FIRE", 20, yPos);
    }
    
    // Power-up indicators (temporary ones)
    let powerupY = 30;
    if (this.rapidFire && !this.permanentRapidFire) {
      ctx.fillStyle = "#feca57";
      ctx.fillText(`RAPID FIRE: ${this.rapidFireTimer.toFixed(1)}s`, this.engine.canvas.width / 2 - 80, powerupY);
      powerupY += 30;
    }
    if (this.dualGuns && !this.permanentDualGuns) {
      ctx.fillStyle = "#48dbfb";
      ctx.fillText(`DUAL GUNS: ${this.dualGunsTimer.toFixed(1)}s`, this.engine.canvas.width / 2 - 80, powerupY);
      powerupY += 30;
    }
    if (this.shield) {
      ctx.fillStyle = "#1dd1a1";
      ctx.fillText(`SHIELD: ${this.shieldTimer.toFixed(1)}s`, this.engine.canvas.width / 2 - 80, powerupY);
    }
  }
  
  _renderReadyScreen(ctx) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, this.engine.canvas.width, this.engine.canvas.height);
    
    ctx.fillStyle = "#ffffff";
    ctx.font = "48px Arial";
    ctx.textAlign = "center";
    ctx.fillText("SPACE SHOOTER", this.engine.canvas.width / 2, this.engine.canvas.height / 2 - 50);
    
    ctx.font = "24px Arial";
    ctx.fillText("Press SPACE to Start", this.engine.canvas.width / 2, this.engine.canvas.height / 2 + 20);
    
    ctx.font = "18px Arial";
    ctx.fillText("Arrow Keys / WASD to Move", this.engine.canvas.width / 2, this.engine.canvas.height / 2 + 60);
    ctx.fillText("SPACE to Shoot", this.engine.canvas.width / 2, this.engine.canvas.height / 2 + 90);
    ctx.fillText("P to Pause | M to Mute", this.engine.canvas.width / 2, this.engine.canvas.height / 2 + 120);
    
    // Level unlocks info
    ctx.font = "16px Arial";
    ctx.fillStyle = "#feca57";
    ctx.fillText("⚡ Level 3: Rapid Fire Permanent", this.engine.canvas.width / 2, this.engine.canvas.height / 2 + 160);
    ctx.fillStyle = "#48dbfb";
    ctx.fillText("⚡ Level 5: Dual Guns Permanent", this.engine.canvas.width / 2, this.engine.canvas.height / 2 + 185);
    ctx.fillStyle = "#1dd1a1";
    ctx.fillText("⚡ Level 5: Shield 3x Duration (30s)", this.engine.canvas.width / 2, this.engine.canvas.height / 2 + 210);
    ctx.fillStyle = "#ff6348";
    ctx.fillText("⚡ Level 10: Triple Fire Permanent", this.engine.canvas.width / 2, this.engine.canvas.height / 2 + 235);
    ctx.fillStyle = "#ffffff";
    ctx.fillText("⚠️ Level 2+: Enemies shoot back!", this.engine.canvas.width / 2, this.engine.canvas.height / 2 + 260);
  }
  
  _renderPausedScreen(ctx) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, this.engine.canvas.width, this.engine.canvas.height);
    
    ctx.fillStyle = "#ffffff";
    ctx.font = "48px Arial";
    ctx.textAlign = "center";
    ctx.fillText("PAUSED", this.engine.canvas.width / 2, this.engine.canvas.height / 2);
    
    ctx.font = "24px Arial";
    ctx.fillText("Press P to Resume", this.engine.canvas.width / 2, this.engine.canvas.height / 2 + 50);
  }
  
  _renderGameOverScreen(ctx) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    ctx.fillRect(0, 0, this.engine.canvas.width, this.engine.canvas.height);
    
    ctx.fillStyle = "#ff6b6b";
    ctx.font = "48px Arial";
    ctx.textAlign = "center";
    ctx.fillText("GAME OVER", this.engine.canvas.width / 2, this.engine.canvas.height / 2 - 50);
    
    ctx.fillStyle = "#ffffff";
    ctx.font = "24px Arial";
    ctx.fillText(`Final Score: ${this.gameState.score}`, this.engine.canvas.width / 2, this.engine.canvas.height / 2 + 20);
    
    if (this.gameState.score === this.engine.highScore && this.gameState.score > 0) {
      ctx.fillStyle = "#feca57";
      ctx.fillText("NEW HIGH SCORE!", this.engine.canvas.width / 2, this.engine.canvas.height / 2 + 60);
    }
    
    ctx.fillStyle = "#ffffff";
    ctx.fillText("Press SPACE to Play Again", this.engine.canvas.width / 2, this.engine.canvas.height / 2 + 100);
  }
}
