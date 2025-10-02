import express from "express";
const router = express.Router();
import User from '../model/userroom.js';
import Friend from "../model/Friend.js";
import FriendRequest from "../model/friendRequest.js";
import { requireOwner } from "../middleware/required.js";
import { Gmail } from "../model/gmail.js";

// API สำหรับส่งคำขอเป็นเพื่อน
router.post('/friend-request', async (req, res) => {
  try {
    console.log("ได้รับคำขอเป็นเพื่อน:", req.body);
    const { from, to, requestId, timestamp, type, roomId } = req.body;

    // ตรวจสอบว่า email ไม่เป็นค่าว่าง
    if (!from.email || !to) {
      return res.status(400).json({ success: false, message: 'Email ผู้ส่งและผู้รับจำเป็นต้องระบุ' });
    }

    // ตรวจสอบว่าเป็น email เดียวกันหรือไม่
    if (from.email === to) {
      return res.status(400).json({ success: false, message: 'ไม่สามารถส่งคำขอเพื่อนถึงตัวเองได้' });
    }

    // ตรวจสอบว่าผู้ใช้มีอยู่จริงหรือไม่
    const toUser = await Gmail.findOne({ email: to });
    if (!toUser) {
      return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้ปลายทาง' });
    }

    // ตรวจสอบว่าเป็นเพื่อนกันแล้วหรือไม่
    const fromUser = await Gmail.findOne({ email: from.email });
    if (!fromUser) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลผู้ส่ง' });
    }

    // ตรวจสอบว่าเป็นเพื่อนกันอยู่แล้วหรือไม่
    const alreadyFriends = fromUser.friends && fromUser.friends.some(friend => friend.email === to);
    if (alreadyFriends) {
      return res.status(400).json({ success: false, message: 'ทั้งสองคนเป็นเพื่อนกันอยู่แล้ว' });
    }

    // ตรวจสอบว่ามีคำขอเพื่อนระหว่างกันอยู่แล้วหรือไม่
    const existingRequest = await FriendRequest.findOne({
      'from.email': from.email,
      'to': to,
      'status': 'pending'
    });

    if (existingRequest) {
      return res.status(400).json({ success: false, message: 'มีคำขอเพื่อนที่ยังไม่ได้ตอบรับอยู่แล้ว' });
    }

    // สร้างคำขอเพื่อนใหม่
    const newFriendRequest = new FriendRequest({
      requestId: requestId || Date.now().toString(),
      from: {
        email: from.email,
        displayName: from.displayName,
        photoURL: from.photoURL
      },
      to,
      timestamp: timestamp || new Date(),
      status: 'pending',
      roomId
    });

    await newFriendRequest.save();

    // ส่งการแจ้งเตือนผ่าน socket server (จะจัดการในไฟล์ server.js)
    if (req.app.get('io')) {
      const io = req.app.get('io');
      const userSockets = req.app.get('userSockets') || {};
      const recipientSocket = userSockets[to];

      if (recipientSocket) {
        io.to(recipientSocket).emit('notify-friend-request', { from: from.email });
      }
    }

    res.status(201).json({
      success: true,
      message: 'ส่งคำขอเพื่อนสำเร็จ',
      requestId: newFriendRequest.requestId
    });

  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการส่งคำขอเพื่อน:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการส่งคำขอเพื่อน', error: error.message });
  }
});

///////// Mark friend requests as read//////////
router.put('/mark-friend-requests-read/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    if (!requestId) {
      return res.status(400).json({ success: false, message: 'Request ID is required' });
    }

    const result = await FriendRequest.updateMany(
      { requestId: requestId, read: false },
      { $set: { read: true } }
    );
    if (result.nModified === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบคำขอเพื่อนที่ยังไม่ได้อ่าน' });
    }

    res.status(200).json({ success: true, message: 'ทำเครื่องหมายคำขอเพื่อนว่าอ่านแล้ว', modifiedCount: result.nModified });
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการทำเครื่องหมายคำขอเพื่อนว่าอ่านแล้ว:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการทำเครื่องหมายคำขอเพื่อนว่าอ่านแล้ว', error: error.message });
  }
});


// API ดึงข้อมูลคำขอเพื่อนของผู้ใช้
router.get('/friend-requests/:userEmail', requireOwner, async (req, res) => {
  try {
    const { userEmail } = req.params;

    // ดึงคำขอเพื่อนที่ถูกส่งมาถึงผู้ใช้
    const requests = await FriendRequest.find({
      to: userEmail,
      status: 'pending'
    }).sort({ timestamp: -1 });

    res.status(200).json({
      success: true,
      requests: requests.map(req => ({
        requestId: req.requestId,
        from: req.from,
        to: req.to,
        timestamp: req.timestamp,
        status: req.status,
        read: req.read
      }))
    });

  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการดึงข้อมูลคำขอเพื่อน:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลคำขอเพื่อน', error: error.message });
  }
});

// API สำหรับตอบรับหรือปฏิเสธคำขอเพื่อน
router.post('/friend-request-response', requireOwner, async (req, res) => {
  try {
    const { requestId, userEmail, friendEmail, response, roomId } = req.body;

    if (!requestId || !userEmail || !friendEmail || !response) {
      return res.status(400).json({ success: false, message: 'ข้อมูลไม่ครบถ้วน' });
    }

    // ดึงคำขอเพื่อนจากฐานข้อมูล
    const friendRequest = await FriendRequest.findOne({ requestId });
    console.log("กำลังตอบรับคำขอเพื่อน:", friendRequest);
    if (!friendRequest) {
      return res.status(404).json({ success: false, message: 'ไม่พบคำขอเพื่อนนี้' });
    }

    if (friendRequest.to !== userEmail) {
      return res.status(403).json({ success: false, message: 'คุณไม่มีสิทธิ์ตอบรับคำขอเพื่อนนี้' });
    }

    // อัปเดตสถานะของคำขอ
    friendRequest.status = response === 'accept' ? 'accepted' : 'declined';
    friendRequest.read = true;
    await friendRequest.save();

    if (response === 'accept') {
      // Find user data from the main User collection to ensure they exist
      const userDataFromMainDB = await User.findOne({ email: userEmail });
      const friendDataFromMainDB = await User.findOne({ email: friendEmail });

      if (!userDataFromMainDB || !friendDataFromMainDB) {
        return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลผู้ใช้ในระบบหลัก' });
      }

      const finalRoomId = roomId || friendRequest.roomId;

      // Upsert for the user who accepted the request
      await Friend.findOneAndUpdate(
        { email: userEmail },
        {
          $addToSet: { friends: { email: friendEmail, roomId: finalRoomId } },
          $setOnInsert: { 
            email: userEmail,
            following: [],
            followers: []
          }
        },
        { upsert: true, new: true }
      );

      // Upsert for the user who sent the request
      await Friend.findOneAndUpdate(
        { email: friendEmail },
        {
          $addToSet: { friends: { email: userEmail, roomId: finalRoomId } },
          $setOnInsert: { 
            email: friendEmail,
            following: [],
            followers: []
          }
        },
        { upsert: true, new: true }
      );

      // Send notification via socket server
      if (req.app.get('io')) {
        const io = req.app.get('io');
        const userSockets = req.app.get('userSockets') || {};
        const recipientSocket = userSockets[friendEmail];

        if (recipientSocket) {
          io.to(recipientSocket).emit('notify-friend-accept', { 
            from: {
              email: userDataFromMainDB.email,
              displayName: userDataFromMainDB.displayName,
              photoURL: userDataFromMainDB.photoURL
            }
          });
        }
      }

      res.status(200).json({
        success: true,
        message: 'ตอบรับคำขอเพื่อนสำเร็จ',
      });
    } else {
      res.status(200).json({ success: true, message: 'ปฏิเสธคำขอเพื่อนสำเร็จ' });
    }

  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการตอบรับคำขอเพื่อน:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการตอบรับคำขอเพื่อน', error: error.message });
  }
});

// API สำหรับดึงข้อมูลการยอมรับคำขอเพื่อนล่าสุด (สำหรับแสดง Toast)
router.get('/friend-accepts/:userEmail',requireOwner, async (req, res) => {
  try {
    const { userEmail } = req.params;

    // ดึงคำขอเพื่อนที่ถูกยอมรับล่าสุดที่ผู้ใช้เป็นผู้ส่ง
    const latestAccept = await FriendRequest.findOne({
      'from.email': userEmail,
      'status': 'accepted'
    }).sort({ updatedAt: -1 }).limit(1);

    if (!latestAccept) {
      return res.status(200).json({ success: true, latestAccept: null });
    }

    // ดึงข้อมูลผู้ใช้ที่ยอมรับคำขอ
    const acceptedUser = await User.findOne({ email: latestAccept.to });

    if (!acceptedUser) {
      return res.status(200).json({ success: true, latestAccept: null });
    }

    res.status(200).json({
      success: true,
      latestAccept: {
        email: acceptedUser.email,
        displayName: acceptedUser.displayName,
        photoURL: acceptedUser.photoURL,
        timestamp: latestAccept.updatedAt
      }
    });

  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการดึงข้อมูลการยอมรับคำขอเพื่อน:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลการยอมรับคำขอเพื่อน', error: error.message });
  }
});
// API สำหรับลบคำขอเพื่อน
router.delete('/friend-request/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;

    // ลบคำขอเพื่อนจากฐานข้อมูล
    const result = await FriendRequest.deleteOne({ requestId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบคำขอเพื่อนนี้' });
    }

    res.status(200).json({ success: true, message: 'ลบคำขอเพื่อนสำเร็จ' });

  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการลบคำขอเพื่อน:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการลบคำขอเพื่อน', error: error.message });
  }
});
router.delete('/friend-request-email/:userEmail/:friendEmail', async (req, res) => {
  const { userEmail, friendEmail } = req.params;

  try {
    // ค้นหาคำขอเพื่อนระหว่างผู้ใช้ทั้งสองก่อน
    const friendRequest = await FriendRequest.findOne({
      $or: [
        { 'from.email': userEmail, 'to': friendEmail },
        { 'from.email': friendEmail, 'to': userEmail }
      ]


    });

    if (!friendRequest) {
      return res.status(404).json({ success: false, message: 'ไม่พบคำขอเพื่อนนี้' });
    }

    // ลบคำขอเพื่อน
    const result = await FriendRequest.deleteOne({ _id: friendRequest._id });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'ไม่สามารถลบคำขอเพื่อนได้' });
    }

    res.status(200).json({ success: true, message: 'ลบคำขอเพื่อนสำเร็จ' });
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการลบคำขอเพื่อน:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการลบคำขอเพื่อน', error: error.message });
  }
});

export default router;
