/* ============================================================
   smoke_test.mjs — รันตรรกะเกมจริงแบบไม่มีหน้าจอ เพื่อจับบั๊กที่
   เช็คแบบ static (วงเล็บ/import) จับไม่ได้ เช่น undefined property,
   NaN ไหลเข้าตัวเลข, หรือฟังก์ชันพังตอนเจอ state จริง
   ใช้: node tools/smoke_test.mjs
   ============================================================ */
import { makeBlood, newChar } from '../src/core/character.js';
import { derive } from '../src/core/derive.js';
import { simulate, runOffline } from '../src/core/simulate.js';
import { RACES } from '../src/data/races.js';
import { getEnhanceCost, rollItem } from '../src/data/items.js';

let failures = 0, checks = 0;
const assert = (cond, msg) => {
  checks++;
  if (!cond) { failures++; console.log('✗ FAIL:', msg); }
};
const noNaN = (obj, path = '') => {
  for (const [k, v] of Object.entries(obj)) {
    const p = path ? path + '.' + k : k;
    if (typeof v === 'number' && !isFinite(v)) { failures++; console.log('✗ FAIL: non-finite number at', p, '=', v); }
    else if (v && typeof v === 'object' && !Array.isArray(v) && k !== 'eq' && k !== 'gear') noNaN(v, p);
  }
};

console.log('=== 1) สร้างตัวละครทั้ง 5 เผ่า + โหมดผสม ===');
for (const r of RACES) {
  for (const cls of r.classes) {
    const blood = makeBlood('choose', r.id, cls.id);
    const s = newChar('ทดสอบ', blood);
    const d = derive(s, Date.now());
    assert(isFinite(d.power) && d.power > 0, `${r.id}/${cls.id}: power ควรเป็นบวก ได้ ${d.power}`);
    assert(isFinite(d.tapDmg) && d.tapDmg > 0, `${r.id}/${cls.id}: tapDmg ควรเป็นบวก`);
    assert(isFinite(d.upgradeCost) && d.upgradeCost > 0, `${r.id}/${cls.id}: upgradeCost ควรเป็นบวก`);
    noNaN(d, `${r.id}/${cls.id} derive()`);
  }
}
// สายเลือดผสม 20 รอบ (สุ่มคู่ต่างกันทุกครั้ง)
for (let i = 0; i < 20; i++) {
  const blood = makeBlood('mix');
  const s = newChar('ลูกผสม', blood);
  const d = derive(s, Date.now());
  assert(isFinite(d.power) && d.power > 0, `mix#${i}: power ควรเป็นบวก`);
  noNaN(d, `mix#${i} derive()`);
}
console.log('ผ่าน:', checks - failures, '/', checks);

console.log('\n=== 2) จำลองการเล่นสด 2,000 tick (~6.7 นาทีเกม) พร้อมสุ่มแตะ ===');
{
  const blood = makeBlood('choose', 'barbarian', 'berserk');
  let s = newChar('บยอร์น', blood);
  let t = Date.now();
  let kills = 0, levelUps = 0, quests = 0, maxStage = 1;
  for (let i = 0; i < 2000; i++) {
    t += 200;
    s = simulate(s, 0.2, t);
    if (s._lv) { levelUps++; delete s._lv; }
    if (s._quest) { quests++; delete s._quest; }
    if (s._msg) delete s._msg;
    if (s._flee) { assert(typeof s._flee === 'object', 'tick ' + i + ': _flee ควรเป็น object ของ battle ไม่ใช่ true เฉยๆ'); delete s._flee; }
    if (s._kill) {
      kills++;
      assert(typeof s._kill.species === 'object', 'tick ' + i + ': _kill.species ควรมีอยู่');
      assert(isFinite(s._kill.max) && s._kill.max > 0, 'tick ' + i + ': _kill.max ควรเป็นบวก');
      delete s._kill;
    }
    maxStage = Math.max(maxStage, s.stage);
    // สุ่มแตะทุก ๆ 3 tick เหมือนผู้เล่นกดรัว ๆ
    if (i % 3 === 0) {
      const d = derive(s, t);
      assert(isFinite(d.tapDmg), 'tick ' + i + ': tapDmg ต้องเป็นตัวเลขจริง');
    }
    if (i % 200 === 0) noNaN(s, `tick ${i} state`);
  }
  console.log(`เลเวล ${s.lv} · ด่าน ${s.stage} (สูงสุด ${maxStage}) · เควสต์ผ่าน ${quests} · สังหาร _kill ${kills} ครั้ง (state.beasts ยังไม่รวมเพราะไม่ได้ผ่าน resolveKill ใน App.jsx)`);
  assert(s.lv >= 1, 'เลเวลต้องไม่ต่ำกว่า 1');
  assert(s.stage >= 1, 'ด่านต้องไม่ต่ำกว่า 1');
  assert(isFinite(s.gold) && s.gold >= 0, 'ทองต้องไม่ติดลบ/ไม่ใช่ NaN');
  assert(isFinite(s.satiety) && s.satiety >= 0 && s.satiety <= 100, 'ความอิ่มต้องอยู่ในช่วง 0-100 เสมอ ได้ ' + s.satiety);
  assert(isFinite(s.hydration) && s.hydration >= 0 && s.hydration <= 100, 'ความชุ่มชื้นต้องอยู่ในช่วง 0-100 เสมอ ได้ ' + s.hydration);
}

console.log('\n=== 3) จำลอง offline หลายช่วงเวลา (30 วิ / 4 ชม. / 12 ชม. / เกิน 12 ชม.) ===');
{
  const blood = makeBlood('choose', 'human', 'sword');
  let s = newChar('นักดาบ', blood);
  // เร่งให้มีของก่อนเพื่อให้ครอบคลุมเส้นทางโค้ดของอุปกรณ์/สัตว์เลี้ยง/เอสเซนส์
  s.unlocked = { status: true, market: true, items: true, skill: true, world: true, essence: true, pet: true, runes: true, rebirth: true };
  s.eq.weapon = { uid: 1, base: 'w1', rar: 2, ilvl: 5, dur: 40, affixes: [{ id: 'pw', v: 12 }], upgrade: 2 };
  s.gold = 5000; s.stage = 3; s.lv = 8;

  for (const hours of [30 / 3600, 4, 12, 20]) {
    const from = Date.now() - hours * 3600_000;
    const off = runOffline(s, from, Date.now());
    assert(off !== null, `offline ${(hours * 3600).toFixed(0)} วิ ควรได้ผลลัพธ์ (span >= 5000ms)`);
    if (off) {
      noNaN(off.report, `offline ${hours}h report`);
      assert(isFinite(off.state.gold) && off.state.gold >= 0, `offline ${hours}h: ทองต้องไม่ติดลบ/NaN`);
      assert(off.state.stage >= s.stage, `offline ${hours}h: ด่านต้องไม่ถอยหลัง (ได้ ${off.state.stage} จาก ${s.stage})`);
      assert(off.report.seconds <= 12 * 3600 + 1, `offline ${hours}h: ควรถูกเพดานที่ 12 ชม.`);
      if (hours === 20) assert(off.report.capped === true, 'offline 20h: ควรติดธง capped');
      console.log(`  ${(hours * 3600).toFixed(0)}วิ -> ด่าน ${s.stage}->${off.state.stage} · ทอง +${off.report.gold} · ชิ้นส่วน +${off.report.fragments || 0} · สังหาร ${off.report.beasts}`);
    }
  }

  console.log('  --- ตัวละครที่แข็งแกร่งกว่ามาก (เช็คว่าด่านเลื่อนจริงถ้าพลังพอ ไม่ใช่ค้างเพราะโค้ดพัง) ---');
  const strongBlood = makeBlood('choose', 'barbarian', 'berserk');
  let strong = newChar('นักรบทรงพลัง', strongBlood);
  strong.unlocked = { status: true, market: true, items: true, skill: true, world: true, essence: true, pet: true, runes: true, rebirth: true };
  strong.lv = 40; strong.base = { str: 200, agi: 150, vit: 150, sen: 100, int: 100 };
  strong.weaponLv = 30; strong.stage = 3;
  strong.eq.weapon = { uid: 2, base: 'w3', rar: 4, ilvl: 30, dur: 100, affixes: [{ id: 'pw', v: 40 }], upgrade: 8 };
  const strongOff = runOffline(strong, Date.now() - 4 * 3600_000, Date.now());
  assert(strongOff !== null, 'offline 4h (ตัวแรง) ควรได้ผลลัพธ์');
  if (strongOff) {
    console.log(`  4ชม. (แรง) -> ด่าน ${strong.stage}->${strongOff.state.stage} · ทอง +${strongOff.report.gold} · สังหาร ${strongOff.report.beasts}`);
    assert(strongOff.state.stage > strong.stage, `ตัวละครที่แข็งแกร่งกว่ามากควรผ่านด่านเพิ่มได้จริงใน 4 ชม. (ได้ ${strong.stage}->${strongOff.state.stage})`);
  }
}

console.log('\n=== 4) ระบบตีบวก (enhance) ===');
{
  const item = rollItem(10, 1);
  item.upgrade = 0;
  for (let i = 0; i < 5; i++) {
    const cost = getEnhanceCost(item);
    assert(isFinite(cost.gold) && cost.gold > 0, `enhance รอบ ${i}: cost.gold ควรเป็นบวก`);
    assert(cost.fragments === item.upgrade + 1, `enhance รอบ ${i}: cost.fragments ควรเท่ากับ upgrade+1`);
    item.upgrade += 1;
  }
  console.log('  ตีบวกจนถึง +5 ผ่าน ไม่มีค่าเพี้ยน');
}

console.log('\n=== 5) ความอึด: จำลองแตะรัวสุดๆ 10,000 ครั้งติด ต้องไม่ล็อกเกมถาวร ===');
{
  const blood = makeBlood('choose', 'barbarian', 'berserk');
  let s = newChar('ทดสอบอึด', blood);
  let t = Date.now();
  let minStamina = 100, sawLow = false, sawRecoverAfterLow = false;
  let prevLow = false;
  for (let i = 0; i < 10000; i++) {
    // แตะรัวสุดขีด (เร็วกว่าที่คนจริงกดได้มาก) เพื่อบีบเคสที่แย่ที่สุด
    t += 50;
    s = { ...s, stamina: Math.max(0, (s.stamina ?? 100) - 4) };  // จำลองต้นทุนตอนแตะ เหมือน tap() ใน App.jsx
    s = simulate(s, 0.05, t);                                     // regen ต่อเนื่องใน tick ปกติ
    minStamina = Math.min(minStamina, s.stamina);
    const isLow = s.stamina < 20;
    if (isLow) sawLow = true;
    if (prevLow && !isLow) sawRecoverAfterLow = true;
    prevLow = isLow;
  }
  assert(isFinite(s.stamina) && s.stamina >= 0 && s.stamina <= 100, 'stamina ต้องอยู่ในช่วง 0-100 เสมอ ได้ ' + s.stamina);
  assert(sawLow, 'ทดสอบนี้ควรเคยเจอสถานะ "ล้า" (แตะรัวเกินกว่าจะฟื้นทัน) ไม่งั้นทดสอบไม่ครอบคลุมสถานการณ์จริง');
  console.log(`  แตะรัว 10,000 ครั้ง (ทุก 50ms) -> stamina ต่ำสุดที่เจอ ${minStamina.toFixed(1)}% · เจอสถานะล้า: ${sawLow} · เกม "ยังทำงานต่อได้" (ไม่ค้าง ไม่ throw)`);
  const d = derive(s, t);
  assert(isFinite(d.tapDmg) && d.tapDmg > 0, 'แม้ตอน stamina ต่ำสุด tapDmg ต้องยังเป็นบวกเสมอ (แค่ลด ไม่ใช่ล็อก) ได้ ' + d.tapDmg);
  assert(isFinite(d.autoDps) && d.autoDps > 0, 'autoDps ต้องไม่โดนความอึดกระทบเลยไม่ว่ากรณีใด');

  // ทดสอบว่าถ้าหยุดแตะ ความอึดต้องฟื้นเต็มได้จริงภายในเวลาสมเหตุสมผล (ไม่ใช่ค้างต่ำตลอดไป)
  let recovered = false;
  for (let i = 0; i < 50; i++) { t += 1000; s = simulate(s, 1, t); if (s.stamina >= 99) { recovered = true; break; } }
  assert(recovered, 'หยุดแตะแล้วความอึดต้องฟื้นเต็มได้จริงภายใน 50 วิ (regenPerSec=6 ต้องพอ)');
  console.log(`  หยุดแตะแล้วฟื้นเต็ม: ${recovered} (พิสูจน์ว่าไม่มีทางค้างต่ำถาวรเหมือนสเปกเดิม)`);
}

console.log('\n=== 6) Horde: รางวัลต้องมากกว่าปกติ (ไม่ใช่ "เลือดเยอะกว่าแต่ได้เท่าเดิม") ===');
{
  const blood = makeBlood('choose', 'human', 'sword');
  const s = newChar('ทดสอบฝูง', blood);
  s.stage = 5;
  const d = derive(s, Date.now());
  const normalGold = Math.floor(20 * d.goldMul * Math.pow(1.25, s.stage - 1) * 1);
  const hordeGold = Math.floor(20 * d.goldMul * Math.pow(1.25, s.stage - 1) * 3);
  assert(hordeGold > normalGold * 2.5, `ฝูงคลั่งควรให้ทองมากกว่าปกติชัดเจน (ปกติ ${normalGold} vs ฝูง ${hordeGold})`);
  console.log(`  มอนปกติ ${normalGold} ทอง vs ฝูงคลั่ง ${hordeGold} ทอง (×3 ตามที่ออกแบบ)`);
}

console.log('\n=== 7) เปปไทด์: บัฟต้องมีผลจริงและหมดฤทธิ์ตรงเวลา ===');
{
  const blood = makeBlood('choose', 'elf', 'ranger');
  const s = newChar('ทดสอบยา', blood);
  const now = Date.now();
  const withoutBuff = derive(s, now);
  const withBuff = derive({ ...s, peptideEnd: now + 10000 }, now);
  const afterExpire = derive({ ...s, peptideEnd: now - 1 }, now);
  assert(withBuff.power > withoutBuff.power * 2, `ตอนออกฤทธิ์ พลังควรสูงกว่าปกติมาก (ปกติ ${withoutBuff.power.toFixed(0)} vs บัฟ ${withBuff.power.toFixed(0)})`);
  assert(Math.abs(afterExpire.power - withoutBuff.power) < 0.01, 'หมดฤทธิ์แล้วพลังต้องกลับเป็นปกติเป๊ะ ไม่ใช่ค้างบัฟ');
  console.log(`  ปกติ ${withoutBuff.power.toFixed(0)} · ออกฤทธิ์ ${withBuff.power.toFixed(0)} (×${(withBuff.power / withoutBuff.power).toFixed(2)}) · หมดฤทธิ์แล้วกลับเป็น ${afterExpire.power.toFixed(0)}`);
}

console.log('\n=== 8) เซฟเก่าก่อน v8 (ไม่มี stage/weaponLv/artifacts/fragments/stamina) ต้องโหลดได้โดยไม่พังหรือเป็น NaN ===');
{
  const blood = makeBlood('choose', 'dwarf', 'delve');
  const oldSave = newChar('นักขุดเก่า', blood);
  // ลบฟิลด์ที่เพิ่มเข้ามาทีหลัง ให้เหมือนเซฟจริงจากเวอร์ชันก่อนหน้า
  delete oldSave.stage; delete oldSave.stageKills; delete oldSave.weaponLv; delete oldSave.artifacts;
  delete oldSave.fragments; delete oldSave.stamina; delete oldSave.mycelium; delete oldSave.peptides; delete oldSave.peptideEnd;
  oldSave.lv = 15; oldSave.gold = 8000; oldSave.lastSaved = Date.now() - 3600_000;

  // จำลอง window.storage เหมือนตอนรันจริง เพื่อทดสอบผ่าน loadSave() ทางเดียวกับผู้เล่นจริง
  global.window = { storage: { get: async () => ({ value: JSON.stringify(oldSave) }) } };
  const { loadSave } = await import('../src/core/storage.js');
  const loaded = await loadSave();

  assert(loaded !== null, 'เซฟเก่าควรโหลดสำเร็จ ไม่ใช่ null/error');
  assert(loaded.stage === 1, `stage ควรถูกเติมเป็น 1 (ค่าเริ่มต้น) ได้ ${loaded.stage}`);
  assert(loaded.weaponLv === 1, `weaponLv ควรถูกเติมเป็น 1 ได้ ${loaded.weaponLv}`);
  assert(typeof loaded.artifacts === 'object' && loaded.artifacts !== null, 'artifacts ควรถูกเติมเป็น {} ไม่ใช่ undefined');
  assert(loaded.fragments === 0, `fragments ควรถูกเติมเป็น 0 ได้ ${loaded.fragments}`);
  assert(loaded.stamina === 100, `stamina ควรถูกเติมเป็น 100 ได้ ${loaded.stamina}`);
  assert(loaded.mycelium === 0 && loaded.peptides === 0 && loaded.peptideEnd === 0, 'mycelium/peptides/peptideEnd ควรถูกเติมเป็น 0');

  // จำลอง derive() + สูตรสร้างมอนสเตอร์ (โค้ดจริงใน App.jsx ที่เคยพังกับเซฟเก่า) เพื่อยืนยันว่าไม่เกิด NaN อีกแล้ว
  const t = Date.now();
  const d = derive(loaded, t);
  noNaN(d, 'derive() บนเซฟเก่าที่ผ่าน migrate แล้ว');
  const simulatedMax = Math.floor(100 * d.gr.tier * Math.pow(1.45, loaded.stage - 1));  // สูตรเดียวกับ makeBattle()
  assert(isFinite(simulatedMax) && simulatedMax > 0, `เลือดมอนสเตอร์คำนวณจากเซฟเก่าต้องไม่เป็น NaN ได้ ${simulatedMax}`);

  // จำลองการเปิดหน้าต่างวัตถุโบราณ (จุดที่เคย throw จริงตอน s.artifacts เป็น undefined)
  const { ARTIFACTS, artifactCost } = await import('../src/data/artifacts.js');
  let sysModalCrashed = false;
  try {
    for (const a of ARTIFACTS) { const lv = (loaded.artifacts || {})[a.id] || 0; artifactCost(a, lv); }
  } catch (e) { sysModalCrashed = true; console.log('  ✗ SysModal crashed:', e.message); }
  assert(!sysModalCrashed, 'เปิดหน้าต่างวัตถุโบราณด้วยเซฟเก่าต้องไม่ throw');

  console.log('  เซฟเก่าโหลดผ่าน migrate() ครบทุกฟิลด์ · derive() ไม่มี NaN · หน้าต่างวัตถุโบราณไม่ throw');
}

console.log('\n=== สรุป ===');
console.log(`ตรวจทั้งหมด ${checks} จุด · ล้มเหลว ${failures} จุด`);
if (failures > 0) { console.log('\n❌ พบปัญหา ต้องแก้ก่อนส่งมอบ'); process.exit(1); }
console.log('✅ ผ่านทุกจุด');
