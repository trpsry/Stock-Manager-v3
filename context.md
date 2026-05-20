# Stock Manager v3 — Project Context
> Last updated: 2026-05-20

## 1. Overview
- Platform: Google Apps Script Web App
- URL: script.google.com/macros/s/.../exec
- Stack: GAS Backend + Google Sheets DB + HTML/CSS/JS Frontend
- Deploy: clasp push → GAS Editor → Deploy → New version

## 2. Spreadsheet ID
1WId___CZ_OIcoJWaIjt1BG74erZrsOXzU09Js0nVPO8

## 3. Sheet Structure
Product Sheets: Oishi, Est, F&N, Alc. (dynamic — เพิ่มได้จาก UI)
System Sheets: Aging_Order, Aging (ห้ามลบ)

Columns ในแต่ละ Product Sheet:
A=ลำดับ B=SKU C=ชื่อ D=ขนาด E-H=LOT1-4
I=OH J=OHTime K=LotTime L=Favorite(bool) M=FavTime(timestamp)

Aging_Order Columns:
A=ลำดับ B=SKU C=ชื่อ D=ชีต

## 4. Files
code.gs      — Backend functions
index.html   — HTML structure + Header
scripts.html — Frontend JavaScript
styles.html  — Tailwind config + CSS
modals.html  — Barcode modal + Add product modal

## 5. Backend Functions
getAllSheetData()                          — ดึงข้อมูลทุกชีต
saveLotData(sheet, row, l1, l2, l3, l4)  — บันทึก LOT
saveProductData(sheet, row, sku, name)    — บันทึก SKU+ชื่อ
saveOhData(sheet, row, oh)               — บันทึก OH
clearLotData(sheet, row)                 — ล้าง LOT
toggleFavorite(sheet, row, currentStatus) — สลับ fav + บันทึก timestamp col M
addProduct(sheet, sku, name, size)        — เพิ่มสินค้า
reorderProduct(skuA, skuB)               — สลับลำดับใน Aging_Order

## 6. State Object
state = {
  allData: {},       // ข้อมูลทั้งหมด key=sheetName
  current: 'Aging',  // Tab ปัจจุบัน
  subTab: 'All',     // Subtab ปัจจุบัน
  search: '',
  reorderMode: false,
  sheetNames: []     // จาก server
}

## 7. Rules สำคัญ
- ไม่ sort LOT ตอน render — sort เฉพาะตอน Save
- ไม่ใช้ localStorage — ใช้ Sheet เท่านั้น
- Dynamic sheet: ใช้ getMainSheetNames_() ไม่ hardcode
- Optimistic update — อัปเดต UI ก่อน rollback ถ้า error
- Chunk render: CHUNK_SIZE = 15 cards
- Column M: สร้างอัตโนมัติตอนกด Favorite ครั้งแรก

## 8. Design System
- Tailwind CSS 3 CDN
- Font: Sarabun
- Brand color: #2563eb (blue-600)
- Style: Material-inspired + Glassmorphism
- Header: 3 ชั้น (Logo+Search / Tabs / Subtabs)

## 9. Changelog
- Dynamic category system
- Favorite sort จาก Column M (timestamp) — cross-device
- Header 4→3 ชั้น, compact
- เอา Header collapse ออก (แก้ปัญหากระตุก)
- แก้ syntax error } หายใน getAllSheetData

## 10. Deploy Troubleshooting
- "ไม่พบ doGet" = เปิด Editor URL (/edit) แทน Web App URL (/exec)
- หลัง push โค้ดใหม่ต้อง Deploy → New version ทุกครั้ง
- code.js ใน GitHub → clasp แปลงเป็น code.gs ใน GAS อัตโนมัติ
