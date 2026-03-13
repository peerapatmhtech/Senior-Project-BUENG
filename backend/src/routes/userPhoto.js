import express from 'express';
import { UserPhoto } from '../model/userPhoto.js';
import { Gmail } from '../model/gmail.js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.resolve(__dirname, '..', '..', '..', 'uploads', 'user-photos');
    // Create the directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  },
});

// File filter to only allow image files
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('กรุณาอัปโหลดไฟล์รูปภาพเท่านั้น'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter,
});

router.post('/upload-user-photo', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'ไม่พบไฟล์รูปภาพ',
      });
    }

    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'ไม่พบอีเมลผู้ใช้',
      });
    }

    // Create a URL for the uploaded file
    const fileUrl = `/uploads/user-photos/${req.file.filename}`;

    // Create a new user photo record
    const newPhoto = new UserPhoto({
      email,
      url: fileUrl,
      filename: req.file.filename,
      title: req.body.title || `รูปภาพ ${Date.now()}`,
    });

    await newPhoto.save();

    res.status(201).json({
      success: true,
      message: 'อัปโหลดรูปภาพสำเร็จ',
      photo: {
        id: newPhoto._id,
        url: newPhoto.url,
        title: newPhoto.title,
        createdAt: newPhoto.createdAt,
      },
    });
  } catch (error) {
    console.error('❌ Error uploading user photo:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ',
    });
  }
});
router.get('/user-photos/:email', async (req, res) => {
  const { email } = req.params;
  try {
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    // 1. ดึงรูปภาพและข้อมูล User (เพื่อเอาลำดับ) พร้อมกัน (Parallel Execution)
    // ใช้ .lean() เพื่อลด overhead ของ Mongoose Document
    const [userPhotos, user] = await Promise.all([
      UserPhoto.find({ email }).lean(),
      Gmail.findOne({ email }).select('photosOrder').lean(),
    ]);

    if (!userPhotos || userPhotos.length === 0) {
      return res.status(204).send(); // No Content — user has no photos yet
    }

    // 2. เรียงลำดับรูปภาพตาม photosOrder
    if (user?.photosOrder?.length > 0) {
      const orderMap = new Map(user.photosOrder.map((id, index) => [id.toString(), index]));
      userPhotos.sort((a, b) => {
        const idA = a._id.toString();
        const idB = b._id.toString();
        const indexA = orderMap.has(idA) ? orderMap.get(idA) : Infinity;
        const indexB = orderMap.has(idB) ? orderMap.get(idB) : Infinity;

        // ถ้าทั้งคู่ไม่อยู่ในรายการจัดลำดับ ให้เรียงตามเวลาล่าสุด (Newest first)
        if (indexA === Infinity && indexB === Infinity) {
          return new Date(b.createdAt) - new Date(a.createdAt);
        }
        return indexA - indexB;
      });
    } else {
      // ถ้าไม่มีการจัดลำดับ ให้เรียงตามเวลาล่าสุด
      userPhotos.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    res.json({ success: true, data: userPhotos });
  } catch (error) {
    console.error('Error fetching user photos:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});
router.get('/user-photo', async (req, res) => {
  try {
    const userPhoto = await UserPhoto.find().lean();
    if (!userPhoto) {
      return res.status(404).json({ success: false, message: 'No photos found' });
    }
    res.json({ success: true, data: userPhoto });
  } catch (error) {
    console.error('Error fetching all user photos:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/user-photo/:photoId', async (req, res) => {
  try {
    const { email } = req.body;
    const { photoId } = req.params;

    // ใช้ findOneAndDelete พร้อมเช็ค email เพื่อความปลอดภัย (Ownership check)
    const deletedPhoto = await UserPhoto.findOneAndDelete({ _id: photoId, email });

    if (!deletedPhoto) {
      return res.status(404).json({ success: false, message: 'Photo not found or unauthorized' });
    }

    // ลบ ID ออกจาก photosOrder ใน Gmail Model ด้วย (ถ้ามี)
    await Gmail.updateOne({ email }, { $pull: { photosOrder: photoId } });

    res.json({ success: true, message: 'Photo deleted successfully' });
  } catch (error) {
    console.error('Error deleting user photo:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/user-photos/reorder', async (req, res) => {
  try {
    const { email, photoIds } = req.body;
    // ใช้ updateOne เพื่อประสิทธิภาพที่ดีกว่า findOne + save
    const result = await Gmail.updateOne({ email }, { photosOrder: photoIds });

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, message: 'Photo order updated' });
  } catch (error) {
    console.error('Error reordering user photos:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
