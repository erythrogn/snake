// js/ui/ui.js
// Acessa globais expostos pelo main.js: CFG, LEVELS, MODES, state, Engine, Store, Bus
// (compatibilidade com o padrão antigo de window globals)

const D = {
  loginPanel:      document.getElementById('login-panel'),
  loginInput:      document.getElementById('player-nick-input'),
  loginBtn:        document.getElementById('login-btn'),
  rankPanel:       document.getElementById('side-rank'),
  rankList:        document.getElementById('rank-list-side'),
  rankRefresh:     document.getElementById('rank-refresh-side'),
  scoreLive:       document.getElementById('score-live'),
  soundBtn:        document.getElementById('sound-btn'),
  iconSoundOn:     document.getElementById('icon-sound-on'),
  iconSoundOff:    document.getElementById('icon-sound-off'),
  stStreak:        document.getElementById('st-streak'),
  stCombo:         document.getElementById('st-combo'),
  stBest:          document.getElementById('st-best'),
  modeBtns:        document.querySelectorAll('.mode-btn'),
  arena:           document.getElementById('arena'),
  forcedEvent:     document.getElementById('forced-event'),
  comboPopup:      document.getElementById('combo-popup'),
  pwBar:           document.getElementById('pw-bar'),
  pwFill:          document.getElementById('pw-fill'),
  timerBar:        document.getElementById('timer-bar'),
  timerFill:       document.getElementById('timer-fill'),
  overlay:         document.getElementById('overlay'),
  ovLabel:         document.getElementById('ov-label'),
  ovScore:         document.getElementById('ov-score'),
  ovSub:           document.getElementById('ov-sub'),
  ovBest:          document.getElementById('ov-best'),
  ovLevelBadge:    document.getElementById('ov-level-badge'),
  playBtn:         document.getElementById('play-btn'),
  statsBtn:        document.getElementById('stats-btn'),
  levelsBtn:       document.getElementById('levels-btn'),
  levelPanel:      document.getElementById('level-panel'),
  levelGrid:       document.getElementById('level-grid'),
  levelBack:       document.getElementById('level-back'),
  statsPanel:      document.getElementById('stats-panel'),
  statsBack:       document.getElementById('stats-back'),
  statGames:       document.getElementById('stat-games'),
  statTotalScore:  document.getElementById('stat-total-score'),
  statTotalFood:   document.getElementById('stat-total-food'),
  statBestCombo:   document.getElementById('stat-best-combo'),
  statPlayTime:    document.getElementById('stat-play-time'),
  levelBar:        document.getElementById('level-bar'),
  levelLabel:      document.getElementById('level-label'),
  levelProgress:   document.getElementById('level-progress'),
  levelTarget:     document.getElementById('level-target'),
  dpadBtns:        document.querySelectorAll('.dpad-btn'),
};

let _selectedMode  = 'classic';
let _selectedLevel = 1;
let _comboTimeout  = null;
let _lastCombo     = 0;

// ── Combo popup ──────────────────────────────────────────────────
function _showComboPopup(combo) {
  if (!D.comboPopup) return;
  if (combo < 3) { D.comboPopup.classList.remove('pop'); return; }
  D.comboPopup.textContent = combo >= CFG.COMBO_MAX ? `MAX ×${combo}!` : `×${combo}`;
  D.comboPopup.classList.remove('pop');
  void D.comboPopup.offsetWidth;
  D.comboPopup.classList.add('pop');
  clearTimeout(_comboTimeout);
  _comboTimeout = setTimeout(() => D.comboPopup.classList.remove('pop'), 700);
}

// ── HUD ──────────────────────────────────────────────────────────
function _updateHUD(st) {
  if (D.scoreLive) D.scoreLive.textContent = String(st.score).padStart(2, '0');
  if (D.stStreak)  D.stStreak.textContent  = st.streak;
  if (D.stBest)    D.stBest.textContent    = st.bestScore;

  if (D.stCombo) {
    D.stCombo.textContent    = st.combo >= 2 ? `×${st.combo}` : '×1';
    D.stCombo.dataset.level  = st.combo >= 5 ? 'high' : st.combo >= 3 ? 'mid' : 'low';
  }

  if (D.pwFill) {
    D.pwFill.style.width = (st.pwActive && st.pwDuration > 0)
      ? Math.max(0, (st.pwTimer / st.pwDuration) * 100) + '%'
      : '0%';
  }

  if (D.timerFill) {
    if (st.mode === 'challenge' && st.timeLeft !== null) {
      const ld  = LEVELS[st.level - 1];
      const pct = ld ? (st.timeLeft / ld.timeLimit) * 100 : 0;
      D.timerFill.style.width = Math.max(0, pct) + '%';
      if (D.timerBar) D.timerBar.style.display = 'block';
    } else {
      if (D.timerBar) D.timerBar.style.display = 'none';
    }
  }

  if (D.levelBar) {
    if (st.mode === 'challenge') {
      const ld = LEVELS[st.level - 1];
      D.levelBar.classList.remove('hidden');
      if (D.levelLabel)    D.levelLabel.textContent    = `fase ${st.level}`;
      if (D.levelProgress) D.levelProgress.textContent = st.levelEaten;
      if (D.levelTarget)   D.levelTarget.textContent   = ld?.target ?? '?';
    } else {
      D.levelBar.classList.add('hidden');
    }
  }
}

// ── Overlay ──────────────────────────────────────────────────────
function _showMenu() {
  if (!D.overlay) return;
  D.overlay.classList.remove('hidden');
  D.overlay.dataset.phase = 'menu';
  if (D.ovLabel)      D.ovLabel.textContent      = 'snake';
  if (D.ovScore)      D.ovScore.textContent      = '—';
  if (D.ovSub)        D.ovSub.textContent        = '';
  if (D.ovBest)       D.ovBest.classList.add('hidden');
  if (D.ovLevelBadge) D.ovLevelBadge.classList.add('hidden');
  if (D.playBtn)      D.playBtn.textContent      = 'iniciar';
}

function _showGameOver(data) {
  if (!D.overlay) return;
  D.overlay.classList.remove('hidden');
  D.overlay.dataset.phase = 'gameover';

  const best = Store.getBest(state.mode);
  if (D.ovLabel) D.ovLabel.textContent = data.isNew ? 'NOVO RECORDE' : 'FIM DE JOGO';
  if (D.ovScore) D.ovScore.textContent = String(data.score).padStart(2, '0');
  if (D.ovSub)   D.ovSub.innerHTML =
    `${data.streak} comidos · combo ×${data.combo}<br>` +
    `<small>espaço ou R para reiniciar</small>`;
  if (D.ovBest) {
    if (!data.isNew && best > 0) {
      D.ovBest.textContent = `recorde: ${best}`;
      D.ovBest.classList.remove('hidden');
    } else {
      D.ovBest.classList.add('hidden');
    }
  }
  if (D.playBtn) D.playBtn.textContent = 'jogar novamente';
}

function _hideOverlay() { D.overlay?.classList.add('hidden'); }

// ── Rank panel ───────────────────────────────────────────────────
const RankPanel = {
  _cache: [],

  async load(force = false) {
    if (!D.rankList) return;
    if (!force && this._cache.length > 0) { this._render(this._cache); return; }

    D.rankList.innerHTML = '<div class="rank-loading">sincronizando...</div>';
    if (D.rankPanel) D.rankPanel.classList.remove('hidden');

    if (!window.FirebaseDB) {
      D.rankList.innerHTML = '<div class="rank-loading">modo offline</div>';
      return;
    }
    try {
      const rows   = await window.FirebaseDB.loadRanking(8);
      this._cache  = rows;
      this._render(rows);
    } catch (e) {
      D.rankList.innerHTML = '<div class="rank-loading">erro na ligação<br><button class="btn-retry" onclick="RankPanel.load(true)">tentar novamente</button></div>';
    }
  },

  _render(rows) {
    if (!D.rankList) return;
    const currentId = Store.getPlayerId();
    if (!rows?.length) { D.rankList.innerHTML = '<div class="rank-loading">sem dados</div>'; return; }

    const icons = ['▲', '◆', '★'];
    D.rankList.innerHTML = rows.map((r, i) => {
      const div = document.createElement('div');
      div.textContent = r.nick || r.id.replace(/^P_/, '');
      const nick  = div.textContent; // XSS-safe via textContent
      const score = r.best_classic || 0;
      const isMe  = r.id === currentId;
      return `<div class="rank-row${isMe ? ' rank-me' : ''}">
        <span class="rank-pos">${icons[i] || (i + 1)}</span>
        <span class="rank-nick">${nick.replace(/</g,'&lt;')}</span>
        <span class="rank-score">${score}</span>
      </div>`;
    }).join('');
  },
};

// ── Auth ─────────────────────────────────────────────────────────
function _initAuth() {
  if (!D.loginPanel) return;

  let savedNick = null;
  try { savedNick = localStorage.getItem(CFG.STORAGE_KEY + 'last_nick'); } catch (e) {}

  const authenticate = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (D.loginBtn) D.loginBtn.classList.add('is-loading');

    try {
      let nick = D.loginInput ? D.loginInput.value.trim() : '';
      if (!nick) {
        nick = 'JOG' + Math.floor(Math.random() * 9999).toString().padStart(4, '0');
      } else {
        nick = nick.toUpperCase().replace(/[^A-Z0-9_\-]/g, '').slice(0, 12) || 'JOG0001';
      }

      const id = 'P_' + nick;
      try {
        localStorage.setItem(CFG.STORAGE_KEY + 'last_nick',       nick);
        localStorage.setItem(CFG.STORAGE_KEY + 'last_session_id', id);
      } catch (_) {}

      Store.setPlayerId(id);

      // Merge com cloud (não bloqueia a interface)
      if (window.FirebaseDB) {
        Promise.race([
          window.FirebaseDB.loadProfile(id),
          new Promise(r => setTimeout(() => r(null), 3000)),
        ]).then(cloud => {
          if (cloud) {
            if ((cloud.best_classic   || 0) > Store.getBest('classic'))   Store.set('best_classic',   cloud.best_classic);
            if ((cloud.best_challenge || 0) > Store.getBest('challenge')) Store.set('best_challenge', cloud.best_challenge);
            if ((cloud.unlocked       || 1) > Store.getUnlocked())        Store.set('unlocked',       cloud.unlocked);
          }
          // Salva perfil imediatamente após login
          Store.syncToCloud();
        }).catch(() => Store.syncToCloud());
      }

      if (D.stBest) D.stBest.textContent = Store.getBest(_selectedMode);

      if (D.loginPanel) {
        D.loginPanel.style.opacity = '0';
        D.loginPanel.style.pointerEvents = 'none';
        setTimeout(() => {
          D.loginPanel.classList.add('hidden');
          D.loginPanel.style.opacity = '';
          D.loginPanel.style.pointerEvents = '';
          D.rankPanel?.classList.remove('hidden');
          RankPanel.load();
          Bus.emit('authComplete', { id, nick });
        }, 300);
      }
    } catch (err) {
      console.error('[Auth] erro:', err);
      D.loginPanel?.classList.add('hidden');
    } finally {
      if (D.loginBtn) D.loginBtn.classList.remove('is-loading');
    }
  };

  if (savedNick) {
    if (D.loginInput) D.loginInput.value = savedNick;
    setTimeout(authenticate, 80);
    return;
  }

  D.loginBtn?.addEventListener('click', authenticate);
  D.loginInput?.addEventListener('keypress', e => { if (e.key === 'Enter') { e.preventDefault(); authenticate(e); } });
}

// ── Teclado ──────────────────────────────────────────────────────
function _bindKeyboard() {
  const MAP = { ArrowUp:'UP', ArrowDown:'DOWN', ArrowLeft:'LEFT', ArrowRight:'RIGHT', w:'UP', s:'DOWN', a:'LEFT', d:'RIGHT', W:'UP', S:'DOWN', A:'LEFT', D:'RIGHT' };
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (MAP[e.key]) { e.preventDefault(); Engine.setDir(MAP[e.key]); return; }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (state.phase === 'menu' || state.phase === 'gameover') _startGame();
      else if (state.phase === 'playing') Engine.pause();
      else if (state.phase === 'paused')  Engine.resume();
    }
    if (e.key.toLowerCase() === 'r') {
      e.preventDefault();
      if (['gameover','playing','paused'].includes(state.phase)) _startGame();
    }
  });
}

// ── Swipe ────────────────────────────────────────────────────────
function _bindSwipe() {
  let tx0 = 0, ty0 = 0;
  document.addEventListener('touchstart', e => { tx0 = e.touches[0].clientX; ty0 = e.touches[0].clientY; }, { passive: true });
  document.addEventListener('touchend', e => {
    if (state.phase !== 'playing') return;
    const dx = e.changedTouches[0].clientX - tx0;
    const dy = e.changedTouches[0].clientY - ty0;
    if (Math.abs(dx) < 22 && Math.abs(dy) < 22) return;
    Engine.setDir(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'RIGHT' : 'LEFT') : (dy > 0 ? 'DOWN' : 'UP'));
  }, { passive: true });
}

// ── D-pad ────────────────────────────────────────────────────────
function _bindDpad() {
  D.dpadBtns.forEach(btn => {
    const dir = btn.dataset.d;
    btn.addEventListener('click', () => Engine.setDir(dir));
    btn.addEventListener('touchstart', e => { e.preventDefault(); Engine.setDir(dir); }, { passive: false });
  });
}

// ── Botões / modos / painéis ─────────────────────────────────────
function _buildLevelGrid() {
  if (!D.levelGrid) return;
  D.levelGrid.innerHTML = '';
  const unlocked = Store.getUnlocked();
  LEVELS.forEach((lvl, i) => {
    const num    = i + 1;
    const locked = num > unlocked;
    const btn    = document.createElement('div');
    btn.className = 'level-cell' + (locked ? ' locked' : '');
    btn.innerHTML = `<span class="lc-num">${num}</span><span class="lc-name">${lvl.label}</span>`;
    if (!locked) {
      btn.addEventListener('click', () => {
        _selectedLevel = num; _selectedMode = 'challenge';
        D.modeBtns.forEach(b => b.classList.toggle('active', b.dataset.mode === 'challenge'));
        D.levelPanel?.classList.add('hidden');
        _startGame();
      });
    }
    D.levelGrid.appendChild(btn);
  });
}

function _showStats() {
  const s = Store.getStats();
  if (D.statGames)      D.statGames.textContent      = s.gamesPlayed;
  if (D.statTotalScore) D.statTotalScore.textContent  = s.totalScore;
  if (D.statTotalFood)  D.statTotalFood.textContent   = s.totalFood;
  if (D.statBestCombo)  D.statBestCombo.textContent   = `×${s.bestCombo}`;
  if (D.statPlayTime) {
    const m = Math.floor(s.playTime / 60000), sec = Math.floor((s.playTime % 60000) / 1000);
    D.statPlayTime.textContent = `${m}m ${sec}s`;
  }
  D.statsPanel?.classList.remove('hidden');
}

function _bindButtons() {
  D.playBtn?.addEventListener('click', () => {
    if (D.overlay?.dataset.phase !== 'levelup') _startGame();
  });
  D.levelsBtn?.addEventListener('click', () => { _buildLevelGrid(); D.levelPanel?.classList.remove('hidden'); });
  D.levelBack?.addEventListener('click', () => D.levelPanel?.classList.add('hidden'));
  D.statsBtn?.addEventListener('click',  () => _showStats());
  D.statsBack?.addEventListener('click', () => D.statsPanel?.classList.add('hidden'));
  D.rankRefresh?.addEventListener('click', () => RankPanel.load(true));

  D.soundBtn?.addEventListener('click', () => {
    const on = window.SoundBus?.toggle();
    if (D.iconSoundOff) D.iconSoundOff.style.display = on ? 'none'  : '';
    if (D.iconSoundOn)  D.iconSoundOn.style.display  = on ? ''      : 'none';
  });

  D.modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (state.phase === 'playing') return;
      _selectedMode = btn.dataset.mode;
      D.modeBtns.forEach(b => b.classList.toggle('active', b.dataset.mode === _selectedMode));
      if (D.stBest) D.stBest.textContent = Store.getBest(_selectedMode);
      if (_selectedMode === 'challenge') { _buildLevelGrid(); D.levelPanel?.classList.remove('hidden'); }
    });
  });
}

// ── Start ────────────────────────────────────────────────────────
function _startGame() {
  _hideOverlay();
  Engine.start(_selectedMode, _selectedMode === 'challenge' ? _selectedLevel : 1);
}

// ── Bus ──────────────────────────────────────────────────────────
function _bindBus() {
  Bus.on('stateUpdate', _updateHUD);
  Bus.on('foodEaten', ({ combo }) => {
    if (combo !== _lastCombo) { _lastCombo = combo; _showComboPopup(combo); }
  });
  Bus.on('gameOver', data => {
    setTimeout(() => _showGameOver(data), 350);
    // Atualiza rank 2s depois do game over (dá tempo para o Firestore gravar)
    setTimeout(() => RankPanel.load(true), 2000);
  });
  Bus.on('phaseChange', phase => {
    if (phase === 'playing') _hideOverlay();
    if (phase === 'win') {
      D.overlay?.classList.remove('hidden');
      if (D.ovLabel) D.ovLabel.textContent = 'PARABÉNS!';
      if (D.ovScore) D.ovScore.textContent = String(state.score).padStart(2, '0');
      if (D.ovSub)   D.ovSub.textContent   = 'Todos os setores concluídos.';
      if (D.playBtn) D.playBtn.textContent  = 'jogar novamente';
    }
  });
  Bus.on('powerupEnd',   () => { if (D.pwFill) D.pwFill.style.width = '0%'; });
  Bus.on('levelComplete', ({ level, bonus }) => {
    if (D.overlay) {
      D.overlay.classList.remove('hidden');
      D.overlay.dataset.phase = 'levelup';
      if (D.ovLabel) D.ovLabel.textContent = `SETOR ${level} OK`;
      if (D.ovScore) D.ovScore.textContent = `+${bonus}`;
      if (D.ovSub)   D.ovSub.textContent   = 'avançando...';
    }
  });
  Bus.on('newRecord', () => {
    setTimeout(() => RankPanel.load(true), 3000);
  });

  // Portal mode: borda azul na arena
  Bus.on('portalModeStart', () => {
    D.arena?.classList.add('portal-active');
  });
  Bus.on('portalModeEnd', () => {
    D.arena?.classList.remove('portal-active');
  });

  // Powerup forçado (500pts)
  Bus.on('forcedPowerup', ({message}) => {
    if (!D.forcedEvent) return;
    D.forcedEvent.innerHTML = message || 'PODER ESPECIAL!';
    D.forcedEvent.classList.remove('show');
    void D.forcedEvent.offsetWidth;
    D.forcedEvent.classList.add('show');
    // Flash no score
    D.scoreLive?.classList.add('milestone');
    setTimeout(() => D.scoreLive?.classList.remove('milestone'), 400);
  });

  // Colorir a barra de powerup conforme o tipo
  Bus.on('powerupStart', ({kind}) => {
    if (D.pwFill) D.pwFill.dataset.kind = kind || '';
  });
  Bus.on('powerupEnd', () => {
    if (D.pwFill) { D.pwFill.dataset.kind = ''; D.pwFill.style.width = '0%'; }
  });

  // Timer urgente quando < 10s
  Bus.on('timerTick', (t) => {
    if (D.timerFill) {
      if (t !== null && t <= 10000) D.timerFill.classList.add('urgent');
      else D.timerFill.classList.remove('urgent');
    }
  });

  // Tooltip de comida rara no canvas
  Bus.on('foodEaten', ({food}) => {
    if (food.pts >= 20 && D.arena) {
      const tip = document.createElement('div');
      tip.className = 'food-tooltip';
      tip.textContent = '+' + food.pts + ' ' + (food.label || '');
      tip.style.left = Math.random() * 60 + 20 + '%';
      tip.style.top  = Math.random() * 50 + 20 + '%';
      D.arena.appendChild(tip);
      setTimeout(() => tip.remove(), 1900);
    }
  });
}

// ── Init ─────────────────────────────────────────────────────────
export function UIInit() {
  _initAuth();
  _bindBus();
  _bindKeyboard();
  _bindSwipe();
  _bindDpad();
  _bindButtons();
  _showMenu();
}

// Exposição global (para console debug e callbacks inline de HTML)
window.RankPanel = RankPanel;
