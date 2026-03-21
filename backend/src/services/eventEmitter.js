import { EventEmitter } from 'events';
import { matchByProfile, matchByLikedEvent } from './matchService.js';

const matchEmitter = new EventEmitter();

// Setup listener for profile updates
matchEmitter.on('userProfileUpdated', async ({ app, email, detail }) => {
  console.info(`[Event] Profile updated for ${email}. Starting AI Match...`);
  try {
    await matchByProfile(app, email, detail);
  } catch (error) {
    console.error(`[Event Error] AI Match failed for ${email}:`, error);
  }
});

// Setup listener for event likes (Real-time social matching)
matchEmitter.on('userLikedEvent', async ({ app, email, eventId, eventTitle }) => {
  console.info(`[Event] User ${email} liked event ${eventTitle}. Updating matches...`);
  try {
    await matchByLikedEvent(app, email, eventId, eventTitle);
  } catch (error) {
    console.error(`[Event Error] Like-based Match failed for ${email}:`, error);
  }
});

export default matchEmitter;
