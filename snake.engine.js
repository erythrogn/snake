// ═══════════════════════════════════════════════════════════════
//  SNAKE — Engine
//  Game loop, physics, level management, powerup system,
//  food placement, collision detection, scoring
//  Depends on: snake.config.js, snake.renderer.js
// ═══════════════════════════════════════════════════════════════



// ── Shared mutable state ─────────────────────────────────────────
// Renderer reads this object directly via reference.
const state = {
  // Snake
  snake:       [],    // [{x, y}, ...]  head first
  dir:         'RIGHT',
  nextDir:     'RIGHT',

  // Food
  foods:       [],    // food objects from FOOD_TYPES + {x, y, _phase, _spawnTime}
  powerup:     null,  // powerup object or null

  // Powerup runtime
  pwActive:    false,
  pwKind:      null,
  pwTimer:     0,
  pwDuration:  0,

  // Score / combo
  score:       0,
  streak:      0,
  combo:       1,
  bestScore:   0,

  // Level / mode
  mode:        'classic',
  level:       1,       // current challenge level (challenge mode only)
  levelEaten:  0,       // food eaten this level
  timeLeft:    null,    // ms remaining (null = no limit)
  walls:       [],      // obstacle grid cells [{x,y}]

  // Session
  running:     false,
  paused:      false,
  phase:       'menu',  // 'menu' | 'playing' | 'paused' | 'levelup' | 'gameover'
  sessionStart: 0,
};

// ── Engine internals ─────────────────────────────────────────────
let _gameLoop       = null;
let _timerInterval  = null;
let _eatTimestamp   = 0;
let _currentSpeed   = 145;
let _levelUpPending = false;
let _levelUpTimer   = 0;
const _LEVELUP_PAUSE = 2000; // ms to show level-up screen before continuing

// ── Engine API ───────────────────────────────────────────────────
const Engine = {
// ── Init / Start ──────────────────────────────────────────
  start(mode = 'classic', level = 1) {
    Engine.stop();
    Renderer.clearEffects();

    // Adicione esta linha para zerar a fila de setas ao trocar de opção de jogo
    if (typeof InputBuffer !== 'undefined') InputBuffer.clear();

    state.mode        = mode;
    state.level       = mode === 'challenge' ? level : 1;
    state.phase       = 'playing';
    state.running     = true;
    state.paused      = false;
    state.sessionStart= performance.now();

    _initLevel(state.level);
    _scheduleStep();

    Bus.emit('phaseChange', 'playing');
  },
  // ── Init / Start ──────────────────────────────────────────
  start(mode = 'classic', level = 1) {
    Engine.stop();
    Renderer.clearEffects();

    state.mode        = mode;
    state.level       = mode === 'challenge' ? level : 1;
    state.phase       = 'playing';
    state.running     = true;
    state.paused      = false;
    state.sessionStart= performance.now();

    _initLevel(state.level);
    _scheduleStep();

    Bus.emit('phaseChange', 'playing');
  },

  stop() {
    clearInterval(_gameLoop);
    clearInterval(_timerInterval);
    _gameLoop      = null;
    _timerInterval = null;
    state.running  = false;
    state.phase    = state.phase === 'playing' ? 'gameover' : state.phase;
  },

  pause() {
    if (!state.running || state.paused) return;
    state.paused = true;
    clearInterval(_gameLoop);
    clearInterval(_timerInterval);
    Bus.emit('phaseChange', 'paused');
  },

  resume() {
    if (!state.paused) return;
    state.paused = false;
    _scheduleStep();
    _resumeTimer();
    Bus.emit('phaseChange', 'playing');
  },

  setDir(d) {
    if (!state.running || state.paused) return;
    if (state.phase !== 'playing') return;
    if (d !== OPPOSITE[state.dir]) state.nextDir = d;
  },

  // ── Level initialisation ──────────────────────────────────
};

// ── Level setup ──────────────────────────────────────────────────
function _initLevel(levelNum) {
  const isChallengeMode = state.mode === 'challenge';
  const levelDef = isChallengeMode ? LEVELS[levelNum - 1] : null;
  const modeDef  = MODES[state.mode];

  // Snake spawn
  const cx = Math.floor(CFG.COLS / 2);
  const cy = Math.floor(CFG.ROWS / 2);
  state.snake     = [{ x: cx, y: cy }, { x: cx-1, y: cy }, { x: cx-2, y: cy }];
  state.dir       = 'RIGHT';
  state.nextDir   = 'RIGHT';

  // Score / combo (persist across levels in challenge mode)
  if (levelNum === 1 || !isChallengeMode) {
    state.score   = 0;
    state.streak  = 0;
    state.combo   = 1;
  }
  state.levelEaten = 0;

  // Food / powerup
  state.foods   = [];
  state.powerup = null;
  _clearPowerup();

  // Walls
  state.walls = levelDef ? [...levelDef.walls] : [];
  // Filter walls that would kill the snake immediately
  const spawnCells = state.snake.map(s => `${s.x},${s.y}`);
  state.walls = state.walls.filter(w => !spawnCells.includes(`${w.x},${w.y}`));

  // Speed
  const base = levelDef?.speedOverride ?? modeDef.baseSpeed;
  _currentSpeed = base;
  state.bestScore = Store.getBest(state.mode);

  // Timer
  clearInterval(_timerInterval);
  state.timeLeft = levelDef?.timeLimit ?? null;
  if (state.timeLeft !== null) _startTimer();

  // Initial food
  _placeFood();
  _placeFood();

  _eatTimestamp = 0;

  Bus.emit('stateUpdate', state);
}

// ── Timer ────────────────────────────────────────────────────────
function _startTimer() {
  _timerInterval = setInterval(() => {
    if (state.paused) return;
    state.timeLeft -= 100;
    if (state.timeLeft <= 0) {
      state.timeLeft = 0;
      Bus.emit('stateUpdate', state);
      _gameOverTimeout();
    } else {
      Bus.emit('timerTick', state.timeLeft);
    }
  }, 100);
}

function _resumeTimer() {
  if (state.timeLeft !== null && state.timeLeft > 0) _startTimer();
}

function _gameOverTimeout() {
  // Called when time runs out
  clearInterval(_gameLoop);
  clearInterval(_timerInterval);
  _doGameOver();
}

// ── Game loop step ───────────────────────────────────────────────
function _scheduleStep() {
  clearInterval(_gameLoop);
  _gameLoop = setInterval(_step, _currentSpeed);
}

function _step() {
  if (state.paused || !state.running) return;

  // Flush any buffered direction input
  if (typeof InputBuffer !== 'undefined') InputBuffer.flush();

  state.dir = state.nextDir;
  const modeDef = MODES[state.mode];
  const head    = { ...state.snake[0] };
  const v       = DIR_VECTORS[state.dir];
  head.x += v.dx;
  head.y += v.dy;

  // Wrap or wall collision
  if (modeDef.wrap) {
    head.x = (head.x + CFG.COLS) % CFG.COLS;
    head.y = (head.y + CFG.ROWS) % CFG.ROWS;
  } else {
    if (head.x < 0 || head.x >= CFG.COLS || head.y < 0 || head.y >= CFG.ROWS) {
      return _doGameOver();
    }
  }

  // Obstacle collision
  if (state.walls.some(w => w.x === head.x && w.y === head.y)) {
    return _doGameOver();
  }

  // Self collision (ghost powerup skips this)
  const ghostActive = state.pwActive && state.pwKind === 'ghost';
  if (!ghostActive && state.snake.some(s => s.x === head.x && s.y === head.y)) {
    return _doGameOver();
  }

  state.snake.unshift(head);

  // Powerup pickup
  if (state.powerup && head.x === state.powerup.x && head.y === state.powerup.y) {
    _activatePowerup(state.powerup);
    state.powerup = null;
  }

  // Magnet effect: pull nearest food one step toward head
  if (state.pwActive && state.pwKind === 'magnet') {
    _applyMagnet(head);
  }

  // Food collision
  const fi = state.foods.findIndex(f => f.x === head.x && f.y === head.y);
  if (fi !== -1) {
    const food = state.foods[fi];
    state.foods.splice(fi, 1);
    _onFoodEaten(food);
  } else {
    state.snake.pop();
  }

  // Tick powerup
  if (state.pwActive) _tickPowerup();

  // Expire TTL foods
  _expireFoods();

  Bus.emit('stateUpdate', state);
}

// ── Food eaten ───────────────────────────────────────────────────
function _onFoodEaten(food) {
  const now     = Date.now();
  const elapsed = now - _eatTimestamp;
  _eatTimestamp = now;

  // Combo
  if (_eatTimestamp > 0 && elapsed < CFG.COMBO_WINDOW) {
    state.combo = Math.min(state.combo + 1, CFG.COMBO_MAX);
  } else {
    state.combo = Math.max(1, state.combo - 1);
  }

  state.streak++;
  state.levelEaten++;

  const x2 = state.pwActive && state.pwKind === 'x2';
  const pts = food.pts * state.combo * (x2 ? 2 : 1);
  state.score += pts;

  // Renderer feedback
  Renderer.onEat(food, state.combo);
  if (state.combo >= 3) Renderer.onCombo(state.combo);

  Bus.emit('foodEaten', { food, pts, combo: state.combo });

  // Speed up
  const modeDef  = MODES[state.mode];
  const levelDef = LEVELS[state.level - 1];
  const base     = levelDef?.speedOverride ?? modeDef.baseSpeed;
  _currentSpeed  = Math.max(CFG.SPEED_MIN, base - state.snake.length * modeDef.speedUp);
  _scheduleStep();

  // Place replacement food
  _placeFood();
  _maybePlacePowerup();

  // Challenge: check level target
  if (state.mode === 'challenge') {
    const target = LEVELS[state.level - 1]?.target ?? Infinity;
    if (state.levelEaten >= target) {
      _completeChallengeLevel();
      return;
    }
  }

  Store.saveBest(state.mode, state.score);
  state.bestScore = Store.getBest(state.mode);
}

// ── Challenge level complete ─────────────────────────────────────
function _completeChallengeLevel() {
  clearInterval(_gameLoop);
  clearInterval(_timerInterval);
  state.phase = 'levelup';

  const levelDef = LEVELS[state.level - 1];
  let bonus      = levelDef.bonus;

  // Time bonus
  if (state.timeLeft !== null) {
    bonus += Math.floor(state.timeLeft / 500);
  }
  state.score += bonus;

  Store.unlock(state.level + 1);
  Store.saveLevelBest(state.level, state.score);
  Store.saveBest(state.mode, state.score);

  Renderer.onLevelUp(state.level);
  Bus.emit('levelComplete', { level: state.level, bonus });

  // Advance after pause
  setTimeout(() => {
    if (state.level < LEVELS.length) {
      state.level++;
      state.phase = 'playing';
      _initLevel(state.level);
      _scheduleStep();
      Bus.emit('phaseChange', 'playing');
    } else {
      // All levels done → win screen
      state.phase = 'win';
      Bus.emit('phaseChange', 'win');
    }
  }, _LEVELUP_PAUSE);
}

// ── Game over ────────────────────────────────────────────────────
function _doGameOver() {
  clearInterval(_gameLoop);
  clearInterval(_timerInterval);
  state.running = false;
  state.phase   = 'gameover';

  const prevBest = Store.getBest(state.mode);
  Store.saveBest(state.mode, state.score);
  state.bestScore = Store.getBest(state.mode);
  const isNew = state.score > prevBest && state.score > 0;

  // Stats
  const playTime = performance.now() - state.sessionStart;
  Store.saveStats({
    gamesPlayed: 1,
    totalScore:  state.score,
    totalFood:   state.streak,
    bestCombo:   state.combo,
    playTime,
  });

  Renderer.onDeath(state.snake);
  Bus.emit('gameOver', { score: state.score, isNew, streak: state.streak, combo: state.combo });
}

// ── Food placement ───────────────────────────────────────────────
function _occupied(x, y) {
  return state.snake.some(s => s.x === x && s.y === y)
    || state.foods.some(f => f.x === x && f.y === y)
    || state.walls.some(w => w.x === x && w.y === y)
    || (state.powerup && state.powerup.x === x && state.powerup.y === y);
}

function _randomFreeCell() {
  let pos, tries = 0;
  do {
    pos = {
      x: MathUtil.randInt(0, CFG.COLS - 1),
      y: MathUtil.randInt(0, CFG.ROWS - 1),
    };
    tries++;
  } while (_occupied(pos.x, pos.y) && tries < 200);
  return pos;
}

function _placeFood() {
  if (state.foods.length >= 3) return;
  const ft  = weightedRandom(FOOD_TYPES);
  const pos = _randomFreeCell();
  state.foods.push({
    ...pos,
    ...ft,
    _phase:     Math.random() * MathUtil.tau,
    _spawnTime: ft.ttl !== null ? Date.now() : null,
  });
}

function _expireFoods() {
  const now = Date.now();
  state.foods = state.foods.filter(f => {
    if (f.ttl === null || f._spawnTime === null) return true;
    return (now - f._spawnTime) < f.ttl;
  });
  // Replenish
  while (state.foods.length < 2) _placeFood();
}

// ── Powerup placement ────────────────────────────────────────────
function _maybePlacePowerup() {
  if (state.powerup) return;
  if (state.score < CFG.POWERUP_MIN_SCORE) return;
  if (Math.random() > CFG.POWERUP_CHANCE) return;

  const kind = POWERUP_TYPES[MathUtil.randInt(0, POWERUP_TYPES.length - 1)];
  const pos  = _randomFreeCell();
  state.powerup = {
    ...pos,
    ...kind,
    _phase: 0,
  };
}

function _activatePowerup(pw) {
  _clearPowerup();
  state.pwActive   = true;
  state.pwKind     = pw.kind;
  state.pwDuration = pw.duration;
  state.pwTimer    = pw.duration;

  if (pw.kind === 'slow') {
    _currentSpeed = Math.min(CFG.SPEED_MAX, _currentSpeed + 45);
    _scheduleStep();
  }

  Renderer.onPowerup();
  Bus.emit('powerupStart', { kind: pw.kind, duration: pw.duration });
}

function _tickPowerup() {
  state.pwTimer -= _currentSpeed;
  Bus.emit('powerupTick', { timer: state.pwTimer, duration: state.pwDuration });

  if (state.pwTimer <= 0) {
    const wasKind = state.pwKind;
    _clearPowerup();

    if (wasKind === 'slow') {
      // Restore speed
      const modeDef  = MODES[state.mode];
      const levelDef = LEVELS[state.level - 1];
      const base     = levelDef?.speedOverride ?? modeDef.baseSpeed;
      _currentSpeed  = Math.max(CFG.SPEED_MIN, base - state.snake.length * modeDef.speedUp);
      _scheduleStep();
    }

    Bus.emit('powerupEnd', { kind: wasKind });
  }
}

function _clearPowerup() {
  state.pwActive   = false;
  state.pwKind     = null;
  state.pwTimer    = 0;
  state.pwDuration = 0;
}

// ── Magnet effect ────────────────────────────────────────────────
function _applyMagnet(head) {
  if (state.foods.length === 0) return;
  let nearest = null;
  let minDist = Infinity;
  for (const f of state.foods) {
    const d = MathUtil.dist(f, head);
    if (d < minDist) { minDist = d; nearest = f; }
  }
  if (!nearest || minDist > 5) return;

  // Nudge one cell toward head if not occupied
  const dx  = Math.sign(head.x - nearest.x);
  const dy  = Math.sign(head.y - nearest.y);
  const nx  = nearest.x + (dx !== 0 ? dx : 0);
  const ny  = nearest.y + (dy !== 0 && dx === 0 ? dy : 0);

  if (!_occupied(nx, ny) && nx >= 0 && nx < CFG.COLS && ny >= 0 && ny < CFG.ROWS) {
    nearest.x = nx;
    nearest.y = ny;
  }
}

/*
  ┌─────────────────────────────────────────────────────────────┐
  │  ENGINE — DESIGN NOTES                                      │
  └─────────────────────────────────────────────────────────────┘

  STEP LOOP
  ──────────
  The engine uses setInterval (not requestAnimationFrame) for the
  game tick so that snake movement stays grid-aligned at a
  predictable cadence regardless of frame rate. rAF is used only
  by the renderer for smooth visual interpolation.

  When the interval needs to change (food eaten, powerup activated)
  we clearInterval and re-schedule rather than adjusting the delay
  in-place — this avoids a jitter spike on the next tick.

  DIRECTION QUEUE
  ────────────────
  We store only one pending direction (nextDir). This prevents
  180-degree reversal (filtered by OPPOSITE[dir]) and avoids
  buffering multiple inputs between ticks, which is a common
  source of unfair deaths in snake implementations.

  FOOD TTL EXPIRY
  ────────────────
  _expireFoods() is called every step. Foods with a non-null ttl
  are removed once (Date.now() - spawnTime) >= ttl. After removal
  we replenish to keep at least 2 foods on the board.

  POWERUP TICK
  ─────────────
  pwTimer decrements by _currentSpeed (the interval duration in ms)
  each step. This means the timer is measured in "game ticks" worth
  of wall-clock time, keeping duration consistent regardless of
  speed changes.

  SCORE PERSISTENCE
  ──────────────────
  Store.saveBest() is called:
    1. On every food eaten (for live leaderboard feedback)
    2. On game-over (final write)
  This ensures the record survives unexpected closures.

  LEVEL TRANSITION
  ─────────────────
  On reaching the level target:
    1. clearInterval stops the step loop
    2. Renderer.onLevelUp() triggers visual effects
    3. Bus.emit('levelComplete') updates the HUD
    4. After _LEVELUP_PAUSE (2000 ms), _initLevel(next) resets
       walls, foods and speed, then re-schedules the step loop.
  The snake's score and length are preserved across transitions.

  GHOST POWERUP EDGE CASE
  ────────────────────────
  Ghost skips the body-collision check but NOT wall or border
  collision. This keeps it balanced — the player still needs to
  navigate obstacles; they just can't accidentally self-intersect.

  MAGNET IMPLEMENTATION
  ──────────────────────
  Each step, the single nearest food (by Chebyshev distance) is
  nudged one grid cell toward the head, provided the destination
  is not already occupied. The nudge is horizontal-first: only
  if dx === 0 do we apply dy. This prevents diagonal jitter and
  feels physically plausible (food "slides" along rows/columns).
*/

/*
  ┌─────────────────────────────────────────────────────────────┐
  │  POWERUP BALANCE NOTES                                      │
  └─────────────────────────────────────────────────────────────┘

  SLOW (7 s, +45 ms/tick)
    Best in speed mode. At base speed 80ms the snake is very fast;
    +45 brings it to 125 ms — noticeably safer. Less impactful in
    classic mode (already at 145 ms).

  GHOST (5 s, self-clip)
    Strongest in late levels when the snake is long and corridors
    are narrow. Short duration prevents abuse.

  MAGNET (6 s, 5-cell radius)
    Subtle but compounds with streak: it shortens travel time,
    keeping the COMBO_WINDOW alive longer. In open levels the
    radius covers a large portion of the board; in dense levels
    it pulls food across walls (food can be on the other side of
    an obstacle — the magnet nudges toward the shortest path
    ignoring walls, which is intentionally slightly broken and
    fun).

  X2 (8 s, double pts)
    Stacks with combo for up to 16× effective multiplier at max
    combo. Best used when skull food is on the board.

  SPAWN RATE (10% per eat, min score 3)
    At 10% per eat and roughly 1 powerup at a time, the player
    sees a powerup every ~10 eats on average. At high combos
    (fast eating) powerups appear more frequently in absolute time.
*/

// ── end of snake.engine.js ────────────────────────────────────────

// ── Extended Engine: additional mechanics ────────────────────────

// ── Wall animation state (for future "moving wall" levels) ───────
const WallAnimator = {
  _active: [],

  addMoving(wallIndex, axis, range, speed) {
    this._active.push({ wallIndex, axis, range, speed, t: 0, dir: 1 });
  },

  tick() {
    for (const w of this._active) {
      w.t += w.speed * w.dir;
      if (w.t >= w.range || w.t <= 0) w.dir *= -1;
      if (w.wallIndex < state.walls.length) {
        state.walls[w.wallIndex][w.axis] = Math.round(w.t);
      }
    }
  },

  clear() { this._active.length = 0; },
};

// ── Difficulty scaling helper ────────────────────────────────────
function calcSpeed(base, snakeLen, speedUp) {
  return MathUtil.clamp(base - snakeLen * speedUp, CFG.SPEED_MIN, CFG.SPEED_MAX);
}

// ── Score formatting ─────────────────────────────────────────────
function formatScore(n) {
  return String(n).padStart(2, '0');
}

// ── Streak multiplier table ──────────────────────────────────────
// Maps streak milestones to bonus point awards
const STREAK_MILESTONES = Object.freeze([
  { streak: 10,  bonus: 5,  label: 'streak ×10'  },
  { streak: 25,  bonus: 15, label: 'streak ×25'  },
  { streak: 50,  bonus: 40, label: 'streak ×50'  },
  { streak: 100, bonus: 100, label: 'streak ×100' },
]);

function checkStreakMilestone(streak) {
  const milestone = STREAK_MILESTONES.find(m => m.streak === streak);
  if (milestone) {
    state.score += milestone.bonus;
    Bus.emit('milestone', milestone);
  }
}

// ── Food queue management ────────────────────────────────────────
// Maintain min 2, max 3 foods at all times; ensure food diversity
function _maintainFoodQueue() {
  // Remove expired foods (already handled in _expireFoods)
  // Ensure we never have 3 of the same type unless forced
  const types = state.foods.map(f => f.type);
  while (state.foods.length < 2) {
    _placeFood();
  }
  if (state.foods.length < 3 && state.score > 10 && Math.random() < 0.4) {
    _placeFood();
  }
}

// ── Ghost trail visual cue ───────────────────────────────────────
// When ghost powerup is active, track last 3 positions for renderer
const GhostTrail = {
  _positions: [],
  maxLen: 3,

  push(pos) {
    this._positions.unshift({ ...pos, age: 0 });
    if (this._positions.length > this.maxLen) this._positions.pop();
  },

  tick() {
    this._positions.forEach(p => p.age++);
    this._positions = this._positions.filter(p => p.age < 8);
  },

  get positions() { return this._positions; },
  clear()         { this._positions.length = 0; },
};

// ── Combo decay timer ────────────────────────────────────────────
// Gradually decays combo when the player is slow
let _comboDecayTimer = null;

function _startComboDecay() {
  clearTimeout(_comboDecayTimer);
  _comboDecayTimer = setTimeout(() => {
    if (!state.running || state.paused) return;
    if (state.combo > 1) {
      state.combo = Math.max(1, state.combo - 1);
      Bus.emit('comboDecay', state.combo);
      Bus.emit('stateUpdate', state);
      _startComboDecay(); // re-arm
    }
  }, CFG.COMBO_WINDOW);
}

// Re-arm decay on every eat (called from _onFoodEaten)
Bus.on('foodEaten', () => _startComboDecay());

// ── Level timeout grace period ───────────────────────────────────
// When timeLeft hits 0, give a 1-second grace before ending
let _gracePeriod = false;
Bus.on('timerTick', (timeLeft) => {
  if (timeLeft <= 0 && !_gracePeriod) {
    _gracePeriod = true;
    setTimeout(() => {
      _gracePeriod = false;
      if (state.running && state.timeLeft <= 0) {
        _gameOverTimeout();
      }
    }, 1000);
  }
});

// ── High-score validation ────────────────────────────────────────
function validateBestScore() {
  const stored = Store.getBest(state.mode);
  if (state.score > stored) {
    Store.saveBest(state.mode, state.score);
    state.bestScore = state.score;
    return true;
  }
  return false;
}

// ── Session stats accumulator ────────────────────────────────────
const SessionStats = {
  _foodByType: {},
  _powerupsUsed: {},
  _peakCombo: 1,
  _peakStreak: 0,
  _deathCause: null,

  reset() {
    this._foodByType   = {};
    this._powerupsUsed = {};
    this._peakCombo    = 1;
    this._peakStreak   = 0;
    this._deathCause   = null;
  },

  trackFood(type) {
    this._foodByType[type] = (this._foodByType[type] || 0) + 1;
  },

  trackPowerup(kind) {
    this._powerupsUsed[kind] = (this._powerupsUsed[kind] || 0) + 1;
  },

  trackCombo(c) {
    if (c > this._peakCombo) this._peakCombo = c;
  },

  trackStreak(s) {
    if (s > this._peakStreak) this._peakStreak = s;
  },

  setDeathCause(cause) { this._deathCause = cause; },

  summary() {
    return {
      foodByType:   this._foodByType,
      powerupsUsed: this._powerupsUsed,
      peakCombo:    this._peakCombo,
      peakStreak:   this._peakStreak,
      deathCause:   this._deathCause,
    };
  },
};

// Hook into existing events
Bus.on('foodEaten', ({ food, combo }) => {
  SessionStats.trackFood(food.type);
  SessionStats.trackCombo(combo);
  SessionStats.trackStreak(state.streak);
});

Bus.on('powerupStart', ({ kind }) => {
  SessionStats.trackPowerup(kind);
});

// ── Extend Engine API ────────────────────────────────────────────
Object.assign(Engine, {
  getSessionStats: () => SessionStats.summary(),
  formatScore,
  calcSpeed,
  checkStreakMilestone,
  WallAnimator,
  GhostTrail,
  SessionStats,
});

// ── Pause screen data ────────────────────────────────────────────
Bus.on('phaseChange', phase => {
  if (phase === 'paused') {
    Bus.emit('pauseData', {
      score:    state.score,
      streak:   state.streak,
      combo:    state.combo,
      level:    state.level,
      mode:     state.mode,
      timeLeft: state.timeLeft,
    });
  }
});

// ── Challenge: retry current level ──────────────────────────────
Engine.retryLevel = function() {
  if (state.mode !== 'challenge') return;
  const level = state.level;
  Engine.stop();
  Engine.start('challenge', level);
};

// ── Free-play mode (no level limit) ─────────────────────────────
// When mode is not 'challenge', game is truly endless.
// Report play statistics on exit.
window.addEventListener('beforeunload', () => {
  if (state.running) {
    const playTime = performance.now() - state.sessionStart;
    Store.saveStats({
      playTime,
      gamesPlayed: 0, // already counted on gameOver
    });
  }
});

// ── Movement input buffer ────────────────────────────────────────
// Simple 1-slot buffer: stores the next pending direction.
// Engine.setDir writes here; _step reads it each tick.
const InputBuffer = {
  _pending: null,

  push(dir) {
    // Only accept if not a 180-degree reversal of current direction
    const current = this._pending || state.dir;
    if (dir !== OPPOSITE[current]) {
      this._pending = dir;
    }
  },

  flush() {
    if (this._pending !== null) {
      state.nextDir = this._pending;
      this._pending = null;
    }
  },

  clear() { this._pending = null; },
};

// Override Engine.setDir to use buffer
Engine.setDir = function(d) {
  if (!state.running || state.paused) return;
  if (state.phase !== 'playing') return;
  InputBuffer.push(d);
};

// ── Debug: expose internals ──────────────────────────────────────
Engine._internals = {
  InputBuffer,
  SessionStats,
  WallAnimator,
  GhostTrail,
  calcSpeed,
  formatScore,
};
// ═══════════════════════════════════════════════════════════════
//  MOBILE OPTIMIZATION — Gestos e Segundo Plano
// ═══════════════════════════════════════════════════════════════

const MobileManager = {
  startX: 0,
  startY: 0,
  threshold: 30, // Distância mínima em pixels para considerar um "swipe" válido

  init() {
    // Escuta o início do toque na tela
    // { passive: true } melhora a performance em navegadores mobile
    window.addEventListener('touchstart', (e) => {
      this.startX = e.changedTouches[0].screenX;
      this.startY = e.changedTouches[0].screenY;
    }, { passive: true });

    // Escuta o fim do toque na tela e calcula a direção
    window.addEventListener('touchend', (e) => {
      const endX = e.changedTouches[0].screenX;
      const endY = e.changedTouches[0].screenY;
      this.handleSwipe(this.startX, this.startY, endX, endY);
    }, { passive: true });

    // Previne que os gestos deem zoom acidental ou arrastem a tela (Double-tap to zoom)
    // Nota: É recomendado adicionar touch-action: none; no CSS do seu canvas também.
    document.addEventListener('touchmove', (e) => {
      if (state.running && !state.paused && state.phase === 'playing') {
        e.preventDefault();
      }
    }, { passive: false });

    // Auto-Pause: Essencial para mobile. 
    // Pausa o jogo se o usuário trocar de aba ou minimizar o navegador.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && state.running && !state.paused) {
        Engine.pause();
      }
    });
  },

  handleSwipe(startX, startY, endX, endY) {
    // Ignora swipes se o jogo não estiver rolando
    if (!state.running || state.paused || state.phase !== 'playing') return;

    const deltaX = endX - startX;
    const deltaY = endY - startY;

    // Compara os eixos para saber se o movimento foi mais horizontal ou vertical
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Eixo X (Horizontal)
      if (Math.abs(deltaX) > this.threshold) {
        // Envia direto para o InputBuffer criado na engine estendida
        InputBuffer.push(deltaX > 0 ? 'RIGHT' : 'LEFT');
      }
    } else {
      // Eixo Y (Vertical)
      if (Math.abs(deltaY) > this.threshold) {
        InputBuffer.push(deltaY > 0 ? 'DOWN' : 'UP');
      }
    }
  }
};

// Inicializa o gerenciador mobile
MobileManager.init();
// ── end of snake.engine.js (extended) ─────────────────────────────

// ── Expose engine globals ─────────────────────────────────────────
window.Engine = Engine;
window.state  = state;