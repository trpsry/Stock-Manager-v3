# Stock Manager v2

ระบบจัดการสต็อกสินค้าสำหรับทีมขาย สร้างด้วย Google Apps Script + Google Sheets  
ใช้งานผ่านมือถือเป็นหลัก (Mobile-first Web App)

---

## 📁 โครงสร้างไฟล์ปัจจุบัน

```
Stock-Manager-v2/
├── appsscript.json   → GAS Config (timezone: Asia/Bangkok, runtime: V8)
├── code.js           → Backend: ดึงข้อมูล, บันทึก, sync Aging
├── index.html        → โครงสร้าง UI หลัก (header, tabs, main)
├── modals.html       → Barcode Modal + Toast notification
├── scripts.html      → JavaScript Logic ทั้งหมด
├── styles.html       → Tailwind CDN + Custom CSS
└── Skill.md          → บทเรียนและ best practices
```

---

## 🗄️ Database ปัจจุบัน (Google Sheets)

**Spreadsheet ID:** `1WId___CZ_OIcoJWaIjt1BG74erZrsOXzU09Js0nVPO8`

### ชีตที่มี

| ชีต | หน้าที่ |
|---|---|
| `Oishi` | ข้อมูลสินค้า โออิชิ / จับใจ (source of truth) |
| `Est` | ข้อมูลสินค้า Est (source of truth) |
| `F&N` | ข้อมูลสินค้า F&N (source of truth) |
| `Aging` | Master Index — กำหนดลำดับแสดงผล + เก็บสำเนาข้อมูล |

### โครงสร้าง Columns (ทุกชีต)

| Col | Header | Type | หมายเหตุ |
|---|---|---|---|
| A | (ว่าง) | — | ไม่ใช้งาน |
| B | รหัสสินค้า (SKU) | Text | Barcode ≥ 8 ตัวถึงแสดงปุ่มบาร์โค้ด |
| C | ชื่อสินค้า | Text | — |
| D | ขนาด | Text | เช่น 400 ml., 1.6 L. |
| E | LOT1 | Text | dd/MM/yy — เก่าสุดเสมอ |
| F | LOT2 | Text | dd/MM/yy |
| G | LOT3 | Text | dd/MM/yy |
| H | LOT4 | Text | dd/MM/yy — ใหม่สุดหรือว่าง |
| I | จำนวน OH | Text | สต็อกปัจจุบัน |
| J | Update OH | DateTime | timestamp ล่าสุดที่แก้ OH |
| K | Update Lot | DateTime | timestamp ล่าสุดที่แก้ LOT |
| L | Fav | Boolean | TRUE / FALSE |

> Row 1: ว่าง | Row 2: Header | Row 3+: ข้อมูล

### ปัญหาของโครงสร้างปัจจุบัน

- ข้อมูล LOT/OH/Fav **ซ้ำซ้อน** ระหว่างชีตหลักและ Aging
- ทุกครั้งที่บันทึกต้องเรียก `syncToAging_()` เพิ่มอีก 1 API call
- เพิ่มสินค้าและจัดลำดับต้องทำใน Google Sheets โดยตรง ทำผ่านแอปไม่ได้

---

## 🏗️ แผนปรับโครงสร้าง Database (v3)

### แนวคิดหลัก: แยก "ลำดับ" ออกจาก "ข้อมูล"

```
ชีตหลัก (Oishi / Est / F&N)
→ Source of truth ข้อมูลทั้งหมด ไม่มีซ้ำ

ชีต Aging_Order (ใหม่ แทน Aging เดิม)
→ เก็บแค่ ลำดับ + SKU + ชีตต้นทาง
→ ไม่มีข้อมูล LOT/OH ซ้ำ
```

### โครงสร้างชีต Aging_Order (ใหม่)

| Col | Header | Type | หมายเหตุ |
|---|---|---|---|
| A | ลำดับ | Number | 1, 2, 3... ใช้เป็น sort key |
| B | SKU | Text | Barcode ของสินค้า |
| C | ชีต | Text | Oishi / Est / F&N |

### เปรียบเทียบก่อน/หลัง

| เรื่อง | เดิม (v2) | ใหม่ (v3) |
|---|---|---|
| API calls ต่อการบันทึก | 2 (save + sync) | 1 (save อย่างเดียว) |
| ข้อมูลซ้ำซ้อน | มี | ไม่มี |
| เพิ่มสินค้าผ่านแอป | ❌ | ✅ |
| จัดลำดับผ่านแอป | ❌ | ✅ |
| ความเร็ว | ช้ากว่า | เร็วขึ้น |

---

## ✨ ฟีเจอร์ใหม่ที่จะเพิ่ม

### 1. เพิ่มสินค้าผ่านแอป

**UI:** ปุ่ม `+ เพิ่มสินค้า` ใน Tab Aging → เปิด Modal

```
Modal: เพิ่มสินค้าใหม่
├── SKU / Barcode       (input)
├── ชื่อสินค้า          (input)
├── ขนาด               (input)
├── ชีต                (dropdown: Oishi / Est / F&N)
└── [ยกเลิก]  [เพิ่มสินค้า]
```

**Flow:**
```
กรอกข้อมูล → กด "เพิ่มสินค้า"
    ↓
addProduct(sheetName, sku, name, size)
    ↓
เพิ่ม row ท้ายชีตหลัก (Oishi/Est/F&N)
    ↓
เพิ่ม row ใหม่ใน Aging_Order (ต่อท้าย ลำดับสุดท้าย)
    ↓
Frontend state.allData อัปเดต + renderList()
```

**Backend function ใหม่:**
```javascript
function addProduct(sheetName, sku, name, size)
// → เพิ่ม row ในชีตหลัก
// → เพิ่ม row ใน Aging_Order ต่อท้าย
// → return { success, rowIndex, agingOrder }
```

---

### 2. จัดลำดับผ่านแอป (ปุ่ม ↑ ↓)

**UI:** ปุ่ม `⇅ จัดลำดับ` ใน Tab Aging → toggle Reorder Mode

```
ปกติ:
[★] [card สินค้า A] [⚙] [barcode]

Reorder Mode:
[↑] [↓] [card สินค้า A]   ← ปุ่ม gear/barcode ซ่อน
[↑] [↓] [card สินค้า B]   ← กด ↑ → สลับกับ A ทันที
[↑] [↓] [card สินค้า C]
```

**Flow:**
```
กด ↑ หรือ ↓
    ↓
Optimistic: สลับตำแหน่งใน state.allData ทันที
    ↓
renderList() แสดงลำดับใหม่ทันที (ไม่รอ server)
    ↓
reorderProduct(skuA, orderA, skuB, orderB) → GAS
    ↓
Backend สลับค่าคอลัมน์ A ใน Aging_Order 2 rows
    ↓ (ถ้า fail)
Rollback ลำดับกลับเดิม + showToast error
```

**Backend function ใหม่:**
```javascript
function reorderProduct(skuA, newOrderA, skuB, newOrderB)
// → อัปเดต Col A ใน Aging_Order 2 rows พร้อมกัน
// → return { success }
```

---

## ⚙️ Backend Functions (code.js)

### ปัจจุบัน (v2)

| Function | หน้าที่ |
|---|---|
| `getAllSheetData()` | ดึงข้อมูลทุกชีต เรียงตาม Aging |
| `saveLotData()` | บันทึก LOT1-4 + timestamp + syncToAging |
| `saveOhData()` | บันทึก OH + timestamp + syncToAging |
| `saveProductData()` | บันทึก SKU + ชื่อ + syncToAging |
| `clearLotData()` | เคลียร์ LOT + timestamp + syncToAging |
| `toggleFavorite()` | toggle ค่า Fav Col L |
| `syncToAging_()` | (internal) sync ข้อมูลไป Aging |

### เพิ่มใหม่ (v3)

| Function | หน้าที่ |
|---|---|
| `addProduct()` | เพิ่มสินค้าในชีตหลัก + Aging_Order |
| `reorderProduct()` | สลับลำดับ 2 rows ใน Aging_Order |

### ลบออก (v3)

| Function | เหตุผล |
|---|---|
| `syncToAging_()` | ไม่จำเป็น เพราะ Aging_Order เก็บแค่ลำดับ ไม่ duplicate ข้อมูล |

---

## 🖥️ Frontend Changes (scripts.html)

### State เพิ่มเติม

```javascript
state = {
  allData: {},
  current: '__OVERVIEW__' | 'Aging',
  subTab: 'All' | 'Favorite' | 'Oishi' | 'Est' | 'F&N',
  search: '',
  reorderMode: false   // ← ใหม่: toggle โหมดจัดลำดับ
}
```

### Functions ใหม่

| Function | หน้าที่ |
|---|---|
| `openAddProductModal()` | เปิด modal เพิ่มสินค้า |
| `submitAddProduct()` | validate → call addProduct() GAS |
| `toggleReorderMode()` | เปิด/ปิดโหมดจัดลำดับ แสดง/ซ่อนปุ่ม ↑↓ |
| `moveProduct(uid, dir)` | สลับตำแหน่ง optimistic + call reorderProduct() |

---

## 📱 UI ที่จะเปลี่ยน (index.html)

```
Tab Aging — Header bar
├── [All] [Favorite] [Oishi] [Est] [F&N]   ← subtabs เดิม
└── [+ เพิ่ม]  [⇅ จัดลำดับ]               ← ปุ่มใหม่ขวาบน

Card (Reorder Mode = OFF) — เหมือนเดิมทุกอย่าง
Card (Reorder Mode = ON)  — แสดงปุ่ม ↑ ↓ แทน ⚙ และ barcode
```

---

## 📌 Notes สำคัญ

- **ห้ามใช้ template literals (backtick)** ใน .html files — ใช้ string concatenation เสมอ
- ชีตใน GAS ใช้ชื่อ `Oishi` (ไม่ใช่ `โออิชิ/จับใจ`)
- Barcode ต้องมีอย่างน้อย **8 ตัว** ถึงแสดงปุ่มบาร์โค้ด
- Favorite เก็บใน **Col L** ค่าเป็น `TRUE`/`FALSE`
- LOT sort: **เก่าสุด → LOT1** เสมอ — sort ตอน save เท่านั้น ห้าม sort ตอนแสดงผล
- Optimistic UI: อัปเดต state + DOM ก่อน → call GAS ทีหลัง → rollback ถ้า fail
- อ่าน `oldBarcode` ก่อนเขียนทับเสมอเมื่อ key (SKU) อาจเปลี่ยน
