// ═══════════════════════════════════════════════════════════════
//  SNAKE — Configuration & Data Layer
//  All game constants, level definitions, food types, powerups
// ═══════════════════════════════════════════════════════════════

// ── Grid & Canvas ────────────────────────────────────────────────
const CFG = Object.freeze({
  COLS:      20,
  ROWS:      20,
  CELL:      18,
  FPS:       60,

  // Colours used both in CSS and Canvas (must stay in sync with CSS vars)
  BG:        '#f4f1ec',
  FG:        '#111110',
  MUTED:     '#a8a49d',
  GRID:      'rgba(17,17,16,0.04)',

  // Physics limits
  SPEED_MIN: 50,
  SPEED_MAX: 200,

  // Combo timing: ms window to chain a combo
  COMBO_WINDOW: 2200,
  COMBO_MAX:    8,

  // Powerup spawn chance per food eaten (after score > POWERUP_MIN_SCORE)
  POWERUP_CHANCE:    0.10,
  POWERUP_MIN_SCORE: 3,

  // Particle limits
  PARTICLE_MAX: 120,

  // localStorage key prefix
  STORAGE_KEY: 'snake_v2_',
});

// ── Game Modes ───────────────────────────────────────────────────
const MODES = Object.freeze({
  classic: {
    id:        'classic',
    label:     'Clássico',
    baseSpeed: 145,
    speedUp:   3,
    wrap:      false,
    desc:      'Morra nas paredes',
  },
  wrap: {
    id:        'wrap',
    label:     'Portal',
    baseSpeed: 130,
    speedUp:   2,
    wrap:      true,
    desc:      'Atravesse as paredes',
  },
  speed: {
    id:        'speed',
    label:     'Veloz',
    baseSpeed: 80,
    speedUp:   6,
    wrap:      false,
    desc:      'Bem mais rápido',
  },
  challenge: {
    id:        'challenge',
    label:     'Desafio',
    baseSpeed: 140,
    speedUp:   2,
    wrap:      false,
    desc:      'Fases com obstáculos',
  },
});

// ── Food Types ───────────────────────────────────────────────────
const FOOD_TYPES = Object.freeze([
  { type: 'apple',   weight: 55, pts: 1,  shape: 'circle',  r: 4, ttl: null, trail: false, label: 'Maçã' },
  { type: 'diamond', weight: 22, pts: 3,  shape: 'diamond', r: 5, ttl: null, trail: false, label: 'Diamante' },
  { type: 'star',    weight: 12, pts: 5,  shape: 'star',    r: 5, ttl: 8000, trail: true,  label: 'Estrela' },
  { type: 'bolt',    weight: 8,  pts: 2,  shape: 'bolt',    r: 5, ttl: null, trail: false, label: 'Raio' },
  { type: 'skull',   weight: 3,  pts: 10, shape: 'skull',   r: 6, ttl: 5000, trail: true,  label: 'Caveira' },
]);

// ── Powerup Types ────────────────────────────────────────────────
const POWERUP_TYPES = Object.freeze([
  { kind: 'slow',   label: 'S',  duration: 7000, desc: 'Reduz velocidade por 7s' },
  { kind: 'ghost',  label: 'G',  duration: 5000, desc: 'Atravessa o próprio corpo' },
  { kind: 'magnet', label: 'M',  duration: 6000, desc: 'Atrai comida próxima' },
  { kind: 'x2',     label: '×2', duration: 8000, desc: 'Dobra pontos por 8s' },
]);

// ── Level Helpers ────────────────────────────────────────────────
function hLine(y, x1, x2) {
  const cells = [];
  for (let x = x1; x <= x2; x++) cells.push({ x, y });
  return cells;
}

function vLine(x, y1, y2) {
  const cells = [];
  for (let y = y1; y <= y2; y++) cells.push({ x, y });
  return cells;
}

function rect(x, y, w, h) {
  const cells = [];
  for (let i = x; i < x + w; i++) { cells.push({ x: i, y }); cells.push({ x: i, y: y + h - 1 }); }
  for (let j = y + 1; j < y + h - 1; j++) { cells.push({ x, y: j }); cells.push({ x: x+w-1, y: j }); }
  return cells;
}

function cross(cx, cy, arm) {
  const cells = [];
  for (let i = -arm; i <= arm; i++) { cells.push({ x: cx + i, y: cy }); cells.push({ x: cx, y: cy + i }); }
  return cells;
}

function scatter(pairs) {
  return pairs.map(([x, y]) => ({ x, y }));
}

// ── Level Definitions ────────────────────────────────────────────
const LEVELS = Object.freeze([
  { id: 1,  label: 'Campo Aberto', target: 5,  timeLimit: null,  bonus: 10,  speedOverride: 160, walls: [], message: 'Bem-vindo ao Snake. Come 5 para avançar.', bgVariant: 0 },
  { id: 2,  label: 'Colunas',      target: 8,  timeLimit: null,  bonus: 15,  speedOverride: 150, walls: [...vLine(5,3,8), ...vLine(14,11,16)], message: 'Desvie das colunas.', bgVariant: 1 },
  { id: 3,  label: 'Cruz Central', target: 10, timeLimit: null,  bonus: 20,  speedOverride: 145, walls: [...cross(10,10,3)], message: 'A cruz bloqueia o centro.', bgVariant: 1 },
  { id: 4,  label: 'Corredor',     target: 12, timeLimit: 45000, bonus: 25,  speedOverride: 140, walls: [...hLine(6,1,12), ...hLine(13,7,18)], message: '45 segundos. Comida some rápido.', bgVariant: 2 },
  { id: 5,  label: 'Labirinto I',  target: 14, timeLimit: null,  bonus: 35,  speedOverride: 135, walls: [...hLine(4,2,8), ...hLine(4,12,17), ...vLine(9,4,9), ...vLine(10,10,15), ...hLine(15,3,9), ...hLine(15,11,17)], message: 'Labirinto. Não entre em becos sem saída.', bgVariant: 2 },
  { id: 6,  label: 'Caixas',       target: 16, timeLimit: null,  bonus: 40,  speedOverride: 125, walls: [...rect(2,2,5,5), ...rect(13,2,5,5), ...rect(2,13,5,5), ...rect(13,13,5,5)], message: 'Quatro caixas. Fique nos corredores.', bgVariant: 3 },
  { id: 7,  label: 'Espiral',      target: 18, timeLimit: 60000, bonus: 50,  speedOverride: 120, walls: [...hLine(3,3,16), ...vLine(16,3,16), ...hLine(16,3,16), ...vLine(3,4,15), ...hLine(6,6,13), ...vLine(13,6,13), ...hLine(13,6,12)], message: '60s. Espiral apertada.', bgVariant: 3 },
  { id: 8,  label: 'Xadrez',       target: 20, timeLimit: null,  bonus: 60,  speedOverride: 115, walls: scatter([[3,3],[3,7],[3,11],[3,15],[3,19],[7,1],[7,5],[7,9],[7,13],[7,17],[11,3],[11,7],[11,11],[11,15],[11,19],[15,1],[15,5],[15,9],[15,13],[15,17],[19,3],[19,7],[19,11],[19,15],[19,19]].filter(([x,y]) => x < CFG.COLS && y < CFG.ROWS)), message: 'Padrão xadrez. Cuidado com os cantos.', bgVariant: 4 },
  { id: 9,  label: 'Labirinto II', target: 22, timeLimit: 75000, bonus: 75,  speedOverride: 105, walls: [...hLine(2,0,18), ...hLine(17,1,19), ...vLine(0,2,16), ...vLine(19,2,17), ...vLine(5,2,12), ...hLine(7,5,14), ...vLine(14,7,17), ...hLine(12,5,14), ...vLine(9,2,6), ...vLine(9,12,17)], message: '75s. Labirinto denso.', bgVariant: 4 },
  { id: 10, label: 'Inferno',      target: 25, timeLimit: 90000, bonus: 100, speedOverride: 95,  walls: [...rect(1,1,18,18), ...cross(10,10,4), ...hLine(5,4,8), ...hLine(5,12,15), ...hLine(14,4,8), ...hLine(14,12,15), ...vLine(5,6,8), ...vLine(14,11,13)], message: '90s. Boa sorte.', bgVariant: 5 },
]);

const EXTRA_LEVELS = Object.freeze([
  { id: 11, label: 'Pirâmide',   target: 28, timeLimit: 100000, bonus: 120, speedOverride: 90, walls: [...hLine(18,0,19), ...hLine(15,2,17), ...hLine(12,4,15), ...hLine(9,6,13), ...hLine(6,8,11), ...hLine(3,9,10)].filter(w => w.x < CFG.COLS && w.y < CFG.ROWS), message: 'Pirâmide invertida. 100s.', bgVariant: 5 },
  { id: 12, label: 'Octópus',    target: 30, timeLimit: null,   bonus: 140, speedOverride: 85, walls: [...cross(5,5,3), ...cross(14,5,3), ...cross(5,14,3), ...cross(14,14,3), ...cross(10,10,2)].filter(w => w.x >= 0 && w.x < CFG.COLS && w.y >= 0 && w.y < CFG.ROWS), message: 'Cinco cruzes. Sem limite de tempo.', bgVariant: 4 },
  { id: 13, label: 'Espinha',    target: 30, timeLimit: 80000,  bonus: 150, speedOverride: 82, walls: [...hLine(10,0,19), ...vLine(3,5,14), ...vLine(6,3,8), ...vLine(6,12,16), ...vLine(10,1,4), ...vLine(10,15,18), ...vLine(13,3,8), ...vLine(13,12,16), ...vLine(16,5,14)].filter(w => w.x < CFG.COLS && w.y < CFG.ROWS), message: 'Espinha central. 80s.', bgVariant: 3 },
  { id: 14, label: 'Anel Final', target: 35, timeLimit: 120000, bonus: 180, speedOverride: 78, walls: [...rect(0,0,CFG.COLS,CFG.ROWS), ...rect(3,3,CFG.COLS-6,CFG.ROWS-6), ...hLine(10,6,13)].filter(w => w.x < CFG.COLS && w.y < CFG.ROWS), message: 'Dois anéis. 120s. Penúltima fase.', bgVariant: 5 },
  { id: 15, label: 'CAOS',       target: 40, timeLimit: 120000, bonus: 250, speedOverride: 70, walls: [...rect(0,0,CFG.COLS,CFG.ROWS), ...cross(10,10,5), ...hLine(5,2,8), ...hLine(5,11,17), ...hLine(14,2,8), ...hLine(14,11,17), ...vLine(5,6,8), ...vLine(5,11,13), ...vLine(14,6,8), ...vLine(14,11,13), ...hLine(2,3,5), ...hLine(17,3,5), ...hLine(2,14,16), ...hLine(17,14,16)].filter(w => w.x < CFG.COLS && w.y < CFG.ROWS), message: 'FASE FINAL. Boa sorte. 🐍', bgVariant: 5 },
]);

const ALL_LEVELS = [...LEVELS, ...EXTRA_LEVELS];

// ── Helpers ──────────────────────────────────────────────────────
const DIR_VECTORS = Object.freeze({ UP: { dx: 0, dy: -1 }, DOWN: { dx: 0, dy: 1 }, LEFT: { dx: -1, dy: 0 }, RIGHT: { dx: 1, dy: 0 } });
const OPPOSITE    = Object.freeze({ UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT' });

const Ease = Object.freeze({
  linear:    t => t,
  easeOut:   t => 1 - Math.pow(1 - t, 3),
  easeIn:    t => t * t * t,
  easeInOut: t => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2,
  bounce:    t => {
    const n1 = 7.5625, d1 = 2.75;
    if (t < 1/d1) return n1*t*t;
    if (t < 2/d1) return n1*(t-=1.5/d1)*t + 0.75;
    if (t < 2.5/d1) return n1*(t-=2.25/d1)*t + 0.9375;
    return n1*(t-=2.625/d1)*t + 0.984375;
  },
  elastic: t => (t === 0 || t === 1) ? t : -Math.pow(2, 10*t - 10) * Math.sin((t*10 - 10.75) * (2*Math.PI/3)),
});

const Color = {
  hex2rgb(hex) {
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    return { r, g, b };
  },
  rgba(hex, a) {
    const { r, g, b } = Color.hex2rgb(hex);
    return `rgba(${r},${g},${b},${a})`;
  },
  lerp(c1, c2, t) {
    const a = Color.hex2rgb(c1), b = Color.hex2rgb(c2);
    const r = Math.round(a.r + (b.r - a.r) * t), g = Math.round(a.g + (b.g - a.g) * t), bl = Math.round(a.b + (b.b - a.b) * t);
    return `rgb(${r},${g},${bl})`;
  },
};

const MathUtil = {
  clamp:   (v, lo, hi) => Math.max(lo, Math.min(hi, v)),
  lerp:    (a, b, t)   => a + (b - a) * t,
  dist:    (a, b)      => Math.sqrt((a.x-b.x)**2 + (a.y-b.y)**2),
  rand:    (lo, hi)    => lo + Math.random() * (hi - lo),
  randInt: (lo, hi)    => Math.floor(lo + Math.random() * (hi - lo + 1)),
  tau:     Math.PI * 2,
};

// ── Data Management (LocalStorage + Firebase Sync) ────────────────
const Store = {
  _playerId: '',
  setPlayerId(id) { this._playerId = id; },
  getPlayerId()   { return this._playerId; },

  _key: (k) => CFG.STORAGE_KEY + (Store._playerId ? Store._playerId + '_' : '') + k,

  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(Store._key(key));
      return raw === null ? fallback : JSON.parse(raw);
    } catch { return fallback; }
  },

  set(key, value) {
    try { localStorage.setItem(Store._key(key), JSON.stringify(value)); }
    catch { /* storage full or unavailable */ }
  },

  getBest(mode)               { return Store.get(`best_${mode}`, 0); },
  saveBest(mode, score)       { if (score > Store.getBest(mode)) { Store.set(`best_${mode}`, score); Store.syncToCloud(); } },
  getLevelBest(level)         { return Store.get(`lvl_${level}`, 0); },
  saveLevelBest(level, score) { if (score > Store.getLevelBest(level)) Store.set(`lvl_${level}`, score); },
  getUnlocked()               { return Store.get('unlocked', 1); },
  unlock(level)               { if (level > Store.getUnlocked()) { Store.set('unlocked', level); Store.syncToCloud(); } },

  getStats() {
    return Store.get('stats', { gamesPlayed: 0, totalScore: 0, totalFood: 0, bestCombo: 0, playTime: 0 });
  },

  saveStats(delta) {
    const s = Store.getStats();
    Store.set('stats', {
      gamesPlayed: s.gamesPlayed + (delta.gamesPlayed || 0),
      totalScore:  s.totalScore  + (delta.totalScore  || 0),
      totalFood:   s.totalFood   + (delta.totalFood   || 0),
      bestCombo:   Math.max(s.bestCombo, delta.bestCombo || 0),
      playTime:    s.playTime    + (delta.playTime    || 0),
    });
  },

  getModeStats(mode) {
    return Store.get(`mode_stats_${mode}`, { gamesPlayed: 0, bestScore: 0, totalFood: 0, bestCombo: 0 });
  },

  saveModeStats(mode, delta) {
    const s = Store.getModeStats(mode);
    Store.set(`mode_stats_${mode}`, {
      gamesPlayed: s.gamesPlayed + (delta.gamesPlayed || 0),
      bestScore:   Math.max(s.bestScore, delta.bestScore || 0),
      totalFood:   s.totalFood + (delta.totalFood || 0),
      bestCombo:   Math.max(s.bestCombo, delta.bestCombo || 0),
    });
  },

  syncToCloud() {
    if (!window.FirebaseDB || !this._playerId) return;
    const cloudData = {
      best_classic:   this.get('best_classic', 0),
      best_wrap:      this.get('best_wrap', 0),
      best_speed:     this.get('best_speed', 0),
      best_challenge: this.get('best_challenge', 0),
      unlocked:       this.get('unlocked', 1),
      stats:          this.getStats(),
      lastSync:       new Date().toISOString()
    };
    window.FirebaseDB.saveProfile(this._playerId, cloudData);
  }
};

// ── Event Bus ────────────────────────────────────────────────────
const Bus = (() => {
  const _listeners = {};
  return {
    on(event, fn)   { (_listeners[event] = _listeners[event] || []).push(fn); },
    off(event, fn)  { if (_listeners[event]) _listeners[event] = _listeners[event].filter(f => f !== fn); },
    emit(event, d)  { (_listeners[event] || []).forEach(fn => fn(d)); },
  };
})();

// Save mode-specific stats on game over
Bus.on('gameOver', ({ score, combo }) => {
  Store.saveModeStats(window.state?.mode || 'classic', {
    gamesPlayed: 1, bestScore: score, totalFood: window.state?.streak || 0, bestCombo: combo,
  });
});

// ── Audio System (Web Audio API) ─────────────────────────────────
const SoundBus = (() => {
  let ctx = null;
  let _enabled = false;

  function initContext() {
    if (!ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) ctx = new AudioContext();
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  function playTone(freq, type, duration, vol = 0.1, slideFreq = null) {
    if (!_enabled || !ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slideFreq) osc.frequency.exponentialRampToValueAtTime(slideFreq, ctx.currentTime + duration);

    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  }

  return {
    get isEnabled() { return _enabled; },
    toggle() { _enabled = !_enabled; if (_enabled) initContext(); return _enabled; },
    play(event) {
      if (!_enabled || !ctx) return;
      switch (event) {
        case 'eat':     playTone(600, 'sine', 0.1, 0.1, 800); break;
        case 'combo':   playTone(900, 'sine', 0.15, 0.15, 1200); break;
        case 'death':   playTone(150, 'sawtooth', 0.4, 0.2, 50); break;
        case 'levelup': 
          playTone(400, 'square', 0.1, 0.05);
          setTimeout(() => playTone(500, 'square', 0.1, 0.05), 100);
          setTimeout(() => playTone(600, 'square', 0.2, 0.05), 200);
          break;
        case 'powerup': playTone(300, 'triangle', 0.3, 0.1, 900); break;
      }
    }
  };
})();

Bus.on('foodEaten',     ({ combo }) => SoundBus.play(combo >= 3 ? 'combo' : 'eat'));
Bus.on('gameOver',      () => SoundBus.play('death'));
Bus.on('levelComplete', () => SoundBus.play('levelup'));
Bus.on('powerupStart',  () => SoundBus.play('powerup'));

// ── Utilities ────────────────────────────────────────────────────
function weightedRandom(items) {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const item of items) { r -= item.weight; if (r <= 0) return item; }
  return items[items.length - 1];
}

const InputValidator = {
  isValidDir(d) { return ['UP', 'DOWN', 'LEFT', 'RIGHT'].includes(d); },
  isOpposite(a, b) { return OPPOSITE[a] === b; },
  isSafeMove(current, next, snake) {
    if (!this.isValidDir(next) || this.isOpposite(current, next)) return false;
    const v = DIR_VECTORS[next];
    const newHead = { x: snake[0].x + v.dx, y: snake[0].y + v.dy };
    return !snake.slice(1).some(s => s.x === newHead.x && s.y === newHead.y);
  },
};

const LevelProgress = {
  getUnlocked() { return Store.getUnlocked(); },
  isUnlocked(n) { return n <= this.getUnlocked(); },
  getProgress() { const u = this.getUnlocked(); return { unlocked: u, total: ALL_LEVELS.length, pct: u / ALL_LEVELS.length }; },
};

const THEMES = Object.freeze([
  { name: 'default', bg: '#f4f1ec', fg: '#111110', muted: '#a8a49d' },
  { name: 'inverse', bg: '#111110', fg: '#f4f1ec', muted: '#555450' },
  { name: 'warm',    bg: '#faf6ef', fg: '#1a1510', muted: '#b0a898' },
  { name: 'cold',    bg: '#f0f2f5', fg: '#101418', muted: '#9098a4' },
]);

let _activeTheme = 0;
function applyTheme(index) {
  const t = THEMES[index % THEMES.length];
  const root = document.documentElement;
  root.style.setProperty('--bg',    t.bg);
  root.style.setProperty('--fg',    t.fg);
  root.style.setProperty('--muted', t.muted);
  _activeTheme = index;
  Store.set('theme', index);
}
function loadSavedTheme() { applyTheme(Store.get('theme', 0)); }

const AnimPresets = Object.freeze({
  foodPulse:   { period: 1.8, amplitude: 0.10, offset: 0 },
  powerPulse:  { period: 1.2, amplitude: 0.16, offset: Math.PI / 3 },
  rarePulse:   { period: 0.8, amplitude: 0.14, offset: Math.PI / 5 },
  gridPulse:   { period: 0.5, amplitude: 0.08, offset: 0 },
  edgePulse:   { period: 0.4, amplitude: 0.20, offset: 0 },
});

console.info('[Config] Loaded. COLS=%d ROWS=%d CELL=%d LEVELS=%d', CFG.COLS, CFG.ROWS, CFG.CELL, LEVELS.length);

// ── Expose globals ───────────────────────────────────────────────
window.CFG            = CFG;
window.MODES          = MODES;
window.FOOD_TYPES     = FOOD_TYPES;
window.POWERUP_TYPES  = POWERUP_TYPES;
window.LEVELS         = LEVELS;
window.EXTRA_LEVELS   = EXTRA_LEVELS;
window.ALL_LEVELS     = ALL_LEVELS;
window.DIR_VECTORS    = DIR_VECTORS;
window.OPPOSITE       = OPPOSITE;
window.Ease           = Ease;
window.Color          = Color;
window.MathUtil       = MathUtil;
window.Store          = Store;
window.Bus            = Bus;
window.SoundBus       = SoundBus;
window.weightedRandom = weightedRandom;
window.InputValidator = InputValidator;
window.LevelProgress  = LevelProgress;
window.THEMES         = THEMES;
window.applyTheme     = applyTheme;
window.loadSavedTheme = loadSavedTheme;
window.AnimPresets    = AnimPresets;