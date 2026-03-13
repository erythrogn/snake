// js/main.js — Entry point
import { CFG, MODES, LEVELS, FOOD_TYPES, POWERUP_TYPES, Ease, Color } from './core/config.js';
import { MathUtil } from './utils/math.js';
import { Bus } from './utils/bus.js';
import { store } from './core/store.js';
import { Engine, state, SessionStats } from './core/engine.js';
import { Renderer } from './renderer/renderer.js';
import { UIInit } from './ui/ui.js';
import { SnakeSkin, SNAKE_SKINS, SNAKE_COLORS } from './core/snake-skin.js';
import './services/firebase-service.js';  // registra window.FirebaseDB
import './services/audio-service.js';     // registra window.SoundBus

// ── Expõe globals necessários para ui.js ────────────────────────
// (ui.js foi escrito no estilo do projeto antigo e lê por window/global)
Object.assign(window, {
  CFG, MODES, LEVELS, FOOD_TYPES, POWERUP_TYPES,
  Ease, Color, MathUtil, Bus,
  Store: store,
  Engine, state,
  SnakeSkin, SNAKE_SKINS, SNAKE_COLORS,
});

// ── Boot ─────────────────────────────────────────────────────────
const canvas = document.getElementById('c');
if (!canvas) { console.error('[Main] Canvas #c não encontrado.'); }

Renderer.init(canvas, state, Engine);
window._Renderer = Renderer;   // engine.js acessa via window._Renderer

UIInit();

// ── Debug API ─────────────────────────────────────────────────────
window.SnakeDebug = {
  start:       (mode = 'classic', level = 1) => Engine.start(mode, level),
  stop:        ()                            => Engine.stop(),
  state:       ()                            => ({ ...state }),
  stats:       ()                            => SessionStats.summary(),
  best:        (mode = 'classic')            => store.getBest(mode),
  unlockAll:   ()                            => store.set('unlocked', LEVELS.length),
  reset:       ()                            => store.resetAll(),
  addScore:    (n = 10)                      => { state.score += n; Bus.emit('stateUpdate', state); },
  forcePowerup:(kind)                        => { const p = POWERUP_TYPES.find(x => x.kind === kind); if (p) state.powerup = { x: state.snake[0]?.x ?? 5, y: state.snake[0]?.y ?? 5, ...p, _phase: 0 }; },
  burst:       (n = 30)                      => Renderer.particles.burst(canvas.width/2, canvas.height/2, { count: n }),
  rank:        ()                            => window.RankPanel?.load(true),
};

console.log('%c🐍 Snake Dimen6', 'font-size:16px;font-weight:bold');
console.log('%cDebug: window.SnakeDebug', 'color:#888');
