/* ============================================================
   storage.js — ห่อการอ่าน/เขียนเซฟไว้ที่เดียว
   ถ้าย้ายไป Flutter / localStorage / เซิร์ฟเวอร์ แก้แค่ไฟล์นี้
   ============================================================ */
import { SAVE_KEY } from './config.js';
import { raceById } from '../data/races.js';
import { setUidFloor } from '../data/items.js';

export async function loadSave() {
  try {
    const r = await window.storage.get(SAVE_KEY);
    if (!r || !r.value) return null;
    const st = JSON.parse(r.value);
    return migrate(st);
  } catch (e) {
    return null;                   // ยังไม่เคยเซฟ หรือเซฟเสีย
  }
}

export async function writeSave(state) {
  if (!state) return;
  try {
    await window.storage.set(SAVE_KEY, JSON.stringify({ ...state, lastSaved: Date.now() }));
  } catch (e) { /* เขียนไม่ได้ก็ไม่ทำให้เกมพัง */ }
}

/** ซ่อมข้อมูลเซฟเก่าให้ใช้กับโค้ดปัจจุบันได้
 *  - ฟังก์ชันใน blood.cls หายไปตอน JSON.stringify จึงต้องผูกกลับ
 *  - ตั้งค่า UID ของไอเท็มไม่ให้ชนกับของเดิม */
function migrate(st) {
  const race = raceById(st.blood?.parents?.[0]);
  const cls = race?.classes.find(c => c.id === st.blood?.cls?.id);
  if (cls) st.blood.cls = cls;

  const ids = [
    ...(st.inv || []).map(i => i.uid || 0),
    ...Object.values(st.eq || {}).filter(Boolean).map(i => i.uid || 0),
  ];
  setUidFloor(Math.max(1, ...ids) + 1);

  // ฟิลด์ที่อาจไม่มีในเซฟเวอร์ชันเก่า
  st.runes = st.runes || [];
  st.pending = st.pending || [];
  st.essences = st.essences || [];
  st.inv = st.inv || [];
  st.unlocked = st.unlocked || {};

  // เพิ่มใน v8: ระบบด่าน/เวฟ/บอส + เลเวลอาวุธ + วัตถุโบราณ
  st.stage = st.stage ?? 1;
  st.stageKills = st.stageKills ?? 0;
  st.weaponLv = st.weaponLv ?? 1;
  st.artifacts = st.artifacts || {};

  // เพิ่มใน v9: ชิ้นส่วนปริศนา/ตีบวก
  st.fragments = st.fragments ?? 0;

  // เพิ่มใน v10: ความอึด + สกัดสาร
  st.stamina = st.stamina ?? 100;
  st.mycelium = st.mycelium ?? 0;
  st.peptides = st.peptides ?? 0;
  st.peptideEnd = st.peptideEnd ?? 0;

  return st;
}
