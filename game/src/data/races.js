/* ============================================================
   races.js — เผ่าพันธุ์ 5 เผ่า × คลาสละ 3 = 15 บิลด์
   pal = จานสีสำหรับวาดสไปรต์ตัวละคร
   skill.type ต้องตรงกับที่ derive.js/simulate.js รองรับ:
     power | sustain | bait | blood | craft | harvest | guard | water | elem | beast
   ============================================================ */

export const RACES = [
  {
    id: 'human', name: 'มนุษย์', icon: '🗡️', tag: 'สมดุล เรียนรู้ไว', runeStyle: 'fate',
    pal: { hair: '#6B4A2A', hairL: '#8F6838', cloth: '#3E6790', clothL: '#5A88B4', clothD: '#26415C', skin: '#D9A277', skinL: '#F0C79B', skinD: '#A5714C' },
    stats: { str: 1.00, agi: 1.00, vit: 1.00, sen: 1.00, int: 1.00 }, power: 1.00,
    res: { cold: .15, heat: .15, rain: .15, poison: .15, dust: .15, ash: .10 }, trait: 'quicklearn',
    classes: [
      { id: 'sword', name: 'นักดาบ', bias: { str: 3, agi: 2 }, skill: { type: 'power', mult: 3.5, dur: 30, cd: 150, name: 'ดาบพายุ' } },
      { id: 'mage', name: 'นักเวท', bias: { int: 4, sen: 1 }, skill: { type: 'power', mult: 4.5, dur: 20, cd: 150, name: 'ลูกไฟ' } },
      { id: 'priest', name: 'นักบวช', bias: { vit: 2, int: 3 }, skill: { type: 'sustain', dur: 60, cd: 150, name: 'พรแห่งแสง' } },
    ],
  },
  {
    id: 'barbarian', name: 'บาบาเรียน', icon: '🪓', tag: 'พลังดิบ ทนหนาว ไร้เวทมนตร์', runeStyle: 'tattoo',
    pal: { hair: '#3A2416', hairL: '#5A3A22', cloth: '#7A4A2E', clothL: '#A0683E', clothD: '#4E2E1A', skin: '#D08E60', skinL: '#EDB585', skinD: '#9A5F3C' },
    stats: { str: 1.45, agi: 1.05, vit: 1.35, sen: 0.90, int: 0.55 }, power: 1.15,
    res: { cold: .65, heat: .10, rain: .30, poison: .15, dust: .10, ash: .00 }, trait: 'boilblood',
    classes: [
      { id: 'berserk', name: 'นักรบคลั่ง', bias: { str: 4, vit: 1 }, skill: { type: 'power', mult: 5.5, dur: 30, cd: 150, name: 'ปลดปล่อยความคลั่ง' } },
      { id: 'beasth', name: 'ผู้ล่ามหาสัตว์', bias: { str: 3, sen: 2 }, skill: { type: 'bait', dur: 45, cd: 150, name: 'ตามรอยเลือด' } },
      { id: 'bshaman', name: 'หมอผีสายเลือด', bias: { vit: 3, int: 2 }, skill: { type: 'blood', mult: 7, dur: 25, cd: 150, name: 'สังเวยเลือด' } },
    ],
  },
  {
    id: 'dwarf', name: 'คนแคระ', icon: '⚒️', tag: 'ช่างฝีมือ ทนพิษ ทนร้อน', runeStyle: 'tattoo',
    pal: { hair: '#8A4A20', hairL: '#B26A2E', cloth: '#8E5A2B', clothL: '#B87C3E', clothD: '#5E3A1A', skin: '#D89E70', skinL: '#F2C298', skinD: '#A06C46' },
    stats: { str: 1.20, agi: 0.75, vit: 1.40, sen: 0.95, int: 1.25 }, power: 0.90,
    res: { cold: .30, heat: .60, rain: .10, poison: .55, dust: .55, ash: .40 }, trait: 'craftsman',
    classes: [
      { id: 'rune', name: 'ช่างรูน', bias: { int: 4, vit: 1 }, skill: { type: 'craft', dur: 60, cd: 150, name: 'จารรูนคุ้มครอง' } },
      { id: 'delve', name: 'นักขุด', bias: { str: 3, vit: 2 }, skill: { type: 'harvest', mult: 3, dur: 35, cd: 150, name: 'ขุดลึก' } },
      { id: 'iron', name: 'ทหารเกราะเหล็ก', bias: { vit: 4, str: 1 }, skill: { type: 'guard', dur: 50, cd: 150, name: 'ตั้งแนวรับ' } },
    ],
  },
  {
    id: 'elf', name: 'เอลฟ์', icon: '🏹', tag: 'สัมผัสไว ปัญญาสูง ร่างบอบบาง', runeStyle: 'glyph',
    pal: { hair: '#D8C070', hairL: '#F2E29A', cloth: '#33705A', clothL: '#4E9878', clothD: '#1E4A3A', skin: '#EFD2B4', skinL: '#FCEAD4', skinD: '#BF9A78' },
    stats: { str: 0.80, agi: 1.30, vit: 0.70, sen: 1.50, int: 1.35 }, power: 0.95,
    res: { cold: .20, heat: .20, rain: .65, poison: .50, dust: .15, ash: .05 }, trait: 'woodsense',
    classes: [
      { id: 'ranger', name: 'นักธนู', bias: { agi: 3, sen: 2 }, skill: { type: 'power', mult: 3.2, dur: 40, cd: 150, name: 'ยิงรัว' } },
      { id: 'druid', name: 'ดรูอิด', bias: { sen: 3, int: 2 }, skill: { type: 'water', cd: 150, name: 'เรียกฝน' } },
      { id: 'elem', name: 'นักเวทธาตุ', bias: { int: 4, sen: 1 }, skill: { type: 'elem', mult: 3, dur: 35, cd: 150, name: 'ห่อหุ้มธาตุ' } },
    ],
  },
  {
    id: 'beastman', name: 'มนุษย์สัตว์', icon: '🐾', tag: 'ว่องไว สัญชาตญาณสูง', runeStyle: 'blood',
    pal: { hair: '#2E2018', hairL: '#4A362A', cloth: '#584070', clothL: '#7A5E96', clothD: '#38284A', skin: '#C08A5A', skinL: '#DDAE7E', skinD: '#8E6038' },
    stats: { str: 1.25, agi: 1.45, vit: 1.10, sen: 1.30, int: 0.65 }, power: 1.05,
    res: { cold: .40, heat: .25, rain: .25, poison: .20, dust: .55, ash: .10 }, trait: 'beastkin',
    classes: [
      { id: 'stalk', name: 'นักล่าเงา', bias: { agi: 4, sen: 1 }, skill: { type: 'power', mult: 4.5, dur: 22, cd: 150, name: 'ล่องหน' } },
      { id: 'caller', name: 'ผู้เรียกสัตว์', bias: { sen: 4, vit: 1 }, skill: { type: 'beast', mult: 3, dur: 45, cd: 150, name: 'เรียกฝูง' } },
      { id: 'claw', name: 'นักสู้กรงเล็บ', bias: { str: 2, agi: 3 }, skill: { type: 'power', mult: 4, dur: 25, cd: 150, name: 'กรงเล็บพันครั้ง' } },
    ],
  },
];
export const raceById = id => RACES.find(r => r.id === id);
