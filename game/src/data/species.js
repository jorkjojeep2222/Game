/* ============================================================
   species.js — สายพันธุ์มอนสเตอร์ + สกิลเอสเซนส์ที่มันให้
   ------------------------------------------------------------
   วิธีเพิ่มมอนสเตอร์ใหม่:
     1. เพิ่มสกิลใน SKILL_LIB (ถ้าต้องการสกิลใหม่)
     2. เพิ่ม entry ใน SPECIES[ภัยสิ่งแวดล้อม]
        - shape: อ้างชื่อทรงร่างใน art/sprites.js (quad/wraith/serpent/winged/bug/golem)
        - pal:   จานสี 5 สี o=เส้นขอบ 1=ฐาน 2=สว่าง 3=เงา e=ตา
   ไม่ต้องแก้โค้ดวาดเลย
   ============================================================ */
import { pick } from '../core/util.js';

/** apply(o) แก้ไข object โบนัสรวมที่ derive.js สร้างขึ้น */
export const SKILL_LIB = {
  frostbite: { name: 'ไอเยือกแข็ง', desc: 'ต้านหนาว +0.16 · ลดผลกระทบความเครียด 8%', apply: o => { o.res.cold += .16; o.strainSoft += .08; } },
  snowveil: { name: 'ม่านหิมะ', desc: 'ต้านหนาว +0.10 · โอกาสของหายาก +10%', apply: o => { o.res.cold += .10; o.luck *= 1.10; } },
  scorch: { name: 'เกล็ดเพลิง', desc: 'ต้านร้อน +0.16 · พลัง +6% ตอนอิ่ม >70%', apply: o => { o.res.heat += .16; o.hotPower += .06; } },
  ember: { name: 'ประกายไฟ', desc: 'ต้านร้อน +0.10 · ทองที่ได้ +10%', apply: o => { o.res.heat += .10; o.gold *= 1.10; } },
  tidewalk: { name: 'ท่วงท่าสายน้ำ', desc: 'ต้านฝน +0.16 · เก็บน้ำได้ +18%', apply: o => { o.res.rain += .16; o.water *= 1.18; } },
  stormcall: { name: 'เรียกพายุ', desc: 'ต้านฝน +0.10 · พลังรวม +8%', apply: o => { o.res.rain += .10; o.power *= 1.08; } },
  venomfang: { name: 'เขี้ยวพิษ', desc: 'ต้านพิษ +0.16 · พลัง +10% ในถิ่นพิษ', apply: o => { o.res.poison += .16; o.poisonPower += .10; } },
  numbtouch: { name: 'สัมผัสชา', desc: 'ต้านพิษ +0.10 · หิว/กระหายช้าลง 12%', apply: o => { o.res.poison += .10; o.vigor *= 1.12; } },
  sandglide: { name: 'ร่อนผ่านทราย', desc: 'ต้านฝุ่น +0.16 · ดาเมจต่อการแตะ +10%', apply: o => { o.res.dust += .16; o.tap *= 1.10; } },
  dunelord: { name: 'เจ้าแห่งเนิน', desc: 'ต้านฝุ่น +0.10 · ทองที่ได้ +12%', apply: o => { o.res.dust += .10; o.gold *= 1.12; } },
  cinderhide: { name: 'ผิวหนังเถ้า', desc: 'ต้านเถ้าลาวา +0.18 · พลังรวม +10%', apply: o => { o.res.ash += .18; o.power *= 1.10; } },
  magmacore: { name: 'แกนลาวา', desc: 'ต้านเถ้าลาวา +0.12 · โอกาสของหายาก +18%', apply: o => { o.res.ash += .12; o.luck *= 1.18; } },
};

export const SPECIES = {
  cold: [
    { id: 'frostfang', name: 'หมาป่าเขี้ยวแช่แข็ง', icon: '🐺', shape: 'quad', skill: 'frostbite',
      pal: { o: '#0D2233', 1: '#6FB6DE', 2: '#C8ECFB', 3: '#2E5F86', e: '#FFE9A8' } },
    { id: 'snowwraith', name: 'ภูตหิมะ', icon: '👻', shape: 'wraith', skill: 'snowveil',
      pal: { o: '#16283C', 1: '#A9CBE6', 2: '#EAF6FF', 3: '#4A6B88', e: '#9BF0FF' } },
  ],
  heat: [
    { id: 'sunboar', name: 'หมูป่าแผดเผา', icon: '🐗', shape: 'quad', skill: 'scorch',
      pal: { o: '#3A1408', 1: '#C86436', 2: '#F0A860', 3: '#7A3418', e: '#FFE070' } },
    { id: 'emberimp', name: 'ปีศาจประกาย', icon: '👹', shape: 'wraith', skill: 'ember',
      pal: { o: '#3A0E08', 1: '#E06A2E', 2: '#FFC070', 3: '#8A2A10', e: '#FFF0A0' } },
  ],
  rain: [
    { id: 'bogserpent', name: 'งูหนองน้ำ', icon: '🐍', shape: 'serpent', skill: 'tidewalk',
      pal: { o: '#10281E', 1: '#4E9A6E', 2: '#90D8A0', 3: '#23543C', e: '#E8FF90' } },
    { id: 'stormhawk', name: 'เหยี่ยวพายุ', icon: '🦅', shape: 'winged', skill: 'stormcall',
      pal: { o: '#142A38', 1: '#5E93AE', 2: '#B8DCEC', 3: '#2C4F66', e: '#FFE86A' } },
  ],
  poison: [
    { id: 'venomtoad', name: 'คางคกพิษ', icon: '🐸', shape: 'quad', skill: 'venomfang',
      pal: { o: '#12300E', 1: '#6EAE3E', 2: '#B6E86A', 3: '#33601E', e: '#E0FF80' } },
    { id: 'mireleech', name: 'ปลิงหนองลึก', icon: '🪱', shape: 'serpent', skill: 'numbtouch',
      pal: { o: '#221436', 1: '#7A4E9E', 2: '#BE92DC', 3: '#442A62', e: '#A8FF70' } },
  ],
  dust: [
    { id: 'sandscor', name: 'แมงป่องทราย', icon: '🦂', shape: 'bug', skill: 'sandglide',
      pal: { o: '#34240E', 1: '#B08A44', 2: '#E6C880', 3: '#6A5220', e: '#FF9C4A' } },
    { id: 'dunecrawler', name: 'ตัวคลานเนินทราย', icon: '🐛', shape: 'bug', skill: 'dunelord',
      pal: { o: '#2A2210', 1: '#8E7A3E', 2: '#CFB674', 3: '#544426', e: '#FFD26A' } },
  ],
  ash: [
    { id: 'ashdrake', name: 'ไวเวิร์นเถ้าถ่าน', icon: '🐲', shape: 'winged', skill: 'cinderhide',
      pal: { o: '#200A08', 1: '#7E2A20', 2: '#D4573A', 3: '#46120E', e: '#FF9A3A' } },
    { id: 'magmagolem', name: 'โกเลมลาวา', icon: '🗿', shape: 'golem', skill: 'magmacore',
      pal: { o: '#1A0C08', 1: '#4E3830', 2: '#7E5A48', 3: '#2C1A14', e: '#FF6A20' } },
  ],
};

/** สายพันธุ์ตำนาน — โผล่น้อยมาก ให้รูนพิเศษกับสายเลือดผสม */
export const LEGEND_SPECIES = [
  { id: 'ancientdragon', name: 'มังกรโบราณ', icon: '🐉', shape: 'winged', skill: 'cinderhide', rune: 'dragon', envPool: ['ash', 'heat'],
    pal: { o: '#2A0808', 1: '#A8302A', 2: '#F0703A', 3: '#5E1410', e: '#FFE060' } },
  { id: 'primalspirit', name: 'ภูติปฐมกาล', icon: '👻', shape: 'wraith', skill: 'snowveil', rune: 'spirit', envPool: ['cold', 'rain'],
    pal: { o: '#0E2830', 1: '#58B0A8', 2: '#B0F0E4', 3: '#265E5E', e: '#E8FFF0' } },
];

/** สุ่มสายพันธุ์จากภัยสิ่งแวดล้อมที่กำหนด */
export const pickSpecies = env => pick(SPECIES[env] || SPECIES.cold);

/** ข้อมูลเอสเซนส์ที่ได้จากการสังหาร (เก็บลงเซฟ จึงเก็บแค่ค่าที่จำเป็น) */
export const essenceFrom = sp => ({ species: sp.id, name: sp.name, icon: sp.icon, skill: sp.skill });
