import express from 'express';
const router = express.Router();
import User from '../model/userroom.js';
import Friend from '../model/Friend.js';

// ดึงข้อมูลเพื่อนของผู้ใช้
router.get('/friends/:email', async (req, res) => {
  const { email } = req.params;
  try {
    // ดึงรายชื่อเพื่อนจาก Friend model แทน userevents (User)
    const friendData = await Friend.findOne({ email });
    const friends = friendData ? friendData.friends : [];

    // ดึงข้อมูลเพื่อนเพิ่มเติมจาก User
    const friendDetails = [];
    for (const friend of friends) {
      const friendData = await User.findOne({ email: friend.email });
      if (friendData) {
        friendDetails.push({
          email: friend.email,
          displayName: friendData.displayName,
          photoURL: friendData.photoURL,
          roomId: friend.roomId,
          eventId: friend.eventId,
        });
      }
    }

    res.status(200).json({ success: true, friends: friendDetails });
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการดึงข้อมูลเพื่อน:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลเพื่อน',
      error: error.message,
    });
  }
});

// ลบเพื่อน
router.delete('/remove-friend', async (req, res) => {
  const { userEmail, friendEmail } = req.body;

  if (!userEmail || !friendEmail) {
    return res.status(400).json({ success: false, message: 'ต้องระบุอีเมลของผู้ใช้และเพื่อน' });
  }

  try {
    // ดึงข้อมูลผู้ใช้จาก Friend model โดยตรง
    const user = await Friend.findOne({ email: userEmail });
    const friend = await Friend.findOne({ email: friendEmail });

    if (!user) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลผู้ใช้ในระบบเพื่อน' });
    }

    if (!friend) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลเพื่อนในระบบเพื่อน' });
    }

    // ลบเพื่อนออกจากรายการเพื่อนของผู้ใช้
    user.friends = user.friends.filter((f) => f.email !== friendEmail);

    // ลบผู้ใช้ออกจากรายการเพื่อนของเพื่อน
    friend.friends = friend.friends.filter((f) => f.email !== userEmail);

    // บันทึกการเปลี่ยนแปลงใน Friend collection
    await user.save();
    await friend.save();

    // ส่งการแจ้งเตือนผ่าน socket server (ถ้ามี)
    if (req.app.get('io')) {
      const io = req.app.get('io');
      const userSockets = req.app.get('userSockets') || {};
      const recipientSocket = userSockets[friendEmail];

      if (recipientSocket) {
        io.to(recipientSocket).emit('notify-friend-remove', { from: userEmail });
      }
    }

    res.status(200).json({
      success: true,
      message: 'ลบเพื่อนสำเร็จ',
      friends: user.friends,
    });
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการลบเพื่อน:', error);
    res
      .status(500)
      .json({ success: false, message: 'เกิดข้อผิดพลาดในการลบเพื่อน', error: error.message });
  }
});

export default router;
