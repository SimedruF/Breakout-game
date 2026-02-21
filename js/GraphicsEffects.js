/**
 * GraphicsEffects.js - Reusable graphics effects for games
 * 
 * Collection of visual effects that can enhance any game:
 * - Particles and explosions
 * - Glow and shadow effects
 * - Camera shake
 * - Trails and motion blur
 * - Advanced drawing helpers
 */

// ===== PARTICLE SYSTEM =====

export class Particle {
  constructor(x, y, color, options = {}) {
    this.x = x;
    this.y = y;
    this.vx = options.vx || (Math.random() - 0.5) * 6;
    this.vy = options.vy || (Math.random() - 0.5) * 6;
    this.life = options.life || 1.0;
    this.maxLife = this.life;
    this.color = color;
    this.size = options.size || Math.random() * 4 + 2;
    this.gravity = options.gravity !== undefined ? options.gravity : 0.2;
    this.friction = options.friction || 0.98;
    this.fadeOut = options.fadeOut !== false;
  }

  update(dt) {
    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;
    this.vy += this.gravity;
    this.vx *= this.friction;
    this.vy *= this.friction;
    this.life -= dt * 2;
  }

  draw(ctx) {
    if (this.fadeOut) {
      ctx.globalAlpha = Math.max(0, this.life / this.maxLife);
    }
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x - this.size/2, this.y - this.size/2, this.size, this.size);
    ctx.globalAlpha = 1;
  }

  isDead() {
    return this.life <= 0;
  }
}

export class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  emit(x, y, count, color, options = {}) {
    for (let i = 0; i < count; i++) {
      this.particles.push(new Particle(x, y, color, options));
    }
  }

  createExplosion(x, y, color, count = 20) {
    this.emit(x, y, count, color, {
      gravity: 0.2,
      friction: 0.95
    });
  }

  createSparkles(x, y, count = 10) {
    const colors = ['#FFD700', '#FFA500', '#FF69B4', '#00FFFF'];
    for (let i = 0; i < count; i++) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      this.particles.push(new Particle(x, y, color, {
        size: Math.random() * 3 + 1,
        gravity: -0.1,
        friction: 0.99
      }));
    }
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update(dt);
      if (this.particles[i].isDead()) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    this.particles.forEach(p => p.draw(ctx));
  }

  clear() {
    this.particles = [];
  }
}

// ===== CAMERA SHAKE =====

export class CameraShake {
  constructor() {
    this.shakeAmount = 0;
    this.shakeDuration = 0;
    this.shakeFrequency = 20; // Hz
  }

  trigger(amount, duration = 0.2) {
    this.shakeAmount = Math.max(this.shakeAmount, amount);
    this.shakeDuration = Math.max(this.shakeDuration, duration);
  }

  update(dt) {
    if (this.shakeDuration > 0) {
      this.shakeDuration -= dt;
    } else {
      this.shakeAmount = 0;
    }
  }

  getOffset() {
    if (this.shakeDuration > 0) {
      const intensity = this.shakeDuration / 0.2; // Fade out
      return {
        x: (Math.random() - 0.5) * this.shakeAmount * intensity,
        y: (Math.random() - 0.5) * this.shakeAmount * intensity
      };
    }
    return { x: 0, y: 0 };
  }

  apply(ctx, callback) {
    const offset = this.getOffset();
    ctx.save();
    ctx.translate(offset.x, offset.y);
    callback();
    ctx.restore();
  }
}

// ===== TRAIL EFFECT =====

export class Trail {
  constructor(maxLength = 10) {
    this.segments = [];
    this.maxLength = maxLength;
  }

  add(x, y, data = {}) {
    this.segments.push({ x, y, ...data });
    if (this.segments.length > this.maxLength) {
      this.segments.shift();
    }
  }

  draw(ctx, drawFunction) {
    this.segments.forEach((segment, index) => {
      const alpha = (index / this.maxLength);
      ctx.globalAlpha = alpha * 0.5;
      drawFunction(ctx, segment, index);
    });
    ctx.globalAlpha = 1;
  }

  clear() {
    this.segments = [];
  }
}

// ===== DRAWING HELPERS =====

/**
 * Draw a rectangle with gradient fill
 */
export function drawGradientRect(ctx, x, y, width, height, color1, color2, vertical = true) {
  const gradient = vertical 
    ? ctx.createLinearGradient(x, y, x, y + height)
    : ctx.createLinearGradient(x, y, x + width, y);
  
  gradient.addColorStop(0, color1);
  gradient.addColorStop(1, color2);
  
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, width, height);
}

/**
 * Draw a circle with radial gradient
 */
export function drawGradientCircle(ctx, x, y, radius, innerColor, outerColor) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, innerColor);
  gradient.addColorStop(1, outerColor);
  
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Draw a glow effect around a point
 */
export function drawGlow(ctx, x, y, radius, color, intensity = 1) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  
  // Parse color to add alpha
  const glowColor = color.includes('rgba') 
    ? color.replace(/[\d.]+\)$/g, `${intensity})`)
    : color.replace('rgb', 'rgba').replace(')', `, ${intensity})`);
  
  gradient.addColorStop(0, glowColor);
  gradient.addColorStop(0.5, glowColor.replace(/[\d.]+\)$/g, `${intensity * 0.5})`));
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Draw a 3D-style brick with highlights and shadows
 */
export function drawBrick3D(ctx, x, y, width, height, color) {
  // Main face
  ctx.fillStyle = color;
  ctx.fillRect(x, y, width, height);
  
  // Top highlight
  const highlightGrad = ctx.createLinearGradient(x, y, x, y + height/3);
  highlightGrad.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
  highlightGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = highlightGrad;
  ctx.fillRect(x, y, width, height/3);
  
  // Bottom shadow
  const shadowGrad = ctx.createLinearGradient(x, y + height*2/3, x, y + height);
  shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
  ctx.fillStyle = shadowGrad;
  ctx.fillRect(x, y + height*2/3, width, height/3);
  
  // Border
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x+1, y+1, width-2, height-2);
}

/**
 * Draw text with outline
 */
export function drawTextWithOutline(ctx, text, x, y, fontSize, fillColor, outlineColor, outlineWidth = 4) {
  ctx.font = `bold ${fontSize}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Outline
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = outlineWidth;
  ctx.strokeText(text, x, y);
  
  // Fill
  ctx.fillStyle = fillColor;
  ctx.fillText(text, x, y);
}

/**
 * Draw a progress bar
 */
export function drawProgressBar(ctx, x, y, width, height, progress, fillColor, bgColor) {
  // Background
  ctx.fillStyle = bgColor;
  ctx.fillRect(x, y, width, height);
  
  // Progress
  const progressWidth = width * Math.max(0, Math.min(1, progress));
  ctx.fillStyle = fillColor;
  ctx.fillRect(x, y, progressWidth, height);
  
  // Border
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);
}

/**
 * Draw a rounded rectangle
 */
export function drawRoundedRect(ctx, x, y, width, height, radius, fillColor, strokeColor = null) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  
  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }
  
  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.stroke();
  }
}

// ===== BACKGROUND EFFECTS =====

export class StarField {
  constructor(width, height, starCount = 100) {
    this.stars = [];
    this.width = width;
    this.height = height;
    
    for (let i = 0; i < starCount; i++) {
      this.stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 50 + 10,
        brightness: Math.random() * 0.5 + 0.5
      });
    }
  }

  update(dt) {
    this.stars.forEach(star => {
      star.y += star.speed * dt;
      if (star.y > this.height) {
        star.y = 0;
        star.x = Math.random() * this.width;
      }
    });
  }

  draw(ctx) {
    this.stars.forEach(star => {
      ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
      ctx.fillRect(star.x, star.y, star.size, star.size);
    });
  }
}

/**
 * Draw scanlines for retro effect
 */
export function drawScanlines(ctx, width, height, opacity = 0.1) {
  ctx.globalAlpha = opacity;
  ctx.fillStyle = '#000';
  for (let i = 0; i < height; i += 4) {
    ctx.fillRect(0, i, width, 2);
  }
  ctx.globalAlpha = 1;
}

/**
 * Draw vignette effect
 */
export function drawVignette(ctx, width, height, intensity = 0.5) {
  const gradient = ctx.createRadialGradient(
    width/2, height/2, 0,
    width/2, height/2, width * 0.7
  );
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, `rgba(0,0,0,${intensity})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

// ===== TRANSITION EFFECTS =====

export class FadeTransition {
  constructor() {
    this.alpha = 0;
    this.fading = false;
    this.fadingOut = false;
    this.speed = 2; // opacity per second
    this.callback = null;
  }

  fadeOut(callback) {
    this.fading = true;
    this.fadingOut = true;
    this.alpha = 0;
    this.callback = callback;
  }

  fadeIn() {
    this.fading = true;
    this.fadingOut = false;
    this.alpha = 1;
  }

  update(dt) {
    if (!this.fading) return;

    if (this.fadingOut) {
      this.alpha += dt * this.speed;
      if (this.alpha >= 1) {
        this.alpha = 1;
        this.fading = false;
        if (this.callback) {
          this.callback();
          this.callback = null;
        }
      }
    } else {
      this.alpha -= dt * this.speed;
      if (this.alpha <= 0) {
        this.alpha = 0;
        this.fading = false;
      }
    }
  }

  render(ctx, width, height) {
    if (this.alpha > 0) {
      ctx.fillStyle = `rgba(0, 0, 0, ${this.alpha})`;
      ctx.fillRect(0, 0, width, height);
    }
  }
}

// ===== ANIMATION HELPERS =====

/**
 * Calculate pulse scale for animation
 */
export function getPulseScale(time, speed = 300, amount = 0.1) {
  return 1 + Math.sin(time / speed) * amount;
}

/**
 * Calculate bounce animation
 */
export function getBounceOffset(time, speed = 500, height = 10) {
  return Math.abs(Math.sin(time / speed)) * height;
}

/**
 * Easing functions
 */
export const Easing = {
  linear: t => t,
  easeInQuad: t => t * t,
  easeOutQuad: t => t * (2 - t),
  easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  easeInCubic: t => t * t * t,
  easeOutCubic: t => (--t) * t * t + 1,
  easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1
};
