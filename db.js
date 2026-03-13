// ============================================================
//  db.js — Firebase Firestore 데이터 레이어 (ES Module)
//  window.DB 로 전역 노출
// ============================================================

import {
  collection, getDocs, addDoc, updateDoc, deleteDoc,
  doc, getDoc, setDoc, query, where, orderBy, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const COLL     = "weekly_entries";
const SETTINGS = "settings";

function getDB() {
  if (!window._db) throw new Error("Firebase not initialized");
  return window._db;
}

const DB = {

  // ── 실시간 구독 (대시보드용) ──────────────────────
  subscribeAll(callback) {
    const db = getDB();
    const q = query(collection(db, COLL), orderBy("created_at", "desc"));
    return onSnapshot(q, snap => {
      const entries = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(entries);
      document.querySelectorAll('.db-status').forEach(el => {
        el.textContent = `● Firebase 연결됨 (${entries.length}건)`;
        el.className = 'db-status ok';
      });
    }, err => {
      console.error(err);
      document.querySelectorAll('.db-status').forEach(el => {
        el.textContent = '● 연결 오류';
        el.className = 'db-status err';
      });
    });
  },

  // ── 주차별 조회 ───────────────────────────────────
  async getByWeek(weekStart) {
    const db = getDB();
    const q = query(collection(db, COLL), where("week_start", "==", weekStart));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  // ── 추가 ─────────────────────────────────────────
  async add(entry) {
    const db = getDB();
    entry.created_at = serverTimestamp();
    const ref = await addDoc(collection(db, COLL), entry);
    return ref.id;
  },

  // ── 수정 ─────────────────────────────────────────
  async update(id, patch) {
    const db = getDB();
    patch.updated_at = serverTimestamp();
    await updateDoc(doc(db, COLL, id), patch);
  },

  // ── 삭제 ─────────────────────────────────────────
  async remove(id) {
    const db = getDB();
    await deleteDoc(doc(db, COLL, id));
  },

  // ── 전체 조회 (입력 페이지 목록용) ────────────────
  async getAll() {
    const db = getDB();
    const q = query(collection(db, COLL), orderBy("created_at", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  // ── 설정 조회 ─────────────────────────────────────
  async getSettings() {
    const db = getDB();
    const snap = await getDoc(doc(db, SETTINGS, "dropdowns"));
    return snap.exists() ? snap.data() : null;
  },

  // ── 설정 저장 ─────────────────────────────────────
  async saveSettings(data) {
    const db = getDB();
    await setDoc(doc(db, SETTINGS, "dropdowns"), data);
  }
};

// 전역 노출
window.DB = DB;

// Firebase 준비 이벤트 발행
window.dispatchEvent(new Event('db-ready'));
