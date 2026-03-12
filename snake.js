// ═══════════════════════════════════════════════════════════════
//  SNAKE — Entry Point
//  Wires config → renderer → engine → UI.
//  This file is intentionally thin: all logic lives in the
//  four dedicated modules. Entry point responsibility:
//    1. Validate that all dependencies loaded
//    2. Initialise the renderer with a reference to engine state
//    3. Initialise the UI layer
//    4. Expose a minimal global debug API in dev mode
// ═══════════════════════════════════════════════════════════════

'use strict';

// ── Dependency check ─────────────────────────────────────────────
(function checkDeps() {
  const required = ['CFG', 'MODES', 'LEVELS', 'FOOD_TYPES', 'POWERUP_TYPES',
    'Bus', 'Store', 'MathUtil', 'Ease', 'Color', 'weightedRandom',   // config
    'Renderer',                                                         // renderer
    'Engine', 'state',                                                  // engine
    'UIInit',                                                           // ui
  ];
  const missing = required.filter(k => typeof window[k] === 'undefined');
  if (missing.length) {
    console.error('[Snake] Missing globals:', missing.join(', '));
    document.body.innerHTML = `
      <div style="font-family:monospace;padding:2rem;color:#c00">
        <b>Erro de carregamento.</b><br>
        Módulos ausentes: ${missing.join(', ')}<br>
        Verifique que todos os arquivos .js estão na mesma pasta.
      </div>`;
    return;
  }
  console.info('[Snake] All modules loaded. Starting…');
  _boot();
})();

// ── Boot sequence ────────────────────────────────────────────────
function _boot() {
  // 1. Give the renderer a reference to the shared engine state object
  Renderer.init(state);

  // 2. Initialise the UI (binds events, renders initial menu)
  UIInit();

  // 3. Log initial best scores for all modes
  Object.keys(MODES).forEach(mode => {
    const best = Store.getBest(mode);
    if (best > 0) console.info(`[Snake] Best score (${mode}): ${best}`);
  });

  console.info('[Snake] Ready. COLS=%d ROWS=%d CELL=%d',
    CFG.COLS, CFG.ROWS, CFG.CELL);
}

// ── Debug API (accessible from browser console) ──────────────────
window.SnakeDebug = {
  // Force-start a specific mode and level
  start: (mode = 'challenge', level = 1) => {
    Engine.start(mode, level);
    console.info(`[Debug] Started mode="${mode}" level=${level}`);
  },

  // Show current engine state snapshot
  state: () => {
    console.table({
      phase:     state.phase,
      score:     state.score,
      combo:     state.combo,
      streak:    state.streak,
      level:     state.level,
      mode:      state.mode,
      pwActive:  state.pwActive,
      pwKind:    state.pwKind,
      snakeLen:  state.snake.length,
      foods:     state.foods.length,
      walls:     state.walls.length,
    });
    return state;
  },

  // Unlock all levels
  unlockAll: () => {
    Store.set('unlocked', LEVELS.length);
    console.info('[Debug] All levels unlocked.');
  },

  // Reset all stored data
  reset: () => {
    try {
      Object.keys(localStorage)
        .filter(k => k.startsWith(CFG.STORAGE_KEY))
        .forEach(k => localStorage.removeItem(k));
      console.info('[Debug] All storage cleared. Reload to reset UI.');
    } catch(e) {
      console.warn('[Debug] Could not clear storage:', e);
    }
  },

  // Teleport: add score without playing
  addScore: (n = 10) => {
    state.score += n;
    Bus.emit('stateUpdate', state);
    console.info(`[Debug] +${n} score → ${state.score}`);
  },

  // Force a specific powerup
  forcePowerup: (kind = 'x2') => {
    const def = POWERUP_TYPES.find(p => p.kind === kind);
    if (!def) { console.warn('[Debug] Unknown powerup kind:', kind); return; }
    const head = state.snake[0];
    if (!head) { console.warn('[Debug] No snake head found.'); return; }
    state.powerup = {
      x: (head.x + 3) % CFG.COLS,
      y: head.y,
      ...def,
      _phase: 0,
    };
    Bus.emit('stateUpdate', state);
    console.info(`[Debug] Placed powerup "${kind}" next to snake head.`);
  },

  // Trigger a level-up animation manually
  testLevelUp: (level = 3) => {
    Renderer.onLevelUp(level);
    console.info(`[Debug] Level-up animation for level ${level}.`);
  },

  // Show recorded stats
  stats: () => {
    const s = Store.getStats();
    console.table(s);
    return s;
  },

  // List level best scores
  levelBests: () => {
    const result = {};
    LEVELS.forEach((_, i) => {
      result[`Level ${i+1}`] = Store.getLevelBest(i+1);
    });
    console.table(result);
    return result;
  },
};

// ── Visibility change: auto-pause ────────────────────────────────
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.phase === 'playing') {
    Engine.pause();
    console.info('[Snake] Auto-paused (tab hidden).');
  }
});

/*
  ┌─────────────────────────────────────────────────────────────┐
  │  PROJECT STRUCTURE SUMMARY                                  │
  └─────────────────────────────────────────────────────────────┘

  snake.config.js   — Constants, level data, food/powerup types,
                      easing functions, math & color utilities,
                      localStorage wrapper (Store), event bus (Bus)

  snake.renderer.js — Canvas drawing (background, walls, food,
                      powerup, snake), particle system, screen
                      shake, tween animator. Reads `state` by
                      reference; never writes to it.

  snake.engine.js   — Game loop (setInterval step), collision,
                      food placement, powerup activation, level
                      transitions, score & combo, game-over.
                      Mutates `state`; emits Bus events.

  snake.ui.js       — DOM manipulation, HUD updates, overlay
                      state machine, level selector panel, stats
                      panel, all input binding (keyboard, swipe,
                      dpad). Reads `state` via Bus events.

  snake.js          — Entry point: validates deps, boots renderer
                      and UI, exposes SnakeDebug console API.

  index.html        — HTML skeleton: game layout, panels, scripts.

  snake.css         — All styles: design tokens, layout, components,
                      animations, responsive breakpoints.

  ┌─────────────────────────────────────────────────────────────┐
  │  HOW TO ADD A LEVEL                                         │
  └─────────────────────────────────────────────────────────────┘

  Open snake.config.js and push a new object into the LEVELS array:

    {
      id:            11,
      label:         'Meu Nível',
      target:        20,
      timeLimit:     60000,   // or null
      bonus:         80,
      speedOverride: 130,     // ms/tick; lower = faster
      walls: [
        ...hLine(8, 2, 17),
        ...vLine(10, 2, 17),
      ],
      message:       'Mensagem exibida no início.',
      bgVariant:     3,       // 0–5 (see BG_VARIANTS in renderer)
    }

  That's it. The level selector, unlock system, timer and progress
  bar all pick it up automatically.

  ┌─────────────────────────────────────────────────────────────┐
  │  KNOWN LIMITATIONS                                          │
  └─────────────────────────────────────────────────────────────┘

  • No server-side leaderboard: best scores are localStorage-only.
  • Magnet powerup nudges food diagonally only one axis per step;
    in very dense mazes it may not visibly move food.
  • The pause-on-tab-hide does not auto-resume; user must press
    space or click the arena to resume (intentional).
  • Ghost powerup does not interact with wall cells; passing
    through walls is not enabled even in ghost mode.
  • On very small screens (< 320px wide) the canvas may overflow.
    A future improvement could scale the canvas via CSS transform.
*/

// ── end of snake.js ───────────────────────────────────────────────

// ── Extended entry: theme, extra levels, debug tools ─────────────

// Apply saved theme on boot
if (typeof loadSavedTheme === 'function') loadSavedTheme();

// Make ALL_LEVELS available to engine (overrides LEVELS reference)
// Engine uses LEVELS[] directly; patch it to use ALL_LEVELS
if (typeof ALL_LEVELS !== 'undefined' && ALL_LEVELS.length > LEVELS.length) {
  // Patch Engine to look up from ALL_LEVELS
  // We shadow the module-level LEVELS reference via a wrapper
  Object.defineProperty(window, '_LEVELS_RUNTIME', {
    get: () => ALL_LEVELS,
    configurable: true,
  });
  console.info('[Snake] ALL_LEVELS available: %d levels total.', ALL_LEVELS.length);
}

// ── Theme switcher (cycle via T key) ─────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 't' || e.key === 'T') {
    if (state.phase !== 'playing') {
      applyTheme((_activeTheme + 1) % THEMES.length);
      console.info('[Snake] Theme: %s', THEMES[_activeTheme].name);
    }
  }
});

// ── Extended debug API ────────────────────────────────────────────
Object.assign(window.SnakeDebug, {
  theme: (n) => {
    applyTheme(n);
    console.info('[Debug] Theme set to:', THEMES[n % THEMES.length].name);
  },

  allThemes: () => {
    THEMES.forEach((t, i) => console.info(`${i}: ${t.name} bg=${t.bg} fg=${t.fg}`));
  },

  allLevels: () => {
    ALL_LEVELS.forEach(l => {
      console.info(
        `Level ${l.id}: "${l.label}" target=${l.target} walls=${l.walls.length} time=${l.timeLimit || '∞'}`
      );
    });
  },

  levelProgress: () => {
    const p = LevelProgress.getProgress();
    console.info(`Unlocked ${p.unlocked}/${p.total} levels (${Math.round(p.pct * 100)}%)`);
    return p;
  },

  sessionStats: () => {
    const s = Engine.getSessionStats();
    console.table(s);
    return s;
  },

  modeStats: (mode = 'classic') => {
    const s = Store.getModeStats(mode);
    console.table(s);
    return s;
  },

  forceLevel: (n) => {
    if (n < 1 || n > ALL_LEVELS.length) {
      console.warn('[Debug] Level out of range:', n);
      return;
    }
    Store.unlock(n);
    Engine.start('challenge', n);
    console.info('[Debug] Forced to level', n);
  },

  speedTest: (ms = 40) => {
    if (!state.running) { console.warn('[Debug] Start a game first.'); return; }
    clearInterval(Engine._gameLoop);
    Engine._gameLoop = setInterval(() => {
      if (!state.running) clearInterval(Engine._gameLoop);
    }, ms);
    console.info('[Debug] Speed set to %dms/tick.', ms);
  },

  particleBurst: () => {
    Renderer.particles.burst(
      canvas.width / 2, canvas.height / 2,
      { count: 50, speed: [2, 5], size: [2, 5] }
    );
    console.info('[Debug] Particle burst fired.');
  },
});

// ── Performance monitor (dev only) ───────────────────────────────
const PerfMonitor = {
  _frames:    0,
  _lastTime:  performance.now(),
  _fps:       60,
  _el:        null,
  _active:    false,

  toggle() {
    this._active = !this._active;
    if (this._active) {
      if (!this._el) {
        this._el = document.createElement('div');
        this._el.style.cssText = `
          position:fixed;top:4px;left:4px;
          font:9px "Space Mono",monospace;
          color:var(--muted);pointer-events:none;
          z-index:1000;letter-spacing:.05em;
        `;
        document.body.appendChild(this._el);
      }
      this._el.style.display = 'block';
      this._tick();
    } else {
      if (this._el) this._el.style.display = 'none';
    }
  },

  _tick() {
    if (!this._active) return;
    requestAnimationFrame(() => {
      this._frames++;
      const now = performance.now();
      if (now - this._lastTime >= 1000) {
        this._fps      = this._frames;
        this._frames   = 0;
        this._lastTime = now;
        if (this._el) {
          this._el.textContent =
            `${this._fps} fps | ${state.snake ? state.snake.length : 0} segs | ` +
            `${Renderer.particles._pool.filter(p => p.life > 0).length} particles`;
        }
      }
      this._tick();
    });
  },
};

// Toggle perf monitor with F key
document.addEventListener('keydown', e => {
  if (e.key === 'f' || e.key === 'F') {
    if (!e.ctrlKey && !e.metaKey) PerfMonitor.toggle();
  }
});

window.SnakeDebug.perf = () => PerfMonitor.toggle();

// ── Final log ────────────────────────────────────────────────────
console.info(
  '[Snake] Boot complete. %d levels available. Type SnakeDebug in console for tools.',
  typeof ALL_LEVELS !== 'undefined' ? ALL_LEVELS.length : LEVELS.length
);

// ── end of snake.js (extended) ────────────────────────────────────
