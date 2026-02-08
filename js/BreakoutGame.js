/**
 * BreakoutGame.js - Breakout game implementation using GameEngine
 * 
 * This is a complete Breakout game that demonstrates how to use
 * the modular GameEngine for creating arcade-style games.
 */

import { GameEngine } from './GameEngine.js';

export class BreakoutGame {
  constructor(canvasId, config = {}) {
    // Initialize game engine
    this.engine = new GameEngine(canvasId, {
      width: 800,
      height: 500,
      highScoreKey: "breakout_high_score_v1",
      ...config
    });
    
    // Game configuration
    this.config = {
      // Ball & Paddle
      ballRadius: 9,
      paddleWidth: 120,
      paddleHeight: 14,
      paddleSpeed: 520,
      paddleY: this.engine.canvas.height - 40,
      maxBounceAngle: (60 * Math.PI) / 180,
      
      // Level progression
      baseBallSpeed: 300,
      speedPerLevel: 0.12,
      baseBrickRows: 6,
      maxBrickRows: 10,
      
      // Bricks
      brickCols: 10,
      brickGap: 8,
      brickTop: 60,
      brickSideMargin: 40,
      brickHeight: 22,
      
      // Power-ups
      powerupChance: 0.18,
      powerupFallSpeed: 170,
      powerupSize: 18,
      powerupWideMult: 1.5,
      powerupWideDuration: 10000,
      powerupSlowFactor: 0.75,
      powerupSlowDuration: 8000,
      
      // Gameplay
      startingLives: 3,
      
      ...config
    };
    
    // Calculate brick width
    this.config.brickWidth = (
      this.engine.canvas.width - 
      2 * this.config.brickSideMargin - 
      (this.config.brickCols - 1) * this.config.brickGap
    ) / this.config.brickCols;
    
    // Game objects
    this.paddle = {
      w: this.config.paddleWidth,
      h: this.config.paddleHeight,
      x: (this.engine.canvas.width - this.config.paddleWidth) / 2,
      y: this.config.paddleY,
      speed: this.config.paddleSpeed,
      baseW: this.config.paddleWidth
    };
    
    this.ball = {
      r: this.config.ballRadius,
      x: this.engine.canvas.width / 2,
      y: this.engine.canvas.height / 2,
      vx: 0,
      vy: 0
    };
    
    // Game state
    this.gameState = {
      status: "SERVE", // SERVE | PLAYING | PAUSED | WIN | GAME_OVER
      score: 0,
      lives: this.config.startingLives,
      level: 1,
      combo: 0,
      ballSpeedLimit: null
    };
    
    // Collections
    this.bricks = [];
    this.powerups = [];
    
    // Power-up timers
    this.wideTimeoutId = null;
    this.slowTimeoutId = null;
    
    // Brick colors
    this.brickColors = [
      "#e74c3c", "#e67e22", "#f39c12", "#2ecc71",
      "#3498db", "#9b59b6", "#1abc9c", "#34495e"
    ];
    
    // Register sound effects
    this._registerSounds();
    
    // Setup input handlers
    this._setupInputHandlers();
    
    // Initialize game
    this.resetGame();
  }
  
  // ===== INITIALIZATION =====
  
  _registerSounds() {
    this.engine.registerSound("wall", { frequency: 520, duration: 25, gain: 0.04, type: "sine" });
    this.engine.registerSound("paddle", { frequency: 280, duration: 35, gain: 0.05, type: "sine" });
    this.engine.registerSound("brick", { frequency: 760, duration: 35, gain: 0.05, type: "triangle" });
    this.engine.registerSound("brick2", { frequency: 430, duration: 22, gain: 0.04, type: "sine" });
    this.engine.registerSound("powerup", { frequency: 900, duration: 60, gain: 0.05, type: "square" });
    this.engine.registerSound("life", { frequency: 180, duration: 120, gain: 0.06, type: "sawtooth" });
    this.engine.registerSound("win", { frequency: 1000, duration: 120, gain: 0.05, type: "triangle" });
  }
  
  _setupInputHandlers() {
    // Keyboard controls
    this.engine.onKeyDown = (keyCode) => {
      if (keyCode === "Space") {
        if (this.gameState.status === "SERVE") {
          this.launchBall();
        } else if (this.gameState.status === "WIN") {
          this.startLevel(this.gameState.level + 1);
        } else if (this.gameState.status === "GAME_OVER") {
          this.resetGame();
        }
      }
      
      if (keyCode === "KeyP") {
        if (this.gameState.status === "PLAYING") {
          this.gameState.status = "PAUSED";
        } else if (this.gameState.status === "PAUSED") {
          this.gameState.status = "PLAYING";
        }
      }
      
      if (keyCode === "KeyM") {
        this.engine.toggleMute();
      }
    };
  }
  
  // ===== GAME LOGIC =====
  
  resetGame() {
    this.gameState.score = 0;
    this.gameState.lives = this.config.startingLives;
    this.startLevel(1);
  }
  
  startLevel(level) {
    this.clearEffects();
    this.powerups.length = 0;
    
    this.gameState.level = level;
    const rows = this._rowsForLevel(level);
    this.bricks = this._buildBricks(rows, level);
    
    this._resetBallAndPaddle();
    this.gameState.status = "SERVE";
  }
  
  _resetBallAndPaddle() {
    this.paddle.x = (this.engine.canvas.width - this.paddle.w) / 2;
    
    this.ball.x = this.paddle.x + this.paddle.w / 2;
    this.ball.y = this.paddle.y - this.ball.r;
    this.ball.vx = 0;
    this.ball.vy = 0;
    
    this.powerups.length = 0;
    this.gameState.combo = 0;
  }
  
  launchBall() {
    const speed = this._ballSpeedForLevel(this.gameState.level);
    const angle = (-Math.PI / 2) + (Math.random() * 0.8 - 0.4);
    this.ball.vx = Math.cos(angle) * speed;
    this.ball.vy = Math.sin(angle) * speed;
    this.gameState.status = "PLAYING";
  }
  
  // ===== BRICKS =====
  
  _buildBricks(rows, level) {
    const arr = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < this.config.brickCols; c++) {
        const x = this.config.brickSideMargin + c * (this.config.brickWidth + this.config.brickGap);
        const y = this.config.brickTop + r * (this.config.brickHeight + this.config.brickGap);
        const hp = this._brickHPFor(level, r);
        arr.push({
          x, y,
          w: this.config.brickWidth,
          h: this.config.brickHeight,
          alive: true,
          hp,
          maxHp: hp,
          row: r
        });
      }
    }
    return arr;
  }
  
  _brickHPFor(level, row) {
    if (level <= 2) return (row % 2 === 1) ? 2 : 1;
    if (level <= 4) return (row % 3 === 2) ? 2 : 1;
    return (row % 2 === 0) ? 2 : 1;
  }
  
  _rowsForLevel(level) {
    return Math.min(this.config.maxBrickRows, this.config.baseBrickRows + (level - 1));
  }
  
  _ballSpeedForLevel(level) {
    return this.config.baseBallSpeed * (1 + (level - 1) * this.config.speedPerLevel);
  }
  
  // ===== POWER-UPS =====
  
  spawnPowerup(x, y) {
    const type = Math.random() < 0.5 ? "WIDE" : "SLOW";
    this.powerups.push({
      x, y,
      vy: this.config.powerupFallSpeed,
      size: this.config.powerupSize,
      type
    });
  }
  
  applyPowerup(type) {
    if (type === "WIDE") {
      this.paddle.w = Math.round(this.paddle.baseW * this.config.powerupWideMult);
      this.paddle.x = GameEngine.clamp(this.paddle.x, 0, this.engine.canvas.width - this.paddle.w);
      
      if (this.wideTimeoutId) clearTimeout(this.wideTimeoutId);
      this.wideTimeoutId = setTimeout(() => {
        this.paddle.w = this.paddle.baseW;
        this.paddle.x = GameEngine.clamp(this.paddle.x, 0, this.engine.canvas.width - this.paddle.w);
        this.wideTimeoutId = null;
      }, this.config.powerupWideDuration);
    }
    
    if (type === "SLOW") {
      this.gameState.ballSpeedLimit = this._ballSpeedForLevel(this.gameState.level) * this.config.powerupSlowFactor;
      this._clampBallSpeed();
      
      if (this.slowTimeoutId) clearTimeout(this.slowTimeoutId);
      this.slowTimeoutId = setTimeout(() => {
        this.gameState.ballSpeedLimit = null;
        this.slowTimeoutId = null;
      }, this.config.powerupSlowDuration);
    }
  }
  
  clearEffects() {
    if (this.wideTimeoutId) {
      clearTimeout(this.wideTimeoutId);
      this.wideTimeoutId = null;
    }
    if (this.slowTimeoutId) {
      clearTimeout(this.slowTimeoutId);
      this.slowTimeoutId = null;
    }
    this.paddle.w = this.paddle.baseW;
    this.gameState.ballSpeedLimit = null;
  }
  
  _clampBallSpeed() {
    if (this.gameState.ballSpeedLimit == null) return;
    const s = Math.hypot(this.ball.vx, this.ball.vy);
    if (s <= 0) return;
    if (s > this.gameState.ballSpeedLimit) {
      const k = this.gameState.ballSpeedLimit / s;
      this.ball.vx *= k;
      this.ball.vy *= k;
    }
  }
  
  // ===== UPDATE LOOP =====
  
  update(dt) {
    // Paddle movement (works even when paused)
    if (this.engine.mouse.active) {
      this.paddle.x = GameEngine.clamp(
        this.engine.mouse.x - this.paddle.w / 2,
        0,
        this.engine.canvas.width - this.paddle.w
      );
    } else {
      let dir = 0;
      if (this.engine.isKeyPressed("ArrowLeft")) dir -= 1;
      if (this.engine.isKeyPressed("ArrowRight")) dir += 1;
      
      this.paddle.x += dir * this.paddle.speed * dt;
      this.paddle.x = GameEngine.clamp(this.paddle.x, 0, this.engine.canvas.width - this.paddle.w);
    }
    
    // Paused - only paddle movement allowed
    if (this.gameState.status === "PAUSED") return;
    
    // Serve mode - ball follows paddle
    if (this.gameState.status === "SERVE") {
      this.ball.x = this.paddle.x + this.paddle.w / 2;
      this.ball.y = this.paddle.y - this.ball.r;
      return;
    }
    
    // Only update game logic when playing
    if (this.gameState.status !== "PLAYING") return;
    
    // Ball movement
    this.ball.x += this.ball.vx * dt;
    this.ball.y += this.ball.vy * dt;
    
    // Wall collisions
    if (this.ball.x - this.ball.r < 0) {
      this.ball.x = this.ball.r;
      this.ball.vx *= -1;
      this.engine.playSound("wall");
    } else if (this.ball.x + this.ball.r > this.engine.canvas.width) {
      this.ball.x = this.engine.canvas.width - this.ball.r;
      this.ball.vx *= -1;
      this.engine.playSound("wall");
    }
    
    if (this.ball.y - this.ball.r < 0) {
      this.ball.y = this.ball.r;
      this.ball.vy *= -1;
      this.engine.playSound("wall");
    }
    
    // Paddle collision
    this._checkPaddleCollision();
    
    // Brick collisions
    this._checkBrickCollisions();
    
    // Power-up updates
    this._updatePowerups(dt);
    
    // Apply speed limit
    this._clampBallSpeed();
    
    // Win condition
    if (!this.bricks.some(b => b.alive)) {
      this.gameState.status = "WIN";
      this.engine.playSound("win");
      return;
    }
    
    // Bottom boundary - lose a life
    if (this.ball.y - this.ball.r > this.engine.canvas.height) {
      this.gameState.lives -= 1;
      this.gameState.combo = 0;
      this.engine.playSound("life");
      
      if (this.gameState.lives <= 0) {
        this.gameState.status = "GAME_OVER";
      } else {
        this._resetBallAndPaddle();
        this.gameState.status = "SERVE";
      }
    }
  }
  
  _checkPaddleCollision() {
    if (this.ball.vy <= 0) return; // Ball moving upward
    
    const paddleRect = {
      x: this.paddle.x,
      y: this.paddle.y,
      w: this.paddle.w,
      h: this.paddle.h
    };
    
    if (GameEngine.circleRectIntersects(this.ball, paddleRect)) {
      this.ball.y = this.paddle.y - this.ball.r;
      
      // Calculate bounce angle based on hit position
      const paddleCenter = this.paddle.x + this.paddle.w / 2;
      let hit = (this.ball.x - paddleCenter) / (this.paddle.w / 2);
      hit = GameEngine.clamp(hit, -1, 1);
      
      const speed = Math.hypot(this.ball.vx, this.ball.vy) * 1.003; // Slight acceleration
      const angle = hit * this.config.maxBounceAngle;
      
      this.ball.vx = speed * Math.sin(angle);
      this.ball.vy = -Math.abs(speed * Math.cos(angle));
      
      this.gameState.combo = 0;
      this.engine.playSound("paddle");
    }
  }
  
  _checkBrickCollisions() {
    const ballBounds = {
      left: this.ball.x - this.ball.r,
      right: this.ball.x + this.ball.r,
      top: this.ball.y - this.ball.r,
      bottom: this.ball.y + this.ball.r
    };
    
    for (const brick of this.bricks) {
      if (!brick.alive) continue;
      
      const brickBounds = {
        left: brick.x,
        right: brick.x + brick.w,
        top: brick.y,
        bottom: brick.y + brick.h
      };
      
      const hit = ballBounds.right >= brickBounds.left &&
                  ballBounds.left <= brickBounds.right &&
                  ballBounds.bottom >= brickBounds.top &&
                  ballBounds.top <= brickBounds.bottom;
      
      if (hit) {
        // Determine bounce axis by minimum penetration
        const overlapX = Math.min(
          ballBounds.right - brickBounds.left,
          brickBounds.right - ballBounds.left
        );
        const overlapY = Math.min(
          ballBounds.bottom - brickBounds.top,
          brickBounds.bottom - ballBounds.top
        );
        
        if (overlapX < overlapY) {
          // Bounce on X axis
          if (this.ball.x < brick.x + brick.w / 2) {
            this.ball.x -= overlapX;
          } else {
            this.ball.x += overlapX;
          }
          this.ball.vx *= -1;
        } else {
          // Bounce on Y axis
          if (this.ball.y < brick.y + brick.h / 2) {
            this.ball.y -= overlapY;
          } else {
            this.ball.y += overlapY;
          }
          this.ball.vy *= -1;
        }
        
        // Apply damage
        brick.hp -= 1;
        
        if (brick.hp <= 0) {
          brick.alive = false;
          
          // Combo scoring
          this.gameState.combo += 1;
          const mult = 1 + Math.min(4, this.gameState.combo - 1);
          this.gameState.score += 10 * mult;
          this.engine.saveHighScore(this.gameState.score);
          
          // Spawn power-up
          if (Math.random() < this.config.powerupChance) {
            this.spawnPowerup(brick.x + brick.w / 2, brick.y + brick.h / 2);
          }
          
          this.engine.playSound("brick");
        } else {
          this.gameState.score += 2;
          this.engine.saveHighScore(this.gameState.score);
          this.engine.playSound("brick2");
        }
        
        break; // One brick per frame for stability
      }
    }
  }
  
  _updatePowerups(dt) {
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const pu = this.powerups[i];
      pu.y += pu.vy * dt;
      
      const half = pu.size / 2;
      const puRect = {
        x: pu.x - half,
        y: pu.y - half,
        w: pu.size,
        h: pu.size
      };
      
      const paddleRect = {
        x: this.paddle.x,
        y: this.paddle.y,
        w: this.paddle.w,
        h: this.paddle.h
      };
      
      if (GameEngine.rectIntersects(puRect, paddleRect)) {
        this.applyPowerup(pu.type);
        this.engine.playSound("powerup");
        this.powerups.splice(i, 1);
        continue;
      }
      
      if (pu.y - half > this.engine.canvas.height) {
        this.powerups.splice(i, 1);
      }
    }
  }
  
  // ===== RENDER LOOP =====
  
  render(ctx) {
    this.engine.clear();
    
    // Render bricks
    this._renderBricks(ctx);
    
    // Render power-ups
    this._renderPowerups(ctx);
    
    // Render paddle
    this._renderPaddle(ctx);
    
    // Render ball
    this._renderBall(ctx);
    
    // Render HUD
    this._renderHUD(ctx);
    
    // Render overlays
    this._renderOverlays(ctx);
  }
  
  _renderBricks(ctx) {
    for (let i = 0; i < this.bricks.length; i++) {
      const brick = this.bricks[i];
      if (!brick.alive) continue;
      
      const baseColor = this.brickColors[brick.row % this.brickColors.length];
      this.engine.drawRect3D(brick.x, brick.y, brick.w, brick.h, baseColor);
      
      // HP indicator for multi-hit bricks
      if (brick.maxHp >= 2) {
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.fillRect(brick.x + 4, brick.y + 4, 10, 4);
        
        if (brick.hp >= 2) {
          ctx.fillStyle = "rgba(255,255,255,0.55)";
          ctx.fillRect(brick.x + 4, brick.y + 4, 10, 4);
        } else {
          ctx.fillStyle = "rgba(255,255,255,0.25)";
          ctx.fillRect(brick.x + 4, brick.y + 4, 5, 4);
        }
      }
    }
  }
  
  _renderPowerups(ctx) {
    for (const pu of this.powerups) {
      const half = pu.size / 2;
      const color = pu.type === "WIDE" ? "#3498db" : "#e74c3c";
      this.engine.drawRect3D(pu.x - half, pu.y - half, pu.size, pu.size, color);
      
      this.engine.drawText(pu.type === "WIDE" ? "W" : "S", pu.x, pu.y, {
        color: "#ffffff",
        font: "bold 12px system-ui",
        align: "center",
        baseline: "middle"
      });
    }
  }
  
  _renderPaddle(ctx) {
    this.engine.drawGradientRect(
      this.paddle.x, this.paddle.y, this.paddle.w, this.paddle.h,
      "#f0f0f0", "#b0b0b0", true
    );
    
    // Add some highlights
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.fillRect(this.paddle.x, this.paddle.y, this.paddle.w, 3);
    
    ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
    ctx.lineWidth = 1;
    ctx.strokeRect(this.paddle.x, this.paddle.y, this.paddle.w, this.paddle.h);
  }
  
  _renderBall(ctx) {
    // 3D ball with gradient
    const gradient = ctx.createRadialGradient(
      this.ball.x - this.ball.r * 0.3,
      this.ball.y - this.ball.r * 0.3,
      this.ball.r * 0.1,
      this.ball.x, this.ball.y, this.ball.r
    );
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.3, "#f5f5f5");
    gradient.addColorStop(0.7, "#d0d0d0");
    gradient.addColorStop(1, "#a0a0a0");
    
    ctx.beginPath();
    ctx.arc(this.ball.x, this.ball.y, this.ball.r, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.closePath();
  }
  
  _renderHUD(ctx) {
    const hudColor = "#9aa0a6";
    const hudFont = "14px system-ui";
    
    this.engine.drawText(`Score: ${this.gameState.score}`, 10, 22, { color: hudColor, font: hudFont });
    this.engine.drawText(`Hi: ${this.engine.highScore}`, 110, 22, { color: hudColor, font: hudFont });
    this.engine.drawText(`Lives: ${this.gameState.lives}`, 200, 22, { color: hudColor, font: hudFont });
    this.engine.drawText(`Level: ${this.gameState.level}`, 290, 22, { color: hudColor, font: hudFont });
    this.engine.drawText(`Combo: ${this.gameState.combo}`, 380, 22, { color: hudColor, font: hudFont });
    
    const effects = [];
    if (this.wideTimeoutId) effects.push("WIDE");
    if (this.gameState.ballSpeedLimit != null) effects.push("SLOW");
    this.engine.drawText(
      `Effects: ${effects.length ? effects.join(", ") : "-"}`,
      480, 22,
      { color: hudColor, font: hudFont }
    );
    
    this.engine.drawText(
      `Sound: ${this.engine.state.muted ? "OFF" : "ON"}`,
      690, 22,
      { color: hudColor, font: hudFont }
    );
  }
  
  _renderOverlays(ctx) {
    let message = "";
    let submessage = "";
    
    if (this.gameState.status === "SERVE") {
      message = `LEVEL ${this.gameState.level}`;
      submessage = "Press SPACE to start";
    } else if (this.gameState.status === "PAUSED") {
      message = "PAUSED";
      submessage = "Press P to continue";
    } else if (this.gameState.status === "WIN") {
      message = "YOU WIN!";
      submessage = "Press SPACE for next level";
    } else if (this.gameState.status === "GAME_OVER") {
      message = "GAME OVER";
      submessage = "Press SPACE to restart";
    }
    
    if (message) {
      this.engine.drawOverlay(message, submessage);
    }
  }
  
  // ===== PUBLIC API =====
  
  start() {
    this.engine.start(
      (dt) => this.update(dt),
      (ctx) => this.render(ctx)
    );
  }
  
  stop() {
    this.engine.stop();
  }
}
