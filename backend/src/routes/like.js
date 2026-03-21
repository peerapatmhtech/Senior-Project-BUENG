import express from 'express';
import { Like } from '../model/like.js'; 
import { Info } from '../model/info.js';
import { requireOwner } from '../middleware/required.js';
import { triggerInactiveUserMatch } from '../services/matchService.js';
import matchEmitter from '../services/eventEmitter.js';
const app = express();

// POST /like
app.post('/like', async (req, res) => {
  const userEmail = req.user.email;
  const { eventId, eventTitle } = req.body;

  try {
    const existing = await Like.findOne({ userEmail, eventId });
    if (existing) return res.status(400).json({ message: 'Already liked.' });

    // Check if this is the first like
    const likeCount = await Like.countDocuments({ userEmail });
    
    const like = new Like({ userEmail, eventId, eventTitle });
    await like.save();

    // Trigger AI Matching via event emitter
    matchEmitter.emit('userLikedEvent', {
      app: req.app,
      email: userEmail,
      eventId: eventId,
      eventTitle: eventTitle,
    });

    // Trigger update lastActive status
    await triggerInactiveUserMatch(req.app, userEmail);

    // If first like, trigger matchByProfile to kickstart social matching
    if (likeCount === 0) {
      const profile = await Info.findOne({ email: userEmail });
      if (profile?.userInfo?.detail) {
        // Trigger AI Matching via event emitter
        matchEmitter.emit('userProfileUpdated', {
          app: req.app,
          email: userEmail,
          detail: profile.userInfo.detail,
        });
      }
    }

    res.json({ message: 'Liked!' });
  } catch (err) {
    res.status(500).json({ message: 'Error', error: err.message });
  }
});
// Route to get all likes by user
// GET /likes/:userEmail
app.get('/likes/:userEmail', requireOwner, async (req, res) => {
  const userEmail = req.user.email;

  try {
    const likes = await Like.find({ userEmail });
    res.json(likes);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching likes', error: err.message });
  }
});
// Route to get all likes
// GET /likes
app.get('/likes', async (req, res) => {
  try {
    const likes = await Like.find();
    res.json(likes);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching likes', error: err.message });
  }
});
// Route to unlike an event
// DELETE /unlike/:userEmail/:eventId
app.delete('/like/:userEmail/:eventId', async (req, res) => {
  const userEmail = req.user.email;
  const { eventId } = req.params;
  try {
    const result = await Like.deleteOne({ userEmail, eventId });
    if (result.deletedCount === 0) {
      return res.status(204).json({ message: 'Like not found' });
    }
    res.json({ message: 'Unliked!' });
  } catch (err) {
    res.status(500).json({ message: 'Error', error: err.message });
  }
});
// Route to delete all likes by user
// DELETE /like/:userEmail
app.delete('/like/:userEmail', async (req, res) => {
  const userEmail = req.user.email;
  try {
    const result = await Like.deleteMany({ userEmail });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Like not found' });
    }
    res.json({ message: 'Unliked!' });
  } catch (err) {
    res.status(500).json({ message: 'Error', error: err.message });
  }
});

export default app;
