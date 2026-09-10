/* ============================================================
   Popups.jsx — กล่องข้อความกลางจอทั้งหมด
   ============================================================ */
import React from 'react';
import { Popup, Row } from '../ui/widgets.jsx';
import { RARITY, baseById, itemValue, affixById, getEnhanceCost, SLOT_NAME } from '../data/items.js';
import { SKILL_LIB } from '../data/species.js';
import { SIGNATURE_RUNES, RUNE_STYLE, runeName } from '../data/traits.js';
import { fmt, fmtTime } from '../core/util.js';
import { OFFLINE_EFF, BASE, ENHANCE } from '../core/config.js';

/** รายละเอียดไอเท็มที่เลือก — สวมใส่ ขาย หรือตีบวก */
export function ItemDetail({ item, sellMul, fragments, onEquip, onSell, onEnhance, onClose }) {
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
export function EventPopup({ pop, runeStyle, onClose }) {
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
export function OfflineReport({ report, name, onClose }) {
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
export function Toast({ text }) {
  if (!text) return null;
  return (
    <div style={{ position: 'fixed', bottom: 96, left: '50%', transform: 'translateX(-50%)', zIndex: 50, maxWidth: '90%', textAlign: 'center', padding: '8px 16px', fontSize: 14, fontWeight: 700, background: 'linear-gradient(180deg,#F2762F,#B84C18)', color: '#2A1006', borderRadius: 20, border: '2px solid rgba(0,0,0,.45)' }}>
      {text}
    </div>
  );
}
