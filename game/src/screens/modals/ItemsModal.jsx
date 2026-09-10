/* ============================================================
   ItemsModal.jsx — สวมใส่ / กระเป๋า / เอสเซนส์ / สัตว์เลี้ยง
   ============================================================ */
import React from 'react';
import { Modal, Bar, ItemCard } from '../../ui/widgets.jsx';
import { baseById, itemValue, petById, RARITY, SLOT_NAME, SLOT_ICON, affixById } from '../../data/items.js';
import { SKILL_LIB } from '../../data/species.js';
import { BAG_SLOTS, BASE, PEPTIDE } from '../../core/config.js';
import { fmt } from '../../core/util.js';

export default function ItemsModal({ s, d, tab, onTab, onClose, onSelect, onRepair, onToggleRepair, onAbsorb, onDropEssence, onFeedPet, onCraftPeptide, onUsePeptide }) {
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
