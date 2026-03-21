import express from 'express';
import { requireOwner } from '../middleware/required.js';
import { InfoMatch } from '../model/infomatch.js';
import aiChatRoutes from './aichat.js';

export default function (io) {
  const app = express.Router();

  // READ - ดึงข้อมูล InfoMatch ทั้งหมด
  app.use('/aichat', aiChatRoutes);

  app.get('/infomatch/all', async (req, res) => {
    try {
      const infoMatches = await InfoMatch.find({}).sort({ chance: -1, lastMatchedAt: -1 });

      res.status(200).json({
        success: true,
        message: 'ดึงข้อมูล InfoMatch สำเร็จ',
        count: infoMatches.length,
        data: infoMatches,
      });
    } catch (error) {
      console.error('Error fetching InfoMatches:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูล InfoMatch',
        error: error.message,
      });
    }
  });

  // READ - ดึงข้อมูล InfoMatch ตาม Email
  app.get('/infomatch/:email', requireOwner, async (req, res) => {
    try {
      const email = req.user.email;

      // Use aggregation to calculate effective score considering skipCount
      const infoMatch = await InfoMatch.aggregate([
        {
          $match: {
            status: { $in: ['pending', 'matched'] },
            $or: [{ email: email }, { usermatch: email }],
            swipedBy: { $ne: email }, // Only show cards NOT swiped by current user
          },
        },
        {
          $addFields: {
            // Penalty: Reduce chance by 20% for each skipCount
            effectiveScore: {
              $multiply: ['$chance', { $subtract: [1, { $multiply: ['$skipCount', 0.2] }] }],
            },
          },
        },
        {
          $sort: {
            effectiveScore: -1,
            lastMatchedAt: -1,
          },
        },
      ]);

      if (!infoMatch || infoMatch.length === 0) {
        return res.status(200).json({
          success: false,
          message: 'ไม่พบ InfoMatch ที่ระบุ',
        });
      }
      res.status(200).json({
        success: true,
        infoCount: infoMatch.length,
        data: infoMatch,
      });
    } catch (error) {
      console.error('Error fetching InfoMatch by email:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูล InfoMatch',
        error: error.message,
      });
    }
  });

  // READ - ดึงรายการ eventId ที่ผู้ใช้เคยแมตช์แล้ว
  app.get('/infomatch/matched-events/:email', requireOwner, async (req, res) => {
    try {
      const email = req.user.email;
      const matchedInfos = await InfoMatch.find({
        $or: [{ email: email }, { usermatch: email }],
        status: 'matched',
      })
        .select('eventId')
        .lean();

      // Ensure IDs are returned as strings and filter out nulls
      const matchedEventIds = matchedInfos
        .map((info) => (info.eventId ? info.eventId.toString() : null))
        .filter(Boolean);

      res.status(200).json(matchedEventIds);
    } catch (error) {
      console.error('Error fetching matched events:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // READ - ดึงข้อมูล InfoMatch ตาม email และเพื่อน
  app.get('/infomatch/user/:email', requireOwner, async (req, res) => {
    try {
      const email = req.user.email;

      // Import Friend model
      const { default: Friend } = await import('../model/Friend.js');

      // หาเพื่อนทั้งหมดของผู้ใช้
      const friendships = await Friend.find({
        $or: [{ requester: email }, { recipient: email }],
        status: 'accepted', // เฉพาะเพื่อนที่ยอมรับแล้ว
      });

      // สร้างรายการ email ของเพื่อน
      const friendEmails = [];
      friendships.forEach((friendship) => {
        if (friendship.requester === email) {
          friendEmails.push(friendship.recipient);
        } else {
          friendEmails.push(friendship.requester);
        }
      });

      // เพิ่ม email ของผู้ใช้เองเข้าไปด้วย
      friendEmails.push(email);

      // หา InfoMatch ที่เกี่ยวข้องกับผู้ใช้และเพื่อน
      const infoMatches = await InfoMatch.find({
        $or: [{ email: { $in: friendEmails } }, { usermatch: { $in: friendEmails } }],
      }).sort({ chance: -1, lastMatchedAt: -1 });

      res.status(200).json({
        success: true,

        count: infoMatches.length,
        friendsFound: friendEmails.length - 1, // ลบตัวผู้ใช้เองออก
        friendEmails: friendEmails.filter((e) => e !== email), // แสดงเฉพาะ email เพื่อน
        data: infoMatches,
      });
    } catch (error) {
      console.error('Error fetching InfoMatches by email:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูล InfoMatch ของผู้ใช้',
        error: error.message,
      });
    }
  });

  // UPDATE - อัปเดต InfoMatch
  app.patch('/infomatch/:id/match', async (req, res) => {
    try {
      const { id } = req.params;
      // รับค่าทั้งหมดที่ส่งมาจาก body เพื่อให้อัปเดตได้ทุก field ที่มีใน model
      const updateData = req.body;

      const updatedInfoMatch = await InfoMatch.findByIdAndUpdate(
        id, // id ของ document ที่จะอัปเดต
        updateData, // ข้อมูลใหม่ที่จะอัปเดต
        { new: true, runValidators: true }
      );

      if (!updatedInfoMatch) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบ InfoMatch ที่ระบุ',
        });
      }

      res.status(200).json({
        success: true,
        message: 'อัปเดต InfoMatch สำเร็จ',
        data: updatedInfoMatch,
      });
    } catch (error) {
      console.error('Error updating InfoMatch:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการอัปเดต InfoMatch',
        error: error.message,
      });
    }
  });

  // UPDATE - อัปเดต InfoMatch (เดิม)
  app.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { info, email, roomId, chance, usermatch } = req.body;

      const updatedInfoMatch = await InfoMatch.findByIdAndUpdate(
        id,
        {
          info,
          email,
          roomId,
          chance,
          usermatch,
        },
        { new: true, runValidators: true }
      );

      if (!updatedInfoMatch) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบ InfoMatch ที่ระบุ',
        });
      }

      res.status(200).json({
        success: true,
        message: 'อัปเดต InfoMatch สำเร็จ',
        data: updatedInfoMatch,
      });
    } catch (error) {
      console.error('Error updating InfoMatch:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการอัปเดต InfoMatch',
        error: error.message,
      });
    }
  });

  // UPDATE - อัปเดต chance
  app.patch('/:id/chance', async (req, res) => {
    try {
      const { id } = req.params;
      const { chance } = req.body;

      if (typeof chance !== 'number') {
        return res.status(400).json({
          success: false,
          message: 'chance ต้องเป็นตัวเลข',
        });
      }

      const updatedInfoMatch = await InfoMatch.findByIdAndUpdate(id, { chance }, { new: true });

      if (!updatedInfoMatch) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบ InfoMatch ที่ระบุ',
        });
      }

      res.status(200).json({
        success: true,
        message: 'อัปเดต chance สำเร็จ',
        data: updatedInfoMatch,
      });
    } catch (error) {
      console.error('Error updating chance:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการอัปเดต chance',
        error: error.message,
      });
    }
  });

  // Helper function to handle mutual match notifications
  const notifyMutualMatch = (io, req, infoMatch, currentUserEmail) => {
    if (!io) return;

    const userSockets = req.app.get('userSockets') || {};
    const me = currentUserEmail.toLowerCase();
    const partner =
      me === infoMatch.email.toLowerCase()
        ? infoMatch.usermatch.toLowerCase()
        : infoMatch.email.toLowerCase();

    const notificationData = {
      type: 'mutual-match',
      eventTitle: infoMatch.detail,
      from: me,
      partner: partner,
      matchId: infoMatch._id,
    };

    // Notify the other user
    const recipientSocket = userSockets[partner];
    if (recipientSocket) {
      io.to(recipientSocket).emit('notify-match', notificationData);
    }

    // Also notify the current user (the one who closed the loop)
    const mySocket = userSockets[me];
    if (mySocket) {
      io.to(mySocket).emit('notify-match', notificationData);
    }

    // Trigger global refresh for match lists
    io.emit('match_updated');
  };

  // INTERACTION - New unified interaction endpoint (Like/Skip)
  app.post('/infomatch/:id/interaction', requireOwner, async (req, res) => {
    try {
      const { id } = req.params;
      const { action } = req.body; // 'like' or 'skip'
      const email = req.user.email;
      const SKIP_THRESHOLD = 2;

      let updateQuery = {};
      if (action === 'skip') {
        updateQuery = {
          $inc: { skipCount: 1 },
          $addToSet: { swipedBy: email },
        };
      } else if (action === 'like') {
        updateQuery = {
          $addToSet: {
            likedBy: email,
            swipedBy: email,
          },
        };
      } else {
        return res.status(400).json({ success: false, message: 'การดำเนินการไม่ถูกต้อง' });
      }

      // 1. ปฏิบัติการอะตอมมิกขั้นแรก (Atomic Array/Count Update)
      let infoMatch = await InfoMatch.findByIdAndUpdate(id, updateQuery, { new: true });

      if (!infoMatch) {
        return res.status(404).json({ success: false, message: 'ไม่พบข้อมูล Match ที่ระบุ' });
      }

      // 2. จัดการสถานะและแจ้งเตือนตามเงื่อนไข
      if (action === 'skip') {
        // หากเกิน threshold ให้เปลี่ยนสถานะเป็น unmatched
        if (infoMatch.skipCount >= SKIP_THRESHOLD && infoMatch.status === 'pending') {
          infoMatch = await InfoMatch.findByIdAndUpdate(
            id,
            { $set: { status: 'unmatched' } },
            { new: true }
          );
        }
      } else if (action === 'like') {
        // ตรวจสอบว่าใจตรงกันหรือไม่ (Mutual Match)
        const isMutual =
          infoMatch.likedBy.includes(infoMatch.email) &&
          infoMatch.likedBy.includes(infoMatch.usermatch);

        if (isMutual && infoMatch.status === 'pending') {
          // อัปเดตสถานะเป็น matched แบบ atomic เฉพาะตอนที่เป็น pending อยู่
          const matchedInfo = await InfoMatch.findOneAndUpdate(
            { _id: id, status: 'pending' },
            { $set: { status: 'matched' } },
            { new: true }
          );

          if (matchedInfo) {
            infoMatch = matchedInfo;
            notifyMutualMatch(io, req, infoMatch, email);
          } else {
            // หาก process อื่นอัปเดตไปแล้ว ให้ดึงค่าปัจจุบัน
            infoMatch = await InfoMatch.findById(id);
          }
        }
      }

      res.status(200).json({
        success: true,
        data: infoMatch,
      });
    } catch (error) {
      console.error('Error handling interaction:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // UPDATE - อัปเดตสถานะการข้าม (Skip) - Deprecated, kept for compatibility if needed
  app.patch('/infomatch/:id/skip', async (req, res) => {
    // ... (keep current implementation or redirect to interaction)
  });

  // DELETE - ลบ InfoMatch ทั้งหมดของผู้ใช้
  app.delete('/user/:email', requireOwner, async (req, res) => {
    try {
      const email = req.user.email;

      const result = await InfoMatch.deleteMany({ email });

      res.status(200).json({
        success: true,
        message: `ลบ InfoMatch ของผู้ใช้ ${email} สำเร็จ`,
        deletedCount: result.deletedCount,
      });
    } catch (error) {
      console.error('Error deleting user InfoMatches:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการลบ InfoMatch ของผู้ใช้',
        error: error.message,
      });
    }
  });

  app.delete('/infomatch', async (req, res) => {
    try {
      const deletedInfoMatch = await InfoMatch.deleteMany({});

      if (!deletedInfoMatch) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบ InfoMatch ที่ระบุ',
        });
      }

      res.status(200).json({
        success: true,
        message: 'ลบ InfoMatch สำเร็จ',
        data: deletedInfoMatch,
      });
    } catch (error) {
      console.error('Error deleting InfoMatch:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการลบ InfoMatch',
        error: error.message,
      });
    }
  });
  return app;
}
