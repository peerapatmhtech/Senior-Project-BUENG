import express from 'express';
import { getGenAI } from '../services/gemini.js';
import {
  GEMINI_MODEL,
  DEFAULT_TEMPERATURE,
  DEFAULT_MAX_OUTPUT_TOKENS_LONG,
} from '../constants/index.js';
import { MessageSender, GeminiRole } from '../enums/index.js';

const router = express.Router();

// Define the POST route for the AI chat
router.post('/ai/chat', async (req, res) => {
  const { message, history = [], eventContext } = req.body;

  // Validate that a message was provided
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  // Base system prompt
  let systemContent =
    'คุณเป็นผู้ช่วยอัจฉริยะสำหรับแอพจับคู่กิจกรรมและห้อง ชื่อ AI Assistant ที่ให้คำแนะนำเกี่ยวกับการใช้งานแอพ การหาเพื่อนที่มีความสนใจคล้ายกัน และแนะนำกิจกรรมที่น่าสนใจ ตอบเป็นภาษาไทย';

  // Add event context to the system prompt if it exists
  if (eventContext) {
    // Assuming eventContext is an object with details about the event.
    // You can format this string to include whatever details are most relevant.
    systemContent += `\n\nข้อมูลเพิ่มเติมเกี่ยวกับกิจกรรมปัจจุบัน: ${JSON.stringify(eventContext)}. ให้ใช้ข้อมูลนี้ในการตอบคำถามเพื่อให้สอดคล้องกับกิจกรรมที่ผู้ใช้กำลังสนใจ`;
  }

  try {
    // Convert history to Gemini format
    const geminiHistory = history.map((msg) => ({
      role:
        msg.role === MessageSender.ASSISTANT || msg.role === MessageSender.AI
          ? GeminiRole.MODEL
          : GeminiRole.USER,
      parts: [{ text: msg.content }],
    }));

    // Initialize Gemini model
    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: systemContent,
    });

    // Call the Gemini API to get a chat completion
    const result = await model.generateContent({
      contents: [
        ...geminiHistory,
        {
          role: 'user',
          parts: [{ text: message }],
        },
      ],
      generationConfig: {
        temperature: DEFAULT_TEMPERATURE, // Adjust for creativity
        maxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS_LONG, // Limit the response length
      },
    });

    // Extract the AI's response content
    const aiResponse = result.response.text();
    res.json({ response: aiResponse });
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    res.status(500).json({ error: 'Failed to get response from AI' });
  }
});

export default router;
