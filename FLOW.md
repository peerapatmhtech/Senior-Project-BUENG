# โครงสร้างและ Flow การทำงานของระบบ FindFriend

เอกสารนี้รวบรวม Flow การทำงานของทุกระบบ (Modules) ภายในโปรเจกต์ FindFriend เพื่อให้เห็นภาพรวมของสถาปัตยกรรมทั้ง Frontend และ Backend

---

## 1. ระบบยืนยันตัวตนและการเข้าสู่ระบบ (Authentication & Authorization)

ระบบนี้รับผิดชอบการสมัครสมาชิก ล็อกอิน และการเข้าถึงหน้าต่างๆ โดยจำกัดเฉพาะผู้ใช้ที่มีอีเมล `@bumail.net` เท่านั้น

### 1.1 Flow การสมัครสมาชิกและล็อกอินด้วย Email/Password

- **Sign Up**: ผู้ใช้กรอกข้อมูล (ชื่อ, อีเมล, รหัสผ่าน, รูปโปรไฟล์) → Frontend ส่ง Request ไปที่ `POST /api/auth/register-request`
- **Backend (Auth Route)**:
  - อัปโหลดรูปโปรไฟล์ผ่าน `multer`
  - สร้าง User ใน Firebase Auth (`emailVerified: false`)
  - บันทึกข้อมูลลง MongoDB (`Gmail` collection รหัส `isVerified: false`)
  - ส่งอีเมลยืนยันตัวตนพร้อม JWT Token ไปที่อีเมลผู้ใช้
- **Email Verification**: ผู้ใช้คลิกลิงก์ในอีเมล (`GET /api/auth/verify-email`) → Backend อัปเดตสถานะ `isVerified: true` ทั้งใน MongoDB และ Firebase
- **Login**: ผู้ใช้ล็อกอินผ่าน Frontend (`loginWithEmail`) → Firebase ตรวจสอบความถูกต้อง → หากสำเร็จ Frontend จะดึง `idToken` จาก Firebase ไปเก็บใน `localStorage` นำไปใช้กับทุก API Request

### 1.2 Flow การล็อกอินด้วย Google (SSO)

- **Login**: ผู้ใช้กดปุ่ม "เชื่อมต่อด้วย Google" (`signInWithPopup`) → Firebase เปิดหน้าต่างล็อกอินของ Google
- **Validation**: Frontend ตรวจสอบว่าอีเมลลงท้ายด้วย `@bumail.net` หรือไม่ (ถ้าไม่ใช่จะบังคับ Logout ทันที)
- **Backend Sync**: เมื่อผู้ใช้เข้าสู่ระบบด้วย Google และเรียกใช้ API ทั่วไป `authMiddleware` ของ Backend จะตรวจสอบ Token
  - หาก Token ถูกต้องแต่ **ไม่พบข้อมูลใน MongoDB** (เพราะเป็นการล็อกอินครั้งแรกผ่าน Google)
  - Backend จะ **Auto-create** ข้อมูลบัญชีผู้ใช้ลง MongoDB ให้อัตโนมัติ พร้อมประทับตรา `isVerified: true` ให้ทันที
- **API Requests**: Frontend แนบ Token ไปกับ Header ทุกครั้ง หาก Token หมดอายุหรือเกิด Response `401 Unauthorized` ระบบ (ใน `api.js`) จะทำการขอ Token ใหม่จาก Firebase (Refresh) อัตโนมัติ 1 ครั้ง ก่อนที่จะเตะผู้ใช้ออกไปหน้า Login

---

## 2. ระบบค้นหาและจับคู่ผ่านกิจกรรม (Event & InfoMatch System)

ระบบนี้เป็น Core Feature สไตล์ "Tinder-like" ที่ใช้สำหรับหาเพื่อนไปร่วมกิจกรรมด้วยกัน

### 2.1 การแสดงผลและเลือกกิจกรรม (Event System)

- **Fetch Events**: หน้า Home (`EventList.jsx`) ดึงรายชื่อกิจกรรมทั้งหมดที่มาจากฐานข้อมูล (`/api/events`)
- **Like/Unlike Event**: ผู้ใช้กดรูปหัวใจที่กิจกรรมที่สนใจ ระบบจะบันทึกสถานะไลก์ลงในตาราง Liked Events ของผู้ใช้นั้น

### 2.2 การทำงานของ InfoMatch Model (Matching Logic)

- **สร้าง โอกาสจับคู่ (Potential Match)**:
  - เมื่อผู้ใช้ **A** กด Like "กิจกรรม X" ระบบจะไปเช็คว่ามี ผู้ใช้ **B** คนไหนไลก์ "กิจกรรม X" ไว้ก่อนหน้านี้หรือไม่
  - ถ้ามี Backend จะจับคู่เป็น Document ในคอลเลกชัน `InfoMatch` โดยกำหนดสถานะเริ่มต้น (status) เป็น `pending` รอการตัดสินใจ
- **หน้าตัดการ์ด (Swiping UI - CardMatch)**:
  - ผู้ใช้อีกฝ่ายเห็นการ์ดของคนที่สนใจกิจกรรมเดียวกัน
  - **กด Like (ปัดขวา)**: อัปเดตสถานะใน `InfoMatch` จาก `pending` เป็น `matched` → เกิดการจับคู่สำเร็จ
  - **กด Skip (ปัดซ้าย)**: อัปเดตค่า `skipCount` เพิ่มขึ้น 1 หากข้ามเกิน 3 ครั้ง สถานะจะเปลี่ยนเป็น `unmatched` (เพื่อไม่ให้เจอการ์ดคนเดิมซ้ำๆ)

---

## 3. ระบบสนทนาแบบเรียลไทม์ (Real-time Chat & Socket.io)

เมื่อจับคู่สำเร็จหรือเข้าร่วมกลุ่ม ผู้ใช้สามารถแชทหากันได้แบบ Real-time

- **การเชื่อมต่อ**: ทันทีที่ล็อกอินเสร็จ `SocketProvider` ฝั่ง Frontend จะทำการเชื่อมต่อกับ Socket.io Server (ผ่านพอร์ตเดียวกับ Backend API) และส่ง Event `user-online` เพื่อรับสถานะ Online/Offline
- **Chat Rooms**: เมื่อมีการจับคู่ `matched` หรือสร้าง/เข้าร่วม Community ระบบจะสร้าง `Room ID` ขึ้นมา
- **Messaging Flow**:
  1. Frontend หน้าแชท (`Chat.jsx`) เข้าร่วมห้องแชท (`socket.emit('join-room')`)
  2. เมื่อพิมพ์ส่งข้อความ (`socket.emit('send-message')`) ข้อความจะถูกส่งไปที่ Backend
  3. Backend บันทึกข้อความลงฐานข้อมูล และกระจายต่อ (`io.to(roomId).emit('receive-message')`) ให้ทุกคนในห้องนั้นเห็นทันที
- **User Status**: Backend รักษา State ของ `onlineUsers` และ `lastSeenTimes` เพื่อแสดงในหน้าแชทว่าเพื่อนออนไลน์อยู่หรือไม่ หรือใช้งานล่าสุดเมื่อไหร่

---

## 4. ระบบคอมมูนิตี้และกลุ่มแชท (Community / Room System)

นอกจากการจับคู่แบบ 1-on-1 แล้ว ผู้ใช้สามารถสร้างหรือเข้าร่วมกลุ่มตามความสนใจได้

- **Create Room**: ผู้ใช้สามารถสร้างห้องสนทนาใหม่ได้ในหน้า Community (`Community.jsx`) โดยระบุชื่อห้อง, รูปหน้าปกห้อง และหมวดหมู่ความสนใจ
- **Join Room**: ข้อมูลห้องจะถูกแสดงแบบสาธารณะ ผู้ใช้คนอื่นสามารถกด Join เข้าร่วมห้องเพื่อร่วมสนทนากับสมาชิกคนอื่นๆ ได้แบบเรียลไทม์
- **Room Data Model**: `Room` collection จะเป็นตัวจัดการรายชื่อสมาชิก (Members), ข้อมูลห้องแชท และสิทธิ์ของเจ้าของห้อง

---

## 5. ระบบโปรไฟล์และเพื่อน (Profile & Friend System)

- **Profile Management**: ผู้ใช้สามารถจัดการรูปภาพโปรไฟล์, ชื่อที่แสดง (DisplayName), และความสนใจ (Genres) ของตัวเองผ่านหน้า `/profile`
- **User Photos**: ในหน้า Profile ผู้ใช้สามารถอัปโหลดรูปภาพส่วนตัวต่างๆ จัดเรียงลำดับได้ และข้อมูลส่วนนี้จะไปปรากฏอยู่ในหน้าการ์ด InfoMatch ของผู้อื่น
- **Friend Request Flow**:
  - เมื่อคลิกดูโปรไฟล์ผู้ใช้อื่น จะสามารถส่ง "คำขอเป็นเพื่อน" (Friend Request) ได้
  - ผู้รับสามารถเลือก `Accept` (รับแอด) หรือ `Reject` (ปฏิเสธ) ได้ในหน้า Notifcation/Friend ถ้ารับแอดจะเข้าไปอยู่ในรายชื่อเพื่อน (`friends` array)

---

## 6. ระบบปัญญาประดิษฐ์ (AI Assistant)

- **Make.com & Gemini Integration**: ระบบมีการเชื่อมต่อกับ `Make.com` Webhooks และ/หรือโมเดล AI (`Gemini`)
- **AI Chat / AI Match Summary**: (ฟีเจอร์ที่อยู่ใน `/api/ai` หรือ `ChatContainerAI.jsx`) ใช้สำหรับช่วยพิจารณาความเข้ากันได้ระหว่างผู้ใช้สองคนผ่านข้อมูลโปรไฟล์, หรืออาจใช้ให้คำแนะนำในการสนทนาตามข้อมูลความสนใจร่วมกันของทั้งสองฝ่าย

---

### สรุปความสัมพันธ์แบบครบวงจร

1. ผู้ใช้ต้องผ่าน **Authentication** (ข้อ 1) ก่อน
2. เมื่อเข้ามาถึง **Home** ผู้ใช้สามารถใช้งาน **Event** เพื่อกดไลก์กิจกรรมที่สนใจได้ (ข้อ 2.1)
3. ระบบเบื้องหลังจะสร้างโอกาสการจับคู่ผ่าน **InfoMatch Model** (ข้อ 2.2)
4. หรือผู้ใช้สามารถเลือกเข้าร่วม **Community Rooms** หาเพื่อนคุยเป็นกลุ่ม (ข้อ 4)
5. เมื่อเข้ากันได้ ไม่ว่าจะ 1-on-1 หรือเข้ากลุ่ม จะเกิดการคุยกันในระบบ **Real-time Chat** (ข้อ 3)
6. ผู้ใช้สามารถส่ง **Friend Request** เพื่อเพิ่มกันเป็นเพื่อนระยะยาว ดูแลผ่านหน้า **Profile** (ข้อ 5) และอาจได้รับตัวช่วยจาก **AI** (ข้อ 6) ในการทลายกำแพงเริ่มคุย
