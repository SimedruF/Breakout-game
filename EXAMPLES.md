# Quick Start Examples

## Example 1: Minimal Game

The simplest possible game using GameEngine:

```javascript
// game.js
import { GameEngine } from './js/GameEngine.js';

class SimpleGame {
  constructor(canvasId) {
    this.engine = new GameEngine(canvasId);
    this.playerX = this.engine.canvas.width / 2;
    this.playerY = this.engine.canvas.height / 2;
  }
  
  update(dt) {
    // Move with arrow keys
    if (this.engine.isKeyPressed("ArrowLeft")) this.playerX -= 200 * dt;
    if (this.engine.isKeyPressed("ArrowRight")) this.playerX += 200 * dt;
    if (this.engine.isKeyPressed("ArrowUp")) this.playerY -= 200 * dt;
    if (this.engine.isKeyPressed("ArrowDown")) this.playerY += 200 * dt;
  }
  
  render(ctx) {
    this.engine.clear();
    this.engine.drawCircle(this.playerX, this.playerY, 20, "#00ff00");
  }
  
  start() {
    this.engine.start(
      (dt) => this.update(dt),
      (ctx) => this.render(ctx)
    );
  }
}

const game = new SimpleGame('gameCanvas');
game.start();
```

## Example 2: Game with Collision

Add collision detection:

```javascript
import { GameEngine } from './js/GameEngine.js';

class CollisionGame {
  constructor(canvasId) {
    this.engine = new GameEngine(canvasId);
    
    this.player = { x: 50, y: 50, r: 15 };
    this.target = { x: 400, y: 250, w: 50, h: 50 };
    this.score = 0;
  }
  
  update(dt) {
    // Mouse control
    if (this.engine.mouse.active) {
      this.player.x = this.engine.mouse.x;
      this.player.y = this.engine.mouse.y;
      
      // Check collision
      if (GameEngine.circleRectIntersects(this.player, this.target)) {
        this.score++;
        // Move target to random position
        this.target.x = GameEngine.randomInt(0, 750);
        this.target.y = GameEngine.randomInt(0, 450);
      }
    }
  }
  
  render(ctx) {
    this.engine.clear();
    
    // Draw target
    this.engine.drawRect(
      this.target.x, this.target.y, 
      this.target.w, this.target.h, 
      "#ff0000"
    );
    
    // Draw player
    this.engine.drawCircle(
      this.player.x, this.player.y, 
      this.player.r, 
      "#0000ff"
    );
    
    // Draw score
    this.engine.drawText(`Score: ${this.score}`, 10, 30, {
      color: "#ffffff",
      font: "24px Arial"
    });
  }
  
  start() {
    this.engine.start(
      (dt) => this.update(dt),
      (ctx) => this.render(ctx)
    );
  }
}

const game = new CollisionGame('gameCanvas');
game.start();
```

## Example 3: Platformer Physics

Basic platformer with gravity and jumping:

```javascript
import { GameEngine } from './js/GameEngine.js';

class PlatformerGame {
  constructor(canvasId) {
    this.engine = new GameEngine(canvasId);
    
    this.player = {
      x: 100,
      y: 100,
      w: 32,
      h: 32,
      vx: 0,
      vy: 0,
      onGround: false
    };
    
    this.platforms = [
      { x: 0, y: 450, w: 800, h: 50 },    // Floor
      { x: 200, y: 350, w: 150, h: 20 },  // Platform 1
      { x: 450, y: 250, w: 150, h: 20 }   // Platform 2
    ];
    
    this.GRAVITY = 980;
    this.JUMP_FORCE = -400;
    this.MOVE_SPEED = 200;
    
    this._setupInput();
  }
  
  _setupInput() {
    this.engine.onKeyDown = (keyCode) => {
      if (keyCode === "Space" && this.player.onGround) {
        this.player.vy = this.JUMP_FORCE;
        this.player.onGround = false;
      }
    };
  }
  
  update(dt) {
    // Horizontal movement
    this.player.vx = 0;
    if (this.engine.isKeyPressed("ArrowLeft")) {
      this.player.vx = -this.MOVE_SPEED;
    }
    if (this.engine.isKeyPressed("ArrowRight")) {
      this.player.vx = this.MOVE_SPEED;
    }
    
    // Apply gravity
    this.player.vy += this.GRAVITY * dt;
    
    // Update position
    this.player.x += this.player.vx * dt;
    this.player.y += this.player.vy * dt;
    
    // Check platform collisions
    this.player.onGround = false;
    for (const platform of this.platforms) {
      if (GameEngine.rectIntersects(this.player, platform)) {
        // Simple collision resolution (from above only)
        if (this.player.vy > 0) {
          this.player.y = platform.y - this.player.h;
          this.player.vy = 0;
          this.player.onGround = true;
        }
      }
    }
    
    // Keep player in bounds
    this.player.x = GameEngine.clamp(this.player.x, 0, 768);
  }
  
  render(ctx) {
    this.engine.clear("#87CEEB"); // Sky blue
    
    // Draw platforms
    for (const platform of this.platforms) {
      this.engine.drawRect(
        platform.x, platform.y, 
        platform.w, platform.h, 
        "#8B4513"
      );
    }
    
    // Draw player
    const playerColor = this.player.onGround ? "#00ff00" : "#ffff00";
    this.engine.drawRect(
      this.player.x, this.player.y, 
      this.player.w, this.player.h, 
      playerColor
    );
    
    // Instructions
    this.engine.drawText("Arrow keys to move, SPACE to jump", 10, 30, {
      color: "#000000",
      font: "16px Arial"
    });
  }
  
  start() {
    this.engine.start(
      (dt) => this.update(dt),
      (ctx) => this.render(ctx)
    );
  }
}

const game = new PlatformerGame('gameCanvas');
game.start();
```

## Example 4: Shooting Game

Game with projectiles and enemies:

```javascript
import { GameEngine } from './js/GameEngine.js';

class ShooterGame {
  constructor(canvasId) {
    this.engine = new GameEngine(canvasId);
    
    this.player = {
      x: this.engine.canvas.width / 2,
      y: this.engine.canvas.height - 50,
      w: 40,
      h: 40
    };
    
    this.bullets = [];
    this.enemies = [];
    this.score = 0;
    
    // Spawn enemies periodically
    this.enemyTimer = 0;
    this.enemyInterval = 1.0; // seconds
    
    this._setupInput();
    this._registerSounds();
  }
  
  _setupInput() {
    this.engine.onKeyDown = (keyCode) => {
      if (keyCode === "Space") {
        this._shoot();
      }
    };
  }
  
  _registerSounds() {
    this.engine.registerSound("shoot", {
      frequency: 440,
      duration: 50,
      gain: 0.05,
      type: "square"
    });
    
    this.engine.registerSound("hit", {
      frequency: 220,
      duration: 100,
      gain: 0.05,
      type: "sawtooth"
    });
  }
  
  _shoot() {
    this.bullets.push({
      x: this.player.x + this.player.w / 2 - 2,
      y: this.player.y,
      w: 4,
      h: 10,
      vy: -500
    });
    this.engine.playSound("shoot");
  }
  
  _spawnEnemy() {
    this.enemies.push({
      x: GameEngine.randomInt(20, this.engine.canvas.width - 40),
      y: -30,
      w: 30,
      h: 30,
      vy: 100 + this.score * 5 // Get faster with score
    });
  }
  
  update(dt) {
    // Player movement (mouse)
    if (this.engine.mouse.active) {
      this.player.x = this.engine.mouse.x - this.player.w / 2;
      this.player.x = GameEngine.clamp(
        this.player.x, 
        0, 
        this.engine.canvas.width - this.player.w
      );
    }
    
    // Update bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      this.bullets[i].y += this.bullets[i].vy * dt;
      
      // Remove off-screen bullets
      if (this.bullets[i].y < -10) {
        this.bullets.splice(i, 1);
      }
    }
    
    // Spawn enemies
    this.enemyTimer += dt;
    if (this.enemyTimer >= this.enemyInterval) {
      this._spawnEnemy();
      this.enemyTimer = 0;
    }
    
    // Update enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      this.enemies[i].y += this.enemies[i].vy * dt;
      
      // Remove off-screen enemies
      if (this.enemies[i].y > this.engine.canvas.height) {
        this.enemies.splice(i, 1);
      }
    }
    
    // Check bullet-enemy collisions
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        if (GameEngine.rectIntersects(this.bullets[i], this.enemies[j])) {
          this.bullets.splice(i, 1);
          this.enemies.splice(j, 1);
          this.score++;
          this.engine.playSound("hit");
          this.engine.saveHighScore(this.score);
          break;
        }
      }
    }
  }
  
  render(ctx) {
    this.engine.clear("#000033");
    
    // Draw player
    this.engine.drawRect3D(
      this.player.x, this.player.y, 
      this.player.w, this.player.h, 
      "#00ff00"
    );
    
    // Draw bullets
    for (const bullet of this.bullets) {
      this.engine.drawRect(
        bullet.x, bullet.y, 
        bullet.w, bullet.h, 
        "#ffff00"
      );
    }
    
    // Draw enemies
    for (const enemy of this.enemies) {
      this.engine.drawRect3D(
        enemy.x, enemy.y, 
        enemy.w, enemy.h, 
        "#ff0000"
      );
    }
    
    // HUD
    this.engine.drawText(`Score: ${this.score}`, 10, 30, {
      color: "#ffffff",
      font: "20px Arial"
    });
    
    this.engine.drawText(`High: ${this.engine.highScore}`, 10, 55, {
      color: "#ffff00",
      font: "16px Arial"
    });
    
    this.engine.drawText("Move: Mouse | Shoot: SPACE", 10, 80, {
      color: "#aaaaaa",
      font: "14px Arial"
    });
  }
  
  start() {
    this.engine.start(
      (dt) => this.update(dt),
      (ctx) => this.render(ctx)
    );
  }
}

const game = new ShooterGame('gameCanvas');
game.start();
```

## HTML Template

Use this HTML template for any of the above examples:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Game</title>
  <style>
    body {
      margin: 0;
      background: #111;
      display: grid;
      place-items: center;
      height: 100vh;
    }
    
    canvas {
      background: #000;
      border: 2px solid #333;
    }
  </style>
</head>
<body>
  <canvas id="gameCanvas"></canvas>
  
  <script type="module">
    // Import your game here
    import { SimpleGame } from './game.js';
    
    const game = new SimpleGame('gameCanvas');
    game.start();
  </script>
</body>
</html>
```

## Next Steps

1. Try each example
2. Modify the parameters (speed, colors, sizes)
3. Add new features (scoring, lives, levels)
4. Combine concepts (platformer + shooting = Mega Man!)
5. Read [GAME_ENGINE_DOCS.md](GAME_ENGINE_DOCS.md) for complete API

## Tips

- Always multiply movement by `dt` for smooth, frame-independent motion
- Use `GameEngine.clamp()` to keep objects in bounds
- Start simple, add complexity gradually
- Use `console.log()` to debug game state
- Test collision detection with simple shapes first
