// js/ui/ui.js — UI limpa, sem dependência de globals no topo
// Todos os globals (CFG, Engine, Store, Bus, etc.) são acessados
// via window.X dentro das funções — nunca no topo do módulo.

// ── Referências DOM (lazily safe) ────────────────────────────────
function el(id)  { return document.getElementById(id); }
function qsa(sel){ return document.querySelectorAll(sel); }

// ── Estado local da UI ────────────────────────────────────────────
let _selectedMode  = 'classic';
let _selectedLevel = 1;
let _comboTimeout  = null;
let _lastCombo     = 0;

// ── Helpers ───────────────────────────────────────────────────────
function _hide(e){ if(e) e.classList.add('hidden'); }
function _show(e){ if(e) e.classList.remove('hidden'); }

// ── Combo popup ───────────────────────────────────────────────────
function _showComboPopup(combo) {
  const p = el('combo-popup'); if(!p) return;
  if(combo < 3){ p.classList.remove('pop'); return; }
  p.textContent = combo >= window.CFG?.COMBO_MAX ? `MAX ×${combo}!` : `×${combo}`;
  p.classList.remove('pop');
  void p.offsetWidth;
  p.classList.add('pop');
  clearTimeout(_comboTimeout);
  _comboTimeout = setTimeout(() => p.classList.remove('pop'), 700);
}

// ── HUD ───────────────────────────────────────────────────────────
function _updateHUD(st) {
  const scoreLive = el('score-live');
  const stStreak  = el('st-streak');
  const stBest    = el('st-best');
  const stCombo   = el('st-combo');
  const pwFill    = el('pw-fill');
  const pwLabel   = el('pw-label');
  const timerBar  = el('timer-bar');
  const timerFill = el('timer-fill');
  const levelBar  = el('level-bar');

  if(scoreLive) scoreLive.textContent = String(st.score).padStart(2,'0');
  if(stStreak)  stStreak.textContent  = st.streak;
  if(stBest)    stBest.textContent    = st.bestScore;

  if(stCombo){
    stCombo.textContent   = st.combo >= 2 ? `×${st.combo}` : '×1';
    stCombo.dataset.level = st.combo >= 5 ? 'high' : st.combo >= 3 ? 'mid' : 'low';
  }

  if(pwFill){
    const pct = (st.pwActive && st.pwDuration > 0)
      ? Math.max(0,(st.pwTimer/st.pwDuration)*100) : 0;
    pwFill.style.width      = pct + '%';
    pwFill.dataset.kind     = st.pwActive ? st.pwKind : '';
  }
  if(pwLabel){
    const labels = {
      slow:'LENTO', ghost:'FANTASMA', magnet:'ÍMÃ', x2:'×2',
      x3:'×3', portal_mode:'PORTAL', freeze:'GELO', shield:'ESCUDO', dash:'TURBO'
    };
    pwLabel.textContent = st.pwActive ? (labels[st.pwKind]||st.pwKind.toUpperCase()) : '';
  }

  if(timerFill && timerBar){
    if(st.mode === 'challenge' && st.timeLeft !== null){
      const ld  = window.LEVELS?.[st.level-1];
      const pct = ld ? (st.timeLeft/ld.timeLimit)*100 : 0;
      timerFill.style.width = Math.max(0,pct) + '%';
      timerBar.style.display = 'block';
    } else {
      timerBar.style.display = 'none';
    }
  }

  if(levelBar){
    if(st.mode === 'challenge'){
      const ld = window.LEVELS?.[st.level-1];
      _show(levelBar);
      const lbl = el('level-label');    if(lbl)  lbl.textContent  = `fase ${st.level}`;
      const lpg = el('level-progress'); if(lpg)  lpg.textContent  = st.levelEaten;
      const ltg = el('level-target');   if(ltg)  ltg.textContent  = ld?.target ?? '?';
    } else {
      _hide(levelBar);
    }
  }
}

// ── Overlay ───────────────────────────────────────────────────────
function _showMenu() {
  const ov = el('overlay'); if(!ov) return;
  _show(ov); ov.dataset.phase = 'menu';
  const ovLabel = el('ov-label'); if(ovLabel) ovLabel.textContent = 'snake';
  const ovScore = el('ov-score'); if(ovScore) ovScore.textContent = '—';
  const ovSub   = el('ov-sub');   if(ovSub)   ovSub.textContent   = '';
  _hide(el('ov-best')); _hide(el('ov-level-badge'));
  const pb = el('play-btn'); if(pb) pb.textContent = 'iniciar';
}

function _showGameOver(data) {
  const ov = el('overlay'); if(!ov) return;
  _show(ov); ov.dataset.phase = 'gameover';
  const best = window.Store?.getBest(window.state?.mode || 'classic') || 0;
  const ovLabel = el('ov-label'); if(ovLabel) ovLabel.textContent = data.isNew ? 'NOVO RECORDE' : 'FIM DE JOGO';
  const ovScore = el('ov-score'); if(ovScore) ovScore.textContent = String(data.score).padStart(2,'0');
  const ovSub   = el('ov-sub');
  if(ovSub) ovSub.innerHTML = `${data.streak} comidos · combo ×${data.combo}<br><small>espaço ou R para reiniciar</small>`;
  const ovBest  = el('ov-best');
  if(ovBest){
    if(!data.isNew && best > 0){ ovBest.textContent=`recorde: ${best}`; _show(ovBest); }
    else _hide(ovBest);
  }
  const pb = el('play-btn'); if(pb) pb.textContent = 'jogar novamente';
}

function _hideOverlay() { _hide(el('overlay')); }

// ── Rank ──────────────────────────────────────────────────────────
const RankPanel = {
  _cache: {},   // {classic:[], wrap:[], speed:[], challenge:[]}
  _mode: 'classic',

  setMode(mode){ this._mode=mode; },

  async load(force=false) {
    const list  = el('rank-list-side');
    const panel = el('side-rank');
    if(!list) return;
    const mode = this._mode;
    if(!force && this._cache[mode]?.length){ this._render(this._cache[mode]); return; }
    list.innerHTML = '<div class="rank-loading">sincronizando...</div>';
    if(panel) _show(panel);
    if(!window.FirebaseDB || !window.FirebaseDB.isOnline){
      list.innerHTML='<div class="rank-loading">modo offline</div>'; return;
    }
    try {
      const rows = await window.FirebaseDB.loadRanking(8, mode);
      this._cache[mode] = rows; this._render(rows);
    } catch(e) {
      list.innerHTML = '<div class="rank-loading">erro<br><button class="btn-retry" onclick="window.RankPanel.load(true)">tentar novamente</button></div>';
    }
  },

  _render(rows) {
    const list = el('rank-list-side'); if(!list) return;
    const currentId = window.Store?.getPlayerId() || '';
    const mode = this._mode;
    const field = {classic:'best_classic',wrap:'best_wrap',speed:'best_speed',challenge:'best_challenge'}[mode]||'best_classic';
    // Atualiza label do modo no header
    const modeLabels={classic:'clássico',wrap:'portal',speed:'veloz',challenge:'desafio'};
    const header = el('side-rank')?.querySelector('.rank-mode-label');
    if(header) header.textContent = modeLabels[mode]||mode;
    if(!rows?.length){ list.innerHTML='<div class="rank-loading">sem dados</div>'; return; }
    const icons = ['▲','◆','★'];
    list.innerHTML = rows.map((r,i) => {
      const nick  = (r.nick || r.id.replace(/^P_/,'')).replace(/</g,'&lt;');
      const score = r[field] || 0;
      if(score===0) return '';
      const isMe  = r.id === currentId;
      const col   = isMe && window.SnakeSkin ? window.SnakeSkin.getColor().body : '';
      return `<div class="rank-row${isMe?' rank-me':''}">
        <span class="rank-pos">${icons[i]||(i+1)}</span>
        <span class="rank-nick"${col?` style="color:${col}"`:''}>` + nick + `</span>
        <span class="rank-score">${score}</span>
      </div>`;
    }).filter(Boolean).join('') || '<div class="rank-loading">sem dados</div>';
  }
};

// ── Auth ──────────────────────────────────────────────────────────
function _initAuth() {
  const loginPanel = el('login-panel');
  const loginInput = el('player-nick-input');
  const loginBtn   = el('login-btn');
  if(!loginPanel) return;

  // Auto-login se já tem nick salvo
  let savedNick = null;
  try { savedNick = localStorage.getItem((window.CFG?.STORAGE_KEY||'snake_v2_')+'last_nick'); } catch(_){}

  const authenticate = async () => {
    if(loginBtn) loginBtn.classList.add('is-loading');
    try {
      let nick = loginInput ? loginInput.value.trim() : '';
      if(!nick) nick = 'JOG'+Math.floor(Math.random()*9999).toString().padStart(4,'0');
      else nick = nick.toUpperCase().replace(/[^A-Z0-9_\-]/g,'').slice(0,12) || 'JOG0001';

      const id = 'P_'+nick;
      try {
        localStorage.setItem((window.CFG?.STORAGE_KEY||'snake_v2_')+'last_nick', nick);
        localStorage.setItem((window.CFG?.STORAGE_KEY||'snake_v2_')+'last_session_id', id);
      } catch(_){}

      window.Store?.setPlayerId(id);

      // Sync Firebase sem bloquear
      if(window.FirebaseDB) {
        Promise.race([
          window.FirebaseDB.loadProfile(id),
          new Promise(r=>setTimeout(()=>r(null),3000))
        ]).then(cloud => {
          if(cloud){
            const S = window.Store;
            if((cloud.best_classic||0)   > S.getBest('classic'))   S.set('best_classic',   cloud.best_classic);
            if((cloud.best_challenge||0) > S.getBest('challenge')) S.set('best_challenge', cloud.best_challenge);
            if((cloud.unlocked||1)       > S.getUnlocked())        S.set('unlocked',       cloud.unlocked);
          }
          window.Store?.syncToCloud();
        }).catch(()=>window.Store?.syncToCloud());
      }

      // Atualiza HUD
      const stBest = el('st-best');
      if(stBest) stBest.textContent = window.Store?.getBest(_selectedMode) || 0;

      // Fecha painel
      loginPanel.style.transition = 'opacity 0.25s';
      loginPanel.style.opacity    = '0';
      setTimeout(() => {
        loginPanel.style.display    = 'none';
        loginPanel.style.transition = '';
        loginPanel.style.opacity    = '';
        _show(el('side-rank'));
        RankPanel.setMode(_selectedMode);
        RankPanel.load();
        window.Bus?.emit('authComplete', {id, nick});
      }, 280);
    } catch(err) {
      console.error('[Auth]', err);
      loginPanel.style.display = 'none';
    } finally {
      if(loginBtn) loginBtn.classList.remove('is-loading');
    }
  };

  if(savedNick) {
    if(loginInput) loginInput.value = savedNick;
    setTimeout(authenticate, 100);
    return;
  }

  // Botão principal — click e pointerup para cobrir todos os browsers
  if(loginBtn) {
    loginBtn.addEventListener('click',      authenticate);
    loginBtn.addEventListener('pointerup',  e => { if(e.pointerType==='touch') authenticate(); });
  }
  if(loginInput) {
    loginInput.addEventListener('keydown',  e => e.stopPropagation());
    loginInput.addEventListener('keypress', e => { if(e.key==='Enter'){ e.preventDefault(); authenticate(); } });
  }
}

// ── Teclado ───────────────────────────────────────────────────────
function _bindKeyboard() {
  const MAP = {ArrowUp:'UP',ArrowDown:'DOWN',ArrowLeft:'LEFT',ArrowRight:'RIGHT',w:'UP',s:'DOWN',a:'LEFT',d:'RIGHT',W:'UP',S:'DOWN',A:'LEFT',D:'RIGHT'};
  document.addEventListener('keydown', e => {
    if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA') return;
    if(MAP[e.key]){ e.preventDefault(); window.Engine?.setDir(MAP[e.key]); return; }
    const phase = window.state?.phase;
    if(e.key==='Enter'||e.key===' '){
      e.preventDefault();
      if(phase==='menu'||phase==='gameover') _startGame();
      else if(phase==='playing') window.Engine?.pause();
      else if(phase==='paused')  window.Engine?.resume();
    }
    if(e.key.toLowerCase()==='r'){
      e.preventDefault();
      if(['gameover','playing','paused'].includes(phase)) _startGame();
    }
  });
}

// ── Swipe ─────────────────────────────────────────────────────────
function _bindSwipe() {
  let tx=0, ty=0;
  // Swipe na arena especificamente para não conflitar com scroll da página
  const arena = el('arena');
  if(!arena) return;
  arena.addEventListener('touchstart', e => {
    tx=e.touches[0].clientX; ty=e.touches[0].clientY;
  }, {passive:true});
  arena.addEventListener('touchend', e => {
    if(window.state?.phase !== 'playing') return;
    const dx=e.changedTouches[0].clientX-tx, dy=e.changedTouches[0].clientY-ty;
    if(Math.abs(dx)<18&&Math.abs(dy)<18) return;
    window.Engine?.setDir(Math.abs(dx)>Math.abs(dy)?(dx>0?'RIGHT':'LEFT'):(dy>0?'DOWN':'UP'));
  }, {passive:true});
}

// ── D-pad ─────────────────────────────────────────────────────────
function _bindDpad() {
  qsa('.dpad-btn').forEach(btn => {
    const dir = btn.dataset.d;
    // pointerdown: melhor latência, previne scroll acidental
    btn.addEventListener('pointerdown', e => {
      e.preventDefault();
      window.Engine?.setDir(dir);
      btn.classList.add('pressed');
      if(navigator.vibrate) navigator.vibrate(6);
    }, {passive:false});
    btn.addEventListener('pointerup',   () => btn.classList.remove('pressed'));
    btn.addEventListener('pointerleave',() => btn.classList.remove('pressed'));
  });
}

// ── Tema ──────────────────────────────────────────────────────────
function _initTheme() {
  const applyTheme = dark => {
    document.documentElement.setAttribute('data-theme', dark?'dark':'light');
    const meta = el('theme-meta');
    if(meta) meta.content = dark?'#0f0e0d':'#f4f1ec';
    try{ localStorage.setItem((window.CFG?.STORAGE_KEY||'snake_v2_')+'theme', dark?'dark':'light'); }catch(_){}
  };

  const saved = (() => { try{ return localStorage.getItem((window.CFG?.STORAGE_KEY||'snake_v2_')+'theme'); }catch(_){return null;} })();
  const sysDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  applyTheme(saved==='dark'||(saved===null&&sysDark));

  el('theme-btn')?.addEventListener('click', () => {
    applyTheme(document.documentElement.getAttribute('data-theme')!=='dark');
  });
  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', e => {
    try{ if(!localStorage.getItem((window.CFG?.STORAGE_KEY||'snake_v2_')+'theme')) applyTheme(e.matches); }catch(_){}
  });
}

// ── Skin panel ────────────────────────────────────────────────────
function _initSkinPanel() {
  const colorGrid   = el('color-grid');
  const skinGrid    = el('skin-grid');
  const skinPreview = el('skin-preview');
  const skinBody    = el('skin-body');
  const skinToggle  = el('skin-toggle');
  if(!colorGrid || !skinGrid) return;

  // ── Preview canvas animado ─────────────────────────────────
  let _rafId = null;
  const pctx = skinPreview?.getContext('2d') || null;

  function _drawPreview(now) {
    if(!pctx || !window.SnakeSkin) { _rafId=requestAnimationFrame(_drawPreview); return; }
    const W=skinPreview.width, H=skinPreview.height;
    // Fundo respeitando tema
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()||'#f4f1ec';
    pctx.setTransform(1,0,0,1,0,0);
    pctx.globalAlpha=1; pctx.shadowBlur=0;
    pctx.fillStyle=bg; pctx.fillRect(0,0,W,H);
    const skin  = window.SnakeSkin.getSkin();
    const color = window.SnakeSkin.getColor();
    const c=18, segs=8;
    for(let i=segs-1;i>=0;i--){
      pctx.save();
      pctx.translate(12+i*(c+2)+c/2, H/2+Math.sin(now*.002+i*.5)*4);
      try{ i===0?skin.drawHead(pctx,c,'RIGHT',color):skin.drawBody(pctx,c,i,color); }catch(_){}
      pctx.restore();
      pctx.setTransform(1,0,0,1,0,0);
      pctx.globalAlpha=1; pctx.shadowBlur=0;
    }
    _rafId=requestAnimationFrame(_drawPreview);
  }
  const startPreview=()=>{ cancelAnimationFrame(_rafId); _rafId=requestAnimationFrame(_drawPreview); };
  const stopPreview =()=>cancelAnimationFrame(_rafId);

  // ── Mini canvas de cada skin ───────────────────────────────
  function drawMini(mc, sk) {
    if(!window.SnakeSkin) return;
    const ctx2 = mc.getContext('2d');
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()||'#f4f1ec';
    ctx2.setTransform(1,0,0,1,0,0);
    ctx2.globalAlpha=1; ctx2.shadowBlur=0;
    ctx2.globalCompositeOperation='source-over';
    ctx2.clearRect(0,0,mc.width,mc.height);
    ctx2.fillStyle=bg; ctx2.fillRect(0,0,mc.width,mc.height);
    ctx2.save();
    ctx2.translate(mc.width/2,mc.height/2);
    try{ sk.drawHead(ctx2,24,'RIGHT',window.SnakeSkin.getColor()); }catch(_){ ctx2.fillStyle=window.SnakeSkin.getColor().body; ctx2.fillRect(-10,-10,20,20); }
    ctx2.restore();
    ctx2.setTransform(1,0,0,1,0,0);
    ctx2.globalAlpha=1; ctx2.shadowBlur=0;
  }
  function refreshAllMinis(cards){ cards.forEach(({mc,sk})=>drawMini(mc,sk)); }

  // ── Cores ──────────────────────────────────────────────────
  const COLORS = window.SNAKE_COLORS || [];
  COLORS.forEach(col => {
    const btn = document.createElement('button');
    btn.className='color-swatch'+(col.id===(window.SnakeSkin?.getColorId()||'black')?' active':'');
    btn.style.setProperty('--sw',col.body);
    btn.title=col.label;
    btn.setAttribute('aria-label',col.label);
    btn.addEventListener('click',()=>{
      window.SnakeSkin?.setColor(col.id);
      colorGrid.querySelectorAll('.color-swatch').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      // Atualiza cor do nick no ranking
      document.querySelectorAll('.rank-row.rank-me .rank-nick').forEach(n=>n.style.color=col.body);
    });
    colorGrid.appendChild(btn);
  });

  // ── Carrossel de skins ─────────────────────────────────────
  const SKINS = window.SNAKE_SKINS || [];
  const COLS  = 3;
  const PAGES = Math.ceil(SKINS.length/COLS);
  let _page   = 0;
  const cards = [];

  SKINS.forEach((sk,idx)=>{
    const card=document.createElement('div');
    card.className='skin-card'+(sk.id===(window.SnakeSkin?.getSkinId()||'classic')?' active':'');

    const mc=document.createElement('canvas'); mc.width=44; mc.height=44;
    const lbl=document.createElement('span'); lbl.textContent=sk.label;
    card.appendChild(mc); card.appendChild(lbl);

    card.addEventListener('click',()=>{
      window.SnakeSkin?.setSkin(sk.id);
      cards.forEach(c=>c.card.classList.remove('active'));
      card.classList.add('active');
    });
    skinGrid.appendChild(card);
    cards.push({card,mc,sk});
  });

  // Renderiza todos os minis agora
  refreshAllMinis(cards);

  // Reenderiza quando cor muda
  window.Bus?.on('skinChanged',()=>{ refreshAllMinis(cards); });

  // ── Navegação ──────────────────────────────────────────────
  const CARD_W=56; // 52px + 4px gap

  function goToPage(p){
    _page=Math.max(0,Math.min(p,PAGES-1));
    const x=-_page*COLS*CARD_W;
    skinGrid.style.transform=`translateX(${x}px)`;
    document.querySelectorAll('.carousel-dot').forEach((d,i)=>d.classList.toggle('active',i===_page));
  }

  const nav=document.createElement('div'); nav.className='carousel-nav';
  const prevBtn=document.createElement('button'); prevBtn.className='carousel-arrow'; prevBtn.textContent='‹';
  const nextBtn=document.createElement('button'); nextBtn.className='carousel-arrow'; nextBtn.textContent='›';
  const dotsWrap=document.createElement('div'); dotsWrap.className='carousel-dots';
  for(let p=0;p<PAGES;p++){
    const dot=document.createElement('button');
    dot.className='carousel-dot'+(p===0?' active':'');
    dot.addEventListener('click',()=>goToPage(p));
    dotsWrap.appendChild(dot);
  }
  prevBtn.addEventListener('click',()=>goToPage(_page-1));
  nextBtn.addEventListener('click',()=>goToPage(_page+1));
  nav.appendChild(prevBtn); nav.appendChild(dotsWrap); nav.appendChild(nextBtn);
  skinGrid.after(nav);

  // Swipe no carrossel
  let _swx=0;
  skinGrid.addEventListener('touchstart',e=>{_swx=e.touches[0].clientX;},{passive:true});
  skinGrid.addEventListener('touchend',e=>{
    const dx=e.changedTouches[0].clientX-_swx;
    if(Math.abs(dx)>28) goToPage(_page+(dx<0?1:-1));
  },{passive:true});

  // ── Toggle painel ──────────────────────────────────────────
  function openPanel(){
    if(skinBody){ skinBody.style.display='flex'; skinBody.classList.remove('hidden'); }
    if(skinToggle) skinToggle.classList.add('open');
    startPreview();
  }
  function closePanel(){
    if(skinBody){ skinBody.classList.add('hidden'); skinBody.style.display=''; }
    if(skinToggle) skinToggle.classList.remove('open');
    stopPreview();
  }

  const header = el('skin-panel')?.querySelector('.skin-header');
  header?.addEventListener('click',()=>{
    const closed = skinBody?.classList.contains('hidden');
    if(closed) openPanel(); else closePanel();
  });

  // Bus: atualiza cores quando tema muda
  window.Bus?.on('skinChanged',()=>refreshAllMinis(cards));
}

// ── Nível grid ────────────────────────────────────────────────────
function _buildLevelGrid() {
  const grid = el('level-grid'); if(!grid) return;
  grid.innerHTML = '';
  const unlocked = window.Store?.getUnlocked() || 1;
  (window.LEVELS||[]).forEach((lvl,i) => {
    const num    = i+1;
    const locked = num > unlocked;
    const btn    = document.createElement('div');
    btn.className = 'level-cell'+(locked?' locked':'');
    btn.innerHTML = `<span class="lc-num">${num}</span><span class="lc-name">${lvl.label}</span>`;
    if(!locked) btn.addEventListener('click',()=>{
      _selectedLevel=num; _selectedMode='challenge';
      qsa('.mode-btn').forEach(b=>b.classList.toggle('active',b.dataset.mode==='challenge'));
      _hide(el('level-panel')); _startGame();
    });
    grid.appendChild(btn);
  });
}

// ── Stats ─────────────────────────────────────────────────────────
function _showStats() {
  const s = window.Store?.getStats() || {};
  const set=(id,v)=>{ const e=el(id);if(e)e.textContent=v; };
  set('stat-games',      s.gamesPlayed||0);
  set('stat-total-score',s.totalScore||0);
  set('stat-total-food', s.totalFood||0);
  set('stat-best-combo', `×${s.bestCombo||0}`);
  const m=Math.floor((s.playTime||0)/60000), sec=Math.floor(((s.playTime||0)%60000)/1000);
  set('stat-play-time',`${m}m ${sec}s`);
  _show(el('stats-panel'));
}

// ── Botões ────────────────────────────────────────────────────────
function _bindButtons() {
  el('play-btn')?.addEventListener('click',()=>{ if(el('overlay')?.dataset.phase!=='levelup') _startGame(); });
  el('levels-btn')?.addEventListener('click',()=>{ _buildLevelGrid(); _show(el('level-panel')); });
  el('level-back')?.addEventListener('click',()=>_hide(el('level-panel')));
  el('stats-btn')?.addEventListener('click',()=>_showStats());
  el('stats-back')?.addEventListener('click',()=>_hide(el('stats-panel')));
  el('rank-refresh-side')?.addEventListener('click',()=>RankPanel.load(true));

  el('sound-btn')?.addEventListener('click',()=>{
    const on = window.SoundBus?.toggle();
    const off=el('icon-sound-off'), ons=el('icon-sound-on');
    if(off) off.style.display = on ? 'none' : '';
    if(ons) ons.style.display = on ? '' : 'none';
  });

  qsa('.mode-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      if(window.state?.phase==='playing') return;
      _selectedMode=btn.dataset.mode;
      qsa('.mode-btn').forEach(b=>b.classList.toggle('active',b.dataset.mode===_selectedMode));
      const stBest=el('st-best');
      if(stBest) stBest.textContent=window.Store?.getBest(_selectedMode)||0;
      // Atualiza ranking para o modo selecionado
      RankPanel.setMode(_selectedMode);
      RankPanel.load();
      if(_selectedMode==='challenge'){ _buildLevelGrid(); _show(el('level-panel')); }
    });
  });
}

// ── Bus ───────────────────────────────────────────────────────────
function _bindBus() {
  const B = window.Bus; if(!B) return;

  B.on('stateUpdate', _updateHUD);

  B.on('foodEaten', ({combo}) => {
    if(combo!==_lastCombo){ _lastCombo=combo; _showComboPopup(combo); }
    if((window.state?.score||0) >= (window.state?._nextSlowShrink||500)){
      const sc=el('score-live');
      if(sc){ sc.classList.add('milestone'); setTimeout(()=>sc.classList.remove('milestone'),400); }
    }
  });

  B.on('gameOver', data => {
    setTimeout(()=>_showGameOver(data), 350);
    setTimeout(()=>{ RankPanel.setMode(window.state?.mode||'classic'); RankPanel.load(true); }, 2000);
  });

  B.on('phaseChange', phase => {
    if(phase==='playing'){
      _hideOverlay();
      ['portal-active','shield-active','freeze-active','dash-active'].forEach(c=>el('arena')?.classList.remove(c));
    }
    if(phase==='win'){
      _show(el('overlay'));
      const set=(id,v)=>{const e=el(id);if(e)e.textContent=v;};
      set('ov-label','PARABÉNS!');
      set('ov-score',String(window.state?.score||0).padStart(2,'0'));
      set('ov-sub','Todos os setores concluídos.');
      const pb=el('play-btn'); if(pb) pb.textContent='jogar novamente';
    }
  });

  B.on('levelComplete',({level,bonus})=>{
    const ov=el('overlay'); if(!ov) return;
    _show(ov); ov.dataset.phase='levelup';
    const set=(id,v)=>{const e=el(id);if(e)e.textContent=v;};
    set('ov-label',`SETOR ${level} OK`);
    set('ov-score',`+${bonus}`);
    set('ov-sub','avançando...');
  });

  B.on('powerupEnd',  ()=>{  const p=el('pw-fill');if(p){p.style.width='0%';p.dataset.kind='';} const lb=el('pw-label');if(lb)lb.textContent=''; });
  B.on('powerupTick', ({timer,duration})=>{
    const p=el('pw-fill'); if(!p||!duration) return;
    p.style.width=Math.max(0,(timer/duration)*100)+'%';
  });

  // Arena overlays para poderes
  B.on('portalModeStart',()=>el('arena')?.classList.add('portal-active'));
  B.on('portalModeEnd',  ()=>el('arena')?.classList.remove('portal-active'));
  B.on('shieldStart',    ()=>el('arena')?.classList.add('shield-active'));
  B.on('shieldBroken',   ()=>{ el('arena')?.classList.remove('shield-active'); const a=el('arena');if(a){a.style.boxShadow='inset 0 0 20px #fde68a';setTimeout(()=>{a.style.boxShadow='';},400);} });
  B.on('freezeStart',    ()=>el('arena')?.classList.add('freeze-active'));
  B.on('freezeEnd',      ()=>el('arena')?.classList.remove('freeze-active'));
  B.on('powerupStart',({kind})=>{
    if(kind==='dash')   el('arena')?.classList.add('dash-active');
    if(kind==='shield') el('arena')?.classList.add('shield-active');
  });
  B.on('powerupEnd',({kind})=>{
    if(kind==='dash')   el('arena')?.classList.remove('dash-active');
    if(kind==='shield') el('arena')?.classList.remove('shield-active');
  });

  // Aviso 500pts
  B.on('forcedPowerup',({message})=>{
    const fe=el('forced-event'); if(!fe) return;
    const ft=fe.querySelector('.fe-text'); if(ft) ft.textContent=message||'500 PTS';
    fe.classList.remove('hidden','show');
    void fe.offsetWidth;
    fe.classList.remove('hidden');
    fe.classList.add('show');
    setTimeout(()=>{ fe.classList.remove('show'); fe.classList.add('hidden'); },3500);
  });

  // Timer urgente
  B.on('timerTick',t=>{
    const tf=el('timer-fill');
    if(tf) tf.classList.toggle('urgent', t!==null&&t<=10000);
  });

  // Tooltip de comida rara
  B.on('foodEaten',({food})=>{
    if((food?.pts||0)>=20){
      const arena=el('arena'); if(!arena) return;
      const tip=document.createElement('div');
      tip.className='food-tooltip';
      tip.textContent=`+${food.pts} ${food.label||''}`;
      tip.style.cssText=`left:${20+Math.random()*60}%;top:${20+Math.random()*50}%`;
      arena.appendChild(tip);
      setTimeout(()=>tip.remove(),1900);
    }
  });

  B.on('newRecord',()=>setTimeout(()=>RankPanel.load(true),3000));
}

// ── Start ─────────────────────────────────────────────────────────
function _startGame() {
  _hideOverlay();
  window.Engine?.start(_selectedMode, _selectedMode==='challenge'?_selectedLevel:1);
}

// ── UIInit ────────────────────────────────────────────────────────
export function UIInit() {
  _initTheme();
  _initAuth();
  _bindBus();
  _bindKeyboard();
  _bindSwipe();
  _bindDpad();
  _bindButtons();
  _showMenu();
  // Skin panel inicializa depois de um tick para garantir que
  // window.SNAKE_SKINS e window.SnakeSkin já foram expostos pelo main.js
  setTimeout(_initSkinPanel, 0);
}

// Globals para acesso externo
window.RankPanel = RankPanel;
