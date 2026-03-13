// js/core/store.js — Singleton com cache em memória + Firebase sync
import { Bus } from '../utils/bus.js';
import { CFG } from './config.js';

export class Store {
  static #instance = null;
  #playerId = '';
  #cache = new Map();

  constructor() {
    if (Store.#instance) return Store.#instance;
    Store.#instance = this;
  }

  setPlayerId(id) { this.#playerId = id; Bus.emit('playerIdChanged', id); }
  getPlayerId()   { return this.#playerId; }

  #key(k) { return CFG.STORAGE_KEY + (this.#playerId ? this.#playerId + '_' : '') + k; }

  get(key, fallback = null) {
    const fk = this.#key(key);
    if (this.#cache.has(fk)) return this.#cache.get(fk);
    try {
      const raw = localStorage.getItem(fk);
      const val = raw === null ? fallback : JSON.parse(raw);
      this.#cache.set(fk, val);
      return val;
    } catch { return fallback; }
  }

  set(key, value) {
    const fk = this.#key(key);
    this.#cache.set(fk, value);
    try { localStorage.setItem(fk, JSON.stringify(value)); } catch (e) { console.warn('[Store] save failed:', e); }
  }

  getBest(mode)               { return this.get(`best_${mode}`, 0); }
  saveBest(mode, score)       { if (score > this.getBest(mode)) { this.set(`best_${mode}`, score); this.syncToCloud(); Bus.emit('newRecord', { mode, score }); } }
  getLevelBest(level)         { return this.get(`lvl_${level}`, 0); }
  saveLevelBest(level, score) { if (score > this.getLevelBest(level)) this.set(`lvl_${level}`, score); }
  getUnlocked()               { return this.get('unlocked', 1); }
  unlock(level)               { if (level > this.getUnlocked()) { this.set('unlocked', level); this.syncToCloud(); Bus.emit('levelUnlocked', level); } }

  getStats() {
    return this.get('stats', { gamesPlayed: 0, totalScore: 0, totalFood: 0, bestCombo: 0, playTime: 0 });
  }
  saveStats(delta) {
    const s = this.getStats();
    this.set('stats', {
      gamesPlayed: s.gamesPlayed + (delta.gamesPlayed || 0),
      totalScore:  s.totalScore  + (delta.totalScore  || 0),
      totalFood:   s.totalFood   + (delta.totalFood   || 0),
      bestCombo:   Math.max(s.bestCombo, delta.bestCombo || 0),
      playTime:    s.playTime    + (delta.playTime    || 0),
    });
  }

  // ── Sync com Firebase ────────────────────────────────────────
  syncToCloud() {
    if (!window.FirebaseDB || !this.#playerId) return;
    const data = {
      nick:           this.#playerId.replace(/^P_/, ''),
      best_classic:   this.get('best_classic',   0),
      best_wrap:      this.get('best_wrap',       0),
      best_speed:     this.get('best_speed',      0),
      best_challenge: this.get('best_challenge',  0),
      unlocked:       this.getUnlocked(),
      stats:          this.getStats(),
      lastSync:       new Date().toISOString(),
    };
    window.FirebaseDB.saveProfile(this.#playerId, data).catch(e => console.warn('[Store] cloud sync failed:', e));
  }

  clearCache() { this.#cache.clear(); }

  resetAll() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(CFG.STORAGE_KEY)) keys.push(k);
    }
    keys.forEach(k => localStorage.removeItem(k));
    this.#cache.clear();
    Bus.emit('storeReset');
  }
}

export const store = new Store();
