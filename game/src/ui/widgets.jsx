/* ============================================================
   widgets.jsx — ชิ้นส่วน UI ที่ใช้ซ้ำทั้งเกม
   ============================================================ */
import React from 'react';
import { fmt } from '../core/util.js';
import { RARITY, baseById, itemValue } from '../data/items.js';

/** แถบค่า */
export function Bar({ value, max = 100, color, height }) {
  return (
    <div className="bar" style={height ? { height } : undefined}>
      <i style={{ width: `${Math.max(0, Math.min(100, (value / max) * 100))}%`, background: color }} />
    </div>
  );
}

/** แถวข้อมูล ซ้าย-ขวา ตัวเลขกว้างคงที่กันหน้าจอขยับ */
export function Row({ label, value, color, w = 9 }) {
  return (
    <div className="flex justify-between num text-xs py-0.5 nowrap">
      <span style={{ color: 'var(--ice)' }}>{label}</span>
      <span className="fixw" style={{ color, minWidth: `${w}ch` }}>{value}</span>
    </div>
  );
}

/** ตัวเลขที่เปลี่ยนบ่อย — จองความกว้างไว้ล่วงหน้า */
export function Num({ children, w = 6, color }) {
  return <span className="num fixw" style={{ minWidth: `${w}ch`, color }}>{children}</span>;
}

export function ItemCard({ item, onClick, showValue, sellMul = 1 }) {
  const base = baseById(item.base), rar = RARITY[item.rar];
  return (
    <button onClick={onClick} className="btn w-full p-2 text-left" style={{ background: 'var(--stone3)', borderColor: rar.color }}>
      <div className="text-xs font-bold truncate" style={{ color: rar.color }}>{base.name}</div>
      <div className="num nowrap" style={{ fontSize: 10, color: 'var(--ice)' }}>
        {rar.name} · iLv{item.ilvl}
        {item.affixes.length ? ` · ${item.affixes.length} คุณสมบัติ` : ''}
        {showValue ? ` · ${fmt(Math.floor(itemValue(item) * .55 * sellMul))}🪙` : ''}
      </div>
    </button>
  );
}

/* ============================================================
   Modal — หน้าต่างซ้อนแบบเกมมือถือ
   ------------------------------------------------------------
   สำคัญ: ใช้ inset ตายตัว (top/bottom/left/right) ไม่ใช้ flex center
   ความสูงจึงคงที่เสมอ เนื้อหาข้างในเลื่อนเอง
   → แก้ปัญหาหน้าต่างเด้งขึ้นลงตอนตัวเลขข้างในเปลี่ยน
   ============================================================ */
export function Modal({ icon, title, tabs, activeTab, onTab, right, onClose, children }) {
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(3,7,12,.82)' }}
    >
      <div
        className="popin"
        onClick={e => e.stopPropagation()}
        style={{
          position: 'absolute',
          top: '3vh', bottom: '3vh',
          left: '50%', transform: 'translateX(-50%)',
          width: 'min(96vw, 28rem)',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* หัวเรื่อง */}
        <div className="flex items-center gap-3 px-3 py-3 shrink-0"
          style={{ background: 'linear-gradient(180deg,#33506E,#1D3149)', borderRadius: '14px 14px 0 0', border: '2px solid rgba(0,0,0,.5)', borderBottom: 'none' }}>
          <div className="flex items-center justify-center shrink-0"
            style={{ width: 42, height: 42, borderRadius: 21, fontSize: 20, background: 'linear-gradient(180deg,#F2762F,#B84C18)', border: '2px solid rgba(0,0,0,.45)', boxShadow: 'inset 0 2px 0 rgba(255,255,255,.25)' }}>
            {icon}
          </div>
          <div className="flex-1 text-center text-xl font-extrabold ttl">{title}</div>
          <button onClick={onClose} className="shrink-0 text-2xl font-bold px-2" style={{ color: 'rgba(255,255,255,.7)' }}>✕</button>
        </div>

        {/* แท็บย่อย */}
        {tabs && tabs.length > 0 && (
          <div className="flex gap-1 px-2 py-2 shrink-0"
            style={{ background: '#16283C', borderLeft: '2px solid rgba(0,0,0,.5)', borderRight: '2px solid rgba(0,0,0,.5)' }}>
            {tabs.map(([key, label]) => (
              <button key={key} onClick={() => onTab(key)} className="btn flex-1 py-2 text-xs"
                style={{ background: activeTab === key ? 'var(--ember)' : 'var(--stone3)', color: activeTab === key ? '#26100A' : 'var(--bone)' }}>
                {label}
              </button>
            ))}
          </div>
        )}

        {/* แถบข้อมูลขวา */}
        {right && (
          <div className="px-3 py-1.5 text-right num text-sm shrink-0 nowrap"
            style={{ background: '#12202F', borderLeft: '2px solid rgba(0,0,0,.5)', borderRight: '2px solid rgba(0,0,0,.5)', color: 'var(--gold)' }}>
            {right}
          </div>
        )}

        {/* เนื้อหา — ส่วนเดียวที่เลื่อน */}
        <div className="scroll p-3 space-y-2"
          style={{ background: 'var(--stone2)', border: '2px solid rgba(0,0,0,.5)', borderTop: 'none', borderRadius: '0 0 14px 14px', flex: 1, minHeight: 0 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

/** กล่องป๊อปอัปกลางจอ (รางวัล/เควสต์/รายงาน) */
export function Popup({ children, borderColor, glow }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(3,7,12,.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="panel popin p-5" style={{ width: '100%', maxWidth: '24rem', borderColor, boxShadow: glow ? `0 0 44px ${glow}` : undefined }}>
        {children}
      </div>
    </div>
  );
}
