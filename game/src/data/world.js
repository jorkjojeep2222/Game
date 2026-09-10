/* ============================================================
   world.js — ภัยสิ่งแวดล้อม / ฤดูกาล / ค่าพลัง / ถิ่นล่าสัตว์
   ============================================================ */

/** ภัยสิ่งแวดล้อม 6 ชนิด — ใช้เป็นแกนกลางของทั้งเกม
 *  (ความต้านทาน, เอสเซนส์, เกราะ, ถิ่น ล้วนอ้างอิง id เหล่านี้) */
export const ENV = [
  { id: 'cold', name: 'หนาว', icon: '❄️' },
  { id: 'heat', name: 'ร้อน', icon: '🔥' },
  { id: 'rain', name: 'ฝน', icon: '🌧️' },
  { id: 'poison', name: 'พิษ', icon: '☠️' },
  { id: 'dust', name: 'ฝุ่น', icon: '🌪️' },
  { id: 'ash', name: 'เถ้าลาวา', icon: '🌋' },
];
export const zeroEnv = () => ({ cold: 0, heat: 0, rain: 0, poison: 0, dust: 0, ash: 0 });
export const envById = id => ENV.find(e => e.id === id);

export const STATS = [
  { id: 'str', name: 'พละกำลัง', abbr: 'STR', desc: 'พลังโจมตี — ตัวขับผลผลิตหลัก' },
  { id: 'agi', name: 'ความคล่องแคล่ว', abbr: 'AGI', desc: 'เพิ่มดาเมจต่อการแตะ' },
  { id: 'vit', name: 'ความอึด', abbr: 'VIT', desc: 'ทนหิว ทนกระหาย ของพังช้าลง' },
  { id: 'sen', name: 'สัมผัส', abbr: 'SEN', desc: 'หาน้ำเก่ง เจอของหายากบ่อย' },
  { id: 'int', name: 'ปัญญา', abbr: 'INT', desc: 'ต่อรองราคาดีขึ้น' },
];

/** ฤดูกาลวนอัตโนมัติตามนาฬิกาจริง — add คือภัยที่เพิ่มเข้ามา */
export const SEASONS = [
  { name: 'ใบไม้ผลิ', icon: '🌱', meat: 1.10, add: { rain: .30 } },
  { name: 'ร้อน', icon: '☀️', meat: 1.15, add: { heat: .35, dust: .15 } },
  { name: 'ใบไม้ร่วง', icon: '🍂', meat: 1.00, add: { dust: .20 } },
  { name: 'หนาว', icon: '🌨️', meat: 0.60, add: { cold: .45 } },
];

/** ถิ่นล่าสัตว์ — unlock คือเลเวลขั้นต่ำ, tier คือระดับความโหด
 *  sky/far/gnd/deco ใช้วาดฉากพิกเซล */
export const GROUNDS = [
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
export const groundById = id => GROUNDS.find(g => g.id === id) || GROUNDS[0];

/** เส้นทางย่อยในแต่ละถิ่น — ปรับความเสี่ยงกับผลตอบแทน */
export function pathsFor(gr) {
  const envs = Object.keys(gr.threat);
  return [
    { id: 'main', name: 'เส้นทางหลัก', icon: '🥾', desc: 'สมดุลทุกด้าน', threatMul: 1.0, dropMul: 1.0, goldMul: 1.0, envBias: envs },
    { id: 'deep', name: 'ลึกเข้าไป', icon: '🕳️', desc: 'เสี่ยงกว่า ของดีกว่า', threatMul: 1.35, dropMul: 1.6, goldMul: 1.1, envBias: envs },
    { id: 'ruin', name: 'ซากปรักหักพัง', icon: '🏚️', desc: 'ปลอดภัยกว่า ทองเยอะ', threatMul: .85, dropMul: .8, goldMul: 1.7, envBias: envs.slice(0, 1) },
  ];
}
export const pathById = (gr, id) => pathsFor(gr).find(p => p.id === id) || pathsFor(gr)[0];
