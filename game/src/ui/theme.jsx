/* ============================================================
   theme.jsx — สไตล์กลางทั้งเกม
   ------------------------------------------------------------
   หมายเหตุสำคัญ (แก้บั๊ก "หน้าจอขยับตลอด"):
     1. html{overflow-y:scroll} — กันแถบเลื่อนโผล่/หายแล้วเนื้อหาเลื่อนซ้ายขวา
     2. .fixw — ช่องตัวเลขกว้างคงที่ ตัวเลขเปลี่ยนหลักแล้วไม่ดันข้อความข้างๆ
     3. .nowrap — ปุ่มที่มีตัวเลขห้ามตัดบรรทัด ไม่งั้นความสูงกระโดด
     4. หน้าต่างโมดัลใช้ตำแหน่งตายตัว (ดู widgets.jsx) ไม่จัดกลางแนวตั้ง
   ============================================================ */
import React from 'react';

export default function Theme() {
  return (
    <style>{`
      html { overflow-y: scroll; }
      * { -webkit-tap-highlight-color: transparent; }

      :root{
        --night:#0A1119; --stone:#182634; --stone2:#101B26; --stone3:#22364A; --ice:#436079;
        --bone:#EDE7DA; --ember:#F2762F; --emberD:#B84C18; --frost:#79C4E8;
        --blood:#9B3838; --moss:#6E9B5E; --gold:#F0C24A;
      }
      .warm{ --night:#1A0F09; --stone:#30201A; --stone2:#22150F; --stone3:#432A1E; --ice:#875538; }

      .panel{
        background:var(--stone);
        border:2px solid rgba(0,0,0,.45);
        box-shadow:inset 0 2px 0 rgba(255,255,255,.07), 0 3px 0 rgba(0,0,0,.35);
        border-radius:12px;
      }
      .num{ font-variant-numeric:tabular-nums; font-family:ui-monospace,SFMono-Regular,Menlo,monospace; }
      .fixw{ display:inline-block; text-align:right; }
      .nowrap{ white-space:nowrap; }
      .lbl{ letter-spacing:.14em; text-transform:uppercase; font-size:9px; }
      .ttl{ text-shadow:0 2px 0 rgba(0,0,0,.55); }

      .btn{
        border-radius:10px; border:2px solid rgba(0,0,0,.45);
        box-shadow:inset 0 2px 0 rgba(255,255,255,.18), 0 3px 0 rgba(0,0,0,.4);
        font-weight:700; transition:transform .06s; white-space:nowrap;
      }
      .btn:active:not(:disabled){ transform:translateY(2px); box-shadow:inset 0 2px 0 rgba(255,255,255,.12), 0 1px 0 rgba(0,0,0,.4); }
      .btn:disabled{ filter:grayscale(.6) brightness(.6); }

      .bar{ height:8px; border-radius:5px; background:rgba(0,0,0,.45); overflow:hidden; box-shadow:inset 0 1px 2px rgba(0,0,0,.6); }
      .bar>i{ display:block; height:100%; transition:width .25s linear; }

      .navb{ border-radius:12px; border:2px solid rgba(0,0,0,.45); box-shadow:inset 0 2px 0 rgba(255,255,255,.1), 0 3px 0 rgba(0,0,0,.35); }

      .pulse{ animation:pu 1.1s ease-in-out infinite; } @keyframes pu{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}
      .popin{ animation:pi .2s cubic-bezier(.2,1.4,.5,1); } @keyframes pi{from{transform:scale(.9);opacity:0}to{transform:scale(1);opacity:1}}
      @media (prefers-reduced-motion:reduce){ .pulse,.popin{animation:none} }

      button:focus-visible{ outline:3px solid var(--frost); outline-offset:2px; }
      input{ background:var(--stone2); border:2px solid var(--ice); color:var(--bone); border-radius:10px; }
      .scroll{ overflow-y:auto; -webkit-overflow-scrolling:touch; }
    `}</style>
  );
}
