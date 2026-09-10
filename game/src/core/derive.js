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
import { ENV, zeroEnv, STATS, SEASONS, groundById, pathById } from '../data/world.js';
import { RUNES, SIGNATURE_RUNES } from '../data/traits.js';
import { SKILL_LIB } from '../data/species.js';
import { baseById, affixById, RARITY, BAGS, petById } from '../data/items.js';
import { titleMult } from '../data/progression.js';
import { clamp, seasonAt, expNeed } from './util.js';
import { BASE, STAGE, ENHANCE, PEPTIDE, STAMINA } from './config.js';

/** รวมโบนัสทุกแหล่ง (อุปกรณ์สวมใส่ / เอสเซนส์ / รูน) เป็น object เดียว */
export function eqBonus(s) {
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

export function derive(s, now) {
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
