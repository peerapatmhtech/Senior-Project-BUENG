# Chatbot Development Best Practices (Senior Project BUENG)

เอกสารนี้รวบรวมแนวทางปฏิบัติที่ดี (Best Practices) สำหรับการพัฒนาและปรับปรุงระบบ Chatbot ในโปรเจกต์ BUENG เพื่อให้มั่นใจว่า AI มีประสิทธิภาพ ปลอดภัย และมอบประสบการณ์ที่ดีให้กับผู้ใช้

## 1. Prompt Engineering (การออกแบบคำสั่ง)

หัวใจสำคัญของ Chatbot คือ System Prompt ที่ดี

*   **Persona Definition**: กำหนดบทบาทให้ชัดเจน (เช่น "BUENG AI") รวมถึงน้ำเสียง (Tone of Voice) ที่เป็นมิตรและเข้ากับกลุ่มเป้าหมาย
*   **Context Injection**: อย่าให้ AI เดา ส่งข้อมูลบริบทที่จำเป็นเข้าไปใน Prompt เสมอ เช่น:
    *   ข้อมูลกิจกรรม (Event Details)
    *   สถานะความสัมพันธ์ (Friend/Match Status)
    *   ประวัติการสนทนาล่าสุด
*   **Guardrails**: กำหนดขอบเขตสิ่งที่ AI *ห้าม* ทำ เช่น ห้ามขอข้อมูลส่วนตัว (PII), ห้ามตอบเรื่องการเมืองหรือเรื่องละเอียดอ่อน

## 2. Context Window Management (การจัดการบริบท)

LLM มีข้อจำกัดเรื่องจำนวน Token (ความยาวข้อความ)

*   **Sliding Window**: ส่งประวัติการสนทนา (History) เฉพาะ N ข้อความล่าสุด (เช่น 10-20 ข้อความ) ไปให้ AI เพื่อประหยัดค่าใช้จ่ายและทำให้ AI โฟกัสกับปัจจุบัน
*   **Summarization**: หากบทสนทนายาวมาก อาจใช้ AI อีกตัวช่วยสรุปใจความสำคัญก่อนส่งเข้า Context (Advanced)

## 3. RAG (Retrieval-Augmented Generation)

เพื่อให้ AI ฉลาดขึ้นโดยไม่ต้องเทรนโมเดลใหม่

*   **Dynamic Data**: ดึงข้อมูล Real-time จาก Database (MongoDB) เช่น รายชื่อกิจกรรมล่าสุด, สถานะห้องว่าง แล้วแทรกเข้าไปใน System Prompt ก่อนส่งให้ OpenAI
*   **Vector Search**: ในอนาคตหากมีข้อมูลกิจกรรมจำนวนมาก สามารถใช้ Vector Database เพื่อค้นหากิจกรรมที่เกี่ยวข้องกับคำถามผู้ใช้ได้แม่นยำขึ้น

## 4. Security & Privacy (ความปลอดภัย)

*   **Prompt Injection**: ระวังผู้ใช้พยายามหลอกให้ AI ทำงานผิดพลาด หรือเปิดเผย System Prompt ควรมีการตรวจสอบ Input เบื้องต้น
*   **PII Protection**: หลีกเลี่ยงการส่งข้อมูลส่วนตัวที่ละเอียดอ่อน (เช่น รหัสผ่าน, เบอร์โทรศัพท์ส่วนตัว) ไปยัง API ของ OpenAI โดยไม่จำเป็น

## 5. User Experience (ประสบการณ์ผู้ใช้)

*   **Latency**: การตอบสนองต้องรวดเร็ว หาก AI คิดนานควรมี Loading State ที่ชัดเจน
*   **Fallback**: กรณี AI Error หรือ API ล่ม ต้องมีข้อความแจ้งเตือนที่สุภาพ (Graceful Degradation)
*   **Feedback Loop**: ควรเก็บ Log การตอบของ AI และ Feedback จากผู้ใช้ (Like/Dislike) เพื่อนำมาปรับปรุง Prompt

## ตัวอย่างโครงสร้าง System Prompt ที่ดี

```text
Role: [ระบุบทบาท]
Task: [ระบุหน้าที่หลัก]
Context:
- User Info: [ข้อมูลผู้ใช้]
- Current Page/Event: [หน้าปัจจุบันหรือกิจกรรมที่สนใจ]
Constraints:
- [ข้อห้าม 1]
- [ข้อห้าม 2]
Output Format: [รูปแบบคำตอบที่ต้องการ]
```

---
*Updated: 2024*