# Stock Manager v3

ระบบจัดการสต็อกสินค้าสำหรับทีมขาย (เวอร์ชัน 3) สร้างด้วย Google Apps Script + Google Sheets  
เน้นความเร็ว ความแม่นยำ และการจัดการลำดับสินค้าผ่านหน้าแอปโดยตรง

---

## 🚀 มีอะไรใหม่ใน v3?

- **Project Migration:** ย้ายจาก v2 มาสู่ v3 อย่างเป็นทางการ พร้อมระบบ Version Control (Git + GitHub)
- **Deployment Automation:** ใช้งาน `clasp` ในการเชื่อมต่อและ Push โค้ดขึ้น Google Apps Script โดยตรงจาก Local Machine
- **Clean Architecture:** เริ่มปรับโครงสร้างโค้ดและ Database ให้ลดความซ้ำซ้อน (เตรียมเลิกใช้ Aging Sheet แบบเดิมที่เก็บข้อมูลซ้ำ)
- **Enhanced DX:** รองรับการพัฒนาผ่าน IDE ภายนอกและจัดการ dependencies ผ่าน Git

---

## 📁 โครงสร้างโปรเจ็คปัจจุบัน

```
Stock-Manager-v3/
├── .clasp.json       → เชื่อมต่อกับ Google Apps Script ID
├── .gitignore        → ป้องกันการ commit ไฟล์ที่ไม่จำเป็น (node_modules, .clasp.json)
├── appsscript.json   → GAS Config (timezone: Asia/Bangkok, runtime: V8)
├── code.js           → Backend: การดึงข้อมูล, บันทึก และ Logic ฝั่ง Server
├── index.html        → โครงสร้าง UI หลัก (Layout, Header, Tabs)
├── modals.html       → ระบบสแกนบาร์โค้ด และกล่องแจ้งเตือน (Toast)
├── scripts.html      → logic ฝั่ง Frontend (State management, Rendering, API calls)
├── styles.html       → Styling (Tailwind CSS 3 + Custom CSS)
├── README.md         → ข้อมูลโปรเจ็คและสถานะล่าสุด
└── Skill.md          → บันทึกทักษะและบทเรียนที่ได้รับ
```

---

## 🗄️ Database (Google Sheets)

**Spreadsheet ID:** `1WId___CZ_OIcoJWaIjt1BG74erZrsOXzU09Js0nVPO8`

| ชีต | หน้าที่ |
|---|---|
| `Oishi` | ข้อมูลสินค้า โออิชิ / จับใจ |
| `Est` | ข้อมูลสินค้า Est |
| `F&N` | ข้อมูลสินค้า F&N |
| `Aging` | Master Index (ปัจจุบันยังเก็บสำเนาข้อมูล - แผน v3 คือจะเปลี่ยนเป็นเก็บแค่ลำดับ) |

---

## 🛠️ แผนการพัฒนาต่อไป

1.  **Refactor Database:** ปรับชีต Aging ให้เก็บเฉพาะ `SKU` และ `Order` เพื่อลดความซ้ำซ้อนของข้อมูลและเพิ่มความเร็วในการ Sync
2.  **Order Management:** เพิ่มปุ่มสลับลำดับสินค้า (↑ ↓) ในหน้าแอป
3.  **Product Management:** เพิ่มระบบเพิ่ม/ลบสินค้าผ่านหน้าแอปโดยตรง
4.  **Offline Support:** ปรับปรุงระบบ Cache เพื่อให้เปิดแอปได้เร็วขึ้นแม้เน็ตช้า

---

## 📌 ข้อมูลการเข้าถึง

- **GAS URL:** [คลิกที่นี่](https://script.google.com/d/1aMRiNhsFK35kPFERxykp2v3C8PcL8tdbv21kbZH3GCGnI2bhWDG4ARpz/edit)
- **GitHub Repo:** `https://github.com/trpsry/Stock-Manager-v3.git`
