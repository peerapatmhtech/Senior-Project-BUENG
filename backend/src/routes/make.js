import express from 'express';
import * as serpApiService from '../services/serpApiService.js';
import dotenv from 'dotenv';

dotenv.config();

/////////-----Model-----/////////
import { Like } from '../model/like.js'; // Import the Like model
import { saveEventsFromSource } from '../services/eventService.js';
import { Info } from '../model/info.js';

export default function (io) {
  const app = express.Router(); 


  app.post('/save-event', async (req, res) => {
    try {
      const { data, email, indicesToExclude: rawIndicesToExclude, subGenres, updatedAt } = req.body;

      const newUserEvents = await saveEventsFromSource({
        data,
        email,
        rawIndicesToExclude,
        subGenres,
        updatedAt, // This is no longer used in the service but kept for compatibility
      });

      res.status(201).json({
        message: `Successfully saved ${newUserEvents.length} new events for the user.`,
        userEvents: newUserEvents,
      });
    } catch (error) {
      console.error('Error saving event:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          message: 'Validation error',
          details: error.message,
        });
      }

      // Handle specific validation/business logic errors from the service
      if (error.message.includes('required') || error.message.includes('non-empty array')) {
        return res.status(400).json({ message: error.message });
      }

      res.status(500).json({
        message: 'Failed to save event',
        error:
          process.env.NODE_ENV === 'development' ? error.message : 'An internal error occurred',
      });
    } finally {
      // Always emit events_updated to refresh client data
      io.emit('events_updated');
    }
  });

  // GET /search-events - Search events using SerpApi
  app.get('/search-events', async (req, res) => {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ message: 'Query parameter "q" is required.' });
    }

    try {
      const data = await serpApiService.searchEventsFull(q);
      res.json(data);
    } catch (error) {
      console.error('Error searching events via SerpApi:', error);
      res.status(500).json({ message: 'Error searching events', error: error.message });
    }
  });

  // GET /likes/exclude/:email
  app.get('/likes/exclude/:email', async (req, res) => {
    const { email } = req.params;
    try {
      const likes = await Like.find({ userEmail: { $ne: email } });
      res.json(likes);
    } catch (err) {
      res.status(500).json({ message: 'Error fetching likes', error: err.message });
    }
  });
  // ดึงข้อมูลผู้ใช้ทุกคน ยกเว้นอีเมลที่รับมาจาก params
  app.get('/user-info-except/:email', async (req, res) => {
    const { email } = req.params;
    try {
      if (!email) {
        return res.status(400).json({ message: 'Email is required.' });
      }
      const users = await Info.find({ email: { $ne: email } });
      res.status(200).json({
        users: users.map((user) => ({ email: user.email, ...user.userInfo })),
      });
    } catch (error) {
      console.error('❌ Error fetching users:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  return app;
}
