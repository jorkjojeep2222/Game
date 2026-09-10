/* ============================================================
   main.jsx — จุดเริ่มต้นตอนรันเป็นเว็บจริง
   (ตอนเล่นใน artifact ไม่ได้ใช้ไฟล์นี้ — artifact เรียก App โดยตรง)
   ============================================================ */
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './storageShim.js';

createRoot(document.getElementById('root')).render(<App />);
