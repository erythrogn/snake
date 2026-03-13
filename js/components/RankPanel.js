// js/ui/components/RankPanel.js
import { DOM } from '../utils/dom.js';
import { firebase } from '../services/firebase-service.js';
import { store } from '../core/store.js';
import { Bus } from '../utils/bus.js';
import { audio } from '../services/audio-service.js';

export class RankPanel {
  #element = null;
  #listElement = null;
  #refreshButton = null;
  #isLoading = false;
  #currentRanking = [];
  #retryTimeout = null;
  
  constructor() {
    this.#element = DOM.get('side-rank');
    this.#listElement = DOM.get('rank-list-side');
    this.#refreshButton = DOM.get('rank-refresh-side');
    
    if (!this.#element) return;
    
    this.#init();
  }
  
  #init() {
    this.#bindEvents();
    this.#loadRanking();
    
    Bus.on('authComplete', () => this.#loadRanking());
    Bus.on('newRecord', () => this.#loadRanking());
  }
  
  #bindEvents() {
    if (this.#refreshButton) {
      this.#refreshButton.addEventListener('click', () => {
        audio.playSound('menuMove');
        this.#loadRanking(true);
      });
    }
  }
  
  show() {
    DOM.show(this.#element);
  }
  
  hide() {
    DOM.hide(this.#element);
  }
  
  async #loadRanking(force = false) {
    if (this.#isLoading) return;
    
    this.#isLoading = true;
    this.#showLoading();
    
    try {
      const ranking = await this.#fetchRanking(force);
      this.#currentRanking = ranking;
      this.#render(ranking);
    } catch (error) {
      console.warn('[Rank] Failed to load:', error);
      this.#showError(error.message);
      
      if (this.#retryTimeout) clearTimeout(this.#retryTimeout);
      this.#retryTimeout = setTimeout(() => this.#loadRanking(), 5000);
    } finally {
      this.#isLoading = false;
    }
  }
  
  async #fetchRanking(force) {
    if (!firebase.isOnline) {
      throw new Error('Offline');
    }
    
    if (!force && this.#currentRanking.length > 0) {
      return this.#currentRanking;
    }
    
    return await firebase.loadRanking(8);
  }
  
  #showLoading() {
    if (!this.#listElement) return;
    this.#listElement.innerHTML = `
      <div class="rank-loading">
        <svg class="spinner" viewBox="0 0 24 24" width="24" height="24">
          <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.5"/>
        </svg>
        <span>sincronizando...</span>
      </div>
    `;
  }
  
  #showError(message) {
    if (!this.#listElement) return;
    
    const errorIcon = `<svg class="error-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg>`;
    
    this.#listElement.innerHTML = `
      <div class="rank-loading rank-error-state">
        ${errorIcon}
        <span>${message === 'Offline' ? 'modo offline' : 'erro na ligação'}</span>
        <button class="btn-retry">tentar novamente</button>
      </div>
    `;
    
    const retryBtn = this.#listElement.querySelector('.btn-retry');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => this.#loadRanking(true));
    }
  }
  
  #escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
  
  #render(rows) {
    if (!this.#listElement) return;
    
    const currentId = store.getPlayerId();
    
    if (!rows || rows.length === 0) {
      this.#listElement.innerHTML = '<div class="rank-loading">sem dados</div>';
      return;
    }
    
    this.#listElement.innerHTML = rows.map((r, i) => {
      const rawNick = r.nick || r.id.replace(/^P_/, '');
      const safeNick = this.#escapeHTML(rawNick);
      const score = r.best_classic || 0;
      const isMe = r.id === currentId;
      
      return `
        <div class="rank-row${isMe ? ' rank-me' : ''}" style="animation-delay: ${i * 0.05}s">
          <span class="rank-pos">${i + 1}</span>
          <span class="rank-icon">${this.#getRankIcon(i)}</span>
          <span class="rank-nick">${safeNick}</span>
          <span class="rank-score">${score}</span>
        </div>
      `;
    }).join('');
  }
  
  #getRankIcon(index) {
    // Ícones em SVG substituindo os emojis
    if (index === 0) return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/></svg>`; // Coroa
    if (index === 1) return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`; // Estrela
    if (index === 2) return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>`; // Faísca/Brilho
    return '';
  }
}