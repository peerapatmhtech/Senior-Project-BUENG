import express from 'express';
import { Event } from '../model/event.js';
import { Filter } from '../model/filter.js';
import { Gmail } from '../model/gmail.js';
import { UserEvent } from '../model/userevent.model.js';

export default function (io) {
  const router = express.Router();
  // Get filter by email
  router.get('/filters/:email', async (req, res) => {
    try {
      const filter = await Filter.findOne({ email: req.params.email });
      res.json(filter || null);
    } catch (error) {
      console.error('Error fetching filters:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  // Get events with optional simple filtering
  router.get('/events/:email', async (req, res) => {
    const { email } = req.params;
    const { page = 1, limit = 10 } = req.query;

    try {
      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }

      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const skip = (pageNum - 1) * limitNum;

      // 1. Find all active UserEvent documents for the given email.
      const userEvents = await UserEvent.find({ email: email, status: 'active' });

      // If no user events are found, it's not an error, just means the user has no active events.
      if (!userEvents || userEvents.length === 0) {
        return res.status(200).json({
          events: [],
          totalPages: 0,
          currentPage: 1,
          totalEvents: 0,
        });
      }

      // 2. Extract all eventIds from the userEvents.
      const eventIds = userEvents.map((ue) => ue.eventId);

      // Get total count for pagination calculation
      const totalEvents = await Event.countDocuments({ _id: { $in: eventIds } });

      // 3. Find all events from the Event collection that match the extracted eventIds.
      const events = await Event.find({ _id: { $in: eventIds } })
        .sort({ createdAt: -1 })
        .limit(limitNum)
        .skip(skip);

      return res.status(200).json({
        events,
        totalPages: Math.ceil(totalEvents / limitNum),
        currentPage: pageNum,
        totalEvents,
      });
    } catch (error) {
      console.error('Error fetching events:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  //// Get All Events
  router.get('/events', async (req, res) => {
    try {
      // --- SOFT DELETE CHANGE: Only find active events ---
      const events = await Event.find().sort({
        // Removed status filter as Event model no longer has it
        createdAt: -1,
      });
      if (!events || events.length === 0) {
        return res.status(200).json({ message: 'No events found' });
      }
      if (events.length > 0) {
        return res.status(200).json(events);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  });

  // Delete event by id
  router.delete('/events/:id', async (req, res) => {
    const { id } = req.params;
    const { email } = req.body; // Get user email from request body
    try {
      if (!email) return res.status(400).json({ message: 'User email is required.' });
      // --- SOFT DELETE CHANGE: Update status to 'deleted' instead of deleting ---
      const updatedUserEvent = await UserEvent.findOneAndUpdate(
        { eventId: id, email: email }, // Find by eventId (template ID) and user email
        { status: 'deleted' },
        { new: true }
      );
      if (!updatedUserEvent) {
        return res.status(404).json({ message: 'Event not found' });
      }
      io.emit('events_updated');
      res.json({ message: 'Event marked as deleted', userEvent: updatedUserEvent });
    } catch (err) {
      console.error('Error deleting event:', err);
      res.status(500).json({ message: 'Delete failed' });
    }
  });

  // Delete all events by user
  router.delete('/events/user/:email', async (req, res) => {
    const { email } = req.params;
    try {
      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }
      // --- SOFT DELETE CHANGE: Update status to 'deleted' for all user's events ---
      const result = await UserEvent.updateMany(
        // Change from Event to UserEvent
        { email: email },
        { $set: { status: 'deleted' } }
      );
      if (result.modifiedCount === 0 && result.matchedCount === 0) {
        // Check matchedCount too for no existing docs
        return res.status(404).json({ message: 'Events not found' });
      }
      io.emit('events_updated');
      res.status(200).json({ message: 'ลบกิจกรรมทั้งหมดเรียบร้อยแล้ว' });
    } catch (error) {
      console.error('Error deleting all user events:', error);
      res.status(500).json({ error: 'เกิดข้อผิดพลาดในการลบกิจกรรม' });
    }
  });

  // Friend match
  router.get('/matches/:email', async (req, res) => {
    const { email } = req.params;
    try {
      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }
      const user = await Filter.findOne({ email });
      if (!user) return res.status(404).json({ message: 'User not found' });
      const matches = await Filter.find({
        email: { $ne: email },
        genres: { $in: user.genres },
      });
      const matchEmails = matches.map((m) => m.email);
      const gmailUsers = await Gmail.find({ email: { $in: matchEmails } });
      const combinedMatches = matches.map((match) => {
        const gmailUser = gmailUsers.find((g) => g.email === match.email);
        return {
          ...match.toObject(),
          displayName: gmailUser?.displayName || '',
          photoURL: gmailUser?.photoURL || '',
        };
      });
      // Ensure results are unique by email
      const uniqueMatches = Array.from(
        new Map(combinedMatches.map((item) => [item.email, item])).values()
      );

      res.json(uniqueMatches);
    } catch (error) {
      console.error('Error fetching matches:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  return router;
}
