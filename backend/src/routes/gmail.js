import express from 'express';
import { Gmail } from '../model/gmail.js';
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
      user = new Gmail({ displayName, email, photoURL });
    } else {
      user.displayName = displayName;
      user.photoURL = photoURL;
    }
    // req.session.userId = user._id;

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

// 📌 4️⃣ API ดึงผู้ใช้ทั้งหมด (สำหรับแสดง Friend List)
app.get('/users', async (req, res) => {
  try {
    const users = await Gmail.find();
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
    const user = await Gmail.findOne({ email });
    if (!user) return res.status(404).send('User not found');
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
    const users = await Gmail.find({ email: { $in: email } });
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
