/* ============================================================
   WorldModal.jsx — ถิ่นล่าสัตว์ / เส้นทางย่อย / สภาพแวดล้อม
   ============================================================ */
import React from 'react';
import { Modal, Bar } from '../../ui/widgets.jsx';
import { GROUNDS, ENV, envById, pathsFor } from '../../data/world.js';

export default function WorldModal({ s, d, now, tab, onTab, onClose, onMigrate, onSetPath }) {
  const knowRes = id => !s.blood.mixed || s.known.res[id];
  const paths = pathsFor(d.gr);

  return (
    <Modal icon="🗺️" title="แผนที่โลก" tabs={[['land', 'ถิ่นล่าสัตว์'], ['path', 'เส้นทาง'], ['env', 'สภาพแวดล้อม']]}
      activeTab={tab} onTab={onTab} onClose={onClose}>

      {tab === 'land' && (<>
        <div style={{ minHeight: 34 }}>
          {d.traveling && (
            <div className="panel p-2 text-xs" style={{ color: 'var(--ember)' }}>
              กำลังเดินทาง · ผลผลิต 25% · อีก <span className="num fixw" style={{ minWidth: '3ch' }}>{Math.ceil((s.travelEnd - now) / 1000)}</span> วิ
            </div>
          )}
        </div>
        {GROUNDS.map(g => {
          const unlocked = s.lv >= g.unlock, here = g.id === s.ground;
          return (
            <button key={g.id} onClick={() => onMigrate(g)} disabled={!unlocked || here || d.traveling}
              className="btn w-full p-3 text-left"
              style={{ background: here ? 'linear-gradient(180deg,#5E3A1A,#2E1C0C)' : 'var(--stone)', borderColor: here ? 'var(--ember)' : undefined, opacity: unlocked ? 1 : .4, whiteSpace: 'normal' }}>
              <div className="flex justify-between nowrap">
                <span className="font-bold">{g.icon} {unlocked ? g.name : '???'}</span>
                <span className="num text-xs" style={{ color: here ? 'var(--gold)' : 'var(--ice)' }}>
                  {here ? 'อยู่ที่นี่' : unlocked ? 'ย้ายมา →' : `ต้องเลเวล ${g.unlock}`}
                </span>
              </div>
              {unlocked && (<>
                <div className="num text-xs mt-1" style={{ color: 'var(--frost)' }}>
                  🥩×{g.meat} 🦴×{g.hide} 💧×{g.water} EXP×{g.exp} ของดี×{g.drop}
                </div>
                <div className="flex gap-2 mt-1">
                  {Object.entries(g.threat).map(([k, v]) => (
                    <span key={k} className="num text-xs" style={{ color: v > (d.res[k] || 0) ? 'var(--blood)' : 'var(--moss)' }}>
                      {envById(k).icon}{v.toFixed(2)}
                    </span>
                  ))}
                </div>
              </>)}
            </button>
          );
        })}
      </>)}

      {tab === 'path' && (<>
        <div className="panel p-3">
          <svg viewBox="0 0 300 44" style={{ width: '100%', height: 40 }}>
            <line x1="34" y1="22" x2="266" y2="22" stroke="rgba(255,255,255,.18)" strokeWidth="3" strokeDasharray="6 5" />
            {paths.map((p, i) => (
              <circle key={p.id} cx={34 + i * 116} cy="22" r="9" fill={p.id === s.path ? '#F2762F' : '#1A2C40'} stroke="#0A1119" strokeWidth="3" />
            ))}
          </svg>
          <div className="text-xs text-center" style={{ color: 'var(--ice)' }}>เส้นทางย่อยใน{d.gr.name}</div>
        </div>
        {paths.map(p => (
          <button key={p.id} onClick={() => onSetPath(p.id)} className="btn w-full p-3 text-left"
            style={{ background: p.id === s.path ? 'linear-gradient(180deg,#5E3A1A,#2E1C0C)' : 'var(--stone)', borderColor: p.id === s.path ? 'var(--ember)' : undefined, whiteSpace: 'normal' }}>
            <div className="flex justify-between nowrap">
              <span className="font-bold">{p.icon} {p.name}</span>
              <span className="num text-xs" style={{ color: 'var(--frost)' }}>ภัย×{p.threatMul} ของ×{p.dropMul} ทอง×{p.goldMul}</span>
            </div>
            <div className="text-xs" style={{ color: 'var(--ice)' }}>{p.desc}</div>
          </button>
        ))}
      </>)}

      {tab === 'env' && (
        <div className="panel p-3">
          <div className="flex justify-between mb-2 nowrap">
            <span className="lbl" style={{ color: 'var(--ice)' }}>ภัย vs ความต้านทาน</span>
            <span className="num text-xs" style={{ color: d.strain > .6 ? 'var(--blood)' : 'var(--moss)' }}>
              ความเครียด <span className="fixw" style={{ minWidth: '5ch' }}>{d.strain.toFixed(2)}</span>
            </span>
          </div>
          {ENV.map(e => {
            const net = Math.max(0, d.thr[e.id] - d.res[e.id]);
            return (
              <div key={e.id} className="flex items-center gap-2 py-1.5">
                <span style={{ fontSize: 15, width: 22, opacity: d.thr[e.id] > .05 ? 1 : .3 }}>{e.icon}</span>
                <div className="flex-1"><Bar value={Math.min(100, d.thr[e.id] * 100)} color={net > 0 ? 'var(--blood)' : 'var(--moss)'} /></div>
                <span className="num text-xs fixw" style={{ minWidth: '11ch', color: 'var(--ice)' }}>
                  {d.thr[e.id].toFixed(2)} / {knowRes(e.id) ? d.res[e.id].toFixed(2) : '?'}
                </span>
              </div>
            );
          })}
          <div className="text-xs mt-2" style={{ color: 'var(--ice)' }}>
            แถบแดง = ทนไม่ไหว · ความเครียดลดพลัง เพิ่มความหิว ทำให้ของพังเร็ว
          </div>
        </div>
      )}
    </Modal>
  );
}
