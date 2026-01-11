# Breakout Game

A modern implementation of the classic Breakout arcade game, built with HTML5 Canvas and JavaScript. This project showcases progressive game development with multiple versions, each adding new features and improvements.

## 🎮 Game Versions

This repository contains four different versions of the game, each building upon the previous one:

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

1. **Clone the repository**
   ```bash
   git clone https://github.com/SimedruF/Breakout-game.git
   cd Breakout-game
   ```

2. **Open any version in your browser**
   - Simply double-click on any `.html` file, or
   - Use a local web server for best results:
     ```bash
     python -m http.server 8000
     # Then open http://localhost:8000 in your browser
     ```

3. **Start playing!**
   - Choose the version you want to play
   - Press Space to begin
   - Break all bricks to advance to the next level

## 🎓 Learning Path

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

### Key Algorithms
- **Frame-based animation**: Using `requestAnimationFrame` for smooth 60 FPS gameplay
- **Delta time**: Time-based movement for consistent speed across devices
- **AABB collision detection**: Axis-Aligned Bounding Box for brick/paddle/ball collisions
- **Minimum penetration**: Determines bounce axis based on overlap distance

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
