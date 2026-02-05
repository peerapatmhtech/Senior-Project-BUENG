import express from 'express';
import { Gmail } from '../model/gmail.js';
import { UserPhoto } from '../model/userPhoto.js';
const app = express.Router();

// 📌 3️⃣ API บันทึก/อัปเดตผู้ใช้จาก Google Login และสร้าง Session
app.post('/login', async (req, res) => {
  try {
    const { displayName, email, photoURL } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required for login.' });
    }

    let user = await Gmail.findOne({ email });

    if (!user) {
      user = new Gmail({
        displayName,
        email,
        photoURL,
        isVerified: false, // Default for new users
      });
    } else {
      user.displayName = displayName;
      user.photoURL = photoURL;
    }

    // Check if user is verified
    if (!user.isVerified) {
      return res.status(403).json({
        message: 'โปรดยืนยันอีเมลของคุณก่อนเข้าสู่ระบบ',
        requiresVerification: true,
      });
    }

    await user.save();
    const userId = await Gmail.findOne({ email });
    req.session.userId = userId.email;

    res.status(200).json({
      message: 'Login successful and session created.',
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

// สำหรับดึงข้อมูลผู้ใช้ทั้งหมด (users)
app.get('/users', async (req, res) => {
  try {
    const users = await Gmail.find().lean();

    // Optimization: Batch fetch photos for users with custom order
    const photoIds = users
      .filter((u) => u.photosOrder && u.photosOrder.length > 0)
      .map((u) => u.photosOrder[0]);

    if (photoIds.length > 0) {
      const photos = await UserPhoto.find({ _id: { $in: photoIds } })
        .select('_id url')
        .lean();
      const photoMap = new Map(photos.map((p) => [p._id.toString(), p.url]));

      users.forEach((user) => {
        if (user.photosOrder && user.photosOrder.length > 0) {
          const customPhotoUrl = photoMap.get(user.photosOrder[0]);
          if (customPhotoUrl) user.photoURL = customPhotoUrl;
        }
      });
    }
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'ไม่สามารถโหลดผู้ใช้ได้' });
  }
});

app.get('/users/:email', async (req, res) => {
  const { email } = req.params;
  try {
    if (!email) {
      return res.status(400).send('Email is required.');
    }
    const user = await Gmail.findOne({ email }).lean();
    if (!user) return res.status(404).send('User not found');

    // Check for custom photo order
    if (user.photosOrder && user.photosOrder.length > 0) {
      const photo = await UserPhoto.findById(user.photosOrder[0]).select('url').lean();
      if (photo) {
        user.photoURL = photo.url;
      }
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching friends:', error);
    res.status(500).send('Server error');
  }
});

// สำหรับดึงข้อมูลเพื่อน (usersfriends)
app.get('/usersfriends', async (req, res) => {
  try {
    const email = JSON.parse(decodeURIComponent(req.query.emails));
    const users = await Gmail.find({ email: { $in: email } }).lean();

    // Optimization: Batch fetch photos
    const photoIds = users
      .filter((u) => u.photosOrder && u.photosOrder.length > 0)
      .map((u) => u.photosOrder[0]);

    if (photoIds.length > 0) {
      const photos = await UserPhoto.find({ _id: { $in: photoIds } })
        .select('_id url')
        .lean();
      const photoMap = new Map(photos.map((p) => [p._id.toString(), p.url]));

      users.forEach((user) => {
        if (user.photosOrder && user.photosOrder.length > 0) {
          const customPhotoUrl = photoMap.get(user.photosOrder[0]);
          if (customPhotoUrl) user.photoURL = customPhotoUrl;
        }
      });
    }
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});

// API สำหรับการ Logout และทำลาย Session
app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: 'Could not log out, please try again.' });
    }
    // Clear the session cookie
    res.clearCookie('connect.sid'); // The default session cookie name
    return res.status(200).json({ message: 'Logout successful.' });
  });
});

export default app;
