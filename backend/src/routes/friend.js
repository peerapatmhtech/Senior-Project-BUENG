import express from 'express';
import Friend from '../model/Friend.js';
const app = express.Router();

// เพิ่มเพื่อน
app.post('/add-friend', async (req, res) => {
  const { userEmail, friendEmail, roomId, eventId } = req.body;
  if (!userEmail || !friendEmail || !roomId) {
    return res.status(400).json({ error: 'Both userEmail, friendEmail and roomId are required.' });
  }
  if (userEmail === friendEmail) {
    return res.status(400).json({ error: 'You cannot add yourself as a friend.' });
  }
  try {
    const user = await Friend.addFriend(userEmail, friendEmail, roomId, eventId);
    return res.status(200).json({ message: 'Friend added successfully.', user });
  } catch (error) {
    console.error('Error while adding friend:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ดึงข้อมูลเพื่อน
app.get('/friends/:email', async (req, res) => {
  const { email } = req.params;
  try {
    if (!email) {
      return res.status(400).send('Email is required.');
    }
    const user = await Friend.findOne({ email });
    if (!user) return res.status(204).send('User not found');
    res.json(user.friends);
  } catch (error) {
    console.error('Error fetching friends:', error);
    res.status(500).send('Server error');
  }
});

// ดึงข้อมูลเพื่อนทั้งหมด
app.get('/friends', async (req, res) => {
  try {
    const friends = await Friend.find();
    res.json(friends);
  } catch (error) {
    console.error('Error fetching friends:', error);
    res.status(500).json({ message: 'Failed to fetch friends' });
  }
});

// ลบเพื่อนออกจาก list ของ user
app.delete('/users/:userEmail/friends/:friendEmail', async (req, res) => {
  const { userEmail, friendEmail } = req.params;
  try {
    const [user, friend] = await Promise.all([
      Friend.findOne({ email: userEmail }),
      Friend.findOne({ email: friendEmail }),
    ]);
    if (!user) return res.status(404).json({ message: 'User not found' });
    // Remove friend object from friends array by email
    user.friends = user.friends.filter((f) => f.email !== friendEmail);
    await user.save();
    if (friend) {
      friend.friends = friend.friends.filter((f) => f.email !== userEmail);
      await friend.save();
    }
    res.json({ message: 'Friend removed successfully', friends: user.friends });
  } catch (err) {
    console.error('Error removing friend:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Follow Friend
app.post('/users/:userEmail/follow/:targetEmail', async (req, res) => {
  const { userEmail, targetEmail } = req.params;
  if (userEmail === targetEmail) return res.status(400).json({ message: 'Cannot follow yourself' });
  try {
    const user = await Friend.findOne({ email: userEmail });
    const target = await Friend.findOne({ email: targetEmail });
    if (!user || !target) return res.status(404).json({ message: 'User not found' });
    if (!user.following.includes(targetEmail)) {
      user.following.push(targetEmail);
      await user.save();
    }
    if (!target.followers.includes(userEmail)) {
      target.followers.push(userEmail);
      await target.save();
    }
    res.json({ message: 'Followed successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Unfollow Friend
app.delete('/users/:userEmail/unfollow/:targetEmail', async (req, res) => {
  const { userEmail, targetEmail } = req.params;
  try {
    const user = await Friend.findOne({ email: userEmail });
    const target = await Friend.findOne({ email: targetEmail });
    if (!user || !target) return res.status(404).json({ message: 'User not found' });
    user.following = user.following.filter((email) => email !== targetEmail);
    await user.save();
    target.followers = target.followers.filter((email) => email !== userEmail);
    await target.save();
    res.json({ message: 'Unfollowed successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get follow info
app.get('/user/:email/follow-info', async (req, res) => {
  const userEmail = req.params.email;
  try {
    if (!userEmail) {
      return res.status(400).json({ message: 'Email is required.' });
    }
    const user = await Friend.findOne({ email: userEmail }).select('followers following');
    if (!user) return res.status(204).json({ message: 'User not found' });
    const followers = await Friend.find({ email: { $in: user.followers } }).select('email');
    const following = await Friend.find({ email: { $in: user.following } }).select('email');
    res.json({ followers, following });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});
// app.get("/users/:email", async (req, res) => {
//     const userEmail = req.params.email.toLowerCase();
//     try {
//         if (!userEmail) {
//             return res.status(400).json({ error: "Email is required." });
//         }
//         const user = await Friend.findOne({ email: userEmail });
//         if (!user) {
//             return res.status(204).send("User not found");
//         }
//         res.json(user);
//     } catch (error) {
//         console.error("Error fetching user by email:", error);
//         res.status(500).json({ error: "Failed to fetch user" });
//     }
// });

export default app;
