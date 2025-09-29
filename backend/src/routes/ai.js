import express from 'express';
import { openai } from '../../server.js';
const router = express.Router();

// Define the POST route for the AI chat
router.post('/ai/chat', async (req, res) => {
  const { message, history = [] } = req.body;

  // Validate that a message was provided
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    // Construct the conversation messages array for the AI
    const messages = [
      {
        role: 'system',
        content: 'คุณเป็นผู้ช่วยอัจฉริยะสำหรับแอพจับคู่กิจกรรมและห้อง ชื่อ AI Assistant ที่ให้คำแนะนำเกี่ยวกับการใช้งานแอพ การหาเพื่อนที่มีความสนใจคล้ายกัน และแนะนำกิจกรรมที่น่าสนใจ ตอบเป็นภาษาไทย',
      },
      // Spread the existing conversation history
      ...history,
      // Add the new user message
      {
        role: 'user',
        content: message,
      },
    ];

    // Call the OpenAI API to get a chat completion
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Use the cost-effective and capable gpt-4o-mini model
      messages: messages,
      temperature: 0.7, // Adjust for creativity
      max_tokens: 1000, // Limit the response length
    });

    // Extract the AI's response content
    const aiResponse = completion.choices[0].message.content;
    res.json({ response: aiResponse });

  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    res.status(500).json({ error: 'Failed to get response from AI' });
  }
});

export default router;