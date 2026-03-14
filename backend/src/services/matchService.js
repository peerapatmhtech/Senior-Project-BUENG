import { getGenAI } from './gemini.js';
import { Info } from '../model/info.js';
import { InfoMatch } from '../model/infomatch.js';
import { GEMINI_MODEL } from '../constants/index.js';

/**
 * Perform semantic matching between a user and other users based on their "About Me" descriptions.
 * @param {object} io - Socket.io instance
 * @param {string} userEmail - The email of the user who updated their profile
 * @param {string} profileDescription - The new "About Me" content
 */
export const matchByProfile = async (io, userEmail, profileDescription) => {
  try {
    const genAI = getGenAI();
    // if (!profileDescription || profileDescription.trim().length < 10) {
    //   console.info(`[AI Matching] Description for ${userEmail} too short, skipping.`);
    //   return;
    // }

    // 1. Fetch all other users with descriptions
    const otherUsers = await Info.find({
      email: { $ne: userEmail },
      'userInfo.detail': { $exists: true, $ne: '' },
    })
      .select('email userInfo.detail')
      .lean();

    if (otherUsers.length === 0) return;

    // 2. Prepare the prompt for Gemini
    const userList = otherUsers.map((u) => ({
      email: u.email,
      detail: u.userInfo.detail,
    }));

    const systemPrompt = `
Role: BUENG AI Matcher
Task: วิเคราะห์ความสนใจที่คล้ายกันระหว่าง "ผู้ใช้ปัจจุบัน" กับ "รายการผู้ใช้อื่น"
Goal: ค้นหาบุคคลที่มีแนวโน้มว่าจะเข้ากันได้ดีหรือมีความสนใจคล้ายกัน เพื่อจับคู่กัน

Output Format: JSON Object ที่มี key "matches" เป็น array
JSON Structure:
{ 
  "matches": [
    { 
      "email": "อีเมลของผู้ที่ถูกจับคู่ด้วย", 
      "chance": 0-100 (ตัวเลขโอกาสที่จะแมตช์), 
      "reason": "เหตุผลสั้นๆ เป็นภาษาไทยที่บอกว่าทำไมถึงแมตช์กัน" 
    }
  ] 
}

Constraints:
- เลือกเฉพาะคนที่มีค่า chance สูงกว่า 60 เท่านั้น (ถ้าไม่มีให้ส่ง array ว่าง)
- เหตุผลต้องเป็นกันเองและสั้นๆ
- ห้ามตอบอย่างอื่นนอกจาก JSON`;

    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: systemPrompt,
    });

    const promptText = `
ผู้ใช้ปัจจุบัน:
Email: ${userEmail}
About Me: ${profileDescription}

รายการผู้ใช้อื่น:
${JSON.stringify(userList)}`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: promptText }] }],
      generationConfig: {
        temperature: 0.7,
        responseMimeType: 'application/json',
      },
    });

    const response = JSON.parse(result.response.text());
    const matches = response.matches || [];

    // 3. Save matches to InfoMatch collection
    for (const match of matches) {
      // Sort emails to maintain consistency in InfoMatch (email vs usermatch)
      const users = [userEmail, match.email].sort();

      await InfoMatch.findOneAndUpdate(
        {
          email: users[0],
          usermatch: users[1],
          // We can identify profile matches by null eventId or a specific flag
          eventId: null,
        },
        {
          email: users[0],
          usermatch: users[1],
          detail: match.reason, // Use AI reason as the detail
          chance: match.chance,
          status: 'pending',
          initiatorEmail: userEmail,
        },
        { upsert: true, new: true }
      );
    }

    // 4. Notify clients via Socket.io
    if (io) {
      io.emit('match_updated');
      console.info(
        `[AI Matching] Successfully processed matches for ${userEmail}. Found ${matches.length} matches.`
      );
    }
  } catch (error) {
    console.error('[AI Matching] Error:', error);
  }
};
