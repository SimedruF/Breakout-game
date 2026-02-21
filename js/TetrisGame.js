import { GameEngine } from './GameEngine.js';

export class TetrisGame {
  constructor(canvasId, config = {}) {
    this.engine = new GameEngine(canvasId, {
      width: 600,
      height: 920,
      backgroundColor: '#1a1a2e',
      usePixelRatio: true,
      ...config
    });

    // Grid configuration
    this.cols = 10;
    this.rows = 20;
    this.blockSize = 30;
    this.gridOffsetX = 20;
    this.gridOffsetY = 20;

    // Game state
    this.gameState = {
      state: 'READY', // READY, PLAYING, PAUSED, GAMEOVER
      score: 0,
      level: 1,
      lines: 0,
      grid: this._createEmptyGrid(),
      currentPiece: null,
      nextPiece: null,
      dropTimer: 0,
      dropInterval: 1000, // ms
      lockDelay: 500, // ms before piece locks
      lockTimer: 0,
      canHold: true,
      heldPiece: null
    };

    // Tetromino definitions (using SRS - Super Rotation System)
    this.tetrominoes = {
      I: {
        shape: [
          [0, 0, 0, 0],
          [1, 1, 1, 1],
          [0, 0, 0, 0],
          [0, 0, 0, 0]
        ],
        color: '#00f0f0'
      },
      O: {
        shape: [
          [1, 1],
          [1, 1]
        ],
        color: '#f0f000'
      },
      T: {
        shape: [
          [0, 1, 0],
          [1, 1, 1],
          [0, 0, 0]
        ],
        color: '#a000f0'
      },
      S: {
        shape: [
          [0, 1, 1],
          [1, 1, 0],
          [0, 0, 0]
        ],
        color: '#00f000'
      },
      Z: {
        shape: [
          [1, 1, 0],
          [0, 1, 1],
          [0, 0, 0]
        ],
        color: '#f00000'
      },
      J: {
        shape: [
          [1, 0, 0],
          [1, 1, 1],
          [0, 0, 0]
        ],
        color: '#0000f0'
      },
      L: {
        shape: [
          [0, 0, 1],
          [1, 1, 1],
          [0, 0, 0]
        ],
        color: '#f0a000'
      }
    };

    this.pieceTypes = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

    // Input state
    this.keys = {
      moveLeft: false,
      moveRight: false,
      softDrop: false,
      rotate: false
    };

    this.moveRepeatDelay = 170; // DAS (Delayed Auto Shift)
    this.moveRepeatRate = 50;   // ARR (Auto Repeat Rate)
    this.keyTimers = {
      left: 0,
      right: 0,
      down: 0
    };

    this._setupCallbacks();
  }

  _createEmptyGrid() {
    const grid = [];
    for (let row = 0; row < this.rows; row++) {
      grid[row] = [];
      for (let col = 0; col < this.cols; col++) {
        grid[row][col] = null;
      }
    }
    return grid;
  }

  _setupCallbacks() {
    // Set update and render callbacks
    this.engine.onUpdate = (dt) => this._updateGame(dt);
    this.engine.onRender = (ctx) => this._renderGame(ctx);

    // Keyboard controls
    this.engine.onKeyDown = (key) => this._handleKeyDown(key);
    this.engine.onKeyUp = (key) => this._handleKeyUp(key);
  }

  _handleKeyDown(key) {
    if (this.gameState.state === 'READY' && key === 'Space') {
      this._startGame();
    } else if (this.gameState.state === 'PLAYING') {
      if (key === 'ArrowLeft') {
        this.keys.moveLeft = true;
        this.keyTimers.left = 0;
        this._movePiece(-1, 0);
      } else if (key === 'ArrowRight') {
        this.keys.moveRight = true;
        this.keyTimers.right = 0;
        this._movePiece(1, 0);
      } else if (key === 'ArrowDown') {
        this.keys.softDrop = true;
        this.keyTimers.down = 0;
        this._movePiece(0, 1);
      } else if (key === 'ArrowUp' || key === 'KeyX') {
        this._rotatePiece(1); // Clockwise
      } else if (key === 'KeyZ' || key === 'ControlLeft' || key === 'ControlRight') {
        this._rotatePiece(-1); // Counter-clockwise
      } else if (key === 'Space') {
        this._hardDrop();
      } else if (key === 'KeyC' || key === 'ShiftLeft' || key === 'ShiftRight') {
        this._holdPiece();
      }
    } else if (this.gameState.state === 'GAMEOVER' && key === 'Space') {
      this._startGame();
    }

    if (key === 'KeyP') {
      this._togglePause();
    }
  }

  _handleKeyUp(key) {
    if (key === 'ArrowLeft') {
      this.keys.moveLeft = false;
      this.keyTimers.left = 0;
    } else if (key === 'ArrowRight') {
      this.keys.moveRight = false;
      this.keyTimers.right = 0;
    } else if (key === 'ArrowDown') {
      this.keys.softDrop = false;
      this.keyTimers.down = 0;
    }
  }

  _startGame() {
    this.gameState.state = 'PLAYING';
    this.gameState.score = 0;
    this.gameState.level = 1;
    this.gameState.lines = 0;
    this.gameState.grid = this._createEmptyGrid();
    this.gameState.dropTimer = 0;
    this.gameState.lockTimer = 0;
    this.gameState.canHold = true;
    this.gameState.heldPiece = null;
    
    this._spawnPiece();
    this._spawnNextPiece();
  }

  _togglePause() {
    if (this.gameState.state === 'PLAYING') {
      this.gameState.state = 'PAUSED';
    } else if (this.gameState.state === 'PAUSED') {
      this.gameState.state = 'PLAYING';
    }
  }

  _spawnPiece() {
    if (this.gameState.nextPiece) {
      this.gameState.currentPiece = this.gameState.nextPiece;
      this._spawnNextPiece();
    } else {
      const type = this.pieceTypes[Math.floor(Math.random() * this.pieceTypes.length)];
      this.gameState.currentPiece = {
        type: type,
        shape: this.tetrominoes[type].shape,
        color: this.tetrominoes[type].color,
        x: Math.floor(this.cols / 2) - Math.floor(this.tetrominoes[type].shape[0].length / 2),
        y: 0,
        rotation: 0
      };
    }

    this.gameState.canHold = true;

    // Check if piece can spawn
    if (!this._canPlacePiece(this.gameState.currentPiece.x, this.gameState.currentPiece.y, this.gameState.currentPiece.shape)) {
      this.gameState.state = 'GAMEOVER';
    }
  }

  _spawnNextPiece() {
    const type = this.pieceTypes[Math.floor(Math.random() * this.pieceTypes.length)];
    this.gameState.nextPiece = {
      type: type,
      shape: this.tetrominoes[type].shape,
      color: this.tetrominoes[type].color,
      x: 0,
      y: 0,
      rotation: 0
    };
  }

  _canPlacePiece(x, y, shape) {
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col]) {
          const newX = x + col;
          const newY = y + row;

          // Check boundaries
          if (newX < 0 || newX >= this.cols || newY >= this.rows) {
            return false;
          }

          // Check collision with existing blocks (but allow negative Y for spawn)
          if (newY >= 0 && this.gameState.grid[newY][newX]) {
            return false;
          }
        }
      }
    }
    return true;
  }

  _movePiece(dx, dy) {
    if (!this.gameState.currentPiece) return false;

    const newX = this.gameState.currentPiece.x + dx;
    const newY = this.gameState.currentPiece.y + dy;

    if (this._canPlacePiece(newX, newY, this.gameState.currentPiece.shape)) {
      this.gameState.currentPiece.x = newX;
      this.gameState.currentPiece.y = newY;
      
      // Reset lock timer when moving
      if (dy > 0) {
        this.gameState.lockTimer = 0;
      }
      
      return true;
    }
    
    return false;
  }

  _rotatePiece(direction) {
    if (!this.gameState.currentPiece) return;

    const piece = this.gameState.currentPiece;
    const rotated = this._rotateMatrix(piece.shape, direction);

    // Try basic rotation
    if (this._canPlacePiece(piece.x, piece.y, rotated)) {
      piece.shape = rotated;
      piece.rotation = (piece.rotation + direction + 4) % 4;
      this.gameState.lockTimer = 0;
      return;
    }

    // Wall kicks (SRS kicks simplified)
    const kicks = [
      [0, 0], [-1, 0], [1, 0], [0, -1], [-1, -1], [1, -1]
    ];

    for (const [dx, dy] of kicks) {
      if (this._canPlacePiece(piece.x + dx, piece.y + dy, rotated)) {
        piece.x += dx;
        piece.y += dy;
        piece.shape = rotated;
        piece.rotation = (piece.rotation + direction + 4) % 4;
        this.gameState.lockTimer = 0;
        return;
      }
    }
  }

  _rotateMatrix(matrix, direction) {
    const n = matrix.length;
    const rotated = [];

    if (direction === 1) { // Clockwise
      for (let i = 0; i < n; i++) {
        rotated[i] = [];
        for (let j = 0; j < n; j++) {
          rotated[i][j] = matrix[n - 1 - j][i];
        }
      }
    } else { // Counter-clockwise
      for (let i = 0; i < n; i++) {
        rotated[i] = [];
        for (let j = 0; j < n; j++) {
          rotated[i][j] = matrix[j][n - 1 - i];
        }
      }
    }

    return rotated;
  }

  _hardDrop() {
    if (!this.gameState.currentPiece) return;

    let dropDistance = 0;
    while (this._movePiece(0, 1)) {
      dropDistance++;
    }

    this.gameState.score += dropDistance * 2;
    this._lockPiece();
  }

  _holdPiece() {
    if (!this.gameState.canHold || !this.gameState.currentPiece) return;

    const currentType = this.gameState.currentPiece.type;

    if (this.gameState.heldPiece) {
      // Swap with held piece
      const heldType = this.gameState.heldPiece;
      this.gameState.heldPiece = currentType;
      
      this.gameState.currentPiece = {
        type: heldType,
        shape: JSON.parse(JSON.stringify(this.tetrominoes[heldType].shape)),
        color: this.tetrominoes[heldType].color,
        x: Math.floor(this.cols / 2) - Math.floor(this.tetrominoes[heldType].shape[0].length / 2),
        y: 0,
        rotation: 0
      };
    } else {
      // First hold
      this.gameState.heldPiece = currentType;
      this._spawnPiece();
    }

    this.gameState.canHold = false;
    this.gameState.lockTimer = 0;
  }

  _lockPiece() {
    if (!this.gameState.currentPiece) return;

    const piece = this.gameState.currentPiece;

    // Place piece on grid
    for (let row = 0; row < piece.shape.length; row++) {
      for (let col = 0; col < piece.shape[row].length; col++) {
        if (piece.shape[row][col]) {
          const gridY = piece.y + row;
          const gridX = piece.x + col;
          
          if (gridY >= 0 && gridY < this.rows && gridX >= 0 && gridX < this.cols) {
            this.gameState.grid[gridY][gridX] = piece.color;
          }
        }
      }
    }

    // Clear completed lines
    const linesCleared = this._clearLines();
    
    // Update score
    const scoreTable = [0, 100, 300, 500, 800];
    this.gameState.score += scoreTable[linesCleared] * this.gameState.level;
    this.gameState.lines += linesCleared;

    // Level up every 10 lines
    const newLevel = Math.floor(this.gameState.lines / 10) + 1;
    if (newLevel > this.gameState.level) {
      this.gameState.level = newLevel;
      this.gameState.dropInterval = Math.max(100, 1000 - (this.gameState.level - 1) * 50);
    }

    // Spawn new piece
    this._spawnPiece();
    this.gameState.lockTimer = 0;
  }

  _clearLines() {
    let linesCleared = 0;

    for (let row = this.rows - 1; row >= 0; row--) {
      if (this.gameState.grid[row].every(cell => cell !== null)) {
        // Remove the line
        this.gameState.grid.splice(row, 1);
        // Add empty line at top
        this.gameState.grid.unshift(new Array(this.cols).fill(null));
        linesCleared++;
        row++; // Check same row again
      }
    }

    return linesCleared;
  }

  _updateGame(dt) {
    if (this.gameState.state !== 'PLAYING') return;

    const piece = this.gameState.currentPiece;
    if (!piece) return;

    // Handle key repeat (DAS/ARR)
    if (this.keys.moveLeft) {
      this.keyTimers.left += dt * 1000;
      if (this.keyTimers.left >= this.moveRepeatDelay) {
        if ((this.keyTimers.left - this.moveRepeatDelay) % this.moveRepeatRate < dt * 1000) {
          this._movePiece(-1, 0);
        }
      }
    }

    if (this.keys.moveRight) {
      this.keyTimers.right += dt * 1000;
      if (this.keyTimers.right >= this.moveRepeatDelay) {
        if ((this.keyTimers.right - this.moveRepeatDelay) % this.moveRepeatRate < dt * 1000) {
          this._movePiece(1, 0);
        }
      }
    }

    if (this.keys.softDrop) {
      this.keyTimers.down += dt * 1000;
      const softDropSpeed = 50;
      if (this.keyTimers.down >= softDropSpeed) {
        if (this._movePiece(0, 1)) {
          this.gameState.score += 1;
        }
        this.keyTimers.down = 0;
      }
    }

    // Gravity (automatic drop)
    this.gameState.dropTimer += dt * 1000;
    if (this.gameState.dropTimer >= this.gameState.dropInterval) {
      if (!this._movePiece(0, 1)) {
        // Piece can't move down, start lock timer
        this.gameState.lockTimer += this.gameState.dropTimer;
        if (this.gameState.lockTimer >= this.gameState.lockDelay) {
          this._lockPiece();
        }
      }
      this.gameState.dropTimer = 0;
    }
  }

  _renderGame(ctx) {
    // Clear canvas at the start of each frame
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, this.engine.canvas.width, this.engine.canvas.height);
    
    // Render based on state
    if (this.gameState.state === 'READY') {
      this._renderReadyScreen(ctx);
    } else if (this.gameState.state === 'PLAYING' || this.gameState.state === 'PAUSED') {
      this._renderPlayingScreen(ctx);
      if (this.gameState.state === 'PAUSED') {
        this._renderPausedOverlay(ctx);
      }
    } else if (this.gameState.state === 'GAMEOVER') {
      this._renderPlayingScreen(ctx);
      this._renderGameOverScreen(ctx);
    }
  }

  _renderReadyScreen(ctx) {
    const centerX = this.engine.canvas.width / 2;
    const startY = this.engine.canvas.height / 2 - 200;
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('TETRIS', centerX, startY);

    ctx.font = '24px Arial';
    ctx.fillText('Press SPACE to Start', centerX, startY + 70);

    ctx.font = '18px Arial';
    ctx.fillStyle = '#aaaaaa';
    ctx.fillText('← → : Move', centerX, startY + 130);
    ctx.fillText('↑ / X : Rotate Clockwise', centerX, startY + 160);
    ctx.fillText('Z : Rotate Counter-clockwise', centerX, startY + 190);
    ctx.fillText('↓ : Soft Drop', centerX, startY + 220);
    ctx.fillText('SPACE : Hard Drop', centerX, startY + 250);
    ctx.fillText('C / Shift : Hold Piece', centerX, startY + 280);
    ctx.fillText('P : Pause', centerX, startY + 310);
  }

  _renderPlayingScreen(ctx) {
    // Draw grid background
    ctx.fillStyle = '#16213e';
    ctx.fillRect(
      this.gridOffsetX,
      this.gridOffsetY,
      this.cols * this.blockSize,
      this.rows * this.blockSize
    );

    // Draw grid lines
    ctx.strokeStyle = '#0f3460';
    ctx.lineWidth = 1;
    for (let row = 0; row <= this.rows; row++) {
      ctx.beginPath();
      ctx.moveTo(this.gridOffsetX, this.gridOffsetY + row * this.blockSize);
      ctx.lineTo(this.gridOffsetX + this.cols * this.blockSize, this.gridOffsetY + row * this.blockSize);
      ctx.stroke();
    }
    for (let col = 0; col <= this.cols; col++) {
      ctx.beginPath();
      ctx.moveTo(this.gridOffsetX + col * this.blockSize, this.gridOffsetY);
      ctx.lineTo(this.gridOffsetX + col * this.blockSize, this.gridOffsetY + this.rows * this.blockSize);
      ctx.stroke();
    }

    // Draw locked blocks
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        if (this.gameState.grid[row][col]) {
          this._drawBlock(
            ctx,
            this.gridOffsetX + col * this.blockSize,
            this.gridOffsetY + row * this.blockSize,
            this.gameState.grid[row][col]
          );
        }
      }
    }

    // Draw ghost piece (shows where piece will land)
    if (this.gameState.currentPiece) {
      const ghostY = this._getGhostY();
      this._drawPiece(ctx, this.gameState.currentPiece, ghostY, 0.3);
    }

    // Draw current piece
    if (this.gameState.currentPiece) {
      this._drawPiece(ctx, this.gameState.currentPiece, this.gameState.currentPiece.y, 1);
    }

    // Draw UI
    this._drawUI(ctx);
  }

  _getGhostY() {
    if (!this.gameState.currentPiece) return 0;

    let ghostY = this.gameState.currentPiece.y;
    while (this._canPlacePiece(this.gameState.currentPiece.x, ghostY + 1, this.gameState.currentPiece.shape)) {
      ghostY++;
    }
    return ghostY;
  }

  _drawBlock(ctx, x, y, color, alpha = 1) {
    // Main block
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    ctx.fillRect(x + 1, y + 1, this.blockSize - 2, this.blockSize - 2);

    // Highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(x + 2, y + 2, this.blockSize - 4, (this.blockSize - 4) / 3);

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(x + 2, y + this.blockSize - (this.blockSize - 4) / 3 - 2, this.blockSize - 4, (this.blockSize - 4) / 3);

    ctx.globalAlpha = 1;
  }

  _drawPiece(ctx, piece, y, alpha = 1) {
    for (let row = 0; row < piece.shape.length; row++) {
      for (let col = 0; col < piece.shape[row].length; col++) {
        if (piece.shape[row][col]) {
          const drawY = y + row;
          if (drawY >= 0) { // Only draw if visible
            this._drawBlock(
              ctx,
              this.gridOffsetX + (piece.x + col) * this.blockSize,
              this.gridOffsetY + drawY * this.blockSize,
              piece.color,
              alpha
            );
          }
        }
      }
    }
  }

  _drawUI(ctx) {
    const uiX = this.gridOffsetX + this.cols * this.blockSize + 40;
    const uiY = this.gridOffsetY;

    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';

    // Score
    ctx.font = 'bold 18px Arial';
    ctx.fillText('SCORE', uiX, uiY + 20);
    ctx.font = '22px Arial';
    ctx.fillText(this.gameState.score.toString(), uiX, uiY + 45);

    // Level
    ctx.font = 'bold 18px Arial';
    ctx.fillText('LEVEL', uiX, uiY + 85);
    ctx.font = '22px Arial';
    ctx.fillText(this.gameState.level.toString(), uiX, uiY + 110);

    // Lines
    ctx.font = 'bold 18px Arial';
    ctx.fillText('LINES', uiX, uiY + 150);
    ctx.font = '22px Arial';
    ctx.fillText(this.gameState.lines.toString(), uiX, uiY + 175);

    // Next piece
    ctx.font = 'bold 18px Arial';
    ctx.fillText('NEXT', uiX, uiY + 220);
    if (this.gameState.nextPiece) {
      const previewSize = 20;
      const previewX = uiX;
      const previewY = uiY + 240;
      
      for (let row = 0; row < this.gameState.nextPiece.shape.length; row++) {
        for (let col = 0; col < this.gameState.nextPiece.shape[row].length; col++) {
          if (this.gameState.nextPiece.shape[row][col]) {
            this._drawBlock(
              ctx,
              previewX + col * previewSize,
              previewY + row * previewSize,
              this.gameState.nextPiece.color
            );
          }
        }
      }
    }

    // Hold piece
    ctx.font = 'bold 18px Arial';
    ctx.fillText('HOLD', uiX, uiY + 360);
    if (this.gameState.heldPiece) {
      const previewSize = 20;
      const previewX = uiX;
      const previewY = uiY + 385;
      const heldShape = this.tetrominoes[this.gameState.heldPiece].shape;
      const heldColor = this.tetrominoes[this.gameState.heldPiece].color;
      
      const heldAlpha = this.gameState.canHold ? 1 : 0.3;
      
      for (let row = 0; row < heldShape.length; row++) {
        for (let col = 0; col < heldShape[row].length; col++) {
          if (heldShape[row][col]) {
            this._drawBlock(
              ctx,
              previewX + col * previewSize,
              previewY + row * previewSize,
              heldColor,
              heldAlpha
            );
          }
        }
      }
    }
  }

  _renderPausedOverlay(ctx) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, this.engine.canvas.width, this.engine.canvas.height);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', this.engine.canvas.width / 2, this.engine.canvas.height / 2);

    ctx.font = '24px Arial';
    ctx.fillText('Press P to Resume', this.engine.canvas.width / 2, this.engine.canvas.height / 2 + 50);
  }

  _renderGameOverScreen(ctx) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, this.engine.canvas.width, this.engine.canvas.height);

    ctx.fillStyle = '#ff6b6b';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', this.engine.canvas.width / 2, this.engine.canvas.height / 2 - 40);

    ctx.fillStyle = '#ffffff';
    ctx.font = '28px Arial';
    ctx.fillText(`Final Score: ${this.gameState.score}`, this.engine.canvas.width / 2, this.engine.canvas.height / 2 + 20);
    ctx.fillText(`Level: ${this.gameState.level}`, this.engine.canvas.width / 2, this.engine.canvas.height / 2 + 60);
    ctx.fillText(`Lines: ${this.gameState.lines}`, this.engine.canvas.width / 2, this.engine.canvas.height / 2 + 100);

    ctx.font = '20px Arial';
    ctx.fillStyle = '#aaaaaa';
    ctx.fillText('Press SPACE to Restart', this.engine.canvas.width / 2, this.engine.canvas.height / 2 + 160);
  }

  start() {
    this.engine.start();
  }
}
