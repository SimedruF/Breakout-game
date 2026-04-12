import { GameEngine } from './GameEngine.js';
import { ParticleSystem, CameraShake, Trail, drawGlow, drawVignette } from './GraphicsEffects.js';

export class FroggerGame {
  constructor(canvasId, config = {}) {
    this.engine = new GameEngine(canvasId, {
      width: 640,
      height: 700,
      enableMouse: false,
      highScoreKey: 'frogger_high_score_v1',
      ...config
    });

    // Grid: 13 rows, 10 columns
    this.cols = 10;
    this.rows = 13;
    this.cellW = this.engine.config.width / this.cols;  // 64
    this.cellH = this.engine.config.height / this.rows;  // ~53.8

    // Row layout (bottom to top, index 0 = bottom):
    //  0: start (safe)
    //  1-5: road lanes
    //  6: median (safe)
    //  7-11: river lanes
    //  12: goal row
    this.laneTypes = [
      'safe',   // 0 - start
      'road',   // 1
      'road',   // 2
      'road',   // 3
      'road',   // 4
      'road',   // 5
      'safe',   // 6 - median
      'river',  // 7
      'river',  // 8
      'river',  // 9
      'river',  // 10
      'river',  // 11
      'goal',   // 12
    ];

    // Colors
    this.colors = {
      bg: '#1a1a2e',
      grass: '#2d5a27',
      grassLight: '#3a7a32',
      road: '#3a3a4a',
      roadLine: '#ffcc00',
      water: '#1a3a6a',
      waterLight: '#2255aa',
      median: '#2d5a27',
      goal: '#1a5a1a',
      goalSlot: '#0d3d0d',
      goalFilled: '#ffd700',
      frog: '#00e676',
      frogEye: '#ffffff',
      frogPupil: '#222222',
      log: '#8b5e3c',
      logLight: '#a0704a',
      turtle: '#2e7d32',
      turtleShell: '#1b5e20',
      car1: '#e53935',
      car2: '#1e88e5',
      car3: '#ff9800',
      truck: '#7b1fa2',
      bus: '#fdd835',
      text: '#ffffff',
      textDim: 'rgba(255,255,255,0.6)',
      accent: '#ffd700',
      hud: 'rgba(0,0,0,0.5)',
    };

    // Sounds
    this.engine.registerSound('hop', { frequency: 400, duration: 60, gain: 0.04, type: 'square' });
    this.engine.registerSound('plunk', { frequency: 150, duration: 300, gain: 0.06, type: 'sawtooth' });
    this.engine.registerSound('squash', { frequency: 100, duration: 200, gain: 0.06, type: 'sawtooth' });
    this.engine.registerSound('goal', { frequency: 800, duration: 200, gain: 0.05, type: 'triangle' });
    this.engine.registerSound('levelUp', { frequency: 1000, duration: 400, gain: 0.05, type: 'sine' });
    this.engine.registerSound('start', { frequency: 440, duration: 150, gain: 0.04, type: 'triangle' });

    // Effects
    this.particles = new ParticleSystem();
    this.camera = new CameraShake();
    this.frogTrail = new Trail(8);
    this.timeAccum = 0; // for animated glow

    // Input
    this.engine.onKeyDown = (code) => this._handleKey(code);

    // Game state
    this.gameState = {
      state: 'READY',
      score: 0,
      lives: 3,
      level: 1,
      frog: { col: 5, row: 0 },
      frogPixel: null, // smooth position for rendering
      frogMoving: false,
      moveAnim: 0,
      moveFrom: null,
      moveTo: null,
      lanes: [],
      goalSlots: [],
      goalsFilled: 0,
      timer: 30,
      maxTimer: 30,
      deathAnim: 0,
      deathType: null, // 'car' or 'water'
    };

    this._initLevel();
  }

  _initLevel() {
    const gs = this.gameState;
    const lvl = gs.level;

    // Speed multiplier based on level
    const speedMult = 1 + (lvl - 1) * 0.15;

    // Define lanes (index 0 = bottom row)
    gs.lanes = [];
    for (let i = 0; i < this.rows; i++) {
      const type = this.laneTypes[i];
      if (type === 'road') {
        gs.lanes[i] = this._createRoadLane(i, speedMult);
      } else if (type === 'river') {
        gs.lanes[i] = this._createRiverLane(i, speedMult);
      } else {
        gs.lanes[i] = { type, objects: [] };
      }
    }

    // Goal slots (5 evenly spaced)
    gs.goalSlots = [];
    for (let i = 0; i < 5; i++) {
      gs.goalSlots.push({ col: i * 2 + 0.5, filled: false });
    }
    gs.goalsFilled = 0;

    // Reset frog position
    gs.frog = { col: 4.5, row: 0 };
    gs.frogPixel = null;
    gs.frogMoving = false;
    gs.timer = gs.maxTimer;
    gs.deathAnim = 0;
    gs.deathType = null;
  }

  _createRoadLane(rowIndex, speedMult) {
    const dir = rowIndex % 2 === 0 ? 1 : -1;
    const baseSpeed = (0.8 + Math.random() * 0.6) * speedMult;
    const carStyles = ['car1', 'car2', 'car3', 'truck', 'bus'];
    const style = carStyles[rowIndex % carStyles.length];
    const carLen = (style === 'truck' || style === 'bus') ? 2 : 1;
    const count = style === 'truck' || style === 'bus' ? 2 : 3;
    const spacing = this.cols / count;

    const objects = [];
    for (let i = 0; i < count; i++) {
      objects.push({
        x: i * spacing + Math.random() * 1.5,
        len: carLen,
        style,
      });
    }

    return { type: 'road', dir, speed: baseSpeed, objects };
  }

  _createRiverLane(rowIndex, speedMult) {
    const dir = rowIndex % 2 === 0 ? 1 : -1;
    const baseSpeed = (0.5 + Math.random() * 0.5) * speedMult;
    const isLog = rowIndex % 2 === 0;
    const objLen = isLog ? (2 + Math.floor(Math.random() * 2)) : 2;
    const count = isLog ? 2 : 3;
    const spacing = this.cols / count;

    const objects = [];
    for (let i = 0; i < count; i++) {
      objects.push({
        x: i * spacing + Math.random() * 1,
        len: objLen,
        style: isLog ? 'log' : 'turtle',
      });
    }

    return { type: 'river', dir, speed: baseSpeed, objects };
  }

  _handleKey(code) {
    const gs = this.gameState;

    if (code === 'KeyP' && (gs.state === 'PLAYING' || gs.state === 'PAUSED')) {
      this.engine.togglePause();
      gs.state = this.engine.state.paused ? 'PAUSED' : 'PLAYING';
      return;
    }

    if (code === 'KeyM') {
      this.engine.toggleMute();
      return;
    }

    if (code === 'Space') {
      if (gs.state === 'READY' || gs.state === 'GAMEOVER') {
        gs.score = 0;
        gs.lives = 3;
        gs.level = 1;
        this._initLevel();
        gs.state = 'PLAYING';
        this.engine.state.paused = false;
        this.engine.playSound('start');
        return;
      }
    }

    if (gs.state !== 'PLAYING' || this.engine.state.paused || gs.frogMoving || gs.deathAnim > 0) return;

    let dc = 0, dr = 0;
    if (code === 'ArrowUp' || code === 'KeyW') dr = 1;
    else if (code === 'ArrowDown' || code === 'KeyS') dr = -1;
    else if (code === 'ArrowLeft' || code === 'KeyA') dc = -1;
    else if (code === 'ArrowRight' || code === 'KeyD') dc = 1;
    else return;

    const newCol = gs.frog.col + dc;
    const newRow = gs.frog.row + dr;

    if (newCol < 0 || newCol >= this.cols || newRow < 0 || newRow >= this.rows) return;

    // Start hop animation
    gs.moveFrom = { col: gs.frog.col, row: gs.frog.row };
    gs.moveTo = { col: newCol, row: newRow };
    gs.frogMoving = true;
    gs.moveAnim = 0;
    this.engine.playSound('hop');
  }

  _updateGame(dt) {
    const gs = this.gameState;
    if (gs.state !== 'PLAYING') return;

    // Death animation
    if (gs.deathAnim > 0) {
      gs.deathAnim -= dt;
      if (gs.deathAnim <= 0) {
        gs.deathAnim = 0;
        gs.deathType = null;
        gs.lives--;
        if (gs.lives <= 0) {
          gs.state = 'GAMEOVER';
          this.engine.saveHighScore(gs.score);
        } else {
          gs.frog = { col: 4.5, row: 0 };
          gs.frogPixel = null;
          gs.frogMoving = false;
          gs.timer = gs.maxTimer;
        }
      }
      return;
    }

    // Hop animation
    if (gs.frogMoving) {
      gs.moveAnim += dt * 8; // hop takes ~0.125s
      if (gs.moveAnim >= 1) {
        gs.frog.col = gs.moveTo.col;
        gs.frog.row = gs.moveTo.row;
        gs.frogMoving = false;
        gs.frogPixel = null;

        // Score for moving forward
        if (gs.moveTo.row > gs.moveFrom.row) {
          gs.score += 10;
        }

        // Hop dust particles
        const landX = gs.frog.col * this.cellW + this.cellW / 2;
        const landY = this.engine.config.height - (gs.frog.row + 1) * this.cellH + this.cellH / 2;
        this.particles.emit(landX, landY + 8, 4, 'rgba(255,255,255,0.5)', {
          vx: 0, vy: 0, gravity: 0.05, friction: 0.9, size: 2, life: 0.3
        });

        this._checkFrogPosition();
      }
      return;
    }

    // Update effects
    this.particles.update(dt);
    this.camera.update(dt);
    this.timeAccum += dt;

    // Frog trail
    if (!gs.frogMoving) {
      const trailX = gs.frog.col * this.cellW + this.cellW / 2;
      const trailY = this.engine.config.height - (gs.frog.row + 1) * this.cellH + this.cellH / 2;
      this.frogTrail.add(trailX, trailY);
    }

    // Timer countdown
    gs.timer -= dt;
    if (gs.timer <= 0) {
      this._killFrog('water');
      return;
    }

    // Move lane objects
    for (let i = 0; i < this.rows; i++) {
      const lane = gs.lanes[i];
      if (!lane || (lane.type !== 'road' && lane.type !== 'river')) continue;

      for (const obj of lane.objects) {
        obj.x += lane.dir * lane.speed * dt;

        // Wrap around
        if (lane.dir > 0 && obj.x > this.cols + 1) {
          obj.x = -obj.len - 1;
        } else if (lane.dir < 0 && obj.x + obj.len < -1) {
          obj.x = this.cols + 1;
        }
      }
    }

    // Frog on river — ride logs/turtles
    const frogRow = gs.frog.row;
    if (this.laneTypes[frogRow] === 'river') {
      const lane = gs.lanes[frogRow];
      let onPlatform = false;

      for (const obj of lane.objects) {
        // AABB: frog [col, col+1] vs platform [x, x+len]
        // Extend platform by 0.15 each side for generous landing
        if (gs.frog.col > obj.x - 1.15 && gs.frog.col < obj.x + obj.len + 0.15) {
          onPlatform = true;
          gs.frog.col += lane.dir * lane.speed * dt;
          break;
        }
      }

      if (!onPlatform) {
        this._killFrog('water');
        return;
      }

      // Drifted off screen
      if (gs.frog.col < -0.5 || gs.frog.col >= this.cols + 0.5) {
        this._killFrog('water');
        return;
      }
    }

    // Frog on road — check car collision
    // AABB: frog occupies [col, col+1], car occupies [x, x+len]
    // Shrink both by 0.15 for player-forgiving hitbox
    if (this.laneTypes[frogRow] === 'road') {
      const lane = gs.lanes[frogRow];
      for (const obj of lane.objects) {
        if (gs.frog.col > obj.x - 0.7 && gs.frog.col < obj.x + obj.len - 0.3) {
          this._killFrog('car');
          return;
        }
      }
    }
  }

  _checkFrogPosition() {
    const gs = this.gameState;

    // Reached goal row
    if (gs.frog.row === this.rows - 1) {
      // Check if landed on a goal slot
      let landed = false;
      for (const slot of gs.goalSlots) {
        if (!slot.filled && Math.abs(gs.frog.col - slot.col) < 1) {
          slot.filled = true;
          gs.goalsFilled++;
          gs.score += 50 + Math.floor(gs.timer) * 5;
          this.engine.playSound('goal');
          // Goal sparkle effect
          const gx = slot.col * this.cellW + this.cellW / 2;
          const gy = this.engine.config.height - this.rows * this.cellH + this.cellH / 2;
          this.particles.createSparkles(gx, gy, 20);
          this.camera.trigger(4, 0.15);
          landed = true;
          break;
        }
      }

      if (!landed) {
        this._killFrog('car');
        return;
      }

      // All goals filled — next level
      if (gs.goalsFilled >= 5) {
        gs.level++;
        gs.score += 1000;
        this.engine.playSound('levelUp');
        // Level up celebration
        for (let i = 0; i < 5; i++) {
          const sx = gs.goalSlots[i].col * this.cellW + this.cellW / 2;
          const sy = this.engine.config.height - this.rows * this.cellH + this.cellH / 2;
          this.particles.createSparkles(sx, sy, 15);
        }
        this.camera.trigger(6, 0.25);
        this._initLevel();
      } else {
        // Reset frog to start
        gs.frog = { col: 4.5, row: 0 };
        gs.frogPixel = null;
        gs.timer = gs.maxTimer;
      }
    }
  }

  _killFrog(type) {
    const gs = this.gameState;
    gs.deathAnim = 0.8;
    gs.deathType = type;
    this.engine.playSound(type === 'water' ? 'plunk' : 'squash');

    // Effects
    const fx = gs.frog.col * this.cellW + this.cellW / 2;
    const fy = this.engine.config.height - (gs.frog.row + 1) * this.cellH + this.cellH / 2;
    if (type === 'water') {
      this.particles.emit(fx, fy, 15, '#4fc3f7', { gravity: 0.05, friction: 0.96, size: 4, life: 0.8 });
      this.particles.emit(fx, fy, 10, '#81d4fa', { gravity: -0.1, friction: 0.97, size: 2, life: 0.6 });
    } else {
      this.particles.createExplosion(fx, fy, '#ff5252', 20);
      this.particles.emit(fx, fy, 8, '#ffab40', { gravity: 0.3, friction: 0.92, size: 3, life: 0.6 });
    }
    this.camera.trigger(10, 0.3);
    this.frogTrail.clear();
  }

  _renderGame(ctx) {
    const gs = this.gameState;
    const w = this.engine.config.width;
    const h = this.engine.config.height;
    const cw = this.cellW;
    const ch = this.cellH;

    // Background
    ctx.fillStyle = this.colors.bg;
    ctx.fillRect(0, 0, w, h);

    // Apply camera shake
    const shakeOffset = this.camera.getOffset();
    ctx.save();
    ctx.translate(shakeOffset.x, shakeOffset.y);

    // Draw lanes (bottom to top)
    for (let r = 0; r < this.rows; r++) {
      const y = h - (r + 1) * ch;
      const type = this.laneTypes[r];

      // Lane background
      if (type === 'safe' || type === 'goal') {
        ctx.fillStyle = this.colors.grass;
        ctx.fillRect(0, y, w, ch);
        // Grass pattern
        ctx.fillStyle = this.colors.grassLight;
        for (let i = 0; i < 20; i++) {
          const gx = (i * 37 + r * 13) % w;
          const gy = y + (i * 17 + r * 7) % ch;
          ctx.fillRect(gx, gy, 2, 4);
        }
      } else if (type === 'road') {
        ctx.fillStyle = this.colors.road;
        ctx.fillRect(0, y, w, ch);
        // Road dashes
        ctx.strokeStyle = this.colors.roadLine;
        ctx.lineWidth = 1;
        ctx.setLineDash([12, 8]);
        ctx.beginPath();
        ctx.moveTo(0, y + ch / 2);
        ctx.lineTo(w, y + ch / 2);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (type === 'river') {
        ctx.fillStyle = this.colors.water;
        ctx.fillRect(0, y, w, ch);
        // Water ripples
        ctx.strokeStyle = this.colors.waterLight;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.3;
        for (let i = 0; i < 6; i++) {
          const rx = (i * 110 + r * 30 + performance.now() * 0.02 * (r % 2 === 0 ? 1 : -1)) % (w + 40) - 20;
          ctx.beginPath();
          ctx.moveTo(rx, y + ch * 0.3);
          ctx.quadraticCurveTo(rx + 15, y + ch * 0.15, rx + 30, y + ch * 0.3);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }

      // Goal slots
      if (type === 'goal') {
        for (const slot of gs.goalSlots) {
          const sx = slot.col * cw;
          if (slot.filled) {
            // Filled goal glow
            drawGlow(ctx, sx + cw / 2, y + ch / 2, ch * 0.7, 'rgba(255, 215, 0', 0.4);
            ctx.fillStyle = this.colors.goalFilled;
            ctx.beginPath();
            ctx.arc(sx + cw / 2, y + ch / 2, ch * 0.35, 0, Math.PI * 2);
            ctx.fill();
          } else {
            // Pulsing empty goal slot
            const pulse = 0.8 + Math.sin(this.timeAccum * 3) * 0.2;
            ctx.fillStyle = this.colors.goalSlot;
            ctx.fillRect(sx + 4, y + 4, cw - 8, ch - 8);
            ctx.strokeStyle = this.colors.accent;
            ctx.lineWidth = 1.5 * pulse;
            ctx.strokeRect(sx + 6, y + 6, cw - 12, ch - 12);
            // Gentle glow on empty slot
            drawGlow(ctx, sx + cw / 2, y + ch / 2, ch * 0.5, 'rgba(255, 215, 0', 0.1 * pulse);
          }
        }
      }

      // Lane objects
      const lane = gs.lanes[r];
      if (!lane) continue;

      for (const obj of lane.objects) {
        const ox = obj.x * cw;
        const ow = obj.len * cw;
        const oy = y;

        if (lane.type === 'road') {
          this._drawVehicle(ctx, ox, oy, ow, ch, obj.style, lane.dir);
        } else if (lane.type === 'river') {
          this._drawPlatform(ctx, ox, oy, ow, ch, obj.style);
        }
      }
    }

    // Frog trail
    this.frogTrail.draw(ctx, (ctx, seg, idx) => {
      ctx.fillStyle = `rgba(0, 230, 118, ${0.15})`;
      ctx.beginPath();
      ctx.arc(seg.x, seg.y, 6, 0, Math.PI * 2);
      ctx.fill();
    });

    // Frog
    if (gs.deathAnim > 0) {
      this._drawDeathAnim(ctx, gs, ch, cw);
    } else {
      let fx, fy;
      if (gs.frogMoving) {
        const t = Math.min(gs.moveAnim, 1);
        const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        fx = GameEngine.lerp(gs.moveFrom.col, gs.moveTo.col, eased) * cw;
        fy = h - GameEngine.lerp(gs.moveFrom.row + 1, gs.moveTo.row + 1, eased) * ch;
        // Add trail during hop
        this.frogTrail.add(fx + cw / 2, fy + ch / 2);
      } else {
        fx = gs.frog.col * cw;
        fy = h - (gs.frog.row + 1) * ch;
      }
      this._drawFrog(ctx, fx, fy, cw, ch);
    }

    // Particles
    this.particles.draw(ctx);

    // End camera shake transform
    ctx.restore();

    // Vignette (outside shake so it doesn't jitter)
    drawVignette(ctx, w, h, 0.25);

    // HUD
    this._drawHUD(ctx, w, h);

    // Overlays
    if (gs.state === 'READY') {
      this._drawOverlay(ctx, '🐸 FROGGER', 'Press SPACE to start', [
        '← → ↑ ↓  or  WASD — Hop',
        'Cross roads and rivers to reach the goals!',
        'P — Pause   M — Mute',
      ]);
    } else if (gs.state === 'PAUSED') {
      this._drawOverlay(ctx, '⏸ PAUSED', 'Press P to resume');
    } else if (gs.state === 'GAMEOVER') {
      this._drawOverlay(ctx, '💀 GAME OVER', `Score: ${gs.score}`, [
        gs.score >= this.engine.highScore ? '🏆 New High Score!' : `Best: ${this.engine.highScore}`,
        'Press SPACE to play again',
      ]);
    }
  }

  _drawVehicle(ctx, x, y, w, h, style, dir) {
    const pad = 4;
    const color = this.colors[style] || this.colors.car1;

    // Body
    ctx.fillStyle = color;
    const radius = 6;
    const bx = x + pad;
    const by = y + pad;
    const bw = w - pad * 2;
    const bh = h - pad * 2;

    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, radius);
    ctx.fill();

    // Highlight stripe
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(bx + 3, by + 2, bw - 6, bh * 0.3);

    // Headlights
    ctx.fillStyle = '#ffffaa';
    const hlSize = 4;
    if (dir > 0) {
      ctx.fillRect(bx + bw - hlSize - 2, by + 5, hlSize, hlSize);
      ctx.fillRect(bx + bw - hlSize - 2, by + bh - 5 - hlSize, hlSize, hlSize);
    } else {
      ctx.fillRect(bx + 2, by + 5, hlSize, hlSize);
      ctx.fillRect(bx + 2, by + bh - 5 - hlSize, hlSize, hlSize);
    }

    // Windows
    ctx.fillStyle = 'rgba(100,200,255,0.5)';
    if (style === 'truck' || style === 'bus') {
      for (let i = 0; i < Math.floor(bw / 20); i++) {
        ctx.fillRect(bx + 10 + i * 20, by + bh * 0.35, 12, bh * 0.3);
      }
    } else {
      ctx.fillRect(bx + bw * 0.25, by + bh * 0.25, bw * 0.5, bh * 0.5);
    }
  }

  _drawPlatform(ctx, x, y, w, h, style) {
    const pad = 3;

    if (style === 'log') {
      // Log body
      ctx.fillStyle = this.colors.log;
      ctx.beginPath();
      ctx.roundRect(x + pad, y + pad + 4, w - pad * 2, h - pad * 2 - 8, 8);
      ctx.fill();

      // Wood grain
      ctx.strokeStyle = this.colors.logLight;
      ctx.lineWidth = 1;
      for (let i = 0; i < Math.ceil(w / 18); i++) {
        const gx = x + pad + 8 + i * 18;
        ctx.beginPath();
        ctx.arc(gx, y + h / 2, 5, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Highlight
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fillRect(x + pad + 2, y + pad + 5, w - pad * 2 - 4, (h - pad * 2 - 8) * 0.3);
    } else {
      // Turtle
      const turtleCount = Math.floor(w / this.cellW);
      const tw = this.cellW - pad * 2;
      for (let i = 0; i < turtleCount; i++) {
        const tx = x + i * this.cellW + pad;
        // Shell
        ctx.fillStyle = this.colors.turtleShell;
        ctx.beginPath();
        ctx.ellipse(tx + tw / 2, y + h / 2, tw * 0.4, h * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
        // Shell pattern
        ctx.strokeStyle = this.colors.turtle;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(tx + tw / 2, y + h / 2, tw * 0.25, h * 0.2, 0, 0, Math.PI * 2);
        ctx.stroke();
        // Head
        ctx.fillStyle = this.colors.turtle;
        ctx.beginPath();
        ctx.arc(tx + tw * 0.8, y + h / 2, h * 0.12, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  _drawFrog(ctx, x, y, cw, ch) {
    const cx = x + cw / 2;
    const cy = y + ch / 2;
    const size = Math.min(cw, ch) * 0.4;

    // Body glow
    ctx.fillStyle = 'rgba(0, 230, 118, 0.2)';
    ctx.beginPath();
    ctx.arc(cx, cy, size * 1.4, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = this.colors.frog;
    ctx.beginPath();
    ctx.ellipse(cx, cy, size * 0.9, size, 0, 0, Math.PI * 2);
    ctx.fill();

    // Darker belly
    ctx.fillStyle = 'rgba(0,180,80,0.6)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + size * 0.15, size * 0.55, size * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    const eyeR = size * 0.22;
    const eyeOffX = size * 0.45;
    const eyeOffY = -size * 0.45;

    // Left eye
    ctx.fillStyle = this.colors.frogEye;
    ctx.beginPath();
    ctx.arc(cx - eyeOffX, cy + eyeOffY, eyeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = this.colors.frogPupil;
    ctx.beginPath();
    ctx.arc(cx - eyeOffX, cy + eyeOffY, eyeR * 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Right eye
    ctx.fillStyle = this.colors.frogEye;
    ctx.beginPath();
    ctx.arc(cx + eyeOffX, cy + eyeOffY, eyeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = this.colors.frogPupil;
    ctx.beginPath();
    ctx.arc(cx + eyeOffX, cy + eyeOffY, eyeR * 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Legs (small bumps)
    ctx.fillStyle = '#00c853';
    // Back legs
    ctx.beginPath();
    ctx.ellipse(cx - size * 0.7, cy + size * 0.5, size * 0.25, size * 0.15, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + size * 0.7, cy + size * 0.5, size * 0.25, size * 0.15, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawDeathAnim(ctx, gs, ch, cw) {
    const fx = gs.frog.col * cw;
    const fy = this.engine.config.height - (gs.frog.row + 1) * ch;
    const cx = fx + cw / 2;
    const cy = fy + ch / 2;
    const t = gs.deathAnim / 0.8; // 1 → 0

    if (gs.deathType === 'water') {
      // Ripple rings expanding
      const rings = 3;
      for (let i = 0; i < rings; i++) {
        const radius = (1 - t) * 30 + i * 12;
        ctx.strokeStyle = `rgba(100,180,255,${t * 0.6})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else {
      // Splat effect
      const particles = 8;
      for (let i = 0; i < particles; i++) {
        const angle = (i / particles) * Math.PI * 2;
        const dist = (1 - t) * 25;
        const px = cx + Math.cos(angle) * dist;
        const py = cy + Math.sin(angle) * dist;
        ctx.fillStyle = `rgba(255,80,80,${t})`;
        ctx.beginPath();
        ctx.arc(px, py, 3 + t * 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  _drawHUD(ctx, w, h) {
    const gs = this.gameState;

    // Top bar
    ctx.fillStyle = this.colors.hud;
    ctx.fillRect(0, h - 28, w, 28);

    ctx.font = 'bold 16px "Segoe UI", sans-serif';

    // Score
    ctx.fillStyle = this.colors.text;
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${gs.score}`, 10, h - 8);

    // Lives
    ctx.textAlign = 'center';
    let livesStr = '';
    for (let i = 0; i < gs.lives; i++) livesStr += '🐸 ';
    ctx.fillText(livesStr.trim(), w / 2, h - 8);

    // Level
    ctx.fillStyle = this.colors.accent;
    ctx.textAlign = 'center';
    ctx.fillText(`Lv.${gs.level}`, w / 2 + 80, h - 8);

    // Timer bar
    ctx.textAlign = 'right';
    ctx.fillStyle = this.colors.text;
    ctx.font = '14px "Segoe UI", sans-serif';
    ctx.fillText(`Time: ${Math.ceil(gs.timer)}`, w - 10, h - 8);

    // Timer bar visual
    const barW = 100;
    const barH = 6;
    const barX = w - barW - 50;
    const barY = h - 18;
    const pct = Math.max(0, gs.timer / gs.maxTimer);
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = pct > 0.3 ? '#4caf50' : '#f44336';
    ctx.fillRect(barX, barY, barW * pct, barH);

    // High score
    ctx.fillStyle = this.colors.textDim;
    ctx.font = '12px "Segoe UI", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`High: ${this.engine.highScore}`, w - 10, 18);

    // Mute indicator
    if (this.engine.state.muted) {
      ctx.textAlign = 'left';
      ctx.fillText('🔇 Muted', 10, 18);
    }
  }

  _drawOverlay(ctx, title, subtitle, lines) {
    const w = this.engine.config.width;
    const h = this.engine.config.height;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = this.colors.accent;
    ctx.font = 'bold 48px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, w / 2, h / 2 - 70);

    ctx.fillStyle = this.colors.text;
    ctx.font = '22px "Segoe UI", sans-serif';
    ctx.fillText(subtitle, w / 2, h / 2 - 20);

    if (lines) {
      ctx.font = '16px "Segoe UI", sans-serif';
      ctx.fillStyle = this.colors.textDim;
      lines.forEach((line, i) => {
        ctx.fillText(line, w / 2, h / 2 + 20 + i * 28);
      });
    }
  }
}
