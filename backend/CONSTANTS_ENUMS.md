# Constants and Enums Structure

## Overview

โครงสร้างการจัดการ constants และ enums ที่ถูกแยกออกมาเพื่อความเป็นระเบียบและง่ายต่อการ maintain

---

## Directory Structure

```
backend/src/
├── constants/
│   ├── index.js          # Barrel export
│   └── gemini.js         # Gemini AI constants
├── enums/
│   ├── index.js          # Barrel export
│   └── aiChat.js         # AI Chat enums
└── routes/
    ├── aichat.js         # Uses constants & enums
    └── ai.js             # Uses constants & enums
```

---

## Files

### 📁 `constants/gemini.js`

Contains all Gemini AI configuration constants:

```javascript
// Model Names
export const GEMINI_MODEL = 'gemini-1.5-flash';
export const GEMINI_MODEL_PRO = 'gemini-1.5-pro';

// Generation Config
export const DEFAULT_TEMPERATURE = 0.7;
export const DEFAULT_MAX_OUTPUT_TOKENS = 500;
export const DEFAULT_MAX_OUTPUT_TOKENS_LONG = 1000;
export const DEFAULT_MAX_OUTPUT_TOKENS_SHORT = 100;

// Limits
export const MAX_HISTORY_MESSAGES = 10;
export const MAX_RECENT_EVENTS = 20;
```

### 📁 `enums/aiChat.js`

Contains all AI chat related enums:

```javascript
// Message Sender Types
export const MessageSender = {
  USER: 'user',
  AI: 'ai',
  ASSISTANT: 'assistant',
  MODEL: 'model',
};

// Gemini Roles
export const GeminiRole = {
  USER: 'user',
  MODEL: 'model',
};

// OpenAI Roles (backward compatibility)
export const OpenAIRole = {
  USER: 'user',
  ASSISTANT: 'assistant',
  SYSTEM: 'system',
};
```

---

## Usage Examples

### In Route Files

```javascript
// Import from barrel exports
import {
  GEMINI_MODEL,
  DEFAULT_TEMPERATURE,
  DEFAULT_MAX_OUTPUT_TOKENS,
} from '../constants/index.js';
import { MessageSender, GeminiRole } from '../enums/index.js';

// Use in code
const model = genAI.getGenerativeModel({
  model: GEMINI_MODEL,
  systemInstruction: systemPrompt,
});

const geminiHistory = history.map((msg) => ({
  role: msg.role === MessageSender.AI ? GeminiRole.MODEL : GeminiRole.USER,
  parts: [{ text: msg.content }],
}));

const result = await model.generateContent({
  contents: geminiHistory,
  generationConfig: {
    temperature: DEFAULT_TEMPERATURE,
    maxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS,
  },
});
```

---

## Benefits

✅ **Centralized Configuration**: แก้ไขค่าได้ที่เดียว  
✅ **Type Safety**: ใช้ enum แทน string literals  
✅ **Easy Maintenance**: เปลี่ยนค่าได้ง่าย ไม่ต้องหาทุกไฟล์  
✅ **Better Readability**: โค้ดอ่านง่ายขึ้น  
✅ **Avoid Typos**: ลด error จากการพิมพ์ผิด  
✅ **Scalability**: เพิ่ม constants/enums ใหม่ได้ง่าย  

---

## Adding New Constants/Enums

### Add New Constant

1. เพิ่มใน `constants/gemini.js`:
   ```javascript
   export const NEW_CONSTANT = 'value';
   ```

2. Import ในไฟล์ที่ต้องการใช้:
   ```javascript
   import { NEW_CONSTANT } from '../constants/index.js';
   ```

### Add New Enum

1. สร้างไฟล์ใหม่ใน `enums/` (ถ้าจำเป็น):
   ```javascript
   // enums/newEnum.js
   export const NewEnum = {
     VALUE1: 'value1',
     VALUE2: 'value2',
   };
   ```

2. Export ใน `enums/index.js`:
   ```javascript
   export * from './aiChat.js';
   export * from './newEnum.js';
   ```

---

**Updated:** 2026-02-07
