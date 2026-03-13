// js/services/firebase-service.js
import { initializeApp }    from 'https://www.gstatic.com/firebasejs/10.10.0/firebase-app.js';
import { getFirestore, doc, getDoc, setDoc, collection, query, orderBy, limit, getDocs, writeBatch }
  from 'https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey:            'AIzaSyBbIgJMr0o1PbhKWrGAJ8sIMfKw_XK0HeA',
  authDomain:        'snake-45d1c.firebaseapp.com',
  projectId:         'snake-45d1c',
  storageBucket:     'snake-45d1c.firebasestorage.app',
  messagingSenderId: '87119635039',
  appId:             '1:87119635039:web:f3d88e6abbeee8da8af1ea',
};

class FirebaseService {
  #db          = null;
  #initialized = false;
  #maxRetries  = 3;

  constructor() {
    try {
      const app  = initializeApp(firebaseConfig);
      this.#db   = getFirestore(app);
      this.#initialized = true;
      console.log('[Firebase] Conectado.');
    } catch (e) {
      console.warn('[Firebase] Modo offline:', e.message);
    }
  }

  get isOnline() { return this.#initialized && this.#db !== null; }

  async #withRetry(op, fallback = null) {
    if (!this.isOnline) return fallback;
    for (let i = 0; i < this.#maxRetries; i++) {
      try { return await op(); }
      catch (e) {
        console.warn(`[Firebase] Retry ${i+1}/${this.#maxRetries}:`, e.message);
        if (i === this.#maxRetries - 1) throw e;
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
      }
    }
  }

  async loadProfile(id, timeout = 5000) {
    if (!this.isOnline) return null;
    const abort = new AbortController();
    const tid   = setTimeout(() => abort.abort(), timeout);
    try {
      const result = await Promise.race([
        this.#withRetry(async () => {
          const snap = await getDoc(doc(this.#db, 'dimen6_players', id));
          return snap.exists() ? snap.data() : null;
        }),
        new Promise((_, rej) => abort.signal.addEventListener('abort', () => rej(new Error('Timeout')))),
      ]);
      clearTimeout(tid);
      return result;
    } catch (e) {
      clearTimeout(tid);
      console.warn('[Firebase] loadProfile falhou:', e.message);
      return null;
    }
  }

  async saveProfile(id, data) {
    if (!this.isOnline || !id) return false;
    try {
      await this.#withRetry(() => setDoc(doc(this.#db, 'dimen6_players', id), data, { merge: true }));
      return true;
    } catch (e) {
      console.warn('[Firebase] saveProfile falhou:', e.message);
      return false;
    }
  }

  async loadRanking(topCount = 8) {
    if (!this.isOnline) throw new Error('Offline');
    const q    = query(collection(this.#db, 'dimen6_players'), orderBy('best_classic', 'desc'), limit(topCount));
    const snap = await this.#withRetry(() => getDocs(q));
    const rank = [];
    snap.forEach(d => {
      const data = d.data();
      rank.push({ id: d.id, nick: data.nick || d.id.replace(/^P_/, ''), best_classic: data.best_classic || 0, best_challenge: data.best_challenge || 0, unlocked: data.unlocked || 1 });
    });
    return rank;
  }

  async saveRankingBatch(players) {
    if (!this.isOnline || !players.length) return false;
    // BUG CORRIGIDO: variável local renomeada para não mascarar o import
    const colRef = collection(this.#db, 'dimen6_players');
    const batch  = writeBatch(this.#db);
    players.forEach(p => batch.set(doc(colRef, p.id), p, { merge: true }));
    try { await this.#withRetry(() => batch.commit()); return true; }
    catch (e) { console.warn('[Firebase] batch save falhou:', e); return false; }
  }
}

// Instância única exposta como window.FirebaseDB (compatível com ui.js legado)
export const firebase = new FirebaseService();
window.FirebaseDB = firebase;
