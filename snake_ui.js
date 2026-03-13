// ═══════════════════════════════════════════════════════════════
//  SNAKE — UI Layer
//  HUD, overlays, input handling, auth & ranking
// ═══════════════════════════════════════════════════════════════

const DOM = (() => {
  const q  = id => document.getElementById(id);
  const qa = sel => document.querySelectorAll(sel);
  
  return {
    loginPanel:       q('login-panel'),
    playerNickInput:  q('player-nick-input'), // Modificado para Nickname
    loginBtn:         q('login-btn'),
    
    // Rank Panel
    rankPanel:        q('rank-panel'),
    rankList:         q('rank-list'),
    rankRefresh:      q('rank-refresh'),
    
    // Header & Stats
    scoreLive:        q('score-live'),
    soundBtn:         q('sound-btn'),
    iconSoundOn:      q('icon-sound-on'),
    iconSoundOff:     q('icon-sound-off'),
    stStreak:         q('st-streak'),
    stCombo:          q('st-combo'),
    stBest:           q('st-best'),
    modeBtns:         qa('.mode-btn'),

    // Arena & Overlays
    arena:            q('arena'),
    comboPopup:       q('combo-popup'),
    pwBar:            q('pw-bar'),
    pwFill:           q('pw-fill'),
    timerBar:         q('timer-bar'),
    timerFill:        q('timer-fill'),
    overlay:          q('overlay'),
    ovLabel:          q('ov-label'),
    ovScore:          q('ov-score'),
    ovSub:            q('ov-sub'),
    ovBest:           q('ov-best'),
    ovLevelBadge:     q('ov-level-badge'),
    playBtn:          q('play-btn'),
    statsBtn:         q('stats-btn'),
    levelsBtn:        q('levels-btn'),

    // Panels
    levelPanel:       q('level-panel'),
    levelGrid:        q('level-grid'),
    levelBack:        q('level-back'),
    levelModeLabel:   q('level-mode-label'),
    statsPanel:       q('stats-panel'),
    statsBack:        q('stats-back'),
    statGames:        q('stat-games'),
    statTotalScore:   q('stat-total-score'),
    statTotalFood:    q('stat-total-food'),
    statBestCombo:    q('stat-best-combo'),
    statPlayTime:     q('stat-play-time'),
    levelBar:         q('level-bar'),
    levelLabel:       q('level-label'),
    levelProgress:    q('level-progress'),
    levelTarget:      q('level-target'),
    dpadBtns:         qa('.dpad-btn'),
  };
})();

let _selectedMode   = 'classic';
let _selectedLevel  = 1;
let _comboTimeout   = null;
let _lastCombo      = 0;

// ── Funções de Overlay e UI Padrão ──────────────────────────────────
function _showComboPopup(combo) {
  if (!DOM.comboPopup) return;
  if (combo < 3) { DOM.comboPopup.classList.remove('pop'); return; }
  DOM.comboPopup.textContent = combo >= CFG.COMBO_MAX ? `MAX ×${combo}!` : `×${combo}`;
  DOM.comboPopup.classList.remove('pop');
  void DOM.comboPopup.offsetWidth;
  DOM.comboPopup.classList.add('pop');
  clearTimeout(_comboTimeout);
  _comboTimeout = setTimeout(() => { DOM.comboPopup.classList.remove('pop'); }, 700);
}

function _updateHUD(st) {
  if (DOM.scoreLive)  DOM.scoreLive.textContent  = String(st.score).padStart(2, '0');
  if (DOM.stStreak)   DOM.stStreak.textContent   = st.streak;
  if (DOM.stBest)     DOM.stBest.textContent     = st.bestScore;

  if (DOM.stCombo) {
    const label = st.combo >= 2 ? `×${st.combo}` : '×1';
    DOM.stCombo.textContent = label;
    DOM.stCombo.dataset.level = st.combo >= 5 ? 'high' : st.combo >= 3 ? 'mid' : 'low';
  }

  if (DOM.pwFill) {
    if (st.pwActive && st.pwDuration > 0) {
      DOM.pwFill.style.width = Math.max(0, (st.pwTimer / st.pwDuration) * 100) + '%';
      if (DOM.pwBar) DOM.pwBar.setAttribute('data-kind', st.pwKind || '');
    } else {
      DOM.pwFill.style.width = '0%';
      if (DOM.pwBar) DOM.pwBar.removeAttribute('data-kind');
    }
  }

  if (DOM.timerFill && st.mode === 'challenge') {
    const levelDef = LEVELS[st.level - 1];
    if (levelDef && levelDef.timeLimit !== null && st.timeLeft !== null) {
      const pct = (st.timeLeft / levelDef.timeLimit) * 100;
      DOM.timerFill.style.width = Math.max(0, pct) + '%';
      DOM.timerFill.dataset.urgent = pct < 25 ? 'true' : 'false';
      if (DOM.timerBar) DOM.timerBar.style.display = 'block';
    } else { if (DOM.timerBar) DOM.timerBar.style.display = 'none'; }
  } else { if (DOM.timerBar) DOM.timerBar.style.display = 'none'; }

  if (DOM.levelBar) {
    if (st.mode === 'challenge') {
      const ld = LEVELS[st.level - 1];
      DOM.levelBar.style.display = 'flex';
      if (DOM.levelLabel)    DOM.levelLabel.textContent    = `fase ${st.level} — ${ld?.label || ''}`;
      if (DOM.levelProgress) DOM.levelProgress.textContent = st.levelEaten;
      if (DOM.levelTarget)   DOM.levelTarget.textContent   = ld?.target ?? '?';
    } else { DOM.levelBar.style.display = 'none'; }
  }
}

function _showMenu() {
  if (!DOM.overlay) return;
  DOM.overlay.classList.remove('hidden');
  DOM.overlay.dataset.phase = 'menu';
  if (DOM.ovLabel)  DOM.ovLabel.textContent  = 'snake';
  if (DOM.ovScore)  DOM.ovScore.textContent  = '—';
  if (DOM.ovSub)    DOM.ovSub.textContent    = '';
  if (DOM.ovBest)   DOM.ovBest.style.display = 'none';
  if (DOM.playBtn)  DOM.playBtn.textContent  = 'jogar';
  if (DOM.ovLevelBadge) DOM.ovLevelBadge.style.display = 'none';
}

function _showGameOver(data) {
  if (!DOM.overlay) return;
  DOM.overlay.classList.remove('hidden');
  DOM.overlay.dataset.phase = 'gameover';

  const best = Store.getBest(state.mode);
  if (DOM.ovLabel) { DOM.ovLabel.textContent = data.isNew ? 'NOVO RECORDE!' : 'FIM DE JOGO'; }
  if (DOM.ovScore) DOM.ovScore.textContent = String(data.score).padStart(2, '0');
  if (DOM.ovSub) {
    DOM.ovSub.innerHTML = `${data.streak} COMIDOS · COMBO ×${data.combo}
      <span style="display: block; margin-top: 12px; font-size: 9px; opacity: 0.6; letter-spacing: 0.1em;">
        PRESSIONE <b style="color: var(--fg);">ESPAÇO</b> OU <b style="color: var(--fg);">R</b> PARA REINICIAR
      </span>`;
  }
  if (DOM.ovBest) {
    if (!data.isNew && best > 0) {
      DOM.ovBest.innerHTML = `RECORDE: <b>${best}</b>`;
      DOM.ovBest.style.display = 'block';
    } else { DOM.ovBest.style.display = 'none'; }
  }
  if (DOM.playBtn) DOM.playBtn.textContent = 'JOGAR NOVAMENTE';
  if (DOM.ovLevelBadge) DOM.ovLevelBadge.style.display = 'none';
}

function _hideOverlay() { if (DOM.overlay) DOM.overlay.classList.add('hidden'); }

// ── Rank Panel (Lógica Dinâmica) ──────────────────────────────────
const RankPanel = {
  async load() {
    if (!DOM.rankList) return;
    DOM.rankList.innerHTML = '<div class="rank-loading">sincronizando servidor...</div>';
    if (!window.FirebaseDB) {
      DOM.rankList.innerHTML = '<div class="rank-loading">modo offline</div>';
      return;
    }
    try {
      const rows = await window.FirebaseDB.loadRanking(5);
      this._render(rows);
    } catch (e) {
      DOM.rankList.innerHTML = '<div class="rank-loading">erro ao sincronizar</div>';
    }
  },

  _render(rows) {
    if (!DOM.rankList) return;
    const currentId = 'P_' + (localStorage.getItem(CFG.STORAGE_KEY + 'last_nick') || '');
    if (!rows || rows.length === 0) {
      DOM.rankList.innerHTML = '<div class="rank-loading">banco de dados limpo</div>';
      return;
    }
    DOM.rankList.innerHTML = rows.map((r, i) => {
      const nick  = r.nick  || r.id.replace(/^P_/, '');
      const score = r.best_classic || 0;
      const isMe  = r.id === currentId;
      return `
        <div class="rank-row${isMe ? ' rank-me' : ''}">
          <span class="rank-pos">${i + 1}</span>
          <span class="rank-nick">${nick}</span>
          <span class="rank-score">${score}</span>
        </div>`;
    }).join('');
  }
};

// ── Lógica de Autenticação com Nickname ───────────────────────────
function _initAuth() {
  if (!DOM.loginPanel) return;

  const savedNick = localStorage.getItem(CFG.STORAGE_KEY + 'last_nick');

  const authenticate = async () => {
    let nick = DOM.playerNickInput ? DOM.playerNickInput.value.trim() : '';
    
    // Tratativa rígida para gerar ou limpar o nickname
    if (!nick) {
      const hex = Math.random().toString(16).substring(2, 6).toUpperCase();
      nick = `JOG-${hex}`;
    } else {
      nick = nick.toUpperCase().replace(/[^A-Z0-9_\-]/g, '').slice(0, 12);
    }

    const id = 'P_' + nick;

    DOM.loginBtn.classList.add('is-loading');
    Store.setPlayerId(id);
    localStorage.setItem(CFG.STORAGE_KEY + 'last_session_id', id);
    localStorage.setItem(CFG.STORAGE_KEY + 'last_nick', nick);

    if (window.FirebaseDB) {
      const cloudData = await window.FirebaseDB.loadProfile(id);
      if (cloudData) {
        if (cloudData.best_classic) Store.set('best_classic', cloudData.best_classic);
        if (cloudData.best_wrap) Store.set('best_wrap', cloudData.best_wrap);
        if (cloudData.best_speed) Store.set('best_speed', cloudData.best_speed);
        if (cloudData.best_challenge) Store.set('best_challenge', cloudData.best_challenge);
        if (cloudData.unlocked) Store.set('unlocked', cloudData.unlocked);
        if (cloudData.stats) Store.set('stats', cloudData.stats);
      }
      
      // Salva o nickname ativamente na Nuvem
      await window.FirebaseDB.saveProfile(id, { nick: nick, best_classic: Store.get('best_classic', 0) });
      if (!cloudData) Store.syncToCloud();
    }

    DOM.loginBtn.classList.remove('is-loading');
    if (DOM.stBest) DOM.stBest.textContent = Store.getBest(_selectedMode);
    
    DOM.loginPanel.style.opacity = '0';
    DOM.loginPanel.style.pointerEvents = 'none';
    setTimeout(() => {
      DOM.loginPanel.classList.add('hidden');
      RankPanel.load(); // Carrega o ranking assim que logar
    }, 400);

    if (typeof MilestoneToast !== 'undefined') {
      setTimeout(() => MilestoneToast.show(`OPERADOR IDENTIFICADO: ${nick}`), 500);
    }
  };

  if (savedNick) {
    // Autologin oculto
    DOM.playerNickInput.value = savedNick;
    authenticate();
    return;
  }

  DOM.loginBtn.addEventListener('click', authenticate);
  if (DOM.playerNickInput) {
    DOM.playerNickInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') authenticate();
    });
  }
}

// ── Eventos e Input ───────────────────────────────────────────────
function _bindKeyboard() {
  const MAP = { ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT', w: 'UP', s: 'DOWN', a: 'LEFT', d: 'RIGHT', W: 'UP', S: 'DOWN', A: 'LEFT', D: 'RIGHT' };
  document.addEventListener('keydown', e => {
    if (MAP[e.key]) { e.preventDefault(); Engine.setDir(MAP[e.key]); return; }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (state.phase === 'menu' || state.phase === 'gameover') _startGame();
      else if (state.phase === 'playing') Engine.pause();
      else if (state.phase === 'paused') Engine.resume();
    }
    if (e.key.toLowerCase() === 'r') {
      e.preventDefault();
      if (['gameover', 'playing', 'paused'].includes(state.phase)) _startGame();
    }
  });
}

function _bindSwipe() {
  let tx0 = 0, ty0 = 0;
  document.addEventListener('touchstart', e => { tx0 = e.touches[0].clientX; ty0 = e.touches[0].clientY; }, { passive: true });
  document.addEventListener('touchend', e => {
    if (state.phase !== 'playing') return;
    const dx = e.changedTouches[0].clientX - tx0;
    const dy = e.changedTouches[0].clientY - ty0;
    if (Math.abs(dx) < 22 && Math.abs(dy) < 22) return;
    if (Math.abs(dx) > Math.abs(dy)) Engine.setDir(dx > 0 ? 'RIGHT' : 'LEFT');
    else Engine.setDir(dy > 0 ? 'DOWN' : 'UP');
  }, { passive: true });
}

function _bindDpad() {
  DOM.dpadBtns.forEach(btn => {
    const dir = btn.dataset.d;
    btn.addEventListener('click', () => Engine.setDir(dir));
    btn.addEventListener('touchstart', e => { e.preventDefault(); Engine.setDir(dir); }, { passive: false });
  });
}

function _bindButtons() {
  if (DOM.playBtn) DOM.playBtn.addEventListener('click', () => { if (DOM.overlay.dataset.phase !== 'levelup') _startGame(); });
  if (DOM.levelsBtn) DOM.levelsBtn.addEventListener('click', () => { /* _showLevelPanel() */ });
  if (DOM.statsBtn) DOM.statsBtn.addEventListener('click', () => { /* _showStatsPanel() */ });
  if (DOM.rankRefresh) DOM.rankRefresh.addEventListener('click', () => RankPanel.load());
  if (DOM.soundBtn) {
    DOM.soundBtn.addEventListener('click', () => {
      const isEnabled = SoundBus.toggle();
      if (isEnabled) { DOM.iconSoundOff.style.display = 'none'; DOM.iconSoundOn.style.display = 'block'; } 
      else { DOM.iconSoundOn.style.display = 'none'; DOM.iconSoundOff.style.display = 'block'; }
    });
  }
  DOM.modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (state.phase === 'playing') return;
      _selectedMode = btn.dataset.mode;
      DOM.modeBtns.forEach(b => b.classList.toggle('active', b.dataset.mode === _selectedMode));
    });
  });
}

function _startGame() {
  _hideOverlay();
  Engine.start(_selectedMode, 1);
}

function _bindBus() {
  Bus.on('stateUpdate', _updateHUD);
  Bus.on('foodEaten', ({ combo }) => { if (combo !== _lastCombo) { _lastCombo = combo; _showComboPopup(combo); } });
  Bus.on('gameOver', data => { 
    setTimeout(() => _showGameOver(data), 350); 
    setTimeout(() => RankPanel.load(), 2000); // Atualiza ranking após morrer
  });
  Bus.on('phaseChange', phase => { if (phase === 'playing') _hideOverlay(); });
  Bus.on('powerupStart', ({ kind }) => { if (DOM.pwBar) DOM.pwBar.setAttribute('data-kind', kind); });
  Bus.on('powerupEnd', () => { if (DOM.pwFill) DOM.pwFill.style.width = '0%'; });
}

// ── Extended UI: Milestone e Pause  ───────────────────────────────
const MilestoneToast = {
  _container: null, _queue: [], _showing: false,
  _build() {
    if (this._container) return;
    const div = document.createElement('div');
    div.style.cssText = `position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%); background: var(--fg); color: var(--bg); font-family: var(--font-mono); font-size: 11px; letter-spacing: .15em; text-transform: uppercase; padding: 8px 20px; pointer-events: none; opacity: 0; transition: opacity 200ms ease; z-index: 300;`;
    document.body.appendChild(div);
    this._container = div;
  },
  show(label) { this._build(); this._queue.push(label); if (!this._showing) this._next(); },
  _next() {
    if (this._queue.length === 0) { this._showing = false; return; }
    this._showing = true;
    this._container.textContent = this._queue.shift();
    this._container.style.opacity = '1';
    setTimeout(() => { this._container.style.opacity = '0'; setTimeout(() => this._next(), 220); }, 1400);
  },
};
Bus.on('milestone', ({ label }) => MilestoneToast.show(label));

// ── Init ──────────────────────────────────────────────────────────
function UIInit() {
  _initAuth();
  _bindBus();
  _bindKeyboard();
  _bindSwipe();
  _bindDpad();
  _bindButtons();
  _showMenu();
}

Object.assign(window, { MilestoneToast, RankPanel, UIInit });