/* ============================================================
   MarketModal.jsx — ขายวัตถุดิบ / ซื้ออุปกรณ์ / อัปเกรดกระเป๋า
   ------------------------------------------------------------
   หมายเหตุ: ราคาถูกคำนวณจาก `marketNow` ซึ่งเดินช้ากว่านาฬิกาหลัก
   (ดู App.jsx) เพื่อไม่ให้ตัวเลขในปุ่มกระพริบทุก 0.2 วินาที
   ============================================================ */
import React from 'react';
import { Modal, ItemCard } from '../../ui/widgets.jsx';
import { MATS, BASES, BAGS, priceMul } from '../../data/items.js';
import { BAG_SLOTS, BASE } from '../../core/config.js';
import { fmt } from '../../core/util.js';

export default function MarketModal({ s, d, marketNow, tab, onTab, onClose, onSellMat, onSellItem, onBuyBase, onBuyBag }) {
  return (
    <Modal icon="💰" title="พ่อค้าเร่" tabs={[['sell', 'ขาย'], ['gear', 'ซื้ออุปกรณ์'], ['bag', 'กระเป๋า']]}
      activeTab={tab} onTab={onTab} onClose={onClose} right={`🪙 ${fmt(s.gold)}`}>

      {tab === 'sell' && (<>
        <div className="panel p-2 text-xs" style={{ color: 'var(--ice)' }}>
          ราคาขึ้นลงตามเวลาและต่างกันในแต่ละถิ่น — ถือรอราคาดี หรือขายก่อนกระเป๋าเต็ม
        </div>
        {MATS.map(m => {
          const pm = priceMul(m.id, s.ground, marketNow);
          const unit = m.base * pm * d.sellMul * d.goldMul;
          const trend = pm > 1.12 ? { t: '▲ ราคาดี', c: 'var(--moss)' }
            : pm < .9 ? { t: '▼ ราคาตก', c: 'var(--blood)' }
              : { t: '● ปกติ', c: 'var(--ice)' };
          return (
            <div key={m.id} className="panel p-3">
              <div className="flex justify-between items-baseline mb-1 nowrap">
                <span className="font-bold">{m.icon} {m.name}</span>
                <span className="num text-xs" style={{ color: trend.c }}>
                  {trend.t} · <span className="fixw" style={{ minWidth: '6ch' }}>{unit.toFixed(2)}</span>🪙
                </span>
              </div>
              <div className="num text-xs mb-2" style={{ color: 'var(--ice)' }}>
                มีอยู่ {fmt(s[m.id])}{m.keep ? ' · เนื้อคืออาหาร อย่าขายหมด' : ''}
              </div>
              <div className="flex gap-2">
                {[[.5, 'ครึ่ง'], [1, 'ทั้งหมด']].map(([f, label]) => (
                  <button key={label} onClick={() => onSellMat(m.id, f)} disabled={s[m.id] < 1}
                    className="btn flex-1 py-2 text-xs" style={{ background: 'linear-gradient(180deg,#F0C24A,#B8901E)', color: '#2A1E06' }}>
                    ขาย{label} · <span className="num fixw" style={{ minWidth: '6ch' }}>{fmt(Math.floor(Math.floor(s[m.id] * f) * unit))}</span>🪙
                  </button>
                ))}
              </div>
            </div>
          );
        })}
        {s.inv.length > 0 && (
          <div className="panel p-3">
            <div className="lbl mb-2" style={{ color: 'var(--ice)' }}>ขายไอเท็ม</div>
            <div className="grid grid-cols-2 gap-2">
              {s.inv.map(it => <ItemCard key={it.uid} item={it} onClick={() => onSellItem(it)} showValue sellMul={d.sellMul} />)}
            </div>
          </div>
        )}
      </>)}

      {tab === 'gear' && (<>
        <div className="panel p-2 text-xs" style={{ color: 'var(--ice)' }}>พ่อค้าขายแค่ของสามัญ — ของดีต้องไปเอาจากมอนสเตอร์</div>
        {BASES.filter(b => b.lv <= s.lv + 3).map(b => {
          const cost = Math.floor(b.price * BASE.shopMarkup);
          const ok = s.gold >= cost && s.inv.length < BAG_SLOTS;
          return (
            <button key={b.id} onClick={() => onBuyBase(b)} disabled={!ok} className="btn w-full p-3 text-left" style={{ background: 'var(--stone)' }}>
              <div className="flex justify-between">
                <div>
                  <div className="font-bold text-sm">{b.name}</div>
                  <div className="text-xs" style={{ color: 'var(--ice)' }}>
                    {b.power ? `พลัง ×${b.power}` : b.resAll ? `ต้านทานทุกชนิด +${b.resAll}` : 'หิว/กระหายช้าลง'} · ต้องเลเวล {b.lv}
                  </div>
                </div>
                <div className="num text-sm self-end" style={{ color: 'var(--gold)' }}>{fmt(cost)}🪙</div>
              </div>
            </button>
          );
        })}
      </>)}

      {tab === 'bag' && (<>
        <div className="panel p-2 text-xs" style={{ color: 'var(--ice)' }}>
          ที่เก็บเต็มแล้วของที่หามาได้จะหายไปเปล่าๆ
          {s.wasted > 0 && <span className="num" style={{ color: 'var(--blood)' }}> · เสียไปแล้ว {fmt(s.wasted)}</span>}
        </div>
        {BAGS.map(b => {
          const current = b.lv === s.bag, next = b.lv === s.bag + 1;
          return (
            <div key={b.lv} className="panel p-3 flex justify-between items-center"
              style={{ opacity: b.lv <= s.bag + 1 ? 1 : .45, borderColor: current ? 'var(--ember)' : undefined }}>
              <div>
                <div className="font-bold text-sm">{b.name}</div>
                <div className="num text-xs" style={{ color: 'var(--ice)' }}>ความจุ ×{b.mult}</div>
              </div>
              {current
                ? <span className="num text-xs" style={{ color: 'var(--ember)' }}>ใช้อยู่</span>
                : next
                  ? <button onClick={onBuyBag} disabled={s.gold < b.cost} className="btn px-3 py-2 text-xs"
                      style={{ background: 'linear-gradient(180deg,#F0C24A,#B8901E)', color: '#2A1E06' }}>{fmt(b.cost)}🪙</button>
                  : <span className="num text-xs" style={{ color: 'var(--ice)' }}>{fmt(b.cost)}🪙</span>}
            </div>
          );
        })}
      </>)}
    </Modal>
  );
}
