/* ============================================================
   SysModal.jsx — จุติ (เกิดใหม่) + วัตถุโบราณ / เครื่องมือทดสอบ + สถิติ + ล้างเซฟ
   ------------------------------------------------------------
   ระบบด่าน/เวฟ/บอส: shardGain คำนวณจาก "ด่านสูงสุด" ไม่ใช่ทองสะสมแล้ว
   วัตถุโบราณ (ARTIFACTS) คือบัฟถาวรที่ติดตัวข้ามชาติ ต่างจากรูนที่ต้อง
   ปลดล็อกใหม่ทุกครั้งที่เกิดใหม่
   ============================================================ */
import React, { useState } from 'react';
import { Modal, Row } from '../../ui/widgets.jsx';
import { ARTIFACTS, artifactCost } from '../../data/artifacts.js';
import { titleMult } from '../../data/progression.js';
import { fmt } from '../../core/util.js';
import { STAGE } from '../../core/config.js';

export default function SysModal({ s, shardGain, onClose, onRebirth, onUpgradeArt, onSimAway, onWipe }) {
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
