import { GameEngine } from './GameEngine.js';

export class SnakeGame {
  constructor(canvasId, config = {}) {
    this.engine = new GameEngine(canvasId, {
      width: 600,
      height: 600,
      enableMouse: false,
      highScoreKey: 'snake_high_score_v1',
      ...config
    });

    // Grid configuration
    this.cols = 20;
    this.rows = 20;
    this.cellSize = this.engine.config.width / this.cols;

    // Game state
    this.gameState = {
      state: 'READY', // READY, PLAYING, PAUSED, GAMEOVER
      score: 0,
      snake: [],
      direction: { x: 1, y: 0 },
      nextDirection: { x: 1, y: 0 },
      food: null,
      moveTimer: 0,
      moveInterval: 150, // ms between moves
      minInterval: 60,   // fastest speed
    };

    // Colors
    this.colors = {
      bg: '#1a1a2e',
      grid: '#16213e',
      snakeHead: '#00e676',
      snakeBody: '#00c853',
      snakeTail: '#009624',
      food: '#ff1744',
      foodGlow: 'rgba(255, 23, 68, 0.3)',
      text: '#ffffff',
      textDim: 'rgba(255,255,255,0.6)',
      accent: '#ffd700',
    };

    // Register sounds
    this.engine.registerSound('eat', { frequency: 600, duration: 100, gain: 0.05, type: 'square' });
    this.engine.registerSound('turn', { frequency: 200, duration: 30, gain: 0.02, type: 'sine' });
    this.engine.registerSound('die', { frequency: 150, duration: 400, gain: 0.06, type: 'sawtooth' });
    this.engine.registerSound('start', { frequency: 440, duration: 150, gain: 0.04, type: 'triangle' });

    // Input handling
    this.engine.onKeyDown = (code) => this._handleKey(code);

    // Initialize
    this._resetGame();
  }

  _resetGame() {
    const gs = this.gameState;
    const midX = Math.floor(this.cols / 2);
    const midY = Math.floor(this.rows / 2);

    gs.snake = [
      { x: midX, y: midY },
      { x: midX - 1, y: midY },
      { x: midX - 2, y: midY },
    ];
    gs.direction = { x: 1, y: 0 };
    gs.nextDirection = { x: 1, y: 0 };
    gs.score = 0;
    gs.moveTimer = 0;
    gs.moveInterval = 150;
    gs.food = null;
    this._spawnFood();
  }

  _spawnFood() {
    const gs = this.gameState;
    const occupied = new Set(gs.snake.map(s => `${s.x},${s.y}`));
    const free = [];

    for (let x = 0; x < this.cols; x++) {
      for (let y = 0; y < this.rows; y++) {
        if (!occupied.has(`${x},${y}`)) {
          free.push({ x, y });
        }
      }
    }

    if (free.length > 0) {
      gs.food = free[GameEngine.randomInt(0, free.length - 1)];
    }
  }

  _handleKey(code) {
    const gs = this.gameState;

    if (code === 'KeyP' && gs.state === 'PLAYING') {
      this.engine.togglePause();
      gs.state = this.engine.state.paused ? 'PAUSED' : 'PLAYING';
      return;
    }

    if (code === 'KeyP' && gs.state === 'PAUSED') {
      this.engine.togglePause();
      gs.state = 'PLAYING';
      return;
    }

    if (code === 'KeyM') {
      this.engine.toggleMute();
      return;
    }

    if (code === 'Space') {
      if (gs.state === 'READY' || gs.state === 'GAMEOVER') {
        this._resetGame();
        gs.state = 'PLAYING';
        this.engine.state.paused = false;
        this.engine.playSound('start');
        return;
      }
    }

    // Direction changes (prevent 180° reversal)
    if (gs.state !== 'PLAYING' || this.engine.state.paused) return;

    const dir = gs.direction;
    if ((code === 'ArrowUp' || code === 'KeyW') && dir.y !== 1) {
      gs.nextDirection = { x: 0, y: -1 };
      this.engine.playSound('turn');
    } else if ((code === 'ArrowDown' || code === 'KeyS') && dir.y !== -1) {
      gs.nextDirection = { x: 0, y: 1 };
      this.engine.playSound('turn');
    } else if ((code === 'ArrowLeft' || code === 'KeyA') && dir.x !== 1) {
      gs.nextDirection = { x: -1, y: 0 };
      this.engine.playSound('turn');
    } else if ((code === 'ArrowRight' || code === 'KeyD') && dir.x !== -1) {
      gs.nextDirection = { x: 1, y: 0 };
      this.engine.playSound('turn');
    }
  }

  _updateGame(dt) {
    const gs = this.gameState;
    if (gs.state !== 'PLAYING') return;

    gs.moveTimer += dt * 1000;

    if (gs.moveTimer >= gs.moveInterval) {
      gs.moveTimer = 0;
      gs.direction = { ...gs.nextDirection };
      this._moveSnake();
    }
  }

  _moveSnake() {
    const gs = this.gameState;
    const head = gs.snake[0];
    const newHead = {
      x: head.x + gs.direction.x,
      y: head.y + gs.direction.y,
    };

    // Wall collision (wrap around)
    if (newHead.x < 0) newHead.x = this.cols - 1;
    if (newHead.x >= this.cols) newHead.x = 0;
    if (newHead.y < 0) newHead.y = this.rows - 1;
    if (newHead.y >= this.rows) newHead.y = 0;

    // Self collision
    for (const seg of gs.snake) {
      if (seg.x === newHead.x && seg.y === newHead.y) {
        gs.state = 'GAMEOVER';
        this.engine.playSound('die');
        this.engine.saveHighScore(gs.score);
        return;
      }
    }

    gs.snake.unshift(newHead);

    // Food collision
    if (gs.food && newHead.x === gs.food.x && newHead.y === gs.food.y) {
      gs.score += 10;
      this.engine.playSound('eat');
      this._spawnFood();

      // Speed up slightly every 5 food eaten
      if (gs.score % 50 === 0 && gs.moveInterval > gs.minInterval) {
        gs.moveInterval = Math.max(gs.minInterval, gs.moveInterval - 10);
      }
    } else {
      gs.snake.pop();
    }
  }

  _renderGame(ctx) {
    const gs = this.gameState;
    const w = this.engine.config.width;
    const h = this.engine.config.height;
    const cs = this.cellSize;

    // Background
    ctx.fillStyle = this.colors.bg;
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = this.colors.grid;
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= this.cols; x++) {
      ctx.beginPath();
      ctx.moveTo(x * cs, 0);
      ctx.lineTo(x * cs, h);
      ctx.stroke();
    }
    for (let y = 0; y <= this.rows; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * cs);
      ctx.lineTo(w, y * cs);
      ctx.stroke();
    }

    // Food
    if (gs.food) {
      // Glow
      ctx.fillStyle = this.colors.foodGlow;
      ctx.beginPath();
      ctx.arc(
        gs.food.x * cs + cs / 2,
        gs.food.y * cs + cs / 2,
        cs * 0.8, 0, Math.PI * 2
      );
      ctx.fill();

      // Food dot
      ctx.fillStyle = this.colors.food;
      ctx.beginPath();
      ctx.arc(
        gs.food.x * cs + cs / 2,
        gs.food.y * cs + cs / 2,
        cs * 0.4, 0, Math.PI * 2
      );
      ctx.fill();
    }

    // Snake
    const len = gs.snake.length;
    for (let i = 0; i < len; i++) {
      const seg = gs.snake[i];
      const t = i / Math.max(len - 1, 1); // 0 = head, 1 = tail

      if (i === 0) {
        ctx.fillStyle = this.colors.snakeHead;
      } else {
        // Gradient from body to tail
        const r = GameEngine.lerp(0, 0, t);
        const g = GameEngine.lerp(200, 150, t);
        const b = GameEngine.lerp(83, 36, t);
        ctx.fillStyle = `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
      }

      const padding = i === 0 ? 1 : 2;
      ctx.fillRect(
        seg.x * cs + padding,
        seg.y * cs + padding,
        cs - padding * 2,
        cs - padding * 2
      );

      // Head eyes
      if (i === 0) {
        ctx.fillStyle = '#000';
        const eyeSize = cs * 0.12;
        const eyeOffset = cs * 0.22;
        let ex1, ey1, ex2, ey2;
        const cx = seg.x * cs + cs / 2;
        const cy = seg.y * cs + cs / 2;

        if (gs.direction.x === 1) {
          ex1 = cx + eyeOffset; ey1 = cy - eyeOffset;
          ex2 = cx + eyeOffset; ey2 = cy + eyeOffset;
        } else if (gs.direction.x === -1) {
          ex1 = cx - eyeOffset; ey1 = cy - eyeOffset;
          ex2 = cx - eyeOffset; ey2 = cy + eyeOffset;
        } else if (gs.direction.y === -1) {
          ex1 = cx - eyeOffset; ey1 = cy - eyeOffset;
          ex2 = cx + eyeOffset; ey2 = cy - eyeOffset;
        } else {
          ex1 = cx - eyeOffset; ey1 = cy + eyeOffset;
          ex2 = cx + eyeOffset; ey2 = cy + eyeOffset;
        }

        ctx.beginPath();
        ctx.arc(ex1, ey1, eyeSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(ex2, ey2, eyeSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // HUD: Score & High Score
    ctx.fillStyle = this.colors.text;
    ctx.font = 'bold 18px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${gs.score}`, 10, 25);
    ctx.textAlign = 'right';
    ctx.fillText(`High: ${this.engine.highScore}`, w - 10, 25);

    // Mute indicator
    if (this.engine.state.muted) {
      ctx.textAlign = 'center';
      ctx.font = '14px "Segoe UI", sans-serif';
      ctx.fillStyle = this.colors.textDim;
      ctx.fillText('🔇 Muted', w / 2, 25);
    }

    // Overlays
    if (gs.state === 'READY') {
      this._drawOverlay(ctx, '🐍 SNAKE', 'Press SPACE to start', [
        '← → ↑ ↓  or  WASD — Move',
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

  _drawOverlay(ctx, title, subtitle, lines) {
    const w = this.engine.config.width;
    const h = this.engine.config.height;

    // Dim background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, w, h);

    // Title
    ctx.fillStyle = this.colors.accent;
    ctx.font = 'bold 48px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, w / 2, h / 2 - 60);

    // Subtitle
    ctx.fillStyle = this.colors.text;
    ctx.font = '22px "Segoe UI", sans-serif';
    ctx.fillText(subtitle, w / 2, h / 2 - 15);

    // Extra lines
    if (lines) {
      ctx.font = '16px "Segoe UI", sans-serif';
      ctx.fillStyle = this.colors.textDim;
      lines.forEach((line, i) => {
        ctx.fillText(line, w / 2, h / 2 + 25 + i * 28);
      });
    }
  }
}
