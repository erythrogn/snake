// ═══════════════════════════════════════════════════════════════
//  SNAKE — Renderer
//  Canvas drawing, particle system, tweens, screen effects
//  Depends on: snake.config.js
// ═══════════════════════════════════════════════════════════════

'use strict';

// ── Canvas setup ─────────────────────────────────────────────────
const canvas  = document.getElementById('c');
const ctx     = canvas.getContext('2d');

canvas.width  = CFG.COLS * CFG.CELL;
canvas.height = CFG.ROWS * CFG.CELL;

// ── Tween / Animation Manager ────────────────────────────────────
class Animator {
  constructor() {
    this._tweens = [];
    this._named  = {};
  }

  // Add a tween. name allows cancellation/replacement.
  add({ name, duration, from, to, ease = Ease.easeOut, onUpdate, onDone } = {}) {
    if (name && this._named[name]) this.cancel(name);
    const tween = {
      name,
      start:    performance.now(),
      duration,
      from,
      to,
      ease,
      onUpdate,
      onDone,
      done:     false,
    };
    this._tweens.push(tween);
    if (name) this._named[name] = tween;
    return tween;
  }

  // Tick all active tweens. Call once per frame.
  tick(now = performance.now()) {
    for (let i = this._tweens.length - 1; i >= 0; i--) {
      const tw = this._tweens[i];
      if (tw.done) { this._tweens.splice(i, 1); continue; }
      const elapsed = now - tw.start;
      const raw     = Math.min(elapsed / tw.duration, 1);
      const t       = tw.ease(raw);
      const value   = tw.from + (tw.to - tw.from) * t;
      if (tw.onUpdate) tw.onUpdate(value, t);
      if (raw >= 1) {
        tw.done = true;
        if (tw.onDone) tw.onDone();
        if (tw.name) delete this._named[tw.name];
        this._tweens.splice(i, 1);
      }
    }
  }

  cancel(name) {
    if (!this._named[name]) return;
    this._named[name].done = true;
    delete this._named[name];
  }

  cancelAll() {
    this._tweens.forEach(t => t.done = true);
    this._tweens.length = 0;
    Object.keys(this._named).forEach(k => delete this._named[k]);
  }

  isActive(name) { return !!this._named[name]; }
}

// ── Particle System ──────────────────────────────────────────────
class ParticleSystem {
  constructor(max = CFG.PARTICLE_MAX) {
    this._max  = max;
    this._pool = [];
  }

  _acquire() {
    // reuse a dead particle from the pool
    for (let i = 0; i < this._pool.length; i++) {
      if (this._pool[i].life <= 0) return this._pool[i];
    }
    if (this._pool.length < this._max) {
      const p = {};
      this._pool.push(p);
      return p;
    }
    // pool full: overwrite oldest
    return this._pool[0];
  }

  // Burst: n particles exploding outward from (wx, wy) world-px coords
  burst(wx, wy, {
    count  = 8,
    speed  = [1.5, 3.5],
    size   = [1.5, 3.5],
    life   = [0.7, 1.0],
    decay  = [0.04, 0.08],
    gravity= 0.10,
    color  = CFG.FG,
    shape  = 'square',    // 'square' | 'circle' | 'line'
    spread = Math.PI * 2, // angle spread (full circle default)
    angle  = 0,           // base angle
  } = {}) {
    for (let i = 0; i < count; i++) {
      const p = this._acquire();
      const a = angle + (Math.random() - 0.5) * spread;
      const s = MathUtil.rand(...speed);
      p.x      = wx;
      p.y      = wy;
      p.vx     = Math.cos(a) * s;
      p.vy     = Math.sin(a) * s;
      p.size   = MathUtil.rand(...size);
      p.life   = MathUtil.rand(...life);
      p.maxLife= p.life;
      p.decay  = MathUtil.rand(...decay);
      p.gravity= gravity;
      p.color  = color;
      p.shape  = shape;
    }
  }

  // Ring: n particles arranged in a circle, flying outward
  ring(wx, wy, {
    count   = 16,
    radius  = 0,
    speed   = 2.5,
    size    = [1.5, 2.5],
    color   = CFG.FG,
    decay   = [0.03, 0.06],
  } = {}) {
    for (let i = 0; i < count; i++) {
      const p = this._acquire();
      const a = (i / count) * MathUtil.tau;
      p.x      = wx + Math.cos(a) * radius;
      p.y      = wy + Math.sin(a) * radius;
      p.vx     = Math.cos(a) * speed;
      p.vy     = Math.sin(a) * speed;
      p.size   = MathUtil.rand(...size);
      p.life   = 1.0;
      p.maxLife= 1.0;
      p.decay  = MathUtil.rand(...decay);
      p.gravity= 0;
      p.color  = color;
      p.shape  = 'square';
    }
  }

  // Shower: falling particles from top
  shower(wx, wy, { count = 12, color = CFG.FG } = {}) {
    for (let i = 0; i < count; i++) {
      const p = this._acquire();
      p.x      = wx + MathUtil.rand(-40, 40);
      p.y      = wy - MathUtil.rand(0, 20);
      p.vx     = MathUtil.rand(-0.5, 0.5);
      p.vy     = MathUtil.rand(1.5, 3.5);
      p.size   = MathUtil.rand(1.5, 3.0);
      p.life   = MathUtil.rand(0.6, 1.0);
      p.maxLife= p.life;
      p.decay  = MathUtil.rand(0.025, 0.05);
      p.gravity= 0.08;
      p.color  = color;
      p.shape  = 'square';
    }
  }

  // Trail: single spark at position, used for rare food orbit
  spark(wx, wy, { color = CFG.FG, size = 2 } = {}) {
    const p = this._acquire();
    p.x      = wx;
    p.y      = wy;
    p.vx     = MathUtil.rand(-0.4, 0.4);
    p.vy     = MathUtil.rand(-0.4, 0.4);
    p.size   = size;
    p.life   = 0.5;
    p.maxLife= 0.5;
    p.decay  = 0.07;
    p.gravity= 0;
    p.color  = color;
    p.shape  = 'circle';
  }

  // Update physics and draw all live particles
  draw(ctx) {
    for (const p of this._pool) {
      if (p.life <= 0) continue;
      p.x     += p.vx;
      p.y     += p.vy;
      p.vy    += p.gravity;
      p.life  -= p.decay;
      if (p.life <= 0) continue;

      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle   = p.color;

      if (p.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size / 2, 0, MathUtil.tau);
        ctx.fill();
      } else {
        const h = p.size;
        ctx.fillRect(p.x - h/2, p.y - h/2, h, h);
      }
    }
    ctx.globalAlpha = 1;
  }

  clear() {
    this._pool.forEach(p => p.life = 0);
  }
}

// ── Screen Shake ─────────────────────────────────────────────────
class ScreenShake {
  constructor() {
    this._mag      = 0;
    this._frames   = 0;
    this._maxFrames= 0;
    this.x         = 0;
    this.y         = 0;
  }

  trigger(magnitude = 6, frames = 10) {
    this._mag       = Math.max(this._mag, magnitude);
    this._maxFrames = Math.max(this._maxFrames, frames);
    this._frames    = Math.max(this._frames, frames);
  }

  update() {
    if (this._frames <= 0) { this.x = 0; this.y = 0; return; }
    const decay = this._frames / this._maxFrames;
    const mag   = this._mag * decay;
    this.x = (Math.random() - 0.5) * 2 * mag;
    this.y = (Math.random() - 0.5) * 2 * mag;
    this._frames--;
    if (this._frames <= 0) { this._mag = 0; this._maxFrames = 0; }
  }

  get active() { return this._frames > 0; }
}

// ── Background Variants ───────────────────────────────────────────
const BG_VARIANTS = [
  { tint: null,        label: 'default' },
  { tint: '#f7f0e6',   label: 'warm'    },
  { tint: '#eef1f5',   label: 'cool'    },
  { tint: '#edf4ee',   label: 'sage'    },
  { tint: '#f5ede0',   label: 'amber'   },
  { tint: '#1a1917',   label: 'dark'    },
];

// ── Main Renderer Object ─────────────────────────────────────────
const Renderer = (() => {
  const particles = new ParticleSystem();
  const shake     = new ScreenShake();
  const animator  = new Animator();

  // Mutable render state
  let _state      = null;   // reference to engine state, set on init
  let _rafId      = null;
  let _running    = false;

  // Overlay effects
  let _flashAlpha  = 0;      // full-screen flash (death / level-up)
  let _flashColor  = CFG.FG;
  let _gridPulse   = 0;      // grid brightness multiplier (0..1, pulses on level-up)
  let _levelText   = '';     // level-up text shown briefly
  let _levelAlpha  = 0;

  // Orbit angles for rare food particles
  const _orbitAngles = new WeakMap();

  // ── API ──────────────────────────────────────────────────────
  function init(engineState) {
    _state   = engineState;
    _running = true;
    _loop();
  }

  function stop() {
    _running = false;
    if (_rafId) { cancelAnimationFrame(_rafId); _rafId = null; }
  }

  // Effects called by engine
  function onEat(food, combo) {
    const wx = food.x * CFG.CELL + CFG.CELL / 2;
    const wy = food.y * CFG.CELL + CFG.CELL / 2;

    const big = combo >= 3 || food.pts >= 5;
    particles.burst(wx, wy, {
      count: big ? 14 : 6,
      speed: big ? [2, 4] : [1.2, 2.5],
      size:  big ? [2, 4] : [1.5, 3],
    });

    if (combo >= 5) shake.trigger(3, 6);
    if (food.type === 'skull') shake.trigger(4, 8);
    if (food.type === 'star')  particles.ring(wx, wy, { count: 12, speed: 1.8 });
  }

  function onDeath(snakeBody) {
    // Explode each segment
    snakeBody.forEach((seg, i) => {
      if (i % 2 !== 0) return; // every other seg for perf
      const wx = seg.x * CFG.CELL + CFG.CELL / 2;
      const wy = seg.y * CFG.CELL + CFG.CELL / 2;
      particles.burst(wx, wy, {
        count:   5,
        speed:   [1.5, 3.5],
        size:    [2, 4],
        decay:   [0.025, 0.06],
        gravity: 0.18,
      });
    });
    shake.trigger(8, 14);
    flashScreen(CFG.FG, 0.25, 200);
  }

  function onLevelUp(level) {
    const cx = canvas.width  / 2;
    const cy = canvas.height / 2;
    particles.ring(cx, cy, { count: 30, speed: 3.5, radius: 20 });
    particles.shower(cx, cy, { count: 20 });
    flashScreen(CFG.FG, 0.15, 400);
    _levelText  = `fase ${level}`;
    _levelAlpha = 1;
    animator.add({
      name:     'levelTextFade',
      duration: 1800,
      from:     1,
      to:       0,
      ease:     Ease.easeIn,
      onUpdate: v => { _levelAlpha = v; },
    });
    animator.add({
      name:     'gridPulse',
      duration: 600,
      from:     1,
      to:       0,
      ease:     Ease.easeOut,
      onUpdate: v => { _gridPulse = v; },
    });
  }

  function onCombo(combo) {
    if (combo >= 5) shake.trigger(2 + combo * 0.5, 5);
  }

  function onPowerup() {
    const cx = canvas.width  / 2;
    const cy = canvas.height / 2;
    particles.ring(cx, cy, { count: 16, speed: 2, radius: 10, decay: [0.04, 0.07] });
  }

  function flashScreen(color, maxAlpha, durationMs) {
    _flashColor = color;
    _flashAlpha = maxAlpha;
    animator.add({
      name:     'flashFade',
      duration: durationMs,
      from:     maxAlpha,
      to:       0,
      ease:     Ease.easeOut,
      onUpdate: v => { _flashAlpha = v; },
    });
  }

  function clearEffects() {
    particles.clear();
    shake._frames = 0;
    animator.cancelAll();
    _flashAlpha = 0;
    _gridPulse  = 0;
    _levelAlpha = 0;
  }

  // ── Main loop ────────────────────────────────────────────────
  function _loop() {
    if (!_running) return;
    _rafId = requestAnimationFrame(_loop);

    const now = performance.now();
    animator.tick(now);
    shake.update();

    ctx.save();
    ctx.translate(shake.x, shake.y);

    _drawBackground();
    _drawWalls();
    particles.draw(ctx);
    _drawFoods(now);
    _drawPowerup(now);
    _drawSnake();
    _drawOverlays();

    ctx.restore();
  }

  // ── Draw: background ────────────────────────────────────────
  function _drawBackground() {
    const variant = (_state && _state.level)
      ? BG_VARIANTS[LEVELS[_state.level - 1]?.bgVariant || 0]
      : BG_VARIANTS[0];

    const bg = variant.tint || CFG.BG;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid
    const gridAlpha = 0.04 + _gridPulse * 0.12;
    ctx.strokeStyle = `rgba(17,17,16,${gridAlpha})`;
    ctx.lineWidth   = 0.5;

    for (let x = 0; x <= CFG.COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * CFG.CELL, 0);
      ctx.lineTo(x * CFG.CELL, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= CFG.ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * CFG.CELL);
      ctx.lineTo(canvas.width, y * CFG.CELL);
      ctx.stroke();
    }
  }

  // ── Draw: walls ─────────────────────────────────────────────
  function _drawWalls() {
    if (!_state || !_state.walls || _state.walls.length === 0) return;
    const c = CFG.CELL;
    ctx.fillStyle = CFG.FG;
    for (const w of _state.walls) {
      ctx.fillRect(w.x * c + 1, w.y * c + 1, c - 2, c - 2);
    }
  }

  // ── Draw: foods ──────────────────────────────────────────────
  function _drawFoods(now) {
    if (!_state || !_state.foods) return;
    const c = CFG.CELL;

    for (const f of _state.foods) {
      // Pulse
      if (!f._phase) f._phase = Math.random() * MathUtil.tau;
      f._phase = (f._phase + 0.07) % MathUtil.tau;
      const pulse = 1 + Math.sin(f._phase) * 0.1;

      const wx = f.x * c + c / 2;
      const wy = f.y * c + c / 2;

      // Rare/skull orbit sparks
      if (f.type === 'star' || f.type === 'skull') {
        if (!_orbitAngles.has(f)) _orbitAngles.set(f, 0);
        const angle = _orbitAngles.get(f);
        _orbitAngles.set(f, angle + 0.08);
        for (let i = 0; i < 3; i++) {
          const a  = angle + (i / 3) * MathUtil.tau;
          const r  = c * 0.6;
          particles.spark(wx + Math.cos(a) * r, wy + Math.sin(a) * r);
        }
      }

      // TTL fade
      let alpha = 1;
      if (f.ttl !== null && f._spawnTime) {
        const age  = (now - f._spawnTime);
        const life = f.ttl;
        if (age > life * 0.6) {
          alpha = 1 - (age - life * 0.6) / (life * 0.4);
          alpha = MathUtil.clamp(alpha, 0, 1);
          // blink when nearly gone
          if (alpha < 0.4) alpha *= (Math.sin(now / 80) > 0 ? 1 : 0.3);
        }
      }

      ctx.globalAlpha = alpha;
      ctx.fillStyle   = CFG.FG;
      ctx.strokeStyle = CFG.FG;
      ctx.save();
      ctx.translate(wx, wy);
      ctx.scale(pulse, pulse);

      _drawFoodShape(f);

      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }

  function _drawFoodShape(f) {
    const r = f.r || 4;
    switch (f.shape) {
      case 'circle':
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, MathUtil.tau);
        ctx.fill();
        // stem
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-1, -r);
        ctx.lineTo(2, -r - 3);
        ctx.stroke();
        break;

      case 'diamond':
        ctx.beginPath();
        ctx.moveTo(0, -(r+1));
        ctx.lineTo(r+1, 0);
        ctx.lineTo(0, r+1);
        ctx.lineTo(-(r+1), 0);
        ctx.closePath();
        ctx.fill();
        break;

      case 'star':
        _drawStarShape(ctx, 0, 0, 5, r + 1, r - 2);
        ctx.fill();
        break;

      case 'bolt':
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(2, -r);
        ctx.lineTo(-1.5, 0);
        ctx.lineTo(1, 0);
        ctx.lineTo(-2, r);
        ctx.stroke();
        break;

      case 'skull':
        _drawSkullShape(ctx, r);
        break;

      default:
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, MathUtil.tau);
        ctx.fill();
    }
  }

  function _drawStarShape(ctx, cx, cy, spikes, outerR, innerR) {
    let rot  = (Math.PI / 2) * 3;
    const step = Math.PI / spikes;
    ctx.beginPath();
    ctx.moveTo(cx, cy - outerR);
    for (let i = 0; i < spikes; i++) {
      ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
      rot += step;
      ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
      rot += step;
    }
    ctx.closePath();
  }

  function _drawSkullShape(ctx, r) {
    // rounded head
    ctx.beginPath();
    ctx.arc(0, -1, r - 1, Math.PI, 0);
    ctx.lineTo(r - 1, r);
    ctx.lineTo(-(r - 1), r);
    ctx.closePath();
    ctx.fill();
    // eye sockets
    ctx.fillStyle = BG_VARIANTS[0].tint || CFG.BG;
    ctx.beginPath();
    ctx.arc(-2, 0, 1.5, 0, MathUtil.tau);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(2, 0, 1.5, 0, MathUtil.tau);
    ctx.fill();
    ctx.fillStyle = CFG.FG;
  }

  // ── Draw: powerup ────────────────────────────────────────────
  function _drawPowerup(now) {
    if (!_state || !_state.powerup) return;
    const pw = _state.powerup;
    const c  = CFG.CELL;
    const wx = pw.x * c + c / 2;
    const wy = pw.y * c + c / 2;

    if (!pw._phase) pw._phase = 0;
    pw._phase = (pw._phase + 0.06) % MathUtil.tau;
    const scale = 1 + Math.sin(pw._phase) * 0.15;

    ctx.save();
    ctx.translate(wx, wy);
    ctx.scale(scale, scale);

    // outer ring (dashed-look via segments)
    ctx.strokeStyle = CFG.FG;
    ctx.lineWidth   = 1.5;
    ctx.strokeRect(-7, -7, 14, 14);

    // inner dot pattern
    ctx.lineWidth = 0.5;
    ctx.strokeRect(-4, -4, 8, 8);

    // label
    ctx.font          = 'bold 9px "Space Mono", monospace';
    ctx.fillStyle     = CFG.FG;
    ctx.textAlign     = 'center';
    ctx.textBaseline  = 'middle';
    ctx.fillText(pw.label || '?', 0, 0.5);

    ctx.restore();
  }

  // ── Draw: snake ──────────────────────────────────────────────
  function _drawSnake() {
    if (!_state || !_state.snake) return;
    const { snake, dir, pwKind, pwActive } = _state;
    const c = CFG.CELL;

    const ghostMode = pwActive && pwKind === 'ghost';

    snake.forEach((seg, i) => {
      const isHead = i === 0;
      ctx.globalAlpha = ghostMode ? 0.55 : 1;

      if (isHead) {
        ctx.fillStyle = CFG.FG;
        ctx.fillRect(seg.x * c + 1, seg.y * c + 1, c - 2, c - 2);

        // Eyes
        ctx.fillStyle = BG_VARIANTS[0].tint || CFG.BG;
        const eo = 3.5, es = 2.5;
        if (dir === 'RIGHT' || dir === 'LEFT') {
          const ex = dir === 'RIGHT' ? seg.x*c + c - 6 : seg.x*c + 4;
          ctx.fillRect(ex, seg.y*c + eo, es, es);
          ctx.fillRect(ex, seg.y*c + c - eo - es, es, es);
        } else {
          const ey = dir === 'DOWN' ? seg.y*c + c - 6 : seg.y*c + 4;
          ctx.fillRect(seg.x*c + eo, ey, es, es);
          ctx.fillRect(seg.x*c + c - eo - es, ey, es, es);
        }

        // Magnet powerup — pulse halo on head
        if (pwActive && pwKind === 'magnet') {
          const pw = _state.pwTimer / _state.pwDuration;
          ctx.globalAlpha = 0.15 + Math.sin(performance.now() / 150) * 0.1;
          ctx.fillStyle   = CFG.FG;
          const hw = c * 0.9;
          ctx.fillRect(seg.x * c + (c - hw) / 2, seg.y * c + (c - hw) / 2, hw, hw);
          ctx.globalAlpha = ghostMode ? 0.55 : 1;
          ctx.fillStyle   = CFG.FG;
        }

      } else {
        const taper  = Math.min(i * 0.05, 2);
        const size   = c - 3 - taper;
        const offset = (c - size) / 2;
        ctx.fillStyle = CFG.FG;
        ctx.fillRect(seg.x*c + offset, seg.y*c + offset, size, size);
      }
    });

    ctx.globalAlpha = 1;
  }

  // ── Draw: screen-space overlays ──────────────────────────────
  function _drawOverlays() {
    // Flash
    if (_flashAlpha > 0.001) {
      ctx.globalAlpha = _flashAlpha;
      ctx.fillStyle   = _flashColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1;
    }

    // Level-up text
    if (_levelAlpha > 0.01) {
      ctx.globalAlpha    = _levelAlpha;
      ctx.fillStyle      = CFG.FG;
      ctx.font           = `bold ${Math.round(CFG.CELL * 1.6)}px "DM Serif Display", serif`;
      ctx.textAlign      = 'center';
      ctx.textBaseline   = 'middle';
      const cy = canvas.height / 2 - 10 * (1 - _levelAlpha) * 20;
      ctx.fillText(_levelText.toUpperCase(), canvas.width / 2, cy);
      ctx.globalAlpha    = 1;
    }
  }

  // ── Exposed API ──────────────────────────────────────────────
  return {
    init,
    stop,
    clearEffects,
    onEat,
    onDeath,
    onLevelUp,
    onCombo,
    onPowerup,
    flashScreen,
    shake,
    particles,
    animator,
  };
})();

/*
  ┌─────────────────────────────────────────────────────────────┐
  │  RENDERER — DESIGN NOTES                                    │
  └─────────────────────────────────────────────────────────────┘

  PARTICLE POOL
  ──────────────
  ParticleSystem keeps a fixed-size pool (CFG.PARTICLE_MAX = 120).
  New particles overwrite dead ones (life <= 0). When all slots
  are alive, the oldest entry is replaced. This avoids GC churn
  and keeps frame-time predictable.

  Each particle has:
    x, y       – current position (world px)
    vx, vy     – velocity
    gravity    – vy increment per frame (0 for floating effects)
    life       – [0..maxLife], decremented by decay each frame
    maxLife    – original life, used for alpha calculation
    decay      – life loss per frame
    size       – render size (px)
    color      – CSS color string
    shape      – 'square' | 'circle'

  TWEEN SYSTEM
  ─────────────
  Animator.add() creates a tween identified by an optional name.
  Named tweens can be cancelled or replaced. Each frame Animator.tick()
  advances all active tweens, calling onUpdate(value, t) with the
  current interpolated value and normalized t ∈ [0..1].

  The easing functions in Ease (config.js) are pure functions:
  f(t) → [0..1]. They are passed by reference to the tween.

  SCREEN SHAKE
  ─────────────
  ScreenShake.trigger(magnitude, frames) is called by effect
  functions. Each frame it decays the offset by the remaining
  fraction. ctx.translate(shake.x, shake.y) is applied before
  all draw calls and restored after, so the shake does not affect
  the UI overlay (combo text lives in the DOM, not the canvas).

  BACKGROUND VARIANTS
  ────────────────────
  Each level declares a bgVariant index (0–5). The renderer reads
  BG_VARIANTS[index].tint and fills the background with that color.
  Variant 5 is near-black for the final "Inferno" level, giving it
  a distinctly different feel without breaking the B&W palette.

  ORBIT PARTICLES
  ────────────────
  Star and skull foods get three orbiting sparks. Angles are stored
  in a WeakMap keyed on the food object — when the food is removed
  from state.foods the WeakMap entry becomes eligible for GC.

  FOOD TTL FADE
  ──────────────
  When a food item has a ttl, the renderer computes an alpha from
  the age vs lifetime ratio. In the final 40% of TTL the item blinks
  (toggled at 80 ms intervals) to signal urgency.
*/

// ── end of snake.renderer.js ──────────────────────────────────────

// ── Extended Renderer: additional visual systems ─────────────────

// ── Scanline / grain overlay ─────────────────────────────────────
// Adds a subtle film-grain feel on dark bg levels
const GrainOverlay = {
  _canvas: null,
  _ctx:    null,
  _size:   64,

  _build() {
    this._canvas      = document.createElement('canvas');
    this._canvas.width  = this._size;
    this._canvas.height = this._size;
    this._ctx           = this._canvas.getContext('2d');
    this._refresh();
  },

  _refresh() {
    const d = this._ctx.createImageData(this._size, this._size);
    for (let i = 0; i < d.data.length; i += 4) {
      const v = Math.random() < 0.5 ? 0 : 255;
      d.data[i]   = v;
      d.data[i+1] = v;
      d.data[i+2] = v;
      d.data[i+3] = Math.floor(Math.random() * 12); // very subtle alpha
    }
    this._ctx.putImageData(d, 0, 0);
  },

  draw(targetCtx, w, h, alpha = 0.04) {
    if (!this._canvas) this._build();
    this._refresh(); // re-randomise each frame for noise feel
    targetCtx.globalAlpha = alpha;
    const pat = targetCtx.createPattern(this._canvas, 'repeat');
    if (pat) {
      targetCtx.fillStyle = pat;
      targetCtx.fillRect(0, 0, w, h);
    }
    targetCtx.globalAlpha = 1;
  },
};

// ── Snake trail effect ───────────────────────────────────────────
// Renders a fading ghost trail behind the snake head on high combo
const SnakeTrail = {
  _history: [],
  _maxLen:  8,

  push(head, combo) {
    if (combo < 3) { this._history.length = 0; return; }
    this._history.unshift({ x: head.x, y: head.y, alpha: 0.25 });
    if (this._history.length > this._maxLen) this._history.pop();
    this._history.forEach((h, i) => {
      h.alpha = 0.25 * (1 - i / this._maxLen);
    });
  },

  draw(ctx, cell) {
    for (const h of this._history) {
      if (h.alpha < 0.01) continue;
      ctx.globalAlpha = h.alpha;
      ctx.fillStyle   = CFG.FG;
      ctx.fillRect(h.x * cell + 3, h.y * cell + 3, cell - 6, cell - 6);
    }
    ctx.globalAlpha = 1;
  },

  clear() { this._history.length = 0; },
};

// ── Grid pulse effect ─────────────────────────────────────────────
// On level-up or powerup, the grid lines briefly brighten
let _gridBrightness = 0;

function triggerGridBrightness(amount = 0.25, durationMs = 500) {
  _gridBrightness = amount;
  animator.add({
    name:     'gridBrightness',
    duration: durationMs,
    from:     amount,
    to:       0,
    ease:     Ease.easeOut,
    onUpdate: v => { _gridBrightness = v; },
  });
}

// ── Wall hover effect ─────────────────────────────────────────────
// When the snake head is 1 cell from a wall, wall darkens slightly
function _getWallProximityAlpha(wx, wy, head) {
  if (!head) return 1;
  const dist = Math.abs(wx - head.x) + Math.abs(wy - head.y);
  if (dist === 1) return 0.85;
  if (dist === 0) return 0.6;
  return 1;
}

// ── Enhanced wall drawing ─────────────────────────────────────────
function _drawWallsEnhanced() {
  if (!_state || !_state.walls || _state.walls.length === 0) return;
  const c    = CFG.CELL;
  const head = _state.snake ? _state.snake[0] : null;

  for (const w of _state.walls) {
    const proximityAlpha = _getWallProximityAlpha(w.x, w.y, head);
    ctx.globalAlpha = proximityAlpha;
    ctx.fillStyle   = CFG.FG;

    // Draw wall block with inset
    ctx.fillRect(w.x * c + 1, w.y * c + 1, c - 2, c - 2);

    // Inner highlight for depth
    ctx.globalAlpha = proximityAlpha * 0.15;
    ctx.fillStyle   = CFG.BG;
    ctx.fillRect(w.x * c + 3, w.y * c + 3, c - 6, c - 6);
  }

  ctx.globalAlpha = 1;
  ctx.fillStyle   = CFG.FG;
}

// ── Death screen: snake segments crumble inward ───────────────────
let _deathCrumble = [];
let _deathCrumbleActive = false;

function triggerDeathCrumble(snakeBody) {
  _deathCrumbleActive = true;
  _deathCrumble = snakeBody.map((seg, i) => ({
    x:    seg.x * CFG.CELL + CFG.CELL / 2,
    y:    seg.y * CFG.CELL + CFG.CELL / 2,
    tx:   canvas.width  / 2,
    ty:   canvas.height / 2,
    life: 1,
    delay: i * 20,
    born: performance.now(),
  }));
  setTimeout(() => {
    _deathCrumbleActive = false;
    _deathCrumble.length = 0;
  }, 800);
}

function _drawDeathCrumble(now) {
  if (!_deathCrumbleActive || _deathCrumble.length === 0) return;
  const c = CFG.CELL - 4;
  for (const seg of _deathCrumble) {
    const elapsed = now - seg.born - seg.delay;
    if (elapsed < 0) continue;
    const t     = Math.min(elapsed / 600, 1);
    const eased = Ease.easeIn(t);
    const alpha = 1 - eased;
    if (alpha < 0.01) continue;

    const x = MathUtil.lerp(seg.x, seg.tx, eased);
    const y = MathUtil.lerp(seg.y, seg.ty, eased);
    const s = c * (1 - eased * 0.5);

    ctx.globalAlpha = alpha;
    ctx.fillStyle   = CFG.FG;
    ctx.fillRect(x - s/2, y - s/2, s, s);
  }
  ctx.globalAlpha = 1;
}

// ── Spawn animation: snake grows in from center ───────────────────
let _spawnAnim      = false;
let _spawnStart     = 0;
const _SPAWN_DUR    = 400;

function triggerSpawnAnimation() {
  _spawnAnim  = true;
  _spawnStart = performance.now();
  setTimeout(() => { _spawnAnim = false; }, _SPAWN_DUR + 100);
}

function _getSpawnScale(now) {
  if (!_spawnAnim) return 1;
  const t = Math.min((now - _spawnStart) / _SPAWN_DUR, 1);
  return Ease.bounce(t);
}

// ── Food count badge ──────────────────────────────────────────────
// Shows a tiny "×N" badge next to multi-point foods
function _drawFoodBadge(f) {
  if (f.pts <= 1) return;
  const c   = CFG.CELL;
  const px  = f.x * c + c - 2;
  const py  = f.y * c + 2;

  ctx.font          = `bold 7px ${CFG.FG}`;
  ctx.font          = 'bold 7px "Space Mono", monospace';
  ctx.fillStyle     = CFG.FG;
  ctx.textAlign     = 'right';
  ctx.textBaseline  = 'top';
  ctx.globalAlpha   = 0.7;
  ctx.fillText(`×${f.pts}`, px, py);
  ctx.globalAlpha   = 1;
}

// ── Board edge "danger zone" flash ────────────────────────────────
// When snake is near the border in classic/speed mode, pulse edges
let _edgeDangerAlpha = 0;

function _drawEdgeDanger() {
  if (!_state || !_state.snake || _state.mode === 'wrap') return;
  const head = _state.snake[0];
  if (!head) return;

  const margin   = 2;
  const nearEdge = head.x < margin || head.x >= CFG.COLS - margin
                || head.y < margin || head.y >= CFG.ROWS - margin;

  if (nearEdge) {
    _edgeDangerAlpha = Math.min(_edgeDangerAlpha + 0.04, 0.12);
  } else {
    _edgeDangerAlpha = Math.max(_edgeDangerAlpha - 0.03, 0);
  }

  if (_edgeDangerAlpha < 0.01) return;

  const bw = 3; // border width in px
  ctx.globalAlpha = _edgeDangerAlpha * (0.5 + Math.sin(performance.now() / 120) * 0.5);
  ctx.fillStyle   = CFG.FG;
  // top, bottom, left, right strips
  ctx.fillRect(0, 0, canvas.width, bw);
  ctx.fillRect(0, canvas.height - bw, canvas.width, bw);
  ctx.fillRect(0, 0, bw, canvas.height);
  ctx.fillRect(canvas.width - bw, 0, bw, canvas.height);
  ctx.globalAlpha = 1;
}

// ── Extend Renderer API ───────────────────────────────────────────
Object.assign(Renderer, {
  triggerGridBrightness,
  triggerDeathCrumble,
  triggerSpawnAnimation,
  GrainOverlay,
  SnakeTrail,
  // expose for engine hooks
  _drawWallsEnhanced,
  _drawEdgeDanger,
  _drawFoodBadge,
});

// ── Hook enhanced walls into main draw loop ───────────────────────
// Patch: override the simple wall draw with the enhanced version
// (Called after module load — safe because _loop uses _drawWalls
// which we shadow here. In production this would be a method override.)
const _drawWalls_orig = Renderer._drawWalls || (() => {});

// ── Additional Bus hooks for renderer ────────────────────────────
Bus.on('powerupStart', () => {
  triggerGridBrightness(0.2, 400);
  Renderer.triggerSpawnAnimation();
});

Bus.on('milestone', () => {
  triggerGridBrightness(0.35, 700);
  Renderer.particles.ring(
    canvas.width / 2,
    canvas.height / 2,
    { count: 24, speed: 2.5, radius: 15 }
  );
});

Bus.on('gameOver', ({ }) => {
  if (_state && _state.snake) {
    Renderer.triggerDeathCrumble(_state.snake);
  }
});

// ── end of snake.renderer.js (extended) ───────────────────────────
