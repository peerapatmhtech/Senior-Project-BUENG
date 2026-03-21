import { Event } from '../model/event.js';
import { UserEvent } from '../model/userevent.model.js';
import { Info } from '../model/info.js';
import { getModel } from './gemini.js';

/**
 * Parses various date formats from SerpApi into a Date object.
 * @param {any} dateInfo - The date information from source.
 * @returns {Date|null}
 */
const parseSerpDate = (dateInfo) => {
  if (!dateInfo) return null;
  if (dateInfo instanceof Date) return dateInfo;

  if (typeof dateInfo === 'string') {
    const d = new Date(dateInfo);
    return isNaN(d.getTime()) ? null : d;
  }

  if (typeof dateInfo === 'object') {
    if (dateInfo.start_date) {
      const d = new Date(dateInfo.start_date);
      if (!isNaN(d.getTime())) return d;
    }
    if (dateInfo.when) {
      const year = new Date().getFullYear();
      const d = new Date(`${dateInfo.when} ${year}`);
      if (!isNaN(d.getTime())) return d;
    }
  }
  return null;
};

/**
 * Saves events from a data source using bulk operations to optimize database load.
 * @param {object} params - The parameters for saving events.
 * @param {object} params.data - The raw data object containing events_results.
 * @param {string} params.email - The user's email.
 * @param {object} params.subGenres - The sub-genres for the events.
 * @returns {Promise<Array<object>>} A promise that resolves to an array of newly created or updated events.
 */
export const saveEventsFromSource = async ({ data, email, subGenres }) => {
  try {
    if (!email) throw new Error('Email is required');
    if (!subGenres || Object.keys(subGenres).length === 0) throw new Error('subGenres is required');

    const dataTransfer = data?.events_results ?? data;
    if (!Array.isArray(dataTransfer) || dataTransfer.length === 0) {
      throw new Error('Data must be a non-empty array');
    }

    const validItems = dataTransfer.filter((item) => item.title && item.link);
    if (validItems.length === 0) return [];

    // 1. Prepare Event Bulk Operations (Upsert Events)
    const eventOps = validItems.map((item) => {
      const parsedDate = parseSerpDate(item.date);
      return {
        updateOne: {
          filter: { title: item.title },
          update: {
            $set: {
              email,
              date: parsedDate,
              dateRaw: item.date,
              address: item.address,
              description: item.description,
              link: item.link,
              genre: subGenres,
              image: item.image,
              thumbnail: item.thumbnail,
              venue: item.venue,
              ticket_info: item.ticket_info,
              event_location_map: item.event_location_map,
              createdByAI: true,
            },
          },
          upsert: true,
        },
      };
    });

    await Event.bulkWrite(eventOps);

    // 2. Fetch all event IDs for mapping
    const titles = validItems.map((item) => item.title);
    const events = await Event.find({ title: { $in: titles } })
      .select('_id title')
      .lean();
    const eventMap = new Map(events.map((e) => [e.title, e._id]));

    // 3. Prepare UserEvent Bulk Operations (Link Users to Events)
    const userEventOps = [];
    for (const item of validItems) {
      const eventId = eventMap.get(item.title);
      if (!eventId) continue;

      userEventOps.push({
        updateOne: {
          filter: { email, eventId },
          update: {
            $set: { status: 'active' },
          },
          upsert: true,
        },
      });
    }

    if (userEventOps.length > 0) {
      await UserEvent.bulkWrite(userEventOps);
    }

    // 4. Calculate AI Compatibility Score and Matching Logic
    try {
      await calculateEventCompatibility({ email, validItems, eventMap, subGenres });
    } catch (aiError) {
      console.error('[AI Event Scoring Error]:', aiError);
    }

    // 5. Return the associated activities
    return await UserEvent.find({
      email,
      eventId: { $in: Array.from(eventMap.values()) },
    }).lean();
  } catch (error) {
    console.error('Error in saveEventsFromSource (Bulk):', error);
    throw error;
  }
};

/**
 * Assistant function to calculate event compatibility in bulk.
 */
const calculateEventCompatibility = async ({ email, validItems, eventMap, subGenres }) => {
  const userProfile = await Info.findOne({ email }).select('userInfo.detail').lean();
  const profileText = userProfile?.userInfo?.detail || '';

  if (profileText.length < 5) return;

  const eventsForAI = validItems
    .map((item) => ({
      title: item.title,
      description: item.description,
    }))
    .slice(0, 15);

  const systemPrompt = `
    Role: BUENG AI Event Curator
    Task: วิเคราะห์ความน่าสนใจของกิจกรรมเมื่อเทียบกับ "About Me" ของนักศึกษา
    Goal: ส่งคืนคะแนน Semantic Similarity (0-100) และเหตุผลสั้นๆ 
    Output as JSON only.
    Format: { "scores": [{ "title": "...", "score": 85, "reason": "เชื่อมโยงกับความชอบด้าน..." }] }
  `;

  const model = getModel('RECOMMENDATION', { systemInstruction: systemPrompt });
  const promptText = `User Profile: "${profileText}"\nEvents: ${JSON.stringify(eventsForAI)}`;

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: promptText }] }],
    generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
  });

  const aiOutput = JSON.parse(result.response.text());
  const aiScoresMap = new Map((aiOutput.scores || []).map((s) => [s.title, s]));

  const finalUpdateOps = [];
  const mySubGenresArr = Object.values(subGenres).flat();

  for (const item of validItems) {
    const eventId = eventMap.get(item.title);
    if (!eventId) continue;

    const aiMatch = aiScoresMap.get(item.title);
    const aiScore = aiMatch?.score || 0;
    const aiReason = aiMatch?.reason || 'แนะนำตามความสนใจส่วนตัวของคุณ';

    // Weighted Score: 75% Pre-filtered Signal + 25% AI Semantic
    const baseSignal = mySubGenresArr.length > 0 ? 80 : 50;
    const finalScore = Math.round(baseSignal * 0.75 + aiScore * 0.25);

    finalUpdateOps.push({
      updateOne: {
        filter: { email, eventId },
        update: {
          $set: { matchScore: finalScore, matchReason: aiReason },
        },
      },
    });
  }

  if (finalUpdateOps.length > 0) {
    await UserEvent.bulkWrite(finalUpdateOps);
  }
};
