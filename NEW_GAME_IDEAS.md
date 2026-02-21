# 🎮 Idei de Jocuri Noi pentru GameEngine

## Jocuri Recomandate (în ordinea dificultății)

### 1. 🐍 SNAKE (Ușor)
**Descriere:** Șarpele care crește și trebuie să colecteze mâncare fără să se lovească de pereți sau de propriul corp.

**De ce e perfect pentru engine-ul tău:**
- Folosește doar keyboard input
- Logică simplă de coliziuni (GameEngine.pointInRect)
- Grid-based movement
- High score system deja implementat

**Features:**
- Mișcare pe grid 20x20
- Mâncare care apare random
- Creștere șarpe la fiecare mâncare
- Coliziune cu pereții și propriul corp
- Score bazat pe lungime

**Dificultate:** ⭐ (1/5)
**Timp estimat:** 2-3 ore

---

### 2. 🎯 FLAPPY BIRD (Ușor-Mediu)
**Descriere:** Pasăre care zboară prin obstacole, controlată prin space/click.

**De ce e perfect pentru engine-ul tău:**
- Gravity simulation simplă
- Click/Space pentru jump
- Scrolling background
- Coliziuni simple

**Features:**
- Gravitate constantă
- Jump la apăsare Space
- Pipes care scrollează
- Score pe fiecare pipe trecut
- Dificultate progresivă

**Dificultate:** ⭐⭐ (2/5)
**Timp estimat:** 3-4 ore

---

### 3. 🍬 MATCH-3 (Mediu)
**Descriere:** Puzzle tip Candy Crush - potrivește 3 sau mai multe piese de aceeași culoare.

**De ce e perfect pentru engine-ul tău:**
- Mouse click pentru selectare
- Grid logic
- Animații simple cu lerp
- Sound effects

**Features:**
- Grid 8x8 cu piese colorate
- Click și drag pentru swap
- Detectare match-uri de 3+
- Animații de falling și clearing
- Combos și score multiplier

**Dificultate:** ⭐⭐⭐ (3/5)
**Timp estimat:** 6-8 ore

---

### 4. 🪐 ASTEROIDS (Mediu)
**Descriere:** Navă spațială care trage în asteroizi, rotație 360°.

**De ce e perfect pentru engine-ul tău:**
- Rotație și thrust physics
- Wrap-around screen
- Coliziuni circulare
- Particle effects

**Features:**
- Rotație navă cu săgeți
- Thrust forward cu W
- Tragere cu Space
- Asteroizi mari, medii, mici
- Momentum și inertie
- Wrap edges

**Dificultate:** ⭐⭐⭐ (3/5)
**Timp estimat:** 5-7 ore

---

### 5. 📦 SOKOBAN (Mediu)
**Descriere:** Puzzle logic - împinge lăzi pe pozițiile target.

**De ce e perfect pentru engine-ul tău:**
- Grid-based
- Keyboard controls
- Level system
- Undo feature

**Features:**
- Nivele progresive
- Împinge lăzi pe targets
- Undo move
- Level selector
- Număr minim de mișcări

**Dificultate:** ⭐⭐⭐ (3/5)
**Timp estimat:** 5-6 ore

---

### 6. 🏃 PLATFORMER SIMPLU (Mediu-Greu)
**Descriere:** Joc de tip Mario - platforme, sărituri, colectare monede.

**De ce e perfect pentru engine-ul tău:**
- Gravity și jump physics
- Platform collision detection
- Side-scrolling
- Power-ups system

**Features:**
- Jump cu Space
- Mișcare left/right
- Platforme statice
- Enemies simple (patrol)
- Colectare monede
- Lives system

**Dificultate:** ⭐⭐⭐⭐ (4/5)
**Timp estimat:** 10-15 ore

---

### 7. 💣 BOMBERMAN (Greu)
**Descriere:** Plasează bombe pentru a distruge obstacole și inamici.

**De ce e perfect pentru engine-ul tău:**
- Grid-based
- Multiplayer potential
- Chain reactions
- Power-ups

**Features:**
- Grid 13x13
- Plasare bombe cu Space
- Explozii în 4 direcții
- Destructibile vs indestructibile
- Power-ups (mai multe bombe, rază mai mare)
- 2 player mode (keyboard split)

**Dificultate:** ⭐⭐⭐⭐ (4/5)
**Timp estimat:** 12-18 ore

---

### 8. 🗼 TOWER DEFENSE (Greu)
**Descriere:** Plasează torturi pe hartă pentru a opri valurile de inamici.

**De ce e perfect pentru engine-ul tău:**
- Mouse pentru plasare torturi
- Path-finding pentru enemies
- Wave system
- Upgrade system

**Features:**
- Grid pentru plasare torturi
- Diferite tipuri de torturi
- Enemies pe traseu predefinit
- Health pentru base
- Waves progresive
- Money și upgrade system

**Dificultate:** ⭐⭐⭐⭐⭐ (5/5)
**Timp estimat:** 20-30 ore

---

## Template de Start pentru Snake

```javascript
import { GameEngine } from './GameEngine.js';

export class SnakeGame {
  constructor(canvasId) {
    this.engine = new GameEngine(canvasId, {
      width: 600,
      height: 600,
      backgroundColor: '#1a1a2e'
    });

    this.gridSize = 20;
    this.cellSize = 30;
    
    this.snake = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 }
    ];
    
    this.direction = { x: 1, y: 0 };
    this.nextDirection = { x: 1, y: 0 };
    this.food = this._spawnFood();
    this.score = 0;
    this.moveTimer = 0;
    this.moveInterval = 0.15; // seconds
    this.gameOver = false;

    this._setupCallbacks();
  }

  _setupCallbacks() {
    this.engine.onUpdate = (dt) => this._update(dt);
    this.engine.onRender = (ctx) => this._render(ctx);
    
    this.engine.onKeyDown = (key) => {
      if (key === 'ArrowUp' && this.direction.y === 0) {
        this.nextDirection = { x: 0, y: -1 };
      } else if (key === 'ArrowDown' && this.direction.y === 0) {
        this.nextDirection = { x: 0, y: 1 };
      } else if (key === 'ArrowLeft' && this.direction.x === 0) {
        this.nextDirection = { x: -1, y: 0 };
      } else if (key === 'ArrowRight' && this.direction.x === 0) {
        this.nextDirection = { x: 1, y: 0 };
      } else if (key === 'Space' && this.gameOver) {
        this._reset();
      }
    };
  }

  _spawnFood() {
    let food;
    do {
      food = {
        x: Math.floor(Math.random() * this.gridSize),
        y: Math.floor(Math.random() * this.gridSize)
      };
    } while (this._isOnSnake(food));
    return food;
  }

  _isOnSnake(pos) {
    return this.snake.some(segment => 
      segment.x === pos.x && segment.y === pos.y
    );
  }

  _update(dt) {
    if (this.gameOver) return;

    this.moveTimer += dt;
    if (this.moveTimer >= this.moveInterval) {
      this.moveTimer = 0;
      this.direction = this.nextDirection;
      
      // Calculate new head position
      const head = {
        x: this.snake[0].x + this.direction.x,
        y: this.snake[0].y + this.direction.y
      };

      // Check wall collision
      if (head.x < 0 || head.x >= this.gridSize || 
          head.y < 0 || head.y >= this.gridSize) {
        this.gameOver = true;
        return;
      }

      // Check self collision
      if (this._isOnSnake(head)) {
        this.gameOver = true;
        return;
      }

      // Move snake
      this.snake.unshift(head);

      // Check food collision
      if (head.x === this.food.x && head.y === this.food.y) {
        this.score += 10;
        this.food = this._spawnFood();
        this.engine.beep(500, 100, 0.1, 'sine');
      } else {
        this.snake.pop(); // Remove tail
      }
    }
  }

  _render(ctx) {
    // Clear
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, 600, 600);

    // Grid
    ctx.strokeStyle = '#16213e';
    for (let i = 0; i <= this.gridSize; i++) {
      ctx.beginPath();
      ctx.moveTo(i * this.cellSize, 0);
      ctx.lineTo(i * this.cellSize, 600);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(0, i * this.cellSize);
      ctx.lineTo(600, i * this.cellSize);
      ctx.stroke();
    }

    // Snake
    this.snake.forEach((segment, i) => {
      ctx.fillStyle = i === 0 ? '#00ff00' : '#00cc00';
      ctx.fillRect(
        segment.x * this.cellSize + 1,
        segment.y * this.cellSize + 1,
        this.cellSize - 2,
        this.cellSize - 2
      );
    });

    // Food
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(
      this.food.x * this.cellSize + this.cellSize/2,
      this.food.y * this.cellSize + this.cellSize/2,
      this.cellSize/2 - 2,
      0, Math.PI * 2
    );
    ctx.fill();

    // Score
    ctx.fillStyle = '#fff';
    ctx.font = '24px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${this.score}`, 10, 30);

    if (this.gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, 600, 600);
      
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 48px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', 300, 280);
      ctx.font = '24px Arial';
      ctx.fillText(`Score: ${this.score}`, 300, 320);
      ctx.fillText('Press SPACE to restart', 300, 360);
    }
  }

  _reset() {
    this.snake = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 }
    ];
    this.direction = { x: 1, y: 0 };
    this.nextDirection = { x: 1, y: 0 };
    this.food = this._spawnFood();
    this.score = 0;
    this.gameOver = false;
  }

  start() {
    this.engine.start();
  }
}
```

## Cum să Începi un Joc Nou

1. **Creează fișierul de joc:**
   ```bash
   touch js/SnakeGame.js
   touch snake.html
   ```

2. **Copiază template-ul** în `js/SnakeGame.js`

3. **Creează HTML:**
   ```html
   <!DOCTYPE html>
   <html lang="en">
   <head>
     <meta charset="UTF-8">
     <title>Snake Game</title>
     <style>
       body {
         margin: 0;
         background: #0a0a0a;
         display: flex;
         justify-content: center;
         align-items: center;
         height: 100vh;
       }
       canvas {
         border: 2px solid #333;
       }
     </style>
   </head>
   <body>
     <canvas id="gameCanvas"></canvas>
     <script type="module">
       import { SnakeGame } from './js/SnakeGame.js';
       const game = new SnakeGame('gameCanvas');
       game.start();
     </script>
   </body>
   </html>
   ```

4. **Testează și iterează!**

## Resurse pentru Dezvoltare

- **GameEngine.js** - folosește toate helper functions
- **GraphicsEffects.js** - adaugă efecte vizuale cool
- **GAME_ENGINE_DOCS.md** - documentație completă
- **GRAPHICS_IMPROVEMENTS.md** - ghid de îmbunătățiri

## Next Steps

1. Începe cu **Snake** - e cel mai simplu
2. Adaugă efecte grafice din GraphicsEffects.js
3. Testează pe automatic-house.ro
4. Treci la următorul joc

Mult succes! 🚀
