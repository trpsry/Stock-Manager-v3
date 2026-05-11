# SKILL.md — Stock Manager v3
> สรุปสิ่งที่เรียนรู้ ข้อผิดพลาด และการพัฒนาจาก v2 สู่ v3

---

## 🌟 ทักษะใหม่ในเวอร์ชัน v3 (ล่าสุด)

### 1. Modern Development Workflow
- **Git & Version Control:** การใช้งาน Git ในการจัดการโปรเจกต์ Google Apps Script (GAS) อย่างเป็นระบบ
- **Google Clasp:** การใช้ `clasp` (Command Line Apps Script Projects) เพื่อ Push/Pull โค้ดระหว่างเครื่อง Local และ Google Cloud แทนการแก้บน Browser
- **Remote Collaboration:** การตั้งค่า Remote Repository บน GitHub และการจัดการ Branch พื้นฐาน

### 2. Environment Management
- **Security Best Practices:** การใช้งาน `.gitignore` เพื่อซ่อนไฟล์สำคัญ เช่น `.clasp.json` (ซึ่งเก็บ Script ID และ Credentials) ไม่ให้หลุดขึ้น GitHub
- **Local Development Environment:** การเตรียมโครงสร้างโปรเจกต์ให้รองรับ IDE ภายนอก (เช่น VS Code) ซึ่งช่วยให้เขียนโค้ดได้รวดเร็วขึ้นด้วย Auto-completion และ Linting

---

## 🔴 บทเรียนจาก v2 (สิ่งที่ต้องระวังต่อใน v3)

### 1. Data Integrity & Syncing
- **ปัญหาวนลูป (Infinite Loop):** การเรียก `syncToAging_` ต้องระวังไม่ให้เขียนกลับไปที่ชีตต้นทางจนเกิด loop ไม่จบ
- **Key-Value Consistency:** เมื่อมีการเปลี่ยน SKU (Barcode) ต้องอ่านค่าเดิม (`oldBarcode`) ก่อนเขียนทับเสมอ เพื่อให้การค้นหาในชีตอื่นๆ (เช่น Aging) ไม่คลาดเคลื่อน

### 2. UI Performance
- **Optimistic UI:** การอัปเดตหน้าจอทันทีโดยไม่รอ Server (เช่น ตอนกด Fav หรือสลับลำดับ) ช่วยให้ผู้ใช้รู้สึกว่าแอป "ลื่น" มากขึ้น แต่ต้องมีระบบ Rollback เมื่อ Server ส่ง error กลับมา
- **DOM Efficiency:** การใช้ `querySelector` เฉพาะจุด แทนการวนลูป `querySelectorAll` ช่วยลดภาระของ Browser มือถือได้อย่างมาก

---

## ✅ Best Practices สำหรับ v3

### Frontend
- **Cache Management:** เก็บข้อมูลที่ใช้บ่อย (เช่น options ของ LOT picker) ไว้ในตัวแปร global เพื่อไม่ให้ต้องสร้าง HTML ใหม่ทุกครั้งที่ Render card
- **Responsive Design:** ใช้ Tailwind CSS ในการจัดการ Grid และ Spacing ให้เหมาะกับหน้าจอมือถือทุกขนาด

### Backend (GAS)
- **Quota Optimization:** พยายามลดจำนวนการเรียก `SpreadsheetApp` (เช่น ใช้ `getValues()` ทีเดียวทั้งช่วง แทนการวนลูป `getValue()`)
- **Error Transparency:** ทุกฟังก์ชันต้องมี `try-catch` และส่ง error message ที่เข้าใจง่ายกลับไปให้ Frontend แสดง Toast

---

## 🔧 Workflow สำหรับการทำงานใน v3

1. **แก้ไขโค้ดที่เครื่อง Local (ใน VS Code หรือผ่าน AI Agent)**
2. **ทดสอบ Logic เบื้องต้น**
3. **Push ขึ้น GAS:** `clasp push`
4. **Commit & Push ขึ้น GitHub:** `git add .`, `git commit -m "...", `git push origin main`
