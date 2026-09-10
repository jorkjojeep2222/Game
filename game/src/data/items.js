/* ============================================================
   items.js — ไอเท็ม / ความหายาก / คุณสมบัติสุ่ม / วัตถุดิบ / กระเป๋า / สัตว์เลี้ยง
   ระบบไอเท็มเป็นแบบ  ฐาน × ความหายาก × คุณสมบัติสุ่ม
   ============================================================ */
import { ENV } from './world.js';
import { hash } from '../core/util.js';
import { ENHANCE } from '../core/config.js';

export const RARITY = [
  { id: 0, name: 'สามัญ', color: '#9BA6B2', mult: 1.00, affixes: 0, weight: 55 },
  { id: 1, name: 'ดี', color: '#6E9B5E', mult: 1.22, affixes: 1, weight: 27 },
  { id: 2, name: 'หายาก', color: '#5FA8D3', mult: 1.55, affixes: 2, weight: 12 },
  { id: 3, name: 'มหากาพย์', color: '#A97BD6', mult: 2.10, affixes: 3, weight: 5 },
  { id: 4, name: 'ตำนาน', color: '#E4622A', mult: 3.10, affixes: 4, weight: 1 },
];

/** ไอเท็มฐาน — wear:0 = ไม่เสื่อมสภาพ */
export const BASES = [
  { id: 'w1', slot: 'weapon', name: 'หอกปลายกระดูก', lv: 1, power: 1.40, wear: 1.0, price: 220 },
  { id: 'w2', slot: 'weapon', name: 'ขวานหินไฟ', lv: 9, power: 2.30, wear: 1.2, price: 3400 },
  { id: 'w3', slot: 'weapon', name: 'ดาบสังหารมหาสัตว์', lv: 22, power: 3.80, wear: 1.4, price: 48000 },
  { id: 'a1', slot: 'armor', name: 'เสื้อหนังดิบ', lv: 1, resAll: .10, wear: 1.0, price: 260 },
  { id: 'a2', slot: 'armor', name: 'เกราะขนหมี', lv: 9, resAll: .22, wear: .9, price: 3800 },
  { id: 'a3', slot: 'armor', name: 'เกราะเกล็ดมังกร', lv: 22, resAll: .40, wear: 1.1, price: 56000 },
  { id: 'c1', slot: 'charm', name: 'เครื่องรางกระดูก', lv: 1, vigor: 1.20, wear: .7, price: 300 },
  { id: 'c2', slot: 'charm', name: 'เครื่องรางเขี้ยวหมาป่า', lv: 9, vigor: 1.45, wear: .7, price: 4200 },
  { id: 'c3', slot: 'charm', name: 'เครื่องรางวิญญาณ', lv: 22, vigor: 1.80, slots: 2, wear: 0, price: 62000 },
];
export const baseById = id => BASES.find(b => b.id === id);
export const SLOT_NAME = { weapon: 'อาวุธ', armor: 'เกราะ', charm: 'เครื่องราง' };
export const SLOT_ICON = { weapon: '⚔️', armor: '🛡️', charm: '🔮' };

/** คุณสมบัติสุ่มที่ติดมากับไอเท็ม */
export const AFFIXES = [
  { id: 'pw', fmt: v => `พลัง +${v}%` },
  { id: 'vg', fmt: v => `หิว/กระหายช้าลง ${v}%` },
  { id: 'dr', fmt: v => `เสื่อมสภาพช้าลง ${v}%` },
  { id: 'lk', fmt: v => `โอกาสของหายาก +${v}%` },
  { id: 'gd', fmt: v => `ทองที่ได้ +${v}%` },
  { id: 'wt', fmt: v => `เก็บน้ำได้ +${v}%` },
  ...ENV.map(e => ({ id: 'r_' + e.id, env: e.id, fmt: v => `ต้าน${e.name} +${(v / 100).toFixed(2)}` })),
];
export const affixById = id => AFFIXES.find(a => a.id === id);
const affixRoll = (id, ilvl) =>
  id === 'pw' ? 4 + Math.floor(Math.random() * (6 + ilvl))
    : (id === 'dr' || id === 'wt') ? 10 + Math.floor(Math.random() * 30)
      : 6 + Math.floor(Math.random() * 24);

let UID = 1;
export const setUidFloor = n => { UID = Math.max(UID, n); };
export const nextUid = () => UID++;

/** สุ่มไอเท็มหนึ่งชิ้น — luck ยิ่งสูงยิ่งมีโอกาสได้ระดับสูง */
export function rollItem(ilvl, luck = 1) {
  const pool = BASES.filter(b => b.lv <= Math.max(1, ilvl));
  const base = pool[Math.floor(Math.random() * pool.length)] || BASES[0];
  const total = RARITY.reduce((a, r) => a + r.weight * (r.id > 0 ? luck : 1), 0);
  let x = Math.random() * total, rar = RARITY[0];
  for (const r of RARITY) { x -= r.weight * (r.id > 0 ? luck : 1); if (x <= 0) { rar = r; break; } }
  const picked = [...AFFIXES].sort(() => Math.random() - .5).slice(0, rar.affixes);
  return { uid: UID++, base: base.id, rar: rar.id, ilvl: Math.max(1, ilvl), dur: 100,
    affixes: picked.map(a => ({ id: a.id, v: affixRoll(a.id, ilvl) })) };
}
export const itemValue = it =>
  Math.floor(baseById(it.base).price * RARITY[it.rar].mult * (1 + it.ilvl * .06) * (1 + it.affixes.length * .25));

/** วัตถุดิบขายได้ — meat มี keep:true เพราะเป็นอาหาร ขายหมดแล้วอดตาย */
export const MATS = [
  { id: 'meat', name: 'เนื้อ', icon: '🥩', base: 1.1, keep: true },
  { id: 'hide', name: 'หนังและกระดูก', icon: '🦴', base: 7 },
  { id: 'core', name: 'แกนมหาสัตว์', icon: '🔮', base: 90 },
];
/** ราคาขึ้นลงตามเวลา และต่างกันในแต่ละถิ่น (คลื่นไซน์สองชั้น) */
export function priceMul(matId, groundId, now) {
  const h = hash(matId + groundId);
  return 1 + .32 * Math.sin(now / 260000 + h) + .14 * Math.sin(now / 71000 + h * 1.7);
}

export const BAGS = [
  { lv: 1, name: 'ถุงหนังเล็ก', mult: 1.0, cost: 0 },
  { lv: 2, name: 'เป้หนังสัตว์', mult: 1.7, cost: 900 },
  { lv: 3, name: 'เป้กระดูกเสริม', mult: 2.8, cost: 9000 },
  { lv: 4, name: 'เป้ลูกหาบ', mult: 4.6, cost: 85000 },
  { lv: 5, name: 'ถุงมิติ', mult: 8.0, cost: 900000 },
];

export const PETS = [
  { id: 'wolf', name: 'หมาป่าเงิน', icon: '🐺', ground: 'pine', bonus: 'power', res: { cold: .15 }, desc: 'พลัง +10% ต่อเลเวล',
    shape: 'quad', pal: { o: '#0D2233', 1: '#A9CBE6', 2: '#EAF6FF', 3: '#4A6B88', e: '#FFE9A8' } },
  { id: 'yak', name: 'วัวขนหิมะ', icon: '🐂', ground: 'frost', bonus: 'hide', res: { cold: .25 }, desc: 'หนัง +14% ต่อเลเวล',
    shape: 'behemoth', pal: { o: '#1A1218', 1: '#EDE7DA', 2: '#FFFFFF', 3: '#9BA6B2', e: '#4A5A68' } },
  { id: 'lizard', name: 'กิ้งก่าหินไฟ', icon: '🦎', ground: 'waste', bonus: 'vigor', res: { heat: .25, dust: .15 }, desc: 'หิว/กระหายช้าลง 8% ต่อเลเวล',
    shape: 'bug', pal: { o: '#3A1408', 1: '#F2762F', 2: '#FFC070', 3: '#B84C18', e: '#FFE070' } },
  { id: 'raven', name: 'อีกาเถ้า', icon: '🐦‍⬛', ground: 'ashf', bonus: 'luck', res: { ash: .25, poison: .15 }, desc: 'โอกาสของหายาก +25% ต่อเลเวล',
    shape: 'winged', pal: { o: '#0A1119', 1: '#22364A', 2: '#4A5A68', 3: '#101B26', e: '#F0C24A' } },
];
export const petById = id => PETS.find(p => p.id === id);

/* ============================================================
   ระบบตีบวก (Enhance) — ไอเท็มเต็มชิ้นดรอปยาก แต่ตีบวกได้ไม่จำกัด
   ด้วย "ชิ้นส่วนปริศนา (fragments)" ที่ดรอปบ่อยกว่ามาก
   ทุก +1 เพิ่มโบนัสของฐาน (power/resAll/vigor) อีก 20% (ดู core/derive.js)
   ============================================================ */
export function getEnhanceCost(item) {
  const rarMult = RARITY[item.rar].mult;
  const upg = item.upgrade || 0;
  return {
    gold: Math.floor(baseById(item.base).price * rarMult * (upg + 1) * ENHANCE.goldCostMult),
    fragments: upg + 1,
  };
}
