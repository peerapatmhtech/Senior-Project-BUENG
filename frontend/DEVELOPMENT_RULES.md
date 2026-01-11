# Frontend Development Rules & Coding Standards

เอกสารนี้รวบรวมกฎและมาตรฐานในการพัฒนา Frontend (React + Vite) เพื่อให้โค้ดมีความสะอาด อ่านง่าย และง่ายต่อการบำรุงรักษา

## 1. Project Structure (โครงสร้างโปรเจกต์)

```text
src/
├── assets/         # รูปภาพ, fonts, และไฟล์ static อื่นๆ
├── components/     # Reusable UI components (ปุ่ม, การ์ด, modal)
├── context/        # React Context providers (Auth, Theme, Socket)
├── hooks/          # Custom React Hooks (useAuth, useSocket)
├── lib/            # Library configurations (axios, react-query)
├── pages/          # Page components (Route targets)
├── server/         # API service functions
└── utils/          # Helper functions ทั่วไป
```

## 2. Naming Conventions (การตั้งชื่อ)

### Files & Directories
- **Component Files:** ใช้ `PascalCase`
  - ✅ `UserProfile.jsx`, `Navbar.jsx`
  - ❌ `userProfile.jsx`, `navbar.js`
- **Hook Files:** ใช้ `camelCase` ขึ้นต้นด้วย `use`
  - ✅ `useAuth.js`, `useWindowSize.js`
- **Utility/Helper Files:** ใช้ `camelCase`
  - ✅ `formatDate.js`, `api.js`

### Variables & Functions
- **Components:** ใช้ `PascalCase`
  - `const UserProfile = () => { ... }`
- **Functions/Variables:** ใช้ `camelCase`
  - `const [isLoading, setIsLoading] = useState(false)`
  - `const handleSubmit = () => { ... }`
- **Constants:** ใช้ `UPPER_SNAKE_CASE`
  - `const MAX_RETRY_COUNT = 3;`

## 3. Coding Best Practices

### React Components
- **Functional Components:** ใช้ Functional Components และ Hooks เสมอ (หลีกเลี่ยง Class Components)
- **Props Destructuring:** Destructure props ใน function signature หรือบรรทัดแรก
  ```jsx
  // ✅ Good
  const Button = ({ label, onClick }) => (
    <button onClick={onClick}>{label}</button>
  );
  ```
- **Prop Types:** กำหนด `propTypes` สำหรับ component ที่รับ props (ถ้าไม่ได้ใช้ TypeScript)

### State Management & Data Fetching
- **React Query:** ใช้ `@tanstack/react-query` สำหรับการดึงข้อมูลจาก Server (Server State)
  - หลีกเลี่ยงการใช้ `useEffect` เพื่อ fetch data โดยตรงถ้าทำได้
- **Context API / Zustand:** ใช้สำหรับ Global Client State (เช่น Theme, Auth, Socket)

### Hooks
- **Rules of Hooks:** เรียกใช้ Hooks ที่ top level เท่านั้น ห้ามเรียกใน loops, conditions, หรือ nested functions
- **Custom Hooks:** แยก Logic ที่ซับซ้อนหรือใช้ซ้ำได้ออกมาเป็น Custom Hook

## 4. Styling (CSS/Tailwind)
- โปรเจกต์นี้รองรับ Tailwind CSS และ CSS ปกติ
- พยายามใช้ Utility classes ของ Tailwind เพื่อความรวดเร็วและความสม่ำเสมอ
- หากต้องเขียน CSS เอง ให้ตั้งชื่อ class ให้สื่อความหมาย (BEM naming convention หรือ kebab-case)

## 5. Clean Code Principles

- **DRY (Don't Repeat Yourself):** แยก Component หรือ Utility function เมื่อมีการใช้โค้ดซ้ำ
- **Single Responsibility:** 1 Component ควรทำหน้าที่หลักเพียงอย่างเดียว ถ้าเริ่มซับซ้อนให้แตกเป็น Sub-components
- **Guard Clauses:** ใช้ return early เพื่อลด nesting
  ```javascript
  if (isLoading) return <Loader />;
  if (error) return <ErrorMessage error={error} />;
  ```

## 6. Performance Optimization

- **useMemo & useCallback:** ใช้เมื่อจำเป็นต้องป้องกันการคำนวณซ้ำหรือป้องกันการ re-render ของ child components ที่รับ props เป็น function/object
- **Lazy Loading:** ใช้ `React.lazy` และ `Suspense` สำหรับ Route หรือ Component ใหญ่ๆ ที่ไม่ได้ใช้ทันที

---

**Checklist ก่อน Push Code:**
- [ ] ลบ `console.log` ที่ใช้ debug ออก
- [ ] ตรวจสอบว่าไม่มี Unused Imports (ใช้ ESLint ช่วย)
- [ ] Format Code ด้วย Prettier (`npm run format`)
- [ ] ตรวจสอบ Lint errors (`npm run lint`)
- [ ] ทดสอบการทำงานบนหน้าจอขนาดต่างๆ (Responsive)