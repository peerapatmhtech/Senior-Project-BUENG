import { EventEmitter } from 'events';
import { matchByProfile } from './matchService.js';

const matchEmitter = new EventEmitter();

// Setup listener
matchEmitter.on('userProfileUpdated', async ({ app, email, detail }) => {
  console.info(`[Event] Profile updated for ${email}. Starting AI Match...`);
  try {
    await matchByProfile(app, email, detail);
  } catch (error) {
    console.error(`[Event Error] AI Match failed for ${email}:`, error);
  }
});

export default matchEmitter;
