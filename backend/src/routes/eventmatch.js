import express from 'express';
import { Like } from '../model/like.js';
import { InfoMatch } from '../model/infomatch.js';

export default function (io) {
  const router = express.Router();

  router.post('/events/match', async (req, res) => {
    const email = req.user.email;
    const { action } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required (Auth token failure)' });
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

      const bulkOps = [];
      const matchData = []; // To keep track for notification

      const emailDomain = email.split('@')[1];
      const university = emailDomain.includes('bu') ? 'Bangkok University' : 'Other';

      for (const like of otherUserLikes) {
        const users = [email, like.userEmail].sort();
        
        bulkOps.push({
          updateOne: {
            filter: {
              email: users[0],
              usermatch: users[1],
              status: { $ne: 'matched' }
            },
            update: {
              $set: {
                eventId: like.eventId,
                detail: like.eventTitle,
                chance: 40,
                status: 'pending', // Re-trigger even if previously unmatched
                initiatorEmail: email,
                lastMatchedAt: new Date(),
                university: university
              }
            },
            upsert: true
          }
        });

        matchData.push({ targetEmail: like.userEmail, title: like.eventTitle });
      }

      const result = await InfoMatch.bulkWrite(bulkOps);
      
      // Notify only for newly upserted matches
      if (io && result.upsertedCount > 0) {
        const userSockets = req.app.get('userSockets') || {};
        
        // Note: bulkWrite result doesn't easily tell which specific one was upserted in order
        // For simplicity and correctness, we notify all intended targets if they are online
        // The frontend will de-duplicate via fetchNotifications anyway
        for (const target of matchData) {
          const recipientSocket = userSockets[target.targetEmail];
          if (recipientSocket) {
            io.to(recipientSocket).emit('notify-match', {
              type: 'event',
              eventTitle: target.title,
              from: email
            });
          }
        }
        io.emit('match_updated');
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
      await InfoMatch.findByIdAndDelete(id);
      res.status(200).json({ message: 'Match deleted successfully', match });
    } catch (error) {
      console.error('❌ Error updating match status:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  return router;
}
