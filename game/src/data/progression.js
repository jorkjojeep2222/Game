/* ============================================================
   progression.js — เควสต์ (= ระบบแนะนำ + ตัวปลดล็อก UI) และฉายา
   ------------------------------------------------------------
   unlock: ชื่อคีย์ที่จะถูกเซ็ตใน state.unlocked
     status | market | items | skill | world | essence | pet | runes | rebirth
   หน้าจอจะซ่อนปุ่ม/แท็บไว้จนกว่าคีย์นั้นจะเป็น true
   ============================================================ */

export const QUESTS = [
  { id: 'q1', text: 'ออกล่าด้วยมือ 5 ครั้ง', hint: 'แตะที่ฉากต่อสู้ตรงกลางจอ',
    check: s => s.hunts >= 5, reward: { pts: 3 }, unlock: 'status', rewardText: 'เปิดหน้าต่างสถานะ' },
  { id: 'q2', text: 'ยืนยันการลงแต้มพลัง', hint: 'ปุ่มสถานะด้านล่าง → กด + แล้วกดยืนยัน',
    check: s => s.spent >= 3, reward: { gold: 120 }, unlock: 'market', rewardText: 'พบพ่อค้าเร่ + 120 ทอง' },
  { id: 'q3', text: 'ขายของให้พ่อค้า 1 ครั้ง', hint: 'ปุ่มตลาด → ขายหนังและกระดูก',
    check: s => s.sold >= 1, reward: { gold: 250 }, unlock: 'items', rewardText: 'เปิดกระเป๋า' },
  { id: 'q4', text: 'สังหารมอนสเตอร์ตัวแรก', hint: 'รอมันโผล่แล้วแตะรัวๆ ให้เลือดหมดก่อนมันหนี',
    check: s => s.beasts >= 1, reward: { pts: 4 }, unlock: 'essence', rewardText: 'ปลดล็อกเอสเซนส์' },
  { id: 'q5', text: 'สวมอาวุธชิ้นแรก', hint: 'ซื้อจากตลาดแล้วไปสวมในกระเป๋า',
    check: s => !!s.eq.weapon, reward: { pts: 3 }, unlock: 'skill', rewardText: 'ปลดล็อกทักษะประจำคลาส' },
  { id: 'q6', text: 'ใช้ทักษะประจำตัว 1 ครั้ง', hint: 'ปุ่มสีส้มใต้ฉากต่อสู้',
    check: s => s.skillUses >= 1, reward: { gold: 800 }, unlock: 'world', rewardText: 'เปิดแผนที่' },
  { id: 'q7', text: 'อัปเกรดกระเป๋า', hint: 'ตลาด → หมวดกระเป๋า',
    check: s => s.bag >= 2, reward: { gold: 1500 }, rewardText: 'เก็บของได้มากขึ้น' },
  { id: 'q8', text: 'ย้ายไปล่าที่ถิ่นใหม่', hint: 'แผนที่ → เลือกถิ่นที่ปลดล็อกแล้ว',
    check: s => s.migrations >= 1, reward: { pts: 5 }, rewardText: '5 แต้มพลัง' },
  { id: 'q9', text: 'ดูดซับเอสเซนส์ชิ้นแรก', hint: 'กระเป๋า → แท็บเอสเซนส์',
    check: s => s.essences.length >= 1, reward: { pts: 4 }, unlock: 'runes', rewardText: 'ปลดล็อกรูน' },
  { id: 'q10', text: 'ตื่นรูนแรกของเจ้า', hint: 'สถานะ → แท็บรูน',
    check: s => s.runes.length >= 1, reward: { gold: 20000 }, rewardText: 'พลังถาวรเพิ่มขึ้น' },
  { id: 'q11', text: 'ไปให้ถึงเลเวล 12', hint: 'ถิ่นโหดให้ค่าประสบการณ์เยอะกว่ามาก',
    check: s => s.lv >= 12, reward: { gold: 20000 }, unlock: 'pet', rewardText: 'ปลดล็อกสัตว์เลี้ยง' },
  { id: 'q12', text: 'ลองเปลี่ยนเส้นทางล่าดู', hint: 'แผนที่ → แท็บเส้นทาง',
    check: s => s.pathChanges >= 1, reward: { pts: 5 }, rewardText: '5 แต้มพลัง' },
  { id: 'q13', text: 'รอดผ่านฤดูหนาว 1 ครั้ง', hint: 'ฤดูหนาวเพิ่มภัยความหนาว +0.45',
    check: s => s.winters >= 1, reward: { gold: 80000 }, rewardText: 'ทองก้อนโต' },
  { id: 'q14', text: 'ไปให้ถึงเลเวล 28', hint: 'ระวังน้ำในถิ่นแห้งแล้ง',
    check: s => s.lv >= 28, reward: { pts: 10 }, unlock: 'rebirth', rewardText: 'ปลดล็อกการเกิดใหม่' },
];

export const TITLES = [
  { id: 't1', name: 'ผู้มาเยือน', req: 'เริ่มเกม', mult: 1.00, cond: () => true },
  { id: 't2', name: 'นักล่ามือเปล่า', req: 'ล่าด้วยมือ 100 ครั้ง', mult: 1.10, cond: s => s.hunts >= 100 },
  { id: 't3', name: 'พ่อค้าเลือดเย็น', req: 'ขายของ 30 ครั้ง', mult: 1.12, cond: s => s.sold >= 30 },
  { id: 't4', name: 'ผู้ท้าทายความหนาว', req: 'ผ่านฤดูหนาว 1 ครั้ง', mult: 1.15, cond: s => s.winters >= 1 },
  { id: 't5', name: 'ผู้เร่ร่อน', req: 'ย้ายถิ่น 3 ครั้ง', mult: 1.20, cond: s => s.migrations >= 3 },
  { id: 't6', name: 'นักล่ามหาสัตว์', req: 'สังหาร 25 ตัว', mult: 1.30, cond: s => s.beasts >= 25 },
  { id: 't7', name: 'ผู้ครองตำนาน', req: 'ได้ไอเท็มระดับตำนาน', mult: 1.40, cond: s => s.bestRar >= 4 },
  { id: 't8', name: 'ผู้ตื่นรูน', req: 'ตื่นรูน 4 ดวง', mult: 1.35, cond: s => s.runes.length >= 4 },
  { id: 't9', name: 'ผู้ก้าวข้ามขีดจำกัด', req: 'เลเวล 30', mult: 1.45, cond: s => s.lv >= 30 },
  { id: 't10', name: 'ผู้ฝ่าวงจร', req: 'เกิดใหม่ 1 ครั้ง', mult: 1.50, cond: s => s.rebirths >= 1 },
];
export const titleMult = s => TITLES.filter(t => s.titles.includes(t.id)).reduce((a, t) => a * t.mult, 1);
