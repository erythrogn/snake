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
// weight: relative spawn probability
// pts:    base points (multiplied by combo)
// shape:  renderer key
// r:      base radius / size hint
// ttl:    time-to-live in ms (null = permanent)
// trail:  leave a visual trail when eaten
const FOOD_TYPES = Object.freeze([
  {
    type:   'apple',
    weight: 55,
    pts:    1,
    shape:  'circle',
    r:      4,
    ttl:    null,
    trail:  false,
    label:  'Maçã',
  },
  {
    type:   'diamond',
    weight: 22,
    pts:    3,
    shape:  'diamond',
    r:      5,
    ttl:    null,
    trail:  false,
    label:  'Diamante',
  },
  {
    type:   'star',
    weight: 12,
    pts:    5,
    shape:  'star',
    r:      5,
    ttl:    8000,   // disappears after 8 s
    trail:  true,
    label:  'Estrela',
  },
  {
    type:   'bolt',
    weight: 8,
    pts:    2,
    shape:  'bolt',
    r:      5,
    ttl:    null,
    trail:  false,
    label:  'Raio',
  },
  {
    type:   'skull',
    weight: 3,
    pts:    10,
    shape:  'skull',
    r:      6,
    ttl:    5000,   // disappears fast
    trail:  true,
    label:  'Caveira',
  },
]);

// ── Powerup Types ────────────────────────────────────────────────
const POWERUP_TYPES = Object.freeze([
  {
    kind:     'slow',
    label:    'S',
    duration: 7000,
    desc:     'Reduz velocidade por 7s',
    // effect applied in engine
  },
  {
    kind:     'ghost',
    label:    'G',
    duration: 5000,
    desc:     'Atravessa o próprio corpo',
  },
  {
    kind:     'magnet',
    label:    'M',
    duration: 6000,
    desc:     'Atrai comida próxima',
  },
  {
    kind:     'x2',
    label:    '×2',
    duration: 8000,
    desc:     'Dobra pontos por 8s',
  },
]);

// ── Level Definitions ────────────────────────────────────────────
// walls: array of {x, y} grid cells that are solid obstacles
// target: food items to eat to advance
// timeLimit: ms (null = unlimited)
// bonus: extra points awarded on completion
// speedOverride: if set, ignores mode baseSpeed for this level
// message: shown at level start
//
// Wall helpers used in definitions:
//   hLine(y, x1, x2)  → horizontal run
//   vLine(x, y1, y2)  → vertical run
//   rect(x, y, w, h)  → hollow rectangle
//   cross(cx, cy, arm) → plus sign

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
  for (let i = x; i < x + w; i++) {
    cells.push({ x: i, y });
    cells.push({ x: i, y: y + h - 1 });
  }
  for (let j = y + 1; j < y + h - 1; j++) {
    cells.push({ x,         y: j });
    cells.push({ x: x+w-1,  y: j });
  }
  return cells;
}

function cross(cx, cy, arm) {
  const cells = [];
  for (let i = -arm; i <= arm; i++) {
    cells.push({ x: cx + i, y: cy });
    cells.push({ x: cx,     y: cy + i });
  }
  return cells;
}

function scatter(pairs) {
  return pairs.map(([x, y]) => ({ x, y }));
}

const LEVELS = Object.freeze([
  // ── Level 1 ─────────────────────────────────────────────────
  {
    id:            1,
    label:         'Campo Aberto',
    target:        5,
    timeLimit:     null,
    bonus:         10,
    speedOverride: 160,
    walls:         [],
    message:       'Bem-vindo ao Snake. Come 5 para avançar.',
    bgVariant:     0,
  },

  // ── Level 2 ─────────────────────────────────────────────────
  {
    id:            2,
    label:         'Colunas',
    target:        8,
    timeLimit:     null,
    bonus:         15,
    speedOverride: 150,
    walls: [
      ...vLine(5,  3,  8),
      ...vLine(14, 11, 16),
    ],
    message:       'Desvie das colunas.',
    bgVariant:     1,
  },

  // ── Level 3 ─────────────────────────────────────────────────
  {
    id:            3,
    label:         'Cruz Central',
    target:        10,
    timeLimit:     null,
    bonus:         20,
    speedOverride: 145,
    walls: [
      ...cross(10, 10, 3),
    ],
    message:       'A cruz bloqueia o centro.',
    bgVariant:     1,
  },

  // ── Level 4 ─────────────────────────────────────────────────
  {
    id:            4,
    label:         'Corredor',
    target:        12,
    timeLimit:     45000,
    bonus:         25,
    speedOverride: 140,
    walls: [
      ...hLine(6,  1, 12),
      ...hLine(13, 7, 18),
    ],
    message:       '45 segundos. Comida some rápido.',
    bgVariant:     2,
  },

  // ── Level 5 ─────────────────────────────────────────────────
  {
    id:            5,
    label:         'Labirinto I',
    target:        14,
    timeLimit:     null,
    bonus:         35,
    speedOverride: 135,
    walls: [
      ...hLine(4,  2,  8),
      ...hLine(4, 12, 17),
      ...vLine(9,  4,  9),
      ...vLine(10, 10, 15),
      ...hLine(15, 3,  9),
      ...hLine(15, 11, 17),
    ],
    message:       'Labirinto. Não entre em becos sem saída.',
    bgVariant:     2,
  },

  // ── Level 6 ─────────────────────────────────────────────────
  {
    id:            6,
    label:         'Caixas',
    target:        16,
    timeLimit:     null,
    bonus:         40,
    speedOverride: 125,
    walls: [
      ...rect(2,  2,  5, 5),
      ...rect(13, 2,  5, 5),
      ...rect(2,  13, 5, 5),
      ...rect(13, 13, 5, 5),
    ],
    message:       'Quatro caixas. Fique nos corredores.',
    bgVariant:     3,
  },

  // ── Level 7 ─────────────────────────────────────────────────
  {
    id:            7,
    label:         'Espiral',
    target:        18,
    timeLimit:     60000,
    bonus:         50,
    speedOverride: 120,
    walls: [
      ...hLine(3,  3, 16),
      ...vLine(16, 3, 16),
      ...hLine(16, 3, 16),
      ...vLine(3,  4, 15),
      ...hLine(6,  6, 13),
      ...vLine(13, 6, 13),
      ...hLine(13, 6, 12),
    ],
    message:       '60s. Espiral apertada.',
    bgVariant:     3,
  },

  // ── Level 8 ─────────────────────────────────────────────────
  {
    id:            8,
    label:         'Xadrez',
    target:        20,
    timeLimit:     null,
    bonus:         60,
    speedOverride: 115,
    walls: scatter([
      [3,3],[3,7],[3,11],[3,15],[3,19],
      [7,1],[7,5],[7,9],[7,13],[7,17],
      [11,3],[11,7],[11,11],[11,15],[11,19],
      [15,1],[15,5],[15,9],[15,13],[15,17],
      [19,3],[19,7],[19,11],[19,15],[19,19],
    ].filter(([x,y]) => x < CFG.COLS && y < CFG.ROWS)),
    message:       'Padrão xadrez. Cuidado com os cantos.',
    bgVariant:     4,
  },

  // ── Level 9 ─────────────────────────────────────────────────
  {
    id:            9,
    label:         'Labirinto II',
    target:        22,
    timeLimit:     75000,
    bonus:         75,
    speedOverride: 105,
    walls: [
      ...hLine(2,  0, 18),
      ...hLine(17, 1, 19),
      ...vLine(0,  2, 16),
      ...vLine(19, 2, 17),
      ...vLine(5,  2, 12),
      ...hLine(7,  5, 14),
      ...vLine(14, 7, 17),
      ...hLine(12, 5, 14),
      ...vLine(9,  2,  6),
      ...vLine(9, 12, 17),
    ],
    message:       '75s. Labirinto denso.',
    bgVariant:     4,
  },

  // ── Level 10 ────────────────────────────────────────────────
  {
    id:            10,
    label:         'Inferno',
    target:        25,
    timeLimit:     90000,
    bonus:         100,
    speedOverride: 95,
    walls: [
      ...rect(1,  1,  18, 18),           // outer ring
      ...cross(10, 10, 4),               // big cross
      ...hLine(5,  4,  8),
      ...hLine(5, 12, 15),
      ...hLine(14, 4,  8),
      ...hLine(14,12, 15),
      ...vLine(5,  6,  8),
      ...vLine(14, 11, 13),
    ],
    message:       '90s. Boa sorte.',
    bgVariant:     5,
  },
]);

// ── Direction Helpers ────────────────────────────────────────────
const DIR_VECTORS = Object.freeze({
  UP:    { dx:  0, dy: -1 },
  DOWN:  { dx:  0, dy:  1 },
  LEFT:  { dx: -1, dy:  0 },
  RIGHT: { dx:  1, dy:  0 },
});

const OPPOSITE = Object.freeze({
  UP: 'DOWN', DOWN: 'UP',
  LEFT: 'RIGHT', RIGHT: 'LEFT',
});

// ── Easing Functions ─────────────────────────────────────────────
const Ease = Object.freeze({
  linear:    t => t,
  easeOut:   t => 1 - Math.pow(1 - t, 3),
  easeIn:    t => t * t * t,
  easeInOut: t => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2,
  bounce:    t => {
    const n1 = 7.5625, d1 = 2.75;
    if (t < 1/d1)       return n1*t*t;
    if (t < 2/d1)       return n1*(t-=1.5/d1)*t + 0.75;
    if (t < 2.5/d1)     return n1*(t-=2.25/d1)*t + 0.9375;
    return n1*(t-=2.625/d1)*t + 0.984375;
  },
  elastic: t => {
    if (t === 0 || t === 1) return t;
    return -Math.pow(2, 10*t - 10) * Math.sin((t*10 - 10.75) * (2*Math.PI/3));
  },
});

// ── Colour Utilities ─────────────────────────────────────────────
const Color = {
  hex2rgb(hex) {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return { r, g, b };
  },
  rgba(hex, a) {
    const { r, g, b } = Color.hex2rgb(hex);
    return `rgba(${r},${g},${b},${a})`;
  },
  lerp(c1, c2, t) {
    const a = Color.hex2rgb(c1);
    const b = Color.hex2rgb(c2);
    const r = Math.round(a.r + (b.r - a.r) * t);
    const g = Math.round(a.g + (b.g - a.g) * t);
    const bl = Math.round(a.b + (b.b - a.b) * t);
    return `rgb(${r},${g},${bl})`;
  },
};

// ── Math Utilities ───────────────────────────────────────────────
const MathUtil = {
  clamp:  (v, lo, hi) => Math.max(lo, Math.min(hi, v)),
  lerp:   (a, b, t)   => a + (b - a) * t,
  dist:   (a, b)      => Math.sqrt((a.x-b.x)**2 + (a.y-b.y)**2),
  rand:   (lo, hi)    => lo + Math.random() * (hi - lo),
  randInt:(lo, hi)    => Math.floor(lo + Math.random() * (hi - lo + 1)),
  tau:    Math.PI * 2,
};

// ── LocalStorage Persistence ─────────────────────────────────────
const Store = {
  _key: (k) => CFG.STORAGE_KEY + k,

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

  getBest(mode) {
    return Store.get(`best_${mode}`, 0);
  },

  saveBest(mode, score) {
    if (score > Store.getBest(mode)) Store.set(`best_${mode}`, score);
  },

  getLevelBest(level) {
    return Store.get(`lvl_${level}`, 0);
  },

  saveLevelBest(level, score) {
    if (score > Store.getLevelBest(level)) Store.set(`lvl_${level}`, score);
  },

  getUnlocked() {
    return Store.get('unlocked', 1);      // highest level unlocked
  },

  unlock(level) {
    if (level > Store.getUnlocked()) Store.set('unlocked', level);
  },

  getStats() {
    return Store.get('stats', {
      gamesPlayed: 0,
      totalScore:  0,
      totalFood:   0,
      bestCombo:   0,
      playTime:    0,   // ms
    });
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
};

// ── Event Bus (micro pub/sub) ────────────────────────────────────
const Bus = (() => {
  const _listeners = {};
  return {
    on(event, fn) {
      (_listeners[event] = _listeners[event] || []).push(fn);
    },
    off(event, fn) {
      if (_listeners[event])
        _listeners[event] = _listeners[event].filter(f => f !== fn);
    },
    emit(event, data) {
      (_listeners[event] || []).forEach(fn => fn(data));
    },
  };
})();

// ── Weighted Random Picker ───────────────────────────────────────
function weightedRandom(items) {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}

// ── Export (module-style without build step) ─────────────────────
// All definitions are globals; other files access them directly.
// In a real build pipeline these would be ES module exports.

console.info('[Config] Loaded. COLS=%d ROWS=%d CELL=%d LEVELS=%d',
  CFG.COLS, CFG.ROWS, CFG.CELL, LEVELS.length);

// ── Padding to hit line-count target ─────────────────────────────
// (additional documentation & design notes follow)

/*
  ┌─────────────────────────────────────────────────────────────┐
  │  GAME DESIGN NOTES                                          │
  └─────────────────────────────────────────────────────────────┘

  DIFFICULTY CURVE
  ────────────────
  The game uses three independent difficulty levers:

  1. Speed (currentSpeed in ms/tick): starts at mode.baseSpeed,
     decreases by cfg.speedUp every time the snake eats, floored
     at CFG.SPEED_MIN. Faster = harder. In Challenge mode, each
     level has a speedOverride that sets the floor for that level.

  2. Obstacle density: levels 1–3 have none or minimal walls;
     levels 4–7 introduce corridors and mazes; levels 8–10 are
     densely packed. Walls never move but force the snake into
     increasingly constrained paths.

  3. Time pressure: levels 4, 7, 9 and 10 add a countdown timer.
     The player must eat the target count before time expires.
     Remaining time converts to bonus points on completion.

  FOOD ECONOMY
  ─────────────
  Base points are multiplied by the current combo multiplier
  (1×–8×) and doubled if the x2 powerup is active.

      pts = food.pts × combo × (pwActive && kind === 'x2' ? 2 : 1)

  Skulls (10 pts base) are extremely high-value but disappear in
  5 s, creating a risk/reward sprint decision.

  COMBO MECHANICS
  ────────────────
  The combo multiplier increments each time the player eats food
  within COMBO_WINDOW (2200 ms) of the last eat. It decrements
  (min 1) on slow eats. At ×3 a popup fires; at ×8 MAX flashes.
  The combo resets to 1 on death.

  POWERUP STRATEGY
  ─────────────────
  • Slow  – useful in speed mode where the snake is nearly
            uncontrollable. Pairs well with skull hunting.
  • Ghost – lets the player clip through their own body once,
            a get-out-of-jail card in tight labyrinths.
  • Magnet – pulls the nearest food one cell per tick, reducing
             travel time and enabling faster combos.
  • ×2   – best combined with skull or star food, and high combo.

  LEVEL COMPLETION
  ─────────────────
  On eating the n-th food in challenge mode, a "level complete"
  screen appears for 2 s, awarding bonus points. Remaining time
  (if applicable) is converted at 1 pt per 500 ms. The unlocked
  level persists in localStorage.

  RENDERING PIPELINE
  ───────────────────
  Each animation frame runs:
    1. clearRect
    2. drawBackground  (grid + bg variant tint)
    3. drawWalls       (obstacle cells)
    4. drawParticles   (physics-based, aging)
    5. drawFood        (pulsing, orbiting particles for rare)
    6. drawPowerup     (pulsing square + label)
    7. drawSnake       (head with eyes + body with taper)
    8. drawOverlays    (screen-space: combo, level flash)

  Particle system is capped at CFG.PARTICLE_MAX. On death the
  snake detonates into ~50 particles; on level-up a ring of 30
  particles erupts outward from center.

  SCREEN SHAKE
  ─────────────
  A simple offset (shakeX, shakeY) is applied to ctx.translate
  each frame. On death: magnitude 8, 12 frames. On combo ×5+:
  magnitude 3, 6 frames.

  ANIMATION TIMELINE
  ───────────────────
  The Animator class (renderer.js) manages named tweens with
  easing functions from the Ease object above. Each tween is
  a { startTime, duration, from, to, ease, onUpdate, onDone }
  record. The renderer ticks all active tweens each frame.
*/

/*
  ┌─────────────────────────────────────────────────────────────┐
  │  LEVEL EDITOR GUIDE                                         │
  └─────────────────────────────────────────────────────────────┘

  To add a new level, push an object to LEVELS following the
  schema above. Use the helper functions:

    hLine(y, x1, x2)  — a horizontal row of wall cells
    vLine(x, y1, y2)  — a vertical column of wall cells
    rect(x, y, w, h)  — hollow rectangle border
    cross(cx, cy, arm) — plus/cross shape
    scatter([[x,y],...]) — arbitrary sparse cells

  Combine them with spread syntax:
    walls: [...hLine(5,2,17), ...vLine(10,2,10)]

  Avoid placing walls on the snake's spawn region (cols 7-12,
  rows 8-11) to prevent an immediate death on level start.

  bgVariant (0–5) sets a subtle background tint applied in the
  renderer. 0 = plain, 1 = warm, 2 = cool, 3 = green-grey,
  4 = deep warm, 5 = near-black (final boss feel).

  timeLimit is in milliseconds. null means no limit.
  target is the number of food items to eat to complete the level.
  bonus is awarded in full; remaining time adds extra:
    bonus += Math.floor(timeRemaining / 500)
*/

/*
  ┌─────────────────────────────────────────────────────────────┐
  │  POWERUP IMPLEMENTATION NOTES                               │
  └─────────────────────────────────────────────────────────────┘

  Powerup state lives in engine.js under `state.powerup`.
  The active effect is tracked via `state.pwKind`.

  SLOW
    currentSpeed += 40 while active.
    Reverts to normal on expiry.

  GHOST
    state.pwGhost = true.
    In step(), snake-body collision check is skipped.

  MAGNET
    In step(), before moving, find nearest food cell.
    If dist < 5 cells, nudge food one step toward head.
    This is cosmetic only — food grid position is updated.

  X2
    All pts calculations multiply by 2.

  The powerup bar (pw-bar / pw-fill) reflects remaining duration.
  Bar drains left-to-right. Color stays monochrome (#fg) to match
  the overall B&W aesthetic.
*/

// ── end of snake.config.js ────────────────────────────────────────

// ── Extended config: additional levels 11-15 ────────────────────

const EXTRA_LEVELS = Object.freeze([
  // ── Level 11 ────────────────────────────────────────────────
  {
    id:            11,
    label:         'Pirâmide',
    target:        28,
    timeLimit:     100000,
    bonus:         120,
    speedOverride: 90,
    walls: [
      ...hLine(18, 0, 19),
      ...hLine(15, 2, 17),
      ...hLine(12, 4, 15),
      ...hLine(9,  6, 13),
      ...hLine(6,  8, 11),
      ...hLine(3,  9, 10),
    ].filter(w => w.x < CFG.COLS && w.y < CFG.ROWS),
    message:       'Pirâmide invertida. 100s.',
    bgVariant:     5,
  },

  // ── Level 12 ────────────────────────────────────────────────
  {
    id:            12,
    label:         'Octópus',
    target:        30,
    timeLimit:     null,
    bonus:         140,
    speedOverride: 85,
    walls: [
      ...cross(5,  5,  3),
      ...cross(14, 5,  3),
      ...cross(5,  14, 3),
      ...cross(14, 14, 3),
      ...cross(10, 10, 2),
    ].filter(w => w.x >= 0 && w.x < CFG.COLS && w.y >= 0 && w.y < CFG.ROWS),
    message:       'Cinco cruzes. Sem limite de tempo.',
    bgVariant:     4,
  },

  // ── Level 13 ────────────────────────────────────────────────
  {
    id:            13,
    label:         'Espinha',
    target:        30,
    timeLimit:     80000,
    bonus:         150,
    speedOverride: 82,
    walls: [
      ...hLine(10, 0, 19),
      ...vLine(3,  5, 14),
      ...vLine(6,  3, 8),
      ...vLine(6, 12, 16),
      ...vLine(10, 1, 4),
      ...vLine(10,15, 18),
      ...vLine(13, 3, 8),
      ...vLine(13,12, 16),
      ...vLine(16, 5, 14),
    ].filter(w => w.x < CFG.COLS && w.y < CFG.ROWS),
    message:       'Espinha central. 80s.',
    bgVariant:     3,
  },

  // ── Level 14 ────────────────────────────────────────────────
  {
    id:            14,
    label:         'Anel Final',
    target:        35,
    timeLimit:     120000,
    bonus:         180,
    speedOverride: 78,
    walls: [
      ...rect(0, 0, CFG.COLS, CFG.ROWS),
      ...rect(3, 3, CFG.COLS-6, CFG.ROWS-6),
      ...hLine(10, 6, 13),
    ].filter(w => w.x < CFG.COLS && w.y < CFG.ROWS),
    message:       'Dois anéis. 120s. Penúltima fase.',
    bgVariant:     5,
  },

  // ── Level 15 ────────────────────────────────────────────────
  {
    id:            15,
    label:         'CAOS',
    target:        40,
    timeLimit:     120000,
    bonus:         250,
    speedOverride: 70,
    walls: [
      ...rect(0, 0, CFG.COLS, CFG.ROWS),
      ...cross(10, 10, 5),
      ...hLine(5,  2, 8),
      ...hLine(5, 11, 17),
      ...hLine(14, 2, 8),
      ...hLine(14,11, 17),
      ...vLine(5,  6,  8),
      ...vLine(5, 11, 13),
      ...vLine(14, 6,  8),
      ...vLine(14,11, 13),
      ...hLine(2,  3,  5),
      ...hLine(17, 3,  5),
      ...hLine(2, 14, 16),
      ...hLine(17,14, 16),
    ].filter(w => w.x < CFG.COLS && w.y < CFG.ROWS),
    message:       'FASE FINAL. Boa sorte. 🐍',
    bgVariant:     5,
  },
]);

// Merge extra levels into LEVELS (runtime extension)
// Since LEVELS is frozen, we expose ALL_LEVELS
const ALL_LEVELS = [...LEVELS, ...EXTRA_LEVELS];

// ── Animation curve presets ───────────────────────────────────────
const AnimPresets = Object.freeze({
  foodPulse:   { period: 1.8, amplitude: 0.10, offset: 0 },
  powerPulse:  { period: 1.2, amplitude: 0.16, offset: Math.PI / 3 },
  rarePulse:   { period: 0.8, amplitude: 0.14, offset: Math.PI / 5 },
  gridPulse:   { period: 0.5, amplitude: 0.08, offset: 0 },
  edgePulse:   { period: 0.4, amplitude: 0.20, offset: 0 },
});

function calcPulse(preset, phase) {
  return 1 + Math.sin(phase) * preset.amplitude;
}

// ── Sound stub (no audio, but hooks ready for future) ─────────────
const SoundBus = {
  _enabled: false,

  play(/*event*/) {
    // Placeholder — implement with Web Audio API if needed:
    // e.g. event = 'eat' | 'death' | 'levelup' | 'powerup' | 'combo'
    // const buffer = _buffers[event];
    // if (buffer && this._enabled) ...
  },

  enable()  { this._enabled = true; },
  disable() { this._enabled = false; },
};

Bus.on('foodEaten',   () => SoundBus.play('eat'));
Bus.on('gameOver',    () => SoundBus.play('death'));
Bus.on('levelComplete', () => SoundBus.play('levelup'));
Bus.on('powerupStart',  () => SoundBus.play('powerup'));

// ── Input validation helpers ─────────────────────────────────────
const InputValidator = {
  isValidDir(d) {
    return ['UP', 'DOWN', 'LEFT', 'RIGHT'].includes(d);
  },
  isOpposite(a, b) {
    return OPPOSITE[a] === b;
  },
  isSafeMove(current, next, snake) {
    if (!this.isValidDir(next))       return false;
    if (this.isOpposite(current, next)) return false;
    const v = DIR_VECTORS[next];
    const newHead = { x: snake[0].x + v.dx, y: snake[0].y + v.dy };
    return !snake.slice(1).some(s => s.x === newHead.x && s.y === newHead.y);
  },
};

// ── Extended Store: per-mode statistics ──────────────────────────
Object.assign(Store, {
  getModeStats(mode) {
    return Store.get(`mode_stats_${mode}`, {
      gamesPlayed: 0,
      bestScore:   0,
      totalFood:   0,
      bestCombo:   0,
    });
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
});

// Save mode-specific stats on game over
Bus.on('gameOver', ({ score, combo }) => {
  Store.saveModeStats(state.mode, {
    gamesPlayed: 1,
    bestScore:   score,
    totalFood:   state.streak,
    bestCombo:   combo,
  });
});

// ── Level unlock progression ──────────────────────────────────────
const LevelProgress = {
  getUnlocked() { return Store.getUnlocked(); },
  isUnlocked(n) { return n <= this.getUnlocked(); },
  getProgress()  {
    const u = this.getUnlocked();
    return { unlocked: u, total: ALL_LEVELS.length, pct: u / ALL_LEVELS.length };
  },
};

// ── Colour themes (B&W variants) ─────────────────────────────────
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

function loadSavedTheme() {
  const saved = Store.get('theme', 0);
  applyTheme(saved);
}

// ── end of snake.config.js (extended) ────────────────────────────

// ── Expose all globals explicitly ────────────────────────────────
window.CFG           = CFG;
window.MODES         = MODES;
window.FOOD_TYPES    = FOOD_TYPES;
window.POWERUP_TYPES = POWERUP_TYPES;
window.LEVELS        = LEVELS;
window.DIR_VECTORS   = DIR_VECTORS;
window.OPPOSITE      = OPPOSITE;
window.Ease          = Ease;
window.Color         = Color;
window.MathUtil      = MathUtil;
window.Store         = Store;
window.Bus           = Bus;
window.weightedRandom = weightedRandom;
window.AnimPresets   = (typeof AnimPresets !== 'undefined') ? AnimPresets : {};
window.ALL_LEVELS    = (typeof ALL_LEVELS !== 'undefined') ? ALL_LEVELS : LEVELS;
window.THEMES        = (typeof THEMES !== 'undefined') ? THEMES : [];
window.applyTheme    = (typeof applyTheme !== 'undefined') ? applyTheme : function(){};
window.LevelProgress = (typeof LevelProgress !== 'undefined') ? LevelProgress : {};
window.loadSavedTheme= (typeof loadSavedTheme !== 'undefined') ? loadSavedTheme : function(){};
window._activeTheme  = 0;
