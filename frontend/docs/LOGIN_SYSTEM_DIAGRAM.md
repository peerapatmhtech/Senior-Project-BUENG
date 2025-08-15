# 🔐 Login System Architecture Diagram

## 📋 ภาพรวมระบบ Login

```mermaid
graph TD
    A[👤 User เข้าสู่หน้า Login] --> B{📱 Mobile หรือ Desktop?}
    
    B -->|Desktop| C[🖥️ แสดง Container หลัก<br/>- Sign In Form (ซ้าย)<br/>- Sign Up Form (ซ่อน)<br/>- Toggle Panel (ขวา)<br/>- Floating Button]
    
    B -->|Mobile| D[📱 แสดง Mobile Layout<br/>- Form เต็มหน้าจอ<br/>- Mobile Toggle Buttons<br/>- ซ่อน Desktop Elements]
    
    C --> E{ผู้ใช้เลือกการทำงาน}
    D --> E
    
    E -->|Sign In| F[📝 Sign In Process]
    E -->|Sign Up| G[📝 Sign Up Process]
    E -->|Forgot Password| H[🔄 Password Reset Process]
    
    F --> I[✅ Authentication Success]
    G --> I
    H --> J[📧 Send Reset Email]
    
    I --> K[🏠 Navigate to Home]
    J --> L[📱 Show Success Message]
    
    style A fill:#e1f5fe
    style I fill:#e8f5e8
    style K fill:#fff3e0
```

---

## 🔑 Sign In Process (เข้าสู่ระบบ)

```mermaid
graph TD
    A[🚪 เริ่มต้น Sign In] --> B[📋 แสดง Sign In Form]
    
    B --> C{ผู้ใช้เลือกวิธีเข้าสู่ระบบ}
    
    C -->|Google OAuth| D[🔍 Google Sign In]
    C -->|Email/Password| E[📧 Email Sign In]
    
    D --> D1[📡 signInWithPopup(auth, provider)]
    D1 --> D2[👤 รับข้อมูล user จาก Google]
    D2 --> D3[🗄️ ส่งข้อมูลไป Backend MongoDB]
    D3 --> D4[💾 บันทึกลง localStorage]
    D4 --> SUCCESS[✅ เข้าสู่ระบบสำเร็จ]
    
    E --> E1[🔍 Validate Email (@bumail.net)]
    E1 -->|❌ Invalid| ERROR1[⚠️ แสดงข้อความ Error]
    E1 -->|✅ Valid| E2[🔐 Validate Password (≥6 chars)]
    E2 -->|❌ Invalid| ERROR2[⚠️ แสดงข้อความ Error]
    E2 -->|✅ Valid| E3[🔥 loginWithEmail(email, password)]
    E3 -->|❌ Failed| ERROR3[⚠️ แสดงข้อความ Error Firebase]
    E3 -->|✅ Success| E4[🗄️ ส่งข้อมูลไป Backend]
    E4 --> E5[💾 บันทึกลง localStorage]
    E5 --> SUCCESS
    
    SUCCESS --> F[🎬 Success Animation]
    F --> G[⏱️ setTimeout 500ms]
    G --> H[🏠 navigate("/home")]
    
    ERROR1 --> B
    ERROR2 --> B
    ERROR3 --> B
    
    style A fill:#e3f2fd
    style SUCCESS fill:#e8f5e8
    style H fill:#fff3e0
    style ERROR1 fill:#ffebee
    style ERROR2 fill:#ffebee
    style ERROR3 fill:#ffebee
```

---

## 📝 Sign Up Process (สมัครสมาชิก)

```mermaid
graph TD
    A[📋 เริ่มต้น Sign Up] --> B[📝 แสดง Sign Up Form]
    
    B --> C{ผู้ใช้เลือกวิธีสมัครสมาชิก}
    
    C -->|Google OAuth| D[🔍 Google Sign Up]
    C -->|Email/Password| E[📧 Email Sign Up]
    
    D --> D1[📡 signInWithPopup(auth, provider)]
    D1 --> D2[👤 รับข้อมูล user จาก Google]
    D2 --> D3[🗄️ ส่งข้อมูลไป Backend MongoDB]
    D3 --> D4[💾 บันทึกลง localStorage]
    D4 --> SUCCESS[✅ สมัครสมาชิกสำเร็จ]
    
    E --> E1[📝 Validate Name (ไม่ว่าง)]
    E1 -->|❌ Empty| ERROR1[⚠️ กรุณากรอกชื่อของคุณ]
    E1 -->|✅ Valid| E2[🔍 Validate Email (@bumail.net)]
    E2 -->|❌ Invalid| ERROR2[⚠️ กรุณาใช้อีเมล @bumail.net ที่ถูกต้อง]
    E2 -->|✅ Valid| E3[🔐 Validate Password (≥6 chars)]
    E3 -->|❌ Invalid| ERROR3[⚠️ รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร]
    E3 -->|✅ Valid| E4[🔥 registerWithEmail(email, password, name)]
    E4 -->|❌ Failed| ERROR4[⚠️ แสดงข้อความ Error Firebase]
    E4 -->|✅ Success| E5[🗄️ ส่งข้อมูลไป Backend]
    E5 --> E6[💾 บันทึกลง localStorage]
    E6 --> SUCCESS
    
    SUCCESS --> F[🎬 Success Animation]
    F --> G[⏱️ setTimeout 500ms]
    G --> H[🏠 navigate("/home")]
    
    ERROR1 --> B
    ERROR2 --> B
    ERROR3 --> B
    ERROR4 --> B
    
    style A fill:#f3e5f5
    style SUCCESS fill:#e8f5e8
    style H fill:#fff3e0
    style ERROR1 fill:#ffebee
    style ERROR2 fill:#ffebee
    style ERROR3 fill:#ffebee
    style ERROR4 fill:#ffebee
```

---

## 🔄 Password Reset Process (รีเซ็ตรหัสผ่าน)

```mermaid
graph TD
    A[🔐 เริ่มต้น Password Reset] --> B[👆 คลิก "ลืมรหัสผ่าน?"]
    
    B --> C[📱 เปิด Reset Modal]
    C --> D[📧 กรอกอีเมล @bumail.net]
    
    D --> E[🔍 Validate Email]
    E -->|❌ Empty| ERROR1[⚠️ กรุณากรอกอีเมล]
    E -->|❌ Invalid Domain| ERROR2[⚠️ เฉพาะ @bumail.net เท่านั้น]
    E -->|✅ Valid| F[🔥 resetPassword(email)]
    
    F -->|❌ Failed| ERROR3[⚠️ ข้อผิดพลาดจาก Firebase]
    F -->|✅ Success| G[📧 Firebase ส่งอีเมลรีเซ็ต]
    
    G --> H[✅ แสดงข้อความสำเร็จ]
    H --> I[🧹 เคลียร์ Email Input]
    I --> J[⏱️ setTimeout 3 วินาที]
    J --> K[❌ ปิด Modal อัตโนมัติ]
    
    ERROR1 --> D
    ERROR2 --> D
    ERROR3 --> D
    
    style A fill:#fff8e1
    style G fill:#e8f5e8
    style H fill:#e8f5e8
    style K fill:#f3e5f5
    style ERROR1 fill:#ffebee
    style ERROR2 fill:#ffebee
    style ERROR3 fill:#ffebee
```

---

## 🎯 Form Switching Logic (การสลับฟอร์ม)

```mermaid
graph TD
    A[🏠 เริ่มต้นที่ Sign In] --> B{isActive State}
    
    B -->|false| C[👁️ แสดง Sign In Form<br/>- opacity: 1<br/>- z-index: 2<br/>- pointer-events: all]
    B -->|true| D[👁️ แสดง Sign Up Form<br/>- opacity: 1<br/>- z-index: 5<br/>- pointer-events: all]
    
    C --> E[👻 ซ่อน Sign Up Form<br/>- opacity: 0<br/>- z-index: 1<br/>- pointer-events: none]
    D --> F[👻 ซ่อน Sign In Form<br/>- opacity: 0<br/>- z-index: 1<br/>- pointer-events: none]
    
    E --> G{ผู้ใช้คลิก Switch}
    F --> G
    
    G -->|คลิก "สมัครสมาชิก"| H[🔄 setIsActive(true)<br/>container.classList.add("active")]
    G -->|คลิก "เข้าสู่ระบบ"| I[🔄 setIsActive(false)<br/>container.classList.remove("active")]
    
    H --> J[🎬 Animation: slideInRight]
    I --> K[🎬 Animation: slideInLeft]
    
    J --> D
    K --> C
    
    style C fill:#e8f5e8
    style D fill:#e3f2fd
    style E fill:#f5f5f5
    style F fill:#f5f5f5
```

---

## 📱 Responsive Behavior (การตอบสนองต่อขนาดหน้าจอ)

```mermaid
graph TD
    A[📐 ตรวจสอบขนาดหน้าจอ] --> B{window.innerWidth <= 768?}
    
    B -->|Yes - Mobile| C[📱 Mobile Layout]
    B -->|No - Desktop| D[🖥️ Desktop Layout]
    
    C --> C1[🎛️ แสดง Mobile Toggle Buttons<br/>- ปุ่มสลับที่ด้านล่าง<br/>- แนวนอน flex]
    C --> C2[❌ ซ่อน Desktop Elements<br/>- Toggle Panel<br/>- Floating Action Button]
    C --> C3[📐 Form เต็มหน้าจอ<br/>- width: 100%<br/>- height: 100vh<br/>- border-radius: 0]
    
    D --> D1[🎛️ แสดง Desktop Elements<br/>- Toggle Panel<br/>- Floating Action Button]
    D --> D2[❌ ซ่อน Mobile Toggle Buttons]
    D --> D3[📐 Container ปกติ<br/>- glass morphism<br/>- border-radius: 24px]
    
    C1 --> E[🔄 Form Switching Logic]
    C2 --> E
    C3 --> E
    D1 --> E
    D2 --> E
    D3 --> E
    
    E --> F{isActive State Management}
    
    F -->|Mobile + false| G[📱 แสดง Sign In<br/>display: block]
    F -->|Mobile + true| H[📱 แสดง Sign Up<br/>display: block]
    F -->|Desktop + false| I[🖥️ Sign In ด้านซ้าย<br/>transform: translateX(0)]
    F -->|Desktop + true| J[🖥️ Sign Up เลื่อนเข้า<br/>transform: translateX(100%)]
    
    style C fill:#e8f5e8
    style D fill:#e3f2fd
    style E fill:#fff3e0
```

---

## 🗂️ State Management Overview

```mermaid
graph TD
    A[🏗️ Component State] --> B[📧 Form States]
    A --> C[🎛️ UI States]
    A --> D[🔐 Auth States]
    
    B --> B1[signInForm: {email, password}]
    B --> B2[signUpForm: {name, email, password}]
    B --> B3[resetEmail: string]
    
    C --> C1[isActive: boolean]
    C --> C2[isLoading: boolean]
    C --> C3[isMobile: boolean]
    C --> C4[showResetModal: boolean]
    
    D --> D1[error: string]
    D --> D2[resetMessage: string]
    
    B1 --> E[🔄 Real-time Validation]
    B2 --> E
    B3 --> E
    
    C1 --> F[🎬 Form Switching Animation]
    C2 --> G[⏳ Loading States]
    C3 --> H[📱 Responsive Layout]
    C4 --> I[🔄 Modal Visibility]
    
    D1 --> J[⚠️ Error Display]
    D2 --> K[✅ Success Messages]
    
    style A fill:#e1f5fe
    style B fill:#e8f5e8
    style C fill:#fff3e0
    style D fill:#fce4ec
```

---

## 🔧 Technical Flow Summary

### 🎯 **ขั้นตอนหลัก:**
1. **Initialization** - ตั้งค่า states และ event listeners
2. **Form Display** - แสดงฟอร์มตาม responsive design
3. **User Interaction** - รับ input และ validate
4. **Authentication** - เรียก Firebase Auth APIs
5. **Backend Integration** - ส่งข้อมูลไป MongoDB
6. **Success Handling** - แสดง animation และ navigate

### 🛡️ **Security Features:**
- Email domain validation (@bumail.net only)
- Password strength requirements (≥6 characters)
- Firebase Authentication integration
- Input sanitization และ validation

### 🎨 **UX Features:**
- Glass morphism design
- Smooth animations
- Real-time validation
- Responsive mobile/desktop layouts
- Multiple signup pathways
- Loading states และ error handling

### 📱 **Responsive Design:**
- Mobile: Stack layout, toggle buttons
- Desktop: Side-by-side forms, floating buttons
- Dynamic element visibility
- Touch-friendly interactions
