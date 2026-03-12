// ── CONFIG ──────────────────────────────────────────────
const COLS = 18, ROWS = 18, CELL = 20;
const MODES = {
  classic: { baseSpeed: 145, speedUp: 3,   wrap: false, label: 'Clássico' },
  wrap:    { baseSpeed: 130, speedUp: 2,   wrap: true,  label: 'Portal'   },
  speed:   { baseSpeed: 90,  speedUp: 5,   wrap: false, label: 'Veloz'    },
};

// ── DOM ─────────────────────────────────────────────────
const canvas     = document.getElementById('c');
const ctx        = canvas.getContext('2d');
const overlay    = document.getElementById('overlay');
const ovLabel    = document.getElementById('ov-label');
const ovScore    = document.getElementById('ov-score');
const ovSub      = document.getElementById('ov-sub');
const ovBest     = document.getElementById('ov-best');
const playBtn    = document.getElementById('play-btn');
const scoreLive  = document.getElementById('score-live');
const stStreak   = document.getElementById('st-streak');
const stCombo    = document.getElementById('st-combo');
const stBest     = document.getElementById('st-best');
const comboPopup = document.getElementById('combo-popup');
const pwFill     = document.getElementById('pw-fill');

// ── CANVAS SIZE ─────────────────────────────────────────
canvas.width  = COLS * CELL;
canvas.height = ROWS * CELL;

// ── STATE ────────────────────────────────────────────────
let snake, dir, nextDir, foods, particles, powerup;
let score, streak, combo, bestScore;
let running = false, gameLoop, speedInterval;
let currentMode = 'classic';
let currentSpeed, eatTimestamp, flashTimeout;
let pwActive = false, pwTimer = 0, pwDuration = 0;

// ── BEST SCORE ───────────────────────────────────────────
function loadBest() {
  try { return parseInt(localStorage.getItem('snakeBest_' + currentMode) || '0'); } catch(e) { return 0; }
}
function saveBest(v) {
  try { localStorage.setItem('snakeBest_' + currentMode, v); } catch(e) {}
}

// ── INIT ─────────────────────────────────────────────────
function initGame() {
  snake = [
    {x:9,y:9},{x:8,y:9},{x:7,y:9}
  ];
  dir = 'RIGHT'; nextDir = 'RIGHT';
  score = 0; streak = 0; combo = 1;
  foods = [];
  particles = [];
  powerup = null;
  pwActive = false; pwTimer = 0;
  pwFill.style.width = '0%';
  bestScore = loadBest();
  currentSpeed = MODES[currentMode].baseSpeed;
  eatTimestamp = 0;
  updateHUD();
  placeFood();
  placeFood();
}

// ── FOOD ─────────────────────────────────────────────────
const FOOD_TYPES = [
  { type:'normal', weight:60, pts:1,  shape:'circle',  r:4 },
  { type:'bonus',  weight:25, pts:3,  shape:'diamond', r:5 },
  { type:'rare',   weight:10, pts:5,  shape:'star',    r:5 },
  { type:'power',  weight:5,  pts:2,  shape:'bolt',    r:5 },
];

function randFoodType() {
  const total = FOOD_TYPES.reduce((a,f) => a + f.weight, 0);
  let r = Math.random() * total;
  for (const f of FOOD_TYPES) { r -= f.weight; if (r <= 0) return f; }
  return FOOD_TYPES[0];
}

function occupied(x, y) {
  return snake.some(s => s.x===x && s.y===y)
    || foods.some(f => f.x===x && f.y===y)
    || (powerup && powerup.x===x && powerup.y===y);
}

function placeFood() {
  if (foods.length >= 3) return;
  let pos, tries = 0;
  do {
    pos = { x: Math.floor(Math.random()*COLS), y: Math.floor(Math.random()*ROWS) };
    tries++;
  } while (occupied(pos.x, pos.y) && tries < 100);
  const ft = randFoodType();
  foods.push({ ...pos, ...ft, pulse: 0 });
}

function maybePlacePowerup() {
  if (powerup) return;
  if (Math.random() < 0.08 && score > 5) {
    let pos, tries = 0;
    do {
      pos = { x: Math.floor(Math.random()*COLS), y: Math.floor(Math.random()*ROWS) };
      tries++;
    } while (occupied(pos.x, pos.y) && tries < 100);
    powerup = { ...pos, kind: 'slow', timer: 0, pulse: 0 };
  }
}

// ── PARTICLES ────────────────────────────────────────────
function spawnParticles(x, y, count, big) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = (big ? 2.5 : 1.5) + Math.random() * 2;
    particles.push({
      x: x * CELL + CELL/2, y: y * CELL + CELL/2,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1, decay: 0.06 + Math.random()*0.04,
      size: (big ? 3 : 2) + Math.random() * 2,
    });
  }
}

// ── STEP ─────────────────────────────────────────────────
function step() {
  dir = nextDir;
  const cfg = MODES[currentMode];
  const head = { ...snake[0] };
  if (dir==='UP')    head.y--;
  if (dir==='DOWN')  head.y++;
  if (dir==='LEFT')  head.x--;
  if (dir==='RIGHT') head.x++;

  if (cfg.wrap) {
    head.x = (head.x + COLS) % COLS;
    head.y = (head.y + ROWS) % ROWS;
  } else {
    if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) return gameOver();
  }
  if (snake.some(s => s.x===head.x && s.y===head.y)) return gameOver();

  snake.unshift(head);

  if (powerup && head.x===powerup.x && head.y===powerup.y) {
    powerup = null;
    pwActive = true;
    pwDuration = 8000;
    pwTimer = pwDuration;
    clearInterval(gameLoop);
    currentSpeed = Math.max(60, currentSpeed - 30);
    gameLoop = setInterval(step, currentSpeed);
  }

  const fi = foods.findIndex(f => f.x===head.x && f.y===head.y);
  if (fi !== -1) {
    const food = foods[fi];
    foods.splice(fi, 1);

    const now = Date.now();
    const elapsed = now - eatTimestamp;
    eatTimestamp = now;

    if (elapsed < 2000 && eatTimestamp > 0) {
      combo = Math.min(combo + 1, 8);
    } else {
      combo = Math.max(1, combo - 1);
    }

    streak++;
    const pts = food.pts * combo * (pwActive ? 2 : 1);
    score += pts;

    spawnParticles(food.x, food.y, combo >= 3 ? 10 : 5, combo >= 3);

    if (combo >= 3) showCombo(combo);

    currentSpeed = Math.max(55, MODES[currentMode].baseSpeed - snake.length * cfg.speedUp);
    clearInterval(gameLoop);
    gameLoop = setInterval(step, pwActive ? currentSpeed + 30 : currentSpeed);

    placeFood();
    maybePlacePowerup();
    updateHUD();
  } else {
    snake.pop();
  }

  if (pwActive) {
    pwTimer -= currentSpeed;
    if (pwTimer <= 0) {
      pwActive = false;
      currentSpeed = Math.max(55, MODES[currentMode].baseSpeed - snake.length * cfg.speedUp);
      clearInterval(gameLoop);
      gameLoop = setInterval(step, currentSpeed);
    }
    pwFill.style.width = Math.max(0, (pwTimer/pwDuration)*100) + '%';
  }

  draw();
}

// ── COMBO POPUP ───────────────────────────────────────────
function showCombo(n) {
  comboPopup.textContent = n === 8 ? 'MAX ×8!' : `×${n}`;
  comboPopup.classList.remove('pop');
  void comboPopup.offsetWidth;
  comboPopup.classList.add('pop');
}

// ── DRAW ──────────────────────────────────────────────────
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#f5f2ed';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = 'rgba(0,0,0,0.045)';
  ctx.lineWidth = 0.5;
  for (let x = 0; x <= COLS; x++) {
    ctx.beginPath(); ctx.moveTo(x*CELL,0); ctx.lineTo(x*CELL,ROWS*CELL); ctx.stroke();
  }
  for (let y = 0; y <= ROWS; y++) {
    ctx.beginPath(); ctx.moveTo(0,y*CELL); ctx.lineTo(COLS*CELL,y*CELL); ctx.stroke();
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy;
    p.vy += 0.12;
    p.life -= p.decay;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    ctx.globalAlpha = p.life;
    ctx.fillStyle = '#0d0d0d';
    ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
  }
  ctx.globalAlpha = 1;

  for (const f of foods) {
    f.pulse = (f.pulse || 0) + 0.08;
    const px = f.x*CELL + CELL/2;
    const py = f.y*CELL + CELL/2;
    const pulseFactor = 1 + Math.sin(f.pulse) * 0.1;

    ctx.fillStyle = '#0d0d0d';
    ctx.save();
    ctx.translate(px, py);
    ctx.scale(pulseFactor, pulseFactor);

    if (f.shape === 'circle') {
      ctx.beginPath(); ctx.arc(0,0,f.r,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#0d0d0d'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-1,-f.r); ctx.lineTo(2,-f.r-4); ctx.stroke();
    } else if (f.shape === 'diamond') {
      ctx.beginPath();
      ctx.moveTo(0,-f.r-1); ctx.lineTo(f.r+1,0); ctx.lineTo(0,f.r+1); ctx.lineTo(-f.r-1,0);
      ctx.closePath(); ctx.fill();
    } else if (f.shape === 'star') {
      drawStar(ctx, 0, 0, 5, f.r+1, f.r-2);
      ctx.fill();
    } else if (f.shape === 'bolt') {
      ctx.beginPath();
      ctx.moveTo(2,-f.r); ctx.lineTo(-1,0); ctx.lineTo(1,0); ctx.lineTo(-2,f.r);
      ctx.lineTo(1,0); ctx.lineTo(-1,0);
      ctx.lineWidth = 2.5; ctx.strokeStyle = '#0d0d0d'; ctx.stroke();
    }
    ctx.restore();
  }

  if (powerup) {
    powerup.pulse = (powerup.pulse||0) + 0.05;
    const px = powerup.x*CELL + CELL/2;
    const py = powerup.y*CELL + CELL/2;
    const s = 1 + Math.sin(powerup.pulse)*0.15;
    ctx.save();
    ctx.translate(px,py);
    ctx.scale(s,s);
    ctx.strokeStyle = '#0d0d0d';
    ctx.lineWidth = 2;
    ctx.strokeRect(-7,-7,14,14);
    ctx.font = 'bold 11px Space Mono';
    ctx.fillStyle = '#0d0d0d';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('S',0,0);
    ctx.restore();
  }

  snake.forEach((seg, i) => {
    const isHead = i === 0;
    ctx.globalAlpha = pwActive ? 0.7 : 1;

    if (isHead) {
      ctx.fillStyle = '#0d0d0d';
      ctx.fillRect(seg.x*CELL+1, seg.y*CELL+1, CELL-2, CELL-2);
      ctx.fillStyle = '#f5f2ed';
      const eyeOffset = 3.5;
      const eyeSize = 2.5;
      if (dir==='RIGHT'||dir==='LEFT') {
        const ex = dir==='RIGHT' ? seg.x*CELL+CELL-6 : seg.x*CELL+4;
        ctx.fillRect(ex, seg.y*CELL+eyeOffset, eyeSize, eyeSize);
        ctx.fillRect(ex, seg.y*CELL+CELL-eyeOffset-eyeSize, eyeSize, eyeSize);
      } else {
        const ey = dir==='DOWN' ? seg.y*CELL+CELL-6 : seg.y*CELL+4;
        ctx.fillRect(seg.x*CELL+eyeOffset, ey, eyeSize, eyeSize);
        ctx.fillRect(seg.x*CELL+CELL-eyeOffset-eyeSize, ey, eyeSize, eyeSize);
      }
    } else {
      const shrink = Math.min(i * 0.04, 1.5);
      const s = CELL - 3 - shrink;
      const off = (CELL - s) / 2;
      ctx.fillStyle = '#0d0d0d';
      ctx.fillRect(seg.x*CELL+off, seg.y*CELL+off, s, s);
    }
    ctx.globalAlpha = 1;
  });

  requestAnimationFrame(draw);
}

function drawStar(ctx, cx, cy, spikes, outerR, innerR) {
  let rot = (Math.PI/2)*3;
  const step = Math.PI/spikes;
  ctx.beginPath();
  ctx.moveTo(cx, cy - outerR);
  for(let i=0;i<spikes;i++){
    ctx.lineTo(cx+Math.cos(rot)*outerR, cy+Math.sin(rot)*outerR);
    rot += step;
    ctx.lineTo(cx+Math.cos(rot)*innerR, cy+Math.sin(rot)*innerR);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerR);
  ctx.closePath();
}

// ── HUD ──────────────────────────────────────────────────
function updateHUD() {
  scoreLive.textContent = String(score).padStart(2,'0');
  stStreak.textContent  = streak;
  stCombo.textContent   = combo >= 2 ? `×${combo}` : '×1';
  stCombo.style.color   = combo >= 5 ? '#0d0d0d' : combo >= 3 ? '#555' : '';
  bestScore = loadBest();
  stBest.textContent    = bestScore;
}

// ── GAME OVER ────────────────────────────────────────────
function gameOver() {
  clearInterval(gameLoop);
  running = false;
  pwActive = false;

  const prev = loadBest();
  const isNew = score > prev;
  if (isNew) saveBest(score);
  bestScore = loadBest();

  canvas.classList.add('flash');
  setTimeout(() => canvas.classList.remove('flash'), 300);

  ovLabel.textContent  = isNew ? '🏆 novo recorde!' : 'fim de jogo';
  ovScore.textContent  = String(score).padStart(2,'0');
  ovSub.textContent    = `${streak} comidos · combo ×${combo}`;
  ovBest.innerHTML     = isNew ? '' : `recorde: <b>${bestScore}</b>`;
  ovBest.style.display = isNew ? 'none' : 'block';
  playBtn.textContent  = 'jogar novamente';
  overlay.classList.remove('hidden');
  updateHUD();
}

// ── START ────────────────────────────────────────────────
function startGame() {
  overlay.classList.add('hidden');
  clearInterval(gameLoop);
  initGame();
  running = true;
  draw();
  gameLoop = setInterval(step, currentSpeed);
}

// ── DIRECTION ────────────────────────────────────────────
const OPP = {UP:'DOWN',DOWN:'UP',LEFT:'RIGHT',RIGHT:'LEFT'};
function changeDir(d) {
  if (!running) return;
  if (d !== OPP[dir]) nextDir = d;
}

// ── EVENTS ───────────────────────────────────────────────
playBtn.addEventListener('click', startGame);

document.querySelectorAll('.dpad-btn').forEach(b => {
  b.addEventListener('click', () => changeDir(b.dataset.d));
  b.addEventListener('touchstart', e => { e.preventDefault(); changeDir(b.dataset.d); }, {passive:false});
});

document.addEventListener('keydown', e => {
  const map = {
    ArrowUp:'UP', ArrowDown:'DOWN', ArrowLeft:'LEFT', ArrowRight:'RIGHT',
    w:'UP', s:'DOWN', a:'LEFT', d:'RIGHT'
  };
  if (map[e.key]) { e.preventDefault(); changeDir(map[e.key]); }
  if (e.key === 'Enter' && !running) startGame();
});

let touchX0, touchY0;
document.addEventListener('touchstart', e => {
  touchX0 = e.touches[0].clientX;
  touchY0 = e.touches[0].clientY;
}, {passive:true});
document.addEventListener('touchend', e => {
  if (!running) return;
  const dx = e.changedTouches[0].clientX - touchX0;
  const dy = e.changedTouches[0].clientY - touchY0;
  if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
  if (Math.abs(dx) > Math.abs(dy)) changeDir(dx > 0 ? 'RIGHT' : 'LEFT');
  else changeDir(dy > 0 ? 'DOWN' : 'UP');
}, {passive:true});

document.querySelectorAll('.mode-btn').forEach(b => {
  b.addEventListener('click', () => {
    if (running) return;
    document.querySelectorAll('.mode-btn').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    currentMode = b.dataset.mode;
    bestScore = loadBest();
    stBest.textContent = bestScore;
  });
});

// ── INIT DISPLAY ────────────────────────────────────────
bestScore = loadBest();
stBest.textContent  = bestScore;
ovLabel.textContent = 'snake';
ovScore.textContent = '—';
ovSub.textContent   = '';
initGame();
draw();
