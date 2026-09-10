/* ============================================================
   util.js — ฟังก์ชันช่วยเหลือทั่วไป ไม่ผูกกับกฎของเกม
   ============================================================ */
import { SEASON_MS } from './config.js';

const SUFFIX = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp'];

/** ย่อตัวเลขใหญ่ให้อ่านง่าย เช่น 1234567 -> "1.23M" */
export function fmt(n) {
  if (!isFinite(n)) return '∞';
  if (n < 0) return '0';
  if (n < 10) return n.toFixed(1);
  if (n < 1000) return String(Math.floor(n));
  let i = 0;
  while (n >= 1000 && i < SUFFIX.length - 1) { n /= 1000; i++; }
  return n.toFixed(2) + SUFFIX[i];
}

export function fmtTime(sec) {
  sec = Math.floor(sec);
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  if (h) return `${h} ชม. ${m} นาที`;
  if (m) return `${m} นาที ${s} วิ`;
  return `${s} วิ`;
}

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const rnd = (a, b) => a + Math.random() * (b - a);
export const pick = arr => arr[Math.floor(Math.random() * arr.length)];
export const seasonAt = t => Math.floor(t / SEASON_MS) % 4;

/** ค่าประสบการณ์ที่ต้องใช้เพื่อขึ้นเลเวลถัดไป */
export const expNeed = lv => Math.floor(55 * Math.pow(lv, 1.66));

/** แฮชสตริงเป็นตัวเลข ใช้ทำราคาสินค้าให้ต่างกันในแต่ละถิ่น */
export function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 1000;
  return h;
}

/** สุ่มแบบคงที่ (deterministic) สำหรับวางฉากหลังให้ไม่กระพริบทุกเฟรม */
export function prand(i) { const x = Math.sin(i * 127.1) * 43758.5453; return x - Math.floor(x); }
