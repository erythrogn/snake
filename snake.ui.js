// ═══════════════════════════════════════════════════════════════
//  SNAKE — UI Layer
//  HUD, overlays, input handling (keyboard, touch, swipe, dpad),
//  level selector, mode switcher, stats screen
//  Depends on: snake.config.js, snake.engine.js, snake.renderer.js
// ═══════════════════════════════════════════════════════════════



// ── DOM References ───────────────────────────────────────────────

const DOM = (() => {
  const q  = id => document.getElementById(id);
  const qa = sel => document.querySelectorAll(sel);
  
  return {
    // Header
    logo:           q('logo'),
    scoreLive:      q('score-live'),
// sons
    soundBtn:       q('sound-btn'),
    iconSoundOn:    q('icon-sound-on'),
    iconSoundOff:   q('icon-sound-off'),
    // Stats bar
    stStreak:       q('st-streak'),
    stCombo:        q('st-combo'),
    stBest:         q('st-best'),

    // Mode row
    modeRow:        q('mode-row'),
    modeBtns:       qa('.mode-btn'),

    // Arena
    arena:          q('arena'),
    canvas:         q('c'),
    comboPopup:     q('combo-popup'),
    pwBar:          q('pw-bar'),
    pwFill:         q('pw-fill'),
    timerBar:       q('timer-bar'),
    timerFill:      q('timer-fill'),

    // Main overlay
    overlay:        q('overlay'),
    ovLabel:        q('ov-label'),
    ovScore:        q('ov-score'),
    ovSub:          q('ov-sub'),
    ovBest:         q('ov-best'),
    ovLevelBadge:   q('ov-level-badge'),
    playBtn:        q('play-btn'),
    statsBtn:       q('stats-btn'),
    levelsBtn:      q('levels-btn'),

    // Level select panel
    levelPanel:     q('level-panel'),
    levelGrid:      q('level-grid'),
    levelBack:      q('level-back'),
    levelModeLabel: q('level-mode-label'),

    // Stats panel
    statsPanel:     q('stats-panel'),
    statsBack:      q('stats-back'),
    statGames:      q('stat-games'),
    statTotalScore: q('stat-total-score'),
    statTotalFood:  q('stat-total-food'),
    statBestCombo:  q('stat-best-combo'),
    statPlayTime:   q('stat-play-time'),

    // Level info bar (shown during challenge mode)
    levelBar:       q('level-bar'),
    levelLabel:     q('level-label'),
    levelProgress:  q('level-progress'),
    levelTarget:    q('level-target'),

    // D-Pad
    dpadBtns:       qa('.dpad-btn'),

    // Footer
    foot:           q('foot'),
  };
})();

// ── UI State ─────────────────────────────────────────────────────
let _selectedMode   = 'classic';
let _selectedLevel  = 1;
let _comboTimeout   = null;
let _lastCombo      = 0;

// ── Combo popup ──────────────────────────────────────────────────
function _showComboPopup(combo) {
  if (!DOM.comboPopup) return;
  if (combo < 3) { DOM.comboPopup.classList.remove('pop'); return; }

  DOM.comboPopup.textContent = combo >= CFG.COMBO_MAX ? `MAX ×${combo}!` : `×${combo}`;
  DOM.comboPopup.classList.remove('pop');
  // Force reflow to restart animation
  void DOM.comboPopup.offsetWidth;
  DOM.comboPopup.classList.add('pop');

  clearTimeout(_comboTimeout);
  _comboTimeout = setTimeout(() => {
    DOM.comboPopup.classList.remove('pop');
  }, 700);
}

// ── HUD update ───────────────────────────────────────────────────
function _updateHUD(st) {
  if (DOM.scoreLive)  DOM.scoreLive.textContent  = String(st.score).padStart(2, '0');
  if (DOM.stStreak)   DOM.stStreak.textContent   = st.streak;
  if (DOM.stBest)     DOM.stBest.textContent      = st.bestScore;

  if (DOM.stCombo) {
    const label = st.combo >= 2 ? `×${st.combo}` : '×1';
    DOM.stCombo.textContent = label;
    DOM.stCombo.dataset.level = st.combo >= 5 ? 'high' : st.combo >= 3 ? 'mid' : 'low';
  }

  // Power-up bar
  if (DOM.pwFill) {
    if (st.pwActive && st.pwDuration > 0) {
      DOM.pwFill.style.width = Math.max(0, (st.pwTimer / st.pwDuration) * 100) + '%';
      if (DOM.pwBar) DOM.pwBar.setAttribute('data-kind', st.pwKind || '');
    } else {
      DOM.pwFill.style.width = '0%';
      if (DOM.pwBar) DOM.pwBar.removeAttribute('data-kind');
    }
  }

  // Challenge timer bar
  if (DOM.timerFill && st.mode === 'challenge') {
    const levelDef = LEVELS[st.level - 1];
    if (levelDef && levelDef.timeLimit !== null && st.timeLeft !== null) {
      const pct = (st.timeLeft / levelDef.timeLimit) * 100;
      DOM.timerFill.style.width = Math.max(0, pct) + '%';
      DOM.timerFill.dataset.urgent = pct < 25 ? 'true' : 'false';
      if (DOM.timerBar) DOM.timerBar.style.display = 'block';
    } else {
      if (DOM.timerBar) DOM.timerBar.style.display = 'none';
    }
  } else {
    if (DOM.timerBar) DOM.timerBar.style.display = 'none';
  }

  // Level info bar (challenge mode)
  if (DOM.levelBar) {
    if (st.mode === 'challenge') {
      const ld = LEVELS[st.level - 1];
      DOM.levelBar.style.display = 'flex';
      if (DOM.levelLabel)    DOM.levelLabel.textContent    = `fase ${st.level} — ${ld?.label || ''}`;
      if (DOM.levelProgress) DOM.levelProgress.textContent = st.levelEaten;
      if (DOM.levelTarget)   DOM.levelTarget.textContent   = ld?.target ?? '?';
    } else {
      DOM.levelBar.style.display = 'none';
    }
  }
}

// ── Overlay states ───────────────────────────────────────────────
function _showMenu() {
  if (!DOM.overlay) return;
  DOM.overlay.classList.remove('hidden');
  DOM.overlay.dataset.phase = 'menu';

  if (DOM.ovLabel)  DOM.ovLabel.textContent  = 'snake';
  if (DOM.ovScore)  DOM.ovScore.textContent  = '—';
  if (DOM.ovSub)    DOM.ovSub.textContent    = '';
  if (DOM.ovBest)   DOM.ovBest.innerHTML     = '';
  if (DOM.ovBest)   DOM.ovBest.style.display = 'none';
  if (DOM.playBtn)  DOM.playBtn.textContent  = 'jogar';
  if (DOM.ovLevelBadge) DOM.ovLevelBadge.style.display = 'none';
}

function _showGameOver(data) {
  if (!DOM.overlay) return;
  DOM.overlay.classList.remove('hidden');
  DOM.overlay.dataset.phase = 'gameover';

  const best = Store.getBest(state.mode);

  if (DOM.ovLabel) {
    DOM.ovLabel.textContent = data.isNew ? '🏆 novo recorde!' : 'fim de jogo';
  }
  if (DOM.ovScore) DOM.ovScore.textContent = String(data.score).padStart(2, '0');
  if (DOM.ovSub) {
    DOM.ovSub.innerHTML = `${data.streak} comidos · combo ×${data.combo}
      <span style="display: block; margin-top: 12px; font-size: 9px; opacity: 0.6; letter-spacing: 0.1em;">
        PRESSIONE <b style="color: var(--fg);">ESPAÇO</b> OU <b style="color: var(--fg);">R</b> PARA REINICIAR
      </span>`;
  }

  if (DOM.ovBest) {
    if (!data.isNew && best > 0) {
      DOM.ovBest.innerHTML     = `recorde: <b>${best}</b>`;
      DOM.ovBest.style.display = 'block';
    } else {
      DOM.ovBest.style.display = 'none';
    }
  }

  if (DOM.playBtn)        DOM.playBtn.textContent = 'jogar novamente';
  if (DOM.ovLevelBadge)   DOM.ovLevelBadge.style.display = 'none';
}

function _showLevelComplete(data) {
  if (!DOM.overlay) return;
  DOM.overlay.classList.remove('hidden');
  DOM.overlay.dataset.phase = 'levelup';

  if (DOM.ovLabel)  DOM.ovLabel.textContent  = `fase ${data.level} concluída`;
  if (DOM.ovScore)  DOM.ovScore.textContent  = `+${data.bonus}`;
  if (DOM.ovSub)    DOM.ovSub.textContent    = 'bônus de tempo incluído';
  if (DOM.playBtn)  DOM.playBtn.textContent  = 'próxima fase...';

  if (DOM.ovLevelBadge) {
    DOM.ovLevelBadge.textContent   = `fase ${data.level + 1 <= LEVELS.length ? data.level + 1 : '—'}`;
    DOM.ovLevelBadge.style.display = 'block';
  }
}

function _showWin() {
  if (!DOM.overlay) return;
  DOM.overlay.classList.remove('hidden');
  DOM.overlay.dataset.phase = 'win';

  if (DOM.ovLabel)  DOM.ovLabel.textContent  = 'você venceu!';
  if (DOM.ovScore)  DOM.ovScore.textContent  = String(state.score).padStart(2, '0');
  if (DOM.ovSub)    DOM.ovSub.textContent    = 'todas as fases concluídas';
  if (DOM.playBtn)  DOM.playBtn.textContent  = 'jogar novamente';
  if (DOM.ovLevelBadge) DOM.ovLevelBadge.style.display = 'none';

  const best = Store.getBest(state.mode);
  if (DOM.ovBest && best > 0) {
    DOM.ovBest.innerHTML     = `recorde: <b>${best}</b>`;
    DOM.ovBest.style.display = 'block';
  }
}

function _hideOverlay() {
  if (DOM.overlay) DOM.overlay.classList.add('hidden');
}

// ── Level selector panel ─────────────────────────────────────────
function _buildLevelGrid() {
  if (!DOM.levelGrid) return;
  DOM.levelGrid.innerHTML = '';

  const unlocked = Store.getUnlocked();

  LEVELS.forEach((lvl, i) => {
    const btn  = document.createElement('button');
    const num  = i + 1;
    const best = Store.getLevelBest(num);
    const locked = num > unlocked;

    btn.className = 'level-cell' + (locked ? ' locked' : '');
    btn.disabled  = locked;
    btn.dataset.level = num;
    btn.innerHTML = `
      <span class="lc-num">${num}</span>
      <span class="lc-name">${lvl.label}</span>
      <span class="lc-best">${best > 0 ? best : locked ? '🔒' : '—'}</span>
    `;

    if (!locked) {
      btn.addEventListener('click', () => {
        _selectedLevel = num;
        _selectedMode  = 'challenge';
        _hideLevelPanel();
        _setActiveMode('challenge');
        _startGame();
      });
    }

    DOM.levelGrid.appendChild(btn);
  });
}

function _showLevelPanel() {
  if (!DOM.levelPanel) return;
  _buildLevelGrid();
  DOM.levelPanel.classList.remove('hidden');
  if (DOM.levelModeLabel) DOM.levelModeLabel.textContent = 'modo desafio';
}

function _hideLevelPanel() {
  if (DOM.levelPanel) DOM.levelPanel.classList.add('hidden');
}

// ── Stats panel ───────────────────────────────────────────────────
function _buildStatsPanel() {
  const s = Store.getStats();
  const formatTime = ms => {
    const m = Math.floor(ms / 60000);
    const sec = Math.floor((ms % 60000) / 1000);
    return `${m}m ${sec}s`;
  };
  if (DOM.statGames)      DOM.statGames.textContent      = s.gamesPlayed;
  if (DOM.statTotalScore) DOM.statTotalScore.textContent  = s.totalScore;
  if (DOM.statTotalFood)  DOM.statTotalFood.textContent   = s.totalFood;
  if (DOM.statBestCombo)  DOM.statBestCombo.textContent   = `×${s.bestCombo}`;
  if (DOM.statPlayTime)   DOM.statPlayTime.textContent    = formatTime(s.playTime);
}

function _showStatsPanel() {
  if (!DOM.statsPanel) return;
  _buildStatsPanel();
  DOM.statsPanel.classList.remove('hidden');
}

function _hideStatsPanel() {
  if (DOM.statsPanel) DOM.statsPanel.classList.add('hidden');
}

// ── Mode selector ─────────────────────────────────────────────────
function _setActiveMode(mode) {
  _selectedMode = mode;
  DOM.modeBtns.forEach(b => {
    b.classList.toggle('active', b.dataset.mode === mode);
  });
}

// ── Start game ────────────────────────────────────────────────────
function _startGame() {
  _hideOverlay();
  _hideLevelPanel();
  _hideStatsPanel();
  const level = _selectedMode === 'challenge' ? _selectedLevel : 1;
  Engine.start(_selectedMode, level);
}

// ── Bus subscriptions ────────────────────────────────────────────
function _bindBus() {
  Bus.on('stateUpdate', _updateHUD);

  Bus.on('foodEaten', ({ combo }) => {
    if (combo !== _lastCombo) {
      _lastCombo = combo;
      _showComboPopup(combo);
    }
  });

  Bus.on('gameOver', data => {
    setTimeout(() => _showGameOver(data), 350); // wait for death animation
  });

  Bus.on('levelComplete', data => {
    _showLevelComplete(data);
  });

  Bus.on('phaseChange', phase => {
    if (phase === 'playing') {
      _hideOverlay();
    } else if (phase === 'win') {
      setTimeout(() => _showWin(), 400);
    }
  });

  Bus.on('powerupStart', ({ kind }) => {
    if (DOM.pwBar) DOM.pwBar.setAttribute('data-kind', kind);
  });

  Bus.on('powerupEnd', () => {
    if (DOM.pwFill) DOM.pwFill.style.width = '0%';
  });
}

// ── Input: keyboard ───────────────────────────────────────────────
function _bindKeyboard() {
  const MAP = {
    ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT',
    w: 'UP',       s: 'DOWN',         a: 'LEFT',          d: 'RIGHT',
    W: 'UP',       S: 'DOWN',         A: 'LEFT',          D: 'RIGHT',
  };
  document.addEventListener('keydown', e => {
    if (MAP[e.key]) {
      e.preventDefault();
      Engine.setDir(MAP[e.key]);
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (state.phase === 'menu' || state.phase === 'gameover') _startGame();
      else if (state.phase === 'playing')  Engine.pause();
      else if (state.phase === 'paused')   Engine.resume();
    }
    if (e.key === 'Escape') {
      if (state.phase === 'playing') Engine.pause();
      else if (state.phase === 'paused') Engine.resume();
      _hideLevelPanel();
      _hideStatsPanel();
    }
  });
}

// ── Input: touch swipe ────────────────────────────────────────────
function _bindSwipe() {
  let tx0 = 0, ty0 = 0;
  document.addEventListener('touchstart', e => {
    tx0 = e.touches[0].clientX;
    ty0 = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchend', e => {
    if (state.phase !== 'playing') return;
    const dx = e.changedTouches[0].clientX - tx0;
    const dy = e.changedTouches[0].clientY - ty0;
    const threshold = 22;
    if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      Engine.setDir(dx > 0 ? 'RIGHT' : 'LEFT');
    } else {
      Engine.setDir(dy > 0 ? 'DOWN' : 'UP');
    }
  }, { passive: true });
}

// ── Input: D-Pad ──────────────────────────────────────────────────
function _bindDpad() {
  DOM.dpadBtns.forEach(btn => {
    const dir = btn.dataset.d;
    btn.addEventListener('click', () => Engine.setDir(dir));
    btn.addEventListener('touchstart', e => {
      e.preventDefault();
      Engine.setDir(dir);
    }, { passive: false });
  });
}

// ── Button bindings ───────────────────────────────────────────────
function _bindButtons() {
  if (DOM.playBtn) {
    DOM.playBtn.addEventListener('click', () => {
      const phase = DOM.overlay.dataset.phase;
      if (phase === 'levelup') return; // auto-advances
      _startGame();
    });
  }

  if (DOM.levelsBtn) {
    DOM.levelsBtn.addEventListener('click', () => {
      _showLevelPanel();
    });
  }

  if (DOM.statsBtn) {
    DOM.statsBtn.addEventListener('click', () => {
      _showStatsPanel();
    });
  }

  if (DOM.levelBack) {
    DOM.levelBack.addEventListener('click', _hideLevelPanel);
  }

  if (DOM.statsBack) {
    DOM.statsBack.addEventListener('click', _hideStatsPanel);
  }
if (DOM.soundBtn) {
    DOM.soundBtn.addEventListener('click', () => {
      const isEnabled = SoundBus.toggle();
      
      // Animação da troca de ícone
      if (isEnabled) {
        DOM.iconSoundOff.style.display = 'none';
        DOM.iconSoundOn.style.display = 'block';
      } else {
        DOM.iconSoundOn.style.display = 'none';
        DOM.iconSoundOff.style.display = 'block';
      }
    });
  }
  DOM.modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (state.phase === 'playing') return; // don't switch mid-game
      _setActiveMode(btn.dataset.mode);
      if (btn.dataset.mode === 'challenge') {
        _showLevelPanel();
      }
    });
  });
}

// ── Resize handling ───────────────────────────────────────────────
function _handleResize() {
  // Canvas is fixed-size; we only need to handle viewport fitting
  // The CSS handles scaling via max-width / overflow
}

// ── Init ──────────────────────────────────────────────────────────
function UIInit() {
  _bindBus();
  _bindKeyboard();
  _bindSwipe();
  _bindDpad();
  _bindButtons();
  window.addEventListener('resize', _handleResize);
  _showMenu();

  // Populate initial best score
  if (DOM.stBest) DOM.stBest.textContent = Store.getBest(_selectedMode);

  console.info('[UI] Initialised. Mode: %s', _selectedMode);
}

/*
  ┌─────────────────────────────────────────────────────────────┐
  │  UI — DESIGN NOTES                                          │
  └─────────────────────────────────────────────────────────────┘

  OVERLAY STATE MACHINE
  ──────────────────────
  The main overlay (#overlay) is always present in the DOM.
  Its visibility is controlled by the 'hidden' class.
  The data-phase attribute drives CSS variant styling:
    menu     → full title display
    gameover → score + stats
    levelup  → bonus display (auto-dismisses)
    win      → victory screen

  CSS uses [data-phase] selectors in snake.css for variant
  styling (e.g., font size, label text color).

  COMBO POPUP
  ────────────
  The #combo-popup lives absolutely positioned inside #arena
  (the canvas wrapper). It uses CSS animation (combo-pop
  keyframes) triggered by toggling the 'pop' class. We force
  a reflow (offsetWidth read) before re-adding the class so
  the animation restarts even if called rapidly.

  POWERUP BAR
  ────────────
  #pw-bar has a data-kind attribute set by the UI when a
  powerup activates. CSS [data-kind] selectors can style the
  fill differently per type (currently all use --fg for B&W).

  TIMER BAR
  ──────────
  #timer-bar is a separate progress bar shown only in challenge
  mode when the current level has a timeLimit. It sits between
  the arena and the d-pad. The fill turns urgent (data-urgent)
  at 25% remaining, enabling a CSS pulse animation.

  LEVEL GRID
  ───────────
  _buildLevelGrid() is called each time the panel opens, so it
  reflects the latest unlock state. Locked cells show a 🔒 in
  the best-score slot and are pointer-disabled.

  STATS PANEL
  ────────────
  Statistics are read from Store.getStats() on panel open.
  They are not live-updating; the panel is a post-session review.

  INPUT PRIORITY
  ───────────────
  Keyboard > D-Pad buttons > Swipe.
  All three paths call Engine.setDir() which enforces the
  OPPOSITE[] guard and phase check (no input during gameover,
  levelup, etc.).
*/

/*
  ┌─────────────────────────────────────────────────────────────┐
  │  ACCESSIBILITY NOTES                                        │
  └─────────────────────────────────────────────────────────────┘

  - All interactive elements are <button> elements with visible
    focus styles (focus-visible in CSS).
  - WASD and arrow keys both control direction.
  - Space/Enter start/pause the game from the keyboard.
  - Level cells use button[disabled] for locked states, which
    assistive technology announces correctly.
  - The canvas itself is decorative; screen-reader focus is
    managed via the overlay text elements.
  - Color is never the sole indicator of state (combo level is
    conveyed by numeric text, powerup kind by text label).
*/

// ── end of snake.ui.js ────────────────────────────────────────────

// ── Extended UI: pause screen, milestone toast, pause button ─────

// ── Pause overlay ────────────────────────────────────────────────
const PauseOverlay = {
  _el: null,

  _build() {
    if (this._el) return;
    const div = document.createElement('div');
    div.id        = 'pause-overlay';
    div.className = 'panel hidden';
    div.style.cssText = 'z-index:200;justify-content:center;align-items:center;gap:16px;';
    div.innerHTML = `
      <span style="letter-spacing:.2em;text-transform:uppercase;font-size:11px;color:var(--muted)">pausado</span>
      <span id="pause-score" style="font-family:var(--font-display);font-size:56px;letter-spacing:-.04em"></span>
      <button id="pause-resume" style="margin-top:8px;padding:10px 32px;border:1.5px solid var(--fg);background:transparent;letter-spacing:.2em;text-transform:uppercase">continuar</button>
      <button id="pause-quit"   style="padding:8px 24px;border:1px solid var(--muted);background:transparent;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)">sair</button>
    `;
    document.body.appendChild(div);
    this._el = div;

    div.querySelector('#pause-resume').addEventListener('click', () => {
      Engine.resume();
      this.hide();
    });
    div.querySelector('#pause-quit').addEventListener('click', () => {
      Engine.stop();
      this.hide();
      _showMenu();
    });
  },

  show(data) {
    this._build();
    const scoreEl = this._el.querySelector('#pause-score');
    if (scoreEl) scoreEl.textContent = String(data.score).padStart(2, '0');
    this._el.classList.remove('hidden');
  },

  hide() {
    if (this._el) this._el.classList.add('hidden');
  },
};

// Hook pause data
Bus.on('pauseData', data => PauseOverlay.show(data));
Bus.on('phaseChange', phase => {
  if (phase === 'playing') PauseOverlay.hide();
});

// ── Milestone toast ───────────────────────────────────────────────
const MilestoneToast = {
  _container: null,
  _queue: [],
  _showing: false,

  _build() {
    if (this._container) return;
    const div = document.createElement('div');
    div.id = 'milestone-toast';
    div.style.cssText = `
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--fg);
      color: var(--bg);
      font-family: var(--font-mono);
      font-size: 11px;
      letter-spacing: .15em;
      text-transform: uppercase;
      padding: 8px 20px;
      pointer-events: none;
      opacity: 0;
      transition: opacity 200ms ease;
      white-space: nowrap;
      z-index: 300;
    `;
    document.body.appendChild(div);
    this._container = div;
  },

  show(label) {
    this._build();
    this._queue.push(label);
    if (!this._showing) this._next();
  },

  _next() {
    if (this._queue.length === 0) { this._showing = false; return; }
    this._showing = true;
    const label = this._queue.shift();
    this._container.textContent = label;
    this._container.style.opacity = '1';
    setTimeout(() => {
      this._container.style.opacity = '0';
      setTimeout(() => this._next(), 220);
    }, 1400);
  },
};

Bus.on('milestone', ({ label }) => MilestoneToast.show(label));
Bus.on('powerupStart', ({ kind }) => {
  const def = POWERUP_TYPES.find(p => p.kind === kind);
  if (def) MilestoneToast.show(def.desc);
});
Bus.on('powerupEnd', ({ kind }) => {
  MilestoneToast.show(`${kind} expirou`);
});

// ── Pause button (inject into DOM) ───────────────────────────────
const PauseBtn = {
  _el: null,

  _build() {
    if (this._el) return;
    const btn = document.createElement('button');
    btn.id        = 'pause-btn';
    btn.textContent = '⏸';
    btn.style.cssText = `
      position: absolute;
      top: 6px;
      right: 6px;
      width: 28px;
      height: 28px;
      border: 1px solid var(--muted);
      background: transparent;
      font-size: 12px;
      color: var(--muted);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      border-radius: 2px;
      z-index: 50;
      opacity: 0;
      transition: opacity 150ms, color 150ms, border-color 150ms;
    `;
    const arena = document.getElementById('arena');
    if (arena) arena.appendChild(btn);
    this._el = btn;

    btn.addEventListener('click', e => {
      e.stopPropagation();
      if (state.phase === 'playing') Engine.pause();
      else if (state.phase === 'paused') Engine.resume();
    });
  },

  show() {
    this._build();
    if (this._el) this._el.style.opacity = '1';
  },

  hide() {
    if (this._el) this._el.style.opacity = '0';
  },
};

Bus.on('phaseChange', phase => {
  if (phase === 'playing') PauseBtn.show();
  else PauseBtn.hide();
});

// ── Level message toast ───────────────────────────────────────────
const LevelMessage = {
  _el: null,

  _build() {
    if (this._el) return;
    const div = document.createElement('div');
    div.style.cssText = `
      position: absolute;
      bottom: 12px;
      left: 0; right: 0;
      text-align: center;
      font-family: var(--font-mono);
      font-size: 9px;
      letter-spacing: .12em;
      text-transform: uppercase;
      color: var(--muted);
      pointer-events: none;
      opacity: 0;
      transition: opacity 300ms ease;
    `;
    const arena = document.getElementById('arena');
    if (arena) arena.appendChild(div);
    this._el = div;
  },

  show(msg) {
    this._build();
    if (!this._el || !msg) return;
    this._el.textContent = msg;
    this._el.style.opacity = '1';
    setTimeout(() => {
      if (this._el) this._el.style.opacity = '0';
    }, 2500);
  },
};

// Show level message on start
Bus.on('phaseChange', phase => {
  if (phase === 'playing' && state.mode === 'challenge') {
    const def = LEVELS[state.level - 1];
    if (def?.message) {
      setTimeout(() => LevelMessage.show(def.message), 200);
    }
  }
});

// ── Keyboard shortcut help ────────────────────────────────────────
const KeyHelp = {
  _visible: false,

  toggle() {
    this._visible = !this._visible;
    let el = document.getElementById('key-help');
    if (!el && this._visible) {
      el = document.createElement('div');
      el.id = 'key-help';
      el.style.cssText = `
        position:fixed;bottom:16px;right:16px;
        background:var(--bg);border:1px solid var(--border);
        padding:12px 16px;font-family:var(--font-mono);font-size:9px;
        letter-spacing:.08em;text-transform:uppercase;
        line-height:2;color:var(--muted);z-index:400;
      `;
      el.innerHTML = `
        ↑↓←→ / wasd — mover<br>
        espaço / enter — pausar<br>
        esc — pausar / fechar<br>
        ? — esta ajuda
      `;
      document.body.appendChild(el);
    }
    if (el) el.style.display = this._visible ? 'block' : 'none';
  },
};

// Bind '?' key
document.addEventListener('keydown', e => {
  if (e.key === '?') KeyHelp.toggle();
});

// ── Export extended UI objects ────────────────────────────────────
Object.assign(window, { PauseOverlay, MilestoneToast, LevelMessage, KeyHelp });

// ── end of snake.ui.js (extended) ─────────────────────────────────

// ── Expose UI globals ─────────────────────────────────────────────
window.UIInit = UIInit;
