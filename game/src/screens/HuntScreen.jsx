/* ============================================================
   HuntScreen.jsx — หน้าจอหลัก
   ------------------------------------------------------------
   กันหน้าจอขยับ:
     - ทุกช่องที่มีตัวเลขเปลี่ยนบ่อยใช้ .fixw + minWidth เป็น ch
     - แถบเควสต์ / ปุ่มทักษะ / กล่องเตือน ใช้ความสูงจองไว้ (minHeight)
       เพื่อไม่ให้เนื้อหาด้านล่างกระโดดตอนมันโผล่/หาย
   ============================================================ */
import React from 'react';
import PixelScene from '../art/PixelScene.jsx';
import { Bar, Num } from '../ui/widgets.jsx';
import { fmt } from '../core/util.js';
import { SKILL_LIB } from '../data/species.js';
import { QUESTS } from '../data/progression.js';
import { MONSTER_UNLOCK_QUEST, STAGE } from '../core/config.js';

export default function HuntScreen({ s, d, now, fxRef, onTap, onSkill, onOpen }) {
  const B = s.blood;
  const quest = QUESTS[s.quest];
  const cd = Math.max(0, s.skillReady - now);
  const nextIn = Math.max(0, Math.ceil((s.nextEvent - now) / 1000));

  const NAV = [
    { id: 'status', icon: '📊', label: 'สถานะ', on: s.unlocked.status, badge: s.pts > 0 },
    { id: 'items', icon: '🎒', label: 'ของ', on: s.unlocked.items, badge: s.pending.length > 0 },
    { id: 'market', icon: '💰', label: 'ตลาด', on: s.unlocked.market },
    { id: 'world', icon: '🗺️', label: 'แผนที่', on: s.unlocked.world },
    { id: 'sys', icon: '⚙️', label: 'ระบบ', on: true },
  ];

  return (
    <div className={d.skillOn || d.peptideOn ? 'warm' : ''} style={{ background: 'var(--night)', transition: 'background .6s', minHeight: '100vh' }}>
      <div className="max-w-md mx-auto px-3 pb-3 pt-2">

        {/* ---------- แถบสถานะบน ---------- */}
        <div className="panel px-3 py-2 mb-2">
          <div className="flex justify-between items-baseline nowrap">
            <div className="truncate">
              <span className="font-extrabold ttl">{s.name}</span>
              <span className="text-xs ml-2" style={{ color: 'var(--ice)' }}>
                {B.raceIcon} {B.mixed ? 'ลูกผสม' : B.raceName} · {B.className}
              </span>
            </div>
            <span className="num font-bold fixw" style={{ color: 'var(--frost)', minWidth: '6ch' }}>Lv {s.lv}</span>
          </div>
          <div className="mt-1.5"><Bar value={s.exp} max={d.need} color="linear-gradient(90deg,#4E9FD0,#79C4E8)" /></div>

          <div className="grid grid-cols-5 gap-1 mt-2 nowrap" style={{ fontSize: 11 }}>
            <span style={{ color: 'var(--gold)' }}>🪙<Num w={7}>{fmt(s.gold)}</Num></span>
            <span style={{ color: 'var(--gold)' }}>🧩<Num w={4}>{s.fragments || 0}</Num></span>
            <span>🥩<Num w={5}>{fmt(s.meat)}</Num><span className="num" style={{ color: 'var(--ice)' }}>/{fmt(d.capMeat)}</span></span>
            <span style={{ color: '#C9B08A' }}>🦴<Num w={5}>{fmt(s.hide)}</Num><span className="num" style={{ color: 'var(--ice)' }}>/{fmt(d.capHide)}</span></span>
            <span style={{ color: '#5FA8D3' }}>💧<Num w={5}>{fmt(s.water)}</Num><span className="num" style={{ color: 'var(--ice)' }}>/{fmt(d.capWater)}</span></span>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2">
            <Bar value={s.satiety} color={s.satiety < 25 ? 'var(--blood)' : 'linear-gradient(90deg,#B84C18,#F2762F)'} />
            <Bar value={s.hydration} color={s.hydration < 25 ? 'var(--blood)' : 'linear-gradient(90deg,#2E7FA8,#5FC0E8)'} />
          </div>

          <div className="mt-2">
            <div className="flex justify-between text-xs nowrap" style={{ color: 'var(--ice)', marginBottom: 2 }}>
              <span>ความอึด (การแตะมือ) {(s.stamina ?? 100) < 20 && <span style={{ color: 'var(--blood)' }}>⚠ ล้า</span>}</span>
              <span className="num fixw" style={{ minWidth: '4ch' }}>{Math.round(s.stamina ?? 100)}%</span>
            </div>
            <Bar value={s.stamina ?? 100} color={(s.stamina ?? 100) < 20 ? 'var(--blood)' : 'linear-gradient(90deg,#F0C24A,#6E9B5E)'} />
          </div>
        </div>

        {/* ---------- เควสต์ (ความสูงจองไว้) ---------- */}
        <div style={{ minHeight: 66, marginBottom: 8 }}>
          {quest && (
            <div className="panel px-3 py-2" style={{ background: 'linear-gradient(180deg,#1E3A52,#16283C)', borderColor: 'rgba(121,196,232,.4)' }}>
              <div className="flex justify-between nowrap">
                <span className="lbl" style={{ color: 'var(--frost)' }}>เควสต์ {s.quest + 1}/{QUESTS.length}</span>
                <span className="lbl truncate" style={{ color: 'var(--gold)' }}>{quest.rewardText}</span>
              </div>
              <div className="text-sm font-bold">{quest.text}</div>
              <div className="text-xs" style={{ color: 'var(--ice)' }}>{quest.hint}</div>
            </div>
          )}
        </div>

        {/* ---------- ฉากต่อสู้ ---------- */}
        <button onClick={onTap} className="w-full mb-2 block overflow-hidden"
          style={{ borderRadius: 14, border: '2px solid rgba(0,0,0,.5)', boxShadow: '0 3px 0 rgba(0,0,0,.35)' }}>
          <div style={{ position: 'relative' }}>
            <PixelScene blood={B} fxRef={fxRef} />

            <div className="flex justify-between px-2 py-1.5 text-xs nowrap"
              style={{ position: 'absolute', top: 0, left: 0, right: 0, background: 'linear-gradient(180deg,rgba(0,0,0,.6),transparent)' }}>
              <span className="font-bold truncate" style={{ color: s.stageKills >= STAGE.bossWaveSize ? '#FF4A4A' : s.battle?.isHorde ? '#F2762F' : '#F0C24A' }}>
                ด่าน {s.stage} — {s.stageKills >= STAGE.bossWaveSize ? '🔥 บอสทะลวงด่าน!' : s.battle?.isHorde ? '⚠️ ฝูงมอนสเตอร์คลั่ง!' : `เวฟ ${s.stageKills + 1}/${STAGE.bossWaveSize + 1}`}
              </span>
              <span style={{ color: '#CFE0EC' }}>{d.gr.icon} {d.gr.name}</span>
            </div>

            <div className="px-2 py-1.5 nowrap"
              style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(0deg,rgba(0,0,0,.78),transparent)', minHeight: 40 }}>
              {s.battle ? (
                <div className="flex items-center gap-2">
                  <span className="text-lg">{s.battle.species.icon}</span>
                  <div className="flex-1 text-left truncate">
                    <div className="text-xs font-bold" style={{ color: s.battle.legend ? 'var(--gold)' : '#fff' }}>
                      {s.battle.species.name}{s.battle.legend ? ' ✦' : ''}
                    </div>
                    <div className="num truncate" style={{ fontSize: 10, color: '#BFD4E2' }}>
                      เอสเซนส์ · {SKILL_LIB[s.battle.species.skill]?.name}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="num text-xs font-bold fixw" style={{ color: '#FF8A78', minWidth: '7ch' }}>{fmt(s.battle.hp)}</div>
                    <div className="num fixw" style={{ fontSize: 10, color: '#BFD4E2', minWidth: '7ch' }}>{Math.ceil((s.battle.expires - now) / 1000)} วิ</div>
                  </div>
                </div>
              ) : (
                <div className="text-xs num text-left" style={{ color: '#CFE0EC' }}>
                  แตะเพื่อล่า · พลัง <span className="fixw" style={{ minWidth: '7ch' }}>{fmt(d.power)}</span>
                  {s.quest >= MONSTER_UNLOCK_QUEST && (
                    <span style={{ color: '#FFB27A' }}> · มอนสเตอร์ถัดไปใน <span className="fixw" style={{ minWidth: '4ch' }}>{nextIn}</span> วิ</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </button>

        {/* ---------- ปุ่มทักษะ (ความสูงจองไว้) ---------- */}
        <div style={{ minHeight: 52, marginBottom: 8 }}>
          {s.unlocked.skill && (
            <button onClick={onSkill} disabled={cd > 0} className="btn w-full py-3 text-base"
              style={{ background: cd > 0 ? 'var(--stone3)' : 'linear-gradient(180deg,#F2762F,#B84C18)', color: cd > 0 ? 'var(--ice)' : '#2A1006' }}>
              {d.skillOn
                ? <>{B.cls.skill.name} · <span className="num fixw" style={{ minWidth: '3ch' }}>{Math.ceil((s.skillEnd - now) / 1000)}</span> วิ</>
                : cd > 0
                  ? <>{B.cls.skill.name} · <span className="num fixw" style={{ minWidth: '3ch' }}>{Math.ceil(cd / 1000)}</span> วิ</>
                  : <>⚡ {B.cls.skill.name}</>}
            </button>
          )}
        </div>

        {/* ---------- คำเตือน (ความสูงจองไว้) ---------- */}
        <div style={{ minHeight: 44, marginBottom: 8 }}>
          {(s.satiety < 25 || s.hydration < 25) && (
            <div className="panel p-2 text-xs" style={{ background: 'rgba(155,56,56,.35)', borderColor: 'var(--blood)' }}>
              ⚠ {s.hydration < 25 ? 'ขาดน้ำอย่างหนัก — ย้ายไปถิ่นที่มีน้ำมากกว่า หรือเพิ่ม SEN' : 'อดอยาก — เพิ่มพลังหรือย้ายถิ่นที่เนื้อเยอะ'}
            </div>
          )}
        </div>

        {/* ---------- แถบไอคอนล่าง ---------- */}
        <div className="grid grid-cols-5 gap-1.5">
          {NAV.map(n => (
            <button key={n.id} onClick={() => n.on && onOpen(n.id)} disabled={!n.on} className="navb py-2"
              style={{ position: 'relative', background: n.on ? 'linear-gradient(180deg,#2A415A,#1A2C40)' : '#141F2C', opacity: n.on ? 1 : .4 }}>
              <div style={{ fontSize: 19 }}>{n.on ? n.icon : '🔒'}</div>
              <div style={{ fontSize: 10, color: 'var(--ice)' }}>{n.on ? n.label : ''}</div>
              {n.badge && <span className="pulse" style={{ position: 'absolute', top: 4, right: 6, width: 9, height: 9, borderRadius: 5, background: 'var(--ember)', border: '1px solid rgba(0,0,0,.5)' }} />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
