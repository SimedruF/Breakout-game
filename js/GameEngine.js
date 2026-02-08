/**
 * GameEngine.js - Reusable Game Engine for HTML5 Canvas Games
 * 
 * A modular game engine providing:
 * - Canvas management
 * - Input handling (keyboard, mouse, touch)
 * - Game loop with delta time
 * - Audio system (WebAudio API)
 * - Collision detection utilities
 * - State management
 * - High score persistence
 */

export class GameEngine {
  constructor(canvasId, config = {}) {
    // Canvas setup
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      throw new Error(`Canvas with id "${canvasId}" not found`);
    }
    this.ctx = this.canvas.getContext("2d");
    
    // Configuration with defaults
    this.config = {
      width: config.width || 800,
      height: config.height || 500,
      enableAudio: config.enableAudio !== false,
      enableMouse: config.enableMouse !== false,
      enableHighScore: config.enableHighScore !== false,
      highScoreKey: config.highScoreKey || "game_high_score_v1",
      maxDeltaTime: config.maxDeltaTime || 1/30, // Prevent physics issues on tab switch
      ...config
    };
    
    // Set canvas dimensions
    this.canvas.width = this.config.width;
    this.canvas.height = this.config.height;
    
    // Input state
    this.keys = {};
    this.mouse = {
      active: false,
      x: this.canvas.width / 2,
      y: this.canvas.height / 2,
      pressed: false
    };
    
    // Game state
    this.state = {
      running: false,
      paused: false,
      muted: false
    };
    
    // Audio context
    this.audioCtx = null;
    this.sounds = {};
    
    // High score
    this.highScore = 0;
    if (this.config.enableHighScore) {
      this.loadHighScore();
    }
    
    // Timing
    this.lastTimestamp = 0;
    this.animationFrameId = null;
    
    // Game-specific callbacks (to be overridden)
    this.onUpdate = null;
    this.onRender = null;
    this.onKeyDown = null;
    this.onKeyUp = null;
    this.onMouseMove = null;
    this.onMouseClick = null;
    
    // Initialize
    this._setupInputListeners();
  }
  
  // ===== INPUT MANAGEMENT =====
  
  _setupInputListeners() {
    // Keyboard
    window.addEventListener("keydown", (e) => {
      this.keys[e.code] = true;
      
      // Prevent default for game keys
      if (e.code.startsWith("Arrow") || e.code === "Space") {
        e.preventDefault();
      }
      
      // Ensure audio context on user interaction
      if (this.config.enableAudio) {
        this._ensureAudio();
      }
      
      // Callback
      if (this.onKeyDown) {
        this.onKeyDown(e.code, e);
      }
    });
    
    window.addEventListener("keyup", (e) => {
      this.keys[e.code] = false;
      
      // Callback
      if (this.onKeyUp) {
        this.onKeyUp(e.code, e);
      }
    });
    
    // Mouse/Touch
    if (this.config.enableMouse) {
      this.canvas.addEventListener("mousemove", (e) => {
        this._updateMousePosition(e.clientX, e.clientY);
        if (this.onMouseMove) {
          this.onMouseMove(this.mouse.x, this.mouse.y);
        }
      });
      
      this.canvas.addEventListener("mouseleave", () => {
        this.mouse.active = false;
      });
      
      this.canvas.addEventListener("click", (e) => {
        this._updateMousePosition(e.clientX, e.clientY);
        if (this.onMouseClick) {
          this.onMouseClick(this.mouse.x, this.mouse.y);
        }
      });
      
      // Touch/Pointer support
      this.canvas.addEventListener("pointermove", (e) => {
        this._updateMousePosition(e.clientX, e.clientY);
      });
      
      this.canvas.addEventListener("pointerdown", (e) => {
        this.mouse.pressed = true;
      });
      
      this.canvas.addEventListener("pointerup", (e) => {
        this.mouse.pressed = false;
      });
    }
  }
  
  _updateMousePosition(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    
    this.mouse.x = (clientX - rect.left) * scaleX;
    this.mouse.y = (clientY - rect.top) * scaleY;
    this.mouse.active = true;
  }
  
  isKeyPressed(keyCode) {
    return this.keys[keyCode] === true;
  }
  
  // ===== AUDIO SYSTEM =====
  
  _ensureAudio() {
    if (this.state.muted || !this.config.enableAudio) return;
    
    if (!this.audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.audioCtx = new AC();
    }
    
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume().catch(() => {});
    }
  }
  
  /**
   * Play a simple beep sound
   * @param {number} frequency - Frequency in Hz
   * @param {number} duration - Duration in milliseconds
   * @param {number} gain - Volume (0.0 to 1.0)
   * @param {string} type - Oscillator type: "sine", "square", "triangle", "sawtooth"
   */
  beep(frequency, duration, gain = 0.05, type = "sine") {
    if (this.state.muted || !this.audioCtx) return;
    
    const t0 = this.audioCtx.currentTime;
    const oscillator = this.audioCtx.createOscillator();
    const gainNode = this.audioCtx.createGain();
    
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, t0);
    gainNode.gain.setValueAtTime(gain, t0);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, t0 + duration / 1000);
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);
    oscillator.start(t0);
    oscillator.stop(t0 + duration / 1000);
  }
  
  /**
   * Register a named sound effect
   * @param {string} name - Sound name
   * @param {Object} params - Sound parameters {frequency, duration, gain, type}
   */
  registerSound(name, params) {
    this.sounds[name] = params;
  }
  
  /**
   * Play a registered sound effect
   * @param {string} name - Sound name
   */
  playSound(name) {
    if (!this.sounds[name]) return;
    const { frequency, duration, gain, type } = this.sounds[name];
    this.beep(frequency, duration, gain, type);
  }
  
  toggleMute() {
    this.state.muted = !this.state.muted;
    if (!this.state.muted) {
      this._ensureAudio();
    }
  }
  
  // ===== COLLISION DETECTION =====
  
  /**
   * AABB (Axis-Aligned Bounding Box) collision detection
   */
  static rectIntersects(rect1, rect2) {
    return rect1.x < rect2.x + rect2.w &&
           rect1.x + rect1.w > rect2.x &&
           rect1.y < rect2.y + rect2.h &&
           rect1.y + rect1.h > rect2.y;
  }
  
  /**
   * Circle-Rectangle collision detection
   */
  static circleRectIntersects(circle, rect) {
    const circleLeft = circle.x - circle.r;
    const circleRight = circle.x + circle.r;
    const circleTop = circle.y - circle.r;
    const circleBottom = circle.y + circle.r;
    
    return circleRight >= rect.x &&
           circleLeft <= rect.x + rect.w &&
           circleBottom >= rect.y &&
           circleTop <= rect.y + rect.h;
  }
  
  /**
   * Circle-Circle collision detection
   */
  static circleIntersects(circle1, circle2) {
    const dx = circle1.x - circle2.x;
    const dy = circle1.y - circle2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < circle1.r + circle2.r;
  }
  
  /**
   * Point-Rectangle collision detection
   */
  static pointInRect(point, rect) {
    return point.x >= rect.x &&
           point.x <= rect.x + rect.w &&
           point.y >= rect.y &&
           point.y <= rect.y + rect.h;
  }
  
  // ===== UTILITY FUNCTIONS =====
  
  static clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }
  
  static lerp(start, end, t) {
    return start + (end - start) * t;
  }
  
  static distance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  static randomRange(min, max) {
    return Math.random() * (max - min) + min;
  }
  
  static randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  
  // ===== HIGH SCORE MANAGEMENT =====
  
  loadHighScore() {
    try {
      const stored = localStorage.getItem(this.config.highScoreKey);
      this.highScore = Number(stored) || 0;
    } catch (e) {
      this.highScore = 0;
    }
  }
  
  saveHighScore(score) {
    if (score > this.highScore) {
      this.highScore = score;
      try {
        localStorage.setItem(this.config.highScoreKey, String(score));
      } catch (e) {
        console.warn("Failed to save high score:", e);
      }
    }
  }
  
  // ===== GAME LOOP =====
  
  /**
   * Start the game loop
   * @param {Function} updateCallback - Called each frame with (dt)
   * @param {Function} renderCallback - Called each frame with (ctx)
   */
  start(updateCallback, renderCallback) {
    this.onUpdate = updateCallback;
    this.onRender = renderCallback;
    this.state.running = true;
    this.lastTimestamp = performance.now();
    this._loop(this.lastTimestamp);
  }
  
  _loop(timestamp) {
    if (!this.state.running) return;
    
    // Calculate delta time
    let dt = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;
    
    // Clamp delta time to prevent physics issues
    dt = Math.min(dt, this.config.maxDeltaTime);
    
    // Update
    if (this.onUpdate && !this.state.paused) {
      this.onUpdate(dt);
    }
    
    // Render
    if (this.onRender) {
      this.onRender(this.ctx);
    }
    
    // Continue loop
    this.animationFrameId = requestAnimationFrame((ts) => this._loop(ts));
  }
  
  stop() {
    this.state.running = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
  
  pause() {
    this.state.paused = true;
  }
  
  resume() {
    this.state.paused = false;
  }
  
  togglePause() {
    this.state.paused = !this.state.paused;
  }
  
  // ===== RENDERING HELPERS =====
  
  clear(color = null) {
    if (color) {
      this.ctx.fillStyle = color;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    } else {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }
  
  drawRect(x, y, w, h, color) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, w, h);
  }
  
  drawCircle(x, y, radius, color) {
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fillStyle = color;
    this.ctx.fill();
    this.ctx.closePath();
  }
  
  drawText(text, x, y, options = {}) {
    const {
      color = "#ffffff",
      font = "16px system-ui",
      align = "left",
      baseline = "alphabetic"
    } = options;
    
    this.ctx.fillStyle = color;
    this.ctx.font = font;
    this.ctx.textAlign = align;
    this.ctx.textBaseline = baseline;
    this.ctx.fillText(text, x, y);
  }
  
  /**
   * Draw a rectangle with 3D effect
   */
  drawRect3D(x, y, w, h, baseColor, shadowOffset = 2) {
    // Shadow
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    this.ctx.fillRect(x + shadowOffset, y + shadowOffset, w, h);
    
    // Base
    this.ctx.fillStyle = baseColor;
    this.ctx.fillRect(x, y, w, h);
    
    // Highlight (top-left)
    this.ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    this.ctx.fillRect(x, y, w, 2);
    this.ctx.fillRect(x, y, 2, h);
    
    // Shadow (bottom-right)
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    this.ctx.fillRect(x, y + h - 2, w, 2);
    this.ctx.fillRect(x + w - 2, y, 2, h);
    
    // Border
    this.ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x, y, w, h);
  }
  
  /**
   * Draw a gradient rectangle
   */
  drawGradientRect(x, y, w, h, color1, color2, vertical = true) {
    const gradient = vertical
      ? this.ctx.createLinearGradient(x, y, x, y + h)
      : this.ctx.createLinearGradient(x, y, x + w, y);
    
    gradient.addColorStop(0, color1);
    gradient.addColorStop(1, color2);
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(x, y, w, h);
  }
  
  /**
   * Draw an overlay (for pause, game over, etc.)
   */
  drawOverlay(message, submessage = "", options = {}) {
    const {
      bgColor = "rgba(0, 0, 0, 0.55)",
      textColor = "#e6e6e6",
      mainFont = "26px system-ui",
      subFont = "16px system-ui"
    } = options;
    
    // Background
    this.ctx.fillStyle = bgColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Main message
    this.ctx.fillStyle = textColor;
    this.ctx.font = mainFont;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "alphabetic";
    this.ctx.fillText(message, this.canvas.width / 2, this.canvas.height / 2 - 10);
    
    // Sub message
    if (submessage) {
      this.ctx.font = subFont;
      this.ctx.fillText(submessage, this.canvas.width / 2, this.canvas.height / 2 + 24);
    }
  }
}
