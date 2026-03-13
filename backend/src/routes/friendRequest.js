import express from 'express';
import mongoose from 'mongoose';
const router = express.Router();
import User from '../model/userroom.js';
import Friend from '../model/Friend.js';
import FriendRequest from '../model/friendRequest.js';
import { requireOwner } from '../middleware/required.js';
import { Gmail } from '../model/gmail.js';

// API สำหรับส่งคำขอเป็นเพื่อน
router.post('/friend-request', async (req, res) => {
  try {
    const { from, to, requestId, timestamp, roomId } = req.body;

    // 1. Validate Input
    if (!from?.email || !to) {
      return res
        .status(400)
        .json({ success: false, message: 'Email ผู้ส่งและผู้รับจำเป็นต้องระบุ' });
    }
    if (from.email === to) {
      return res
        .status(400)
        .json({ success: false, message: 'ไม่สามารถส่งคำขอเพื่อนถึงตัวเองได้' });
    }

    // 2. Fetch Data Concurrently (Performance Optimization)
    // ดึงข้อมูลที่จำเป็นทั้งหมดในครั้งเดียวเพื่อลดเวลา Response time
    const [targetUser, senderUser, senderFriendData, existingRequest] = await Promise.all([
      Gmail.findOne({ email: to }).select('_id'),
      Gmail.findOne({ email: from.email }).select('_id'),
      Friend.findOne({ email: from.email }).select('friends'),
      FriendRequest.findOne({
        $or: [
          { 'from.email': from.email, to: to }, // กรณีเราส่งไปแล้ว
          { 'from.email': to, to: from.email }, // กรณีเขาส่งมาแล้ว
        ],
        status: 'pending',
      }),
    ]);

    // 3. Validate User Existence
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้ปลายทางในระบบ' });
    }
    if (!senderUser) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลผู้ส่งในระบบ' });
    }

    // 4. Validate Friendship Status
    // ตรวจสอบว่าใน Friend collection ของผู้ส่ง มีเพื่อนคนนี้อยู่แล้วหรือไม่
    if (senderFriendData?.friends?.some((f) => f.email === to)) {
      return res.status(400).json({ success: false, message: 'ทั้งสองคนเป็นเพื่อนกันอยู่แล้ว' });
    }

    // 5. Validate Existing Requests (Conflict Handling)
    if (existingRequest) {
      if (existingRequest.from.email === from.email) {
        return res.status(409).json({
          success: false,
          message: 'คุณได้ส่งคำขอเป็นเพื่อนถึงผู้ใช้นี้ไปแล้ว (รอการตอบรับ)',
        });
      }
      return res.status(409).json({
        success: false,
        message: 'ผู้ใช้นี้ได้ส่งคำขอถึงคุณแล้ว กรุณาตรวจสอบที่เมนูคำขอเพื่อน',
      });
    }

    // 6. Create New Request
    const newFriendRequest = new FriendRequest({
      requestId: requestId || Date.now().toString(),
      from: {
        email: from.email,
        displayName: from.displayName,
        photoURL: from.photoURL,
      },
      to,
      timestamp: timestamp || new Date(),
      status: 'pending',
      roomId,
    });

    await newFriendRequest.save();

    // 7. Real-time Notification
    const io = req.app.get('io');
    if (io) {
      const userSockets = req.app.get('userSockets') || {};
      const recipientSocket = userSockets[to];

      if (recipientSocket) {
        io.to(recipientSocket).emit('notify-friend-request', { from: from.email });
      }
    }

    res.status(201).json({
      success: true,
      requestId: newFriendRequest.requestId,
      message: 'ส่งคำขอเป็นเพื่อนเรียบร้อยแล้ว',
    });
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการส่งคำขอเพื่อน:', error);

    // Handle Duplicate Key Error (MongoDB E11000)
    // เป็นการดักจับ Race Condition ที่อาจหลุดรอดจากการเช็ค existingRequest
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'คุณได้ส่งคำขอเป็นเพื่อนถึงผู้ใช้นี้ไปแล้ว',
      });
    }

    res
      .status(500)
      .json({ success: false, message: 'เกิดข้อผิดพลาดในการส่งคำขอเพื่อน', error: error.message });
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

    res.status(200).json({
      success: true,
      message: 'ทำเครื่องหมายคำขอเพื่อนว่าอ่านแล้ว',
      modifiedCount: result.nModified,
    });
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการทำเครื่องหมายคำขอเพื่อนว่าอ่านแล้ว:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการทำเครื่องหมายคำขอเพื่อนว่าอ่านแล้ว',
      error: error.message,
    });
  }
});

// API ดึงข้อมูลคำขอเพื่อนของผู้ใช้
router.get('/friend-requests/:userEmail', requireOwner, async (req, res) => {
  try {
    const { userEmail } = req.params;

    // 1. ดึงคำขอเพื่อนที่ถูกส่งมาถึงผู้ใช้
    const requests = await FriendRequest.find({
      to: userEmail,
      status: 'pending',
    }).sort({ timestamp: -1 }).lean();

    if (requests.length === 0) {
      return res.status(200).json({ success: true, requests: [] });
    }

    // 2. ดึงข้อมูลล่าสุดของผู้ส่งทุกคน
    const fromEmails = [...new Set(requests.map(r => r.from.email))];
    
    const [usersData, infosData] = await Promise.all([
      Gmail.find({ email: { $in: fromEmails } }).lean(),
      mongoose.model('Info').find({ email: { $in: fromEmails } }).select('email nickname').lean()
    ]);

    const infoMap = new Map(infosData.map(i => [i.email, i.nickname]));
    
    // 3. จัดการเรื่องรูปภาพล่าสุด (เหมือนที่ทำใน /api/users)
    const photoIds = usersData
      .filter((u) => u.photosOrder && u.photosOrder.length > 0)
      .map((u) => u.photosOrder[0]);

    let photoMap = new Map();
    if (photoIds.length > 0) {
      const { UserPhoto } = await import('../model/userPhoto.js');
      const photos = await UserPhoto.find({ _id: { $in: photoIds } }).select('_id url').lean();
      photoMap = new Map(photos.map((p) => [p._id.toString(), p.url]));
    }

    const userDataMap = new Map();
    usersData.forEach(user => {
      let finalPhotoURL = user.photoURL;
      if (user.photosOrder && user.photosOrder.length > 0) {
        const customPhoto = photoMap.get(user.photosOrder[0].toString());
        if (customPhoto) finalPhotoURL = customPhoto;
      }
      
      userDataMap.set(user.email, {
        displayName: infoMap.get(user.email) || user.displayName,
        photoURL: finalPhotoURL
      });
    });

    // 4. ประกอบร่างข้อมูล
    const enrichedRequests = requests.map((req) => {
      const latestFrom = userDataMap.get(req.from.email) || req.from;
      return {
        requestId: req.requestId,
        from: {
          email: req.from.email,
          displayName: latestFrom.displayName,
          photoURL: latestFrom.photoURL,
        },
        to: req.to,
        timestamp: req.timestamp,
        status: req.status,
        read: req.read,
      };
    });

    res.status(200).json({
      success: true,
      requests: enrichedRequests,
    });
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการดึงข้อมูลคำขอเพื่อน:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลคำขอเพื่อน',
      error: error.message,
    });
  }
});

// API สำหรับตอบรับหรือปฏิเสธคำขอเพื่อน/users/
router.post('/friend-request-response', requireOwner, async (req, res) => {
  try {
    const { requestId, userEmail, friendEmail, response, roomId } = req.body;

    if (!requestId || !userEmail || !friendEmail || !response) {
      return res.status(400).json({ success: false, message: 'ข้อมูลไม่ครบถ้วน' });
    }

    // ดึงคำขอเพื่อนจากฐานข้อมูล
    const friendRequest = await FriendRequest.findOne({ requestId });
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

    // ถ้าตอบรับ ให้เพิ่มเป็นเพื่อนในฐานข้อมูล
    if (response === 'accept') {
      // ดึงข้อมูลผู้ใช้ทั้งสองคน
      const user = await Friend.findOne({ email: userEmail });
      const friend = await Friend.findOne({ email: friendEmail });
      if (!user) {
        await Friend.addFriend(userEmail, friendEmail, roomId);
      }
      if (!friend) {
        await Friend.addFriend(friendEmail, userEmail, roomId);
      }

      // เพิ่มเพื่อนให้กับทั้งสองฝ่าย
      // ตรวจสอบว่ามีอาร์เรย์เพื่อนหรือไม่ ถ้าไม่มีให้สร้างใหม่
      if (!user.friends) user.friends = [];
      if (!friend.friends) friend.friends = [];

      // ตรวจสอบว่าเป็นเพื่อนกันอยู่แล้วหรือไม่
      const userAlreadyFriend = user.friends.some((f) => f.email === friendEmail);
      const friendAlreadyFriend = friend.friends.some((f) => f.email === userEmail);

      // เพิ่มเพื่อนให้กับผู้ใช้ถ้ายังไม่เป็นเพื่อนกัน
      if (!userAlreadyFriend) {
        user.friends.push({
          email: friendEmail,
          roomId: roomId || friendRequest.roomId,
        });
      }

      // เพิ่มเพื่อนให้กับเพื่อนถ้ายังไม่เป็นเพื่อนกัน
      if (!friendAlreadyFriend) {
        friend.friends.push({
          email: userEmail,
          roomId: roomId || friendRequest.roomId,
        });
      }

      // บันทึกข้อมูลลงฐานข้อมูล
      await user.save();
      await friend.save();

      // ส่งการแจ้งเตือนผ่าน socket server
      if (req.app.get('io')) {
        const io = req.app.get('io');
        const userSockets = req.app.get('userSockets') || {};
        const recipientSocket = userSockets[friendEmail];

        if (recipientSocket) {
          io.to(recipientSocket).emit('notify-friend-accept', { from: userEmail });
        }
      }

      res.status(200).json({
        success: true,
        message: 'ตอบรับคำขอเพื่อนสำเร็จ',
        user: {
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
        },
      });
    } else {
      res.status(200).json({ success: true, message: 'ปฏิเสธคำขอเพื่อนสำเร็จ' });
    }
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการตอบรับคำขอเพื่อน:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการตอบรับคำขอเพื่อน',
      error: error.message,
    });
  }
});

// API สำหรับดึงข้อมูลการยอมรับคำขอเพื่อนล่าสุด (สำหรับแสดง Toast)
router.get('/friend-accepts/:userEmail', requireOwner, async (req, res) => {
  try {
    const { userEmail } = req.params;

    // ดึงคำขอเพื่อนที่ถูกยอมรับล่าสุดที่ผู้ใช้เป็นผู้ส่ง
    const latestAccept = await FriendRequest.findOne({
      'from.email': userEmail,
      status: 'accepted',
    })
      .sort({ updatedAt: -1 })
      .limit(1);

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
        timestamp: latestAccept.updatedAt,
      },
    });
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการดึงข้อมูลการยอมรับคำขอเพื่อน:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลการยอมรับคำขอเพื่อน',
      error: error.message,
    });
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
    res
      .status(500)
      .json({ success: false, message: 'เกิดข้อผิดพลาดในการลบคำขอเพื่อน', error: error.message });
  }
});
router.delete('/friend-request-email/:userEmail/:friendEmail', async (req, res) => {
  const { userEmail, friendEmail } = req.params;

  try {
    // ค้นหาคำขอเพื่อนระหว่างผู้ใช้ทั้งสองก่อน
    const friendRequest = await FriendRequest.findOne({
      $or: [
        { 'from.email': userEmail, to: friendEmail },
        { 'from.email': friendEmail, to: userEmail },
      ],
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
    res
      .status(500)
      .json({ success: false, message: 'เกิดข้อผิดพลาดในการลบคำขอเพื่อน', error: error.message });
  }
});

export default router;
