# Gemini API Quickstart Guide

## ภาพรวม (Overview)

เอกสารนี้เป็นคู่มือเริ่มต้นสำหรับการใช้งาน **Google Gemini API** ในโปรเจกต์ BUENG Chatbot โดยจะครอบคลุมตั้งแต่การตั้งค่า API Key, การใช้งานพื้นฐาน, ไปจนถึงฟีเจอร์ **Grounding with Google Search** สำหรับข้อมูล Real-time

---

## 1. การขอ API Key

### ขั้นตอนการขอ API Key

1. เข้าไปที่ [Google AI Studio](https://makersuite.google.com/app/apikey)
2. ล็อกอินด้วย Google Account ของคุณ
3. คลิก **"Create API Key"** หรือ **"Get API Key"**
4. เลือก Google Cloud Project (หรือสร้างใหม่)
5. คัดลอก API Key ที่ได้

### ตั้งค่า Environment Variable

เพิ่ม API Key ลงในไฟล์ `.env`:

```bash
GEMINI_API_KEY=your-gemini-api-key-here
```

> [!IMPORTANT]
> อย่าเผยแพร่ API Key ในโค้ดหรือ commit ลง Git โดยตรง ใช้ `.env` และเพิ่ม `.env` ใน `.gitignore` เสมอ

---

## 2. การติดตั้ง SDK

ติดตั้ง Gemini SDK สำหรับ Node.js:

```bash
npm install @google/generative-ai
```

---

## 3. การใช้งานพื้นฐาน

### ตัวอย่างโค้ดเบื้องต้น

```javascript
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Get model
const model = genAI.getGenerativeModel({ 
  model: 'gemini-2.0-flash-exp',
  systemInstruction: 'คุณคือผู้ช่วย AI ที่ตอบเป็นภาษาไทย'
});

// Generate content
const result = await model.generateContent({
  contents: [{
    role: 'user',
    parts: [{ text: 'สวัสดีครับ' }]
  }]
});

console.log(result.response.text());
```

---

## 4. Grounding with Google Search

### คืออะไร?

**Grounding with Google Search** เป็นฟีเจอร์ที่ช่วยให้ Gemini สามารถค้นหาข้อมูลจาก Google Search แบบ Real-time และนำมาใช้ในการตอบคำถาม ทำให้ได้ข้อมูลที่ทันสมัยและแม่นยำยิ่งขึ้น

### วิธีใช้งาน

เพียงเพิ่ม `tools: [{ googleSearch: {} }]` ในการสร้างโมเดล:

```javascript
const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash-exp',
  systemInstruction: 'คุณคือผู้ช่วยแนะนำกิจกรรม',
  tools: [{ googleSearch: {} }] // เปิดใช้งาน Google Search
});

const result = await model.generateContent({
  contents: [{
    role: 'user',
    parts: [{ text: 'มีกิจกรรมอะไรน่าสนใจในกรุงเทพวันนี้บ้าง?' }]
  }]
});

// Gemini จะค้นหาข้อมูลจาก Google Search อัตโนมัติ
console.log(result.response.text());
```

### ประโยชน์

- ✅ ข้อมูลทันสมัย (Real-time)
- ✅ ไม่ต้องเขียน scraping logic เอง
- ✅ ครอบคลุมข้อมูลกว้างขวาง
- ✅ Fact-checking อัตโนมัติ

---

## 5. การจัดการ Conversation History

### แปลง Message Format

Gemini ใช้รูปแบบข้อความที่แตกต่างจาก OpenAI:

```javascript
// OpenAI format
const openaiHistory = [
  { role: 'user', content: 'สวัสดี' },
  { role: 'assistant', content: 'สวัสดีครับ' }
];

// Gemini format
const geminiHistory = openaiHistory.map(msg => ({
  role: msg.role === 'assistant' ? 'model' : 'user',
  parts: [{ text: msg.content }]
}));
```

### ตัวอย่างการใช้งาน

```javascript
const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash-exp',
  systemInstruction: 'คุณคือ BUENG AI'
});

const result = await model.generateContent({
  contents: [
    ...geminiHistory, // ประวัติการสนทนา
    {
      role: 'user',
      parts: [{ text: 'ข้อความใหม่' }]
    }
  ],
  generationConfig: {
    temperature: 0.7,
    maxOutputTokens: 500
  }
});
```

---

## 6. การตั้งค่า Generation Config

### พารามิเตอร์ที่สำคัญ

```javascript
generationConfig: {
  temperature: 0.7,        // ความสร้างสรรค์ (0.0-1.0)
  maxOutputTokens: 500,    // จำนวน token สูงสุด
  topP: 0.95,              // Nucleus sampling
  topK: 40,                // Top-K sampling
  responseMimeType: 'application/json' // สำหรับ JSON response
}
```

### ตัวอย่าง JSON Response

```javascript
const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash-exp',
  systemInstruction: 'ตอบกลับในรูปแบบ JSON เท่านั้น'
});

const result = await model.generateContent({
  contents: [{
    role: 'user',
    parts: [{ text: 'แนะนำกิจกรรม 3 อันดับแรก ในรูปแบบ JSON' }]
  }],
  generationConfig: {
    responseMimeType: 'application/json'
  }
});

const jsonData = JSON.parse(result.response.text());
```

---

## 7. Hybrid Approach: Database + Google Search

### กลยุทธ์แบบผสมผสาน

ในโปรเจกต์ BUENG เราใช้ทั้ง **Database Events** และ **Google Search** ร่วมกัน:

```javascript
// 1. ดึงข้อมูลจาก Database
const dbEvents = await Event.find().sort({ createdAt: -1 }).limit(20);
const eventsContext = dbEvents.map(e => 
  `- ${e.title} (${e.date}) @ ${e.location}`
).join('\n');

// 2. สร้าง System Prompt ที่รวมข้อมูล
const systemPrompt = `
คุณคือ BUENG AI ผู้ช่วยแนะนำกิจกรรม

[กิจกรรมในระบบ]
${eventsContext}

คำแนะนำ:
- ให้ความสำคัญกับกิจกรรมในระบบก่อน
- ใช้ Google Search สำหรับกิจกรรมทั่วไป
- รวมข้อมูลทั้งสองแหล่งในการตอบ
`;

// 3. เรียกใช้ Gemini พร้อม Google Search
const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash-exp',
  systemInstruction: systemPrompt,
  tools: [{ googleSearch: {} }]
});
```

---

## 8. Error Handling

### จัดการ Error ที่พบบ่อย

```javascript
try {
  const result = await model.generateContent(request);
  const response = result.response.text();
  
} catch (error) {
  if (error.message.includes('API_KEY_INVALID')) {
    console.error('API Key ไม่ถูกต้อง');
  } else if (error.message.includes('SAFETY')) {
    console.error('ถูกบล็อกโดย Safety Filter');
  } else if (error.message.includes('QUOTA_EXCEEDED')) {
    console.error('เกิน Quota ที่กำหนด');
  } else {
    console.error('Error:', error.message);
  }
  
  // Fallback response
  return { error: 'ขออภัย เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง' };
}
```

---

## 9. Best Practices สำหรับภาษาไทย

### เทคนิคการเขียน Prompt

```javascript
// ✅ ดี: ระบุภาษาและน้ำเสียงชัดเจน
systemInstruction: `
Role: BUENG AI ผู้ช่วยแนะนำกิจกรรม
Language: ภาษาไทย (เป็นธรรมชาติ ไม่เป็นทางการจนเกินไป)
Tone: เป็นมิตร กระตือรือร้น
`

// ❌ ไม่ดี: ไม่ระบุภาษา
systemInstruction: 'You are an event recommendation assistant'
```

### ตัวอย่าง Prompt ที่ดี

```javascript
const systemPrompt = `
คุณคือ "BUENG AI" ผู้ช่วยอัจฉริยะสำหรับแอพ BUENG

หน้าที่:
1. แนะนำกิจกรรมที่น่าสนใจ
2. ช่วยจับคู่เพื่อนที่มีความสนใจตรงกัน
3. แนะนำหัวข้อสนทนา (Ice Breaking)

ข้อจำกัด:
- ตอบเป็นภาษาไทยเท่านั้น
- กระชับ ไม่เยิ่นเย้อ
- ห้ามตอบคำถามที่ไม่เหมาะสม
`;
```

---

## 10. เปรียบเทียบ OpenAI vs Gemini

| Feature | OpenAI | Gemini |
|---------|--------|--------|
| **System Prompt** | `messages: [{ role: 'system', content: '...' }]` | `systemInstruction: '...'` |
| **User Message** | `{ role: 'user', content: '...' }` | `{ role: 'user', parts: [{ text: '...' }] }` |
| **Assistant** | `{ role: 'assistant', content: '...' }` | `{ role: 'model', parts: [{ text: '...' }] }` |
| **JSON Mode** | `response_format: { type: 'json_object' }` | `responseMimeType: 'application/json'` |
| **Max Tokens** | `max_tokens: 500` | `maxOutputTokens: 500` |
| **Real-time Data** | ❌ ต้องใช้ RAG เอง | ✅ Google Search Grounding |

---

## 11. ทรัพยากรเพิ่มเติม

- 📚 [Gemini API Documentation](https://ai.google.dev/docs)
- 🔑 [Get API Key](https://makersuite.google.com/app/apikey)
- 💡 [Prompt Engineering Guide](https://ai.google.dev/docs/prompt_best_practices)
- 🔍 [Grounding with Google Search](https://ai.google.dev/docs/grounding)

---

## 12. FAQ

### Q: Gemini มี Free Tier ไหม?
A: ใช่ มี Free Tier ที่ใจกว้างมาก (15 requests/minute, 1 million tokens/day)

### Q: Google Search Grounding มีค่าใช้จ่ายเพิ่มไหม?
A: ไม่มีค่าใช้จ่ายเพิ่มเติมในปัจจุบัน

### Q: รองรับภาษาไทยดีไหม?
A: รองรับดีมาก Gemini 2.0 มีความสามารถในภาษาไทยที่ดีเยี่ยม

### Q: ใช้โมเดลไหนดี?
A: แนะนำ `gemini-2.0-flash-exp` สำหรับ production (เร็ว ถูก ดี)

---

**อัพเดทล่าสุด:** 2026-02-07
