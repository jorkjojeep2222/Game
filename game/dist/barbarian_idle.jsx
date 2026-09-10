import React, { useState, useEffect, useRef, useCallback } from 'react';

/* =============================================================
   ไฟล์นี้ถูกสร้างอัตโนมัติจาก src/ ด้วย tools/bundle.mjs
   อย่าแก้ไฟล์นี้โดยตรง — แก้ที่ src/ แล้วสั่ง  node tools/bundle.mjs
   ============================================================= */

/* ===== src/core/config.js ===== */
/* ============================================================
   config.js — ตัวเลขปรับสมดุลทั้งหมดอยู่ที่นี่ที่เดียว
   แก้ไฟล์นี้ไฟล์เดียวก็เปลี่ยนจังหวะเกมได้ทั้งเกม
   ============================================================ */

const SAVE_KEY = 'barbarian_idle_v7';

/* --- เวลา --- */
const SEASON_MS = 150_000;        // 1 ฤดู (เกมจริงควรเป็น 6 ชม.)
const TICK_MS = 200;              // ความถี่การจำลองตอนเล่นสด
const UI_CLOCK_MS = 500;          // ความถี่การอัปเดตตัวเลขบนจอ (ช้ากว่า tick เพื่อลดการกระตุก)

/* --- ระบบ offline --- */
const OFFLINE_STEP = 30;          // จำลองทีละ 30 วินาที
const OFFLINE_MAX_STEPS = 2000;   // เพดานกันแอปค้าง
const OFFLINE_EFF = 0.6;          // ได้ 60% ของอัตราปกติ
const OFFLINE_CAP_MS = 12 * 3600_000;

/* --- มอนสเตอร์ --- */
const MONSTER_UNLOCK_QUEST = 1;   // ปลดล็อกหลังผ่านเควสต์แรก

/* --- กระเป๋า --- */
const BAG_SLOTS = 14;

/* --- ระบบด่าน / เวฟ / บอส / อาร์ติแฟกต์ (แทนที่ระบบสปอว์นตามเวลาแบบเดิม) --- */
const STAGE = {
  hpBase: 100,             // เลือดมอนสเตอร์ = hpBase × tier × hpGrowth^(stage-1)
  hpGrowth: 1.45,           // เดิม 1.35 — ชันขึ้นเพื่อชดเชยที่ไอเท็มเต็มชิ้นดรอปยากขึ้นมาก
  bossWaveSize: 9,         // ฆ่าลูกกระจ๊อกครบเท่านี้ ตัวถัดไปเป็นบอส (ตัวที่ 10)
  bossHpMult: 10,          // บอสเลือดเยอะกว่าปกติกี่เท่า
  bossTimeMs: 30_000,      // เวลาจำกัดปราบบอส
  normalTimeMs: 3_600_000, // มอนสเตอร์ธรรมดาแทบไม่หมดเวลาเอง (สู้ต่อเนื่องแบบ Tap Titans)
  respawnMs: 1_000,        // ดีเลย์ตอนไม่มีมอนสเตอร์เลย (เช่นเพิ่งเริ่มเกม)
  respawnAfterKillMs: 800, // ดีเลย์หลังฆ่าตัวหนึ่งก่อนตัวถัดไปโผล่
  goldBase: 20,
  goldGrowth: 1.25,        // ทองต่อการฆ่าเพิ่มขึ้นตามด่าน
  bossGoldMult: 4,
  weaponPowerGrowth: 1.15, // พลังรวม ×1.15 ต่อเลเวลอาวุธ
  weaponUpgradeBase: 100,
  weaponUpgradeGrowth: 1.22,
  rebirthStageReq: 5,      // ต้องผ่านด่านนี้ก่อนถึงจะเกิดใหม่ได้
  shardExponent: 1.4,      // ยิ่งด่านสูง ยิ่งได้ความทรงจำเยอะแบบทวีคูณ
};

/* --- ระบบตีบวก (Enhance) --- */
const ENHANCE = {
  powerPerLevel: 0.20,   // ทุก +1 เพิ่มโบนัสของฐาน 20%
  goldCostMult: 1.5,     // ราคาทอง = ราคาฐาน × ความหายาก × (เลเวลปัจจุบัน+1) × ค่านี้
};

/* --- ฝูงมอนสเตอร์คลั่ง (Horde) — เกิดสุ่มแทนมอนสเตอร์ธรรมดา ให้ทั้งเลือดและรางวัลมากกว่า --- */
const HORDE = {
  chance: 0.15,       // โอกาสที่มอนสเตอร์ธรรมดาตัวถัดไปจะเป็นฝูงแทน
  hpMult: 3.5,
  rewardMult: 3,       // ทอง/โอกาสไอเท็ม/ชิ้นส่วน คูณ 3 (คิดเป็นมอนสเตอร์ 3 ตัวรวมกัน)
  beastsCredit: 3,      // นับใน "จำนวนที่สังหาร" เป็น 3
};

/* --- สารสกัดเปปไทด์ (Peptide) — คราฟต์จากไมซีเลียม ให้บัฟพลังชั่วคราวแรงๆ --- */
const PEPTIDE = {
  myceliumCost: 10,       // ไมซีเลียมที่ต้องใช้ต่อ 1 ขวด
  durationMs: 45_000,
  powerMult: 2.5,         // พลังรวม ×2.5 ระหว่างออกฤทธิ์ (แรงพอจะช่วยตอนไล่บอส แต่ไม่ถึงขั้นชนะฟรี)
  myceliumBossDrop: 2,    // บอสดรอปไมซีเลียมการันตี
  myceliumMobChance: 0.10,
};

/* --- ความอึด (Stamina) --- ออกแบบใหม่จากสเปกเดิม เพราะสูตรเดิม (สู้ -1.8/วิ พัก +3.0/วิ)
   ขาดทุนสุทธิทุกรอบการฆ่าในระบบต่อสู้ต่อเนื่องของเรา (มอนสเตอร์แทบไม่มีช่วงพักจริง)
   ทำให้ความอึดหมดถาวรภายในไม่กี่นาทีแรกและล็อกผู้เล่นไว้ตลอดไป — ขัดหลักเกมไอเดิลที่ดี
   (ห้ามมีอะไรบล็อกความคืบหน้าแบบพาสซีฟเด็ดขาด)

   ระบบใหม่: ความอึดผูกกับ "การแตะมือ" เท่านั้น ไม่ผูกกับดาเมจอัตโนมัติ/การต่อสู้เอง
   - แตะแต่ละครั้งเสียความอึด ฟื้นตัวเองต่อเนื่องตลอดเวลาไม่ว่าจะทำอะไรอยู่
   - อึดต่ำ = ดาเมจจากการแตะมือลดลง (ไม่ใช่หยุดเกม) ดาเมจอัตโนมัติไม่โดนกระทบเลย
   - ผลคือ: แตะรัวๆ ไม่จำกัดจะเริ่มได้ผลตอบแทนลดลง สร้างจังหวะ แต่ไม่มีทางล็อกเกม */
const STAMINA = {
  max: 100,
  tapCost: 4,
  regenPerSec: 6,        // ฟื้นไวกว่าที่เสียตอนแตะปกติเสมอ กันไม่ให้ไหลลงศูนย์ถาวร
  lowThreshold: 20,
  lowTapPenalty: 0.5,    // ต่ำกว่า threshold ดาเมจแตะมือเหลือ 50%
};

/* --- ตัวคูณพื้นฐาน --- */
const BASE = {
  hungerRate: 0.55,
  thirstRate: 0.50,
  meatRate: 0.045,
  hideRate: 0.0055,
  waterRate: 0.20,
  expRate: 0.026,
  wear: 0.026,
  autoDpsRatio: 0.55,      // ดาเมจอัตโนมัติ = พลัง × ค่านี้
  tapBase: 2.2,
  critChance: 0.15,
  critMult: 2.5,
  legendChancePerTier: 0.04,
  /* --- เศรษฐกิจชิ้นส่วนปริศนา (แทนที่ itemDropChance เดิม) ---
     ไอเท็มเต็มชิ้นดรอปยากมาก (โดยเฉพาะมอนธรรมดา) แต่ชิ้นส่วนดรอปบ่อยกว่ามาก
     เอาไว้ตีบวกของที่มีอยู่แล้ว — ให้เป้าหมายฟาร์มระยะยาวแทนการรอของใหม่ */
  bossItemChance: 0.15,     // บอสดรอปไอเท็มเต็มชิ้น 15% (คูณ luck)
  mobItemChance: 0.02,      // มอนธรรมดาดรอปไอเท็มเต็มชิ้นแค่ 2% (คูณ luck)
  bossFragmentMin: 1,
  bossFragmentMax: 3,       // บอสการันตีได้ชิ้นส่วน 1-3 ชิ้น
  mobFragmentChance: 0.15,  // มอนธรรมดามีโอกาส 15% ได้ชิ้นส่วน 1 ชิ้น
  petTameChance: 0.10,
  petTameBeastkin: 0.30,
  repairCostRatio: 0.12,
  sellItemRatio: 0.55,
  shopMarkup: 1.5,
};

/* ===== src/core/util.js ===== */
/* ============================================================
   util.js — ฟังก์ชันช่วยเหลือทั่วไป ไม่ผูกกับกฎของเกม
   ============================================================ */

const SUFFIX = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp'];

/** ย่อตัวเลขใหญ่ให้อ่านง่าย เช่น 1234567 -> "1.23M" */
function fmt(n) {
  if (!isFinite(n)) return '∞';
  if (n < 0) return '0';
  if (n < 10) return n.toFixed(1);
  if (n < 1000) return String(Math.floor(n));
  let i = 0;
  while (n >= 1000 && i < SUFFIX.length - 1) { n /= 1000; i++; }
  return n.toFixed(2) + SUFFIX[i];
}

function fmtTime(sec) {
  sec = Math.floor(sec);
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  if (h) return `${h} ชม. ${m} นาที`;
  if (m) return `${m} นาที ${s} วิ`;
  return `${s} วิ`;
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const seasonAt = t => Math.floor(t / SEASON_MS) % 4;

/** ค่าประสบการณ์ที่ต้องใช้เพื่อขึ้นเลเวลถัดไป */
const expNeed = lv => Math.floor(55 * Math.pow(lv, 1.66));

/** แฮชสตริงเป็นตัวเลข ใช้ทำราคาสินค้าให้ต่างกันในแต่ละถิ่น */
function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 1000;
  return h;
}

/** สุ่มแบบคงที่ (deterministic) สำหรับวางฉากหลังให้ไม่กระพริบทุกเฟรม */
function prand(i) { const x = Math.sin(i * 127.1) * 43758.5453; return x - Math.floor(x); }

/* ===== src/data/world.js ===== */
/* ============================================================
   world.js — ภัยสิ่งแวดล้อม / ฤดูกาล / ค่าพลัง / ถิ่นล่าสัตว์
   ============================================================ */

/** ภัยสิ่งแวดล้อม 6 ชนิด — ใช้เป็นแกนกลางของทั้งเกม
 *  (ความต้านทาน, เอสเซนส์, เกราะ, ถิ่น ล้วนอ้างอิง id เหล่านี้) */
const ENV = [
  { id: 'cold', name: 'หนาว', icon: '❄️' },
  { id: 'heat', name: 'ร้อน', icon: '🔥' },
  { id: 'rain', name: 'ฝน', icon: '🌧️' },
  { id: 'poison', name: 'พิษ', icon: '☠️' },
  { id: 'dust', name: 'ฝุ่น', icon: '🌪️' },
  { id: 'ash', name: 'เถ้าลาวา', icon: '🌋' },
];
const zeroEnv = () => ({ cold: 0, heat: 0, rain: 0, poison: 0, dust: 0, ash: 0 });
const envById = id => ENV.find(e => e.id === id);

const STATS = [
  { id: 'str', name: 'พละกำลัง', abbr: 'STR', desc: 'พลังโจมตี — ตัวขับผลผลิตหลัก' },
  { id: 'agi', name: 'ความคล่องแคล่ว', abbr: 'AGI', desc: 'เพิ่มดาเมจต่อการแตะ' },
  { id: 'vit', name: 'ความอึด', abbr: 'VIT', desc: 'ทนหิว ทนกระหาย ของพังช้าลง' },
  { id: 'sen', name: 'สัมผัส', abbr: 'SEN', desc: 'หาน้ำเก่ง เจอของหายากบ่อย' },
  { id: 'int', name: 'ปัญญา', abbr: 'INT', desc: 'ต่อรองราคาดีขึ้น' },
];

/** ฤดูกาลวนอัตโนมัติตามนาฬิกาจริง — add คือภัยที่เพิ่มเข้ามา */
const SEASONS = [
  { name: 'ใบไม้ผลิ', icon: '🌱', meat: 1.10, add: { rain: .30 } },
  { name: 'ร้อน', icon: '☀️', meat: 1.15, add: { heat: .35, dust: .15 } },
  { name: 'ใบไม้ร่วง', icon: '🍂', meat: 1.00, add: { dust: .20 } },
  { name: 'หนาว', icon: '🌨️', meat: 0.60, add: { cold: .45 } },
];

/** ถิ่นล่าสัตว์ — unlock คือเลเวลขั้นต่ำ, tier คือระดับความโหด
 *  sky/far/gnd/deco ใช้วาดฉากพิกเซล */
const GROUNDS = [
  { id: 'pine', name: 'ป่าสน', icon: '🌲', unlock: 0, tier: 1,
    meat: 1.0, hide: 1.0, water: 1.0, exp: 1.0, drop: 1.0,
    sky: ['#122236', '#2B4560'], far: '#1B3348', gnd: ['#4A7A3E', '#365C2E', '#26401F'], deco: 'tree',
    threat: { cold: .25, rain: .20 } },
  { id: 'frost', name: 'ที่ราบน้ำแข็ง', icon: '🧊', unlock: 5, tier: 2,
    meat: 1.5, hide: 1.2, water: 0.35, exp: 1.5, drop: 1.2,
    sky: ['#1A2C42', '#48708F'], far: '#28405A', gnd: ['#D6E8F2', '#A8C4D6', '#7A96AC'], deco: 'ice',
    threat: { cold: .85, dust: .10 } },
  { id: 'grit', name: 'หุบเขาลมกรด', icon: '🏜️', unlock: 11, tier: 3,
    meat: 1.3, hide: 1.5, water: 0.5, exp: 2.1, drop: 1.4,
    sky: ['#3E2E1A', '#7A6238'], far: '#4E3C22', gnd: ['#C0A05E', '#96794A', '#6A5432'], deco: 'rock',
    threat: { dust: .90, heat: .30 } },
  { id: 'marsh', name: 'หนองพิษ', icon: '🫧', unlock: 19, tier: 4,
    meat: 1.9, hide: 1.0, water: 1.5, exp: 2.9, drop: 1.6,
    sky: ['#152418', '#31513A'], far: '#1E3626', gnd: ['#4E7A4A', '#3A5C38', '#284022'], deco: 'tree',
    threat: { poison: .85, rain: .55 } },
  { id: 'waste', name: 'ทะเลทรายแดง', icon: '🏝️', unlock: 29, tier: 5,
    meat: 1.4, hide: 2.2, water: 0.15, exp: 3.8, drop: 1.9,
    sky: ['#4E2A1C', '#9A5432'], far: '#5E3220', gnd: ['#C87A46', '#A05C32', '#743E20'], deco: 'rock',
    threat: { heat: .90, dust: .60 } },
  { id: 'ashf', name: 'เชิงภูเขาไฟ', icon: '🌋', unlock: 44, tier: 6,
    meat: 1.3, hide: 2.8, water: 0.25, exp: 5.2, drop: 2.4,
    sky: ['#26100E', '#66221A'], far: '#341410', gnd: ['#4E322C', '#3A231E', '#241412'], deco: 'lava',
    threat: { ash: .95, heat: .70 } },
];
const groundById = id => GROUNDS.find(g => g.id === id) || GROUNDS[0];

/** เส้นทางย่อยในแต่ละถิ่น — ปรับความเสี่ยงกับผลตอบแทน */
function pathsFor(gr) {
  const envs = Object.keys(gr.threat);
  return [
    { id: 'main', name: 'เส้นทางหลัก', icon: '🥾', desc: 'สมดุลทุกด้าน', threatMul: 1.0, dropMul: 1.0, goldMul: 1.0, envBias: envs },
    { id: 'deep', name: 'ลึกเข้าไป', icon: '🕳️', desc: 'เสี่ยงกว่า ของดีกว่า', threatMul: 1.35, dropMul: 1.6, goldMul: 1.1, envBias: envs },
    { id: 'ruin', name: 'ซากปรักหักพัง', icon: '🏚️', desc: 'ปลอดภัยกว่า ทองเยอะ', threatMul: .85, dropMul: .8, goldMul: 1.7, envBias: envs.slice(0, 1) },
  ];
}
const pathById = (gr, id) => pathsFor(gr).find(p => p.id === id) || pathsFor(gr)[0];

/* ===== src/data/traits.js ===== */
/* ============================================================
   traits.js — ลักษณะสายเลือด + ระบบรูน
   รูนดวงเดียวกันมีผลเหมือนกัน แต่ "ชื่อ" เปลี่ยนตามเผ่าพันธุ์
   ============================================================ */

const TRAITS = {
  quicklearn: { name: 'ผู้เรียนรู้เร็ว', desc: 'ค่าประสบการณ์ +30%' },
  boilblood: { name: 'เลือดเดือด', desc: 'เมื่อความอิ่มต่ำกว่า 40% พลัง ×1.6' },
  craftsman: { name: 'มือช่าง', desc: 'ของเสื่อมช้าลงครึ่งหนึ่ง ซ่อมถูกลง 40%' },
  woodsense: { name: 'สัมผัสพงไพร', desc: 'โอกาสของหายาก ×1.8' },
  beastkin: { name: 'ญาติสัตว์ป่า', desc: 'จับสัตว์เลี้ยงง่ายขึ้นมาก และมันแรงขึ้น +50%' },
  nameless: { name: 'ผู้ไม่ถูกจดจำ', desc: 'ช่องเอสเซนส์ +2 ขายของแพงขึ้น 15%' },
};

/** สไตล์รูนของแต่ละเผ่า — ใช้เลือกชื่อรูนและคำกริยาตอนปลดล็อก */
const RUNE_STYLE = {
  tattoo: { label: 'รอยสัก', icon: '🩸', verb: 'สักลาย' },
  glyph: { label: 'อักขระเวทย์', icon: '✦', verb: 'จารึกอักขระ' },
  blood: { label: 'สายเลือดตื่นรู้', icon: '🐾', verb: 'สืบทอด' },
  fate: { label: 'โชคชะตา', icon: '🎴', verb: 'ได้รับจากดวง' },
};

/** stat: ตัวที่ไปคูณใน derive.js — power/vigor/luck/gold/wear/exp */
const RUNES = [
  { id: 'r_str', stat: 'power', v: .10, req: s => s.lv >= 6, desc: 'พลังรวม +10%',
    name: { tattoo: 'รอยสักหมัดเหล็ก', glyph: 'อักขระพลังธาตุ', blood: 'สัญชาตญาณนักล่า', fate: 'ดวงแห่งนักรบ' } },
  { id: 'r_vit', stat: 'vigor', v: .15, req: s => s.lv >= 6, desc: 'หิว/กระหายช้าลง 15%',
    name: { tattoo: 'รอยสักหนังหมี', glyph: 'อักขระพิทักษ์กาย', blood: 'หนังหนาดั่งเกล็ด', fate: 'ดวงแห่งความอึด' } },
  { id: 'r_luck', stat: 'luck', v: .20, req: s => s.beasts >= 8, desc: 'โอกาสของหายาก +20%',
    name: { tattoo: 'รอยสักตาเหยี่ยว', glyph: 'อักขระโชคชะตา', blood: 'จมูกไวดั่งหมาป่า', fate: 'ดวงแห่งขุมทรัพย์' } },
  { id: 'r_gold', stat: 'gold', v: .18, req: s => s.sold >= 10, desc: 'ทองที่ได้ +18%',
    name: { tattoo: 'รอยสักเงินตรา', glyph: 'อักขระพ่อค้า', blood: 'สัญชาตญาณสะสมของ', fate: 'ดวงแห่งพ่อค้า' } },
  { id: 'r_dur', stat: 'wear', v: .30, req: s => s.migrations >= 2, desc: 'ของเสื่อมช้าลง 30%',
    name: { tattoo: 'รอยสักหินผา', glyph: 'อักขระคุ้มครองของ', blood: 'เขี้ยวไม่มีวันหัก', fate: 'ดวงแห่งช่างฝีมือ' } },
  { id: 'r_exp', stat: 'exp', v: .22, req: s => s.lv >= 14, desc: 'ค่าประสบการณ์ +22%',
    name: { tattoo: 'รอยสักบรรพบุรุษ', glyph: 'อักขระภูมิปัญญา', blood: 'ความทรงจำแห่งฝูง', fate: 'ดวงแห่งผู้เรียนรู้' } },
];
const runeName = (rune, style) => rune.name[style] || rune.name.tattoo;

/** รูนพิเศษ — ได้จากการสังหารสายพันธุ์ตำนานเท่านั้น (เฉพาะสายเลือดผสม) */
const SIGNATURE_RUNES = {
  dragon: { name: 'ตราประทับมังกร', icon: '🐉', desc: 'พลังรวม +35% · ต้านทานทุกชนิด +0.15', power: .35, resAll: .15 },
  spirit: { name: 'ตราประทับภูติ', icon: '👻', desc: 'ค่าประสบการณ์ +45% · โอกาสของหายาก +30%', exp: .45, luck: .30 },
};

/* ===== src/data/races.js ===== */
/* ============================================================
   races.js — เผ่าพันธุ์ 5 เผ่า × คลาสละ 3 = 15 บิลด์
   pal = จานสีสำหรับวาดสไปรต์ตัวละคร
   skill.type ต้องตรงกับที่ derive.js/simulate.js รองรับ:
     power | sustain | bait | blood | craft | harvest | guard | water | elem | beast
   ============================================================ */

const RACES = [
  {
    id: 'human', name: 'มนุษย์', icon: '🗡️', tag: 'สมดุล เรียนรู้ไว', runeStyle: 'fate',
    pal: { hair: '#6B4A2A', hairL: '#8F6838', cloth: '#3E6790', clothL: '#5A88B4', clothD: '#26415C', skin: '#D9A277', skinL: '#F0C79B', skinD: '#A5714C' },
    stats: { str: 1.00, agi: 1.00, vit: 1.00, sen: 1.00, int: 1.00 }, power: 1.00,
    res: { cold: .15, heat: .15, rain: .15, poison: .15, dust: .15, ash: .10 }, trait: 'quicklearn',
    classes: [
      { id: 'sword', name: 'นักดาบ', bias: { str: 3, agi: 2 }, skill: { type: 'power', mult: 3.5, dur: 30, cd: 150, name: 'ดาบพายุ' } },
      { id: 'mage', name: 'นักเวท', bias: { int: 4, sen: 1 }, skill: { type: 'power', mult: 4.5, dur: 20, cd: 150, name: 'ลูกไฟ' } },
      { id: 'priest', name: 'นักบวช', bias: { vit: 2, int: 3 }, skill: { type: 'sustain', dur: 60, cd: 150, name: 'พรแห่งแสง' } },
    ],
  },
  {
    id: 'barbarian', name: 'บาบาเรียน', icon: '🪓', tag: 'พลังดิบ ทนหนาว ไร้เวทมนตร์', runeStyle: 'tattoo',
    pal: { hair: '#3A2416', hairL: '#5A3A22', cloth: '#7A4A2E', clothL: '#A0683E', clothD: '#4E2E1A', skin: '#D08E60', skinL: '#EDB585', skinD: '#9A5F3C' },
    stats: { str: 1.45, agi: 1.05, vit: 1.35, sen: 0.90, int: 0.55 }, power: 1.15,
    res: { cold: .65, heat: .10, rain: .30, poison: .15, dust: .10, ash: .00 }, trait: 'boilblood',
    classes: [
      { id: 'berserk', name: 'นักรบคลั่ง', bias: { str: 4, vit: 1 }, skill: { type: 'power', mult: 5.5, dur: 30, cd: 150, name: 'ปลดปล่อยความคลั่ง' } },
      { id: 'beasth', name: 'ผู้ล่ามหาสัตว์', bias: { str: 3, sen: 2 }, skill: { type: 'bait', dur: 45, cd: 150, name: 'ตามรอยเลือด' } },
      { id: 'bshaman', name: 'หมอผีสายเลือด', bias: { vit: 3, int: 2 }, skill: { type: 'blood', mult: 7, dur: 25, cd: 150, name: 'สังเวยเลือด' } },
    ],
  },
  {
    id: 'dwarf', name: 'คนแคระ', icon: '⚒️', tag: 'ช่างฝีมือ ทนพิษ ทนร้อน', runeStyle: 'tattoo',
    pal: { hair: '#8A4A20', hairL: '#B26A2E', cloth: '#8E5A2B', clothL: '#B87C3E', clothD: '#5E3A1A', skin: '#D89E70', skinL: '#F2C298', skinD: '#A06C46' },
    stats: { str: 1.20, agi: 0.75, vit: 1.40, sen: 0.95, int: 1.25 }, power: 0.90,
    res: { cold: .30, heat: .60, rain: .10, poison: .55, dust: .55, ash: .40 }, trait: 'craftsman',
    classes: [
      { id: 'rune', name: 'ช่างรูน', bias: { int: 4, vit: 1 }, skill: { type: 'craft', dur: 60, cd: 150, name: 'จารรูนคุ้มครอง' } },
      { id: 'delve', name: 'นักขุด', bias: { str: 3, vit: 2 }, skill: { type: 'harvest', mult: 3, dur: 35, cd: 150, name: 'ขุดลึก' } },
      { id: 'iron', name: 'ทหารเกราะเหล็ก', bias: { vit: 4, str: 1 }, skill: { type: 'guard', dur: 50, cd: 150, name: 'ตั้งแนวรับ' } },
    ],
  },
  {
    id: 'elf', name: 'เอลฟ์', icon: '🏹', tag: 'สัมผัสไว ปัญญาสูง ร่างบอบบาง', runeStyle: 'glyph',
    pal: { hair: '#D8C070', hairL: '#F2E29A', cloth: '#33705A', clothL: '#4E9878', clothD: '#1E4A3A', skin: '#EFD2B4', skinL: '#FCEAD4', skinD: '#BF9A78' },
    stats: { str: 0.80, agi: 1.30, vit: 0.70, sen: 1.50, int: 1.35 }, power: 0.95,
    res: { cold: .20, heat: .20, rain: .65, poison: .50, dust: .15, ash: .05 }, trait: 'woodsense',
    classes: [
      { id: 'ranger', name: 'นักธนู', bias: { agi: 3, sen: 2 }, skill: { type: 'power', mult: 3.2, dur: 40, cd: 150, name: 'ยิงรัว' } },
      { id: 'druid', name: 'ดรูอิด', bias: { sen: 3, int: 2 }, skill: { type: 'water', cd: 150, name: 'เรียกฝน' } },
      { id: 'elem', name: 'นักเวทธาตุ', bias: { int: 4, sen: 1 }, skill: { type: 'elem', mult: 3, dur: 35, cd: 150, name: 'ห่อหุ้มธาตุ' } },
    ],
  },
  {
    id: 'beastman', name: 'มนุษย์สัตว์', icon: '🐾', tag: 'ว่องไว สัญชาตญาณสูง', runeStyle: 'blood',
    pal: { hair: '#2E2018', hairL: '#4A362A', cloth: '#584070', clothL: '#7A5E96', clothD: '#38284A', skin: '#C08A5A', skinL: '#DDAE7E', skinD: '#8E6038' },
    stats: { str: 1.25, agi: 1.45, vit: 1.10, sen: 1.30, int: 0.65 }, power: 1.05,
    res: { cold: .40, heat: .25, rain: .25, poison: .20, dust: .55, ash: .10 }, trait: 'beastkin',
    classes: [
      { id: 'stalk', name: 'นักล่าเงา', bias: { agi: 4, sen: 1 }, skill: { type: 'power', mult: 4.5, dur: 22, cd: 150, name: 'ล่องหน' } },
      { id: 'caller', name: 'ผู้เรียกสัตว์', bias: { sen: 4, vit: 1 }, skill: { type: 'beast', mult: 3, dur: 45, cd: 150, name: 'เรียกฝูง' } },
      { id: 'claw', name: 'นักสู้กรงเล็บ', bias: { str: 2, agi: 3 }, skill: { type: 'power', mult: 4, dur: 25, cd: 150, name: 'กรงเล็บพันครั้ง' } },
    ],
  },
];
const raceById = id => RACES.find(r => r.id === id);

/* ===== src/data/species.js ===== */
/* ============================================================
   species.js — สายพันธุ์มอนสเตอร์ + สกิลเอสเซนส์ที่มันให้
   ------------------------------------------------------------
   วิธีเพิ่มมอนสเตอร์ใหม่:
     1. เพิ่มสกิลใน SKILL_LIB (ถ้าต้องการสกิลใหม่)
     2. เพิ่ม entry ใน SPECIES[ภัยสิ่งแวดล้อม]
        - shape: อ้างชื่อทรงร่างใน art/sprites.js (quad/wraith/serpent/winged/bug/golem)
        - pal:   จานสี 5 สี o=เส้นขอบ 1=ฐาน 2=สว่าง 3=เงา e=ตา
   ไม่ต้องแก้โค้ดวาดเลย
   ============================================================ */

/** apply(o) แก้ไข object โบนัสรวมที่ derive.js สร้างขึ้น */
const SKILL_LIB = {
  frostbite: { name: 'ไอเยือกแข็ง', desc: 'ต้านหนาว +0.16 · ลดผลกระทบความเครียด 8%', apply: o => { o.res.cold += .16; o.strainSoft += .08; } },
  snowveil: { name: 'ม่านหิมะ', desc: 'ต้านหนาว +0.10 · โอกาสของหายาก +10%', apply: o => { o.res.cold += .10; o.luck *= 1.10; } },
  scorch: { name: 'เกล็ดเพลิง', desc: 'ต้านร้อน +0.16 · พลัง +6% ตอนอิ่ม >70%', apply: o => { o.res.heat += .16; o.hotPower += .06; } },
  ember: { name: 'ประกายไฟ', desc: 'ต้านร้อน +0.10 · ทองที่ได้ +10%', apply: o => { o.res.heat += .10; o.gold *= 1.10; } },
  tidewalk: { name: 'ท่วงท่าสายน้ำ', desc: 'ต้านฝน +0.16 · เก็บน้ำได้ +18%', apply: o => { o.res.rain += .16; o.water *= 1.18; } },
  stormcall: { name: 'เรียกพายุ', desc: 'ต้านฝน +0.10 · พลังรวม +8%', apply: o => { o.res.rain += .10; o.power *= 1.08; } },
  venomfang: { name: 'เขี้ยวพิษ', desc: 'ต้านพิษ +0.16 · พลัง +10% ในถิ่นพิษ', apply: o => { o.res.poison += .16; o.poisonPower += .10; } },
  numbtouch: { name: 'สัมผัสชา', desc: 'ต้านพิษ +0.10 · หิว/กระหายช้าลง 12%', apply: o => { o.res.poison += .10; o.vigor *= 1.12; } },
  sandglide: { name: 'ร่อนผ่านทราย', desc: 'ต้านฝุ่น +0.16 · ดาเมจต่อการแตะ +10%', apply: o => { o.res.dust += .16; o.tap *= 1.10; } },
  dunelord: { name: 'เจ้าแห่งเนิน', desc: 'ต้านฝุ่น +0.10 · ทองที่ได้ +12%', apply: o => { o.res.dust += .10; o.gold *= 1.12; } },
  cinderhide: { name: 'ผิวหนังเถ้า', desc: 'ต้านเถ้าลาวา +0.18 · พลังรวม +10%', apply: o => { o.res.ash += .18; o.power *= 1.10; } },
  magmacore: { name: 'แกนลาวา', desc: 'ต้านเถ้าลาวา +0.12 · โอกาสของหายาก +18%', apply: o => { o.res.ash += .12; o.luck *= 1.18; } },
};

const SPECIES = {
  cold: [
    { id: 'frostfang', name: 'หมาป่าเขี้ยวแช่แข็ง', icon: '🐺', shape: 'quad', skill: 'frostbite',
      pal: { o: '#0D2233', 1: '#6FB6DE', 2: '#C8ECFB', 3: '#2E5F86', e: '#FFE9A8' } },
    { id: 'snowwraith', name: 'ภูตหิมะ', icon: '👻', shape: 'wraith', skill: 'snowveil',
      pal: { o: '#16283C', 1: '#A9CBE6', 2: '#EAF6FF', 3: '#4A6B88', e: '#9BF0FF' } },
  ],
  heat: [
    { id: 'sunboar', name: 'หมูป่าแผดเผา', icon: '🐗', shape: 'quad', skill: 'scorch',
      pal: { o: '#3A1408', 1: '#C86436', 2: '#F0A860', 3: '#7A3418', e: '#FFE070' } },
    { id: 'emberimp', name: 'ปีศาจประกาย', icon: '👹', shape: 'wraith', skill: 'ember',
      pal: { o: '#3A0E08', 1: '#E06A2E', 2: '#FFC070', 3: '#8A2A10', e: '#FFF0A0' } },
  ],
  rain: [
    { id: 'bogserpent', name: 'งูหนองน้ำ', icon: '🐍', shape: 'serpent', skill: 'tidewalk',
      pal: { o: '#10281E', 1: '#4E9A6E', 2: '#90D8A0', 3: '#23543C', e: '#E8FF90' } },
    { id: 'stormhawk', name: 'เหยี่ยวพายุ', icon: '🦅', shape: 'winged', skill: 'stormcall',
      pal: { o: '#142A38', 1: '#5E93AE', 2: '#B8DCEC', 3: '#2C4F66', e: '#FFE86A' } },
  ],
  poison: [
    { id: 'venomtoad', name: 'คางคกพิษ', icon: '🐸', shape: 'quad', skill: 'venomfang',
      pal: { o: '#12300E', 1: '#6EAE3E', 2: '#B6E86A', 3: '#33601E', e: '#E0FF80' } },
    { id: 'mireleech', name: 'ปลิงหนองลึก', icon: '🪱', shape: 'serpent', skill: 'numbtouch',
      pal: { o: '#221436', 1: '#7A4E9E', 2: '#BE92DC', 3: '#442A62', e: '#A8FF70' } },
  ],
  dust: [
    { id: 'sandscor', name: 'แมงป่องทราย', icon: '🦂', shape: 'bug', skill: 'sandglide',
      pal: { o: '#34240E', 1: '#B08A44', 2: '#E6C880', 3: '#6A5220', e: '#FF9C4A' } },
    { id: 'dunecrawler', name: 'ตัวคลานเนินทราย', icon: '🐛', shape: 'bug', skill: 'dunelord',
      pal: { o: '#2A2210', 1: '#8E7A3E', 2: '#CFB674', 3: '#544426', e: '#FFD26A' } },
  ],
  ash: [
    { id: 'ashdrake', name: 'ไวเวิร์นเถ้าถ่าน', icon: '🐲', shape: 'winged', skill: 'cinderhide',
      pal: { o: '#200A08', 1: '#7E2A20', 2: '#D4573A', 3: '#46120E', e: '#FF9A3A' } },
    { id: 'magmagolem', name: 'โกเลมลาวา', icon: '🗿', shape: 'golem', skill: 'magmacore',
      pal: { o: '#1A0C08', 1: '#4E3830', 2: '#7E5A48', 3: '#2C1A14', e: '#FF6A20' } },
  ],
};

/** สายพันธุ์ตำนาน — โผล่น้อยมาก ให้รูนพิเศษกับสายเลือดผสม */
const LEGEND_SPECIES = [
  { id: 'ancientdragon', name: 'มังกรโบราณ', icon: '🐉', shape: 'winged', skill: 'cinderhide', rune: 'dragon', envPool: ['ash', 'heat'],
    pal: { o: '#2A0808', 1: '#A8302A', 2: '#F0703A', 3: '#5E1410', e: '#FFE060' } },
  { id: 'primalspirit', name: 'ภูติปฐมกาล', icon: '👻', shape: 'wraith', skill: 'snowveil', rune: 'spirit', envPool: ['cold', 'rain'],
    pal: { o: '#0E2830', 1: '#58B0A8', 2: '#B0F0E4', 3: '#265E5E', e: '#E8FFF0' } },
];

/** สุ่มสายพันธุ์จากภัยสิ่งแวดล้อมที่กำหนด */
const pickSpecies = env => pick(SPECIES[env] || SPECIES.cold);

/** ข้อมูลเอสเซนส์ที่ได้จากการสังหาร (เก็บลงเซฟ จึงเก็บแค่ค่าที่จำเป็น) */
const essenceFrom = sp => ({ species: sp.id, name: sp.name, icon: sp.icon, skill: sp.skill });

/* ===== src/data/items.js ===== */
/* ============================================================
   items.js — ไอเท็ม / ความหายาก / คุณสมบัติสุ่ม / วัตถุดิบ / กระเป๋า / สัตว์เลี้ยง
   ระบบไอเท็มเป็นแบบ  ฐาน × ความหายาก × คุณสมบัติสุ่ม
   ============================================================ */



const RARITY = [
  { id: 0, name: 'สามัญ', color: '#9BA6B2', mult: 1.00, affixes: 0, weight: 55 },
  { id: 1, name: 'ดี', color: '#6E9B5E', mult: 1.22, affixes: 1, weight: 27 },
  { id: 2, name: 'หายาก', color: '#5FA8D3', mult: 1.55, affixes: 2, weight: 12 },
  { id: 3, name: 'มหากาพย์', color: '#A97BD6', mult: 2.10, affixes: 3, weight: 5 },
  { id: 4, name: 'ตำนาน', color: '#E4622A', mult: 3.10, affixes: 4, weight: 1 },
];

/** ไอเท็มฐาน — wear:0 = ไม่เสื่อมสภาพ */
const BASES = [
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
const baseById = id => BASES.find(b => b.id === id);
const SLOT_NAME = { weapon: 'อาวุธ', armor: 'เกราะ', charm: 'เครื่องราง' };
const SLOT_ICON = { weapon: '⚔️', armor: '🛡️', charm: '🔮' };

/** คุณสมบัติสุ่มที่ติดมากับไอเท็ม */
const AFFIXES = [
  { id: 'pw', fmt: v => `พลัง +${v}%` },
  { id: 'vg', fmt: v => `หิว/กระหายช้าลง ${v}%` },
  { id: 'dr', fmt: v => `เสื่อมสภาพช้าลง ${v}%` },
  { id: 'lk', fmt: v => `โอกาสของหายาก +${v}%` },
  { id: 'gd', fmt: v => `ทองที่ได้ +${v}%` },
  { id: 'wt', fmt: v => `เก็บน้ำได้ +${v}%` },
  ...ENV.map(e => ({ id: 'r_' + e.id, env: e.id, fmt: v => `ต้าน${e.name} +${(v / 100).toFixed(2)}` })),
];
const affixById = id => AFFIXES.find(a => a.id === id);
const affixRoll = (id, ilvl) =>
  id === 'pw' ? 4 + Math.floor(Math.random() * (6 + ilvl))
    : (id === 'dr' || id === 'wt') ? 10 + Math.floor(Math.random() * 30)
      : 6 + Math.floor(Math.random() * 24);

let UID = 1;
const setUidFloor = n => { UID = Math.max(UID, n); };
const nextUid = () => UID++;

/** สุ่มไอเท็มหนึ่งชิ้น — luck ยิ่งสูงยิ่งมีโอกาสได้ระดับสูง */
function rollItem(ilvl, luck = 1) {
  const pool = BASES.filter(b => b.lv <= Math.max(1, ilvl));
  const base = pool[Math.floor(Math.random() * pool.length)] || BASES[0];
  const total = RARITY.reduce((a, r) => a + r.weight * (r.id > 0 ? luck : 1), 0);
  let x = Math.random() * total, rar = RARITY[0];
  for (const r of RARITY) { x -= r.weight * (r.id > 0 ? luck : 1); if (x <= 0) { rar = r; break; } }
  const picked = [...AFFIXES].sort(() => Math.random() - .5).slice(0, rar.affixes);
  return { uid: UID++, base: base.id, rar: rar.id, ilvl: Math.max(1, ilvl), dur: 100,
    affixes: picked.map(a => ({ id: a.id, v: affixRoll(a.id, ilvl) })) };
}
const itemValue = it =>
  Math.floor(baseById(it.base).price * RARITY[it.rar].mult * (1 + it.ilvl * .06) * (1 + it.affixes.length * .25));

/** วัตถุดิบขายได้ — meat มี keep:true เพราะเป็นอาหาร ขายหมดแล้วอดตาย */
const MATS = [
  { id: 'meat', name: 'เนื้อ', icon: '🥩', base: 1.1, keep: true },
  { id: 'hide', name: 'หนังและกระดูก', icon: '🦴', base: 7 },
  { id: 'core', name: 'แกนมหาสัตว์', icon: '🔮', base: 90 },
];
/** ราคาขึ้นลงตามเวลา และต่างกันในแต่ละถิ่น (คลื่นไซน์สองชั้น) */
function priceMul(matId, groundId, now) {
  const h = hash(matId + groundId);
  return 1 + .32 * Math.sin(now / 260000 + h) + .14 * Math.sin(now / 71000 + h * 1.7);
}

const BAGS = [
  { lv: 1, name: 'ถุงหนังเล็ก', mult: 1.0, cost: 0 },
  { lv: 2, name: 'เป้หนังสัตว์', mult: 1.7, cost: 900 },
  { lv: 3, name: 'เป้กระดูกเสริม', mult: 2.8, cost: 9000 },
  { lv: 4, name: 'เป้ลูกหาบ', mult: 4.6, cost: 85000 },
  { lv: 5, name: 'ถุงมิติ', mult: 8.0, cost: 900000 },
];

const PETS = [
  { id: 'wolf', name: 'หมาป่าเงิน', icon: '🐺', ground: 'pine', bonus: 'power', res: { cold: .15 }, desc: 'พลัง +10% ต่อเลเวล',
    shape: 'quad', pal: { o: '#0D2233', 1: '#A9CBE6', 2: '#EAF6FF', 3: '#4A6B88', e: '#FFE9A8' } },
  { id: 'yak', name: 'วัวขนหิมะ', icon: '🐂', ground: 'frost', bonus: 'hide', res: { cold: .25 }, desc: 'หนัง +14% ต่อเลเวล',
    shape: 'behemoth', pal: { o: '#1A1218', 1: '#EDE7DA', 2: '#FFFFFF', 3: '#9BA6B2', e: '#4A5A68' } },
  { id: 'lizard', name: 'กิ้งก่าหินไฟ', icon: '🦎', ground: 'waste', bonus: 'vigor', res: { heat: .25, dust: .15 }, desc: 'หิว/กระหายช้าลง 8% ต่อเลเวล',
    shape: 'bug', pal: { o: '#3A1408', 1: '#F2762F', 2: '#FFC070', 3: '#B84C18', e: '#FFE070' } },
  { id: 'raven', name: 'อีกาเถ้า', icon: '🐦‍⬛', ground: 'ashf', bonus: 'luck', res: { ash: .25, poison: .15 }, desc: 'โอกาสของหายาก +25% ต่อเลเวล',
    shape: 'winged', pal: { o: '#0A1119', 1: '#22364A', 2: '#4A5A68', 3: '#101B26', e: '#F0C24A' } },
];
const petById = id => PETS.find(p => p.id === id);

/* ============================================================
   ระบบตีบวก (Enhance) — ไอเท็มเต็มชิ้นดรอปยาก แต่ตีบวกได้ไม่จำกัด
   ด้วย "ชิ้นส่วนปริศนา (fragments)" ที่ดรอปบ่อยกว่ามาก
   ทุก +1 เพิ่มโบนัสของฐาน (power/resAll/vigor) อีก 20% (ดู core/derive.js)
   ============================================================ */
function getEnhanceCost(item) {
  const rarMult = RARITY[item.rar].mult;
  const upg = item.upgrade || 0;
  return {
    gold: Math.floor(baseById(item.base).price * rarMult * (upg + 1) * ENHANCE.goldCostMult),
    fragments: upg + 1,
  };
}

/* ===== src/data/artifacts.js ===== */
/* ============================================================
   artifacts.js — วัตถุโบราณ (Artifacts)
   ------------------------------------------------------------
   ในบริบทของมังฮวา: เศษเสี้ยวความทรงจำที่ตัวเอกนำกลับมาใช้
   ปลุกพลังวัตถุโบราณแบบถาวร — ติดตัวข้ามชาติเมื่อเกิดใหม่
   (ต่างจากรูน ซึ่งต้องปลดล็อกใหม่ทุกครั้งที่เกิดใหม่)
   ------------------------------------------------------------
   getV(lv) คือค่าโบนัส ณ เลเวลนั้น (0.25 = 25%) — ใช้แสดงผลใน UI
   ตัวคูณจริงที่ใช้คำนวณอยู่ใน core/derive.js (อ่าน s.artifacts ตรงๆ)
   ============================================================ */

const ARTIFACTS = [
  { id: 'a_tap', name: 'ถุงมือราชันย์คนเถื่อน', desc: 'ดาเมจจากการแตะ +25% ต่อเลเวล', baseCost: 1, costMult: 1.5, getV: lv => lv * 0.25 },
  { id: 'a_dps', name: 'ศิลาวิญญาณสงคราม', desc: 'ดาเมจอัตโนมัติ +20% ต่อเลเวล', baseCost: 1, costMult: 1.6, getV: lv => lv * 0.20 },
  { id: 'a_gold', name: 'เหรียญตราแห่งความโลภ', desc: 'ทองที่ได้ +15% ต่อเลเวล', baseCost: 1, costMult: 1.4, getV: lv => lv * 0.15 },
  { id: 'a_boss', name: 'นาฬิกาทรายโลหิต', desc: 'เพิ่มเวลาปราบบอส +2 วินาที ต่อเลเวล', baseCost: 2, costMult: 2.0, getV: lv => lv * 2 },
];

/** ราคาความทรงจำ (shards) สำหรับอัปเกรดไปเลเวลถัดไป */
const artifactCost = (art, currentLv) => Math.floor(art.baseCost * Math.pow(art.costMult, currentLv));

/* ===== src/data/progression.js ===== */
/* ============================================================
   progression.js — เควสต์ (= ระบบแนะนำ + ตัวปลดล็อก UI) และฉายา
   ------------------------------------------------------------
   unlock: ชื่อคีย์ที่จะถูกเซ็ตใน state.unlocked
     status | market | items | skill | world | essence | pet | runes | rebirth
   หน้าจอจะซ่อนปุ่ม/แท็บไว้จนกว่าคีย์นั้นจะเป็น true
   ============================================================ */

const QUESTS = [
  { id: 'q1', text: 'ออกล่าด้วยมือ 5 ครั้ง', hint: 'แตะที่ฉากต่อสู้ตรงกลางจอ',
    check: s => s.hunts >= 5, reward: { pts: 3 }, unlock: 'status', rewardText: 'เปิดหน้าต่างสถานะ' },
  { id: 'q2', text: 'ยืนยันการลงแต้มพลัง', hint: 'ปุ่มสถานะด้านล่าง → กด + แล้วกดยืนยัน',
    check: s => s.spent >= 3, reward: { gold: 120 }, unlock: 'market', rewardText: 'พบพ่อค้าเร่ + 120 ทอง' },
  { id: 'q3', text: 'ขายของให้พ่อค้า 1 ครั้ง', hint: 'ปุ่มตลาด → ขายหนังและกระดูก',
    check: s => s.sold >= 1, reward: { gold: 250 }, unlock: 'items', rewardText: 'เปิดกระเป๋า' },
  { id: 'q4', text: 'สังหารมอนสเตอร์ตัวแรก', hint: 'รอมันโผล่แล้วแตะรัวๆ ให้เลือดหมดก่อนมันหนี',
    check: s => s.beasts >= 1, reward: { pts: 4 }, unlock: 'essence', rewardText: 'ปลดล็อกเอสเซนส์' },
  { id: 'q5', text: 'สวมอาวุธชิ้นแรก', hint: 'ซื้อจากตลาดแล้วไปสวมในกระเป๋า',
    check: s => !!s.eq.weapon, reward: { pts: 3 }, unlock: 'skill', rewardText: 'ปลดล็อกทักษะประจำคลาส' },
  { id: 'q6', text: 'ใช้ทักษะประจำตัว 1 ครั้ง', hint: 'ปุ่มสีส้มใต้ฉากต่อสู้',
    check: s => s.skillUses >= 1, reward: { gold: 800 }, unlock: 'world', rewardText: 'เปิดแผนที่' },
  { id: 'q7', text: 'อัปเกรดกระเป๋า', hint: 'ตลาด → หมวดกระเป๋า',
    check: s => s.bag >= 2, reward: { gold: 1500 }, rewardText: 'เก็บของได้มากขึ้น' },
  { id: 'q8', text: 'ย้ายไปล่าที่ถิ่นใหม่', hint: 'แผนที่ → เลือกถิ่นที่ปลดล็อกแล้ว',
    check: s => s.migrations >= 1, reward: { pts: 5 }, rewardText: '5 แต้มพลัง' },
  { id: 'q9', text: 'ดูดซับเอสเซนส์ชิ้นแรก', hint: 'กระเป๋า → แท็บเอสเซนส์',
    check: s => s.essences.length >= 1, reward: { pts: 4 }, unlock: 'runes', rewardText: 'ปลดล็อกรูน' },
  { id: 'q10', text: 'ตื่นรูนแรกของเจ้า', hint: 'สถานะ → แท็บรูน',
    check: s => s.runes.length >= 1, reward: { gold: 20000 }, rewardText: 'พลังถาวรเพิ่มขึ้น' },
  { id: 'q11', text: 'ไปให้ถึงเลเวล 12', hint: 'ถิ่นโหดให้ค่าประสบการณ์เยอะกว่ามาก',
    check: s => s.lv >= 12, reward: { gold: 20000 }, unlock: 'pet', rewardText: 'ปลดล็อกสัตว์เลี้ยง' },
  { id: 'q12', text: 'ลองเปลี่ยนเส้นทางล่าดู', hint: 'แผนที่ → แท็บเส้นทาง',
    check: s => s.pathChanges >= 1, reward: { pts: 5 }, rewardText: '5 แต้มพลัง' },
  { id: 'q13', text: 'รอดผ่านฤดูหนาว 1 ครั้ง', hint: 'ฤดูหนาวเพิ่มภัยความหนาว +0.45',
    check: s => s.winters >= 1, reward: { gold: 80000 }, rewardText: 'ทองก้อนโต' },
  { id: 'q14', text: 'ไปให้ถึงเลเวล 28', hint: 'ระวังน้ำในถิ่นแห้งแล้ง',
    check: s => s.lv >= 28, reward: { pts: 10 }, unlock: 'rebirth', rewardText: 'ปลดล็อกการเกิดใหม่' },
];

const TITLES = [
  { id: 't1', name: 'ผู้มาเยือน', req: 'เริ่มเกม', mult: 1.00, cond: () => true },
  { id: 't2', name: 'นักล่ามือเปล่า', req: 'ล่าด้วยมือ 100 ครั้ง', mult: 1.10, cond: s => s.hunts >= 100 },
  { id: 't3', name: 'พ่อค้าเลือดเย็น', req: 'ขายของ 30 ครั้ง', mult: 1.12, cond: s => s.sold >= 30 },
  { id: 't4', name: 'ผู้ท้าทายความหนาว', req: 'ผ่านฤดูหนาว 1 ครั้ง', mult: 1.15, cond: s => s.winters >= 1 },
  { id: 't5', name: 'ผู้เร่ร่อน', req: 'ย้ายถิ่น 3 ครั้ง', mult: 1.20, cond: s => s.migrations >= 3 },
  { id: 't6', name: 'นักล่ามหาสัตว์', req: 'สังหาร 25 ตัว', mult: 1.30, cond: s => s.beasts >= 25 },
  { id: 't7', name: 'ผู้ครองตำนาน', req: 'ได้ไอเท็มระดับตำนาน', mult: 1.40, cond: s => s.bestRar >= 4 },
  { id: 't8', name: 'ผู้ตื่นรูน', req: 'ตื่นรูน 4 ดวง', mult: 1.35, cond: s => s.runes.length >= 4 },
  { id: 't9', name: 'ผู้ก้าวข้ามขีดจำกัด', req: 'เลเวล 30', mult: 1.45, cond: s => s.lv >= 30 },
  { id: 't10', name: 'ผู้ฝ่าวงจร', req: 'เกิดใหม่ 1 ครั้ง', mult: 1.50, cond: s => s.rebirths >= 1 },
];
const titleMult = s => TITLES.filter(t => s.titles.includes(t.id)).reduce((a, t) => a * t.mult, 1);

/* ===== src/art/sprites.js ===== */
/* ============================================================
   sprites.js — งานพิกเซลทั้งหมด เก็บเป็นอาร์เรย์ของสตริง
   ------------------------------------------------------------
   วิธีเพิ่มสไปรต์ใหม่:
     1. เขียนแถวเป็นสตริง ตัวอักษร 1 ตัว = 1 พิกเซล  '.' = โปร่งใส
     2. ห่อด้วย spr([...])  ฟังก์ชันจะเติมความยาวแถวให้เท่ากันเอง
        (นับช่องพลาดก็ไม่พัง)
     3. ตัวอักษรที่ใช้ต้องมีในจานสี ไม่งั้นพิกเซลนั้นจะถูกข้าม

   จานสีมอนสเตอร์มาตรฐาน:
     o = เส้นขอบ   1 = สีฐาน   2 = สีสว่าง   3 = สีเงา   e = ตา   t = เขี้ยว/เขา
   ============================================================ */

/** ทำให้ทุกแถวยาวเท่ากัน — กันบั๊กจากการนับช่องผิด */
function spr(rows) {
  const w = Math.max(...rows.map(r => r.length));
  return rows.map(r => r.padEnd(w, '.'));
}

/* ---------- คลังตัวละครผู้เล่น 5 เผ่าพันธุ์ ---------- */
const HERO_SHAPES = {
  /* มนุษย์ — สมดุล มาตรฐาน */
  human: spr([
    '.......oooooo.......',
    '......ohhhhhho......',
    '.....ohHHHHHHho.....',
    '.....ohSSSSSSho.....',
    '.....ohSeSSeSho.....',
    '.....odSSSSSSdo.....',
    '......odSSSSdo......',
    '.......odssdo.......',
    '....ooooCCCCoooo....',
    '...oCCCCccccCCCCo...',
    '...oCccccccccccCo...',
    '...oCccccvvccccCo...',
    '...oCccccvvccccCo...',
    '....obbbbbbbbbbo....',
    '....occccccccco.....',
    '.....occcccccco.....',
    '.....occo..occo.....',
    '.....occo..occo.....',
    '.....oddo..oddo.....',
    '....ommmmo.ommmo....',
    '....oooooo.ooooo....',
  ]),
  /* บาบาเรียน — ร่างใหญ่ กล้ามโต ไหล่กว้าง */
  barbarian: spr([
    '.........oooooo.........',
    '........ohhhhhho........',
    '.......ohHHHHHHho.......',
    '.......ohSSSSSSho.......',
    '.......ohSeSSeSho.......',
    '.......odSSSSSSdo.......',
    '........odSSSSdo........',
    '.......oodssddsoo.......',
    '.....ooSSodssdoSSoo.....',
    '....oSSSSoSSSSoSSSSc....',
    '...oSSSSSoSSSSoSSSSSco..',
    '...oSSSSSoSSSSoSSSSSco..',
    '...oSSoooSSSSSSoooSSco..',
    '...oo...oSSSSSSo...ooo..',
    '........occccccdo.......',
    '........occccccdo.......',
    '........occccccdo.......',
    '.......oocco.occoo......',
    '.......oocco.occoo......',
    '.......odddo.odddo......',
    '......ommmmo.ommmmo.....',
    '......oooooo.oooooo.....',
  ]),
  /* คนแคระ — ตัวเตี้ยล่ำ เคราเฟิ้ม */
  dwarf: spr([
    '.......oooooo.......',
    '......ohhhhhho......',
    '.....ohHHHHHHho.....',
    '.....ohSSSSSSho.....',
    '.....ohSeSSeSho.....',
    '.....odhhhhhhdo.....',
    '......odhhhhdo......',
    '....ooooCCCCoooo....',
    '...oCCCCccccCCCCo...',
    '...oCccccccccccCo...',
    '...oCccccvvccccCo...',
    '....obbbbbbbbbbo....',
    '....occccccccco.....',
    '.....occo..occo.....',
    '.....oddo..oddo.....',
    '....ommmmo.ommmo....',
    '....oooooo.ooooo....',
  ]),
  /* เอลฟ์ — ผอมเพรียว หูแหลม */
  elf: spr([
    '........oooooo........',
    '.......ohhhhhho.......',
    '......ohHHHHHHho......',
    '....ooohSSSSSShooo....',
    '...ossohSeSSeShosso...',
    '....oo.odSSSSSSdo.oo....',
    '.......odSSSSdo.......',
    '........odssdo........',
    '........oCCCCo........',
    '.......oCCccCCo.......',
    '......oCCccccCCo......',
    '......oCcccvvcCo......',
    '......oCcccvvcCo......',
    '......oCcccvvcCo......',
    '.......obbbbbbo.......',
    '.......occcccco.......',
    '.......occo.occo......',
    '.......occo.occo......',
    '.......occo.occo......',
    '.......oddo.oddo......',
    '......ommmo.ommmo.....',
    '......ooooo.ooooo.....',
  ]),
  /* มนุษย์สัตว์ — ท่าค้อมตัว หูสัตว์ */
  beastman: spr([
    '......ohho..ohho......',
    '.....ohhho..ohhho.....',
    '.....ohHHHHHHHHho.....',
    '....ohHSSSSSSSSho.....',
    '....ohSSeSSeSSSho.....',
    '....odHSSSSSSSSdo.....',
    '.....odHSSSSHHdo......',
    '......oodssddoo.......',
    '....ooooCCCCoooo......',
    '...oCCCCccccCCCCo.....',
    '..oHHCcccccccccCo.....',
    '..oHHHCccccvvcccco....',
    '..oHHobbbbbbbbbbo.....',
    '...oo.occccccccco.....',
    '.......occcccccco.....',
    '.......occo..occo.....',
    '.......occo..occo.....',
    '.......oddo..oddo.....',
    '......ommmmo.ommmo....',
    '......oooooo.ooooo....',
  ]),
};
/** เลือกโครงร่างตามเผ่าพันธุ์แรกของสายเลือด — สายเลือดผสมยึดโครงเผ่าฝั่งแรก แต่จานสีผสมมาแล้วจาก makeBlood() */
function heroShapeFor(blood) {
  const raceId = blood.parents && blood.parents[0];
  return HERO_SHAPES[raceId] || HERO_SHAPES.human;
}

/** จานสีตัวละคร สร้างจากจานสีเผ่าพันธุ์ */
const heroPalette = blood => ({
  o: '#150E12', h: blood.pal.hair, H: blood.pal.hairL,
  S: blood.pal.skinL, s: blood.pal.skin, d: blood.pal.skinD, e: '#1A1218',
  C: blood.pal.clothL, c: blood.pal.cloth, v: blood.pal.clothD,
  b: '#4A3320', m: '#6B4A2E',
});

/* ---------- อาวุธ (วาดแยกเพื่อให้หมุนตอนฟันได้) ---------- */
const SWORD = spr(['..M..', '..M..', '.mMm.', '.mMm.', '.mMm.', '.mMm.', '.mMm.', '.mMm.', '.mMm.', 'omMmo', '..b..', '..b..', '..b..', '..o..']);
const SWORD_PAL = { M: '#E8EEF4', m: '#A8BAC8', o: '#4A5A68', b: '#6B4A2E' };


/* ---------- ทรงร่างมอนสเตอร์ 6 แบบ ---------- */
const SHAPES = {
  /* สี่ขา — หมาป่า / หมูป่า / คางคก */
  quad: spr([
    '........................',
    '....................oo..',
    '...................o22o.',
    '..o...............o221o.',
    '.o3o.....oooooo..o2211o.',
    '.o33o..oo222222oo21111o.',
    '..o33oo2211111111111e1o.',
    '...o331111111111111111o.',
    '...o3311111111111111tto.',
    '....o3111111111111111oo.',
    '....o33111111111111o....',
    '.....o3o3o....o3o3o.....',
    '.....o3o3o....o3o3o.....',
    '.....o3o3o....o3o3o.....',
    '.....ooooo....ooooo.....',
  ]),
  /* ภูตลอย — ผี / ปีศาจ */
  wraith: spr([
    '.......oooooo.......',
    '.....oo222222oo.....',
    '....o2211111122o....',
    '...o221e1111e122o...',
    '...o211111111112o...',
    '...o2111111111120...',
    '....o21111111120....',
    '.....o211111120.....',
    '....o33111111330....',
    '...o3311111111330...',
    '..o331111111111330..',
    '..o33111111111133o..',
    '...o33111111113o....',
    '....o3311111330.....',
    '.....o33113330......',
    '......o33330........',
    '.......oo0o.........',
  ]),
  /* งู / ปลิง */
  serpent: spr([
    '.................ooooo..',
    '..............ooo2222oo.',
    '.............o22111111o.',
    '...oooo.....o21e11111e1o',
    '..o2222o...o2111111111o.',
    '.o211111oo211111tt1111o.',
    'o21111111111111111111o..',
    'o311111111111111111oo...',
    '.o3111111111111133o.....',
    '..o33111111111133o......',
    '...oo3311111133o........',
    '.....oo33333oo..........',
    '.......oooo.............',
  ]),
  /* มีปีก — เหยี่ยว / ไวเวิร์น / มังกร */
  winged: spr([
    'oo................oo....',
    'o22oo..........oo22o....',
    'o2222oo......oo2222o....',
    'o222222o.oo.o222222o....',
    'o2222222o11o2222222o....',
    '.o3333333o11o333333o....',
    '..o33333o1111o3333o.....',
    '...ooooo111111ooooo.....',
    '.......o1e11e1o.........',
    '.......o111111o.........',
    '.......o11tt11o.........',
    '........o1111o..........',
    '........o3113o..........',
    '.........o33o...........',
    '.........o..o...........',
    '........oo..oo..........',
  ]),
  /* ตัวคลานหลายขา — แมงป่อง / หนอน */
  bug: spr([
    '........................',
    '.......oooooooo.........',
    '.....oo22222222oo.......',
    '....o2211111111122oo....',
    '...o2211111111111112oo..',
    '..o211111111111111111e2o',
    '..o11111111111111111111o',
    '..o31111111111111111tt1o',
    '...o311111111111111tto..',
    '....o33111111111111o....',
    '...o3o.o3o..o3o.o3o.....',
    '..o3o..o3o..o3o..o3o....',
    '..o....o.....o....o.....',
  ]),
  /* หุ่นหิน */
  golem: spr([
    '....oooooooo........',
    '...o22222222o.......',
    '..o2211111122o......',
    '..o21e1111e12o......',
    '..o2111111112o......',
    '..o2111tt1112o......',
    '...o21111112o.......',
    '.ooo33111133ooo.....',
    'o22233111133222o....',
    'o22233111113322o....',
    'o22233111113322o....',
    '.ooo33111133ooo.....',
    '....o331133o........',
    '....o31133o.........',
    '...o33o.o33o........',
    '...o3o...o3o........',
    '..o33o...o33o.......',
    '..oooo...oooo.......',
  ]),
  /* สัตว์ขนาดใหญ่ล่ำ — ใช้กับสัตว์เลี้ยงตัวเบ้อเริ่ม เช่น วัวขนหิมะ */
  behemoth: spr([
    '..........oooo..........',
    '.........o2222o.........',
    '........o222222o........',
    '....oo..o221e122o..oo...',
    '...o22oo22111112oo22o...',
    '..o2222222111112222222o.',
    '.o333222211111122233333o',
    '.o33333221111112233333o.',
    '.o3333333111111333333o..',
    '..o33333311111133333o...',
    '...o333333333333333o....',
    '....oo3333333333oo......',
    '.....o3o33o33o3o........',
    '.....o3o33o33o3o........',
    '.....o3o33o33o3o........',
    '.....ooo.oo.ooo.........',
  ]),
};

/** วาดสไปรต์ลง canvas — flip=true คือกลับซ้ายขวา */
function drawSprite(ctx, sprite, palette, x, y, scale, flip) {
  for (let r = 0; r < sprite.length; r++) {
    const row = sprite[r];
    for (let c = 0; c < row.length; c++) {
      const ch = row[c];
      if (ch === '.') continue;
      const col = palette[ch];
      if (!col) continue;
      ctx.fillStyle = col;
      const px = flip ? x + (row.length - 1 - c) * scale : x + c * scale;
      ctx.fillRect(Math.round(px), Math.round(y + r * scale), Math.ceil(scale), Math.ceil(scale));
    }
  }
}

/* ===== src/art/assets.js ===== */
/* ============================================================
   assets.js — ระบบโหลดสไปรต์ชีต .png (ถ้ามี) แบบไม่บังคับ
   ------------------------------------------------------------
   ทำงานเฉพาะตอนรันเป็นเว็บจริง (npm run dev / build) เพราะต้องอ่านไฟล์
   จากโฟลเดอร์ public/ — ในหน้าต่างพรีวิวแบบ artifact ของ Claude
   ไฟล์เหล่านี้จะโหลดไม่สำเร็จเสมอ (404) ซึ่งไม่เป็นไร: ทุกจุดที่ใช้
   ภาพเหล่านี้เช็ค `img.complete && img.naturalWidth > 0` ก่อนวาดเสมอ
   ถ้าไม่ผ่านเงื่อนไข ระบบจะวาดพิกเซลอาร์ตแบบเดิม (sprites.js) แทนทันที
   จึงวางโค้ดนี้ไว้ได้อย่างปลอดภัยแม้ยังไม่มีไฟล์ภาพจริงสักไฟล์เดียว

   ------------------------------------------------------------
   ตำแหน่งไฟล์ที่ระบบจะพยายามโหลด (ดู public/assets/sprites/README.md
   สำหรับสเปกขนาดพิกเซลและ layout ของแต่ละแถวแบบละเอียด):

     hero_<raceId>.png       เช่น hero_barbarian.png (ลูกผสมใช้ไฟล์ของ parents[0])
     mob_<speciesId>.png     มอนสเตอร์ตัวปกติ เช่น mob_frostfang.png
     boss_<speciesId>.png    มอนสเตอร์ตัวเดียวกัน แต่ตอนเป็นบอส (ไฟล์แยก ไม่บังคับ)
     pet_<petId>.png         สัตว์เลี้ยง เช่น pet_wolf.png

   ทุกไฟล์เป็น sprite sheet แนวนอน 1 แถว = 1 ท่าทาง:
     hero: แถว 0 = idle (4 เฟรม) · แถว 1 = attack (4 เฟรม) · แถว 2 = hurt (2-4 เฟรม)
     mob/boss/pet: แถว 0 = idle (4 เฟรม) · แถว 1 = hit (2 เฟรม) · แถว 2 = die (4 เฟรม)
   ขนาดเฟรมคำนวณจากขนาดไฟล์จริงหารด้วยจำนวนคอลัมน์/แถว จึงไม่บังคับพิกเซลตายตัว
   (คำแนะนำ: hero/mob 48×48 ต่อเฟรม, boss 96×96 หรือ 128×128 ต่อเฟรม)
   ============================================================ */

const ASSET_BASE = '/assets/sprites/';

const HERO_ANIM = { cols: 4, rows: { idle: 0, attack: 1, hurt: 2 }, frameMs: 140 };
const MOB_ANIM = { cols: 4, rows: { idle: 0, hit: 1, die: 2 }, frameMs: 160 };

const cache = {};

/** โหลด (หรือคืนจาก cache) รูปภาพตาม key — ไม่ throw แม้ไฟล์ไม่มีอยู่จริง */
function loadSprite(key, file) {
  if (cache[key]) return cache[key];
  const img = new Image();
  img.src = ASSET_BASE + file;               // ถ้า 404 จะแค่ไม่ complete/naturalWidth=0
  cache[key] = img;
  return img;
}

/** ใช้เช็คก่อนวาดเสมอ: ภาพนี้พร้อมใช้จริงหรือยัง */
const spriteReady = img => !!img && img.complete && img.naturalWidth > 0;

const heroAssetFor = blood => {
  const raceId = (blood.parents && blood.parents[0]) || 'human';
  return loadSprite('hero_' + raceId, `hero_${raceId}.png`);
};

const monsterAssetFor = (species, isBoss) => {
  const prefix = isBoss ? 'boss' : 'mob';
  return loadSprite(`${prefix}_${species.id}`, `${prefix}_${species.id}.png`);
};

const petAssetFor = pet => loadSprite('pet_' + pet.id, `pet_${pet.id}.png`);

/* ===== src/core/character.js ===== */
/* ============================================================
   character.js — สร้างสายเลือดและสถานะเริ่มต้นของตัวละคร
   ============================================================ */




/**
 * mode: 'choose' | 'random' | 'mix'
 * โหมด mix = ผสมสองเผ่าโดยผู้เล่นไม่รู้ว่าเป็นเผ่าใด
 *   - ค่าพลังถูกเฉลี่ยด้วยน้ำหนักสุ่ม 35–65%
 *   - ได้ลักษณะสายเลือด "สองอย่าง" แทนหนึ่ง (นี่คือข้อแลกเปลี่ยน)
 *   - ความต้านทานที่สูงสุดได้โบนัส +0.10 (hybrid vigor) กันไม่ให้บิลด์ห่วยสุดขั้ว
 */
function makeBlood(mode, raceId, classId) {
  if (mode === 'mix') {
    const pool = [...RACES];
    const a = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    const b = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    const w = rnd(.35, .65);
    const res = zeroEnv();
    let best = null;
    ENV.forEach(e => {
      res[e.id] = a.res[e.id] * w + b.res[e.id] * (1 - w);
      if (!best || res[e.id] > res[best]) best = e.id;
    });
    res[best] = clamp(res[best] + .10, 0, .95);
    const stats = {};
    STATS.forEach(x => { stats[x.id] = a.stats[x.id] * w + b.stats[x.id] * (1 - w); });
    const cls = [...a.classes, ...b.classes][Math.floor(Math.random() * 6)];
    return {
      mixed: true, raceName: 'ลูกผสมไร้ชื่อ', raceIcon: '🩸', parents: [a.id, b.id], runeStyle: 'blood',
      pal: { ...a.pal, cloth: b.pal.cloth, clothL: b.pal.clothL, clothD: b.pal.clothD },
      stats, power: a.power * w + b.power * (1 - w), res,
      traits: [a.trait, b.trait], cls, className: cls.name,
    };
  }
  const r = mode === 'random' ? RACES[Math.floor(Math.random() * RACES.length)] : raceById(raceId);
  const cls = r.classes.find(c => c.id === classId) || r.classes[0];
  return {
    mixed: false, raceName: r.name, raceIcon: r.icon, parents: [r.id], runeStyle: r.runeStyle,
    pal: { ...r.pal }, stats: { ...r.stats }, power: r.power, res: { ...r.res },
    traits: [r.trait], cls, className: cls.name,
  };
}

/** carry = สิ่งที่ติดตัวข้ามชาติ (ความทรงจำจากการเกิดใหม่) */
function newChar(name, blood, carry = {}) {
  return {
    name, blood,
    // สายเลือดผสมเริ่มต้นโดยไม่รู้ค่าตัวเอง ต้องค้นพบจากการเล่น
    known: blood.mixed
      ? { res: {}, traits: {}, stats: false }
      : { res: Object.fromEntries(ENV.map(e => [e.id, true])), traits: Object.fromEntries(blood.traits.map(t => [t, true])), stats: true },
    expose: zeroEnv(),

    lv: 1, exp: 0, pts: 0, spent: 0,
    base: { str: 5, agi: 5, vit: 5, sen: 5, int: 5 },

    // ระบบด่าน/เวฟ/บอสแบบ Tap Titans — แทนที่ระบบสปอว์นตามเวลาเดิม
    stage: 1, stageKills: 0,
    // เลเวลอาวุธ อัปเกรดไม่จำกัดด้วยทอง (สเกลพลังแบบทวีคูณ)
    weaponLv: 1,
    fragments: 0,   // ชิ้นส่วนปริศนา — ใช้ตีบวกไอเท็มที่สวมใส่/มีในกระเป๋า

    /* --- ความอึด + การสกัดสาร --- */
    stamina: 100,    // ผูกกับการแตะมือเท่านั้น (ดู core/config.js STAMINA สำหรับเหตุผลออกแบบใหม่)
    mycelium: 0,     // วัตถุดิบสกัด ได้จากการสังหารมอนสเตอร์
    peptides: 0,     // ยาที่คราฟต์เสร็จแล้ว พร้อมใช้
    peptideEnd: 0,   // เวลาที่ฤทธิ์ยาหมด (timestamp)

    meat: 20, water: 60, hide: 0, core: 0, gold: 40, totalGold: 0,
    satiety: 100, hydration: 100, bag: 1,

    ground: 'pine', path: 'main', migrations: 0, pathChanges: 0, travelEnd: 0,

    eq: { weapon: null, armor: null, charm: null }, inv: [], autoRepair: true,
    essences: [], pending: [], runes: [], pet: null,

    battle: null, nextEvent: Date.now() + STAGE.respawnMs,
    skillEnd: 0, skillReady: 0, skillUses: 0,

    hunts: 0, beasts: 0, winters: 0, sold: 0, bestRar: 0, wasted: 0,
    titles: ['t1'], quest: 0, unlocked: {},

    shards: carry.shards || 0, rebirths: carry.rebirths || 0,
    artifacts: carry.artifacts || {},   // วัตถุโบราณติดตัวข้ามชาติ { a_tap: 2, a_dps: 1, ... }
    lastSaved: Date.now(),
  };
}

/* ===== src/core/derive.js ===== */
/* ============================================================
   derive.js — คำนวณค่าทุกอย่างจาก state ณ เวลาหนึ่ง
   เป็นฟังก์ชันบริสุทธิ์ (pure) ไม่แก้ไข state
   ------------------------------------------------------------
   ลำดับการคำนวณ:
     1. รวมโบนัสจากอุปกรณ์ + เอสเซนส์ + รูน  -> eqBonus()
     2. ภัยสิ่งแวดล้อม = ถิ่น + ฤดู × ตัวคูณเส้นทาง
     3. ความเครียด = ผลรวมของ (ภัย - ความต้านทาน) ที่เป็นบวก
     4. ความเครียดไปลดพลัง เพิ่มความหิว และเร่งการเสื่อมของอุปกรณ์
   ============================================================ */







/** รวมโบนัสทุกแหล่ง (อุปกรณ์สวมใส่ / เอสเซนส์ / รูน) เป็น object เดียว */
function eqBonus(s) {
  const o = {
    power: 1, resAll: 0, res: zeroEnv(), vigor: 1, wear: 1, luck: 1, gold: 1,
    water: 1, slots: 0, exp: 1, tap: 1, strainSoft: 0, hotPower: 0, poisonPower: 0,
  };

  ['weapon', 'armor', 'charm'].forEach(slot => {
    const it = s.eq[slot];
    if (!it || it.dur <= 0) return;              // ของพังแล้วไม่ให้โบนัส
    const b = baseById(it.base);
    const upg = it.upgrade || 0;   // เลเวลตีบวก — เพิ่มโบนัสของฐาน 20% ต่อครั้ง
    const q = RARITY[it.rar].mult * (1 + it.ilvl * .05) * (1 + upg * ENHANCE.powerPerLevel);
    if (b.power) o.power *= 1 + (b.power - 1) * q;
    if (b.resAll) o.resAll += b.resAll * q;
    if (b.vigor) o.vigor *= 1 + (b.vigor - 1) * q;
    if (b.slots) o.slots += b.slots;
    it.affixes.forEach(a => {
      if (a.id === 'pw') o.power *= 1 + a.v / 100;
      else if (a.id === 'vg') o.vigor *= 1 + a.v / 100;
      else if (a.id === 'dr') o.wear *= 1 - a.v / 100;
      else if (a.id === 'lk') o.luck *= 1 + a.v / 100;
      else if (a.id === 'gd') o.gold *= 1 + a.v / 100;
      else if (a.id === 'wt') o.water *= 1 + a.v / 100;
      else { const A = affixById(a.id); if (A && A.env) o.res[A.env] += a.v / 100; }
    });
  });

  s.essences.forEach(e => { const sk = SKILL_LIB[e.skill]; if (sk) sk.apply(o); });

  s.runes.forEach(rid => {
    if (rid.startsWith('sig_')) {
      const g = SIGNATURE_RUNES[rid.slice(4)];
      if (g) { o.power *= 1 + (g.power || 0); o.resAll += g.resAll || 0; o.exp *= 1 + (g.exp || 0); o.luck *= 1 + (g.luck || 0); }
      return;
    }
    const r = RUNES.find(x => x.id === rid);
    if (!r) return;
    if (r.stat === 'power') o.power *= 1 + r.v;
    else if (r.stat === 'vigor') o.vigor *= 1 + r.v;
    else if (r.stat === 'luck') o.luck *= 1 + r.v;
    else if (r.stat === 'gold') o.gold *= 1 + r.v;
    else if (r.stat === 'wear') o.wear *= 1 - r.v;
    else if (r.stat === 'exp') o.exp *= 1 + r.v;
  });

  return o;
}

function derive(s, now) {
  const sIdx = seasonAt(now), season = SEASONS[sIdx];
  const gr = groundById(s.ground), path = pathById(gr, s.path);
  const B = s.blood;
  const has = t => B.traits.includes(t);
  const sk = B.cls.skill;
  const skillOn = now < s.skillEnd;
  const E = eqBonus(s);

  /* --- ภัยสิ่งแวดล้อม --- */
  const thr = zeroEnv();
  ENV.forEach(e => {
    thr[e.id] = clamp((gr.threat[e.id] || 0) + (season.add[e.id] || 0), 0, 1.6) * path.threatMul;
  });

  /* --- ความต้านทาน --- */
  const res = zeroEnv();
  ENV.forEach(e => { res[e.id] = B.res[e.id] + E.resAll + E.res[e.id]; });
  if (s.pet) {
    const p = petById(s.pet.id);
    Object.entries(p.res || {}).forEach(([k, v]) => {
      res[k] += v * (1 + (s.pet.lv - 1) * .2) * (has('beastkin') ? 1.5 : 1);
    });
  }
  ENV.forEach(e => { res[e.id] = clamp(res[e.id], 0, .97); });

  let strain = 0;
  ENV.forEach(e => { strain += Math.max(0, thr[e.id] - res[e.id]); });
  strain *= (1 - E.strainSoft);
  if (skillOn && (sk.type === 'guard' || sk.type === 'elem')) strain *= .35;

  /* --- ค่าพลังหลังคูณเผ่าพันธุ์ --- */
  const st = {};
  STATS.forEach(x => { st[x.id] = s.base[x.id] * B.stats[x.id]; });

  /* --- อัตราหิว/กระหาย --- */
  let vigor = (1 + st.vit * .03) * E.vigor;
  if (s.pet && petById(s.pet.id).bonus === 'vigor') vigor *= 1 + .08 * s.pet.lv;
  if (skillOn && sk.type === 'sustain') vigor *= 3;
  const hungerRate = BASE.hungerRate * (1 + strain * .8) / vigor;
  const thirstRate = BASE.thirstRate * (1 + strain) / vigor;

  /* --- โทษจากการอดอยาก (มีพื้นขั้นต่ำ 15% ไม่มีการตาย) --- */
  const satM = .15 + .85 * clamp(s.satiety / 25, 0, 1);
  const hydM = .15 + .85 * clamp(s.hydration / 25, 0, 1);
  const strainM = 1 / (1 + strain * 1.15);

  /* --- พลังรวม --- */
  let power = (12 + st.str * 6 + st.agi * 2.6) * B.power * (1 + s.lv * .045) * E.power;
  power *= titleMult(s);
  power *= (1 + .03 * s.shards);
  if (has('boilblood') && s.satiety < 40) power *= 1.6;
  if (E.hotPower && s.satiety > 70) power *= 1 + E.hotPower;
  if (E.poisonPower && thr.poison > .2) power *= 1 + E.poisonPower;
  if (s.pet && petById(s.pet.id).bonus === 'power') {
    power *= 1 + .10 * s.pet.lv * (skillOn && sk.type === 'beast' ? 3 : 1) * (has('beastkin') ? 1.5 : 1);
  }
  if (skillOn && ['power', 'elem', 'blood', 'harvest'].includes(sk.type)) power *= sk.mult;
  power *= strainM * satM * hydM;

  /* --- เลเวลอาวุธ: อัปเกรดไม่จำกัด สเกลพลังแบบทวีคูณ (แทนการฝึกฝนด้วย EXP แบบเดิม) --- */
  power *= Math.pow(STAGE.weaponPowerGrowth, (s.weaponLv || 1) - 1);

  /* --- สารสกัดเปปไทด์: บัฟชั่วคราวแรงๆ จากการคราฟต์ ไม่ใช่ของถาวร --- */
  const peptideOn = now < (s.peptideEnd || 0);
  if (peptideOn) power *= PEPTIDE.powerMult;

  /* --- วัตถุโบราณ: บัฟถาวรข้ามชาติ ซื้อด้วยความทรงจำตอนเกิดใหม่ --- */
  const art = s.artifacts || {};
  const artTapBonus = (art.a_tap || 0) * 0.25;
  const artDpsBonus = (art.a_dps || 0) * 0.20;
  const artGoldBonus = (art.a_gold || 0) * 0.15;

  const traveling = now < s.travelEnd;
  const tM = traveling ? .25 : 1;
  const bag = BAGS[s.bag - 1] || BAGS[0];

  let luck = E.luck * gr.drop * path.dropMul * (1 + st.sen * .012);
  if (has('woodsense')) luck *= 1.8;
  if (s.pet && petById(s.pet.id).bonus === 'luck') luck *= 1 + .25 * s.pet.lv;

  let wear = BASE.wear * (1 + strain * 1.4) / (1 + st.vit * .008) * E.wear;
  if (has('craftsman')) wear *= .5;
  if (skillOn && sk.type === 'craft') wear *= .1;

  let hideRate = power * BASE.hideRate * gr.hide;
  if (skillOn && sk.type === 'harvest') hideRate *= 3;
  if (s.pet && petById(s.pet.id).bonus === 'hide') hideRate *= 1 + .14 * s.pet.lv;

  const autoDps = power * BASE.autoDpsRatio * (1 + artDpsBonus);
  const staminaTapMul = (s.stamina ?? STAMINA.max) < STAMINA.lowThreshold ? STAMINA.lowTapPenalty : 1;
  const tapDmg = (power * (BASE.tapBase + st.agi * .05) * E.tap * (1 + artTapBonus) + autoDps * 0.05) * staminaTapMul;

  return {
    sIdx, season, gr, path, thr, res, strain, st, power, skillOn, sk, peptideOn, traveling, luck, wear, E, bag,

    slots: 3 + s.rebirths + E.slots + (has('nameless') ? 2 : 0),
    sellMul: 1 + st.int * .012 + (has('nameless') ? .15 : 0),
    goldMul: E.gold * path.goldMul * (1 + artGoldBonus),

    capMeat: Math.floor(260 * (1 + s.lv * .3) * bag.mult),
    capWater: Math.floor(110 * (1 + s.lv * .18) * bag.mult * E.water),
    capHide: Math.floor(180 * (1 + s.lv * .28) * bag.mult),

    meatRate: power * BASE.meatRate * gr.meat * season.meat * tM,
    hideRate: hideRate * tM,
    waterRate: (BASE.waterRate + st.sen * .018) * gr.water,
    expRate: power * BASE.expRate * gr.exp * tM * (has('quicklearn') ? 1.3 : 1) * E.exp,

    hungerRate, thirstRate, need: expNeed(s.lv),
    autoDps, tapDmg,
    upgradeCost: Math.floor(STAGE.weaponUpgradeBase * Math.pow(STAGE.weaponUpgradeGrowth, s.weaponLv || 1)),
    repairMul: has('craftsman') ? .6 : 1,
  };
}

/* ===== src/core/simulate.js ===== */
/* ============================================================
   simulate.js — หัวใจของเกม
   ------------------------------------------------------------
   กฎเหล็ก: มี simulate() ตัวเดียว ใช้ทั้งตอนเล่นสด (dt≈0.2 วิ)
   และตอนคำนวณ offline (dt=30 วิ) ห้ามเขียนสูตรสองชุดเด็ดขาด
   ไม่งั้นตัวเลขสองโหมดจะเริ่มไม่ตรงกันภายในไม่กี่วัน

   simulate() คืน state ใหม่เสมอ และอาจแนบ "สัญญาณ" ขึ้นต้นด้วย _
   ให้ชั้น UI เอาไปแสดงผล แล้วลบทิ้ง: _msg _lv _quest _kill _flee
   ============================================================ */








function simulate(s, dt, now, opts = {}) {
  const eff = opts.offline ? OFFLINE_EFF : 1;
  const d = derive(s, now);
  const n = { ...s, eq: { ...s.eq }, expose: { ...s.expose } };

  /* --- เก็บทรัพยากร (มีเพดาน ล้นแล้วหาย) --- */
  const cap = (cur, add, max) => {
    const v = cur + add;
    if (v > max) { n.wasted += v - max; return max; }
    return v;
  };
  n.meat = cap(n.meat, d.meatRate * dt * eff, d.capMeat);
  n.hide = cap(n.hide, d.hideRate * dt * eff, d.capHide);
  n.water = cap(n.water, d.waterRate * dt * eff, d.capWater);
  n.exp += d.expRate * dt * eff;

  /* --- หิว / กระหาย + กินดื่มอัตโนมัติจากคลัง --- */
  n.satiety = clamp(n.satiety - d.hungerRate * dt, 0, 100);
  n.hydration = clamp(n.hydration - d.thirstRate * dt, 0, 100);
  if (d.skillOn && d.sk.type === 'blood') n.satiety = clamp(n.satiety - .8 * dt, 0, 100);
  if (n.satiety < 95 && n.meat > 0) {
    const eat = Math.min(95 - n.satiety, n.meat * 2.4, d.hungerRate * dt * 6 + 3);
    n.satiety += eat; n.meat -= eat * .42;
  }
  if (n.hydration < 95 && n.water > 0) {
    const drink = Math.min(95 - n.hydration, n.water * 2.6, d.thirstRate * dt * 6 + 3);
    n.hydration += drink; n.water -= drink * .38;
  }

  /* --- เลเวลอัป (ขึ้นได้หลายเลเวลใน 1 step ตอนคำนวณ offline) --- */
  let lvGuard = 0;
  while (n.exp >= expNeed(n.lv) && lvGuard++ < 50) {
    n.exp -= expNeed(n.lv);
    n.lv += 1;
    n.pts += 3;
    n._lv = n.lv;
  }
  if (n.exp < 0) n.exp = 0;

  /* --- ความทนทานอุปกรณ์ --- */
  ['weapon', 'armor', 'charm'].forEach(slot => {
    const it = n.eq[slot];
    if (!it) return;
    const b = baseById(it.base);
    if (!b.wear) return;           // wear:0 = ไม่เสื่อม
    let dur = it.dur - d.wear * b.wear * dt;
    if (dur <= 0 && n.autoRepair) {
      const cost = Math.floor(itemValue(it) * BASE.repairCostRatio * d.repairMul);
      if (n.gold >= cost) { n.gold -= cost; dur = 100; } else dur = 0;
    }
    n.eq[slot] = { ...it, dur: clamp(dur, 0, 100) };
  });

  /* --- สัตว์เลี้ยงหิว --- */
  if (n.pet) {
    let ph = n.pet.hunger - .22 * dt;
    if (ph < 60 && n.meat > 0) {
      const feed = Math.min(100 - ph, n.meat * 1.5);
      ph += feed; n.meat -= feed * .3;
    }
    n.pet = { ...n.pet, hunger: clamp(ph, 0, 100) };
  }

  /* --- ค้นพบสายเลือดผสมจากการเผชิญสภาพแวดล้อม --- */
  if (s.blood.mixed) {
    const k = { res: { ...s.known.res }, traits: { ...s.known.traits }, stats: s.known.stats };
    let changed = false;
    ENV.forEach(e => {
      if (d.thr[e.id] > .2) {
        n.expose[e.id] = (n.expose[e.id] || 0) + dt;
        if (n.expose[e.id] > 18 && !k.res[e.id]) {
          k.res[e.id] = true; changed = true;
          n._msg = `รู้แล้วว่าเจ้าต้าน${e.name}ได้แค่ไหน`;
        }
      }
    });
    s.blood.traits.forEach((t, i) => {
      if (!k.traits[t] && n.lv >= (i === 0 ? 3 : 9)) {
        k.traits[t] = true; changed = true;
        n._msg = `สายเลือดตื่นขึ้น — “${TRAITS[t].name}”`;
      }
    });
    if (!k.stats && n.lv >= 5) { k.stats = true; changed = true; }
    if (changed) n.known = k;
  }

  /* --- นับฤดูหนาวที่ผ่านไป --- */
  if (seasonAt(now - dt * 1000) === 3 && d.sIdx !== 3) n.winters += 1;

  /* --- ความอึด: ฟื้นตัวเองต่อเนื่องเสมอ ไม่ว่าจะสู้อยู่หรือไม่ (ดู config.js STAMINA) ---
     เสียแค่ตอนแตะมือ (หักใน App.jsx tap() โดยตรง ไม่ใช่ที่นี่) จึงไม่มีทางค้างที่ 0 ถาวร */
  n.stamina = clamp((s.stamina ?? STAMINA.max) + STAMINA.regenPerSec * dt, 0, STAMINA.max);

  /* --- การต่อสู้: ดาเมจอัตโนมัติเดินตลอด ไม่โดนความอึดกระทบเลย --- */
  if (n.battle) {
    const hp = n.battle.hp - d.autoDps * dt * eff;
    if (hp <= 0) { n._kill = { ...n.battle, hp: 0 }; n.battle = null; }
    else if (now > n.battle.expires) { n._flee = { ...n.battle }; n.battle = null; }
    else n.battle = { ...n.battle, hp };
  }

  /* --- ฉายา --- */
  const gained = TITLES.filter(t => !n.titles.includes(t.id) && t.cond(n));
  if (gained.length) {
    n.titles = [...n.titles, ...gained.map(t => t.id)];
    n._msg = `ได้รับฉายา “${gained[0].name}”`;
  }

  /* --- เควสต์ --- */
  const q = QUESTS[n.quest];
  if (q && q.check(n)) {
    n.quest += 1;
    if (q.reward.pts) n.pts += q.reward.pts;
    if (q.reward.gold) { n.gold += q.reward.gold; n.totalGold += q.reward.gold; }
    if (q.unlock) n.unlocked = { ...n.unlocked, [q.unlock]: true };
    n._quest = q;
  }

  return n;
}

/** จำลองช่วงที่ผู้เล่นไม่อยู่ ด้วย fixed-step 30 วินาที
 *  ------------------------------------------------------------
 *  ระบบด่าน/เวฟ/บอส: มอนสเตอร์แทบไม่มีเวลาสปอว์นเลย (สู้ต่อเนื่อง)
 *  จึงจำลองแบบ "กลุ่มการฆ่า" (batch) แทนการวนทีละตัว — ไม่งั้นด่านต้น ๆ
 *  ที่ดาเมจสูงกว่าเลือดมอนสเตอร์มากจะวนหลายแสนรอบจนค้าง
 *  แต่ละ batch คำนวณ derive() ครั้งเดียว แล้วประมาณจำนวนตัวที่ฆ่าได้รวด
 *  เดียวก่อนจะถึงบอสตัวถัดไป (หรือจนกว่าเวลาจะหมด) — ถ้าเจอบอสแล้วเวลา
 *  ไม่พอ ให้เสียเวลาเท่ากับตัวจับเวลาบอสแล้วรีเซ็ตเวฟ เหมือนตอนเล่นสด
 */
function runOffline(s, from, to) {
  const span = Math.min(to - from, OFFLINE_CAP_MS);
  if (span < 5000) return null;

  const before = { hide: s.hide, lv: s.lv, wasted: s.wasted, gold: s.gold, stage: s.stage };
  let cur = { ...s, battle: null };
  let t = to - span, steps = 0;
  while (t < to && steps < OFFLINE_MAX_STEPS) {
    const dt = Math.min(OFFLINE_STEP, (to - t) / 1000);
    t += dt * 1000;
    cur = simulate(cur, dt, t, { offline: true });
    steps++;
  }

  let auto = 0, remainMs = span, guard = 0, fragmentsGained = 0;
  const items = [], ess = [];
  while (remainMs > 1000 && guard++ < 300) {
    const d = derive(cur, to);
    const tier = groundById(cur.ground).tier;
    const dps = d.autoDps * OFFLINE_EFF;
    if (dps <= 0) break;

    const isBoss = cur.stageKills >= STAGE.bossWaveSize;
    let hp = Math.floor(STAGE.hpBase * tier * Math.pow(STAGE.hpGrowth, cur.stage - 1));
    if (isBoss) hp *= STAGE.bossHpMult;
    const killMs = (hp / dps) * 1000 + STAGE.respawnAfterKillMs;
    const bossLimitMs = STAGE.bossTimeMs + ((cur.artifacts?.a_boss || 0) * 2000);

    if (isBoss && killMs > bossLimitMs) {
      // ปราบบอสไม่ทันซ้ำๆ — แทนที่จะวนทีละครั้ง (กิน guard 1 ต่อ 30 วิ ทำให้เวลาที่จำลองได้จริง
      // ต่ำกว่าเพดาน 12 ชม.มาก เพราะ guard มีจำกัด) คำนวณล่วงหน้าว่ารอบ "เคลียร์เวฟ 9 ตัว + แพ้บอส"
      // แบบเดิมซ้ำได้กี่รอบภายในเวลาที่เหลือ แล้วรวบใส่ทีเดียว — ใช้เวลาที่เหลือได้เต็มไม่ว่าจะกี่ชั่วโมง
      const normalHp = Math.floor(STAGE.hpBase * tier * Math.pow(STAGE.hpGrowth, cur.stage - 1));
      const normalKillMs = (normalHp / dps) * 1000 + STAGE.respawnAfterKillMs;
      const waveClearMs = STAGE.bossWaveSize * normalKillMs;
      const cycleMs = waveClearMs + bossLimitMs;
      const cycles = Math.floor(remainMs / cycleMs);

      if (cycles >= 1) {
        const killsTotal = cycles * STAGE.bossWaveSize;
        const goldPerKill = Math.floor(STAGE.goldBase * d.goldMul * Math.pow(STAGE.goldGrowth, cur.stage - 1));
        cur.gold += goldPerKill * killsTotal;
        cur.totalGold += goldPerKill * killsTotal;
        cur.hide = Math.min(d.capHide, cur.hide + normalHp * .0015 * d.gr.hide * killsTotal);
        cur.beasts += killsTotal;
        auto += killsTotal;
        remainMs -= cycles * cycleMs;

        // จำนวนตัวถล่มเยอะมาก — ใช้ค่าคาดหวัง (expected value) แทนการสุ่มทีละตัว กันลูปช้า
        fragmentsGained += Math.round(killsTotal * BASE.mobFragmentChance);
        const expectedItems = Math.round(killsTotal * BASE.mobItemChance * d.luck);
        for (let k = 0; k < expectedItems && cur.inv.length + items.length < BAG_SLOTS; k++) {
          items.push(rollItem(cur.lv + tier * 2, d.luck));
        }
        const envs = Object.keys(groundById(cur.ground).threat);
        const essWant = Math.min(killsTotal, 20 - (cur.pending.length + ess.length));
        for (let k = 0; k < essWant; k++) {
          ess.push(essenceFrom(pickSpecies(envs[Math.floor(Math.random() * envs.length)])));
        }
      }
      // จำลองความพยายามครั้งสุดท้าย (เศษเวลาที่เหลือไม่พอครบรอบ) ด้วยโค้ดปกติด้านล่างต่อไป
      remainMs -= Math.min(remainMs, bossLimitMs);
      cur.stageKills = 0;                     // ปราบบอสไม่ทัน — ถอยกลับไปตั้งหลักเหมือนเล่นสด
      continue;
    }
    if (killMs > remainMs) break;             // เวลาที่เหลือไม่พอฆ่าตัวถัดไปเลยแม้แต่ตัวเดียว

    const killsLeftInWave = isBoss ? 1 : (STAGE.bossWaveSize - cur.stageKills);
    const batch = Math.max(1, Math.min(killsLeftInWave, Math.floor(remainMs / killMs)));

    remainMs -= batch * killMs;
    auto += batch;
    cur.beasts += batch;

    const goldPerKill = Math.floor(STAGE.goldBase * d.goldMul * Math.pow(STAGE.goldGrowth, cur.stage - 1) * (isBoss ? STAGE.bossGoldMult : 1));
    cur.gold += goldPerKill * batch;
    cur.totalGold += goldPerKill * batch;
    cur.hide = Math.min(d.capHide, cur.hide + hp * .0015 * d.gr.hide * batch);

    if (isBoss) { cur.stage += 1; cur.stageKills = 0; }
    else cur.stageKills += batch;

    const envs = Object.keys(groundById(cur.ground).threat);
    const essRoom = Math.max(0, 20 - (cur.pending.length + ess.length));
    for (let k = 0; k < Math.min(batch, essRoom); k++) {
      ess.push(essenceFrom(pickSpecies(envs[Math.floor(Math.random() * envs.length)])));
    }
    const itemChance = isBoss ? BASE.bossItemChance : BASE.mobItemChance;
    for (let k = 0; k < Math.min(batch, 30); k++) {
      if (Math.random() < itemChance * d.luck && cur.inv.length + items.length < BAG_SLOTS) {
        items.push(rollItem(cur.lv + tier * 2, d.luck));
      }
    }
    if (isBoss) {
      fragmentsGained += Math.floor(rnd(BASE.bossFragmentMin, BASE.bossFragmentMax + 1));
    } else {
      for (let k = 0; k < Math.min(batch, 200); k++) {
        if (Math.random() < BASE.mobFragmentChance) fragmentsGained += 1;
      }
    }
  }

  cur.fragments = (cur.fragments || 0) + fragmentsGained;

  cur.inv = [...cur.inv, ...items];
  cur.pending = [...cur.pending, ...ess];
  items.forEach(it => { if (it.rar > cur.bestRar) cur.bestRar = it.rar; });
  cur.nextEvent = to + STAGE.respawnMs;
  cur.lastSaved = to;

  return {
    state: cur,
    report: {
      seconds: span / 1000, capped: (to - from) > OFFLINE_CAP_MS,
      hide: cur.hide - before.hide, gold: cur.gold - before.gold, lv: cur.lv - before.lv,
      stageGain: cur.stage - before.stage,
      beasts: auto, items: items.length, essences: ess.length, fragments: fragmentsGained,
      wasted: cur.wasted - before.wasted, satiety: cur.satiety, hydration: cur.hydration,
    },
  };
}

/* ===== src/core/storage.js ===== */
/* ============================================================
   storage.js — ห่อการอ่าน/เขียนเซฟไว้ที่เดียว
   ถ้าย้ายไป Flutter / localStorage / เซิร์ฟเวอร์ แก้แค่ไฟล์นี้
   ============================================================ */



async function loadSave() {
  try {
    const r = await window.storage.get(SAVE_KEY);
    if (!r || !r.value) return null;
    const st = JSON.parse(r.value);
    return migrate(st);
  } catch (e) {
    return null;                   // ยังไม่เคยเซฟ หรือเซฟเสีย
  }
}

async function writeSave(state) {
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

/* ===== src/art/PixelScene.jsx ===== */
/* ============================================================
   PixelScene.jsx — วาดฉากต่อสู้ลง canvas
   ------------------------------------------------------------
   คอมโพเนนต์นี้ "ไม่" รับ state ของเกมโดยตรง แต่รับ ref (fxRef)
   เพื่อไม่ให้ React re-render ทุกเฟรม — ลูปวาดอ่านค่าจาก ref เอง
   fxRef.current = { hit, nums, battle, ground, skillOn, shake, particles, pet }

   ระบบภาพ .png (ถ้ามี) ใช้ผ่าน art/assets.js — ทุกจุดเช็ค spriteReady()
   ก่อนวาดเสมอ ไม่มีไฟล์ก็ตกกลับไปวาดพิกเซลอาร์ตแบบเดิมทันที ไม่มีจอขาว/พัง
   ============================================================ */






const CANVAS_W = 360, CANVAS_H = 200, SCALE = 4, GROUND_OFFSET = 26;

/** วาดเฟรมหนึ่งจาก sprite sheet ลง canvas โดยคำนวณขนาดเฟรมจากขนาดไฟล์จริง */
function drawFrame(ctx, img, anim, row, t, x, y, targetH, flip, loop = true) {
  const frameW = img.naturalWidth / anim.cols;
  const totalRows = Math.max(...Object.values(anim.rows)) + 1;
  const frameH = img.naturalHeight / totalRows;
  const col = loop ? Math.floor(t / anim.frameMs) % anim.cols : Math.min(anim.cols - 1, Math.floor(t / anim.frameMs));
  const scale = targetH / frameH;
  const w = frameW * scale;
  ctx.save();
  if (flip) { ctx.translate(x + w, y); ctx.scale(-1, 1); ctx.drawImage(img, col * frameW, row * frameH, frameW, frameH, 0, 0, w, targetH); }
  else { ctx.drawImage(img, col * frameW, row * frameH, frameW, frameH, x, y, w, targetH); }
  ctx.restore();
  return w;
}

function PixelScene({ blood, fxRef }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const hPal = heroPalette(blood);
    const heroSprite = heroShapeFor(blood);
    const heroImg = heroAssetFor(blood);
    // จุดยึดดาบ (สัดส่วนของขนาดสไปรต์ ไม่ใช่พิกเซลตายตัว) กันดาบลอยผิดที่เวลาสลับเผ่าพันธุ์ที่ตัวใหญ่/เล็กไม่เท่ากัน
    const swordAnchor = { x: heroSprite[0].length * 0.81, y: heroSprite.length * 0.57 };
    let raf, alive = true;

    const draw = () => {
      if (!alive) return;
      const t = Date.now();
      const fx = fxRef.current;
      const gr = groundById(fx.ground);
      const battle = fx.battle;
      const GY = CANVAS_H - GROUND_OFFSET;
      const since = t - (fx.hit || 0);

      ctx.save();
      // สั่นหน้าจอตอนแตะโดน — ค่อยๆ หายไปเอง (ตั้งค่าจาก App.jsx ตอน tap())
      if (fx.shake > 0) {
        ctx.translate((Math.random() - 0.5) * fx.shake, (Math.random() - 0.5) * fx.shake);
        fx.shake *= 0.85;
        if (fx.shake < 0.5) fx.shake = 0;
      }

      /* ท้องฟ้า */
      const sky = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      sky.addColorStop(0, gr.sky[0]); sky.addColorStop(1, gr.sky[1]);
      ctx.fillStyle = sky; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      /* ฉากหลังไกล — ตำแหน่งคงที่ ไม่กระพริบ */
      ctx.fillStyle = gr.far;
      for (let i = 0; i < 9; i++) {
        const x = i * 46 + prand(i) * 20;
        const h = 24 + prand(i + 9) * 34;
        if (gr.deco === 'tree') {
          ctx.fillRect(x + 6, GY - h, 5, h);
          for (let k = 0; k < 4; k++) { const w = 26 - k * 5; ctx.fillRect(x + 8 - w / 2, GY - h - 4 + k * 9, w, 10); }
        } else if (gr.deco === 'ice') {
          ctx.beginPath(); ctx.moveTo(x, GY); ctx.lineTo(x + 14, GY - h); ctx.lineTo(x + 28, GY); ctx.fill();
        } else if (gr.deco === 'lava') {
          ctx.fillRect(x, GY - h, 20, h);
          ctx.fillStyle = 'rgba(255,110,40,.25)'; ctx.fillRect(x + 6, GY - h, 4, h); ctx.fillStyle = gr.far;
        } else {
          ctx.fillRect(x, GY - h * .6, 22, h * .6);
        }
      }

      /* พื้นดินสามชั้นแบบไทล์ */
      ctx.fillStyle = gr.gnd[0]; ctx.fillRect(0, GY, CANVAS_W, 8);
      ctx.fillStyle = gr.gnd[1]; ctx.fillRect(0, GY + 8, CANVAS_W, 10);
      ctx.fillStyle = gr.gnd[2]; ctx.fillRect(0, GY + 18, CANVAS_W, CANVAS_H - GY - 18);
      for (let i = 0; i < 30; i++) {
        ctx.fillStyle = gr.gnd[2];
        ctx.fillRect(i * 12 + (prand(i + 40) * 6 | 0), GY + 4 + (prand(i) * 6 | 0), 3, 3);
      }

      /* สัตว์เลี้ยง — วาดก่อนฮีโร่เพื่อให้ยืนอยู่ข้างหลัง ตามหลังนิดหน่อย */
      if (fx.pet) {
        const pData = petById(fx.pet.id);
        if (pData) {
          const pImg = petAssetFor(pData);
          const pLunge = since < 250 ? (1 - since / 250) * 12 : 0;
          const pBob = Math.sin(t / 280) * 2;
          if (spriteReady(pImg)) {
            const targetH = 15 * SCALE;
            drawFrame(ctx, pImg, MOB_ANIM, MOB_ANIM.rows.idle, t, 2 + pLunge, GY - targetH + pBob + 2, targetH, false);
          } else {
            const pShape = SHAPES[pData.shape] || SHAPES.quad;
            drawSprite(ctx, pShape, pData.pal, 4 + pLunge, GY - pShape.length * SCALE + pBob + 2, SCALE, false);
          }
        }
      }

      /* ตัวละคร */
      const lunge = since < 200 ? (1 - since / 200) * 18 : 0;
      const bob = Math.sin(t / 340) * 2;
      const hx = 22 + lunge, hy = GY - heroSprite.length * SCALE + bob + 2;

      if (spriteReady(heroImg)) {
        const isAtk = since < 250;
        const targetH = heroSprite.length * SCALE;
        if (fx.skillOn) { ctx.save(); ctx.shadowColor = '#E4622A'; ctx.shadowBlur = 22; }
        drawFrame(ctx, heroImg, HERO_ANIM, isAtk ? HERO_ANIM.rows.attack : HERO_ANIM.rows.idle, isAtk ? since : t, hx, hy, targetH, false, isAtk);
        if (fx.skillOn) ctx.restore();
      } else {
        if (fx.skillOn) { ctx.save(); ctx.shadowColor = '#E4622A'; ctx.shadowBlur = 22; }
        drawSprite(ctx, heroSprite, hPal, hx, hy, SCALE, false);
        ctx.save();
        ctx.translate(hx + swordAnchor.x * SCALE, hy + swordAnchor.y * SCALE);
        ctx.rotate(since < 200 ? -1.5 + (since / 200) * 2.2 : .5);
        drawSprite(ctx, SWORD, SWORD_PAL, -2 * SCALE, -12 * SCALE, SCALE, false);
        ctx.restore();
        if (fx.skillOn) ctx.restore();
      }

      /* มอนสเตอร์ — ฝูงคลั่งวาดซ้อนกัน 3 ตัว เยื้องไปด้านหลังทีละนิด */
      if (battle) {
        const flash = since < 110;
        // บอสวาดใหญ่กว่าเห็นชัด ตามที่ขนาดพิกเซลแนะนำ (96-128px เทียบฮีโร่ 48px)
        const baseScale = SCALE * (battle.legend ? 1.25 : battle.isBoss ? 1.5 : 1);
        const mImg = monsterAssetFor(battle.species, battle.isBoss);
        const hordeCount = battle.isHorde ? 3 : 1;

        for (let i = hordeCount - 1; i >= 0; i--) {
          const offsetX = i * 22;
          const scale = baseScale * (1 - i * 0.1);
          const bob = Math.sin((t + i * 500) / 260) * 2;

          if (spriteReady(mImg) && !flash) {
            const targetH = (SHAPES[battle.species.shape]?.length || 20) * scale;
            const w = mImg.naturalWidth / MOB_ANIM.cols * (targetH / (mImg.naturalHeight / 3));
            drawFrame(ctx, mImg, MOB_ANIM, MOB_ANIM.rows.idle, t + i * 200, CANVAS_W - 18 - offsetX - w, GY - targetH + bob + 2, targetH, true);
          } else {
            const shape = SHAPES[battle.species.shape] || SHAPES.quad;
            const bx = CANVAS_W - 18 - offsetX - shape[0].length * scale;
            const by = GY - shape.length * scale + bob + 2;
            const pal = flash
              ? { o: '#fff', 1: '#fff', 2: '#fff', 3: '#fff', e: '#fff', t: '#fff' }
              : { ...battle.species.pal, t: '#F6F1E4' };
            drawSprite(ctx, shape, pal, bx + (flash ? rnd(-2, 2) : 0), by, scale, true);
            if (since < 200 && i === 0) {
              ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 4;
              ctx.beginPath(); ctx.arc(bx + 20, by + shape.length * scale * .55, 40, -1, .8); ctx.stroke();
            }
          }
        }
      }

      /* อนุภาค — เลือด/ประกาย ตอนแตะโดน (ตั้งต้นจาก App.jsx ตอน tap()) */
      if (fx.particles && fx.particles.length) {
        for (let i = fx.particles.length - 1; i >= 0; i--) {
          const p = fx.particles[i];
          p.x += p.vx; p.y += p.vy; p.vy += 0.4; p.life -= 0.03;
          if (p.life <= 0) { fx.particles.splice(i, 1); continue; }
          ctx.globalAlpha = p.life;
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x, p.y, p.size, p.size);
        }
        ctx.globalAlpha = 1;
      }

      /* ตัวเลขดาเมจลอย */
      fx.nums = fx.nums.filter(nm => t - nm.t0 < 900);
      ctx.textAlign = 'center';
      ctx.font = 'bold 15px ui-monospace, monospace';
      fx.nums.forEach(nm => {
        const p = (t - nm.t0) / 900;
        ctx.globalAlpha = 1 - p;
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.7)';
        ctx.strokeText(nm.v, nm.x, GY - 60 - p * 46);
        ctx.fillStyle = nm.crit ? '#FFD24A' : '#FFFFFF';
        ctx.fillText(nm.v, nm.x, GY - 60 - p * 46);
        ctx.globalAlpha = 1;
      });

      ctx.restore();
      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, [blood, fxRef]);

  return (
    <canvas
      ref={ref}
      width={CANVAS_W}
      height={CANVAS_H}
      style={{ imageRendering: 'pixelated', display: 'block', width: '100%', aspectRatio: `${CANVAS_W} / ${CANVAS_H}` }}
    />
  );
}

/* ===== src/ui/theme.jsx ===== */
/* ============================================================
   theme.jsx — สไตล์กลางทั้งเกม
   ------------------------------------------------------------
   หมายเหตุสำคัญ (แก้บั๊ก "หน้าจอขยับตลอด"):
     1. html{overflow-y:scroll} — กันแถบเลื่อนโผล่/หายแล้วเนื้อหาเลื่อนซ้ายขวา
     2. .fixw — ช่องตัวเลขกว้างคงที่ ตัวเลขเปลี่ยนหลักแล้วไม่ดันข้อความข้างๆ
     3. .nowrap — ปุ่มที่มีตัวเลขห้ามตัดบรรทัด ไม่งั้นความสูงกระโดด
     4. หน้าต่างโมดัลใช้ตำแหน่งตายตัว (ดู widgets.jsx) ไม่จัดกลางแนวตั้ง
   ============================================================ */

function Theme() {
  return (
    <style>{`
      html { overflow-y: scroll; }
      * { -webkit-tap-highlight-color: transparent; }

      :root{
        --night:#0A1119; --stone:#182634; --stone2:#101B26; --stone3:#22364A; --ice:#436079;
        --bone:#EDE7DA; --ember:#F2762F; --emberD:#B84C18; --frost:#79C4E8;
        --blood:#9B3838; --moss:#6E9B5E; --gold:#F0C24A;
      }
      .warm{ --night:#1A0F09; --stone:#30201A; --stone2:#22150F; --stone3:#432A1E; --ice:#875538; }

      .panel{
        background:var(--stone);
        border:2px solid rgba(0,0,0,.45);
        box-shadow:inset 0 2px 0 rgba(255,255,255,.07), 0 3px 0 rgba(0,0,0,.35);
        border-radius:12px;
      }
      .num{ font-variant-numeric:tabular-nums; font-family:ui-monospace,SFMono-Regular,Menlo,monospace; }
      .fixw{ display:inline-block; text-align:right; }
      .nowrap{ white-space:nowrap; }
      .lbl{ letter-spacing:.14em; text-transform:uppercase; font-size:9px; }
      .ttl{ text-shadow:0 2px 0 rgba(0,0,0,.55); }

      .btn{
        border-radius:10px; border:2px solid rgba(0,0,0,.45);
        box-shadow:inset 0 2px 0 rgba(255,255,255,.18), 0 3px 0 rgba(0,0,0,.4);
        font-weight:700; transition:transform .06s; white-space:nowrap;
      }
      .btn:active:not(:disabled){ transform:translateY(2px); box-shadow:inset 0 2px 0 rgba(255,255,255,.12), 0 1px 0 rgba(0,0,0,.4); }
      .btn:disabled{ filter:grayscale(.6) brightness(.6); }

      .bar{ height:8px; border-radius:5px; background:rgba(0,0,0,.45); overflow:hidden; box-shadow:inset 0 1px 2px rgba(0,0,0,.6); }
      .bar>i{ display:block; height:100%; transition:width .25s linear; }

      .navb{ border-radius:12px; border:2px solid rgba(0,0,0,.45); box-shadow:inset 0 2px 0 rgba(255,255,255,.1), 0 3px 0 rgba(0,0,0,.35); }

      .pulse{ animation:pu 1.1s ease-in-out infinite; } @keyframes pu{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}
      .popin{ animation:pi .2s cubic-bezier(.2,1.4,.5,1); } @keyframes pi{from{transform:scale(.9);opacity:0}to{transform:scale(1);opacity:1}}
      @media (prefers-reduced-motion:reduce){ .pulse,.popin{animation:none} }

      button:focus-visible{ outline:3px solid var(--frost); outline-offset:2px; }
      input{ background:var(--stone2); border:2px solid var(--ice); color:var(--bone); border-radius:10px; }
      .scroll{ overflow-y:auto; -webkit-overflow-scrolling:touch; }
    `}</style>
  );
}

/* ===== src/ui/widgets.jsx ===== */
/* ============================================================
   widgets.jsx — ชิ้นส่วน UI ที่ใช้ซ้ำทั้งเกม
   ============================================================ */



/** แถบค่า */
function Bar({ value, max = 100, color, height }) {
  return (
    <div className="bar" style={height ? { height } : undefined}>
      <i style={{ width: `${Math.max(0, Math.min(100, (value / max) * 100))}%`, background: color }} />
    </div>
  );
}

/** แถวข้อมูล ซ้าย-ขวา ตัวเลขกว้างคงที่กันหน้าจอขยับ */
function Row({ label, value, color, w = 9 }) {
  return (
    <div className="flex justify-between num text-xs py-0.5 nowrap">
      <span style={{ color: 'var(--ice)' }}>{label}</span>
      <span className="fixw" style={{ color, minWidth: `${w}ch` }}>{value}</span>
    </div>
  );
}

/** ตัวเลขที่เปลี่ยนบ่อย — จองความกว้างไว้ล่วงหน้า */
function Num({ children, w = 6, color }) {
  return <span className="num fixw" style={{ minWidth: `${w}ch`, color }}>{children}</span>;
}

function ItemCard({ item, onClick, showValue, sellMul = 1 }) {
  const base = baseById(item.base), rar = RARITY[item.rar];
  return (
    <button onClick={onClick} className="btn w-full p-2 text-left" style={{ background: 'var(--stone3)', borderColor: rar.color }}>
      <div className="text-xs font-bold truncate" style={{ color: rar.color }}>{base.name}</div>
      <div className="num nowrap" style={{ fontSize: 10, color: 'var(--ice)' }}>
        {rar.name} · iLv{item.ilvl}
        {item.affixes.length ? ` · ${item.affixes.length} คุณสมบัติ` : ''}
        {showValue ? ` · ${fmt(Math.floor(itemValue(item) * .55 * sellMul))}🪙` : ''}
      </div>
    </button>
  );
}

/* ============================================================
   Modal — หน้าต่างซ้อนแบบเกมมือถือ
   ------------------------------------------------------------
   สำคัญ: ใช้ inset ตายตัว (top/bottom/left/right) ไม่ใช้ flex center
   ความสูงจึงคงที่เสมอ เนื้อหาข้างในเลื่อนเอง
   → แก้ปัญหาหน้าต่างเด้งขึ้นลงตอนตัวเลขข้างในเปลี่ยน
   ============================================================ */
function Modal({ icon, title, tabs, activeTab, onTab, right, onClose, children }) {
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(3,7,12,.82)' }}
    >
      <div
        className="popin"
        onClick={e => e.stopPropagation()}
        style={{
          position: 'absolute',
          top: '3vh', bottom: '3vh',
          left: '50%', transform: 'translateX(-50%)',
          width: 'min(96vw, 28rem)',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* หัวเรื่อง */}
        <div className="flex items-center gap-3 px-3 py-3 shrink-0"
          style={{ background: 'linear-gradient(180deg,#33506E,#1D3149)', borderRadius: '14px 14px 0 0', border: '2px solid rgba(0,0,0,.5)', borderBottom: 'none' }}>
          <div className="flex items-center justify-center shrink-0"
            style={{ width: 42, height: 42, borderRadius: 21, fontSize: 20, background: 'linear-gradient(180deg,#F2762F,#B84C18)', border: '2px solid rgba(0,0,0,.45)', boxShadow: 'inset 0 2px 0 rgba(255,255,255,.25)' }}>
            {icon}
          </div>
          <div className="flex-1 text-center text-xl font-extrabold ttl">{title}</div>
          <button onClick={onClose} className="shrink-0 text-2xl font-bold px-2" style={{ color: 'rgba(255,255,255,.7)' }}>✕</button>
        </div>

        {/* แท็บย่อย */}
        {tabs && tabs.length > 0 && (
          <div className="flex gap-1 px-2 py-2 shrink-0"
            style={{ background: '#16283C', borderLeft: '2px solid rgba(0,0,0,.5)', borderRight: '2px solid rgba(0,0,0,.5)' }}>
            {tabs.map(([key, label]) => (
              <button key={key} onClick={() => onTab(key)} className="btn flex-1 py-2 text-xs"
                style={{ background: activeTab === key ? 'var(--ember)' : 'var(--stone3)', color: activeTab === key ? '#26100A' : 'var(--bone)' }}>
                {label}
              </button>
            ))}
          </div>
        )}

        {/* แถบข้อมูลขวา */}
        {right && (
          <div className="px-3 py-1.5 text-right num text-sm shrink-0 nowrap"
            style={{ background: '#12202F', borderLeft: '2px solid rgba(0,0,0,.5)', borderRight: '2px solid rgba(0,0,0,.5)', color: 'var(--gold)' }}>
            {right}
          </div>
        )}

        {/* เนื้อหา — ส่วนเดียวที่เลื่อน */}
        <div className="scroll p-3 space-y-2"
          style={{ background: 'var(--stone2)', border: '2px solid rgba(0,0,0,.5)', borderTop: 'none', borderRadius: '0 0 14px 14px', flex: 1, minHeight: 0 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

/** กล่องป๊อปอัปกลางจอ (รางวัล/เควสต์/รายงาน) */
function Popup({ children, borderColor, glow }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(3,7,12,.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="panel popin p-5" style={{ width: '100%', maxWidth: '24rem', borderColor, boxShadow: glow ? `0 0 44px ${glow}` : undefined }}>
        {children}
      </div>
    </div>
  );
}

/* ===== src/screens/CharacterCreate.jsx ===== */
/* ============================================================
   CharacterCreate.jsx — ตั้งชื่อ แล้วเลือกเผ่าพันธุ์/คลาส หรือผสมสายเลือด
   ============================================================ */





function CharacterCreate({ initialName = '', onCreate }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(initialName);
  const [openRace, setOpenRace] = useState(null);

  return (
    <div className="min-h-screen" style={{ background: 'var(--night)', color: 'var(--bone)' }}>
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="panel p-4 mb-5" style={{ borderColor: 'rgba(121,196,232,.5)' }}>
          <div className="lbl mb-1" style={{ color: 'var(--frost)' }}>system</div>
          <div className="text-base ttl font-bold">ยินดีต้อนรับสู่โลกนี้</div>
          <div className="text-xs" style={{ color: 'var(--ice)' }}>กรุณาระบุตัวตนของท่าน</div>
        </div>

        {step === 0 ? (
          <div>
            <div className="lbl mb-2" style={{ color: 'var(--ice)' }}>ชื่อของเจ้า</div>
            <input value={name} maxLength={16} onChange={e => setName(e.target.value)}
              placeholder="บยอร์น" className="w-full px-4 py-3 mb-4 text-lg" />
            <button onClick={() => setStep(1)} className="btn w-full py-3 text-lg"
              style={{ background: 'var(--frost)', color: '#06121C' }}>ยืนยันชื่อ</button>
          </div>
        ) : (
          <div>
            <button onClick={() => onCreate(name.trim() || 'ผู้ไร้นาม', 'mix')}
              className="btn w-full p-4 mb-4 text-left" style={{ background: 'linear-gradient(160deg,#7A2A2A,#3A1418)', whiteSpace: 'normal' }}>
              <div className="flex justify-between mb-1">
                <span className="font-bold text-base ttl">🩸 สายเลือดผสม</span>
                <span className="lbl" style={{ color: 'var(--gold)' }}>โหมดท้าทาย</span>
              </div>
              <p className="text-xs" style={{ color: '#F0C8B8' }}>
                สองเผ่าพันธุ์ถูกผสมโดยไม่มีใครรู้ว่าเป็นอะไร ได้ลักษณะสายเลือด <b>สองอย่าง</b> แทนหนึ่ง
                แต่ค่าพลังถูกเฉลี่ย และมีโอกาสน้อยมากที่จะเจอสายพันธุ์ตำนานที่ประทับตราสายเลือดแท้ให้เจ้า
              </p>
            </button>

            <button onClick={() => onCreate(name.trim() || 'ผู้ไร้นาม', 'random')}
              className="btn w-full p-3 mb-4 text-left" style={{ background: 'var(--stone)' }}>
              <span className="font-bold">🎲 สุ่มเผ่าพันธุ์</span>
              <span className="text-xs ml-2" style={{ color: 'var(--ice)' }}>ได้เผ่าแท้ รู้ค่าทั้งหมดทันที</span>
            </button>

            <div className="lbl mb-2" style={{ color: 'var(--ice)' }}>หรือเลือกเอง</div>
            <div className="space-y-2">
              {RACES.map(r => (
                <div key={r.id} className="panel p-3">
                  <button onClick={() => setOpenRace(openRace === r.id ? null : r.id)} className="w-full text-left">
                    <div className="flex justify-between items-baseline">
                      <span className="font-bold ttl">{r.icon} {r.name}</span>
                      <span className="text-xs" style={{ color: 'var(--ice)' }}>{r.tag}</span>
                    </div>
                    <div className="num text-xs mt-1 nowrap" style={{ color: 'var(--frost)' }}>
                      {STATS.map(x => `${x.abbr}×${r.stats[x.id].toFixed(2)}`).join(' ')}
                    </div>
                    <div className="text-xs mt-1" style={{ color: 'var(--ember)' }}>
                      {RUNE_STYLE[r.runeStyle].icon} รูนสไตล์ {RUNE_STYLE[r.runeStyle].label}
                    </div>
                    <div className="flex gap-1 mt-2">
                      {ENV.map(e => (
                        <div key={e.id} className="flex-1">
                          <Bar value={r.res[e.id] * 100} color="var(--frost)" height={5} />
                          <div className="text-center" style={{ fontSize: 9 }}>{e.icon}</div>
                        </div>
                      ))}
                    </div>
                  </button>

                  {openRace === r.id && (
                    <div className="mt-3 pt-3 space-y-2" style={{ borderTop: '2px solid rgba(0,0,0,.4)' }}>
                      <div className="text-xs"><b style={{ color: 'var(--ember)' }}>{TRAITS[r.trait].name}</b> — {TRAITS[r.trait].desc}</div>
                      {r.classes.map(c => (
                        <button key={c.id} onClick={() => onCreate(name.trim() || 'ผู้ไร้นาม', 'choose', r.id, c.id)}
                          className="btn w-full p-2 text-left" style={{ background: 'var(--stone3)' }}>
                          <div className="flex justify-between">
                            <span className="text-sm font-bold">{c.name}</span>
                            <span className="num text-xs" style={{ color: 'var(--frost)' }}>
                              {Object.entries(c.bias).map(([k, v]) => `${STATS.find(x => x.id === k).abbr}+${v}`).join(' ')}
                            </span>
                          </div>
                          <div className="text-xs" style={{ color: 'var(--ember)' }}>ทักษะ · {c.skill.name}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ===== src/screens/HuntScreen.jsx ===== */
/* ============================================================
   HuntScreen.jsx — หน้าจอหลัก
   ------------------------------------------------------------
   กันหน้าจอขยับ:
     - ทุกช่องที่มีตัวเลขเปลี่ยนบ่อยใช้ .fixw + minWidth เป็น ch
     - แถบเควสต์ / ปุ่มทักษะ / กล่องเตือน ใช้ความสูงจองไว้ (minHeight)
       เพื่อไม่ให้เนื้อหาด้านล่างกระโดดตอนมันโผล่/หาย
   ============================================================ */







function HuntScreen({ s, d, now, fxRef, onTap, onSkill, onOpen }) {
  const B = s.blood;
  const quest = QUESTS[s.quest];
  const cd = Math.max(0, s.skillReady - now);
  const nextIn = Math.max(0, Math.ceil((s.nextEvent - now) / 1000));

  const NAV = [
    { id: 'status', icon: '📊', label: 'สถานะ', on: s.unlocked.status, badge: s.pts > 0 },
    { id: 'items', icon: '🎒', label: 'ของ', on: s.unlocked.items, badge: s.pending.length > 0 },
    { id: 'market', icon: '💰', label: 'ตลาด', on: s.unlocked.market },
    { id: 'world', icon: '🗺️', label: 'แผนที่', on: s.unlocked.world },
    { id: 'sys', icon: '⚙️', label: 'ระบบ', on: true },
  ];

  return (
    <div className={d.skillOn || d.peptideOn ? 'warm' : ''} style={{ background: 'var(--night)', transition: 'background .6s', minHeight: '100vh' }}>
      <div className="max-w-md mx-auto px-3 pb-3 pt-2">

        {/* ---------- แถบสถานะบน ---------- */}
        <div className="panel px-3 py-2 mb-2">
          <div className="flex justify-between items-baseline nowrap">
            <div className="truncate">
              <span className="font-extrabold ttl">{s.name}</span>
              <span className="text-xs ml-2" style={{ color: 'var(--ice)' }}>
                {B.raceIcon} {B.mixed ? 'ลูกผสม' : B.raceName} · {B.className}
              </span>
            </div>
            <span className="num font-bold fixw" style={{ color: 'var(--frost)', minWidth: '6ch' }}>Lv {s.lv}</span>
          </div>
          <div className="mt-1.5"><Bar value={s.exp} max={d.need} color="linear-gradient(90deg,#4E9FD0,#79C4E8)" /></div>

          <div className="grid grid-cols-5 gap-1 mt-2 nowrap" style={{ fontSize: 11 }}>
            <span style={{ color: 'var(--gold)' }}>🪙<Num w={7}>{fmt(s.gold)}</Num></span>
            <span style={{ color: 'var(--gold)' }}>🧩<Num w={4}>{s.fragments || 0}</Num></span>
            <span>🥩<Num w={5}>{fmt(s.meat)}</Num><span className="num" style={{ color: 'var(--ice)' }}>/{fmt(d.capMeat)}</span></span>
            <span style={{ color: '#C9B08A' }}>🦴<Num w={5}>{fmt(s.hide)}</Num><span className="num" style={{ color: 'var(--ice)' }}>/{fmt(d.capHide)}</span></span>
            <span style={{ color: '#5FA8D3' }}>💧<Num w={5}>{fmt(s.water)}</Num><span className="num" style={{ color: 'var(--ice)' }}>/{fmt(d.capWater)}</span></span>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2">
            <Bar value={s.satiety} color={s.satiety < 25 ? 'var(--blood)' : 'linear-gradient(90deg,#B84C18,#F2762F)'} />
            <Bar value={s.hydration} color={s.hydration < 25 ? 'var(--blood)' : 'linear-gradient(90deg,#2E7FA8,#5FC0E8)'} />
          </div>

          <div className="mt-2">
            <div className="flex justify-between text-xs nowrap" style={{ color: 'var(--ice)', marginBottom: 2 }}>
              <span>ความอึด (การแตะมือ) {(s.stamina ?? 100) < 20 && <span style={{ color: 'var(--blood)' }}>⚠ ล้า</span>}</span>
              <span className="num fixw" style={{ minWidth: '4ch' }}>{Math.round(s.stamina ?? 100)}%</span>
            </div>
            <Bar value={s.stamina ?? 100} color={(s.stamina ?? 100) < 20 ? 'var(--blood)' : 'linear-gradient(90deg,#F0C24A,#6E9B5E)'} />
          </div>
        </div>

        {/* ---------- เควสต์ (ความสูงจองไว้) ---------- */}
        <div style={{ minHeight: 66, marginBottom: 8 }}>
          {quest && (
            <div className="panel px-3 py-2" style={{ background: 'linear-gradient(180deg,#1E3A52,#16283C)', borderColor: 'rgba(121,196,232,.4)' }}>
              <div className="flex justify-between nowrap">
                <span className="lbl" style={{ color: 'var(--frost)' }}>เควสต์ {s.quest + 1}/{QUESTS.length}</span>
                <span className="lbl truncate" style={{ color: 'var(--gold)' }}>{quest.rewardText}</span>
              </div>
              <div className="text-sm font-bold">{quest.text}</div>
              <div className="text-xs" style={{ color: 'var(--ice)' }}>{quest.hint}</div>
            </div>
          )}
        </div>

        {/* ---------- ฉากต่อสู้ ---------- */}
        <button onClick={onTap} className="w-full mb-2 block overflow-hidden"
          style={{ borderRadius: 14, border: '2px solid rgba(0,0,0,.5)', boxShadow: '0 3px 0 rgba(0,0,0,.35)' }}>
          <div style={{ position: 'relative' }}>
            <PixelScene blood={B} fxRef={fxRef} />

            <div className="flex justify-between px-2 py-1.5 text-xs nowrap"
              style={{ position: 'absolute', top: 0, left: 0, right: 0, background: 'linear-gradient(180deg,rgba(0,0,0,.6),transparent)' }}>
              <span className="font-bold truncate" style={{ color: s.stageKills >= STAGE.bossWaveSize ? '#FF4A4A' : s.battle?.isHorde ? '#F2762F' : '#F0C24A' }}>
                ด่าน {s.stage} — {s.stageKills >= STAGE.bossWaveSize ? '🔥 บอสทะลวงด่าน!' : s.battle?.isHorde ? '⚠️ ฝูงมอนสเตอร์คลั่ง!' : `เวฟ ${s.stageKills + 1}/${STAGE.bossWaveSize + 1}`}
              </span>
              <span style={{ color: '#CFE0EC' }}>{d.gr.icon} {d.gr.name}</span>
            </div>

            <div className="px-2 py-1.5 nowrap"
              style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(0deg,rgba(0,0,0,.78),transparent)', minHeight: 40 }}>
              {s.battle ? (
                <div className="flex items-center gap-2">
                  <span className="text-lg">{s.battle.species.icon}</span>
                  <div className="flex-1 text-left truncate">
                    <div className="text-xs font-bold" style={{ color: s.battle.legend ? 'var(--gold)' : '#fff' }}>
                      {s.battle.species.name}{s.battle.legend ? ' ✦' : ''}
                    </div>
                    <div className="num truncate" style={{ fontSize: 10, color: '#BFD4E2' }}>
                      เอสเซนส์ · {SKILL_LIB[s.battle.species.skill]?.name}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="num text-xs font-bold fixw" style={{ color: '#FF8A78', minWidth: '7ch' }}>{fmt(s.battle.hp)}</div>
                    <div className="num fixw" style={{ fontSize: 10, color: '#BFD4E2', minWidth: '7ch' }}>{Math.ceil((s.battle.expires - now) / 1000)} วิ</div>
                  </div>
                </div>
              ) : (
                <div className="text-xs num text-left" style={{ color: '#CFE0EC' }}>
                  แตะเพื่อล่า · พลัง <span className="fixw" style={{ minWidth: '7ch' }}>{fmt(d.power)}</span>
                  {s.quest >= MONSTER_UNLOCK_QUEST && (
                    <span style={{ color: '#FFB27A' }}> · มอนสเตอร์ถัดไปใน <span className="fixw" style={{ minWidth: '4ch' }}>{nextIn}</span> วิ</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </button>

        {/* ---------- ปุ่มทักษะ (ความสูงจองไว้) ---------- */}
        <div style={{ minHeight: 52, marginBottom: 8 }}>
          {s.unlocked.skill && (
            <button onClick={onSkill} disabled={cd > 0} className="btn w-full py-3 text-base"
              style={{ background: cd > 0 ? 'var(--stone3)' : 'linear-gradient(180deg,#F2762F,#B84C18)', color: cd > 0 ? 'var(--ice)' : '#2A1006' }}>
              {d.skillOn
                ? <>{B.cls.skill.name} · <span className="num fixw" style={{ minWidth: '3ch' }}>{Math.ceil((s.skillEnd - now) / 1000)}</span> วิ</>
                : cd > 0
                  ? <>{B.cls.skill.name} · <span className="num fixw" style={{ minWidth: '3ch' }}>{Math.ceil(cd / 1000)}</span> วิ</>
                  : <>⚡ {B.cls.skill.name}</>}
            </button>
          )}
        </div>

        {/* ---------- คำเตือน (ความสูงจองไว้) ---------- */}
        <div style={{ minHeight: 44, marginBottom: 8 }}>
          {(s.satiety < 25 || s.hydration < 25) && (
            <div className="panel p-2 text-xs" style={{ background: 'rgba(155,56,56,.35)', borderColor: 'var(--blood)' }}>
              ⚠ {s.hydration < 25 ? 'ขาดน้ำอย่างหนัก — ย้ายไปถิ่นที่มีน้ำมากกว่า หรือเพิ่ม SEN' : 'อดอยาก — เพิ่มพลังหรือย้ายถิ่นที่เนื้อเยอะ'}
            </div>
          )}
        </div>

        {/* ---------- แถบไอคอนล่าง ---------- */}
        <div className="grid grid-cols-5 gap-1.5">
          {NAV.map(n => (
            <button key={n.id} onClick={() => n.on && onOpen(n.id)} disabled={!n.on} className="navb py-2"
              style={{ position: 'relative', background: n.on ? 'linear-gradient(180deg,#2A415A,#1A2C40)' : '#141F2C', opacity: n.on ? 1 : .4 }}>
              <div style={{ fontSize: 19 }}>{n.on ? n.icon : '🔒'}</div>
              <div style={{ fontSize: 10, color: 'var(--ice)' }}>{n.on ? n.label : ''}</div>
              {n.badge && <span className="pulse" style={{ position: 'absolute', top: 4, right: 6, width: 9, height: 9, borderRadius: 5, background: 'var(--ember)', border: '1px solid rgba(0,0,0,.5)' }} />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ===== src/screens/Popups.jsx ===== */
/* ============================================================
   Popups.jsx — กล่องข้อความกลางจอทั้งหมด
   ============================================================ */







/** รายละเอียดไอเท็มที่เลือก — สวมใส่ ขาย หรือตีบวก */
function ItemDetail({ item, sellMul, fragments, onEquip, onSell, onEnhance, onClose }) {
  const base = baseById(item.base), rar = RARITY[item.rar];
  const upg = item.upgrade || 0;
  const q = rar.mult * (1 + item.ilvl * .05) * (1 + upg * ENHANCE.powerPerLevel);
  const cost = getEnhanceCost(item);
  const canEnhance = fragments >= cost.fragments;   // เช็คทองอีกทีใน App.jsx ตอนกดจริง
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(3,7,12,.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="panel popin p-5" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '24rem', borderColor: rar.color }}>
        <div className="flex justify-between items-start">
          <div className="lbl" style={{ color: rar.color }}>{rar.name}</div>
          {upg > 0 && <div className="num font-bold text-lg pulse" style={{ color: 'var(--gold)' }}>+{upg}</div>}
        </div>
        <h3 className="text-lg font-extrabold ttl">{base.name}</h3>
        <div className="num text-xs mb-3" style={{ color: 'var(--ice)' }}>iLv {item.ilvl} · {SLOT_NAME[base.slot]}</div>
        <div className="text-xs mb-1" style={{ color: 'var(--frost)' }}>
          {base.power ? `พลัง ×${(1 + (base.power - 1) * q).toFixed(2)}`
            : base.resAll ? `ต้านทานทุกชนิด +${(base.resAll * q).toFixed(2)}`
              : 'หิว/กระหายช้าลง'}
        </div>
        {item.affixes.map((a, i) => <div key={i} className="text-xs" style={{ color: 'var(--ember)' }}>· {affixById(a.id)?.fmt(a.v)}</div>)}
        <div className="flex gap-2 mt-4">
          <button onClick={() => onEquip(item)} className="btn flex-1 py-3" style={{ background: 'var(--frost)', color: '#06121C' }}>สวมใส่</button>
          <button onClick={() => onSell(item)} className="btn flex-1 py-3" style={{ background: 'var(--stone3)', color: 'var(--bone)' }}>
            ขาย {fmt(Math.floor(itemValue(item) * BASE.sellItemRatio * sellMul))}🪙
          </button>
        </div>
        <button onClick={() => canEnhance && onEnhance(item)} disabled={!canEnhance} className="btn w-full py-2 mt-2 text-xs"
          style={{ background: canEnhance ? 'linear-gradient(180deg,#F0C24A,#B8901E)' : 'var(--stone2)', color: canEnhance ? '#2A1E06' : 'var(--ice)' }}>
          ตีบวกขั้นถัดไป (+{Math.round(ENHANCE.powerPerLevel * 100)}%) · ใช้ {cost.fragments}🧩 และ {fmt(cost.gold)}🪙
        </button>
      </div>
    </div>
  );
}

/** ป๊อปอัปรวม: drop / ess / rune / quest */
function EventPopup({ pop, runeStyle, onClose }) {
  if (!pop) return null;

  if (pop.kind === 'drop') {
    const rar = RARITY[pop.item.rar];
    return (
      <Popup borderColor={rar.color} glow={`${rar.color}55`}>
        <div className="text-center">
          <div className="lbl mb-1" style={{ color: rar.color }}>ของหล่นจากซาก</div>
          <h3 className="text-lg font-extrabold ttl mb-1">{baseById(pop.item.base).name}</h3>
          <div className="text-sm mb-3" style={{ color: rar.color }}>{rar.name} · iLv {pop.item.ilvl}</div>
          {pop.item.affixes.map((a, i) => <div key={i} className="text-xs" style={{ color: 'var(--ember)' }}>· {affixById(a.id)?.fmt(a.v)}</div>)}
          <button onClick={onClose} className="btn w-full py-3 mt-4" style={{ background: 'var(--frost)', color: '#06121C' }}>เก็บใส่กระเป๋า</button>
        </div>
      </Popup>
    );
  }

  if (pop.kind === 'ess') {
    return (
      <Popup>
        <div className="text-center">
          <div className="lbl mb-1" style={{ color: 'var(--frost)' }}>เอสเซนส์จากซาก</div>
          <div style={{ fontSize: 40 }}>{pop.essence.icon}</div>
          <h3 className="text-lg font-extrabold ttl mb-1">{pop.essence.name}</h3>
          <div className="text-sm mb-2" style={{ color: 'var(--ember)' }}>{SKILL_LIB[pop.essence.skill]?.name}</div>
          <div className="text-xs mb-3" style={{ color: 'var(--frost)' }}>{SKILL_LIB[pop.essence.skill]?.desc}</div>
          <div className="num text-xs mb-3" style={{ color: 'var(--gold)' }}>+{fmt(pop.gold)} ทอง</div>
          <button onClick={onClose} className="btn w-full py-3" style={{ background: 'var(--frost)', color: '#06121C' }}>เก็บไว้</button>
        </div>
      </Popup>
    );
  }

  if (pop.kind === 'rune') {
    const sig = pop.sig ? SIGNATURE_RUNES[pop.sig] : null;
    const style = RUNE_STYLE[runeStyle];
    return (
      <Popup borderColor="var(--ember)" glow="rgba(242,118,47,.35)">
        <div className="text-center">
          <div className="lbl mb-1" style={{ color: 'var(--ember)' }}>{sig ? 'สายเลือดแท้ตื่นขึ้น' : `${style.verb}สำเร็จ`}</div>
          <div style={{ fontSize: 44 }}>{sig ? sig.icon : style.icon}</div>
          <h3 className="text-lg font-extrabold ttl mb-1">{sig ? sig.name : runeName(pop.rune, runeStyle)}</h3>
          <div className="text-xs mb-4" style={{ color: 'var(--frost)' }}>{sig ? sig.desc : pop.rune.desc}</div>
          <button onClick={onClose} className="btn w-full py-3" style={{ background: 'linear-gradient(180deg,#F2762F,#B84C18)', color: '#2A1006' }}>รับพลังนี้ไว้</button>
        </div>
      </Popup>
    );
  }

  return (
    <Popup borderColor="rgba(121,196,232,.6)">
      <div className="lbl mb-1" style={{ color: 'var(--frost)' }}>quest complete</div>
      <div className="font-extrabold ttl mb-2">{pop.quest.text}</div>
      <div className="text-sm mb-4" style={{ color: 'var(--gold)' }}>{pop.quest.rewardText}</div>
      <button onClick={onClose} className="btn w-full py-3" style={{ background: 'var(--frost)', color: '#06121C' }}>รับทราบ</button>
    </Popup>
  );
}

/** รายงานสิ่งที่เกิดขึ้นระหว่างปิดแอป */
function OfflineReport({ report, name, onClose }) {
  return (
    <Popup>
      <div className="lbl mb-1" style={{ color: 'var(--ember)' }}>ระหว่างที่เจ้าไม่อยู่</div>
      <h2 className="text-lg font-extrabold ttl mb-3">{name}ยังล่าต่อไป</h2>
      <p className="text-xs mb-3" style={{ color: 'var(--ice)' }}>
        หายไป {fmtTime(report.seconds)}{report.capped ? ' (เพดาน 12 ชม.)' : ''} · ได้ {OFFLINE_EFF * 100}% ของอัตราปกติ
      </p>
      <div className="mb-4">
        <Row label="ทอง" value={`+${fmt(report.gold)}`} color="var(--gold)" />
        <Row label="หนัง" value={`+${fmt(report.hide)}`} color="#C9B08A" />
        {report.lv > 0 && <Row label="เลเวล" value={`+${report.lv}`} color="var(--frost)" />}
        {report.stageGain > 0 && <Row label="ด่าน" value={`+${report.stageGain}`} color="var(--gold)" />}
        {report.beasts > 0 && <Row label="มอนสเตอร์ที่จัดการเอง" value={report.beasts} color="var(--bone)" />}
        {report.items > 0 && <Row label="ไอเท็มที่เก็บได้" value={report.items} color="var(--ember)" />}
        {report.essences > 0 && <Row label="เอสเซนส์ที่ได้" value={report.essences} color="var(--frost)" />}
        {report.fragments > 0 && <Row label="ชิ้นส่วนปริศนา" value={`+${report.fragments} 🧩`} color="var(--gold)" />}
        {report.wasted > 0 && <Row label="เสียไปเพราะที่เก็บเต็ม" value={`−${fmt(report.wasted)}`} color="var(--blood)" />}
      </div>
      {(report.satiety < 30 || report.hydration < 30) && (
        <p className="text-xs mb-3" style={{ color: 'var(--blood)' }}>เจ้าอดอยากระหว่างที่ไม่อยู่ — ถิ่นนี้โหดเกินกำลังตอนนี้</p>
      )}
      <button onClick={onClose} className="btn w-full py-3" style={{ background: 'linear-gradient(180deg,#F2762F,#B84C18)', color: '#2A1006' }}>กลับเข้าเกม</button>
    </Popup>
  );
}

/** ข้อความแจ้งเตือนสั้นๆ ด้านล่าง */
function Toast({ text }) {
  if (!text) return null;
  return (
    <div style={{ position: 'fixed', bottom: 96, left: '50%', transform: 'translateX(-50%)', zIndex: 50, maxWidth: '90%', textAlign: 'center', padding: '8px 16px', fontSize: 14, fontWeight: 700, background: 'linear-gradient(180deg,#F2762F,#B84C18)', color: '#2A1006', borderRadius: 20, border: '2px solid rgba(0,0,0,.45)' }}>
      {text}
    </div>
  );
}

/* ===== src/screens/modals/StatusModal.jsx ===== */
/* ============================================================
   StatusModal.jsx — ค่าพลัง / รูน / สายเลือด / ฉายา
   การลงแต้มเป็นแบบ "ร่างก่อน แล้วยืนยัน" กดผิดถอยได้
   ============================================================ */






function StatusModal({ s, d, tab, onTab, onClose, draft, setDraft, onConfirmPts, onUpgradeWeapon, onUnlockRune }) {
  const B = s.blood;
  const style = RUNE_STYLE[B.runeStyle];
  const draftTotal = Object.values(draft).reduce((a, b) => a + b, 0);
  const free = s.pts - draftTotal;
  const knowRes = id => !B.mixed || s.known.res[id];

  const tabs = [['stat', 'ค่าพลัง']];
  if (s.unlocked.runes) tabs.push(['rune', 'รูน']);
  tabs.push(['blood', 'สายเลือด'], ['title', 'ฉายา']);

  return (
    <Modal icon="📊" title="สถานะ" tabs={tabs} activeTab={tab} onTab={onTab} onClose={onClose}
      right={<>แต้มว่าง <span className="fixw" style={{ minWidth: '3ch' }}>{free}</span></>}>

      {tab === 'stat' && (<>
        {STATS.map(x => (
          <div key={x.id} className="panel p-2.5 flex justify-between items-center">
            <div className="pr-2">
              <div className="text-sm font-bold">{x.name} <span className="num" style={{ color: 'var(--ice)' }}>{x.abbr}</span></div>
              <div style={{ fontSize: 10, color: 'var(--ice)' }}>{x.desc}</div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="num text-base font-bold fixw" style={{ minWidth: '5ch' }}>
                {s.base[x.id]}{draft[x.id] > 0 && <span style={{ color: 'var(--ember)' }}>+{draft[x.id]}</span>}
              </span>
              <button onClick={() => draft[x.id] > 0 && setDraft(v => ({ ...v, [x.id]: v[x.id] - 1 }))}
                disabled={!draft[x.id]} className="btn" style={{ width: 32, height: 32, background: 'var(--stone3)' }}>−</button>
              <button onClick={() => free > 0 && setDraft(v => ({ ...v, [x.id]: v[x.id] + 1 }))}
                disabled={free < 1} className="btn" style={{ width: 32, height: 32, background: 'var(--frost)', color: '#06121C' }}>+</button>
            </div>
          </div>
        ))}

        <div style={{ minHeight: 52 }}>
          {draftTotal > 0 && (
            <div className="flex gap-2">
              <button onClick={onConfirmPts} className="btn flex-1 py-3" style={{ background: 'linear-gradient(180deg,#F2762F,#B84C18)', color: '#2A1006' }}>ยืนยัน {draftTotal} แต้ม</button>
              <button onClick={() => setDraft({ str: 0, agi: 0, vit: 0, sen: 0, int: 0 })} className="btn px-5" style={{ background: 'var(--stone3)' }}>ยกเลิก</button>
            </div>
          )}
        </div>

        {s.unlocked.market && (
          <button onClick={onUpgradeWeapon} disabled={s.gold < d.upgradeCost} className="btn w-full p-3 text-left" style={{ background: 'var(--stone)' }}>
            <div className="flex justify-between">
              <div><div className="font-bold text-sm">อัปเกรดความเชี่ยวชาญอาวุธ <span className="num" style={{ color: 'var(--frost)' }}>Lv.{s.weaponLv || 1}</span></div>
                <div className="text-xs" style={{ color: 'var(--ice)' }}>เพิ่มพลังโจมตีรวม 15% ต่อเลเวล · อัปเกรดได้ไม่จำกัด</div></div>
              <div className="num text-sm self-end" style={{ color: 'var(--gold)' }}>{fmt(d.upgradeCost)}🪙</div>
            </div>
          </button>
        )}

        <div className="panel p-3">
          <Row label="พลังรวม" value={fmt(d.power)} color="var(--ember)" />
          <Row label="ดาเมจต่อการแตะ" value={fmt(d.tapDmg)} color="var(--bone)" />
          <Row label="ดาเมจอัตโนมัติ/วิ" value={fmt(d.autoDps)} color="var(--bone)" />
          <Row label="เนื้อ/หนัง/น้ำ ต่อวิ" value={`${fmt(d.meatRate)} · ${fmt(d.hideRate)} · ${fmt(d.waterRate)}`} color="var(--bone)" w={16} />
          <Row label="ค่าประสบการณ์ต่อวิ" value={fmt(d.expRate)} color="var(--frost)" />
          <Row label="ความเครียดสิ่งแวดล้อม" value={d.strain.toFixed(2)} color={d.strain > .6 ? 'var(--blood)' : 'var(--moss)'} />
        </div>
      </>)}

      {tab === 'rune' && (<>
        <div className="panel p-3 text-xs" style={{ color: 'var(--ice)' }}>
          {style.icon} เผ่าของเจ้าได้พลังผ่าน<b style={{ color: 'var(--bone)' }}>{style.label}</b> — รูนจะปรากฏเมื่อทำเงื่อนไขครบ
        </div>
        {s.runes.filter(r => r.startsWith('sig_')).map(r => {
          const g = SIGNATURE_RUNES[r.slice(4)];
          return (
            <div key={r} className="panel p-3" style={{ background: 'linear-gradient(160deg,#5E2A14,#2E1810)', borderColor: 'var(--ember)' }}>
              <div className="font-bold" style={{ color: 'var(--gold)' }}>{g.icon} {g.name}</div>
              <div className="text-xs" style={{ color: '#F0C8B8' }}>{g.desc}</div>
            </div>
          );
        })}
        {RUNES.map(r => {
          const got = s.runes.includes(r.id), ready = !got && r.req(s);
          return (
            <button key={r.id} onClick={() => ready && onUnlockRune(r)} disabled={!ready}
              className="btn w-full p-3 text-left"
              style={{ background: got ? 'linear-gradient(180deg,#2E4A2A,#1E301C)' : ready ? 'linear-gradient(180deg,#2A415A,#1A2C40)' : '#141F2C', borderColor: got ? 'var(--moss)' : ready ? 'var(--frost)' : undefined, opacity: got || ready ? 1 : .5, whiteSpace: 'normal' }}>
              <div className="flex justify-between items-center nowrap">
                <span className="text-sm font-bold">{got || ready ? runeName(r, B.runeStyle) : `${style.icon} รูนที่ยังไม่ปรากฏ`}</span>
                {got ? <span style={{ color: 'var(--moss)' }}>✓</span>
                  : ready ? <span className="text-xs" style={{ color: 'var(--gold)' }}>{style.verb}</span> : null}
              </div>
              <div className="text-xs" style={{ color: 'var(--ice)' }}>{got || ready ? r.desc : '???'}</div>
            </button>
          );
        })}
      </>)}

      {tab === 'blood' && (<>
        <div className="panel p-3">
          <div className="lbl mb-2" style={{ color: 'var(--ice)' }}>{B.mixed ? 'ไม่ทราบต้นกำเนิด' : B.raceName}</div>
          {B.traits.map(t => {
            const known = !B.mixed || s.known.traits[t];
            return (
              <div key={t} className="mb-2" style={{ opacity: known ? 1 : .45 }}>
                <div className="text-sm font-bold" style={{ color: known ? 'var(--ember)' : 'var(--ice)' }}>
                  {known ? TRAITS[t].name : 'ลักษณะที่ยังหลับใหล'}
                </div>
                <div className="text-xs" style={{ color: 'var(--ice)' }}>{known ? TRAITS[t].desc : 'จะตื่นขึ้นเมื่อเลเวลสูงพอ'}</div>
              </div>
            );
          })}
        </div>
        <div className="panel p-3">
          <div className="lbl mb-2" style={{ color: 'var(--ice)' }}>ความต้านทานรวม</div>
          {ENV.map(e => (
            <div key={e.id} className="flex items-center gap-2 py-1">
              <span style={{ fontSize: 15, width: 22 }}>{e.icon}</span>
              <span className="text-xs" style={{ width: 52, color: 'var(--ice)' }}>{e.name}</span>
              <div className="flex-1"><Bar value={(knowRes(e.id) ? d.res[e.id] : 0) * 100} color="var(--frost)" /></div>
              <span className="num text-xs fixw" style={{ minWidth: '5ch', color: knowRes(e.id) ? 'var(--frost)' : 'var(--ice)' }}>
                {knowRes(e.id) ? d.res[e.id].toFixed(2) : '???'}
              </span>
            </div>
          ))}
        </div>
      </>)}

      {tab === 'title' && (
        <div className="panel p-3">
          <div className="lbl mb-2" style={{ color: 'var(--ice)' }}>ตัวคูณจากฉายารวม ×{titleMult(s).toFixed(2)}</div>
          {TITLES.map(t => (
            <div key={t.id} className="flex justify-between text-xs py-1.5"
              style={{ opacity: s.titles.includes(t.id) ? 1 : .4, borderBottom: '1px solid rgba(0,0,0,.3)' }}>
              <span>{s.titles.includes(t.id) ? t.name : '???'} <span style={{ color: 'var(--ice)' }}>· {t.req}</span></span>
              <span className="num" style={{ color: 'var(--ember)' }}>×{t.mult.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

/* ===== src/screens/modals/ItemsModal.jsx ===== */
/* ============================================================
   ItemsModal.jsx — สวมใส่ / กระเป๋า / เอสเซนส์ / สัตว์เลี้ยง
   ============================================================ */






function ItemsModal({ s, d, tab, onTab, onClose, onSelect, onRepair, onToggleRepair, onAbsorb, onDropEssence, onFeedPet, onCraftPeptide, onUsePeptide }) {
  const tabs = [['eq', 'สวมใส่'], ['bag', 'กระเป๋า']];
  if (s.unlocked.essence) tabs.push(['ess', 'เอสเซนส์']);
  if (s.unlocked.pet) tabs.push(['pet', 'สัตว์เลี้ยง']);
  tabs.push(['alch', 'สกัดสาร']);

  return (
    <Modal icon="🎒" title="กระเป๋า" tabs={tabs} activeTab={tab} onTab={onTab} onClose={onClose}
      right={`${s.inv.length}/${BAG_SLOTS} ช่อง`}>

      {tab === 'eq' && (<>
        <button onClick={onToggleRepair} className="btn w-full py-2 text-xs"
          style={{ background: s.autoRepair ? 'var(--moss)' : 'var(--stone3)', color: s.autoRepair ? '#0C1A0A' : 'var(--ice)' }}>
          ซ่อมอัตโนมัติ {s.autoRepair ? 'เปิด' : 'ปิด'}
        </button>
        {['weapon', 'armor', 'charm'].map(slot => {
          const it = s.eq[slot];
          const base = it && baseById(it.base);
          const rar = it && RARITY[it.rar];
          return (
            <div key={slot} className="panel p-3">
              <div className="flex justify-between items-center mb-1 nowrap">
                <span className="text-sm font-bold">{SLOT_ICON[slot]} {SLOT_NAME[slot]}</span>
                <span className="text-xs truncate" style={{ color: rar ? rar.color : 'var(--ice)' }}>{base ? base.name : 'ว่าง'}</span>
              </div>
              {it && (<>
                <Bar value={it.dur} color={it.dur < 25 ? 'var(--blood)' : it.dur < 60 ? 'var(--ember)' : 'var(--moss)'} />
                {it.affixes.map((a, i) => (
                  <div key={i} className="num" style={{ fontSize: 10, color: 'var(--frost)' }}>· {affixById(a.id)?.fmt(a.v)}</div>
                ))}
                {base.wear === 0
                  ? <div className="text-xs mt-1" style={{ color: 'var(--moss)' }}>ไม่เสื่อมสภาพ</div>
                  : <button onClick={() => onRepair(slot)} className="btn w-full py-1.5 text-xs mt-2" style={{ background: 'var(--stone3)' }}>
                      ซ่อม {fmt(Math.floor(itemValue(it) * BASE.repairCostRatio * d.repairMul))}🪙 · ตอนนี้ {Math.round(it.dur)}%
                    </button>}
              </>)}
            </div>
          );
        })}
        <div className="panel p-2 text-xs" style={{ color: 'var(--ice)' }}>
          ถิ่นโหดทำให้ของพังเร็ว — ตอนนี้ ×{(1 + d.strain * 1.4).toFixed(2)}
        </div>
      </>)}

      {tab === 'bag' && (
        s.inv.length === 0
          ? <div className="panel p-4 text-xs text-center" style={{ color: 'var(--ice)' }}>กระเป๋าว่าง — ไอเท็มดรอปจากมอนสเตอร์หรือซื้อจากตลาด</div>
          : <div className="grid grid-cols-2 gap-2">
              {s.inv.map(it => <ItemCard key={it.uid} item={it} onClick={() => onSelect(it)} showValue sellMul={d.sellMul} />)}
            </div>
      )}

      {tab === 'ess' && (<>
        <div className="panel p-2 text-xs" style={{ color: 'var(--ice)' }}>
          ดูดซับแล้ว {s.essences.length}/{d.slots} ช่อง — แต่ละสายพันธุ์ให้สกิลไม่เหมือนกัน
        </div>
        {s.pending.map((e, i) => (
          <div key={'p' + i} className="panel p-3 flex justify-between items-center" style={{ borderColor: 'var(--ember)' }}>
            <div className="flex-1 pr-2">
              <div className="text-sm font-bold">{e.icon} {e.name}</div>
              <div className="text-xs" style={{ color: 'var(--frost)' }}>{SKILL_LIB[e.skill]?.desc}</div>
            </div>
            <button onClick={() => onAbsorb(e)} className="btn px-3 py-2 text-xs shrink-0"
              style={{ background: 'linear-gradient(180deg,#F2762F,#B84C18)', color: '#2A1006' }}>ดูดซับ</button>
          </div>
        ))}
        {s.essences.map((e, i) => (
          <div key={'a' + i} className="panel p-3 flex justify-between items-center" style={{ borderColor: 'var(--moss)' }}>
            <div className="flex-1 pr-2">
              <div className="text-sm font-bold">{e.icon} {e.name}</div>
              <div className="text-xs" style={{ color: 'var(--frost)' }}>{SKILL_LIB[e.skill]?.desc}</div>
            </div>
            <button onClick={() => onDropEssence(i)} className="text-xs shrink-0" style={{ color: 'var(--blood)' }}>ขับออก</button>
          </div>
        ))}
        {!s.essences.length && !s.pending.length && (
          <div className="panel p-4 text-xs text-center" style={{ color: 'var(--ice)' }}>ยังไม่มี — สังหารมอนสเตอร์เพื่อเก็บเอสเซนส์</div>
        )}
      </>)}

      {tab === 'pet' && (
        !s.pet
          ? <div className="panel p-4 text-xs text-center" style={{ color: 'var(--ice)' }}>ยังไม่มีสัตว์เลี้ยง — มีโอกาสได้จากการสังหารมอนสเตอร์ในถิ่นที่มันอยู่</div>
          : (() => {
            const p = petById(s.pet.id);
            return (
              <div className="panel p-3">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <div className="font-bold">{p.icon} {p.name} · Lv{s.pet.lv}</div>
                    <div className="text-xs" style={{ color: 'var(--ice)' }}>{p.desc}</div>
                  </div>
                  <button onClick={onFeedPet} disabled={!s.essences.length} className="btn px-3 py-2 text-xs"
                    style={{ background: 'linear-gradient(180deg,#F2762F,#B84C18)', color: '#2A1006' }}>ป้อนเอสเซนส์</button>
                </div>
                <Bar value={s.pet.hunger} color="var(--moss)" />
              </div>
            );
          })()
      )}

      {tab === 'alch' && (() => {
        const now = Date.now();
        const active = now < (s.peptideEnd || 0);
        const canCraft = (s.mycelium || 0) >= PEPTIDE.myceliumCost;
        const canUse = (s.peptides || 0) >= 1 && !active;
        return (<>
          <div className="panel p-3" style={{ borderColor: 'var(--moss)' }}>
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="font-bold text-sm">🧪 สารสกัดเปปไทด์ชีวภาพ</div>
                <div className="text-xs" style={{ color: 'var(--ice)' }}>
                  ออกฤทธิ์ {PEPTIDE.durationMs / 1000} วิ พลังรวม ×{PEPTIDE.powerMult} — ช่วยได้ทั้งดาเมจแตะมือและดาเมจอัตโนมัติ
                </div>
              </div>
              <span className="num font-bold shrink-0" style={{ color: 'var(--moss)' }}>มี {s.peptides || 0} ขวด</span>
            </div>
            <div className="flex gap-2">
              <button onClick={onCraftPeptide} disabled={!canCraft} className="btn flex-1 py-2 text-xs"
                style={{ background: canCraft ? 'var(--stone3)' : 'var(--stone2)', color: canCraft ? 'var(--bone)' : 'var(--ice)' }}>
                สกัดยา (ใช้ {PEPTIDE.myceliumCost}🍄) · มี {s.mycelium || 0}
              </button>
              <button onClick={onUsePeptide} disabled={!canUse} className="btn flex-1 py-2 text-xs"
                style={{ background: active ? 'linear-gradient(180deg,#6E9B5E,#2E4A2A)' : canUse ? 'linear-gradient(180deg,#F2762F,#B84C18)' : 'var(--stone2)', color: active || canUse ? '#fff' : 'var(--ice)' }}>
                {active ? `ออกฤทธิ์อยู่ · ${Math.ceil((s.peptideEnd - now) / 1000)} วิ` : 'ฉีดเข้าเส้นเลือด'}
              </button>
            </div>
          </div>
          <div className="panel p-2 text-xs text-center" style={{ color: 'var(--ice)' }}>
            ไมซีเลียมเห็ดแครง (🍄) มีโอกาสดรอปจากการสังหารมอนสเตอร์ โดยเฉพาะบอสที่การันตี {PEPTIDE.myceliumBossDrop} ชิ้นเสมอ
          </div>
        </>);
      })()}
    </Modal>
  );
}

/* ===== src/screens/modals/MarketModal.jsx ===== */
/* ============================================================
   MarketModal.jsx — ขายวัตถุดิบ / ซื้ออุปกรณ์ / อัปเกรดกระเป๋า
   ------------------------------------------------------------
   หมายเหตุ: ราคาถูกคำนวณจาก `marketNow` ซึ่งเดินช้ากว่านาฬิกาหลัก
   (ดู App.jsx) เพื่อไม่ให้ตัวเลขในปุ่มกระพริบทุก 0.2 วินาที
   ============================================================ */





function MarketModal({ s, d, marketNow, tab, onTab, onClose, onSellMat, onSellItem, onBuyBase, onBuyBag }) {
  return (
    <Modal icon="💰" title="พ่อค้าเร่" tabs={[['sell', 'ขาย'], ['gear', 'ซื้ออุปกรณ์'], ['bag', 'กระเป๋า']]}
      activeTab={tab} onTab={onTab} onClose={onClose} right={`🪙 ${fmt(s.gold)}`}>

      {tab === 'sell' && (<>
        <div className="panel p-2 text-xs" style={{ color: 'var(--ice)' }}>
          ราคาขึ้นลงตามเวลาและต่างกันในแต่ละถิ่น — ถือรอราคาดี หรือขายก่อนกระเป๋าเต็ม
        </div>
        {MATS.map(m => {
          const pm = priceMul(m.id, s.ground, marketNow);
          const unit = m.base * pm * d.sellMul * d.goldMul;
          const trend = pm > 1.12 ? { t: '▲ ราคาดี', c: 'var(--moss)' }
            : pm < .9 ? { t: '▼ ราคาตก', c: 'var(--blood)' }
              : { t: '● ปกติ', c: 'var(--ice)' };
          return (
            <div key={m.id} className="panel p-3">
              <div className="flex justify-between items-baseline mb-1 nowrap">
                <span className="font-bold">{m.icon} {m.name}</span>
                <span className="num text-xs" style={{ color: trend.c }}>
                  {trend.t} · <span className="fixw" style={{ minWidth: '6ch' }}>{unit.toFixed(2)}</span>🪙
                </span>
              </div>
              <div className="num text-xs mb-2" style={{ color: 'var(--ice)' }}>
                มีอยู่ {fmt(s[m.id])}{m.keep ? ' · เนื้อคืออาหาร อย่าขายหมด' : ''}
              </div>
              <div className="flex gap-2">
                {[[.5, 'ครึ่ง'], [1, 'ทั้งหมด']].map(([f, label]) => (
                  <button key={label} onClick={() => onSellMat(m.id, f)} disabled={s[m.id] < 1}
                    className="btn flex-1 py-2 text-xs" style={{ background: 'linear-gradient(180deg,#F0C24A,#B8901E)', color: '#2A1E06' }}>
                    ขาย{label} · <span className="num fixw" style={{ minWidth: '6ch' }}>{fmt(Math.floor(Math.floor(s[m.id] * f) * unit))}</span>🪙
                  </button>
                ))}
              </div>
            </div>
          );
        })}
        {s.inv.length > 0 && (
          <div className="panel p-3">
            <div className="lbl mb-2" style={{ color: 'var(--ice)' }}>ขายไอเท็ม</div>
            <div className="grid grid-cols-2 gap-2">
              {s.inv.map(it => <ItemCard key={it.uid} item={it} onClick={() => onSellItem(it)} showValue sellMul={d.sellMul} />)}
            </div>
          </div>
        )}
      </>)}

      {tab === 'gear' && (<>
        <div className="panel p-2 text-xs" style={{ color: 'var(--ice)' }}>พ่อค้าขายแค่ของสามัญ — ของดีต้องไปเอาจากมอนสเตอร์</div>
        {BASES.filter(b => b.lv <= s.lv + 3).map(b => {
          const cost = Math.floor(b.price * BASE.shopMarkup);
          const ok = s.gold >= cost && s.inv.length < BAG_SLOTS;
          return (
            <button key={b.id} onClick={() => onBuyBase(b)} disabled={!ok} className="btn w-full p-3 text-left" style={{ background: 'var(--stone)' }}>
              <div className="flex justify-between">
                <div>
                  <div className="font-bold text-sm">{b.name}</div>
                  <div className="text-xs" style={{ color: 'var(--ice)' }}>
                    {b.power ? `พลัง ×${b.power}` : b.resAll ? `ต้านทานทุกชนิด +${b.resAll}` : 'หิว/กระหายช้าลง'} · ต้องเลเวล {b.lv}
                  </div>
                </div>
                <div className="num text-sm self-end" style={{ color: 'var(--gold)' }}>{fmt(cost)}🪙</div>
              </div>
            </button>
          );
        })}
      </>)}

      {tab === 'bag' && (<>
        <div className="panel p-2 text-xs" style={{ color: 'var(--ice)' }}>
          ที่เก็บเต็มแล้วของที่หามาได้จะหายไปเปล่าๆ
          {s.wasted > 0 && <span className="num" style={{ color: 'var(--blood)' }}> · เสียไปแล้ว {fmt(s.wasted)}</span>}
        </div>
        {BAGS.map(b => {
          const current = b.lv === s.bag, next = b.lv === s.bag + 1;
          return (
            <div key={b.lv} className="panel p-3 flex justify-between items-center"
              style={{ opacity: b.lv <= s.bag + 1 ? 1 : .45, borderColor: current ? 'var(--ember)' : undefined }}>
              <div>
                <div className="font-bold text-sm">{b.name}</div>
                <div className="num text-xs" style={{ color: 'var(--ice)' }}>ความจุ ×{b.mult}</div>
              </div>
              {current
                ? <span className="num text-xs" style={{ color: 'var(--ember)' }}>ใช้อยู่</span>
                : next
                  ? <button onClick={onBuyBag} disabled={s.gold < b.cost} className="btn px-3 py-2 text-xs"
                      style={{ background: 'linear-gradient(180deg,#F0C24A,#B8901E)', color: '#2A1E06' }}>{fmt(b.cost)}🪙</button>
                  : <span className="num text-xs" style={{ color: 'var(--ice)' }}>{fmt(b.cost)}🪙</span>}
            </div>
          );
        })}
      </>)}
    </Modal>
  );
}

/* ===== src/screens/modals/WorldModal.jsx ===== */
/* ============================================================
   WorldModal.jsx — ถิ่นล่าสัตว์ / เส้นทางย่อย / สภาพแวดล้อม
   ============================================================ */



function WorldModal({ s, d, now, tab, onTab, onClose, onMigrate, onSetPath }) {
  const knowRes = id => !s.blood.mixed || s.known.res[id];
  const paths = pathsFor(d.gr);

  return (
    <Modal icon="🗺️" title="แผนที่โลก" tabs={[['land', 'ถิ่นล่าสัตว์'], ['path', 'เส้นทาง'], ['env', 'สภาพแวดล้อม']]}
      activeTab={tab} onTab={onTab} onClose={onClose}>

      {tab === 'land' && (<>
        <div style={{ minHeight: 34 }}>
          {d.traveling && (
            <div className="panel p-2 text-xs" style={{ color: 'var(--ember)' }}>
              กำลังเดินทาง · ผลผลิต 25% · อีก <span className="num fixw" style={{ minWidth: '3ch' }}>{Math.ceil((s.travelEnd - now) / 1000)}</span> วิ
            </div>
          )}
        </div>
        {GROUNDS.map(g => {
          const unlocked = s.lv >= g.unlock, here = g.id === s.ground;
          return (
            <button key={g.id} onClick={() => onMigrate(g)} disabled={!unlocked || here || d.traveling}
              className="btn w-full p-3 text-left"
              style={{ background: here ? 'linear-gradient(180deg,#5E3A1A,#2E1C0C)' : 'var(--stone)', borderColor: here ? 'var(--ember)' : undefined, opacity: unlocked ? 1 : .4, whiteSpace: 'normal' }}>
              <div className="flex justify-between nowrap">
                <span className="font-bold">{g.icon} {unlocked ? g.name : '???'}</span>
                <span className="num text-xs" style={{ color: here ? 'var(--gold)' : 'var(--ice)' }}>
                  {here ? 'อยู่ที่นี่' : unlocked ? 'ย้ายมา →' : `ต้องเลเวล ${g.unlock}`}
                </span>
              </div>
              {unlocked && (<>
                <div className="num text-xs mt-1" style={{ color: 'var(--frost)' }}>
                  🥩×{g.meat} 🦴×{g.hide} 💧×{g.water} EXP×{g.exp} ของดี×{g.drop}
                </div>
                <div className="flex gap-2 mt-1">
                  {Object.entries(g.threat).map(([k, v]) => (
                    <span key={k} className="num text-xs" style={{ color: v > (d.res[k] || 0) ? 'var(--blood)' : 'var(--moss)' }}>
                      {envById(k).icon}{v.toFixed(2)}
                    </span>
                  ))}
                </div>
              </>)}
            </button>
          );
        })}
      </>)}

      {tab === 'path' && (<>
        <div className="panel p-3">
          <svg viewBox="0 0 300 44" style={{ width: '100%', height: 40 }}>
            <line x1="34" y1="22" x2="266" y2="22" stroke="rgba(255,255,255,.18)" strokeWidth="3" strokeDasharray="6 5" />
            {paths.map((p, i) => (
              <circle key={p.id} cx={34 + i * 116} cy="22" r="9" fill={p.id === s.path ? '#F2762F' : '#1A2C40'} stroke="#0A1119" strokeWidth="3" />
            ))}
          </svg>
          <div className="text-xs text-center" style={{ color: 'var(--ice)' }}>เส้นทางย่อยใน{d.gr.name}</div>
        </div>
        {paths.map(p => (
          <button key={p.id} onClick={() => onSetPath(p.id)} className="btn w-full p-3 text-left"
            style={{ background: p.id === s.path ? 'linear-gradient(180deg,#5E3A1A,#2E1C0C)' : 'var(--stone)', borderColor: p.id === s.path ? 'var(--ember)' : undefined, whiteSpace: 'normal' }}>
            <div className="flex justify-between nowrap">
              <span className="font-bold">{p.icon} {p.name}</span>
              <span className="num text-xs" style={{ color: 'var(--frost)' }}>ภัย×{p.threatMul} ของ×{p.dropMul} ทอง×{p.goldMul}</span>
            </div>
            <div className="text-xs" style={{ color: 'var(--ice)' }}>{p.desc}</div>
          </button>
        ))}
      </>)}

      {tab === 'env' && (
        <div className="panel p-3">
          <div className="flex justify-between mb-2 nowrap">
            <span className="lbl" style={{ color: 'var(--ice)' }}>ภัย vs ความต้านทาน</span>
            <span className="num text-xs" style={{ color: d.strain > .6 ? 'var(--blood)' : 'var(--moss)' }}>
              ความเครียด <span className="fixw" style={{ minWidth: '5ch' }}>{d.strain.toFixed(2)}</span>
            </span>
          </div>
          {ENV.map(e => {
            const net = Math.max(0, d.thr[e.id] - d.res[e.id]);
            return (
              <div key={e.id} className="flex items-center gap-2 py-1.5">
                <span style={{ fontSize: 15, width: 22, opacity: d.thr[e.id] > .05 ? 1 : .3 }}>{e.icon}</span>
                <div className="flex-1"><Bar value={Math.min(100, d.thr[e.id] * 100)} color={net > 0 ? 'var(--blood)' : 'var(--moss)'} /></div>
                <span className="num text-xs fixw" style={{ minWidth: '11ch', color: 'var(--ice)' }}>
                  {d.thr[e.id].toFixed(2)} / {knowRes(e.id) ? d.res[e.id].toFixed(2) : '?'}
                </span>
              </div>
            );
          })}
          <div className="text-xs mt-2" style={{ color: 'var(--ice)' }}>
            แถบแดง = ทนไม่ไหว · ความเครียดลดพลัง เพิ่มความหิว ทำให้ของพังเร็ว
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ===== src/screens/modals/SysModal.jsx ===== */
/* ============================================================
   SysModal.jsx — จุติ (เกิดใหม่) + วัตถุโบราณ / เครื่องมือทดสอบ + สถิติ + ล้างเซฟ
   ------------------------------------------------------------
   ระบบด่าน/เวฟ/บอส: shardGain คำนวณจาก "ด่านสูงสุด" ไม่ใช่ทองสะสมแล้ว
   วัตถุโบราณ (ARTIFACTS) คือบัฟถาวรที่ติดตัวข้ามชาติ ต่างจากรูนที่ต้อง
   ปลดล็อกใหม่ทุกครั้งที่เกิดใหม่
   ============================================================ */






function SysModal({ s, shardGain, onClose, onRebirth, onUpgradeArt, onSimAway, onWipe }) {
  const [tab, setTab] = useState('rebirth');
  const [confirm, setConfirm] = useState(false);

  return (
    <Modal icon="⚙️" title="ระบบ และการจุติ" tabs={[['rebirth', 'จุติ/วัตถุโบราณ'], ['sys', 'ตั้งค่า']]}
      activeTab={tab} onTab={setTab} onClose={onClose} right={<>✨ ความทรงจำ <span className="fixw" style={{ minWidth: '4ch' }}>{s.shards}</span></>}>

      {tab === 'rebirth' && (<>
        {s.unlocked.rebirth ? (
          <div className="panel p-3" style={{ borderColor: 'var(--blood)' }}>
            <div className="lbl mb-1" style={{ color: 'var(--ice)' }}>วัฏจักรเกิดใหม่ (Rebirth)</div>
            <p className="text-xs mb-2" style={{ color: 'var(--ice)' }}>
              รีเซ็ตเลเวล ทอง และด่านกลับไปเริ่มต้นใหม่ เพื่อแลกกับเศษความทรงจำสำหรับอัปเกรดวัตถุโบราณแบบถาวร
              — วัตถุโบราณจะติดตัวไปด้วย
            </p>
            <div className="num text-sm mb-3 font-bold nowrap" style={{ color: 'var(--frost)' }}>
              ด่านปัจจุบัน {s.stage} → รับความทรงจำ ✨<span className="fixw" style={{ minWidth: '3ch' }}>{shardGain}</span>
            </div>
            <button onClick={onRebirth} disabled={shardGain < 1} className="btn w-full py-3"
              style={{ background: shardGain >= 1 ? 'linear-gradient(180deg,#B84040,#6E2020)' : 'var(--stone3)', color: shardGain >= 1 ? 'var(--bone)' : 'var(--ice)' }}>
              {shardGain >= 1 ? `สละร่างปัจจุบัน · เกิดใหม่รับ ✨${shardGain}` : `ต้องไปให้ถึงด่าน ${STAGE.rebirthStageReq} ขึ้นไปก่อน`}
            </button>
          </div>
        ) : (
          <div className="panel p-3 text-xs text-center" style={{ color: 'var(--ice)' }}>ระบบจุติยังไม่ปลดล็อก</div>
        )}

        <div className="lbl mt-3 mb-1" style={{ color: 'var(--gold)' }}>วัตถุโบราณข้ามชาติ</div>
        {ARTIFACTS.map(a => {
          const lv = (s.artifacts || {})[a.id] || 0;
          const cost = artifactCost(a, lv);
          const canBuy = s.shards >= cost;
          return (
            <div key={a.id} className="panel p-3 flex justify-between items-center"
              style={{ borderColor: lv > 0 ? 'var(--gold)' : undefined }}>
              <div className="pr-2">
                <div className="font-bold text-sm nowrap">
                  {a.name} <span className="num" style={{ color: 'var(--gold)' }}>Lv.{lv}</span>
                </div>
                <div className="text-xs" style={{ color: 'var(--ice)' }}>
                  {a.desc} <span className="num" style={{ color: 'var(--moss)' }}>(ปัจจุบัน +{a.getV(lv)}{a.id === 'a_boss' ? ' วิ' : '%'})</span>
                </div>
              </div>
              <button onClick={() => onUpgradeArt(a.id, cost)} disabled={!canBuy} className="btn px-3 py-2 text-xs shrink-0 num nowrap"
                style={{ background: canBuy ? 'linear-gradient(180deg,#F0C24A,#B8901E)' : 'var(--stone3)', color: canBuy ? '#2A1E06' : 'var(--ice)' }}>
                {fmt(cost)} ✨
              </button>
            </div>
          );
        })}
      </>)}

      {tab === 'sys' && (<>
        <div className="panel p-3">
          <Row label="ด่านสูงสุดที่เคยถึง" value={s.stage} color="var(--frost)" w={6} />
          <Row label="สังหารมอนสเตอร์" value={s.beasts} color="var(--bone)" w={6} />
          <Row label="ล่าด้วยมือ" value={s.hunts} color="var(--bone)" w={6} />
          <Row label="ขายของ" value={`${s.sold} ครั้ง`} color="var(--bone)" w={8} />
          <Row label="ย้ายถิ่น" value={`${s.migrations} ครั้ง`} color="var(--bone)" w={8} />
          <Row label="ผ่านฤดูหนาว" value={`${s.winters} ครั้ง`} color="var(--bone)" w={8} />
          <Row label="ตัวคูณฉายา" value={`×${titleMult(s).toFixed(2)}`} color="var(--ember)" w={7} />
        </div>

        <div className="panel p-3">
          <div className="lbl mb-2" style={{ color: 'var(--ice)' }}>เครื่องมือทดสอบ</div>
          <div className="flex gap-2">
            {[1, 4, 12].map(h => (
              <button key={h} onClick={() => onSimAway(h)} className="btn flex-1 py-2 text-xs num"
                style={{ background: 'var(--stone3)', color: 'var(--frost)' }}>ปิดแอป {h} ชม.</button>
            ))}
          </div>
        </div>

        {!confirm
          ? <button onClick={() => setConfirm(true)} className="w-full py-2 text-xs" style={{ color: 'var(--blood)' }}>ล้างเซฟทั้งหมด</button>
          : <div className="flex gap-2">
              <button onClick={onWipe} className="btn flex-1 py-2 text-xs" style={{ background: 'var(--blood)' }}>ยืนยันล้าง</button>
              <button onClick={() => setConfirm(false)} className="btn flex-1 py-2 text-xs" style={{ background: 'var(--stone3)' }}>ยกเลิก</button>
            </div>}
      </>)}
    </Modal>
  );
}

/* ===== src/App.jsx ===== */
/* ============================================================
   App.jsx — ตัวประสานงาน
   ------------------------------------------------------------
   หน้าที่: เดินลูปเกม, เก็บ state, แจกฟังก์ชัน action ให้หน้าจอต่างๆ
   ไม่มีสูตรคำนวณอยู่ในไฟล์นี้ — สูตรทั้งหมดอยู่ที่ core/derive.js กับ core/simulate.js

   นาฬิกาสามชั้น (แก้ปัญหาหน้าจอกระตุก):
     tickRef  — เดินจริงทุก 200ms  (จำลองเกม)
     now      — อัปเดต state ทุก 500ms (ตัวเลขบนจอ)
     marketNow— อัปเดตทุก 2 วินาที   (ราคาสินค้า ไม่ต้องไหลเร็ว)
   ============================================================ */

















const EMPTY_DRAFT = { str: 0, agi: 0, vit: 0, sen: 0, int: 0 };

function App() {
  const [s, setS] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [marketNow, setMarketNow] = useState(Date.now());

  const [modal, setModal] = useState(null);
  const [subTab, setSubTab] = useState({});
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [selected, setSelected] = useState(null);
  const [pop, setPop] = useState(null);
  const [report, setReport] = useState(null);
  const [toast, setToast] = useState(null);
  const [carry, setCarry] = useState(null);       // ความทรงจำที่ยกข้ามชาติ

  const lastTick = useRef(Date.now());
  const stateRef = useRef(null);
  const fxRef = useRef({ hit: 0, nums: [], battle: null, ground: 'pine', skillOn: false, pet: null, shake: 0, particles: [] });
  stateRef.current = s;

  const tab = key => subTab[modal] || key;
  const setTab = v => setSubTab(x => ({ ...x, [modal]: v }));

  /* ---------------- โหลดเซฟ + คำนวณ offline ---------------- */
  useEffect(() => {
    (async () => {
      const saved = await loadSave();
      if (saved) {
        const off = runOffline(saved, saved.lastSaved, Date.now());
        if (off) { setS(off.state); setReport(off.report); }
        else setS({ ...saved, lastSaved: Date.now() });
      }
      lastTick.current = Date.now();
      setLoaded(true);
    })();
  }, []);

  /* ---------------- ลูปเกม ---------------- */
  useEffect(() => {
    if (!loaded || !s) return;
    let uiAcc = 0, mkAcc = 0;

    const id = setInterval(() => {
      const t = Date.now();
      const dt = Math.min((t - lastTick.current) / 1000, 5);
      lastTick.current = t;

      uiAcc += dt * 1000; mkAcc += dt * 1000;
      if (uiAcc >= UI_CLOCK_MS) { uiAcc = 0; setNow(t); }
      if (mkAcc >= 2000) { mkAcc = 0; setMarketNow(t); }

      setS(prev => {
        if (!prev) return prev;
        let n = simulate(prev, dt, t);

        if (n._msg) { setToast(n._msg); delete n._msg; }
        if (n._lv) { setToast(`เลเวลอัป! → ${n._lv} · ได้ 3 แต้มพลัง`); delete n._lv; }
        if (n._quest) { setPop({ kind: 'quest', quest: n._quest }); delete n._quest; }
        if (n._flee) {
          if (n._flee.isBoss) {
            setToast('เวลาหมด! ปราบบอสไม่สำเร็จ ถอยกลับไปตั้งหลักใหม่');
            n.stageKills = 0;                    // บทลงโทษ: กลับไปเริ่มเวฟใหม่ในด่านเดิม
          } else {
            setToast('มอนสเตอร์หนีไปได้');
          }
          delete n._flee;
        }
        if (n._kill) { n = resolveKill(n, n._kill, t, setPop, setToast); }

        n = maybeSpawn(n, t);

        // ส่งข้อมูลให้ตัววาดฉากผ่าน ref (ไม่ทำให้ React re-render)
        fxRef.current.battle = n.battle;
        fxRef.current.ground = n.ground;
        fxRef.current.skillOn = t < n.skillEnd || t < (n.peptideEnd || 0);
        fxRef.current.pet = n.pet;
        return n;
      });
    }, TICK_MS);

    return () => clearInterval(id);
  }, [loaded, !!s]);

  /* ---------------- บันทึกอัตโนมัติ ---------------- */
  useEffect(() => {
    if (!loaded) return;
    const id = setInterval(() => writeSave(stateRef.current), 5000);
    const bye = () => writeSave(stateRef.current);
    window.addEventListener('beforeunload', bye);
    const vis = () => { if (document.hidden) bye(); };
    document.addEventListener('visibilitychange', vis);
    return () => {
      clearInterval(id);
      window.removeEventListener('beforeunload', bye);
      document.removeEventListener('visibilitychange', vis);
    };
  }, [loaded]);

  useEffect(() => { if (toast) { const i = setTimeout(() => setToast(null), 2300); return () => clearTimeout(i); } }, [toast]);

  /* ---------------- หน้าจอโหลด / สร้างตัวละคร ---------------- */
  if (!loaded) {
    return (
      <div style={{ minHeight: '100vh', background: '#0A1119', color: '#436079', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Theme />กำลังเชื่อมต่อกับระบบ…
      </div>
    );
  }

  if (!s) {
    return (
      <>
        <Theme />
        <CharacterCreate
          initialName={carry?.name || ''}
          onCreate={(name, mode, raceId, classId) => {
            setS(newChar(name, makeBlood(mode, raceId, classId), carry || {}));
            setCarry(null);
            setDraft(EMPTY_DRAFT);
          }}
        />
      </>
    );
  }

  /* ---------------- ค่าที่คำนวณสำหรับ UI ---------------- */
  const d = derive(s, now);
  const draftTotal = Object.values(draft).reduce((a, b) => a + b, 0);
  const shardGain = s.stage > STAGE.rebirthStageReq
    ? Math.floor(Math.pow(s.stage - STAGE.rebirthStageReq, STAGE.shardExponent)) : 0;

  /* ---------------- Actions ---------------- */
  const tap = () => {
    const t = Date.now();
    fxRef.current.hit = t;
    const crit = Math.random() < BASE.critChance;
    const dmg = d.tapDmg * (crit ? BASE.critMult : 1);

    // สั่นหน้าจอ — คริติคอลสั่นแรงกว่า (ค่อยๆ หายไปเองใน PixelScene)
    fxRef.current.shake = crit ? 12 : 5;

    // พ่นอนุภาคกระทบ ใช้สีของมอนสเตอร์ที่กำลังสู้ผสมกับสีขาว (แสงกระทบ)
    const hitColor = s.battle && s.battle.species.pal ? s.battle.species.pal[1] : '#9B3838';
    for (let i = 0; i < (crit ? 15 : 7); i++) {
      fxRef.current.particles.push({
        x: 250 + (Math.random() - 0.5) * 20,
        y: 120 + (Math.random() - 0.5) * 20,
        vx: (Math.random() - 0.5) * 8 - 2,
        vy: -Math.random() * 6 - 2,
        life: 1.0,
        color: Math.random() > 0.5 ? '#FFFFFF' : hitColor,
        size: Math.random() * 4 + 2,
      });
    }
    if (fxRef.current.particles.length > 120) fxRef.current.particles.splice(0, fxRef.current.particles.length - 120);

    fxRef.current.nums.push({ v: (crit ? '★' : '') + fmt(dmg), x: 220 + rnd(-30, 30), t0: t, crit });
    if (fxRef.current.nums.length > 14) fxRef.current.nums.shift();

    setS(p => {
      const n = { ...p, hunts: p.hunts + 1, exp: p.exp + dmg * .06, stamina: Math.max(0, (p.stamina ?? STAMINA.max) - STAMINA.tapCost) };
      if (p.battle) {
        const hp = p.battle.hp - dmg;
        if (hp <= 0) { n.battle = null; n._kill = { ...p.battle, hp: 0 }; }
        else n.battle = { ...p.battle, hp };
      } else {
        const g = Math.floor(d.power * .04 * d.goldMul);
        n.gold = p.gold + g; n.totalGold = p.totalGold + g;
        n.meat = Math.min(d.capMeat, p.meat + d.power * .02);
      }
      return n;
    });
  };

  const useSkill = () => {
    if (now < s.skillReady || !s.unlocked.skill) return;
    const t = Date.now(), sk = s.blood.cls.skill;
    setS(p => {
      const n = { ...p, skillReady: t + sk.cd * 1000, skillUses: p.skillUses + 1 };
      if (sk.type === 'water') n.water = d.capWater;
      else if (sk.type === 'craft') {
        n.eq = Object.fromEntries(Object.entries(p.eq).map(([k, v]) => [k, v ? { ...v, dur: 100 } : v]));
        n.skillEnd = t + sk.dur * 1000;
      } else if (sk.type === 'bait' && !p.battle) {
        n.skillEnd = t + sk.dur * 1000;
        n.battle = makeBattle(p, d, t, false);
      } else {
        n.skillEnd = t + (sk.dur || 30) * 1000;
      }
      return n;
    });
  };

  const confirmPts = () => {
    if (!draftTotal) return;
    setS(p => {
      const base = { ...p.base };
      Object.keys(draft).forEach(k => { base[k] += draft[k]; });
      return { ...p, base, pts: p.pts - draftTotal, spent: p.spent + draftTotal };
    });
    setDraft(EMPTY_DRAFT);
    setToast('ลงแต้มพลังแล้ว');
  };

  const upgradeWeapon = () => {
    if (s.gold < d.upgradeCost) return;
    setS(p => ({ ...p, gold: p.gold - d.upgradeCost, weaponLv: (p.weaponLv || 1) + 1 }));
  };

  const sellMat = (id, frac) => {
    const amt = Math.floor(s[id] * frac);
    if (amt < 1) return;
    const mat = MATS.find(m => m.id === id);
    const g = Math.floor(amt * mat.base * priceMul(id, s.ground, marketNow) * d.sellMul * d.goldMul);
    setS(p => ({ ...p, [id]: p[id] - amt, gold: p.gold + g, totalGold: p.totalGold + g, sold: p.sold + 1 }));
    setToast(`ขาย ${fmt(amt)} ได้ ${fmt(g)} ทอง`);
  };

  const sellItem = it => {
    const v = Math.floor(itemValue(it) * BASE.sellItemRatio * d.sellMul);
    setS(p => ({ ...p, inv: p.inv.filter(x => x.uid !== it.uid), gold: p.gold + v, totalGold: p.totalGold + v, sold: p.sold + 1 }));
    setSelected(null);
    setToast(`ขายได้ ${fmt(v)} ทอง`);
  };

  /** ตีบวกไอเท็ม — หาไอเท็มให้เจอไม่ว่าจะอยู่ในกระเป๋าหรือสวมใส่อยู่ แล้วเพิ่ม upgrade ทีละ 1 */
  const enhanceItem = it => {
    const cost = getEnhanceCost(it);
    if (s.gold < cost.gold || s.fragments < cost.fragments) return;
    setS(p => {
      const bump = x => x.uid === it.uid ? { ...x, upgrade: (x.upgrade || 0) + 1 } : x;
      const eqSlot = Object.entries(p.eq).find(([, v]) => v && v.uid === it.uid);
      const n = { ...p, gold: p.gold - cost.gold, fragments: p.fragments - cost.fragments };
      if (eqSlot) n.eq = { ...p.eq, [eqSlot[0]]: bump(eqSlot[1]) };
      else n.inv = p.inv.map(bump);
      return n;
    });
    setSelected(sel => sel && sel.uid === it.uid ? { ...sel, upgrade: (sel.upgrade || 0) + 1 } : sel);
    setToast('ตีบวกสำเร็จ');
  };

  /** คราฟต์ยาสกัดเปปไทด์จากไมซีเลียม */
  const craftPeptide = () => {
    if ((s.mycelium || 0) < PEPTIDE.myceliumCost) return;
    setS(p => ({ ...p, mycelium: p.mycelium - PEPTIDE.myceliumCost, peptides: (p.peptides || 0) + 1 }));
    setToast('สกัดยาสำเร็จ');
  };

  /** ใช้ยา — บัฟพลังรวม ×2.5 ชั่วคราว ช่วยได้ทั้งดาเมจแตะมือและดาเมจอัตโนมัติ (ต่างจากยาสามัญที่ผูกแค่ทักษะ) */
  const usePeptide = () => {
    const t = Date.now();
    if ((s.peptides || 0) < 1 || t < (s.peptideEnd || 0)) return;
    setS(p => ({ ...p, peptides: p.peptides - 1, peptideEnd: t + PEPTIDE.durationMs }));
    setToast('ฤทธิ์ยากำลังพลุ่งพล่าน!');
  };

  const buyBase = b => {
    const cost = Math.floor(b.price * BASE.shopMarkup);
    if (s.gold < cost || s.inv.length >= BAG_SLOTS) return;
    setS(p => ({ ...p, gold: p.gold - cost, inv: [...p.inv, { uid: nextUid(), base: b.id, rar: 0, ilvl: Math.max(1, p.lv), dur: 100, affixes: [] }] }));
    setToast('ซื้อแล้ว อยู่ในกระเป๋า');
  };

  const buyBag = () => {
    const next = BAGS[s.bag];
    if (!next || s.gold < next.cost) return;
    setS(p => ({ ...p, gold: p.gold - next.cost, bag: p.bag + 1 }));
    setToast(`อัปเกรดเป็น${next.name}`);
  };

  const equip = it => {
    const slot = baseById(it.base).slot;
    setS(p => {
      const old = p.eq[slot];
      return { ...p, eq: { ...p.eq, [slot]: it }, inv: [...p.inv.filter(x => x.uid !== it.uid), ...(old ? [old] : [])] };
    });
    setSelected(null);
  };

  const repair = slot => {
    const it = s.eq[slot];
    if (!it) return;
    const cost = Math.floor(itemValue(it) * BASE.repairCostRatio * d.repairMul);
    if (s.gold < cost) return;
    setS(p => ({ ...p, gold: p.gold - cost, eq: { ...p.eq, [slot]: { ...it, dur: 100 } } }));
  };

  const migrate = g => {
    if (s.lv < g.unlock || g.id === s.ground || d.traveling) return;
    setS(p => ({ ...p, ground: g.id, path: 'main', travelEnd: Date.now() + 18000, migrations: p.migrations + 1, expose: zeroEnv(), battle: null }));
    setToast(`ออกเดินทางสู่${g.name}`);
    setModal(null);
  };

  const setPath = pid => {
    if (pid === s.path) return;
    setS(p => ({ ...p, path: pid, pathChanges: p.pathChanges + 1, battle: null }));
    setToast('เปลี่ยนเส้นทางแล้ว');
  };

  const absorb = e => {
    if (s.essences.length >= d.slots) { setToast('ช่องเอสเซนส์เต็ม'); return; }
    setS(p => {
      const i = p.pending.indexOf(e);
      return { ...p, essences: [...p.essences, e], pending: p.pending.filter((_, j) => j !== i) };
    });
  };

  const feedPet = () => {
    if (!s.pet || !s.essences.length) return;
    setS(p => ({ ...p, essences: p.essences.slice(0, -1), pet: { ...p.pet, lv: p.pet.lv + 1 } }));
    setToast('สัตว์เลี้ยงแข็งแกร่งขึ้น');
  };

  const unlockRune = r => {
    if (s.runes.includes(r.id) || !r.req(s)) return;
    setS(p => ({ ...p, runes: [...p.runes, r.id] }));
    setPop({ kind: 'rune', rune: r });
  };

  const rebirth = () => {
    if (shardGain < 1) return;
    setCarry({ shards: s.shards + shardGain, rebirths: s.rebirths + 1, name: s.name, artifacts: s.artifacts });
    setS(null);
    setModal(null);
  };

  const upgradeArt = (id, cost) => {
    if (s.shards < cost) return;
    setS(p => ({ ...p, shards: p.shards - cost, artifacts: { ...p.artifacts, [id]: (p.artifacts[id] || 0) + 1 } }));
  };

  const simAway = h => {
    const off = runOffline(s, Date.now() - h * 3600_000, Date.now());
    if (off) { setS(off.state); setReport(off.report); setModal(null); }
  };

  const wipe = () => { setCarry(null); setS(null); setModal(null); setDraft(EMPTY_DRAFT); };

  /* ---------------- เรนเดอร์ ---------------- */
  return (
    <>
      <Theme />
      <HuntScreen s={s} d={d} now={now} fxRef={fxRef} onTap={tap} onSkill={useSkill} onOpen={setModal} />

      {modal === 'status' && (
        <StatusModal s={s} d={d} tab={tab('stat')} onTab={setTab} onClose={() => setModal(null)}
          draft={draft} setDraft={setDraft} onConfirmPts={confirmPts} onUpgradeWeapon={upgradeWeapon} onUnlockRune={unlockRune} />
      )}
      {modal === 'items' && (
        <ItemsModal s={s} d={d} tab={tab('eq')} onTab={setTab} onClose={() => setModal(null)}
          onSelect={setSelected} onRepair={repair} onToggleRepair={() => setS(p => ({ ...p, autoRepair: !p.autoRepair }))}
          onAbsorb={absorb} onDropEssence={i => setS(p => ({ ...p, essences: p.essences.filter((_, j) => j !== i) }))}
          onFeedPet={feedPet} onCraftPeptide={craftPeptide} onUsePeptide={usePeptide} />
      )}
      {modal === 'market' && (
        <MarketModal s={s} d={d} marketNow={marketNow} tab={tab('sell')} onTab={setTab} onClose={() => setModal(null)}
          onSellMat={sellMat} onSellItem={sellItem} onBuyBase={buyBase} onBuyBag={buyBag} />
      )}
      {modal === 'world' && (
        <WorldModal s={s} d={d} now={now} tab={tab('land')} onTab={setTab} onClose={() => setModal(null)}
          onMigrate={migrate} onSetPath={setPath} />
      )}
      {modal === 'sys' && (
        <SysModal s={s} shardGain={shardGain} onClose={() => setModal(null)}
          onRebirth={rebirth} onUpgradeArt={upgradeArt} onSimAway={simAway} onWipe={wipe} />
      )}

      {selected && <ItemDetail item={selected} sellMul={d.sellMul} fragments={s.fragments} onEquip={equip} onSell={sellItem} onEnhance={enhanceItem} onClose={() => setSelected(null)} />}
      {pop && <EventPopup pop={pop} runeStyle={s.blood.runeStyle} onClose={() => setPop(null)} />}
      {report && <OfflineReport report={report} name={s.name} onClose={() => setReport(null)} />}
      <Toast text={toast} />
    </>
  );
}

/* ============================================================
   ตัวช่วยระดับโมดูล — แยกออกมาให้ App อ่านง่าย
   ============================================================ */

/** สร้างมอนสเตอร์ตัวใหม่ — เลือดสเกลตามด่านแบบทวีคูณ (ไม่ผูกกับพลังผู้เล่นแล้ว)
 *  ตัวที่ 10 ของแต่ละด่าน (stageKills ครบ STAGE.bossWaveSize) จะเป็นบอส */
function makeBattle(state, d, t, allowLegend) {
  const envs = d.path.envBias;
  const env = envs[Math.floor(Math.random() * envs.length)];
  let species = null, legend = null;
  const isBoss = state.stageKills >= STAGE.bossWaveSize;
  // ฝูงคลั่ง: สุ่มแทนมอนสเตอร์ธรรมดา (ไม่มีทางเกิดพร้อมบอส) — เลือดเยอะกว่า แต่ให้รางวัลมากกว่าตามสัดส่วน
  const isHorde = !isBoss && Math.random() < HORDE.chance;

  if (allowLegend && state.blood.mixed && Math.random() < BASE.legendChancePerTier * d.gr.tier) {
    const cands = LEGEND_SPECIES.filter(x => x.envPool.includes(env));
    if (cands.length) { species = cands[0]; legend = cands[0].rune; }
  }
  if (!species) species = pickSpecies(env);

  let max = Math.floor(STAGE.hpBase * d.gr.tier * Math.pow(STAGE.hpGrowth, state.stage - 1));
  if (isBoss) max *= STAGE.bossHpMult;
  else if (isHorde) max *= HORDE.hpMult;

  // อาร์ติแฟกต์ "นาฬิกาทรายโลหิต" ต่อเวลาปราบบอสให้นานขึ้น
  const artBossBonusSec = ((state.artifacts && state.artifacts.a_boss) || 0) * 2;
  const timeMs = isBoss ? STAGE.bossTimeMs + artBossBonusSec * 1000 : STAGE.normalTimeMs;

  return { env, species, hp: max, max, legend, isBoss, isHorde, expires: t + timeMs };
}

/** เช็คว่าถึงเวลาปล่อยมอนสเตอร์หรือยัง — เกิดเกือบทันที (แบบ Tap Titans) */
function maybeSpawn(n, t) {
  if (n.battle) return n;
  if (n.quest < MONSTER_UNLOCK_QUEST) return n;      // ยังอยู่ในบทเรียนแรกสุด
  if (t <= n.nextEvent) return n;
  const d = derive(n, t);
  return { ...n, battle: makeBattle(n, d, t, true), nextEvent: t + STAGE.respawnMs };
}

/** ประมวลผลรางวัลตอนสังหารสำเร็จ และเลื่อนด่าน/เวฟ
 *  ลูกกระจ๊อก -> stageKills += 1 · บอส -> stage += 1, stageKills = 0
 *  ฝูงคลั่งนับเป็นเวฟเดียว (+1) แต่ให้รางวัลคิดเป็น 3 ตัวรวมกัน — กันไม่ให้ "เลือดเยอะกว่าแต่ได้เท่าเดิม" */
function resolveKill(n, battle, t, setPop, setToast) {
  const d = derive(n, t);
  const credit = battle.isHorde ? HORDE.rewardMult : 1;   // ตัวคูณรางวัลสำหรับฝูงคลั่ง

  const goldReward = Math.floor(
    STAGE.goldBase * d.goldMul * Math.pow(STAGE.goldGrowth, n.stage - 1) * (battle.isBoss ? STAGE.bossGoldMult : credit)
  );
  const itemChance = (battle.isBoss ? BASE.bossItemChance : BASE.mobItemChance) * credit;
  const getFullItem = Math.random() < itemChance * d.luck;

  // ทอย "ชิ้นส่วน" และ "ไมซีเลียม" แยกอิสระตามจำนวนตัวที่นับเครดิต (ฝูง = 3 ครั้ง) แทนการคูณยอดตรงๆ
  const rollN = (chance, times) => { let c = 0; for (let i = 0; i < times; i++) if (Math.random() < chance) c++; return c; };
  const fragmentsDrop = battle.isBoss
    ? Math.floor(rnd(BASE.bossFragmentMin, BASE.bossFragmentMax + 1))
    : rollN(BASE.mobFragmentChance, credit);
  const myceliumDrop = battle.isBoss
    ? PEPTIDE.myceliumBossDrop
    : rollN(PEPTIDE.myceliumMobChance, credit);

  const rw = {
    gold: goldReward,
    hide: battle.max * .0015 * d.gr.hide,
    core: d.gr.tier * (.6 + Math.random()),
    exp: d.need * .12 * d.gr.tier * .5,
    item: getFullItem ? rollItem(n.lv + d.gr.tier * 2, d.luck) : null,
    fragments: fragmentsDrop,
    mycelium: myceliumDrop,
    essence: essenceFrom(battle.species),
    legend: battle.legend,
  };

  let nextStage = n.stage, nextKills = n.stageKills + 1;
  if (battle.isBoss) {
    nextStage += 1; nextKills = 0;
    setToast(`ปราบบอสสำเร็จ! ทะลวงสู่ด่าน ${nextStage}`);
  } else if (battle.isHorde) {
    setToast(`กวาดล้างฝูงมอนสเตอร์สำเร็จ! +${fmt(rw.gold)} ทอง`);
  } else if (!rw.item && !n.unlocked.essence) {
    setToast(`สังหารสำเร็จ +${fmt(rw.gold)} ทอง`);
  }

  n = {
    ...n,
    gold: n.gold + rw.gold, totalGold: n.totalGold + rw.gold,
    hide: Math.min(d.capHide, n.hide + rw.hide),
    core: n.core + rw.core, exp: n.exp + rw.exp,
    fragments: (n.fragments || 0) + rw.fragments,
    mycelium: (n.mycelium || 0) + rw.mycelium,
    beasts: n.beasts + (battle.isHorde ? HORDE.beastsCredit : 1),
    stage: nextStage, stageKills: nextKills,
    nextEvent: t + STAGE.respawnAfterKillMs,
  };

  if (n.unlocked.essence) n.pending = [...n.pending, rw.essence];

  if (rw.legend && n.blood.mixed && !n.runes.includes('sig_' + rw.legend)) {
    n.runes = [...n.runes, 'sig_' + rw.legend];
    setPop({ kind: 'rune', sig: rw.legend });
  } else if (rw.item) {
    if (n.inv.length < BAG_SLOTS) { n.inv = [...n.inv, rw.item]; setPop({ kind: 'drop', item: rw.item }); }
    else setToast('กระเป๋าเต็ม ของหล่นหาย!');
    if (rw.item.rar > n.bestRar) n.bestRar = rw.item.rar;
  } else if (n.unlocked.essence && !battle.isBoss) {
    setPop({ kind: 'ess', essence: rw.essence, gold: rw.gold });
  }

  if (!n.pet && n.unlocked.pet) {
    const chance = n.blood.traits.includes('beastkin') ? BASE.petTameBeastkin : BASE.petTameChance;
    const found = PETS.find(p => p.ground === n.ground);
    if (found && Math.random() < chance) {
      n.pet = { id: found.id, lv: 1, hunger: 100 };
      setToast(`${found.name}ยอมตามเจ้ามา!`);
    }
  }

  delete n._kill;
  return n;
}


export default App;
