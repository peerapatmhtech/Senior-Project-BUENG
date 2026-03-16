import express from 'express';
import { Info } from '../model/info.js';
import { Gmail } from '../model/gmail.js';
import { requireOwner } from '../middleware/required.js';
import { matchByProfile, triggerInactiveUserMatch } from '../services/matchService.js';
const app = express.Router();

//////////ดึงห้องที่ผู้ใช้เชื่อมต่อ/////////////////
app.get('/user-rooms/:email', requireOwner, async (req, res) => {
  try {
    const email = req.user.email;
    const user = await Info.findOne({ email });
    if (!user) return res.status(204).json({ error: 'User not found' });

    // ✅ แยกเฉพาะ roomId ออกมา

    const roomIds = user.joinedRooms.map((room) => room.roomId);
    // ✅ หาห้องจาก roomIds
    const roomNames = user.joinedRooms.map((room) => room.roomName);
    res.status(200).json({ roomNames, roomIds });
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ดึงข้อมูลผู้ใช้ทั้งหมด (nicknames)
// ใช้สำหรับแสดงรายชื่อผู้ใช้ในหน้าเพื่อน
app.get('/infos', async (req, res) => {
  try {
    const users = await Info.find();
    res.json(users);
  } catch (error) {
    console.error('Error fetching infos:', error);
    res.status(500).json({ error: 'ไม่สามารถโหลดผู้ใช้ได้' });
  }
});
// Get user by email (query)
app.get('/infos/:email', requireOwner, async (req, res) => {
  try {
    const email = req.user.email;
    const user = await Info.findOne({ email });
    if (!user) {
      return res.status(200).json({ message: 'User not found' });
    }

    // Trigger inactive check / update lastActive in background
    triggerInactiveUserMatch(req.app, email).catch(err => 
      console.error('[AI Trigger] Inactive Match Error:', err)
    );

    res.json(user);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
  }
});
// POST /api/save-user-info
app.post('/save-user-info', requireOwner, async (req, res) => {
  const email = req.user.email;
  const { userInfo } = req.body;
  try {
    const updatedUser = await Info.findOneAndUpdate(
      { email },
      { userInfo },
      { new: true, upsert: true }
    );

    // Trigger AI Matching in background (don't await to keep response fast)
    matchByProfile(req.app, email, userInfo?.detail).catch(err => 
      console.error('[AI Match Trigger] Error:', err)
    );

    res.json({ message: 'User info saved', data: updatedUser });
  } catch (error) {
    console.error('❌ Error saving user info:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
// Change Nickname
app.post('/save-user-name', requireOwner, async (req, res) => {
  const email = req.user.email;
  const { nickName } = req.body;
  try {
    const infoUpdate = await Info.findOneAndUpdate(
      { email },
      {
        $set: {
          nickname: nickName,
          updatedAt: new Date(),
        },
      },
      { new: true }
    );
    
    // Update displayName in Gmail collection as well to ensure consistency across the app
    await Gmail.findOneAndUpdate({ email: email }, { displayName: nickName });

    if (!infoUpdate) {
      return res.status(404).json({ message: 'ไม่พบผู้ใช้นี้ในทั้งสอง collection' });
    }
    res.json({
      message: 'อัปเดต nickname และ displayName เรียบร้อย',
      info: infoUpdate,
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดจากเซิร์ฟเวอร์' });
  }
});

// Export the router
export default app;
