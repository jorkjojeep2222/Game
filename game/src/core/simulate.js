/* ============================================================
   simulate.js — หัวใจของเกม
   ------------------------------------------------------------
   กฎเหล็ก: มี simulate() ตัวเดียว ใช้ทั้งตอนเล่นสด (dt≈0.2 วิ)
   และตอนคำนวณ offline (dt=30 วิ) ห้ามเขียนสูตรสองชุดเด็ดขาด
   ไม่งั้นตัวเลขสองโหมดจะเริ่มไม่ตรงกันภายในไม่กี่วัน

   simulate() คืน state ใหม่เสมอ และอาจแนบ "สัญญาณ" ขึ้นต้นด้วย _
   ให้ชั้น UI เอาไปแสดงผล แล้วลบทิ้ง: _msg _lv _quest _kill _flee
   ============================================================ */
import { ENV, groundById } from '../data/world.js';
import { TRAITS } from '../data/traits.js';
import { baseById, itemValue, rollItem } from '../data/items.js';
import { QUESTS, TITLES } from '../data/progression.js';
import { pickSpecies, essenceFrom } from '../data/species.js';
import { derive } from './derive.js';
import { clamp, seasonAt, expNeed, rnd } from './util.js';
import { OFFLINE_EFF, OFFLINE_STEP, OFFLINE_MAX_STEPS, OFFLINE_CAP_MS, BASE, STAGE, STAMINA, BAG_SLOTS } from './config.js';

export function simulate(s, dt, now, opts = {}) {
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
export function runOffline(s, from, to) {
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
