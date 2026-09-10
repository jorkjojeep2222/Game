/* ============================================================
   CharacterCreate.jsx — ตั้งชื่อ แล้วเลือกเผ่าพันธุ์/คลาส หรือผสมสายเลือด
   ============================================================ */
import React, { useState } from 'react';
import { RACES } from '../data/races.js';
import { TRAITS, RUNE_STYLE } from '../data/traits.js';
import { ENV, STATS } from '../data/world.js';
import { Bar } from '../ui/widgets.jsx';

export default function CharacterCreate({ initialName = '', onCreate }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(initialName);
  const [openRace, setOpenRace] = useState(null);

  return (
    <div className="min-h-screen" style={{ background: 'var(--night)', color: 'var(--bone)' }}>
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="panel p-4 mb-5" style={{ borderColor: 'rgba(121,196,232,.5)' }}>
          <div className="lbl mb-1" style={{ color: 'var(--frost)' }}>system</div>
          <div className="text-base ttl font-bold">ยินดีต้อนรับสู่โลกนี้</div>
          <div className="text-xs" style={{ color: 'var(--ice)' }}>กรุณาระบุตัวตนของท่าน</div>
        </div>

        {step === 0 ? (
          <div>
            <div className="lbl mb-2" style={{ color: 'var(--ice)' }}>ชื่อของเจ้า</div>
            <input value={name} maxLength={16} onChange={e => setName(e.target.value)}
              placeholder="บยอร์น" className="w-full px-4 py-3 mb-4 text-lg" />
            <button onClick={() => setStep(1)} className="btn w-full py-3 text-lg"
              style={{ background: 'var(--frost)', color: '#06121C' }}>ยืนยันชื่อ</button>
          </div>
        ) : (
          <div>
            <button onClick={() => onCreate(name.trim() || 'ผู้ไร้นาม', 'mix')}
              className="btn w-full p-4 mb-4 text-left" style={{ background: 'linear-gradient(160deg,#7A2A2A,#3A1418)', whiteSpace: 'normal' }}>
              <div className="flex justify-between mb-1">
                <span className="font-bold text-base ttl">🩸 สายเลือดผสม</span>
                <span className="lbl" style={{ color: 'var(--gold)' }}>โหมดท้าทาย</span>
              </div>
              <p className="text-xs" style={{ color: '#F0C8B8' }}>
                สองเผ่าพันธุ์ถูกผสมโดยไม่มีใครรู้ว่าเป็นอะไร ได้ลักษณะสายเลือด <b>สองอย่าง</b> แทนหนึ่ง
                แต่ค่าพลังถูกเฉลี่ย และมีโอกาสน้อยมากที่จะเจอสายพันธุ์ตำนานที่ประทับตราสายเลือดแท้ให้เจ้า
              </p>
            </button>

            <button onClick={() => onCreate(name.trim() || 'ผู้ไร้นาม', 'random')}
              className="btn w-full p-3 mb-4 text-left" style={{ background: 'var(--stone)' }}>
              <span className="font-bold">🎲 สุ่มเผ่าพันธุ์</span>
              <span className="text-xs ml-2" style={{ color: 'var(--ice)' }}>ได้เผ่าแท้ รู้ค่าทั้งหมดทันที</span>
            </button>

            <div className="lbl mb-2" style={{ color: 'var(--ice)' }}>หรือเลือกเอง</div>
            <div className="space-y-2">
              {RACES.map(r => (
                <div key={r.id} className="panel p-3">
                  <button onClick={() => setOpenRace(openRace === r.id ? null : r.id)} className="w-full text-left">
                    <div className="flex justify-between items-baseline">
                      <span className="font-bold ttl">{r.icon} {r.name}</span>
                      <span className="text-xs" style={{ color: 'var(--ice)' }}>{r.tag}</span>
                    </div>
                    <div className="num text-xs mt-1 nowrap" style={{ color: 'var(--frost)' }}>
                      {STATS.map(x => `${x.abbr}×${r.stats[x.id].toFixed(2)}`).join(' ')}
                    </div>
                    <div className="text-xs mt-1" style={{ color: 'var(--ember)' }}>
                      {RUNE_STYLE[r.runeStyle].icon} รูนสไตล์ {RUNE_STYLE[r.runeStyle].label}
                    </div>
                    <div className="flex gap-1 mt-2">
                      {ENV.map(e => (
                        <div key={e.id} className="flex-1">
                          <Bar value={r.res[e.id] * 100} color="var(--frost)" height={5} />
                          <div className="text-center" style={{ fontSize: 9 }}>{e.icon}</div>
                        </div>
                      ))}
                    </div>
                  </button>

                  {openRace === r.id && (
                    <div className="mt-3 pt-3 space-y-2" style={{ borderTop: '2px solid rgba(0,0,0,.4)' }}>
                      <div className="text-xs"><b style={{ color: 'var(--ember)' }}>{TRAITS[r.trait].name}</b> — {TRAITS[r.trait].desc}</div>
                      {r.classes.map(c => (
                        <button key={c.id} onClick={() => onCreate(name.trim() || 'ผู้ไร้นาม', 'choose', r.id, c.id)}
                          className="btn w-full p-2 text-left" style={{ background: 'var(--stone3)' }}>
                          <div className="flex justify-between">
                            <span className="text-sm font-bold">{c.name}</span>
                            <span className="num text-xs" style={{ color: 'var(--frost)' }}>
                              {Object.entries(c.bias).map(([k, v]) => `${STATS.find(x => x.id === k).abbr}+${v}`).join(' ')}
                            </span>
                          </div>
                          <div className="text-xs" style={{ color: 'var(--ember)' }}>ทักษะ · {c.skill.name}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
