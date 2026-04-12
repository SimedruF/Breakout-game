import { GameEngine } from './GameEngine.js';
import { ParticleSystem, CameraShake, drawGlow, drawVignette, drawProgressBar, drawRoundedRect, drawTextWithOutline } from './GraphicsEffects.js';

// ── Map definition ──
// 0 = buildable, 1 = path, 2 = start, 3 = end, 4 = scenery (unbuildable)
const MAP_ROWS = 14;
const MAP_COLS = 18;

// Base map layout (phase 1: waves 1-5)
const MAP_BASE = [
  [0,0,0,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,4,0,0,0,0,0,0,0,0,0,0,0,4,0,0],
  [2,1,1,1,1,0,0,0,0,0,0,1,1,1,1,1,0,0],
  [0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0],
  [0,4,0,0,1,0,0,4,0,0,0,1,0,0,4,0,0,0],
  [0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,0],
  [0,0,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0],
  [0,0,1,0,0,0,0,4,0,0,0,0,1,0,0,0,0,0],
  [0,0,1,0,0,0,0,0,0,0,0,0,1,0,4,0,0,0],
  [0,0,1,0,0,4,0,0,0,0,0,0,1,1,1,1,1,3],
  [0,0,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

// Phase 2 overlay (waves 6-10): adds a second entry lane through the middle
const MAP_PHASE2_CHANGES = [
  // New shortcut from row 5 col 8 down through row 6 to row 8 col 8
  { r: 6, c: 4, v: 1 }, { r: 6, c: 5, v: 1 }, { r: 6, c: 6, v: 1 },
  { r: 6, c: 7, v: 1 }, { r: 6, c: 8, v: 1 },
  { r: 7, c: 8, v: 1 },
  // Remove some scenery to open area
  { r: 7, c: 16, v: 0 },
  { r: 1, c: 15, v: 0 },
];

// Phase 3 overlay (waves 11+): adds upper loop and extra branches
const MAP_PHASE3_CHANGES = [
  // Extra loop through top from row 2 col 15 → row 0 → row 0 col 11
  { r: 1, c: 15, v: 1 }, { r: 0, c: 15, v: 1 }, { r: 0, c: 14, v: 1 },
  { r: 0, c: 13, v: 1 }, { r: 0, c: 12, v: 1 }, { r: 0, c: 11, v: 1 },
  { r: 1, c: 11, v: 1 },
  // Bottom extra branch row 12 col 13→17
  { r: 13, c: 2, v: 1 }, { r: 13, c: 3, v: 1 }, { r: 13, c: 4, v: 1 },
  { r: 13, c: 5, v: 1 }, { r: 13, c: 6, v: 1 },
  // Remove scenery blocking
  { r: 0, c: 3, v: 0 },
  { r: 4, c: 1, v: 0 },
  { r: 9, c: 7, v: 0 },
];

// Mutable map — updated when map phase changes
let MAP = MAP_BASE.map(row => [...row]);
let currentMapPhase = 1;

// Pre-compute path waypoints from MAP
function computePath() {
  const visited = new Set();
  const path = [];
  let start = null;

  // Find start cell (value 2)
  for (let r = 0; r < MAP_ROWS; r++) {
    for (let c = 0; c < MAP_COLS; c++) {
      if (MAP[r][c] === 2) { start = { r, c }; break; }
    }
    if (start) break;
  }

  // BFS/DFS walk along path cells
  const stack = [start];
  visited.add(`${start.r},${start.c}`);
  path.push(start);

  while (stack.length > 0) {
    const cur = stack[stack.length - 1];
    const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
    let found = false;

    for (const [dr, dc] of dirs) {
      const nr = cur.r + dr;
      const nc = cur.c + dc;
      const key = `${nr},${nc}`;
      if (nr < 0 || nr >= MAP_ROWS || nc < 0 || nc >= MAP_COLS) continue;
      if (visited.has(key)) continue;
      if (MAP[nr][nc] === 1 || MAP[nr][nc] === 3) {
        visited.add(key);
        path.push({ r: nr, c: nc });
        stack.push({ r: nr, c: nc });
        found = true;
        if (MAP[nr][nc] === 3) { stack.length = 0; } // done
        break;
      }
    }

    if (!found) stack.pop();
  }

  return path;
}

const PATH = computePath();

// Apply map evolution for a given phase
function evolveMap(phase) {
  if (phase <= currentMapPhase) return false;
  // Reset to base
  for (let r = 0; r < MAP_ROWS; r++) {
    for (let c = 0; c < MAP_COLS; c++) {
      MAP[r][c] = MAP_BASE[r][c];
    }
  }
  // Apply phase 2 changes
  if (phase >= 2) {
    for (const ch of MAP_PHASE2_CHANGES) MAP[ch.r][ch.c] = ch.v;
  }
  // Apply phase 3 changes
  if (phase >= 3) {
    for (const ch of MAP_PHASE3_CHANGES) MAP[ch.r][ch.c] = ch.v;
  }
  // Recompute path
  const newPath = computePath();
  PATH.length = 0;
  for (const p of newPath) PATH.push(p);
  currentMapPhase = phase;
  return true;
}

// ── Tower definitions ──
// Upgrade multipliers per level: [lvl1=base, lvl2, lvl3]
const MAX_TOWER_LEVEL = 3;
const UPGRADE_MULT = {
  damage:   [1, 1.6, 2.5],
  range:    [1, 1.15, 1.3],
  fireRate: [1, 1.25, 1.5],
};

const TOWER_DEFS = {
  arrow: {
    name: 'Arrow',
    cost: 50,
    upgradeCost: [0, 60, 120],  // cost for lvl2, lvl3
    range: 3,
    damage: 15,
    fireRate: 1.2, // shots/sec
    color: '#4CAF50',
    colorLight: '#81C784',
    projectileColor: '#CDDC39',
    projectileSpeed: 400,
    icon: '🏹',
    key: '1',
  },
  cannon: {
    name: 'Cannon',
    cost: 100,
    upgradeCost: [0, 120, 200],
    range: 2.5,
    damage: 50,
    fireRate: 0.5,
    color: '#795548',
    colorLight: '#A1887F',
    projectileColor: '#FF5722',
    projectileSpeed: 250,
    splash: 1.2,
    icon: '💣',
    key: '2',
  },
  ice: {
    name: 'Ice',
    cost: 75,
    upgradeCost: [0, 90, 160],
    range: 2.8,
    damage: 8,
    fireRate: 0.8,
    color: '#03A9F4',
    colorLight: '#4FC3F7',
    projectileColor: '#B3E5FC',
    projectileSpeed: 300,
    slow: 0.4, // 40% speed for 2s
    slowDuration: 2,
    icon: '❄️',
    key: '3',
  },
  lightning: {
    name: 'Lightning',
    cost: 150,
    upgradeCost: [0, 180, 300],
    range: 3.5,
    damage: 25,
    fireRate: 2,
    color: '#FFC107',
    colorLight: '#FFE082',
    projectileColor: '#FFEB3B',
    projectileSpeed: 800,
    chain: 2, // hits 2 extra targets
    icon: '⚡',
    key: '4',
  },
};

// Get effective stats for a tower at a given level
function getTowerStats(type, level) {
  const def = TOWER_DEFS[type];
  const li = Math.min(level, MAX_TOWER_LEVEL) - 1;
  return {
    damage: def.damage * UPGRADE_MULT.damage[li],
    range: def.range * UPGRADE_MULT.range[li],
    fireRate: def.fireRate * UPGRADE_MULT.fireRate[li],
    splash: def.splash,
    slow: def.slow,
    slowDuration: def.slowDuration,
    chain: def.chain,
    projectileSpeed: def.projectileSpeed,
    projectileColor: def.projectileColor,
  };
}

// ── Enemy wave definitions ──
function getWaveEnemies(wave) {
  const enemies = [];
  // Exponential HP scaling: gentle early, steep after wave 5 (but manageable with upgrades)
  const baseHP = wave <= 5
    ? 30 + wave * 20
    : 130 + (wave - 5) * 35 + Math.pow(wave - 5, 1.8) * 8;
  const baseSpeed = 1.2 + wave * 0.05;
  const count = 5 + Math.floor(wave * 2);

  for (let i = 0; i < count; i++) {
    let type = 'normal';
    let hp = baseHP;
    let speed = baseSpeed;
    let radius = 0.3;
    let color = '#e53935';
    let reward = 10;
    let armor = 0; // flat damage reduction

    // Special enemies appear more often at higher waves
    if (wave >= 3 && i % 4 === 3) {
      type = 'fast';
      hp = baseHP * 0.6;
      speed = baseSpeed * 1.6;
      radius = 0.22;
      color = '#FF9800';
      reward = 15;
    }
    if (wave >= 5 && i % 5 === 4) {
      type = 'tank';
      hp = baseHP * 3.5;
      speed = baseSpeed * 0.55;
      radius = 0.4;
      color = '#7B1FA2';
      reward = 30;
      armor = 3 + wave; // tanks get increasing armor
    }
    if (wave >= 8 && (i === count - 1 || (wave >= 12 && i === Math.floor(count / 2)))) {
      type = 'boss';
      hp = baseHP * 8;
      speed = baseSpeed * 0.45;
      radius = 0.45;
      color = '#D50000';
      reward = 100;
      armor = 5 + wave * 2; // bosses have heavy armor
    }

    // After wave 10, all enemies get some armor
    if (wave >= 10 && armor === 0) {
      armor = Math.floor((wave - 9) * 1.5);
    }

    enemies.push({ type, hp, maxHp: hp, speed, radius, color, reward, armor, spawnDelay: i * 0.7 });
  }

  return enemies;
}

// ══════════════════════════════════════
//  TOWER DEFENSE GAME
// ══════════════════════════════════════

export class TowerDefenseGame {
  constructor(canvasId, config = {}) {
    this.engine = new GameEngine(canvasId, {
      width: 810,
      height: 780,
      enableMouse: true,
      highScoreKey: 'tower_defense_high_score_v1',
      ...config,
    });

    // Grid dimensions
    this.cols = MAP_COLS;
    this.rows = MAP_ROWS;
    this.cellW = 45;
    this.cellH = 45;
    this.mapOffsetX = 0;
    this.mapOffsetY = 70; // top HUD space
    this.panelY = this.mapOffsetY + this.rows * this.cellH; // bottom panel

    // Colors
    this.colors = {
      bg: '#1a1a2e',
      grass: '#2d5a27',
      grassLight: '#3a6e30',
      path: '#8d6e63',
      pathLight: '#a1887f',
      pathBorder: '#5d4037',
      scenery: '#1e4620',
      start: '#4CAF50',
      end: '#f44336',
      gridLine: 'rgba(255,255,255,0.06)',
      hud: 'rgba(0,0,0,0.7)',
      text: '#ffffff',
      gold: '#FFD700',
      danger: '#f44336',
      panel: '#16213e',
      panelBorder: '#0f3460',
    };

    // Sounds
    this.engine.registerSound('shoot', { frequency: 600, duration: 50, gain: 0.03, type: 'square' });
    this.engine.registerSound('hit', { frequency: 200, duration: 80, gain: 0.03, type: 'sawtooth' });
    this.engine.registerSound('kill', { frequency: 500, duration: 150, gain: 0.04, type: 'triangle' });
    this.engine.registerSound('wave', { frequency: 800, duration: 300, gain: 0.04, type: 'sine' });
    this.engine.registerSound('place', { frequency: 440, duration: 100, gain: 0.04, type: 'triangle' });
    this.engine.registerSound('sell', { frequency: 330, duration: 100, gain: 0.03, type: 'sawtooth' });
    this.engine.registerSound('noMoney', { frequency: 150, duration: 200, gain: 0.04, type: 'square' });
    this.engine.registerSound('leak', { frequency: 100, duration: 400, gain: 0.05, type: 'sawtooth' });
    this.engine.registerSound('gameOver', { frequency: 80, duration: 600, gain: 0.06, type: 'sawtooth' });
    this.engine.registerSound('start', { frequency: 660, duration: 200, gain: 0.04, type: 'triangle' });

    // Effects
    this.particles = new ParticleSystem();
    this.camera = new CameraShake();
    this.timeAccum = 0;

    // Input
    this.engine.onKeyDown = (code) => this._handleKey(code);
    this.engine.onMouseClick = (mx, my) => this._handleClick(mx, my);

    // Extra pointerup listener as fallback for tutorial dismiss
    this.engine.canvas.addEventListener('pointerup', (e) => {
      if (this.tutorial.waitingForClick) {
        const step = this._tutorialStep();
        if (step && step.dismissOnClick) {
          this._advanceTutorial('click');
        }
      }
    });

    // Hover state
    this.hoverCell = null;
    this.engine.onMouseMove = (mx, my) => {
      const col = Math.floor((mx - this.mapOffsetX) / this.cellW);
      const row = Math.floor((my - this.mapOffsetY) / this.cellH);
      if (col >= 0 && col < this.cols && row >= 0 && row < this.rows) {
        this.hoverCell = { col, row };
      } else {
        this.hoverCell = null;
      }
    };

    // Tutorial system
    this.tutorial = {
      active: true,
      step: 0,
      cooldown: 0, // prevent instant double-advance
      // Steps triggered by player actions
      steps: [
        // 0: after game start — explain the map
        { trigger: 'start', title: '🗺️ The Battlefield',
          lines: ['Enemies march along the brown path from START to END.',
                  'If they reach the end, you lose lives! (❤️ top-left)',
                  '',
                  'Click or press any key to continue...'],
          dismissOnClick: true },
        // 1: explain gold & placing towers
        { trigger: 'dismissed', title: '💰 Placing Towers',
          lines: ['You have 200 gold to spend. See it in the top-left.',
                  'Click any GREEN grass tile to place the selected tower.',
                  '',
                  'Try it now — place your first tower!'],
          dismissOn: 'place' },
        // 2: after first tower placed — explain tower types
        { trigger: 'place', title: '🏹 Tower Types',
          lines: ['Great! Press 1-4 or click the bottom panel to switch:',
                  '  🏹 Arrow (50g) — Fast shooter, good all-around',
                  '  💣 Cannon (100g) — Slow but splash damage',
                  '  ❄️ Ice (75g) — Slows enemies down',
                  '  ⚡ Lightning (150g) — Chains to nearby enemies',
                  '',
                  'Place a few more towers, then click to continue...'],
          dismissOnClick: true },
        // 3: explain waves
        { trigger: 'dismissed', title: '🌊 Starting a Wave',
          lines: ['When you\'re ready, press SPACE to send the next wave.',
                  'Enemies will spawn from START and walk toward END.',
                  'Your towers will auto-fire at enemies in range.',
                  '',
                  'Press SPACE now to start Wave 1!'],
          dismissOn: 'wave' },
        // 4: during first wave — explain economy
        { trigger: 'wave', title: '💀 Kill for Gold',
          lines: ['Each enemy you kill earns gold (💰).',
                  'After clearing a wave you get a bonus!',
                  'Spend gold on more towers between waves.',
                  'Hover a tower and press S to sell it (60% refund).',
                  '',
                  'Click or press any key to dismiss — good luck!'],
          dismissOnClick: true },
        // 5: after wave 1 cleared
        { trigger: 'waveClear', title: '✅ Wave Cleared!',
          lines: ['Nice work! You earned a gold bonus.',
                  'Upgrade your defenses, then press SPACE for the next wave.',
                  'Enemies get tougher each wave — plan ahead!',
                  '',
                  'That\'s everything. Click or press any key to close.'],
          dismissOnClick: true },
      ],
      waitingForClick: false,
    };

    // Game state
    this.gs = {
      state: 'READY', // READY, PLAYING, WAVING, GAMEOVER
      gold: 200,
      lives: 20,
      wave: 0,
      score: 0,
      selectedTower: 'arrow',
      towers: [],       // { col, row, type, cooldown, level }
      enemies: [],       // { pathIdx, pathProgress, hp, maxHp, speed, ... }
      projectiles: [],   // { x, y, tx, ty, speed, damage, towerType, target }
      pendingEnemies: [], // enemies waiting to spawn
      waveTimer: 0,
      message: null,
      messageTimer: 0,
    };

    // Start engine
    this.engine.start(
      (dt) => this._update(dt),
      (ctx) => this._render(ctx),
    );
  }

  // ── Show a floating message ──
  _showMessage(text, duration = 2) {
    this.gs.message = text;
    this.gs.messageTimer = duration;
  }

  // ── Tutorial helpers ──
  _tutorialStep() {
    if (!this.tutorial.active || this.tutorial.step >= this.tutorial.steps.length) return null;
    return this.tutorial.steps[this.tutorial.step];
  }

  _advanceTutorial(eventName) {
    const step = this._tutorialStep();
    if (!step) return;
    if (this.tutorial.cooldown > 0) return;
    if (step.dismissOn === eventName || (step.dismissOnClick && eventName === 'click')) {
      this.tutorial.step++;
      this.tutorial.waitingForClick = false;
      this.tutorial.cooldown = 0.35; // prevent instant double-advance
      // Auto-show next step if it triggers on 'dismissed' or same event
      const next = this._tutorialStep();
      if (next && next.trigger === 'dismissed') {
        this.tutorial.waitingForClick = true;
      }
      // If we passed all steps, tutorial done
      if (this.tutorial.step >= this.tutorial.steps.length) {
        this.tutorial.active = false;
      }
    }
  }

  _triggerTutorial(eventName) {
    const step = this._tutorialStep();
    if (!step) return;
    if (step.trigger === eventName) {
      this.tutorial.waitingForClick = true;
    }
  }

  // ── Keyboard ──
  _handleKey(code) {
    const gs = this.gs;

    // Tutorial: any key dismisses click-to-dismiss popups
    if (this.tutorial.waitingForClick) {
      const step = this._tutorialStep();
      if (step && step.dismissOnClick) {
        this._advanceTutorial('click');
        return;
      }
    }

    if (code === 'Space') {
      if (gs.state === 'READY' || gs.state === 'GAMEOVER') {
        this._startGame();
        return;
      }
      if (gs.state === 'PLAYING') {
        this._startWave();
        return;
      }
    }

    if (code === 'KeyP' && (gs.state === 'PLAYING' || gs.state === 'WAVING')) {
      this.engine.togglePause();
      return;
    }

    if (code === 'KeyM') {
      this.engine.toggleMute();
      return;
    }

    // Tower selection by number
    if (code === 'Digit1' || code === 'Numpad1') gs.selectedTower = 'arrow';
    if (code === 'Digit2' || code === 'Numpad2') gs.selectedTower = 'cannon';
    if (code === 'Digit3' || code === 'Numpad3') gs.selectedTower = 'ice';
    if (code === 'Digit4' || code === 'Numpad4') gs.selectedTower = 'lightning';

    // Sell tower with S
    if (code === 'KeyS') {
      if (this.hoverCell) {
        const tower = gs.towers.find(t => t.col === this.hoverCell.col && t.row === this.hoverCell.row);
        if (tower) {
          const def = TOWER_DEFS[tower.type];
          const totalInvested = def.cost + (def.upgradeCost ? def.upgradeCost.slice(1, tower.level || 1).reduce((a, b) => a + b, 0) : 0);
          const refund = Math.floor(totalInvested * 0.6);
          gs.gold += refund;
          gs.towers = gs.towers.filter(t => t !== tower);
          this.engine.playSound('sell');
          this._showMessage(`Sold for ${refund}g`);
        }
      }
    }

    // Upgrade tower with U
    if (code === 'KeyU') {
      this._tryUpgradeTower();
    }
  }

  // ── Mouse click ──
  _handleClick(mx, my) {
    const gs = this.gs;

    // Tutorial click-to-dismiss
    if (this.tutorial.waitingForClick) {
      const step = this._tutorialStep();
      if (step && step.dismissOnClick) {
        this._advanceTutorial('click');
        return;
      }
    }

    if (gs.state !== 'PLAYING' && gs.state !== 'WAVING') return;

    // Check if click is on bottom panel (tower selection)
    if (my >= this.panelY) {
      const types = Object.keys(TOWER_DEFS);
      const panelW = this.engine.config.width;
      const btnW = panelW / types.length;
      const idx = Math.floor(mx / btnW);
      if (idx >= 0 && idx < types.length) {
        gs.selectedTower = types[idx];
      }
      return;
    }

    // Place tower on grid
    const col = Math.floor((mx - this.mapOffsetX) / this.cellW);
    const row = Math.floor((my - this.mapOffsetY) / this.cellH);
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return;

    // Must be buildable
    if (MAP[row][col] !== 0) return;

    // If clicking on existing tower → upgrade it
    const existingTower = gs.towers.find(t => t.col === col && t.row === row);
    if (existingTower) {
      this._tryUpgradeTowerAt(existingTower);
      return;
    }

    const def = TOWER_DEFS[gs.selectedTower];
    if (gs.gold < def.cost) {
      this.engine.playSound('noMoney');
      this._showMessage('Not enough gold!');
      return;
    }

    gs.gold -= def.cost;
    gs.towers.push({
      col, row,
      type: gs.selectedTower,
      level: 1,
      cooldown: 0,
    });
    this.engine.playSound('place');
    this._advanceTutorial('place');
    this._triggerTutorial('place');
  }

  // ── Upgrade tower at hover position (U key) ──
  _tryUpgradeTower() {
    if (!this.hoverCell) return;
    const tower = this.gs.towers.find(t => t.col === this.hoverCell.col && t.row === this.hoverCell.row);
    if (tower) this._tryUpgradeTowerAt(tower);
  }

  // ── Upgrade a specific tower ──
  _tryUpgradeTowerAt(tower) {
    const gs = this.gs;
    const def = TOWER_DEFS[tower.type];
    const lvl = tower.level || 1;

    if (lvl >= MAX_TOWER_LEVEL) {
      this._showMessage('Tower already at max level!');
      return;
    }

    const cost = def.upgradeCost[lvl]; // cost for next level
    if (gs.gold < cost) {
      this.engine.playSound('noMoney');
      this._showMessage(`Need ${cost}g to upgrade (have ${gs.gold}g)`);
      return;
    }

    gs.gold -= cost;
    tower.level = lvl + 1;
    const pos = this._cellCenter(tower.col, tower.row);
    this.particles.createSparkles(pos.x, pos.y, TOWER_DEFS[tower.type].color, 12);
    this.engine.playSound('place');
    this._showMessage(`${def.name} upgraded to Lv.${tower.level}!`);
  }

  // ── Start / reset game ──
  _startGame() {
    const gs = this.gs;
    gs.state = 'PLAYING';
    gs.gold = 200;
    gs.lives = 20;
    gs.wave = 0;
    gs.score = 0;
    gs.towers = [];
    gs.enemies = [];
    gs.projectiles = [];
    gs.pendingEnemies = [];
    gs.selectedTower = 'arrow';
    // Reset map to phase 1
    currentMapPhase = 0;
    evolveMap(0); // force reset
    currentMapPhase = 0;
    for (let r = 0; r < MAP_ROWS; r++) {
      for (let c = 0; c < MAP_COLS; c++) {
        MAP[r][c] = MAP_BASE[r][c];
      }
    }
    const newPath = computePath();
    PATH.length = 0;
    for (const p of newPath) PATH.push(p);
    currentMapPhase = 1;
    this.engine.state.paused = false;
    this.engine.playSound('start');
    this._showMessage('Place towers, then press SPACE to start a wave!');
    this._triggerTutorial('start');
  }

  // ── Start next wave ──
  _startWave() {
    const gs = this.gs;
    if (gs.state !== 'PLAYING') return;
    gs.wave++;

    // Evolve map at certain wave thresholds
    let newPhase = 1;
    if (gs.wave >= 11) newPhase = 3;
    else if (gs.wave >= 6) newPhase = 2;

    if (evolveMap(newPhase)) {
      // Remove towers that now sit on path cells
      gs.towers = gs.towers.filter(t => MAP[t.row][t.col] === 0);
      this._showMessage(`⚠ Map expanded! New paths opened!`);
      this.camera.trigger(10, 0.4);
      this.engine.playSound('wave');
    }

    gs.state = 'WAVING';
    gs.pendingEnemies = getWaveEnemies(gs.wave);
    gs.waveTimer = 0;
    this.engine.playSound('wave');
    this._showMessage(gs.wave === 6 || gs.wave === 11
      ? `Wave ${gs.wave} — Map evolved!`
      : `Wave ${gs.wave}!`);
    this._advanceTutorial('wave');
    this._triggerTutorial('wave');
  }

  // ── Grid center of a cell ──
  _cellCenter(col, row) {
    return {
      x: this.mapOffsetX + col * this.cellW + this.cellW / 2,
      y: this.mapOffsetY + row * this.cellH + this.cellH / 2,
    };
  }

  // ── Enemy pixel position along path ──
  _enemyPos(enemy) {
    const idx = Math.floor(enemy.pathIdx);
    const frac = enemy.pathIdx - idx;
    const a = PATH[Math.min(idx, PATH.length - 1)];
    const b = PATH[Math.min(idx + 1, PATH.length - 1)];
    return {
      x: this.mapOffsetX + (a.c + (b.c - a.c) * frac) * this.cellW + this.cellW / 2,
      y: this.mapOffsetY + (a.r + (b.r - a.r) * frac) * this.cellH + this.cellH / 2,
    };
  }

  // ── UPDATE ──
  _update(dt) {
    const gs = this.gs;
    if (gs.state !== 'PLAYING' && gs.state !== 'WAVING') return;

    this.timeAccum += dt;
    this.particles.update(dt);
    this.camera.update(dt);

    // Tutorial cooldown
    if (this.tutorial.cooldown > 0) {
      this.tutorial.cooldown -= dt;
    }

    // Message timer
    if (gs.messageTimer > 0) {
      gs.messageTimer -= dt;
      if (gs.messageTimer <= 0) gs.message = null;
    }

    // ── Spawn enemies from pending list ──
    if (gs.state === 'WAVING') {
      gs.waveTimer += dt;
      const toSpawn = gs.pendingEnemies.filter(e => e.spawnDelay <= gs.waveTimer);
      for (const template of toSpawn) {
        gs.enemies.push({
          ...template,
          pathIdx: 0,
          slow: 0,
          slowTimer: 0,
        });
      }
      gs.pendingEnemies = gs.pendingEnemies.filter(e => e.spawnDelay > gs.waveTimer);
    }

    // ── Move enemies along path ──
    for (let i = gs.enemies.length - 1; i >= 0; i--) {
      const e = gs.enemies[i];

      // Slow effect
      let speedMult = 1;
      if (e.slowTimer > 0) {
        speedMult = 1 - e.slow;
        e.slowTimer -= dt;
      }

      e.pathIdx += e.speed * speedMult * dt;

      // Reached the end
      if (e.pathIdx >= PATH.length - 1) {
        gs.enemies.splice(i, 1);
        gs.lives--;
        this.engine.playSound('leak');
        this.camera.trigger(6, 0.2);

        if (gs.lives <= 0) {
          gs.state = 'GAMEOVER';
          this.engine.saveHighScore(gs.score);
          this.engine.playSound('gameOver');
          this.camera.trigger(12, 0.5);
          return;
        }
        continue;
      }
    }

    // ── Tower targeting and shooting ──
    for (const tower of gs.towers) {
      // Track nearest enemy angle even while on cooldown (for barrel rotation)
      const tStats = getTowerStats(tower.type, tower.level || 1);
      const tCenter = this._cellCenter(tower.col, tower.row);
      const tRangePx = tStats.range * this.cellW;
      let trackClosest = null;
      let trackDist = Infinity;
      for (const e of gs.enemies) {
        const ep = this._enemyPos(e);
        const d = GameEngine.distance(tCenter.x, tCenter.y, ep.x, ep.y);
        if (d <= tRangePx && d < trackDist) { trackDist = d; trackClosest = e; }
      }
      if (trackClosest) {
        const ep = this._enemyPos(trackClosest);
        tower._angle = Math.atan2(ep.y - tCenter.y, ep.x - tCenter.x);
      }

      tower.cooldown -= dt;
      if (tower.cooldown > 0) continue;

      const stats = getTowerStats(tower.type, tower.level || 1);
      const tc = this._cellCenter(tower.col, tower.row);
      const rangePx = stats.range * this.cellW;

      // Find closest enemy in range
      let closest = null;
      let closestDist = Infinity;

      for (const e of gs.enemies) {
        const ep = this._enemyPos(e);
        const dist = GameEngine.distance(tc.x, tc.y, ep.x, ep.y);
        if (dist <= rangePx && dist < closestDist) {
          closestDist = dist;
          closest = e;
        }
      }

      if (closest) {
        tower.cooldown = 1 / stats.fireRate;
        const ep = this._enemyPos(closest);
        // Track angle for cannon barrel direction
        tower._angle = Math.atan2(ep.y - tc.y, ep.x - tc.x);

        gs.projectiles.push({
          x: tc.x,
          y: tc.y,
          tx: ep.x,
          ty: ep.y,
          speed: stats.projectileSpeed,
          damage: stats.damage,
          towerType: tower.type,
          target: closest,
          color: stats.projectileColor,
        });

        this.engine.playSound('shoot');
      }
    }

    // ── Move projectiles ──
    for (let i = gs.projectiles.length - 1; i >= 0; i--) {
      const p = gs.projectiles[i];

      // If target still alive, track it
      if (p.target && gs.enemies.includes(p.target)) {
        const ep = this._enemyPos(p.target);
        p.tx = ep.x;
        p.ty = ep.y;
      }

      const dx = p.tx - p.x;
      const dy = p.ty - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 8) {
        // Hit!
        this._projectileHit(p, i);
        continue;
      }

      const move = p.speed * dt;
      p.x += (dx / dist) * move;
      p.y += (dy / dist) * move;

      // Timeout safety — remove if too far
      if (p.x < -50 || p.x > this.engine.config.width + 50 ||
          p.y < -50 || p.y > this.engine.config.height + 50) {
        gs.projectiles.splice(i, 1);
      }
    }

    // ── Check wave clear ──
    if (gs.state === 'WAVING' && gs.enemies.length === 0 && gs.pendingEnemies.length === 0) {
      gs.state = 'PLAYING';
      gs.gold += 30 + gs.wave * 8; // wave clear bonus
      gs.score += gs.wave * 50;
      this._showMessage(`Wave ${gs.wave} cleared! +${25 + gs.wave * 5}g bonus`);
      this._advanceTutorial('waveClear');
      this._triggerTutorial('waveClear');
    }
  }

  // ── Projectile hit logic ──
  _projectileHit(p, pIndex) {
    const gs = this.gs;
    gs.projectiles.splice(pIndex, 1);
    const def = TOWER_DEFS[p.towerType];

    // Splash damage (cannon)
    if (def.splash) {
      const splashPx = def.splash * this.cellW;
      for (const e of gs.enemies) {
        const ep = this._enemyPos(e);
        const dist = GameEngine.distance(p.tx, p.ty, ep.x, ep.y);
        if (dist <= splashPx) {
          this._damageEnemy(e, p.damage * (1 - dist / splashPx * 0.5));
        }
      }
      this.particles.createExplosion(p.tx, p.ty, '#FF5722', 15);
      this.camera.trigger(4, 0.1);
    } else if (p.target && gs.enemies.includes(p.target)) {
      this._damageEnemy(p.target, p.damage);
    }

    // Slow (ice)
    if (def.slow && p.target && gs.enemies.includes(p.target)) {
      p.target.slow = def.slow;
      p.target.slowTimer = def.slowDuration;
      this.particles.emit(p.tx, p.ty, 5, '#B3E5FC', { gravity: -0.05, size: 3, life: 0.5 });
    }

    // Chain (lightning)
    if (def.chain && p.target) {
      let lastPos = { x: p.tx, y: p.ty };
      let hits = 0;
      const alreadyHit = new Set([p.target]);

      for (const e of gs.enemies) {
        if (hits >= def.chain) break;
        if (alreadyHit.has(e)) continue;
        const ep = this._enemyPos(e);
        const dist = GameEngine.distance(lastPos.x, lastPos.y, ep.x, ep.y);
        if (dist <= def.range * this.cellW * 0.6) {
          this._damageEnemy(e, p.damage * 0.6);
          alreadyHit.add(e);
          // Lightning arc particles
          this.particles.emit(ep.x, ep.y, 4, '#FFEB3B', { gravity: 0, size: 2, life: 0.3 });
          lastPos = ep;
          hits++;
        }
      }
    }

    // Small hit particles
    this.particles.emit(p.tx, p.ty, 3, p.color, { gravity: 0.1, size: 2, life: 0.3 });
    this.engine.playSound('hit');
  }

  // ── Damage an enemy ──
  _damageEnemy(enemy, damage) {
    const gs = this.gs;
    // Apply armor: reduces damage by flat amount (minimum 1 damage)
    const armor = enemy.armor || 0;
    const effectiveDamage = Math.max(1, damage - armor);
    enemy.hp -= effectiveDamage;

    if (enemy.hp <= 0) {
      const ep = this._enemyPos(enemy);
      this.particles.createExplosion(ep.x, ep.y, enemy.color, 12);
      gs.gold += enemy.reward;
      gs.score += enemy.reward;
      gs.enemies = gs.enemies.filter(e => e !== enemy);
      this.engine.playSound('kill');
    }
  }

  // ══════════════════════════════════════
  //  RENDERING
  // ══════════════════════════════════════

  _render(ctx) {
    const gs = this.gs;
    const w = this.engine.config.width;
    const h = this.engine.config.height;

    // Background
    ctx.fillStyle = this.colors.bg;
    ctx.fillRect(0, 0, w, h);

    // Apply camera shake
    const shake = this.camera.getOffset();
    ctx.save();
    ctx.translate(shake.x, shake.y);

    this._drawMap(ctx);
    this._drawTowers(ctx);
    this._drawEnemies(ctx);
    this._drawProjectiles(ctx);
    this.particles.draw(ctx);

    // Hover preview
    if (this.hoverCell && (gs.state === 'PLAYING' || gs.state === 'WAVING')) {
      this._drawHoverPreview(ctx);
    }

    ctx.restore();

    // UI elements (outside shake)
    drawVignette(ctx, w, h, 0.2);
    this._drawHUD(ctx);
    this._drawTowerPanel(ctx);
    this._drawMessage(ctx);
    this._drawTutorial(ctx);

    // Overlays
    if (gs.state === 'READY') {
      this._drawOverlay(ctx, '🏰 TOWER DEFENSE', 'Press SPACE to start', [
        'Click grass to place — Click tower to upgrade',
        '1-4 — Select tower   U — Upgrade   S — Sell',
        'SPACE — Send next wave',
        'P — Pause   M — Mute',
      ]);
    } else if (this.engine.state.paused) {
      this._drawOverlay(ctx, '⏸ PAUSED', 'Press P to resume');
    } else if (gs.state === 'GAMEOVER') {
      this._drawOverlay(ctx, '💀 GAME OVER', `Wave ${gs.wave} · Score: ${gs.score}`, [
        gs.score >= this.engine.highScore ? '🏆 New High Score!' : `Best: ${this.engine.highScore}`,
        'Press SPACE to play again',
      ]);
    }
  }

  // ── Draw map grid ──
  _drawMap(ctx) {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const x = this.mapOffsetX + c * this.cellW;
        const y = this.mapOffsetY + r * this.cellH;
        const tile = MAP[r][c];

        if (tile === 0) {
          // Buildable grass
          ctx.fillStyle = this.colors.grass;
          ctx.fillRect(x, y, this.cellW, this.cellH);
          // Grass texture
          ctx.fillStyle = this.colors.grassLight;
          const seed = r * 31 + c * 17;
          for (let i = 0; i < 3; i++) {
            const gx = x + ((seed + i * 13) % this.cellW);
            const gy = y + ((seed + i * 7) % this.cellH);
            ctx.fillRect(gx, gy, 2, 4);
          }
        } else if (tile === 1 || tile === 2 || tile === 3) {
          // Path
          ctx.fillStyle = this.colors.path;
          ctx.fillRect(x, y, this.cellW, this.cellH);
          // Path texture
          ctx.fillStyle = this.colors.pathLight;
          ctx.fillRect(x + 4, y + 4, this.cellW - 8, this.cellH - 8);
          // Direction indicators
          ctx.fillStyle = this.colors.pathBorder;
          ctx.fillRect(x, y, this.cellW, 1);
          ctx.fillRect(x, y + this.cellH - 1, this.cellW, 1);
          ctx.fillRect(x, y, 1, this.cellH);
          ctx.fillRect(x + this.cellW - 1, y, 1, this.cellH);

          if (tile === 2) {
            // Start marker
            drawGlow(ctx, x + this.cellW / 2, y + this.cellH / 2, this.cellW, 'rgba(76,175,80', 0.3);
            ctx.fillStyle = this.colors.start;
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('START', x + this.cellW / 2, y + this.cellH / 2);
          }
          if (tile === 3) {
            // End marker
            drawGlow(ctx, x + this.cellW / 2, y + this.cellH / 2, this.cellW, 'rgba(244,67,54', 0.3);
            ctx.fillStyle = this.colors.end;
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('END', x + this.cellW / 2, y + this.cellH / 2);
          }
        } else if (tile === 4) {
          // Scenery (trees/rocks)
          ctx.fillStyle = this.colors.scenery;
          ctx.fillRect(x, y, this.cellW, this.cellH);
          ctx.fillStyle = '#2e7d32';
          ctx.beginPath();
          ctx.arc(x + this.cellW / 2, y + this.cellH / 2, 14, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#1b5e20';
          ctx.beginPath();
          ctx.arc(x + this.cellW / 2 - 3, y + this.cellH / 2 - 3, 10, 0, Math.PI * 2);
          ctx.fill();
        }

        // Grid lines
        ctx.strokeStyle = this.colors.gridLine;
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x, y, this.cellW, this.cellH);
      }
    }
  }

  // ── Draw towers ──
  _drawTowers(ctx) {
    for (const tower of this.gs.towers) {
      const def = TOWER_DEFS[tower.type];
      const cx = this.mapOffsetX + tower.col * this.cellW + this.cellW / 2;
      const cy = this.mapOffsetY + tower.row * this.cellH + this.cellH / 2;
      const s = this.cellW; // cell size for scaling

      ctx.save();
      ctx.translate(cx, cy);

      if (tower.type === 'arrow') {
        this._drawArrowTower(ctx, s, tower);
      } else if (tower.type === 'cannon') {
        this._drawCannonTower(ctx, s, tower);
      } else if (tower.type === 'ice') {
        this._drawIceTower(ctx, s, tower);
      } else if (tower.type === 'lightning') {
        this._drawLightningTower(ctx, s, tower);
      }

      ctx.restore();

      // Shooting glow when cooldown is low
      if (tower.cooldown <= 0.1) {
        drawGlow(ctx, cx, cy, s * 0.7, `rgba(255,255,255`, 0.12);
      }

      // Level stars indicator
      const lvl = tower.level || 1;
      if (lvl > 1) {
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = '#FFD700';
        ctx.fillText('★'.repeat(lvl), cx, cy + s * 0.5 + 2);
      }
    }
  }

  // Arrow tower: wooden watchtower with a pointed roof
  _drawArrowTower(ctx, s, tower) {
    const r = s * 0.38;
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.7, r * 1.1, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    // Stone base
    ctx.fillStyle = '#5d4e37';
    ctx.fillRect(-r * 0.6, -r * 0.2, r * 1.2, r * 0.9);
    ctx.fillStyle = '#4a3d2b';
    ctx.fillRect(-r * 0.65, -r * 0.2, r * 1.3, 3);
    // Wooden body
    ctx.fillStyle = '#8B6914';
    ctx.fillRect(-r * 0.45, -r * 0.8, r * 0.9, r * 0.7);
    // Wood grain
    ctx.strokeStyle = '#7a5c10';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 3; i++) {
      const lx = -r * 0.3 + i * r * 0.3;
      ctx.beginPath();
      ctx.moveTo(lx, -r * 0.75);
      ctx.lineTo(lx, -r * 0.15);
      ctx.stroke();
    }
    // Battlements
    ctx.fillStyle = '#6d5a2e';
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(-r * 0.5 + i * r * 0.35, -r * 0.95, r * 0.2, r * 0.18);
    }
    // Pointed roof
    ctx.fillStyle = '#4CAF50';
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.3);
    ctx.lineTo(-r * 0.55, -r * 0.8);
    ctx.lineTo(r * 0.55, -r * 0.8);
    ctx.closePath();
    ctx.fill();
    // Roof highlight
    ctx.fillStyle = '#66BB6A';
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.3);
    ctx.lineTo(-r * 0.1, -r * 0.85);
    ctx.lineTo(r * 0.25, -r * 0.85);
    ctx.closePath();
    ctx.fill();
    // Window slit
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(-r * 0.07, -r * 0.55, r * 0.14, r * 0.25);
  }

  // Cannon tower: stone fort with barrel
  _drawCannonTower(ctx, s, tower) {
    const r = s * 0.38;
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.7, r * 1.1, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    // Stone base - wider
    ctx.fillStyle = '#616161';
    ctx.fillRect(-r * 0.75, -r * 0.3, r * 1.5, r * 1.0);
    // Stone lines
    ctx.strokeStyle = '#424242';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-r * 0.75, 0); ctx.lineTo(r * 0.75, 0);
    ctx.moveTo(-r * 0.75, r * 0.3); ctx.lineTo(r * 0.75, r * 0.3);
    ctx.moveTo(0, -r * 0.3); ctx.lineTo(0, r * 0.7);
    ctx.stroke();
    // Upper structure
    ctx.fillStyle = '#795548';
    ctx.fillRect(-r * 0.55, -r * 0.7, r * 1.1, r * 0.5);
    // Highlight
    ctx.fillStyle = '#8D6E63';
    ctx.fillRect(-r * 0.55, -r * 0.7, r * 1.1, r * 0.15);
    // Cannon barrel - points toward nearest enemy or right
    ctx.fillStyle = '#333';
    const barrelLen = r * 0.9;
    ctx.save();
    ctx.rotate(tower._angle || 0);
    ctx.fillRect(0, -r * 0.1, barrelLen, r * 0.2);
    // Barrel tip
    ctx.fillStyle = '#555';
    ctx.beginPath();
    ctx.arc(barrelLen, 0, r * 0.13, 0, Math.PI * 2);
    ctx.fill();
    // Barrel ring
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(barrelLen * 0.5, 0, r * 0.13, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    // Cannonball stack (decoration)
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(-r * 0.3, r * 0.15, r * 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(-r * 0.15, r * 0.15, r * 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(-r * 0.22, r * 0.02, r * 0.1, 0, Math.PI * 2); ctx.fill();
  }

  // Ice tower: crystal spire
  _drawIceTower(ctx, s, tower) {
    const r = s * 0.38;
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.7, r * 0.9, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    // Ice base platform
    ctx.fillStyle = '#B3E5FC';
    ctx.beginPath();
    ctx.moveTo(-r * 0.7, r * 0.3);
    ctx.lineTo(r * 0.7, r * 0.3);
    ctx.lineTo(r * 0.5, -r * 0.1);
    ctx.lineTo(-r * 0.5, -r * 0.1);
    ctx.closePath();
    ctx.fill();
    // Main crystal
    const grad = ctx.createLinearGradient(-r * 0.3, -r * 1.4, r * 0.3, r * 0.3);
    grad.addColorStop(0, '#E1F5FE');
    grad.addColorStop(0.3, '#4FC3F7');
    grad.addColorStop(0.7, '#0288D1');
    grad.addColorStop(1, '#01579B');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.4);
    ctx.lineTo(-r * 0.35, -r * 0.1);
    ctx.lineTo(r * 0.35, -r * 0.1);
    ctx.closePath();
    ctx.fill();
    // Crystal facet highlight
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.4);
    ctx.lineTo(-r * 0.1, -r * 0.3);
    ctx.lineTo(r * 0.15, -r * 0.1);
    ctx.closePath();
    ctx.fill();
    // Side crystals
    ctx.fillStyle = '#4FC3F7';
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, -r * 0.5);
    ctx.lineTo(-r * 0.7, -r * 0.1);
    ctx.lineTo(-r * 0.35, -r * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(r * 0.5, -r * 0.6);
    ctx.lineTo(r * 0.35, -r * 0.1);
    ctx.lineTo(r * 0.7, -r * 0.1);
    ctx.closePath();
    ctx.fill();
    // Frost aura
    const auraAlpha = 0.15 + Math.sin(this.timeAccum * 3) * 0.08;
    drawGlow(ctx, 0, -r * 0.4, r * 1.5, 'rgba(100,181,246', auraAlpha);
  }

  // Lightning tower: tesla coil
  _drawLightningTower(ctx, s, tower) {
    const r = s * 0.38;
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.7, r * 1.0, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    // Metal base
    ctx.fillStyle = '#78909C';
    ctx.fillRect(-r * 0.6, 0, r * 1.2, r * 0.5);
    ctx.fillStyle = '#546E7A';
    ctx.fillRect(-r * 0.65, 0, r * 1.3, r * 0.12);
    // Coils (rings)
    ctx.strokeStyle = '#FFB300';
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 4; i++) {
      const cy = -r * 0.1 - i * r * 0.3;
      const rr = r * (0.35 - i * 0.05);
      ctx.beginPath();
      ctx.ellipse(0, cy, rr, rr * 0.35, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Center pillar
    ctx.fillStyle = '#455A64';
    ctx.fillRect(-r * 0.08, -r * 1.1, r * 0.16, r * 1.1);
    // Top sphere
    const sphereGrad = ctx.createRadialGradient(r * 0.05, -r * 1.25, 0, 0, -r * 1.2, r * 0.22);
    sphereGrad.addColorStop(0, '#FFF9C4');
    sphereGrad.addColorStop(0.5, '#FFC107');
    sphereGrad.addColorStop(1, '#FF8F00');
    ctx.fillStyle = sphereGrad;
    ctx.beginPath();
    ctx.arc(0, -r * 1.2, r * 0.22, 0, Math.PI * 2);
    ctx.fill();
    // Electric arcs (animated)
    ctx.strokeStyle = `rgba(255,235,59,${0.5 + Math.sin(this.timeAccum * 15) * 0.4})`;
    ctx.lineWidth = 1.5;
    for (let a = 0; a < 3; a++) {
      const angle = (this.timeAccum * 2 + a * 2.09) % (Math.PI * 2);
      const ex = Math.cos(angle) * r * 0.6;
      const ey = -r * 0.8 + Math.sin(angle) * r * 0.4;
      ctx.beginPath();
      ctx.moveTo(0, -r * 1.2);
      ctx.lineTo(ex * 0.5, (-r * 1.2 + ey) / 2 + (Math.random() - 0.5) * 4);
      ctx.lineTo(ex, ey);
      ctx.stroke();
    }
  }

  // ── Draw enemies ──
  _drawEnemies(ctx) {
    for (const enemy of this.gs.enemies) {
      const pos = this._enemyPos(enemy);
      const r = enemy.radius * this.cellW;

      ctx.save();
      ctx.translate(pos.x, pos.y);

      // Determine movement direction for facing
      const idx = Math.floor(enemy.pathIdx);
      const a = PATH[Math.min(idx, PATH.length - 1)];
      const b = PATH[Math.min(idx + 1, PATH.length - 1)];
      const facing = Math.atan2(b.r - a.r, b.c - a.c);

      if (enemy.type === 'normal') {
        this._drawGoblin(ctx, r, enemy, facing);
      } else if (enemy.type === 'fast') {
        this._drawScout(ctx, r, enemy, facing);
      } else if (enemy.type === 'tank') {
        this._drawGolem(ctx, r, enemy, facing);
      } else if (enemy.type === 'boss') {
        this._drawDragon(ctx, r, enemy, facing);
      }

      ctx.restore();

      // Slow indicator (frost ring)
      if (enemy.slowTimer > 0) {
        ctx.strokeStyle = 'rgba(100,181,246,0.6)';
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r * 1.3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // HP bar
      if (enemy.hp < enemy.maxHp) {
        const barW = r * 2.5;
        const barH = 4;
        const barX = pos.x - barW / 2;
        const barY = pos.y - r - 10;
        const hpRatio = Math.max(0, enemy.hp / enemy.maxHp);

        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

        const hpColor = hpRatio > 0.5 ? '#4CAF50' : hpRatio > 0.25 ? '#FF9800' : '#f44336';
        ctx.fillStyle = hpColor;
        ctx.fillRect(barX, barY, barW * hpRatio, barH);
      }

      // Armor indicator (small shield icon)
      if (enemy.armor > 0) {
        const ax = pos.x + r * 1.1;
        const ay = pos.y - r * 0.5;
        ctx.fillStyle = '#90A4AE';
        ctx.beginPath();
        ctx.moveTo(ax, ay - 5);
        ctx.lineTo(ax - 4, ay - 3);
        ctx.lineTo(ax - 4, ay + 1);
        ctx.quadraticCurveTo(ax, ay + 5, ax, ay + 5);
        ctx.quadraticCurveTo(ax, ay + 5, ax + 4, ay + 1);
        ctx.lineTo(ax + 4, ay - 3);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#546E7A';
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
    }
  }

  // Goblin (normal enemy): green creature with pointy ears
  _drawGoblin(ctx, r, enemy, facing) {
    const bounce = Math.sin(this.timeAccum * 8 + enemy.spawnDelay) * r * 0.08;
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.65, r * 0.7, r * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    // Legs
    const legSwing = Math.sin(this.timeAccum * 10 + enemy.spawnDelay) * 0.3;
    ctx.fillStyle = '#558B2F';
    ctx.fillRect(-r * 0.35, r * 0.15 + bounce, r * 0.2, r * 0.45);
    ctx.fillRect(r * 0.15, r * 0.15 + bounce, r * 0.2, r * 0.45);
    // Body
    ctx.fillStyle = '#7CB342';
    ctx.beginPath();
    ctx.ellipse(0, bounce, r * 0.55, r * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Belly
    ctx.fillStyle = '#9CCC65';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.05 + bounce, r * 0.3, r * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    // Head
    ctx.fillStyle = '#7CB342';
    ctx.beginPath();
    ctx.arc(0, -r * 0.45 + bounce, r * 0.35, 0, Math.PI * 2);
    ctx.fill();
    // Pointy ears
    ctx.fillStyle = '#689F38';
    ctx.beginPath();
    ctx.moveTo(-r * 0.35, -r * 0.45 + bounce);
    ctx.lineTo(-r * 0.6, -r * 0.75 + bounce);
    ctx.lineTo(-r * 0.15, -r * 0.5 + bounce);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(r * 0.35, -r * 0.45 + bounce);
    ctx.lineTo(r * 0.6, -r * 0.75 + bounce);
    ctx.lineTo(r * 0.15, -r * 0.5 + bounce);
    ctx.closePath();
    ctx.fill();
    // Eyes (angry)
    ctx.fillStyle = '#FFEB3B';
    ctx.beginPath(); ctx.arc(-r * 0.12, -r * 0.5 + bounce, r * 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.12, -r * 0.5 + bounce, r * 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath(); ctx.arc(-r * 0.12, -r * 0.48 + bounce, r * 0.05, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.12, -r * 0.48 + bounce, r * 0.05, 0, Math.PI * 2); ctx.fill();
    // Angry eyebrows
    ctx.strokeStyle = '#33691E';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-r * 0.22, -r * 0.62 + bounce);
    ctx.lineTo(-r * 0.03, -r * 0.58 + bounce);
    ctx.moveTo(r * 0.22, -r * 0.62 + bounce);
    ctx.lineTo(r * 0.03, -r * 0.58 + bounce);
    ctx.stroke();
  }

  // Scout (fast enemy): sleek orange runner
  _drawScout(ctx, r, enemy, facing) {
    const bounce = Math.sin(this.timeAccum * 14 + enemy.spawnDelay) * r * 0.1;
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.55, r * 0.6, r * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
    // Legs (fast stride)
    ctx.fillStyle = '#E65100';
    const stride = Math.sin(this.timeAccum * 16 + enemy.spawnDelay) * r * 0.3;
    ctx.fillRect(-r * 0.15 + stride * 0.5, r * 0.1 + bounce, r * 0.12, r * 0.4);
    ctx.fillRect(r * 0.05 - stride * 0.5, r * 0.1 + bounce, r * 0.12, r * 0.4);
    // Slim body
    ctx.fillStyle = '#FF9800';
    ctx.beginPath();
    ctx.ellipse(0, bounce, r * 0.35, r * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Speed lines
    ctx.strokeStyle = 'rgba(255,152,0,0.3)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const ly = -r * 0.2 + i * r * 0.2 + bounce;
      ctx.beginPath();
      ctx.moveTo(-r * 0.8, ly);
      ctx.lineTo(-r * 0.5, ly);
      ctx.stroke();
    }
    // Head (smaller, aerodynamic)
    ctx.fillStyle = '#FF9800';
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.4 + bounce, r * 0.25, r * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    // Goggles
    ctx.fillStyle = '#333';
    ctx.fillRect(-r * 0.25, -r * 0.45 + bounce, r * 0.5, r * 0.12);
    ctx.fillStyle = '#F44336';
    ctx.beginPath(); ctx.arc(-r * 0.1, -r * 0.4 + bounce, r * 0.07, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.1, -r * 0.4 + bounce, r * 0.07, 0, Math.PI * 2); ctx.fill();
    // Scarf flowing behind
    ctx.fillStyle = '#F44336';
    ctx.beginPath();
    ctx.moveTo(-r * 0.1, -r * 0.25 + bounce);
    ctx.quadraticCurveTo(-r * 0.5, -r * 0.1 + bounce + stride * 0.3, -r * 0.7, r * 0.1 + bounce);
    ctx.lineTo(-r * 0.5, -r * 0.05 + bounce);
    ctx.quadraticCurveTo(-r * 0.35, -r * 0.15 + bounce, -r * 0.05, -r * 0.2 + bounce);
    ctx.closePath();
    ctx.fill();
  }

  // Golem (tank enemy): big rocky creature
  _drawGolem(ctx, r, enemy, facing) {
    const bounce = Math.sin(this.timeAccum * 4 + enemy.spawnDelay) * r * 0.04;
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.75, r * 0.9, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    // Thick legs
    ctx.fillStyle = '#4A148C';
    ctx.fillRect(-r * 0.45, r * 0.1 + bounce, r * 0.3, r * 0.5);
    ctx.fillRect(r * 0.15, r * 0.1 + bounce, r * 0.3, r * 0.5);
    // Massive body
    const bodyGrad = ctx.createRadialGradient(0, bounce, 0, 0, bounce, r * 0.7);
    bodyGrad.addColorStop(0, '#9C27B0');
    bodyGrad.addColorStop(1, '#4A148C');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(0, bounce, r * 0.7, r * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    // Armor plates
    ctx.fillStyle = '#6A1B9A';
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.05 + bounce, r * 0.55, r * 0.35, 0, 0, Math.PI);
    ctx.fill();
    // Rocky texture cracks
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-r * 0.3, -r * 0.1 + bounce); ctx.lineTo(-r * 0.1, r * 0.15 + bounce);
    ctx.moveTo(r * 0.2, -r * 0.15 + bounce); ctx.lineTo(r * 0.35, r * 0.1 + bounce);
    ctx.stroke();
    // Head (small on big body)
    ctx.fillStyle = '#7B1FA2';
    ctx.beginPath();
    ctx.arc(0, -r * 0.5 + bounce, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
    // Glowing eyes
    ctx.fillStyle = '#E040FB';
    ctx.beginPath(); ctx.arc(-r * 0.1, -r * 0.52 + bounce, r * 0.08, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.1, -r * 0.52 + bounce, r * 0.08, 0, Math.PI * 2); ctx.fill();
    drawGlow(ctx, -r * 0.1, -r * 0.52 + bounce, r * 0.2, 'rgba(224,64,251', 0.3);
    drawGlow(ctx, r * 0.1, -r * 0.52 + bounce, r * 0.2, 'rgba(224,64,251', 0.3);
    // Arms
    ctx.fillStyle = '#6A1B9A';
    ctx.beginPath();
    ctx.ellipse(-r * 0.65, -r * 0.05 + bounce, r * 0.18, r * 0.35, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(r * 0.65, -r * 0.05 + bounce, r * 0.18, r * 0.35, -0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Dragon (boss): winged creature with fire
  _drawDragon(ctx, r, enemy, facing) {
    const bounce = Math.sin(this.timeAccum * 5 + enemy.spawnDelay) * r * 0.06;
    const wingFlap = Math.sin(this.timeAccum * 6) * 0.3;
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.8, r * 1.1, r * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    // Wings
    ctx.fillStyle = '#B71C1C';
    ctx.save();
    // Left wing
    ctx.save();
    ctx.translate(-r * 0.3, -r * 0.3 + bounce);
    ctx.rotate(-0.4 - wingFlap);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-r * 0.8, -r * 0.6, -r * 1.2, -r * 0.1);
    ctx.quadraticCurveTo(-r * 0.6, r * 0.1, 0, r * 0.15);
    ctx.closePath();
    ctx.fill();
    // Wing membrane
    ctx.fillStyle = '#C62828';
    ctx.beginPath();
    ctx.moveTo(-r * 0.1, 0);
    ctx.quadraticCurveTo(-r * 0.5, -r * 0.3, -r * 0.9, -r * 0.05);
    ctx.lineTo(-r * 0.4, r * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // Right wing
    ctx.save();
    ctx.translate(r * 0.3, -r * 0.3 + bounce);
    ctx.rotate(0.4 + wingFlap);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(r * 0.8, -r * 0.6, r * 1.2, -r * 0.1);
    ctx.quadraticCurveTo(r * 0.6, r * 0.1, 0, r * 0.15);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#C62828';
    ctx.beginPath();
    ctx.moveTo(r * 0.1, 0);
    ctx.quadraticCurveTo(r * 0.5, -r * 0.3, r * 0.9, -r * 0.05);
    ctx.lineTo(r * 0.4, r * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.restore();
    // Tail
    ctx.fillStyle = '#C62828';
    ctx.beginPath();
    ctx.moveTo(-r * 0.1, r * 0.35 + bounce);
    ctx.quadraticCurveTo(-r * 0.6, r * 0.7 + bounce, -r * 0.8, r * 0.5 + bounce);
    ctx.quadraticCurveTo(-r * 0.5, r * 0.5 + bounce, -r * 0.05, r * 0.25 + bounce);
    ctx.closePath();
    ctx.fill();
    // Body
    const bodyGrad = ctx.createRadialGradient(0, bounce, 0, 0, bounce, r * 0.65);
    bodyGrad.addColorStop(0, '#F44336');
    bodyGrad.addColorStop(1, '#B71C1C');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(0, bounce, r * 0.55, r * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Belly scales
    ctx.fillStyle = '#FFAB91';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.08 + bounce, r * 0.3, r * 0.25, 0, 0, Math.PI);
    ctx.fill();
    // Scale lines on belly
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 0.7;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-r * 0.2, r * (0.0 + i * 0.08) + bounce);
      ctx.lineTo(r * 0.2, r * (0.0 + i * 0.08) + bounce);
      ctx.stroke();
    }
    // Head
    ctx.fillStyle = '#D32F2F';
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.5 + bounce, r * 0.3, r * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    // Horns
    ctx.fillStyle = '#4E342E';
    ctx.beginPath();
    ctx.moveTo(-r * 0.2, -r * 0.65 + bounce);
    ctx.lineTo(-r * 0.35, -r * 0.95 + bounce);
    ctx.lineTo(-r * 0.1, -r * 0.6 + bounce);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(r * 0.2, -r * 0.65 + bounce);
    ctx.lineTo(r * 0.35, -r * 0.95 + bounce);
    ctx.lineTo(r * 0.1, -r * 0.6 + bounce);
    ctx.closePath();
    ctx.fill();
    // Eyes (fiery)
    ctx.fillStyle = '#FF6F00';
    ctx.beginPath(); ctx.arc(-r * 0.12, -r * 0.52 + bounce, r * 0.08, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.12, -r * 0.52 + bounce, r * 0.08, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFEB3B';
    ctx.beginPath(); ctx.arc(-r * 0.12, -r * 0.52 + bounce, r * 0.04, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.12, -r * 0.52 + bounce, r * 0.04, 0, Math.PI * 2); ctx.fill();
    // Nostrils with fire breath
    ctx.fillStyle = '#FF6F00';
    const fireFlicker = Math.sin(this.timeAccum * 12) * r * 0.1;
    ctx.beginPath();
    ctx.moveTo(-r * 0.05, -r * 0.38 + bounce);
    ctx.quadraticCurveTo(-r * 0.15, -r * 0.2 + bounce + fireFlicker, -r * 0.05, -r * 0.15 + bounce);
    ctx.quadraticCurveTo(0, -r * 0.25 + bounce, r * 0.05, -r * 0.15 + bounce);
    ctx.quadraticCurveTo(r * 0.15, -r * 0.2 + bounce - fireFlicker, r * 0.05, -r * 0.38 + bounce);
    ctx.closePath();
    ctx.fill();
    // Crown
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.moveTo(-r * 0.2, -r * 0.72 + bounce);
    ctx.lineTo(-r * 0.25, -r * 0.9 + bounce);
    ctx.lineTo(-r * 0.1, -r * 0.78 + bounce);
    ctx.lineTo(0, -r * 0.92 + bounce);
    ctx.lineTo(r * 0.1, -r * 0.78 + bounce);
    ctx.lineTo(r * 0.25, -r * 0.9 + bounce);
    ctx.lineTo(r * 0.2, -r * 0.72 + bounce);
    ctx.closePath();
    ctx.fill();
    // Crown glow
    drawGlow(ctx, 0, -r * 0.85 + bounce, r * 0.4, 'rgba(255,215,0', 0.25);
  }

  // ── Draw projectiles ──
  _drawProjectiles(ctx) {
    for (const p of this.gs.projectiles) {
      const angle = Math.atan2(p.ty - p.y, p.tx - p.x);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(angle);

      if (p.towerType === 'arrow') {
        // Arrow shape
        ctx.fillStyle = '#5D4037';
        ctx.fillRect(-6, -1, 10, 2);
        ctx.fillStyle = '#F44336';
        ctx.beginPath();
        ctx.moveTo(6, 0);
        ctx.lineTo(2, -3);
        ctx.lineTo(2, 3);
        ctx.closePath();
        ctx.fill();
        // Feather
        ctx.fillStyle = '#BDBDBD';
        ctx.beginPath();
        ctx.moveTo(-6, 0);
        ctx.lineTo(-8, -2.5);
        ctx.lineTo(-5, 0);
        ctx.lineTo(-8, 2.5);
        ctx.closePath();
        ctx.fill();
      } else if (p.towerType === 'cannon') {
        // Cannonball
        ctx.rotate(-angle); // undo rotation, cannonball is round
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.arc(-1.5, -1.5, 2, 0, Math.PI * 2);
        ctx.fill();
        drawGlow(ctx, 0, 0, 12, 'rgba(255,152,0', 0.25);
      } else if (p.towerType === 'ice') {
        // Ice shard
        ctx.fillStyle = '#4FC3F7';
        ctx.beginPath();
        ctx.moveTo(5, 0);
        ctx.lineTo(-2, -3);
        ctx.lineTo(-4, 0);
        ctx.lineTo(-2, 3);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath();
        ctx.moveTo(4, 0);
        ctx.lineTo(0, -1.5);
        ctx.lineTo(-2, 0);
        ctx.closePath();
        ctx.fill();
        drawGlow(ctx, 0, 0, 10, 'rgba(100,181,246', 0.3);
      } else if (p.towerType === 'lightning') {
        // Lightning bolt
        ctx.rotate(-angle);
        ctx.strokeStyle = '#FFEB3B';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-4, -4);
        ctx.lineTo(1, -1);
        ctx.lineTo(-1, 1);
        ctx.lineTo(4, 4);
        ctx.stroke();
        drawGlow(ctx, 0, 0, 14, 'rgba(255,235,59', 0.4);
      } else {
        // Fallback circle
        ctx.rotate(-angle);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  // ── Draw hover preview ──
  _drawHoverPreview(ctx) {
    const { col, row } = this.hoverCell;
    const x = this.mapOffsetX + col * this.cellW;
    const y = this.mapOffsetY + row * this.cellH;
    const tile = MAP[row][col];
    const hasTower = this.gs.towers.find(t => t.col === col && t.row === row);
    const def = TOWER_DEFS[this.gs.selectedTower];
    const canBuild = tile === 0 && !hasTower;

    // Highlight cell
    ctx.fillStyle = canBuild ? 'rgba(76,175,80,0.25)' : 'rgba(244,67,54,0.2)';
    ctx.fillRect(x, y, this.cellW, this.cellH);
    ctx.strokeStyle = canBuild ? '#4CAF50' : '#f44336';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, this.cellW - 2, this.cellH - 2);

    // Range circle
    if (canBuild) {
      const cx = x + this.cellW / 2;
      const cy = y + this.cellH / 2;
      const rangePx = def.range * this.cellW;
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(cx, cy, rangePx, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Ghost tower
      ctx.globalAlpha = 0.5;
      ctx.font = `${this.cellW * 0.4}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(def.icon, cx, cy);
      ctx.globalAlpha = 1;
    }

    // If hovering existing tower, show its range and upgrade info
    if (hasTower) {
      const tdef = TOWER_DEFS[hasTower.type];
      const tStats = getTowerStats(hasTower.type, hasTower.level || 1);
      const cx = x + this.cellW / 2;
      const cy = y + this.cellH / 2;
      const rng = tStats.range * this.cellW;
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(cx, cy, rng, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Info tooltip
      const lvl = hasTower.level || 1;
      const totalInvested = tdef.cost + tdef.upgradeCost.slice(1, lvl).reduce((a, b) => a + b, 0);
      const sellPrice = Math.floor(totalInvested * 0.6);

      // Background tooltip box
      const tipX = cx;
      const tipY = y + this.cellH + 5;
      const tipW = 130;
      const tipH = lvl < MAX_TOWER_LEVEL ? 52 : 40;
      const tx = Math.max(tipW / 2, Math.min(tipX, this.engine.config.width - tipW / 2));
      drawRoundedRect(ctx, tx - tipW / 2, tipY, tipW, tipH, 5);
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      ctx.fill();
      ctx.strokeStyle = tdef.color;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      // Level and stars
      const stars = '★'.repeat(lvl) + '☆'.repeat(MAX_TOWER_LEVEL - lvl);
      ctx.font = 'bold 11px Arial';
      ctx.fillStyle = '#FFD700';
      ctx.fillText(`${tdef.name} ${stars}`, tx, tipY + 4);

      // Stats line
      ctx.font = '9px Arial';
      ctx.fillStyle = '#BBB';
      ctx.fillText(`DMG:${Math.round(tStats.damage)}  RNG:${tStats.range.toFixed(1)}  SPD:${tStats.fireRate.toFixed(1)}`, tx, tipY + 18);

      // Upgrade / max level
      if (lvl < MAX_TOWER_LEVEL) {
        const upgCost = tdef.upgradeCost[lvl];
        const canAfford = this.gs.gold >= upgCost;
        ctx.font = 'bold 10px Arial';
        ctx.fillStyle = canAfford ? '#4CAF50' : '#f44336';
        ctx.fillText(`Click/U: Upgrade → Lv.${lvl + 1} (${upgCost}g)`, tx, tipY + 32);
      } else {
        ctx.font = 'bold 10px Arial';
        ctx.fillStyle = '#FFD700';
        ctx.fillText('MAX LEVEL', tx, tipY + 32);
      }

      // Sell hint
      ctx.font = '9px Arial';
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillText(`S: sell (${sellPrice}g)`, tx, tipY + tipH - 8);
    }
  }

  // ── HUD (top bar) ──
  _drawHUD(ctx) {
    const gs = this.gs;
    const w = this.engine.config.width;

    // HUD background
    ctx.fillStyle = this.colors.hud;
    ctx.fillRect(0, 0, w, this.mapOffsetY);

    ctx.font = 'bold 16px Arial';
    ctx.textBaseline = 'middle';
    const y = this.mapOffsetY / 2;

    // Gold
    ctx.textAlign = 'left';
    ctx.fillStyle = this.colors.gold;
    ctx.fillText(`💰 ${gs.gold}`, 12, y);

    // Lives
    const livesColor = gs.lives > 10 ? '#4CAF50' : gs.lives > 5 ? '#FF9800' : '#f44336';
    ctx.fillStyle = livesColor;
    ctx.fillText(`❤️ ${gs.lives}`, 130, y);

    // Wave
    ctx.fillStyle = this.colors.text;
    ctx.textAlign = 'center';
    ctx.fillText(`Wave: ${gs.wave}`, w / 2, y - 12);
    ctx.font = '12px Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    if (gs.state === 'PLAYING') {
      ctx.fillText('Press SPACE for next wave', w / 2, y + 12);
    } else if (gs.state === 'WAVING') {
      ctx.fillText(`Enemies remaining: ${gs.enemies.length + gs.pendingEnemies.length}`, w / 2, y + 12);
    }

    // Score
    ctx.textAlign = 'right';
    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = this.colors.text;
    ctx.fillText(`Score: ${gs.score}`, w - 12, y - 10);
    ctx.font = '12px Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText(`Best: ${this.engine.highScore}`, w - 12, y + 10);
  }

  // ── Tower selection panel (bottom) ──
  _drawTowerPanel(ctx) {
    const gs = this.gs;
    const w = this.engine.config.width;
    const panelH = this.engine.config.height - this.panelY;
    const y = this.panelY;

    // Panel background
    ctx.fillStyle = this.colors.panel;
    ctx.fillRect(0, y, w, panelH);
    ctx.strokeStyle = this.colors.panelBorder;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();

    const types = Object.keys(TOWER_DEFS);
    const btnW = w / types.length;

    for (let i = 0; i < types.length; i++) {
      const type = types[i];
      const def = TOWER_DEFS[type];
      const bx = i * btnW;
      const selected = gs.selectedTower === type;
      const canAfford = gs.gold >= def.cost;

      // Selection highlight
      if (selected) {
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(bx, y, btnW, panelH);
        ctx.strokeStyle = def.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(bx + 2, y + 2, btnW - 4, panelH - 4);
      }

      // Icon
      ctx.font = '22px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = canAfford ? 1 : 0.4;
      ctx.fillText(def.icon, bx + btnW / 2, y + 18);

      // Name and cost
      ctx.font = 'bold 11px Arial';
      ctx.fillStyle = canAfford ? def.color : '#666';
      ctx.fillText(def.name, bx + btnW / 2, y + 38);

      ctx.font = '10px Arial';
      ctx.fillStyle = canAfford ? this.colors.gold : '#666';
      ctx.fillText(`${def.cost}g`, bx + btnW / 2, y + 52);

      // Key hint
      ctx.font = '9px Arial';
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillText(`[${def.key}]`, bx + btnW / 2, y + 65);

      ctx.globalAlpha = 1;

      // Separator
      if (i < types.length - 1) {
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(bx + btnW, y + 5);
        ctx.lineTo(bx + btnW, y + panelH - 5);
        ctx.stroke();
      }
    }
  }

  // ── Floating message ──
  _drawMessage(ctx) {
    const gs = this.gs;
    if (!gs.message) return;

    const alpha = Math.min(1, gs.messageTimer * 2);
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const mx = this.engine.config.width / 2;
    const my = this.mapOffsetY + 30;

    // Background
    const metrics = ctx.measureText(gs.message);
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    const pad = 10;
    ctx.fillRect(mx - metrics.width / 2 - pad, my - 14, metrics.width + pad * 2, 28);

    ctx.fillStyle = this.colors.gold;
    ctx.fillText(gs.message, mx, my);
    ctx.globalAlpha = 1;
  }

  // ── Tutorial pop-up ──
  _drawTutorial(ctx) {
    const step = this._tutorialStep();
    if (!step || !this.tutorial.waitingForClick) return;

    const w = this.engine.config.width;
    const h = this.engine.config.height;

    // Dim background
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, w, h);

    // Popup box
    const boxW = 420;
    const lineH = 22;
    const titleH = 36;
    const padX = 24;
    const padY = 18;
    const boxH = titleH + padY * 2 + step.lines.length * lineH + 10;
    const bx = (w - boxW) / 2;
    const by = (h - boxH) / 2 - 20;

    // Box shadow
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.roundRect(bx + 4, by + 4, boxW, boxH, 12);
    ctx.fill();

    // Box background
    const grad = ctx.createLinearGradient(bx, by, bx, by + boxH);
    grad.addColorStop(0, '#1a2744');
    grad.addColorStop(1, '#0f1b30');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(bx, by, boxW, boxH, 12);
    ctx.fill();

    // Border
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(bx, by, boxW, boxH, 12);
    ctx.stroke();

    // Pulsing indicator dot
    const pulse = 0.6 + Math.sin(this.timeAccum * 4) * 0.4;
    ctx.fillStyle = `rgba(255, 215, 0, ${pulse})`;
    ctx.beginPath();
    ctx.arc(bx + boxW - 16, by + 16, 5, 0, Math.PI * 2);
    ctx.fill();

    // Step counter
    ctx.font = '10px Arial';
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillText(`${this.tutorial.step + 1} / ${this.tutorial.steps.length}`, bx + boxW - padX, by + boxH - 10);

    // Title
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#FFD700';
    ctx.fillText(step.title, w / 2, by + padY);

    // Lines
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    let ly = by + padY + titleH;
    for (const line of step.lines) {
      if (line === '') {
        ly += lineH * 0.4;
        continue;
      }
      // Highlight action hint lines differently
      const isHint = line.startsWith('Try') || line.startsWith('Press') || line.startsWith('Place') || line.startsWith('Click') || line.startsWith('That');
      ctx.fillStyle = isHint ? 'rgba(255,215,0,0.85)' : 'rgba(255,255,255,0.8)';
      ctx.fillText(line, w / 2, ly);
      ly += lineH;
    }
  }

  // ── Overlay screen ──
  _drawOverlay(ctx, title, subtitle, lines = []) {
    const w = this.engine.config.width;
    const h = this.engine.config.height;

    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2;
    let y = h * 0.3;

    drawTextWithOutline(ctx, title, cx, y, 36, this.colors.gold, '#000', 4);
    y += 50;

    ctx.font = '18px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = this.colors.text;
    ctx.fillText(subtitle, cx, y);
    y += 40;

    ctx.font = '14px Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for (const line of lines) {
      ctx.fillText(line, cx, y);
      y += 24;
    }
  }
}
