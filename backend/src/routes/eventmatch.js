import express from 'express';
import { Like } from '../model/like.js';
import { InfoMatch } from '../model/infomatch.js';

export default function (io) {
  const router = express.Router();

  router.post('/events/match', async (req, res) => {
    const { email, action } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Check if there are any likes for the provided email
    // FIX: Check Like model instead of InfoMatch (InfoMatch doesn't have userEmail and is for results)
    const emailExists = await Like.findOne({ userEmail: email });
    if (!emailExists) {
      return res.status(404).json({ message: 'No likes found for the provided email' });
    }

    try {
      const currentUserEventIds = action.eventsId;

      // Find likes from other users that match the current user's liked events
      const otherUserLikes = await Like.find({
        userEmail: { $ne: email },
        eventId: { $in: currentUserEventIds },
      });

      if (!otherUserLikes || otherUserLikes.length === 0) {
        return res.status(200).json({ message: 'No likes found from other users' });
      }

      for (const like of otherUserLikes) {
        // To ensure uniqueness, sort emails alphabetically
        const users = [email, like.userEmail].sort();

        // Avoid creating duplicate pending matches
        const existingMatch = await InfoMatch.findOne({
          // eventId: like.eventId, // เอาออกเพื่อเช็คแค่ว่า User คู่นี้เคย Match กันหรือยัง (ไม่สนว่า Event ไหน)
          email: users[0],
          usermatch: users[1],
          status: { $in: ['pending', 'matched'] }, // Don't recreate if it was already unmatched
        });
        if (existingMatch) continue;

        const newInfoMatch = new InfoMatch({
          eventId: like.eventId,
          detail: like.eventTitle,
          email: users[0], // Always store the alphabetically first email here
          usermatch: users[1], // And the second here
          chance: 40,
          status: 'pending', // Initial status
          initiatorEmail: email, // The user who triggered this action
        });

        await newInfoMatch.save();
        io.emit('match_updated'); // Emit event here
      }

      res.status(200).json({
        message: 'Matching process completed',
        matchedLikes: otherUserLikes,
      });
    } catch (error) {
      console.error('Error matching events:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // This route is now used for "skipping" a match
  router.delete('/infomatch/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const match = await InfoMatch.findById(id);

      if (!match) {
        return res.status(404).json({ message: 'Match not found' });
      }
      console.log('Deleting match with ID:', id);
      await InfoMatch.findByIdAndDelete(id);
      res.status(200).json({ message: 'Match deleted successfully', match });
    } catch (error) {
      console.error('❌ Error updating match status:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  return router;
}
