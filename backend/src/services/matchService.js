import { getGenAI } from './gemini.js';
import { Info } from '../model/info.js';
import { InfoMatch } from '../model/infomatch.js';
import { GEMINI_MODEL } from '../constants/index.js';

/**
 * Perform semantic matching between a user and other users based on their "About Me" descriptions.
 * @param {object} app - Express app instance
 * @param {string} userEmail - The email of the user who updated their profile
 * @param {string} profileDescription - The new "About Me" content
 */
export const matchByProfile = async (app, userEmail, profileDescription) => {
  try {
    const genAI = getGenAI();
    if (!profileDescription || profileDescription.trim().length < 5) {
      return;
    }

    // 1. Pre-filtering: Scope to university (emails ending with same domain)
    const emailDomain = userEmail.split('@')[1];

    // Limit to 50 users to avoid Token limits and improve relevance
    const otherUsers = await Info.find({
      email: { $ne: userEmail, $regex: `@${emailDomain}$` },
      'userInfo.detail': { $exists: true, $ne: '' },
    })
      .select('email userInfo.detail')
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean();

    if (otherUsers.length === 0) return;

    // 2. Prepare the prompt for Gemini
    const userList = otherUsers.map((u) => ({
      email: u.email,
      detail: u.userInfo.detail,
    }));

    const systemPrompt = `
Role: Senior BUENG AI Matchmaker
Task: วิเคราะห์ความสนใจที่คล้ายกันระหว่างนักศึกษาในมหาวิทยาลัยเดียวกัน
Goal: ค้นหาความเข้ากันได้ที่มีความหมาย ให้ 2 คนจับคู่กันได้อย่างลงตัว

Output Format: JSON Object ที่มี key "matches" เป็น array
{ 
  "matches": [
    { 
      "email": "receiver@bumail.net", 
      "chance": 0-100, 
      "reason": "ทำไมถึงแมตช์กัน (พูดจาเป็นกันเอง ภาษาไทย)" 
    }
  ] 
}

Constraints:
- เลือกเฉพาะคู่ที่มีความเข้ากันได้สูง (Chance > 70)
- ห้ามตอบอย่างอื่นนอกจาก JSON`;

    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: systemPrompt,
    });

    const promptText = `
User ปัจจุบัน:
Email: ${userEmail}
โปรไฟล์: "${profileDescription}"

นักศึกษาคนอื่นๆ ในมหาวิทยาลัย:
${JSON.stringify(userList)}`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: promptText }] }],
      generationConfig: {
        temperature: 0.8,
        responseMimeType: 'application/json',
      },
    });

    const response = JSON.parse(result.response.text());
    const matches = response.matches || [];

    // 3. Bulk Operations with Re-matching Support
    const bulkOps = matches.map((match) => {
      const users = [userEmail, match.email].sort();
      return {
        updateOne: {
          filter: {
            email: users[0],
            usermatch: users[1],
            eventId: null,
            status: { $ne: 'matched' }, // Don't disturb already matched/friends
          },
          update: {
            $set: {
              detail: match.reason,
              chance: match.chance,
              status: 'pending',
              initiatorEmail: userEmail,
              lastMatchedAt: new Date(),
            },
            $setOnInsert: {
              university: emailDomain.includes('bu') ? 'Bangkok University' : 'Other',
            }
          },
          upsert: true,
        },
      };
    });

    if (bulkOps.length > 0) {
      await InfoMatch.bulkWrite(bulkOps);
    }

    // 4. Notify via Socket.io
    const io = app.get('io');
    const userSockets = app.get('userSockets') || {};

    if (io && bulkOps.length > 0) {
      for (const match of matches) {
        const recipientSocket = userSockets[match.email];
        if (recipientSocket) {
          io.to(recipientSocket).emit('notify-match', {
            type: 'profile',
            from: userEmail,
            reason: match.reason
          });
        }
      }
      io.emit('match_updated');
      console.info(`[AI Match] Successfully matched ${matches.length} users for ${userEmail}.`);
    }
  } catch (error) {
    console.error('[AI Match Service Error]:', error);
  }
};
