/* ============================================================
   StatusModal.jsx — ค่าพลัง / รูน / สายเลือด / ฉายา
   การลงแต้มเป็นแบบ "ร่างก่อน แล้วยืนยัน" กดผิดถอยได้
   ============================================================ */
import React from 'react';
import { Modal, Bar, Row } from '../../ui/widgets.jsx';
import { STATS, ENV } from '../../data/world.js';
import { TRAITS, RUNES, RUNE_STYLE, SIGNATURE_RUNES, runeName } from '../../data/traits.js';
import { TITLES, titleMult } from '../../data/progression.js';
import { fmt } from '../../core/util.js';

export default function StatusModal({ s, d, tab, onTab, onClose, draft, setDraft, onConfirmPts, onUpgradeWeapon, onUnlockRune }) {
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
