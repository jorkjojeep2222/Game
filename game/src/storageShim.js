/* ============================================================
   storageShim.js — จำลอง window.storage ด้วย localStorage
   ------------------------------------------------------------
   artifact ของ Claude มี window.storage ให้อยู่แล้ว
   แต่ตอนรันเป็นเว็บปกติไม่มี จึงต้องมีตัวแทน
   ถ้าย้ายไปมือถือ (Flutter/RN) ให้เขียนตัวแทนแบบเดียวกันนี้
   ============================================================ */
if (typeof window !== 'undefined' && !window.storage) {
  window.storage = {
    async get(key) {
      const v = localStorage.getItem(key);
      return v === null ? null : { key, value: v };
    },
    async set(key, value) {
      localStorage.setItem(key, value);
      return { key, value };
    },
    async delete(key) {
      localStorage.removeItem(key);
      return { key, deleted: true };
    },
    async list(prefix = '') {
      const keys = Object.keys(localStorage).filter(k => k.startsWith(prefix));
      return { keys, prefix };
    },
  };
}
