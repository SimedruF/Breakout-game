# Breakout Game

A modern implementation of the classic Breakout arcade game, built with HTML5 Canvas and JavaScript. This project showcases progressive game development with multiple versions, each adding new features and improvements.

## 🎮 Game Versions

This repository contains both **standalone** and **modular** versions of the game:

### Modular Version (Recommended for Developers)

**New!** A fully modular implementation using reusable components:

- **[GameEngine.js](js/GameEngine.js)** - Reusable game engine for any arcade game
- **[BreakoutGame.js](js/BreakoutGame.js)** - Breakout implementation using the engine
- **[PongGame.js](js/PongGame.js)** - Bonus Pong game using the same engine
- **[index.html](index.html)** - Modular Breakout demo
- **[pong.html](pong.html)** - Modular Pong demo
- **[GAME_ENGINE_DOCS.md](GAME_ENGINE_DOCS.md)** - Complete API documentation

**Why use the modular version?**
- Reusable code across multiple games
- Clean separation of concerns
- Easy to extend and customize
- Well-documented API
- ES6 modules

See **[GAME_ENGINE_DOCS.md](GAME_ENGINE_DOCS.md)** for how to create your own games using the engine!

---

### Standalone Versions

Four progressive versions, each building upon the previous one:

### 1. **breakout.html** - Basic Version
The foundation of the game with core mechanics:
- Paddle control using arrow keys
- Ball physics with wall collisions
- Brick collision detection
- Lives system
- Score tracking
- Progressive levels with increasing difficulty

### 2. **breakout_pause_mouse.html** - Enhanced Controls
Adds improved input methods:
- **Mouse/Pointer control**: Move the paddle by moving your cursor over the canvas
- **Pause functionality**: Press `P` to pause/resume the game
- Arrow keys remain available as fallback
- Pause overlay with instructions

### 3. **breakout_powerups.html** - Power-ups Edition
Introduces power-up system:
- **WIDE** power-up: Increases paddle width by 50% for 10 seconds
- **SLOW** power-up: Reduces ball speed by 25% for 8 seconds
- 18% chance for power-ups to drop when breaking bricks
- Visual indicators for active effects
- All controls from previous version included

### 4. **breakout_next.html** - Ultimate Edition
The most complete version with all features:
- **Multi-hit bricks**: Some bricks require 2 hits to destroy (indicated by HP bar)
- **Combo system**: Chain brick destructions for multiplier bonuses (up to 5x)
- **High score**: Persistent high score saved in localStorage
- **Sound effects**: Minimalist WebAudio beeps for game events
- **3D visual effects**: Enhanced graphics with shadows, gradients, and highlights
- **Mute option**: Press `M` to toggle sound on/off
- All power-ups and controls from previous versions

## 🕹️ Controls

### Keyboard
- **Arrow Left/Right**: Move paddle
- **Space**: Launch ball / Start level / Restart game
- **P**: Pause/Resume (versions 2-4)
- **M**: Mute/Unmute sound (version 4)

### Mouse
- **Move cursor over canvas**: Control paddle position (versions 2-4)
- Paddle follows mouse X position, centered on cursor

## 🎯 Game Features

### Core Mechanics
- **Progressive difficulty**: Each level increases ball speed by 12% and adds more brick rows
- **Bounce physics**: Ball angle depends on where it hits the paddle (up to 60° from vertical)
- **Brick patterns**: Increasing complexity from 6 to 10 rows across levels
- **Smart collision detection**: Minimum penetration algorithm for stable physics

### Power-ups (versions 3-4)
- **WIDE (W)**: Expands paddle width for easier ball catching
- **SLOW (S)**: Reduces ball speed for better control
- Power-ups fall from destroyed bricks and must be caught with the paddle

### Visual Design
- Clean, minimalist dark theme
- Color-coded brick rows (version 4 has 8 different colors)
- 3D effects with shadows and highlights (version 4)
- Smooth animations and responsive controls

### Audio (version 4)
- Wall bounce sounds
- Paddle hit sounds
- Brick destruction sounds (different for 1-hit vs 2-hit)
- Power-up collection sound
- Life lost sound
- Level win sound

## 🚀 Getting Started

### For Players

1. **Clone the repository**
   ```bash
   git clone https://github.com/SimedruF/Breakout-game.git
   cd Breakout-game
   ```

2. **Start a local server** (required for modular version)
   ```bash
   python -m http.server 8000
   # or
   python3 -m http.server 8000
   # or use any other local server
   ```

3. **Open in browser**
   - Modular Breakout: `http://localhost:8000/index.html`
   - Modular Pong: `http://localhost:8000/pong.html`
   - Standalone versions: `http://localhost:8000/breakout_next.html` (or any other `.html` file)

### For Game Development Beginners

If you're learning game development, I recommend this progression:

**Standalone Versions** (Learn game mechanics):
1. **breakout.html** - Core game mechanics and physics
2. **breakout_pause_mouse.html** - Enhanced input handling
3. **breakout_powerups.html** - Game object management
4. **breakout_next.html** - Advanced features and polish

**Modular Version** (Learn software architecture):
5. **GameEngine.js** - Study the reusable engine architecture
6. **PongGame.js** - See how to use the engine for a simple game
7. **BreakoutGame.js** - See how to use the engine for a complex game
8. **Create your own game** - Use the engine to build something new!

### Why Learn Both?

- **Standalone versions**: Understand game mechanics without abstraction
- **Modular version**: Learn professional code organization and reusability
- **Progression**: From monolithic to modular architecture

Want to create your own game using the engine?

1. **Start with quick examples**: [EXAMPLES.md](EXAMPLES.md) - 4 copy-paste ready game examples
2. **Read the API documentation**: [GAME_ENGINE_DOCS.md](GAME_ENGINE_DOCS.md) - Complete reference
3. **Study the full implementations**: 
   - [BreakoutGame.js](js/BreakoutGame.js) - Complex game with power-ups and combos
   - [PongGame.js](js/PongGame.js) - Simple game with AI opponent
4. **Create your own game**:
   ```javascript
   import { GameEngine } from './js/GameEngine.js';
   
   export class MyGame {
     constructor(canvasId) {
       this.engine = new GameEngine(canvasId);
       // Your game setup...
     }
     
     update(dt) { /* Game logic */ }
     render(ctx) { /* Drawing */ }
     
     start() {
       this.engine.start(
         (dt) => this.update(dt),
         (ctx) => this.render(ctx)
       );
     }
   }
   ```

See the **[Developer Documentation](GAME_ENGINE_DOCS (ES6 modules in modular version)
- **Web Audio API**: For sound effects
- **localStorage**: For high score persistence

### Modular Architecture

The modular version uses modern JavaScript patterns:

```
GameEngine.js (Core)
├── Canvas management
├── Input handling (keyboard, mouse, touch)
├── Game loop with delta time
├── Audio system (WebAudio API)
├── Collision detection (AABB, Circle-Rect, etc.)
├── Utility functions
└── Rendering helpers

BreakoutGame.js / PongGame.js (Implementation)
├── Game-specific logic
├── Custom rendering
├── Unique mechanics
└── Uses GameEngine API
```

**Key Features:**
- ES6 module system for clean imports
- Callback-based architecture for flexibility  
- Static utility methods for common operations
- Configurable via constructor options
- Easily extensible for new game types

If you're learning game development, I recommend exploring the versions in order:

1. Start with **breakout.html** to understand core game mechanics
2. Move to **breakout_pause_mouse.html** to see enhanced input handling
3. Explore **breakout_powerups.html** for game object management (power-ups)
4. Study **breakout_next.html** for advanced features and polish

## 💻 Technical Details

### Built With
- **HTML5 Canvas**: For rendering
- **Vanilla JavaScript**: No frameworks or libraries
- **Web Audio API**: For sound effects (version 4)
- **localStorage**: For high score persistence (version 4)
### Modular Version
Pass configuration to the game constructor:

```javascript
const game = new BreakoutGame('canvas', {
  startingLives: 5,          // Start with 5 lives
  powerupChance: 0.25,       // 25% power-up drop rate
  baseBallSpeed: 400,        // Faster ball
  aiDifficulty: 0.9          // (Pong) Harder AI
});
```

See [GAME_ENGINE_DOCS.md](GAME_ENGINE_DOCS.md) for all configuration options.

### Standalone Versions
Edit constants in the JavaScript:
- **Ball speed**: `BASE_BALL_SPEED` and `SPEED_PER_LEVEL`
- **Power-up chances**: `POWERUP_CHANCE`
- **Brick patterns**: `buildBricks()` function
- **Colors**: Color arrays and CSS
- **Sound effects**: Frequencies in `sfxrlap distance

### Performance
- Efficient rendering with single canvas context
- Delta time clamping to prevent physics glitches during tab switching
- Smart collision detection (one brick per frame for stability)

## 📝 Code Structure

Each version follows a clean, modular structure:
```javascript
// Configuration constants
// Game state objects
// Helper functions
// Initialization
// Input listeners
// Update loop (game logic)
// Render loop (drawing)
// Animation loop
```

## 🎨 Customization

Feel free to modify:
- **Ball speed**: Adjust `BASE_BALL_SPEED` and `SPEED_PER_LEVEL`
- **Power-up chances**: Change `POWERUP_CHANCE` percentage
- **Brick patterns**: Modify `buildBricks()` function
- **Colors**: Update color arrays and CSS styles
- **Sound effects**: Adjust frequencies and durations in `beep()` function

## 🐛 Known Limitations

- Sound requires user interaction to start (browser autoplay policy)
- High score is stored per-browser (not synced across devices)
- Mobile touch controls use pointer events (may vary by device)

## 📄 License

This project is open source and available for educational purposes. Feel free to use, modify, and learn from the code.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the issues page or submit a pull request.

## 👨‍💻 Author

**SimedruF**
- GitHub: [@SimedruF](https://github.com/SimedruF)

## 🙏 Acknowledgments

- Inspired by the classic Atari Breakout arcade game
- Built as a learning project to demonstrate progressive game development

---

**Enjoy the game! 🎮**
