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

      const bulkOps = [];
      const matchData = []; // To keep track for notification

      for (const like of otherUserLikes) {
        const users = [email, like.userEmail].sort();
        
        // Push bulk operation
        bulkOps.push({
          updateOne: {
            filter: {
              email: users[0],
              usermatch: users[1],
              // Optionally check if we want to allow multiple matches per event or just one pair
              // In this logic, we use status exclusion to prevent duplicate pending
              status: { $nin: ['matched', 'unmatched'] } 
            },
            update: {
              $setOnInsert: {
                eventId: like.eventId,
                detail: like.eventTitle,
                email: users[0],
                usermatch: users[1],
                chance: 40,
                status: 'pending',
                initiatorEmail: email,
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
