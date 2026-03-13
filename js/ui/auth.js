// js/ui/auth.js
import { store } from '../core/store.js';
import { firebase } from '../services/firebase-service.js';
import { audio } from '../services/audio-service.js';
import { Bus } from '../utils/bus.js';

export class AuthManager {
  constructor() {
    this.panel = document.getElementById('login-panel');
    this.input = document.getElementById('player-nick-input');
    this.button = document.getElementById('login-btn');
    this.isAuthenticating = false;
    
    console.log('[Auth] Manager initialized');
    
    if (!this.panel) {
      console.error('[Auth] Login panel not found');
      return;
    }
    
    this.init();
  }
  
  init() {
    // Verifica se já tem sessão salva
    const savedNick = this.getSavedNick();
    if (savedNick) {
      console.log('[Auth] Found saved nick:', savedNick);
      if (this.input) this.input.value = savedNick;
      // Auto-login após um pequeno delay
      setTimeout(() => this.authenticate(), 100);
    } else {
      this.bindEvents();
    }
  }
  
  bindEvents() {
    if (this.button) {
      // Remove listeners antigos clonando o botão
      const newButton = this.button.cloneNode(true);
      this.button.parentNode.replaceChild(newButton, this.button);
      this.button = newButton;
      
      this.button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.authenticate();
      });
    }
    
    if (this.input) {
      this.input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          this.authenticate();
        }
      });
    }
    
    console.log('[Auth] Events bound');
  }
  
  getSavedNick() {
    try {
      return localStorage.getItem('dimen6_snake_v3_last_nick');
    } catch {
      return null;
    }
  }
  
  saveNick(nick) {
    try {
      localStorage.setItem('dimen6_snake_v3_last_nick', nick);
    } catch (error) {
      console.warn('[Auth] Failed to save nick:', error);
    }
  }
  
  setLoading(isLoading) {
    if (!this.button) return;
    if (isLoading) {
      this.button.classList.add('is-loading');
      this.button.disabled = true;
    } else {
      this.button.classList.remove('is-loading');
      this.button.disabled = false;
    }
  }
  
  showError(message) {
    console.log('[Auth] Error:', message);
    
    // Remove erro existente
    const existingError = document.querySelector('.login-error');
    if (existingError) existingError.remove();
    
    // Cria novo erro
    const errorDiv = document.createElement('div');
    errorDiv.className = 'login-error';
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
      color: #ff3b30;
      font-size: 0.7rem;
      margin-top: 0.5rem;
      text-align: center;
      animation: shake 0.5s ease;
    `;
    
    // Adiciona após o botão
    if (this.button && this.button.parentNode) {
      this.button.parentNode.appendChild(errorDiv);
    }
    
    // Remove após 3 segundos
    setTimeout(() => {
      if (errorDiv.parentNode) errorDiv.remove();
    }, 3000);
  }
  
  async authenticate() {
    if (this.isAuthenticating) {
      console.log('[Auth] Already authenticating');
      return;
    }
    
    console.log('[Auth] Starting authentication');
    this.isAuthenticating = true;
    this.setLoading(true);
    
    try {
      // Pega o nick do input ou gera um aleatório
      let nick = this.input ? this.input.value.trim() : '';
      
      if (!nick) {
        // Gera nick aleatório
        const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        nick = `JOG${randomNum}`;
        console.log('[Auth] Generated random nick:', nick);
      } else {
        // Sanitiza o nick
        nick = nick.toUpperCase()
          .replace(/[^A-Z0-9]/g, '')
          .slice(0, 12);
        
        if (!nick) {
          nick = `JOG${Math.floor(Math.random() * 10000)}`;
        }
      }
      
      const playerId = `P_${nick}`;
      console.log('[Auth] Player ID:', playerId);
      
      // Salva nick localmente
      this.saveNick(nick);
      
      // Configura o store
      store.setPlayerId(playerId);
      
      // Tenta sincronizar com Firebase (não bloqueia)
      this.syncWithFirebase(playerId, nick).catch(error => {
        console.warn('[Auth] Firebase sync failed:', error);
      });
      
      // Atualiza o recorde na HUD
      const bestScore = store.getBest('classic');
      const bestEl = document.getElementById('st-best');
      if (bestEl) bestEl.textContent = bestScore;
      
      // Esconde o painel de login
      if (this.panel) {
        console.log('[Auth] Hiding login panel');
        this.panel.style.transition = 'opacity 0.3s ease';
        this.panel.style.opacity = '0';
        this.panel.style.pointerEvents = 'none';
        
        setTimeout(() => {
          this.panel.classList.add('hidden');
          this.panel.style.opacity = '';
          this.panel.style.transition = '';
          
          // Emite evento de autenticação completa
          Bus.emit('authComplete', { playerId, nick });
          console.log('[Auth] Authentication complete');
          
          // Carrega ranking
          Bus.emit('requestRankingUpdate');
          
          // Toca som de sucesso
          audio.playSound('menuSelect');
        }, 300);
      }
      
    } catch (error) {
      console.error('[Auth] Authentication error:', error);
      this.showError('Erro na autenticação. Tente novamente.');
      
      // Fallback: libera a interface mesmo com erro
      setTimeout(() => {
        if (this.panel && !this.panel.classList.contains('hidden')) {
          console.log('[Auth] Force-unlock interface');
          this.panel.classList.add('hidden');
          Bus.emit('authComplete', { 
            playerId: store.getPlayerId() || 'P_GUEST', 
            nick: 'GUEST' 
          });
        }
      }, 2000);
      
    } finally {
      this.setLoading(false);
      this.isAuthenticating = false;
    }
  }
  
  async syncWithFirebase(playerId, nick) {
    if (!firebase.isOnline) {
      console.log('[Auth] Firebase offline, skipping sync');
      return;
    }
    
    try {
      console.log('[Auth] Syncing with Firebase...');
      
      // Carrega perfil do Firebase
      const cloudData = await firebase.loadProfile(playerId);
      
      if (cloudData) {
        console.log('[Auth] Found cloud data:', cloudData);
        
        // Merge dos dados
        const localBest = store.getBest('classic');
        const cloudBest = cloudData.best_classic || 0;
        
        if (cloudBest > localBest) {
          store.set('best_classic', cloudBest);
        }
        
        if (cloudData.best_challenge > store.getBest('challenge')) {
          store.set('best_challenge', cloudData.best_challenge);
        }
        
        if (cloudData.unlocked > store.getUnlocked()) {
          store.set('unlocked', cloudData.unlocked);
        }
      }
      
      // Salva dados atuais na nuvem
      await firebase.saveProfile(playerId, {
        nick: nick,
        best_classic: store.getBest('classic'),
        best_challenge: store.getBest('challenge'),
        unlocked: store.getUnlocked(),
        stats: store.getStats()
      });
      
      console.log('[Auth] Sync complete');
      
    } catch (error) {
      console.warn('[Auth] Sync failed:', error);
      // Não propaga o erro - continuamos em modo offline
    }
  }
  
  logout() {
    console.log('[Auth] Logging out');
    store.setPlayerId('');
    this.saveNick('');
    if (this.input) this.input.value = '';
    this.panel.classList.remove('hidden');
    this.panel.style.opacity = '1';
    this.panel.style.pointerEvents = 'auto';
    Bus.emit('authLogout');
  }
}