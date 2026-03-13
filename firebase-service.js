import { initializeApp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, collection, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBbIgJMr0o1PbhKWrGAJ8sIMfKw_XK0HeA",
  authDomain: "snake-45d1c.firebaseapp.com",
  projectId: "snake-45d1c",
  storageBucket: "snake-45d1c.firebasestorage.app",
  messagingSenderId: "87119635039",
  appId: "1:87119635039:web:f3d88e6abbeee8da8af1ea",
  measurementId: "G-3CEKSTMQJK"
};

let db = null;

try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} catch (e) {
  console.warn("[Dimen6] Firebase Offline Mode.");
}

window.FirebaseDB = {
  async loadProfile(id) {
    if (!db) return null;
    try {
      const docSnap = await getDoc(doc(db, "dimen6_players", id));
      return docSnap.exists() ? docSnap.data() : null;
    } catch (e) { return null; }
  },

  async saveProfile(id, data) {
    if (!db) return;
    try { await setDoc(doc(db, "dimen6_players", id), data, { merge: true }); } 
    catch (e) { console.error(e); }
  },

  async loadRanking(topCount = 5) {
    if (!db) throw new Error("Offline");
    try {
      const q = query(collection(db, "dimen6_players"), orderBy("best_classic", "desc"), limit(topCount));
      const snapshot = await getDocs(q);
      const rank = [];
      snapshot.forEach(doc => rank.push({ id: doc.id, ...doc.data() }));
      return rank;
    } catch (e) { throw e; }
  }
};