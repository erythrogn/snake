// js/services/audio-service.js
import { Bus } from '../utils/bus.js';

class AudioService {
  #ctx     = null;
  #enabled = false;
  #volume  = 0.12;

  constructor() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.#ctx = new AC();
    } catch (e) { console.warn('[Audio] Web Audio API indisponível.'); }
    this.#bindBus();
  }

  async #ensureCtx() {
    if (!this.#ctx) return false;
    if (this.#ctx.state === 'suspended') await this.#ctx.resume().catch(() => {});
    return this.#ctx.state === 'running';
  }

  async play(name) {
    if (!this.#enabled || !(await this.#ensureCtx())) return;
    const now = this.#ctx.currentTime;
    const v   = this.#volume;
    const ctx = this.#ctx;

    const tone = (freq, type, dur, attack = 0.01) => {
      const osc = ctx.createOscillator(); const g = ctx.createGain();
      osc.type = type; osc.frequency.value = freq;
      g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(v, now + attack);
      g.gain.exponentialRampToValueAtTime(0.001, now + dur);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(now); osc.stop(now + dur);
    };

    switch (name) {
      case 'eat':
        tone(600, 'sine', 0.1); tone(800, 'sine', 0.08); break;
      case 'combo':
        [900, 1200, 1500].forEach((f, i) => setTimeout(() => tone(f, 'sine', 0.15), i * 50)); break;
      case 'death':
        [200, 150, 100].forEach((f, i) => setTimeout(() => tone(f, 'sawtooth', 0.3), i * 100)); break;
      case 'powerup': {
        const osc = ctx.createOscillator(); const g = ctx.createGain();
        osc.type = 'triangle'; osc.frequency.setValueAtTime(300, now); osc.frequency.exponentialRampToValueAtTime(900, now + 0.3);
        g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(v * 0.6, now + 0.05); g.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.connect(g); g.connect(ctx.destination); osc.start(now); osc.stop(now + 0.4);
        break;
      }
      case 'levelup':
        [400, 500, 600, 800, 1000].forEach((f, i) => setTimeout(() => tone(f, 'sine', 0.2), i * 80)); break;
      case 'menuMove':   tone(400, 'sine', 0.05, 0.005); break;
      case 'menuSelect': tone(600, 'sine', 0.1); break;
    }
  }

  toggle() {
    this.#enabled = !this.#enabled;
    if (this.#enabled && this.#ctx?.state === 'suspended') this.#ctx.resume();
    Bus.emit('soundToggled', this.#enabled);
    return this.#enabled;
  }

  get enabled() { return this.#enabled; }
  setVolume(v) { this.#volume = Math.max(0, Math.min(1, v)); }

  #bindBus() {
    Bus.on('foodEaten',    ({ combo }) => this.play(combo >= 3 ? 'combo' : 'eat'));
    Bus.on('gameOver',     ()          => this.play('death'));
    Bus.on('levelComplete',()          => this.play('levelup'));
    Bus.on('powerupStart', ()          => this.play('powerup'));
  }
}

export const audio = new AudioService();
// Expõe para ui.js legacy
window.SoundBus = { toggle: () => audio.toggle(), isEnabled: false };
Bus.on('soundToggled', v => { window.SoundBus.isEnabled = v; });
