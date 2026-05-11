# SKILL.md — Stock Manager v2
> สรุปสิ่งที่เรียนรู้ ข้อผิดพลาด และการแก้ไขจากโปรเจ็ค Stock Manager v2

---

## 📁 โครงสร้างโปรเจ็ค

```
Stock-Manager-v2/
├── appsscript.json   — config Google Apps Script (timezone, runtime V8)
├── code.js           — Backend: ดึงข้อมูล, บันทึก, sync Aging
├── index.html        — โครงสร้าง UI หลัก (header, tabs, main)
├── modals.html       — Barcode modal + Toast notification
├── scripts.html      — Logic ทั้งหมด (render, save, favorite, lot)
└── styles.html       — CSS + Tailwind config
```

**Google Sheets:**
- Sheet หลัก: `Oishi`, `Est`, `F&N` — ข้อมูลจริง
- Sheet `Aging` — Master sequence สำหรับจัดลำดับแสดงผล
- คอลัมน์ A-L: SKU(B), ชื่อ(C), ขนาด(D), LOT1-4(E-H), OH(I), Update OH(J), Update Lot(K), Fav(L)

---

## 🔴 ข้อผิดพลาดที่เคยเกิดขึ้น และการแก้ไข

### 1. Lot Picker ไม่แสดงค่าจาก Database
**อาการ:** เปิด card แล้วช่อง LOT ว่างทุกช่อง ทั้งที่ใน Sheet มีข้อมูล

**สาเหตุ:** ใช้ `getSortedLots()` จัดเรียง Lot ก่อนแสดงผล ทำให้ picker id สลับกัน เช่น Lot3 แสดงในตำแหน่ง Lot1 แต่ element id ยังเป็น `lot_uid_3` ทำให้ `readLot()` อ่านค่าผิดช่อง และ `applySelects()` set ค่าไม่ตรง

**การแก้ไข:**
- `buildCard()` — แสดง Lot picker ตามลำดับ 1-4 ตรงๆ ไม่ sort ตอนแสดง
- `saveLot()` — เพิ่ม `sortLots()` เรียงวันก่อน save ลง Sheet เท่านั้น
- หลัง save สำเร็จ → `renderList()` เพื่อให้ picker แสดงลำดับใหม่ที่เรียงแล้ว

**บทเรียน:** การ sort ข้อมูลก่อนแสดงผล input/picker ทำให้ id กับ value ไม่ตรงกัน ควร sort เฉพาะตอน save หรือตอนแสดงผลแบบ read-only เท่านั้น

---

### 2. ข้อมูล Aging หายหลัง Refresh
**อาการ:** บันทึก OH/LOT จากแอปแล้วข้อมูลอัพเดทใน UI แต่พอ Refresh ข้อมูลหาย

**สาเหตุ:** Save ลงชีตหลัก (Oishi/Est/F&N) แต่ไม่ได้เขียนลง Aging ด้วย เมื่อ Refresh โหลดข้อมูลจาก Aging ใหม่จึงได้ค่าเดิม

**การแก้ไข:** เพิ่มฟังก์ชัน `syncToAging_()` ใน `code.js` — หลังจาก save ลงชีตหลักแล้ว ค้นหา row ใน Aging ที่ barcode ตรงกันแล้วเขียนทับด้วย

```javascript
function syncToAging_(ss, barcode, { lots, oh, sku, productName, ohTime, lotTime } = {}) {
  // หา row ใน Aging จาก barcode → เขียนทับ
}
```

**บทเรียน:** ทุก save function ต้องเช็ค `if (sheetName !== 'Aging')` ก่อน sync เพื่อป้องกัน infinite loop

---

### 3. syncToAging ใน clearLotData ส่ง parameter ผิด
**อาการ:** กด "ล้าง Lot" แล้ว error เพราะ `cleanSku` และ `cleanName` ไม่มีใน `clearLotData`

**สาเหตุ:** copy code จาก `saveProductData` มาโดยไม่แก้ parameter

```javascript
// ❌ ผิด
syncToAging_(ss, oldBarcode, { sku: cleanSku, productName: cleanName });

// ✅ ถูก
syncToAging_(ss, oldBarcode, { lots: ['', '', '', ''] });
```

**บทเรียน:** แต่ละ save function ส่ง parameter ต่างกัน ต้องตรวจสอบให้ตรงกับ action จริงเสมอ

---

### 4. saveProductData sync ด้วย SKU ใหม่แทนที่จะเป็น SKU เดิม
**อาการ:** เมื่อแก้ SKU แล้ว sync ไป Aging ไม่เจอ row เพราะใช้ SKU ใหม่หาใน Aging

**สาเหตุ:** ส่ง `cleanSku` (ค่าใหม่) เป็น barcode ค้นหาใน Aging แทนที่จะอ่าน barcode เดิมก่อน

```javascript
// ❌ ผิด
syncToAging_(ss, cleanSku, { sku: cleanSku, productName: cleanName });

// ✅ ถูก — อ่าน oldBarcode ก่อนเขียนทับ
const oldBarcode = String(sheet.getRange(rowIndex, 2).getValue()).trim();
range.setValues([[cleanSku, cleanName]]);
syncToAging_(ss, oldBarcode, { sku: cleanSku, productName: cleanName });
```

**บทเรียน:** เมื่อแก้ข้อมูลที่ใช้เป็น key (barcode/SKU) ต้องอ่านค่าเดิมก่อนเขียนทับเสมอ

---

### 5. Indent หลุดออกนอก try-catch block
**อาการ:** โค้ดในบาง function มี indent ผิด ทำให้ logic อยู่นอก try block

**สาเหตุ:** แก้ไขด้วยการ copy-paste แล้วไม่ปรับ indent ให้ถูกต้อง

**การแก้ไข:** ตรวจสอบ indent ของทุกบรรทัดหลัง paste และเปรียบเทียบกับบรรทัดอื่นใน try block เดียวกัน

**บทเรียน:** ทุกครั้งที่แก้โค้ดใน try-catch ต้องตรวจ indent ให้อยู่ในระดับเดียวกับ code รอบข้าง

---

### 6. toggleEditPanel วน loop ทุก panel ทำให้แลค
**อาการ:** กดปุ่มเฟือง UI แลคเพราะวน loop ปิดทุก panel

**สาเหตุ:**
```javascript
// ❌ เดิม — loop ทุก panel
var panels = document.querySelectorAll('.edit-panel');
for (var i = 0; i < panels.length; i++) panels[i].classList.add('hidden');
```

**การแก้ไข:**
```javascript
// ✅ หาแค่ panel ที่เปิดอยู่
var openPanel = document.querySelector('.edit-panel:not(.hidden)');
if (openPanel) openPanel.classList.add('hidden');
```

**บทเรียน:** ใช้ `querySelector` แทน `querySelectorAll` + loop เมื่อรู้ว่ามี element ที่ต้องการแค่ 1 อัน

---

### 7. Lot Picker options สร้างใหม่ทุก Card ทำให้ render ช้า
**อาการ:** หน้าแอปแลคเมื่อมีสินค้าจำนวนมาก เพราะสร้าง day/month/year options ซ้ำทุก card ทุก lot

**การแก้ไข:** Cache options HTML ครั้งเดียวแล้วนำมาใช้ซ้ำ

```javascript
var _dayOpts = null;
function getDayOpts() {
  if (_dayOpts) return _dayOpts;
  // สร้างครั้งเดียว
  return (_dayOpts = h);
}
```

ใช้ `data-v` attribute แทนการ set selected ตอนสร้าง HTML แล้วเรียก `applySelects()` หลัง render

**บทเรียน:** Options ที่ซ้ำกันทุก element ควร cache ไว้ ไม่ควรสร้างใหม่ทุกครั้ง

---

## ✅ Best Practices ที่ได้เรียนรู้

### Frontend (scripts.html)

| หัวข้อ | แนวทางที่ดี |
|---|---|
| Lot Picker | แสดง 1-4 ตามลำดับปกติ sort เฉพาะตอน save |
| Optimistic UI | อัพเดท state + DOM ทันที → call backend → rollback ถ้า error |
| Cache Options | สร้าง day/month/year HTML ครั้งเดียว ใช้ `data-v` + `applySelects()` |
| DOM Update | แก้เฉพาะ element ที่เปลี่ยน ไม่ re-render ทั้งหน้าถ้าไม่จำเป็น |
| Chunk Render | render ครั้งละ 15 card ด้วย `setTimeout` ป้องกัน UI freeze |
| Favorite | Optimistic update icon ทันที ไม่ต้อง re-render ทั้งหน้า |

### Backend (code.js)

| หัวข้อ | แนวทางที่ดี |
|---|---|
| syncToAging | เรียกหลัง save ทุก function, เช็ค `sheetName !== 'Aging'` ก่อนเสมอ |
| oldBarcode | อ่านก่อนเขียนทับเสมอเมื่อ key อาจเปลี่ยน |
| Error handling | try-catch ทุก function, return JSON เสมอ |
| Aging เป็น Master | ใช้ลำดับ barcode จาก Aging กำหนด sequence การแสดงผล |
| Column 12 (Fav) | อ่านข้อมูลจาก column 12 ครั้งเดียวพร้อมกับข้อมูลอื่น |

---

## 🔧 วิธี Workflow ที่ถูกต้อง

1. **Clone repo ล่าสุดก่อนแก้ไขทุกครั้ง**
```
https://github.com/trpsry/Stock-Manager-v2.git
```

2. **อ่านไฟล์ที่เกี่ยวข้องก่อนแก้เสมอ** — ไม่ assume จาก memory

3. **ส่งโค้ดในแชทโดยตรง** — ไม่ต้องสร้างไฟล์หรือ present_files (ประหยัด token)

4. **ตรวจ indent ทุกครั้ง** — โดยเฉพาะโค้ดใน try-catch block

5. **ทดสอบ logic ก่อน** — โดยเฉพาะเรื่อง id mapping ระหว่าง picker และ state

---

## 📌 ข้อควรระวังเฉพาะโปรเจ็คนี้

- ชีต `Aging` เป็น **read-only จาก UI** — ไม่บันทึกลงโดยตรง แต่รับ sync จากชีตหลัก
- `SHEET_NAMES` ใน `code.js` ปัจจุบันใช้ `'Oishi'` (ไม่ใช่ `'โออิชิ/จับใจ'`)
- Barcode ต้องมี **อย่างน้อย 8 ตัว** ถึงจะแสดงปุ่มบาร์โค้ด
- Favorite เก็บใน **คอลัมน์ L (12)** ของทุกชีต ค่าเป็น `TRUE`/`FALSE`
- `getAllSheetData()` อ่าน **12 คอลัมน์** (A-L) รวม Fav