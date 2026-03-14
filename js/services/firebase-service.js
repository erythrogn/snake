// js/services/firebase-service.js
// Firebase SDK carregado via CDN no HTML — acessa via window
// Compatível com file:// e servidores

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
    // Tenta inicializar assim que o SDK estiver disponível
    this._tryInit();
  }

  _tryInit() {
    try {
      const firebase = window.firebase;
      if (!firebase) { console.warn('[Firebase] SDK não carregado ainda'); return; }
      const app  = firebase.initializeApp(firebaseConfig);
      this.#db   = firebase.firestore(app);
      this.#initialized = true;
      console.log('[Firebase] Conectado.');
    } catch (e) {
      // Pode já ter sido inicializado
      try {
        const firebase = window.firebase;
        if (firebase?.app) {
          this.#db = firebase.firestore(firebase.app());
          this.#initialized = true;
          console.log('[Firebase] Reconectado.');
        }
      } catch(e2) {
        console.warn('[Firebase] Modo offline:', e2.message);
      }
    }
  }

  get isOnline() { return this.#initialized && this.#db !== null; }

  async #withRetry(op, fallback=null) {
    if (!this.isOnline) return fallback;
    for (let i=0; i<this.#maxRetries; i++) {
      try { return await op(); }
      catch(e) {
        if (i===this.#maxRetries-1) throw e;
        await new Promise(r=>setTimeout(r,1000*(i+1)));
      }
    }
  }

  async loadProfile(id, timeout=5000) {
    if (!this.isOnline) return null;
    try {
      const db = this.#db;
      const result = await Promise.race([
        this.#withRetry(async () => {
          const snap = await db.collection('dimen6_players').doc(id).get();
          return snap.exists ? snap.data() : null;
        }),
        new Promise((_,rej)=>setTimeout(()=>rej(new Error('Timeout')),timeout))
      ]);
      return result;
    } catch(e) { console.warn('[Firebase] loadProfile:', e.message); return null; }
  }

  async saveProfile(id, data) {
    if (!this.isOnline || !id) return false;
    try {
      await this.#withRetry(()=>this.#db.collection('dimen6_players').doc(id).set(data,{merge:true}));
      return true;
    } catch(e) { console.warn('[Firebase] saveProfile:', e.message); return false; }
  }

  async loadRanking(topCount=8, mode='classic') {
    if (!this.isOnline) throw new Error('Offline');
    const field = {classic:'best_classic',wrap:'best_wrap',speed:'best_speed',challenge:'best_challenge'}[mode]||'best_classic';
    const snap = await this.#withRetry(()=>
      this.#db.collection('dimen6_players').orderBy(field,'desc').limit(topCount).get()
    );
    const rank = [];
    snap.forEach(d => {
      const data = d.data();
      rank.push({
        id:d.id,
        nick:          data.nick||d.id.replace(/^P_/,''),
        best_classic:  data.best_classic  ||0,
        best_wrap:     data.best_wrap     ||0,
        best_speed:    data.best_speed    ||0,
        best_challenge:data.best_challenge||0,
        unlocked:      data.unlocked      ||1,
      });
    });
    return rank;
  }
}

export const firebase = new FirebaseService();
window.FirebaseDB = firebase;
