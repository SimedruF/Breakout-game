# GameEngine.js - Developer Documentation

## Overview

**GameEngine.js** is a modular, reusable game engine for creating HTML5 Canvas-based arcade games. It provides core functionality that can be shared across multiple game implementations, reducing code duplication and speeding up development.

## Architecture

The project is organized into three layers:

```
┌─────────────────────────────────────┐
│      Game Implementation Layer      │
│   (BreakoutGame.js, PongGame.js)   │
│  - Game-specific logic              │
│  - Custom rendering                 │
│  - Unique mechanics                 │
└─────────────┬───────────────────────┘
              │ uses
┌─────────────▼───────────────────────┐
│      GameEngine.js (Core Layer)     │
│  - Canvas management                │
│  - Input handling                   │
│  - Game loop                        │
│  - Audio system                     │
│  - Collision detection              │
│  - Utilities                        │
└─────────────────────────────────────┘
```

## GameEngine API Reference

### Constructor

```javascript
const engine = new GameEngine(canvasId, config);
```

**Parameters:**
- `canvasId` (string): ID of the canvas element
- `config` (object): Configuration options

**Configuration Options:**
```javascript
{
  width: 800,              // Canvas width
  height: 500,             // Canvas height
  enableAudio: true,       // Enable audio system
  enableMouse: true,       // Enable mouse/touch input
  enableHighScore: true,   // Enable high score persistence
  highScoreKey: "game_hs", // localStorage key for high score
  maxDeltaTime: 1/30       // Max delta time to prevent physics issues
}
```

### Properties

#### Input State
- `engine.keys` - Object tracking pressed keyboard keys
- `engine.mouse` - Object with mouse state:
  - `active` (boolean): Mouse is over canvas
  - `x`, `y` (number): Mouse position
  - `pressed` (boolean): Mouse button pressed

#### Game State
- `engine.state.running` - Game loop is running
- `engine.state.paused` - Game is paused
- `engine.state.muted` - Audio is muted

#### High Score
- `engine.highScore` - Current high score value

### Methods

#### Game Loop

##### `start(updateCallback, renderCallback)`
Start the game loop.

```javascript
engine.start(
  (dt) => {
    // Update logic - dt is delta time in seconds
    player.x += player.vx * dt;
  },
  (ctx) => {
    // Render logic - ctx is 2D context
    ctx.fillRect(player.x, player.y, player.w, player.h);
  }
);
```

##### `stop()`
Stop the game loop.

##### `pause()` / `resume()` / `togglePause()`
Control game pause state.

#### Input Handling

##### `isKeyPressed(keyCode)`
Check if a key is currently pressed.

```javascript
if (engine.isKeyPressed("ArrowLeft")) {
  player.x -= speed * dt;
}
```

**Common key codes:**
- Arrow keys: `"ArrowLeft"`, `"ArrowRight"`, `"ArrowUp"`, `"ArrowDown"`
- Letters: `"KeyA"`, `"KeyB"`, etc.
- Special: `"Space"`, `"Enter"`, `"Escape"`

##### Callbacks
Set these to handle input events:

```javascript
engine.onKeyDown = (keyCode, event) => {
  if (keyCode === "Space") {
    // Handle space press
  }
};

engine.onKeyUp = (keyCode, event) => {
  // Handle key release
};

engine.onMouseMove = (x, y) => {
  // Handle mouse movement
};

engine.onMouseClick = (x, y) => {
  // Handle mouse click
};
```

#### Audio System

##### `beep(frequency, duration, gain, type)`
Play a simple beep sound.

```javascript
engine.beep(440, 100, 0.05, "sine");
```

**Parameters:**
- `frequency` (number): Hz (e.g., 440 for A4)
- `duration` (number): Milliseconds
- `gain` (number): Volume 0.0-1.0
- `type` (string): "sine", "square", "triangle", "sawtooth"

##### `registerSound(name, params)`
Register a named sound effect.

```javascript
engine.registerSound("jump", {
  frequency: 523,
  duration: 50,
  gain: 0.05,
  type: "square"
});
```

##### `playSound(name)`
Play a registered sound.

```javascript
engine.playSound("jump");
```

##### `toggleMute()`
Toggle audio on/off.

#### Collision Detection (Static Methods)

##### `GameEngine.rectIntersects(rect1, rect2)`
AABB collision between two rectangles.

```javascript
const hit = GameEngine.rectIntersects(
  { x: 10, y: 20, w: 30, h: 40 },
  { x: 25, y: 35, w: 20, h: 20 }
);
```

##### `GameEngine.circleRectIntersects(circle, rect)`
Circle-rectangle collision.

```javascript
const hit = GameEngine.circleRectIntersects(
  { x: 100, y: 100, r: 10 },
  { x: 90, y: 95, w: 20, h: 15 }
);
```

##### `GameEngine.circleIntersects(circle1, circle2)`
Circle-circle collision.

##### `GameEngine.pointInRect(point, rect)`
Point-rectangle collision.

#### Utility Functions (Static Methods)

##### `GameEngine.clamp(value, min, max)`
Clamp value between min and max.

```javascript
player.x = GameEngine.clamp(player.x, 0, canvas.width);
```

##### `GameEngine.lerp(start, end, t)`
Linear interpolation.

```javascript
const smoothX = GameEngine.lerp(currentX, targetX, 0.1);
```

##### `GameEngine.distance(x1, y1, x2, y2)`
Calculate distance between two points.

##### `GameEngine.randomRange(min, max)`
Random float between min and max.

##### `GameEngine.randomInt(min, max)`
Random integer between min and max (inclusive).

#### High Score Management

##### `loadHighScore()`
Load high score from localStorage (called automatically).

##### `saveHighScore(score)`
Save high score if it's higher than current.

```javascript
engine.saveHighScore(player.score);
```

#### Rendering Helpers

##### `clear(color)`
Clear canvas or fill with color.

```javascript
engine.clear();           // Clear to transparent
engine.clear("#000000");  // Fill with black
```

##### `drawRect(x, y, w, h, color)`
Draw a filled rectangle.

```javascript
engine.drawRect(10, 20, 100, 50, "#ff0000");
```

##### `drawCircle(x, y, radius, color)`
Draw a filled circle.

```javascript
engine.drawCircle(100, 100, 25, "#00ff00");
```

##### `drawText(text, x, y, options)`
Draw text with options.

```javascript
engine.drawText("Score: 100", 10, 30, {
  color: "#ffffff",
  font: "20px Arial",
  align: "left",        // left, center, right
  baseline: "top"       // top, middle, bottom, alphabetic
});
```

##### `drawRect3D(x, y, w, h, baseColor, shadowOffset)`
Draw rectangle with 3D effect.

```javascript
engine.drawRect3D(10, 10, 100, 50, "#3498db", 2);
```

##### `drawGradientRect(x, y, w, h, color1, color2, vertical)`
Draw rectangle with gradient.

```javascript
engine.drawGradientRect(10, 10, 100, 50, "#ffffff", "#000000", true);
```

##### `drawOverlay(message, submessage, options)`
Draw full-screen overlay (for pause, game over, etc.).

```javascript
engine.drawOverlay("GAME OVER", "Press SPACE to restart");
```

## Creating a New Game

### Step 1: Import GameEngine

```javascript
import { GameEngine } from './GameEngine.js';
```

### Step 2: Create Game Class

```javascript
export class MyGame {
  constructor(canvasId, config = {}) {
    this.engine = new GameEngine(canvasId, config);
    
    // Initialize game objects
    this.player = { x: 0, y: 0, vx: 0, vy: 0 };
    
    // Register sounds
    this.engine.registerSound("jump", {
      frequency: 500,
      duration: 100,
      gain: 0.05,
      type: "sine"
    });
    
    // Setup input
    this.setupInput();
  }
  
  setupInput() {
    this.engine.onKeyDown = (keyCode) => {
      if (keyCode === "Space") {
        this.player.vy = -300;
        this.engine.playSound("jump");
      }
    };
  }
  
  update(dt) {
    // Update game logic
    this.player.x += this.player.vx * dt;
    this.player.y += this.player.vy * dt;
    
    // Apply gravity
    this.player.vy += 980 * dt;
    
    // Collision detection
    if (this.player.y > this.engine.canvas.height) {
      this.player.y = this.engine.canvas.height;
      this.player.vy = 0;
    }
  }
  
  render(ctx) {
    this.engine.clear();
    this.engine.drawRect(
      this.player.x, this.player.y, 
      32, 32, 
      "#ff0000"
    );
  }
  
  start() {
    this.engine.start(
      (dt) => this.update(dt),
      (ctx) => this.render(ctx)
    );
  }
}
```

### Step 3: Create HTML File

```html
<!DOCTYPE html>
<html>
<head>
  <title>My Game</title>
</head>
<body>
  <canvas id="gameCanvas"></canvas>
  
  <script type="module">
    import { MyGame } from './js/MyGame.js';
    
    const game = new MyGame('gameCanvas');
    game.start();
  </script>
</body>
</html>
```

## Example Games Included

### 1. BreakoutGame.js
A complete Breakout/Arkanoid clone featuring:
- Multi-hit bricks
- Power-ups (Wide paddle, Slow ball)
- Combo system
- Progressive difficulty
- Mouse/keyboard controls

### 2. PongGame.js
Classic Pong implementation:
- Player vs AI
- Simple physics
- Score tracking
- Keyboard controls

## Best Practices

### 1. Time-Based Movement
Always multiply movement by `dt` (delta time):

```javascript
// GOOD
player.x += player.speed * dt;

// BAD - frame-dependent
player.x += player.speed;
```

### 2. Collision Detection
Use appropriate collision methods:

```javascript
// For rectangular objects
if (GameEngine.rectIntersects(player, enemy)) {
  handleCollision();
}

// For circular objects
if (GameEngine.circleIntersects(ball, bullet)) {
  handleHit();
}
```

### 3. Sound Effects
Register sounds once, play multiple times:

```javascript
// In constructor
this.engine.registerSound("hit", {...});

// In game loop
this.engine.playSound("hit");
```

### 4. State Management
Use clear game states:

```javascript
const STATES = {
  MENU: "menu",
  PLAYING: "playing",
  PAUSED: "paused",
  GAME_OVER: "gameover"
};

if (this.state === STATES.PLAYING) {
  // Update game logic
}
```

### 5. Configuration
Make game parameters configurable:

```javascript
constructor(canvasId, config = {}) {
  this.config = {
    playerSpeed: 300,
    gravity: 980,
    jumpForce: -400,
    ...config  // Allow overrides
  };
}
```

## Performance Tips

1. **Object Pooling**: Reuse objects instead of creating/destroying
2. **Efficient Rendering**: Only draw visible objects
3. **Collision Optimization**: Use spatial partitioning for many objects
4. **Delta Time Clamping**: Already handled by engine (prevents spiral of death)
5. **Canvas State**: Minimize save/restore operations

## Browser Compatibility

- **Chrome**: Full support
- **Firefox**: Full support
- **Safari**: Full support (requires user gesture for audio)
- **Edge**: Full support
- **Mobile**: Touch events supported via pointer API

## License

This code is open source and provided as-is for educational purposes.

## Contributing

To add features to GameEngine:

1. Keep the API simple and intuitive
2. Document all public methods
3. Maintain backward compatibility
4. Add examples for new features
5. Test across different browsers

## Support

For questions or issues, please refer to:
- Example games (BreakoutGame.js, PongGame.js)
- This documentation
- MDN Web Docs for Canvas/WebAudio APIs
