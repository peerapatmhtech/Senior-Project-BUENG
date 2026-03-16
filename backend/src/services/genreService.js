import { Filter } from '../model/filter.js';
import { Event } from '../model/event.js';
import { InfoMatch } from '../model/infomatch.js';
import { Gmail } from '../model/gmail.js';
import { saveEventsFromSource } from './eventService.js';
import * as serpApiService from './serpApiService.js';

export const updateGenresAndFindEvents = async ({
  email,
  genres,
  subGenres,
  updatedAt,
  searchContext,
}) => {
  // 1. Validation
  const emailValid = await Gmail.findOne({ email });
  if (!emailValid) {
    throw new Error('USER_NOT_FOUND');
  }

  // 2. Update Preferences
  const user = await Filter.findOneAndUpdate(
    { email },
    { genres, subGenres: subGenres || {} },
    { new: true, upsert: true }
  );

  // 3. Exclude Matched Events
  const matchedInfos = await InfoMatch.find({
    $or: [{ email: user.email }, { usermatch: user.email }],
  }).select('eventId');
  const matchedEventIds = matchedInfos.map((info) => info.eventId);

  // 4. Validate and Parse Subgenres
  if (!user.subGenres || (typeof user.subGenres !== 'object' && !(user.subGenres instanceof Map))) {
    throw new Error('INVALID_SUBGENRES_STRUCTURE');
  }

  const subgenresEntries =
    user.subGenres instanceof Map
      ? Array.from(user.subGenres.entries())
      : Object.entries(user.subGenres);

  const allFoundEvents = [];
  const missingSubGenres = {};

  // 5. Parallel Search in Database
  const searchPromises = subgenresEntries.map(async ([category, subgenreList]) => {
    const trimmedCategory = category.trim();
    if (!trimmedCategory) return null;

    const query = {
      email: { $ne: user.email },
      _id: { $nin: matchedEventIds },
    };

    if (Array.isArray(subgenreList) && subgenreList.length > 0) {
      const cleanSubgenres = subgenreList.map((s) => String(s).trim()).filter((s) => s.length > 0);

      if (cleanSubgenres.length > 0) {
        query[`genre.${trimmedCategory}`] = { $in: cleanSubgenres };
      } else {
        query[`genre.${trimmedCategory}`] = { $exists: true };
      }
    } else {
      query[`genre.${trimmedCategory}`] = { $exists: true };
    }

    const events = await Event.find(query).sort({ date: 1 }).limit(50).lean();

    return { category, subgenreList, events };
  });

  const results = await Promise.all(searchPromises);

  results.forEach((result) => {
    if (!result) return;
    if (result.events.length > 0) {
      allFoundEvents.push(...result.events);
    } else {
      missingSubGenres[result.category] = result.subgenreList;
    }
  });

  // 6. Deduplication
  const uniqueFoundEventsMap = new Map();
  allFoundEvents.forEach((e) => uniqueFoundEventsMap.set(e._id.toString(), e));
  const uniqueFoundEvents = Array.from(uniqueFoundEventsMap.values());

  let finalEvents = [];
  if (uniqueFoundEvents.length > 0) {
    const duplicateCheck = await Event.find({
      $and: [
        { _id: { $nin: uniqueFoundEvents.map((e) => e._id) } },
        {
          $or: [
            { title: { $in: uniqueFoundEvents.map((e) => e.title) } },
            { link: { $in: uniqueFoundEvents.map((e) => e.link) } },
          ],
        },
      ],
    })
      .select('title link')
      .lean();

    const duplicateTitles = new Set(duplicateCheck.map((e) => e.title));
    const duplicateLinks = new Set(duplicateCheck.map((e) => e.link));

    finalEvents = uniqueFoundEvents.filter(
      (e) => !duplicateTitles.has(e.title) && !duplicateLinks.has(e.link)
    );
  }

  // 7. Handle Missing Genres (Direct SerpApi Search)
  if (Object.keys(missingSubGenres).length > 0) {
    const serpSearchPromises = [];
    for (const [category, subList] of Object.entries(missingSubGenres)) {
      const items = Array.isArray(subList) ? subList : [subList];
      const limitedItems = items.slice(0, 3); // Limit to 3 searches to avoid rate limits

      for (const item of limitedItems) {
        const subGenreStr = String(item).trim();
        if (!subGenreStr) continue;

        // Construct a descriptive search query with location/date context if available
        let searchQuery = `Events for ${subGenreStr}`;
        if (searchContext) {
          searchQuery += ` ${searchContext}`;
        } else {
          searchQuery += ' in Thailand';
        }

        serpSearchPromises.push(
          (async () => {
            try {
              const eventsFound = await serpApiService.searchEvents(searchQuery);

              if (eventsFound && eventsFound.length > 0) {
                // Automate saving of these new events
                await saveEventsFromSource({
                  data: eventsFound,
                  email: user.email,
                  subGenres: { [category]: [subGenreStr] },
                });

                // Add to results so user sees them immediately
                finalEvents.push(...eventsFound);
              }
            } catch (searchError) {
              console.error(`⚠️ SerpApi search failed for "${searchQuery}":`, searchError.message);
            }
          })()
        );
      }
    }
    await Promise.all(serpSearchPromises);
  }

  // 8. Auto-Save Recommendations (from initial DB results)
  if (finalEvents.length > 0) {
    const data = finalEvents.map((e) => ({
      title: e.title,
      snippet: e.description,
      link: e.link,
      image: e.image,
      date: e.date,
      address: e.address,
      thumbnail: e.thumbnail,
      venue: e.venue,
      ticket_info: e.ticket_info,
      event_location_map: e.event_location_map,
    }));

    await saveEventsFromSource({
      data,
      email,
      subGenres,
      updatedAt,
    });
  }

  // Final deduplication for safety (if SerpApi results overlapped with DB)
  const finalMap = new Map();
  finalEvents.forEach((ev) => {
    const key = ev._id ? ev._id.toString() : ev.link;
    finalMap.set(key, ev);
  });

  return Array.from(finalMap.values());
};
