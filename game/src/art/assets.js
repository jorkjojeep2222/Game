/* ============================================================
   assets.js — ระบบโหลดสไปรต์ชีต .png (ถ้ามี) แบบไม่บังคับ
   ------------------------------------------------------------
   ทำงานเฉพาะตอนรันเป็นเว็บจริง (npm run dev / build) เพราะต้องอ่านไฟล์
   จากโฟลเดอร์ public/ — ในหน้าต่างพรีวิวแบบ artifact ของ Claude
   ไฟล์เหล่านี้จะโหลดไม่สำเร็จเสมอ (404) ซึ่งไม่เป็นไร: ทุกจุดที่ใช้
   ภาพเหล่านี้เช็ค `img.complete && img.naturalWidth > 0` ก่อนวาดเสมอ
   ถ้าไม่ผ่านเงื่อนไข ระบบจะวาดพิกเซลอาร์ตแบบเดิม (sprites.js) แทนทันที
   จึงวางโค้ดนี้ไว้ได้อย่างปลอดภัยแม้ยังไม่มีไฟล์ภาพจริงสักไฟล์เดียว

   ------------------------------------------------------------
   ตำแหน่งไฟล์ที่ระบบจะพยายามโหลด (ดู public/assets/sprites/README.md
   สำหรับสเปกขนาดพิกเซลและ layout ของแต่ละแถวแบบละเอียด):

     hero_<raceId>.png       เช่น hero_barbarian.png (ลูกผสมใช้ไฟล์ของ parents[0])
     mob_<speciesId>.png     มอนสเตอร์ตัวปกติ เช่น mob_frostfang.png
     boss_<speciesId>.png    มอนสเตอร์ตัวเดียวกัน แต่ตอนเป็นบอส (ไฟล์แยก ไม่บังคับ)
     pet_<petId>.png         สัตว์เลี้ยง เช่น pet_wolf.png

   ทุกไฟล์เป็น sprite sheet แนวนอน 1 แถว = 1 ท่าทาง:
     hero: แถว 0 = idle (4 เฟรม) · แถว 1 = attack (4 เฟรม) · แถว 2 = hurt (2-4 เฟรม)
     mob/boss/pet: แถว 0 = idle (4 เฟรม) · แถว 1 = hit (2 เฟรม) · แถว 2 = die (4 เฟรม)
   ขนาดเฟรมคำนวณจากขนาดไฟล์จริงหารด้วยจำนวนคอลัมน์/แถว จึงไม่บังคับพิกเซลตายตัว
   (คำแนะนำ: hero/mob 48×48 ต่อเฟรม, boss 96×96 หรือ 128×128 ต่อเฟรม)
   ============================================================ */

export const ASSET_BASE = '/assets/sprites/';

export const HERO_ANIM = { cols: 4, rows: { idle: 0, attack: 1, hurt: 2 }, frameMs: 140 };
export const MOB_ANIM = { cols: 4, rows: { idle: 0, hit: 1, die: 2 }, frameMs: 160 };

const cache = {};

/** โหลด (หรือคืนจาก cache) รูปภาพตาม key — ไม่ throw แม้ไฟล์ไม่มีอยู่จริง */
function loadSprite(key, file) {
  if (cache[key]) return cache[key];
  const img = new Image();
  img.src = ASSET_BASE + file;               // ถ้า 404 จะแค่ไม่ complete/naturalWidth=0
  cache[key] = img;
  return img;
}

/** ใช้เช็คก่อนวาดเสมอ: ภาพนี้พร้อมใช้จริงหรือยัง */
export const spriteReady = img => !!img && img.complete && img.naturalWidth > 0;

export const heroAssetFor = blood => {
  const raceId = (blood.parents && blood.parents[0]) || 'human';
  return loadSprite('hero_' + raceId, `hero_${raceId}.png`);
};

export const monsterAssetFor = (species, isBoss) => {
  const prefix = isBoss ? 'boss' : 'mob';
  return loadSprite(`${prefix}_${species.id}`, `${prefix}_${species.id}.png`);
};

export const petAssetFor = pet => loadSprite('pet_' + pet.id, `pet_${pet.id}.png`);
