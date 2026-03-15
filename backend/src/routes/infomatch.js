import express from 'express';
import { requireOwner } from '../middleware/required.js';
import { InfoMatch } from '../model/infomatch.js';
const app = express.Router();
import aiChatRoutes from './aichat.js';
// READ - ดึงข้อมูล InfoMatch ทั้งหมด

app.use('/aichat', aiChatRoutes);

app.get('/infomatch/all', async (req, res) => {
  try {
    const infoMatches = await InfoMatch.find({}).sort({ createdAt: -1 });

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

    const infoMatch = await InfoMatch.find({
      status: 'pending',
      initiatorEmail: { $ne: email },
      $or: [{ email: email }, { usermatch: email }],
    }).sort({ createdAt: -1 });
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
    }).sort({ createdAt: -1 });

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

// UPDATE - อัปเดตสถานะการข้าม (Skip)
app.patch('/infomatch/:id/skip', async (req, res) => {
  try {
    const { id } = req.params;
    const SKIP_THRESHOLD = 2; // ตั้งค่าว่าถ้า skip ถึง 2 ครั้งจะ unmatched

    const infoMatch = await InfoMatch.findById(id);

    if (!infoMatch) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบ InfoMatch ที่ระบุ',
      });
    }

    // เพิ่มค่า skipCount
    infoMatch.skipCount += 1;

    // ตรวจสอบว่าถึง threshold หรือยัง
    if (infoMatch.skipCount >= SKIP_THRESHOLD) {
      infoMatch.status = 'unmatched';
    }

    await infoMatch.save();

    res.status(200).json({
      success: true,
      message: 'อัปเดตการข้ามสำเร็จ',
      data: infoMatch,
    });
  } catch (error) {
    console.error('Error updating skip status:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการอัปเดตการข้าม',
      error: error.message,
    });
  }
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
export default app;
