import { getGenAI } from './gemini.js';
import { Info } from '../model/info.js';
import { InfoMatch } from '../model/infomatch.js';
import { Like } from '../model/like.js';
import { Filter } from '../model/filter.js';
import { Friend } from '../model/Friend.js';
import { Gmail } from '../model/gmail.js';
import { GEMINI_MODEL } from '../constants/index.js';

/**
 * Perform semantic matching between a user and other users based on their "About Me" descriptions.
 * Incorporates a Weighted Multi-signal Score with Mutual Friends and Recency.
 */
export const matchByProfile = async (app, userEmail, profileDescription) => {
  try {
    const genAI = getGenAI();
    
    // Update active status for current user
    await Gmail.findOneAndUpdate({ email: userEmail }, { lastActiveAt: new Date() });

    if (!profileDescription || profileDescription.trim().length < 5) {
      return;
    }

    // 1. Pre-filtering & Data Gathering
    const emailDomain = userEmail.split('@')[1];

    // Fetch current user's signals
    const [myLikes, myFilter, myFriendData] = await Promise.all([
      Like.find({ userEmail }).select('eventId').lean(),
      Filter.findOne({ email: userEmail }).lean(),
      Friend.findOne({ email: userEmail }).lean(),
    ]);

    const myEventIds = new Set(myLikes.map(l => l.eventId.toString()));
    const mySubGenreList = myFilter?.subGenres 
      ? Object.values(myFilter.subGenres).flat() 
      : [];
    const myFriendEmails = new Set((myFriendData?.friends || []).map(f => f.email));

    // Fetch potential matches - now also joining with Gmail for lastActiveAt
    const otherUsersRaw = await Info.find({
      email: { $ne: userEmail, $regex: `@${emailDomain}$` },
      'userInfo.detail': { $exists: true, $ne: '' },
    })
      .select('email userInfo.detail updatedAt')
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean();

    if (otherUsersRaw.length === 0) return;

    const otherEmails = otherUsersRaw.map(u => u.email);

    // Fetch account data (Gmail) for recency
    const otherAccounts = await Gmail.find({ email: { $in: otherEmails } }).select('email lastActiveAt').lean();
    const lastActiveByEmail = otherAccounts.reduce((acc, a) => {
      acc[a.email] = a.lastActiveAt;
      return acc;
    }, {});

    // Fetch metadata for all potential matches in bulk
    const [otherLikesAll, otherFiltersAll, existingMatchesAll, otherFriendsAll] = await Promise.all([
      Like.find({ userEmail: { $in: otherEmails } }).lean(),
      Filter.find({ email: { $in: otherEmails } }).lean(),
      InfoMatch.find({
        $or: [
          { email: userEmail, usermatch: { $in: otherEmails } },
          { email: { $in: otherEmails }, usermatch: userEmail }
        ]
      }).lean(),
      Friend.find({ email: { $in: otherEmails } }).lean()
    ]);

    // Grouping for efficient access
    const likesByEmail = otherLikesAll.reduce((acc, l) => {
      if (!acc[l.userEmail]) acc[l.userEmail] = [];
      acc[l.userEmail].push(l.eventId.toString());
      return acc;
    }, {});

    const filtersByEmail = otherFiltersAll.reduce((acc, f) => {
      acc[f.email] = f.subGenres ? Object.values(f.subGenres).flat() : [];
      return acc;
    }, {});

    const friendsByEmail = otherFriendsAll.reduce((acc, fr) => {
      acc[fr.email] = new Set((fr.friends || []).map(f => f.email));
      return acc;
    }, {});

    const skipCountsByEmail = existingMatchesAll.reduce((acc, m) => {
      const other = m.email === userEmail ? m.usermatch : m.email;
      acc[other] = m.skipCount || 0;
      return acc;
    }, {});

    // 2. Prepare for Gemini (Semantic Component)
    const userListForAI = otherUsersRaw.map((u) => ({
      email: u.email,
      detail: u.userInfo.detail,
    }));

    const systemPrompt = `
Role: Senior BUENG AI Matchmaker
Task: วิเคราะห์ความหมายจากโปรไฟล์นักศึกษาเพื่อหาความเข้ากันได้เชิงเป้าหมายและไลฟ์สไตล์
Goal: ส่งคืนคะแนนความคล้ายคลึงของ 'About Me' (Semantic Similarity) 0-100

Output Format: JSON
{ 
  "matches": [
    { "email": "xxx@xxx.edu", "aiScore": score, "reason": "ไทยสั้นๆ" }
  ] 
}`;

    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: systemPrompt,
    });

    const promptText = `User ปัจจุบัน: "${profileDescription}"\nผู้ใช้อื่นๆ: ${JSON.stringify(userListForAI)}`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: promptText }] }],
      generationConfig: {
        temperature: 0.7,
        responseMimeType: 'application/json',
      },
    });

    const aiResponse = JSON.parse(result.response.text());
    const aiMatches = aiResponse.matches || [];

    // 3. Composite Scoring Logic
    const finalMatches = aiMatches.map((match) => {
      const otherEmail = match.email;
      const otherInfo = otherUsersRaw.find(u => u.email === otherEmail);
      if (!otherInfo) return null;

      // Signals
      const otherEventIds = likesByEmail[otherEmail] || [];
      const otherSubGenres = filtersByEmail[otherEmail] || [];
      const otherFriendEmails = friendsByEmail[otherEmail] || new Set();
      
      // Calculate Signal Overlaps
      const commonEvents = otherEventIds.filter(id => myEventIds.has(id)).length;
      const commonSubGenres = otherSubGenres.filter(sg => mySubGenreList.includes(sg)).length;
      
      // Mutual Friends Calculation
      let mutualFriendsCount = 0;
      for (const friendEmail of otherFriendEmails) {
        if (myFriendEmails.has(friendEmail)) mutualFriendsCount++;
      }

      // Normalization (0-100)
      const eventOverlapScore = myEventIds.size > 0 
        ? (commonEvents / Math.max(myEventIds.size, otherEventIds.length, 1)) * 100 
        : 0;
      
      const subGenreOverlapScore = mySubGenreList.length > 0 
        ? (commonSubGenres / Math.max(mySubGenreList.length, otherSubGenres.length, 1)) * 100 
        : 0;

      const aiScore = match.aiScore || 0;

      // Recency Boost (Last active < 7 days)
      const lastActive = lastActiveByEmail[otherEmail] || otherInfo.updatedAt;
      const diffDays = (new Date() - new Date(lastActive)) / (1000 * 60 * 60 * 24);
      const recencyBoostScore = diffDays < 7 ? 100 : 0;

      // Activity Boost
      const activityBoostScore = Math.min(otherEventIds.length * 10, 100);

      // Weighted Multi-signal Score (Sum of weights: 0.35+0.25+0.25+0.10+0.05 = 1.0)
      let weightedScore = (
        (eventOverlapScore * 0.35) +
        (subGenreOverlapScore * 0.25) +
        (aiScore * 0.25) +
        (recencyBoostScore * 0.10) +
        (activityBoostScore * 0.05)
      );

      // Mutual Friend Boost (Facebook-style: +10 points directly to weighted score)
      if (mutualFriendsCount > 0) {
        weightedScore = Math.min(100, weightedScore + 10);
      }

      // Skip Penalty
      const skipCount = skipCountsByEmail[otherEmail] || 0;
      const skipPenalty = Math.max(0.1, 1 - (skipCount * 0.15));
      const finalChance = Math.round(weightedScore * skipPenalty);

      return {
        email: otherEmail,
        chance: finalChance,
        reason: match.reason
      };
    }).filter(m => m && m.chance > 30);

    // 4. Persistence
    const bulkOps = finalMatches.map((match) => {
      const users = [userEmail, match.email].sort();
      return {
        updateOne: {
          filter: {
            email: users[0],
            usermatch: users[1],
            eventId: null,
            status: { $ne: 'matched' },
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
            },
          },
          upsert: true,
        },
      };
    });

    if (bulkOps.length > 0) {
      await InfoMatch.bulkWrite(bulkOps);
    }

    // 5. Notifications
    const io = app.get('io');
    const userSockets = app.get('userSockets') || {};

    if (io && finalMatches.length > 0) {
      for (const match of finalMatches) {
        const recipientSocket = userSockets[match.email];
        if (recipientSocket) {
          io.to(recipientSocket).emit('notify-match', {
            type: 'profile',
            from: userEmail,
            reason: match.reason,
          });
        }
      }
      io.emit('match_updated');
    }
  } catch (error) {
    console.error('[AI Match Service Error]:', error);
  }
};

/**
 * Triggered when a user returns after being inactive.
 */
export const triggerInactiveUserMatch = async (app, userEmail) => {
  const account = await Gmail.findOne({ email: userEmail });
  if (!account) return;

  const diffDays = (new Date() - new Date(account.lastActiveAt)) / (1000 * 60 * 60 * 24);
  
  // If inactive for more than 7 days, trigger re-match
  if (diffDays >= 7) {
    const profile = await Info.findOne({ email: userEmail });
    if (profile?.userInfo?.detail) {
      console.info(`[AI Trigger] User ${userEmail} returned after ${Math.floor(diffDays)} days. Triggering match...`);
      await matchByProfile(app, userEmail, profile.userInfo.detail);
    }
  }
  
  // Always update lastActiveAt
  await Gmail.updateOne({ email: userEmail }, { $set: { lastActiveAt: new Date() } });
};


