/* ============================================================
   PixelScene.jsx — วาดฉากต่อสู้ลง canvas
   ------------------------------------------------------------
   คอมโพเนนต์นี้ "ไม่" รับ state ของเกมโดยตรง แต่รับ ref (fxRef)
   เพื่อไม่ให้ React re-render ทุกเฟรม — ลูปวาดอ่านค่าจาก ref เอง
   fxRef.current = { hit, nums, battle, ground, skillOn, shake, particles, pet }

   ระบบภาพ .png (ถ้ามี) ใช้ผ่าน art/assets.js — ทุกจุดเช็ค spriteReady()
   ก่อนวาดเสมอ ไม่มีไฟล์ก็ตกกลับไปวาดพิกเซลอาร์ตแบบเดิมทันที ไม่มีจอขาว/พัง
   ============================================================ */
import React, { useRef, useEffect } from 'react';
import { heroShapeFor, SWORD, SWORD_PAL, SHAPES, heroPalette, drawSprite } from './sprites.js';
import { heroAssetFor, monsterAssetFor, petAssetFor, spriteReady, HERO_ANIM, MOB_ANIM } from './assets.js';
import { groundById } from '../data/world.js';
import { petById } from '../data/items.js';
import { rnd, prand } from '../core/util.js';

const CANVAS_W = 360, CANVAS_H = 200, SCALE = 4, GROUND_OFFSET = 26;

/** วาดเฟรมหนึ่งจาก sprite sheet ลง canvas โดยคำนวณขนาดเฟรมจากขนาดไฟล์จริง */
function drawFrame(ctx, img, anim, row, t, x, y, targetH, flip, loop = true) {
  const frameW = img.naturalWidth / anim.cols;
  const totalRows = Math.max(...Object.values(anim.rows)) + 1;
  const frameH = img.naturalHeight / totalRows;
  const col = loop ? Math.floor(t / anim.frameMs) % anim.cols : Math.min(anim.cols - 1, Math.floor(t / anim.frameMs));
  const scale = targetH / frameH;
  const w = frameW * scale;
  ctx.save();
  if (flip) { ctx.translate(x + w, y); ctx.scale(-1, 1); ctx.drawImage(img, col * frameW, row * frameH, frameW, frameH, 0, 0, w, targetH); }
  else { ctx.drawImage(img, col * frameW, row * frameH, frameW, frameH, x, y, w, targetH); }
  ctx.restore();
  return w;
}

export default function PixelScene({ blood, fxRef }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const hPal = heroPalette(blood);
    const heroSprite = heroShapeFor(blood);
    const heroImg = heroAssetFor(blood);
    // จุดยึดดาบ (สัดส่วนของขนาดสไปรต์ ไม่ใช่พิกเซลตายตัว) กันดาบลอยผิดที่เวลาสลับเผ่าพันธุ์ที่ตัวใหญ่/เล็กไม่เท่ากัน
    const swordAnchor = { x: heroSprite[0].length * 0.81, y: heroSprite.length * 0.57 };
    let raf, alive = true;

    const draw = () => {
      if (!alive) return;
      const t = Date.now();
      const fx = fxRef.current;
      const gr = groundById(fx.ground);
      const battle = fx.battle;
      const GY = CANVAS_H - GROUND_OFFSET;
      const since = t - (fx.hit || 0);

      ctx.save();
      // สั่นหน้าจอตอนแตะโดน — ค่อยๆ หายไปเอง (ตั้งค่าจาก App.jsx ตอน tap())
      if (fx.shake > 0) {
        ctx.translate((Math.random() - 0.5) * fx.shake, (Math.random() - 0.5) * fx.shake);
        fx.shake *= 0.85;
        if (fx.shake < 0.5) fx.shake = 0;
      }

      /* ท้องฟ้า */
      const sky = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      sky.addColorStop(0, gr.sky[0]); sky.addColorStop(1, gr.sky[1]);
      ctx.fillStyle = sky; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      /* ฉากหลังไกล — ตำแหน่งคงที่ ไม่กระพริบ */
      ctx.fillStyle = gr.far;
      for (let i = 0; i < 9; i++) {
        const x = i * 46 + prand(i) * 20;
        const h = 24 + prand(i + 9) * 34;
        if (gr.deco === 'tree') {
          ctx.fillRect(x + 6, GY - h, 5, h);
          for (let k = 0; k < 4; k++) { const w = 26 - k * 5; ctx.fillRect(x + 8 - w / 2, GY - h - 4 + k * 9, w, 10); }
        } else if (gr.deco === 'ice') {
          ctx.beginPath(); ctx.moveTo(x, GY); ctx.lineTo(x + 14, GY - h); ctx.lineTo(x + 28, GY); ctx.fill();
        } else if (gr.deco === 'lava') {
          ctx.fillRect(x, GY - h, 20, h);
          ctx.fillStyle = 'rgba(255,110,40,.25)'; ctx.fillRect(x + 6, GY - h, 4, h); ctx.fillStyle = gr.far;
        } else {
          ctx.fillRect(x, GY - h * .6, 22, h * .6);
        }
      }

      /* พื้นดินสามชั้นแบบไทล์ */
      ctx.fillStyle = gr.gnd[0]; ctx.fillRect(0, GY, CANVAS_W, 8);
      ctx.fillStyle = gr.gnd[1]; ctx.fillRect(0, GY + 8, CANVAS_W, 10);
      ctx.fillStyle = gr.gnd[2]; ctx.fillRect(0, GY + 18, CANVAS_W, CANVAS_H - GY - 18);
      for (let i = 0; i < 30; i++) {
        ctx.fillStyle = gr.gnd[2];
        ctx.fillRect(i * 12 + (prand(i + 40) * 6 | 0), GY + 4 + (prand(i) * 6 | 0), 3, 3);
      }

      /* สัตว์เลี้ยง — วาดก่อนฮีโร่เพื่อให้ยืนอยู่ข้างหลัง ตามหลังนิดหน่อย */
      if (fx.pet) {
        const pData = petById(fx.pet.id);
        if (pData) {
          const pImg = petAssetFor(pData);
          const pLunge = since < 250 ? (1 - since / 250) * 12 : 0;
          const pBob = Math.sin(t / 280) * 2;
          if (spriteReady(pImg)) {
            const targetH = 15 * SCALE;
            drawFrame(ctx, pImg, MOB_ANIM, MOB_ANIM.rows.idle, t, 2 + pLunge, GY - targetH + pBob + 2, targetH, false);
          } else {
            const pShape = SHAPES[pData.shape] || SHAPES.quad;
            drawSprite(ctx, pShape, pData.pal, 4 + pLunge, GY - pShape.length * SCALE + pBob + 2, SCALE, false);
          }
        }
      }

      /* ตัวละคร */
      const lunge = since < 200 ? (1 - since / 200) * 18 : 0;
      const bob = Math.sin(t / 340) * 2;
      const hx = 22 + lunge, hy = GY - heroSprite.length * SCALE + bob + 2;

      if (spriteReady(heroImg)) {
        const isAtk = since < 250;
        const targetH = heroSprite.length * SCALE;
        if (fx.skillOn) { ctx.save(); ctx.shadowColor = '#E4622A'; ctx.shadowBlur = 22; }
        drawFrame(ctx, heroImg, HERO_ANIM, isAtk ? HERO_ANIM.rows.attack : HERO_ANIM.rows.idle, isAtk ? since : t, hx, hy, targetH, false, isAtk);
        if (fx.skillOn) ctx.restore();
      } else {
        if (fx.skillOn) { ctx.save(); ctx.shadowColor = '#E4622A'; ctx.shadowBlur = 22; }
        drawSprite(ctx, heroSprite, hPal, hx, hy, SCALE, false);
        ctx.save();
        ctx.translate(hx + swordAnchor.x * SCALE, hy + swordAnchor.y * SCALE);
        ctx.rotate(since < 200 ? -1.5 + (since / 200) * 2.2 : .5);
        drawSprite(ctx, SWORD, SWORD_PAL, -2 * SCALE, -12 * SCALE, SCALE, false);
        ctx.restore();
        if (fx.skillOn) ctx.restore();
      }

      /* มอนสเตอร์ — ฝูงคลั่งวาดซ้อนกัน 3 ตัว เยื้องไปด้านหลังทีละนิด */
      if (battle) {
        const flash = since < 110;
        // บอสวาดใหญ่กว่าเห็นชัด ตามที่ขนาดพิกเซลแนะนำ (96-128px เทียบฮีโร่ 48px)
        const baseScale = SCALE * (battle.legend ? 1.25 : battle.isBoss ? 1.5 : 1);
        const mImg = monsterAssetFor(battle.species, battle.isBoss);
        const hordeCount = battle.isHorde ? 3 : 1;

        for (let i = hordeCount - 1; i >= 0; i--) {
          const offsetX = i * 22;
          const scale = baseScale * (1 - i * 0.1);
          const bob = Math.sin((t + i * 500) / 260) * 2;

          if (spriteReady(mImg) && !flash) {
            const targetH = (SHAPES[battle.species.shape]?.length || 20) * scale;
            const w = mImg.naturalWidth / MOB_ANIM.cols * (targetH / (mImg.naturalHeight / 3));
            drawFrame(ctx, mImg, MOB_ANIM, MOB_ANIM.rows.idle, t + i * 200, CANVAS_W - 18 - offsetX - w, GY - targetH + bob + 2, targetH, true);
          } else {
            const shape = SHAPES[battle.species.shape] || SHAPES.quad;
            const bx = CANVAS_W - 18 - offsetX - shape[0].length * scale;
            const by = GY - shape.length * scale + bob + 2;
            const pal = flash
              ? { o: '#fff', 1: '#fff', 2: '#fff', 3: '#fff', e: '#fff', t: '#fff' }
              : { ...battle.species.pal, t: '#F6F1E4' };
            drawSprite(ctx, shape, pal, bx + (flash ? rnd(-2, 2) : 0), by, scale, true);
            if (since < 200 && i === 0) {
              ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 4;
              ctx.beginPath(); ctx.arc(bx + 20, by + shape.length * scale * .55, 40, -1, .8); ctx.stroke();
            }
          }
        }
      }

      /* อนุภาค — เลือด/ประกาย ตอนแตะโดน (ตั้งต้นจาก App.jsx ตอน tap()) */
      if (fx.particles && fx.particles.length) {
        for (let i = fx.particles.length - 1; i >= 0; i--) {
          const p = fx.particles[i];
          p.x += p.vx; p.y += p.vy; p.vy += 0.4; p.life -= 0.03;
          if (p.life <= 0) { fx.particles.splice(i, 1); continue; }
          ctx.globalAlpha = p.life;
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x, p.y, p.size, p.size);
        }
        ctx.globalAlpha = 1;
      }

      /* ตัวเลขดาเมจลอย */
      fx.nums = fx.nums.filter(nm => t - nm.t0 < 900);
      ctx.textAlign = 'center';
      ctx.font = 'bold 15px ui-monospace, monospace';
      fx.nums.forEach(nm => {
        const p = (t - nm.t0) / 900;
        ctx.globalAlpha = 1 - p;
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.7)';
        ctx.strokeText(nm.v, nm.x, GY - 60 - p * 46);
        ctx.fillStyle = nm.crit ? '#FFD24A' : '#FFFFFF';
        ctx.fillText(nm.v, nm.x, GY - 60 - p * 46);
        ctx.globalAlpha = 1;
      });

      ctx.restore();
      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, [blood, fxRef]);

  return (
    <canvas
      ref={ref}
      width={CANVAS_W}
      height={CANVAS_H}
      style={{ imageRendering: 'pixelated', display: 'block', width: '100%', aspectRatio: `${CANVAS_W} / ${CANVAS_H}` }}
    />
  );
}
