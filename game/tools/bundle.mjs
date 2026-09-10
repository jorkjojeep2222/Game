/* ============================================================
   bundle.mjs — รวมไฟล์ทั้งหมดเป็นไฟล์เดียวสำหรับเล่นใน artifact
   ------------------------------------------------------------
   วิธีใช้:   node tools/bundle.mjs
   ผลลัพธ์:   dist/barbarian_idle.jsx

   ทำงานง่ายๆ คือ ต่อไฟล์ตามลำดับ dependency แล้ว
     - ตัดบรรทัด import ที่อ้างไฟล์ในโปรเจกต์ออก
     - รวม import ของ react ให้เหลือบรรทัดเดียวบนสุด
     - ถอดคำว่า export ออก (เพราะอยู่ไฟล์เดียวกันแล้ว)
   ไม่ได้ทำ tree-shaking หรือ minify — ตั้งใจให้อ่านออกและแก้ต่อได้
   ============================================================ */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/* ลำดับสำคัญ: ไฟล์ที่ถูกใช้ต้องมาก่อนไฟล์ที่ใช้มัน */
const ORDER = [
  'src/core/config.js',
  'src/core/util.js',
  'src/data/world.js',
  'src/data/traits.js',
  'src/data/races.js',
  'src/data/species.js',
  'src/data/items.js',
  'src/data/artifacts.js',
  'src/data/progression.js',
  'src/art/sprites.js',
  'src/art/assets.js',
  'src/core/character.js',
  'src/core/derive.js',
  'src/core/simulate.js',
  'src/core/storage.js',
  'src/art/PixelScene.jsx',
  'src/ui/theme.jsx',
  'src/ui/widgets.jsx',
  'src/screens/CharacterCreate.jsx',
  'src/screens/HuntScreen.jsx',
  'src/screens/Popups.jsx',
  'src/screens/modals/StatusModal.jsx',
  'src/screens/modals/ItemsModal.jsx',
  'src/screens/modals/MarketModal.jsx',
  'src/screens/modals/WorldModal.jsx',
  'src/screens/modals/SysModal.jsx',
  'src/App.jsx',
];

/* คอมโพเนนต์ที่ export default ต้องเปลี่ยนชื่อให้ตรงกับที่ไฟล์อื่นเรียกใช้ */
const DEFAULT_NAME = {
  'src/art/PixelScene.jsx': 'PixelScene',
  'src/ui/theme.jsx': 'Theme',
  'src/screens/CharacterCreate.jsx': 'CharacterCreate',
  'src/screens/HuntScreen.jsx': 'HuntScreen',
  'src/screens/modals/StatusModal.jsx': 'StatusModal',
  'src/screens/modals/ItemsModal.jsx': 'ItemsModal',
  'src/screens/modals/MarketModal.jsx': 'MarketModal',
  'src/screens/modals/WorldModal.jsx': 'WorldModal',
  'src/screens/modals/SysModal.jsx': 'SysModal',
  'src/App.jsx': 'App',
};

const chunks = [];
for (const file of ORDER) {
  let src = readFileSync(resolve(ROOT, file), 'utf8');

  // ตัด import ที่อ้างไฟล์ในโปรเจกต์ และ import react
  src = src.replace(/^\s*import[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '');

  // export default function X -> function X
  src = src.replace(/export\s+default\s+function\s+/g, 'function ');
  // export default X;  (กรณีมี)
  src = src.replace(/^\s*export\s+default\s+\w+;?\s*$/gm, '');
  // export const/function/class/async function -> ตัดคำว่า export ออก
  src = src.replace(/export\s+(async\s+function|const|let|function|class)\s+/g, '$1 ');
  // export { ... }
  src = src.replace(/^\s*export\s*\{[^}]*\};?\s*$/gm, '');

  chunks.push(`/* ===== ${file} ===== */\n${src.trim()}\n`);
}

const out = `import React, { useState, useEffect, useRef, useCallback } from 'react';

/* =============================================================
   ไฟล์นี้ถูกสร้างอัตโนมัติจาก src/ ด้วย tools/bundle.mjs
   อย่าแก้ไฟล์นี้โดยตรง — แก้ที่ src/ แล้วสั่ง  node tools/bundle.mjs
   ============================================================= */

${chunks.join('\n')}

export default App;
`;

mkdirSync(resolve(ROOT, 'dist'), { recursive: true });
writeFileSync(resolve(ROOT, 'dist/barbarian_idle.jsx'), out);
console.log('bundled ->', 'dist/barbarian_idle.jsx', out.split('\n').length, 'lines');
