import express from 'express';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import { AiChatMessage } from '../model/AiChatMessage.js';
import { InfoMatch } from '../model/infomatch.js';

dotenv.config();

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
const app = express.Router();
// GET /api/aichat/:roomId - Fetch AI chat history for a room
app.get('/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const messages = await AiChatMessage.find({ roomId }).sort({ timestamp: 1 });
    res.status(200).json({ success: true, data: messages });
  } catch (error) {
    console.error('Error fetching AI chat history:', error);
    res.status(500).json({ success: false, message: 'Error fetching AI chat history.' });
  }
});

// POST /api/aichat/:roomId - Send a message to the AI
app.post('/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { content, history } = req.body;

    // 1. AI Logic: Generate a response
    const match = await InfoMatch.findById(roomId);
    let systemContent =
      'คุณเป็นผู้ช่วยอัจฉริยะสำหรับแอพจับคู่กิจกรรมและห้อง ชื่อ AI Assistant ที่ให้คำแนะนำเกี่ยวกับการใช้งานแอพ การหาเพื่อนที่มีความสนใจคล้ายกัน และแนะนำกิจกรรมที่น่าสนใจ ตอบเป็นภาษาไทย';

    if (match) {
      systemContent += `\n\nข้อมูลเพิ่มเติมเกี่ยวกับห้องแชทปัจจุบัน: ${JSON.stringify(
        match
      )}. ให้ใช้ข้อมูลนี้ในการตอบคำถามเพื่อให้สอดคล้องกับบริบทที่ผู้ใช้กำลังสนทนา`;
    }

    const messagesToAI = [
      {
        role: 'system',
        content: systemContent,
      },
      ...(history || []),
      {
        role: 'user',
        content: content,
      },
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messagesToAI,
    });

    const aiResponseContent = completion.choices[0].message.content;
    // 2. Save user's message
    const userMessage = new AiChatMessage({ roomId, sender: 'user', content });
    await userMessage.save();

    // 3. Save AI's response
    const aiMessage = new AiChatMessage({
      roomId,
      sender: 'ai',
      content: aiResponseContent,
    });
    await aiMessage.save();

    // 4. Send AI's response object back to the client
    res.status(201).json({ success: true, data: aiMessage });
  } catch (error) {
    console.error('AI Chat Error:', error);
    res.status(500).json({ success: false, message: 'Error processing AI message.' });
  }
});

// POST /api/aichat/:roomId/save - Save a pre-generated conversation
app.post('/:roomId/save', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userMessageContent, aiMessageContent } = req.body;

    // 1. Save user's message
    const userMessage = new AiChatMessage({ roomId, sender: 'user', content: userMessageContent });
    await userMessage.save();

    // 2. Save AI's response
    const aiMessage = new AiChatMessage({ roomId, sender: 'ai', content: aiMessageContent });
    await aiMessage.save();

    res.status(201).json({ success: true, message: 'Conversation saved.' });
  } catch (error) {
    console.error('Error saving AI chat:', error);
    res.status(500).json({ success: false, message: 'Error saving AI chat.' });
  }
});

export default app;
