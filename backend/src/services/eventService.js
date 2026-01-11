import { Event } from '../model/event.js';
import { UserEvent } from '../model/userevent.model.js';
import mongoose from 'mongoose';

/**
 * Processes the raw indices to exclude into a clean array of unique numbers.
 * @param {string|Array<number|string>} rawIndicesToExclude - The raw input for indices.
 * @returns {Array<number>} A clean array of unique numbers.
 */
function processIndicesToExclude(rawIndicesToExclude) {
  let indices = [];
  if (typeof rawIndicesToExclude === 'string') {
    indices = rawIndicesToExclude
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s !== '')
      .map(Number);
  } else if (Array.isArray(rawIndicesToExclude)) {
    indices = rawIndicesToExclude
      .map((s) => String(s).trim())
      .filter((s) => s !== '')
      .map(Number);
  }

  // Filter out NaN values and get unique numbers
  return [...new Set(indices.filter((n) => !isNaN(n)))];
}

/**
 * Saves events from a data source, excluding specified indices and avoiding duplicates.
 * @param {object} params - The parameters for saving events.
 * @param {object} params.data - The raw data object containing organic_results.
 * @param {string} params.email - The user's email.
 * @param {string|Array<number|string>} params.rawIndicesToExclude - Indices to exclude.
 * @param {object} params.subGenres - The sub-genres for the events.
 * @param {string} params.updatedAt - The update timestamp.
 * @returns {Promise<Array<object>>} A promise that resolves to an array of newly created events.
 */
export const saveEventsFromSource = async ({
  data,
  email,
  rawIndicesToExclude,
  subGenres,
  updatedAt,
}) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    // Validate required parameters
    if (!email) throw new Error('Email is required');
    if (!subGenres || Object.keys(subGenres).length === 0) throw new Error('subGenres is required');

    const dataTranfer = data?.events_results ?? data;
    if (!Array.isArray(dataTranfer) || dataTranfer.length === 0) {
      throw new Error('Data must be a non-empty array');
    }

    const indicesToExclude = processIndicesToExclude(rawIndicesToExclude);
    const newUserEvents = [];

    for (let i = 0; i < dataTranfer.length; i++) {
      if (indicesToExclude.includes(i)) continue;

      const item = dataTranfer[i];
      const {
        title,
        date,
        address,
        link,
        description,
        image,
        thumbnail,
        venue,
        ticket_info,
        event_location_map,
      } = item;

      if (!title || !link) continue;

      // 1. Find or create the template Event
      let event = await Event.findOne({ title }).session(session);
      if (!event) {
        event = new Event({
          email,
          title,
          date,
          address,
          description,
          link,
          genre: subGenres,
          image,
          thumbnail,
          venue,
          ticket_info,
          event_location_map,
          createdByAI: true,
        });
        await event.save({ session });
      }

      // 2. Check if the user already has this event
      const existingUserEvent = await UserEvent.findOne({ email, eventId: event._id }).session(
        session
      );
      if (existingUserEvent) continue;

      // 3. Create the UserEvent linking to the template Event
      const userEvent = new UserEvent({
        email,
        eventId: event._id,
        status: 'active',
      });
      await userEvent.save({ session });
      newUserEvents.push(userEvent);
    }

    await session.commitTransaction();
    return newUserEvents;
  } catch (error) {
    await session.abortTransaction();
    console.error('Transaction aborted. Error in saveEventsFromSource:', error);
    throw error; // Re-throw the error to be handled by the route
  } finally {
    session.endSession();
  }
};
