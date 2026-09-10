/* ============================================================
   character.js — สร้างสายเลือดและสถานะเริ่มต้นของตัวละคร
   ============================================================ */
import { ENV, zeroEnv, STATS } from '../data/world.js';
import { RACES, raceById } from '../data/races.js';
import { clamp, rnd } from './util.js';
import { STAGE } from './config.js';

/**
 * mode: 'choose' | 'random' | 'mix'
 * โหมด mix = ผสมสองเผ่าโดยผู้เล่นไม่รู้ว่าเป็นเผ่าใด
 *   - ค่าพลังถูกเฉลี่ยด้วยน้ำหนักสุ่ม 35–65%
 *   - ได้ลักษณะสายเลือด "สองอย่าง" แทนหนึ่ง (นี่คือข้อแลกเปลี่ยน)
 *   - ความต้านทานที่สูงสุดได้โบนัส +0.10 (hybrid vigor) กันไม่ให้บิลด์ห่วยสุดขั้ว
 */
export function makeBlood(mode, raceId, classId) {
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
export function newChar(name, blood, carry = {}) {
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
