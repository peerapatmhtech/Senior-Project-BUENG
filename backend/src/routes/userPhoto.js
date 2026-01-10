import express from 'express';
import { UserPhoto } from '../model/userPhoto.js';
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

    const userPhotos = await UserPhoto.find({ email: req.params.email }).sort({
      createdAt: -1,
    });
    if (!userPhotos || userPhotos.length === 0) {
      return res.status(404).json({ success: false, message: 'Empty Photo this user' });
    }
    res.json({ success: true, data: userPhotos });
  } catch (error) {
    console.error('Error fetching user photos:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});
router.get('/user-photo', async (req, res) => {
  try {
    const userPhoto = await UserPhoto.find();
    if (!userPhoto) {
      return res.status(404).json({ success: false, message: 'No photos found' });
    }
    res.json({ success: true, data: userPhoto });
  } catch (error) {
    console.error('Error fetching all user photos:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});
router.get('/user-photo/latest', async (req, res) => {
  try {
    // ใช้ Aggregation Framework เพื่อจัดกลุ่มตาม email และดึงเอกสารล่าสุดของแต่ละกลุ่ม
    const latestPhotos = await UserPhoto.aggregate([
      { $sort: { createdAt: -1 } }, // เรียงลำดับตามวันที่สร้างล่าสุด
      {
        $group: {
          _id: '$email', // จัดกลุ่มด้วย email
          latestPhoto: { $first: '$$ROOT' }, // เอาเอกสารแรก (ล่าสุด) ของแต่ละกลุ่ม
        },
      },
      { $replaceRoot: { newRoot: '$latestPhoto' } }, // ทำให้ผลลัพธ์เป็นโครงสร้างเอกสารเดิม
    ]);

    res.json({ success: true, data: latestPhotos });
  } catch (error) {
    console.error('Error fetching latest user photos:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/user-photo/:photoId', async (req, res) => {
  try {
    const { email } = req.body;
    const { photoId } = req.params;

    const user = await UserPhoto.findOne({ email: email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await UserPhoto.findByIdAndDelete(photoId);

    res.json({ success: true, message: 'Photo deleted successfully' });
  } catch (error) {
    console.error('Error deleting user photo:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/user-photos/reorder', async (req, res) => {
  try {
    const { email, photoIds } = req.body;
    const user = await UserPhoto.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    user.photos = photoIds;
    await user.save();
    res.json({ success: true, message: 'Photo order updated' });
  } catch (error) {
    console.error('Error reordering user photos:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
