# Development Rules & Coding Standards

เอกสารนี้รวบรวมกฎและมาตรฐานในการพัฒนาโปรเจกต์ เพื่อให้โค้ดมีความสะอาด อ่านง่าย และง่ายต่อการบำรุงรักษา (Maintainability)

## 1. Project Structure (โครงสร้างโปรเจกต์)

เราจะใช้สถาปัตยกรรมแบบ **Layered Architecture** โดยแบ่งหน้าที่ชัดเจน:

```text
src/
├── config/         # การตั้งค่า Environment และ Database connection
├── controllers/    # รับ HTTP Request, Validate เบื้องต้น, เรียก Service, ส่ง Response (ห้ามมี Business Logic)
├── models/         # Mongoose Schemas และ Data definitions
├── routes/         # กำหนด Endpoint URL และผูกกับ Controller
├── services/       # Business Logic ทั้งหมด, การคำนวณ, การติดต่อ Database
├── middleware/     # Auth check, Logging, Error handling
└── utils/          # Helper functions ที่ใช้ร่วมกัน
```

> **กฎสำคัญ:** ห้ามเขียน Database Query หรือ Logic ซับซ้อนในไฟล์ `routes/` ให้ย้ายไป `services/` เสมอ

## 2. Naming Conventions (การตั้งชื่อ)

### Files & Directories

- **File Names:** ใช้ `kebab-case` (ตัวเล็กคั่นด้วยขีด)
  - ✅ `user-profile.js`, `auth-controller.js`
  - ❌ `userProfile.js`, `AuthController.js`
- **Model Files:** ใช้ `singular` (เอกพจน์)
  - ✅ `user.model.js`, `event.js`

### Variables & Functions

- **Variables/Functions:** ใช้ `camelCase`
  - `const userEmail = ...`
  - `async function getUserById(...)`
- **Classes/Models:** ใช้ `PascalCase`
  - `const User = mongoose.model(...)`
  - `class EventService { ... }`
- **Constants:** ใช้ `UPPER_SNAKE_CASE`
  - `const MAX_RETRY_COUNT = 3;`

## 3. API Design Guidelines

### URL Path

- ใช้คำนาม (Nouns) เป็นหลัก และใช้ HTTP Method บอกการกระทำ
- ใช้ `kebab-case` ใน URL
  - ✅ `GET /api/users` (ดึงข้อมูลผู้ใช้ทั้งหมด)
  - ✅ `POST /api/users` (สร้างผู้ใช้ใหม่)
  - ✅ `GET /api/users/:id/friends` (ดึงเพื่อนของผู้ใช้)
  - ❌ `POST /api/saveUser` (ไม่ควรใช้ Verb ใน Path)

### Response Format

ต้องส่ง Response กลับในรูปแบบ JSON ที่เป็นมาตรฐานเดียวกันเสมอ:

```javascript
// Success
{
  "success": true,
  "message": "Operation successful",
  "data": { ... } // ข้อมูลที่ส่งกลับ (ถ้ามี)
}

// Error
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message (for dev)" // Optional
}
```

## 4. Coding Best Practices

### Async/Await

- ใช้ `async/await` แทน Promise chaining (`.then()`, `.catch()`) เพื่อให้อ่านง่าย
- ใช้ `try-catch` ใน Controller หรือ Service เพื่อจัดการ Error

### Validation

- ตรวจสอบ Input (Request Body/Params) ก่อนเริ่มทำงานเสมอ
- หากข้อมูลไม่ครบ ให้ return `400 Bad Request` ทันที

```javascript
// ตัวอย่างใน Controller
if (!email || !password) {
  return res.status(400).json({
    success: false,
    message: 'Email and password are required',
  });
}
```

### Database Transactions

- หากมีการเขียนข้อมูลลงหลาย Collection พร้อมกัน (เช่น สร้าง Event และ UserEvent) **ต้อง**ใช้ `mongoose.startSession()` และ `transaction` เพื่อป้องกันข้อมูลไม่สมบูรณ์ (Data Inconsistency)
- ดูตัวอย่างได้ที่ `src/services/eventService.js`

## 5. Git Workflow

- **Branch Naming:**
  - `feature/feature-name` (สำหรับฟีเจอร์ใหม่)
  - `fix/bug-name` (สำหรับแก้บั๊ก)
  - `refactor/component-name` (สำหรับปรับปรุงโค้ด)

- **Commit Messages:** (Conventional Commits)
  - `feat: add login functionality`
  - `fix: resolve user photo upload error`
  - `docs: update api documentation`

## 6. Socket.IO Integration

- หลีกเลี่ยงการ Pass `io` object เข้าไปใน Route function โดยตรง
- ควรสร้าง Socket Service หรือแนบ `io` ไปกับ `req` (via middleware) หรือใช้ Singleton Pattern เพื่อเรียกใช้ `io.emit` จาก Service Layer ได้โดยตรง

## 7. Clean Code Principles

- **DRY (Don't Repeat Yourself):** หลีกเลี่ยงการเขียนโค้ดซ้ำ หากมี Logic ที่ใช้บ่อยให้แยกเป็น Function หรือ Utility
- **KISS (Keep It Simple, Stupid):** เขียนโค้ดให้เรียบง่ายที่สุดเท่าที่จะทำได้ ไม่ซับซ้อนเกินความจำเป็น
- **Single Responsibility (SRP):** 1 Function หรือ 1 Class ควรทำหน้าที่เพียงอย่างเดียว
- **Guard Clauses:** ใช้การ return early เพื่อลดการซ้อนกันของ if-else (Nesting)

```javascript
// ❌ Bad (Deep Nesting)
if (user) {
  if (user.isActive) {
    // do something
  }
}

// ✅ Good (Guard Clause)
if (!user) return;
if (!user.isActive) return;
// do something
```

## 8. Security & Performance

- **Environment Variables:** ห้าม Hardcode Sensitive Data (API Key, DB URI) ให้ใช้ `.env` เสมอ
- **Pagination:** API ที่ดึงข้อมูล List ต้องทำ Pagination เสมอ ห้ามดึงข้อมูลทั้งหมด (Fetch All) มาในครั้งเดียว
- **Indexing:** ตรวจสอบว่า Field ที่ใช้ในการ Search หรือ Filter บ่อยๆ มีการทำ Index ใน Database แล้ว
- **Sanitization:** ตรวจสอบและกรองข้อมูล Input จาก User เพื่อป้องกัน Injection Attacks

## 9. Documentation & Comments

- **Self-documenting Code:** ตั้งชื่อตัวแปรและฟังก์ชันให้สื่อความหมายจนแทบไม่ต้องเขียน Comment
- **JSDoc:** ใช้ JSDoc สำหรับ Function ที่ซับซ้อน หรือ Utility Function

```javascript
/**
 * Calculate total price with tax
 * @param {number} price - The base price
 * @param {number} taxRate - Tax rate in percentage
 * @returns {number} Total price
 */
```

---

**Checklist ก่อน Push Code:**

- [ ] ลบ `console.log` ที่ไม่จำเป็นออก
- [ ] ตรวจสอบว่าไม่มี Hardcoded Credentials (API Keys, Passwords)
- [ ] Format Code ด้วย Prettier/ESLint
- [ ] Test API ด้วย Postman ว่าทำงานถูกต้องตาม Response Format