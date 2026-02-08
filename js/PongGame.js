/**
 * PongGame.js - Simple Pong implementation using GameEngine
 * 
 * This demonstrates how the same GameEngine can be used
 * for different types of arcade games.
 */

import { GameEngine } from './GameEngine.js';

export class PongGame {
  constructor(canvasId, config = {}) {
    this.engine = new GameEngine(canvasId, {
      width: 800,
      height: 500,
      highScoreKey: "pong_high_score_v1",
      ...config
    });
    
    this.config = {
      paddleWidth: 15,
      paddleHeight: 80,
      paddleSpeed: 400,
      paddleMargin: 30,
      ballRadius: 8,
      ballSpeed: 350,
      aiDifficulty: 0.85, // 0-1, how well AI tracks the ball
      scoreToWin: 11,
      ...config
    };
    
    // Paddles
    this.leftPaddle = {
      x: this.config.paddleMargin,
      y: this.engine.canvas.height / 2 - this.config.paddleHeight / 2,
      w: this.config.paddleWidth,
      h: this.config.paddleHeight,
      score: 0
    };
    
    this.rightPaddle = {
      x: this.engine.canvas.width - this.config.paddleMargin - this.config.paddleWidth,
      y: this.engine.canvas.height / 2 - this.config.paddleHeight / 2,
      w: this.config.paddleWidth,
      h: this.config.paddleHeight,
      score: 0
    };
    
    // Ball
    this.ball = {
      x: this.engine.canvas.width / 2,
      y: this.engine.canvas.height / 2,
      r: this.config.ballRadius,
      vx: this.config.ballSpeed,
      vy: this.config.ballSpeed * 0.5
    };
    
    this.gameState = {
      status: "SERVE", // SERVE | PLAYING | PAUSED | WIN
      serveSide: "left"
    };
    
    this._registerSounds();
    this._setupInputHandlers();
    this.resetGame();
  }
  
  _registerSounds() {
    this.engine.registerSound("hit", { frequency: 440, duration: 50, gain: 0.05, type: "square" });
    this.engine.registerSound("wall", { frequency: 330, duration: 30, gain: 0.04, type: "sine" });
    this.engine.registerSound("score", { frequency: 220, duration: 100, gain: 0.06, type: "triangle" });
    this.engine.registerSound("win", { frequency: 880, duration: 200, gain: 0.05, type: "sine" });
  }
  
  _setupInputHandlers() {
    this.engine.onKeyDown = (keyCode) => {
      if (keyCode === "Space") {
        if (this.gameState.status === "SERVE") {
          this.serveBall();
        } else if (this.gameState.status === "WIN") {
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
  
  resetGame() {
    this.leftPaddle.score = 0;
    this.rightPaddle.score = 0;
    this.gameState.serveSide = "left";
    this.resetBall();
    this.gameState.status = "SERVE";
  }
  
  resetBall() {
    this.ball.x = this.engine.canvas.width / 2;
    this.ball.y = this.engine.canvas.height / 2;
    this.ball.vx = 0;
    this.ball.vy = 0;
  }
  
  serveBall() {
    const angle = GameEngine.randomRange(-Math.PI / 4, Math.PI / 4);
    const direction = this.gameState.serveSide === "left" ? 1 : -1;
    
    this.ball.vx = Math.cos(angle) * this.config.ballSpeed * direction;
    this.ball.vy = Math.sin(angle) * this.config.ballSpeed;
    this.gameState.status = "PLAYING";
  }
  
  update(dt) {
    if (this.gameState.status === "PAUSED" || this.gameState.status === "SERVE") {
      return;
    }
    
    if (this.gameState.status !== "PLAYING") return;
    
    // Player paddle (W/S keys)
    let leftDir = 0;
    if (this.engine.isKeyPressed("KeyW")) leftDir -= 1;
    if (this.engine.isKeyPressed("KeyS")) leftDir += 1;
    
    this.leftPaddle.y += leftDir * this.config.paddleSpeed * dt;
    this.leftPaddle.y = GameEngine.clamp(
      this.leftPaddle.y,
      0,
      this.engine.canvas.height - this.leftPaddle.h
    );
    
    // AI paddle (simple tracking)
    const targetY = this.ball.y - this.rightPaddle.h / 2;
    const diff = targetY - this.rightPaddle.y;
    
    if (Math.abs(diff) > 5) {
      const aiSpeed = this.config.paddleSpeed * this.config.aiDifficulty;
      this.rightPaddle.y += Math.sign(diff) * aiSpeed * dt;
      this.rightPaddle.y = GameEngine.clamp(
        this.rightPaddle.y,
        0,
        this.engine.canvas.height - this.rightPaddle.h
      );
    }
    
    // Ball movement
    this.ball.x += this.ball.vx * dt;
    this.ball.y += this.ball.vy * dt;
    
    // Top/bottom walls
    if (this.ball.y - this.ball.r < 0 || this.ball.y + this.ball.r > this.engine.canvas.height) {
      this.ball.vy *= -1;
      this.ball.y = GameEngine.clamp(
        this.ball.y,
        this.ball.r,
        this.engine.canvas.height - this.ball.r
      );
      this.engine.playSound("wall");
    }
    
    // Paddle collisions
    this._checkPaddleCollision(this.leftPaddle);
    this._checkPaddleCollision(this.rightPaddle);
    
    // Scoring
    if (this.ball.x - this.ball.r < 0) {
      this.rightPaddle.score++;
      this.engine.playSound("score");
      this._handleScore("right");
    } else if (this.ball.x + this.ball.r > this.engine.canvas.width) {
      this.leftPaddle.score++;
      this.engine.playSound("score");
      this._handleScore("left");
    }
  }
  
  _checkPaddleCollision(paddle) {
    const paddleRect = { x: paddle.x, y: paddle.y, w: paddle.w, h: paddle.h };
    
    if (GameEngine.circleRectIntersects(this.ball, paddleRect)) {
      // Calculate hit position (-1 to 1)
      const relativeY = (this.ball.y - (paddle.y + paddle.h / 2)) / (paddle.h / 2);
      const bounceAngle = relativeY * (Math.PI / 4); // Max 45 degrees
      
      // Reverse direction and apply angle
      const speed = Math.hypot(this.ball.vx, this.ball.vy) * 1.05; // Speed up slightly
      const direction = Math.sign(this.ball.vx) * -1;
      
      this.ball.vx = Math.cos(bounceAngle) * speed * direction;
      this.ball.vy = Math.sin(bounceAngle) * speed;
      
      // Move ball outside paddle
      if (direction > 0) {
        this.ball.x = paddle.x + paddle.w + this.ball.r;
      } else {
        this.ball.x = paddle.x - this.ball.r;
      }
      
      this.engine.playSound("hit");
    }
  }
  
  _handleScore(side) {
    this.gameState.serveSide = side;
    
    if (this.leftPaddle.score >= this.config.scoreToWin || 
        this.rightPaddle.score >= this.config.scoreToWin) {
      this.gameState.status = "WIN";
      this.engine.playSound("win");
      
      // Update high score
      const finalScore = Math.max(this.leftPaddle.score, this.rightPaddle.score);
      this.engine.saveHighScore(finalScore);
    } else {
      this.resetBall();
      this.gameState.status = "SERVE";
    }
  }
  
  render(ctx) {
    this.engine.clear();
    
    // Draw center line
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(this.engine.canvas.width / 2, 0);
    ctx.lineTo(this.engine.canvas.width / 2, this.engine.canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw paddles
    this.engine.drawRect(
      this.leftPaddle.x, this.leftPaddle.y,
      this.leftPaddle.w, this.leftPaddle.h,
      "#e6e6e6"
    );
    
    this.engine.drawRect(
      this.rightPaddle.x, this.rightPaddle.y,
      this.rightPaddle.w, this.rightPaddle.h,
      "#e6e6e6"
    );
    
    // Draw ball
    this.engine.drawCircle(this.ball.x, this.ball.y, this.ball.r, "#e6e6e6");
    
    // Draw scores
    this.engine.drawText(`${this.leftPaddle.score}`, this.engine.canvas.width / 2 - 50, 50, {
      color: "#666",
      font: "48px system-ui",
      align: "center"
    });
    
    this.engine.drawText(`${this.rightPaddle.score}`, this.engine.canvas.width / 2 + 50, 50, {
      color: "#666",
      font: "48px system-ui",
      align: "center"
    });
    
    // Overlays
    if (this.gameState.status === "SERVE") {
      this.engine.drawOverlay(
        "PONG",
        "Press SPACE to serve | W/S to move"
      );
    } else if (this.gameState.status === "PAUSED") {
      this.engine.drawOverlay("PAUSED", "Press P to continue");
    } else if (this.gameState.status === "WIN") {
      const winner = this.leftPaddle.score >= this.config.scoreToWin ? "PLAYER" : "AI";
      this.engine.drawOverlay(
        `${winner} WINS!`,
        "Press SPACE to play again"
      );
    }
  }
  
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
