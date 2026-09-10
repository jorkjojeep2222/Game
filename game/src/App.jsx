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
import React, { useState, useEffect, useRef } from 'react';

import Theme from './ui/theme.jsx';
import { ItemDetail, EventPopup, OfflineReport, Toast } from './screens/Popups.jsx';
import CharacterCreate from './screens/CharacterCreate.jsx';
import HuntScreen from './screens/HuntScreen.jsx';
import StatusModal from './screens/modals/StatusModal.jsx';
import ItemsModal from './screens/modals/ItemsModal.jsx';
import MarketModal from './screens/modals/MarketModal.jsx';
import WorldModal from './screens/modals/WorldModal.jsx';
import SysModal from './screens/modals/SysModal.jsx';

import { makeBlood, newChar } from './core/character.js';
import { derive } from './core/derive.js';
import { simulate, runOffline } from './core/simulate.js';
import { loadSave, writeSave } from './core/storage.js';
import { fmt, rnd } from './core/util.js';
import { TICK_MS, UI_CLOCK_MS, BAG_SLOTS, BASE, STAGE, HORDE, PEPTIDE, STAMINA, MONSTER_UNLOCK_QUEST } from './core/config.js';
import { zeroEnv } from './data/world.js';
import { pickSpecies, essenceFrom, LEGEND_SPECIES } from './data/species.js';
import { MATS, BAGS, PETS, priceMul, baseById, itemValue, rollItem, getEnhanceCost, nextUid } from './data/items.js';

const EMPTY_DRAFT = { str: 0, agi: 0, vit: 0, sen: 0, int: 0 };

export default function App() {
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
