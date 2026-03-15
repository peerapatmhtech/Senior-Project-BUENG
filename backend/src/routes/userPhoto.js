import express from 'express';
import { UserPhoto } from '../model/userPhoto.js';
import { Gmail } from '../model/gmail.js';
import multer from 'multer';
import admin from '../firebase/firebaseAdmin.js';

const router = express.Router();

// Using memory storage as requested
const storage = multer.memoryStorage();

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

    const email = req.user.email;
    const bucket = admin.storage().bucket(process.env.VITE_FIREBASE_STORAGE_BUCKET);

    // 1. ค้นหาและลบรูปภาพเก่า (ถ้ามี) ตามที่ผู้ใช้แจ้ง
    try {
      const oldPhoto = await UserPhoto.findOne({ email });
      if (oldPhoto && oldPhoto.storagePath) {
        const oldFile = bucket.file(oldPhoto.storagePath);
        await oldFile.delete().catch((err) => {
          console.warn('⚠️ Warning: Could not delete old file from Firebase:', err.message);
        });
        // ลบ record เก่าทิ้งเพื่อให้เป็นแบบ 1 record ต่อ email ตามนัยสำคัญที่ผู้ใช้แจ้ง
        await UserPhoto.deleteOne({ _id: oldPhoto._id });
      }
    } catch (findErr) {
      console.warn('⚠️ Warning: Error during old photo cleanup:', findErr.message);
    }

    // 2. เตรียมข้อมูลไฟล์ใหม่
    const filename = `${Date.now()}-${req.file.originalname}`;
    const storagePath = `user-photos/${email}/${filename}`;
    const blob = bucket.file(storagePath);

    // 3. เริ่มการอัปโหลดไปยัง Firebase Storage
    const blobStream = blob.createWriteStream({
      metadata: {
        contentType: req.file.mimetype,
      },
      resumable: false,
    });

    blobStream.on('error', (err) => {
      throw err;
    });

    blobStream.on('finish', async () => {
      // ทำให้ไฟล์เป็น Public
      await blob.makePublic();
      
      // ดึง Public URL
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

      // 4. บันทึกลง MongoDB
      const newPhoto = new UserPhoto({
        email,
        url: publicUrl,
        filename: filename,
        storagePath: storagePath,
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
    });

    blobStream.end(req.file.buffer);

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

    const [userPhotos, user] = await Promise.all([
      UserPhoto.find({ email }).lean(),
      Gmail.findOne({ email }).select('photosOrder').lean(),
    ]);

    if (!userPhotos || userPhotos.length === 0) {
      return res.status(204).send();
    }

    if (user?.photosOrder?.length > 0) {
      const orderMap = new Map(user.photosOrder.map((id, index) => [id.toString(), index]));
      userPhotos.sort((a, b) => {
        const idA = a._id.toString();
        const idB = b._id.toString();
        const indexA = orderMap.has(idA) ? orderMap.get(idA) : Infinity;
        const indexB = orderMap.has(idB) ? orderMap.get(idB) : Infinity;

        if (indexA === Infinity && indexB === Infinity) {
          return new Date(b.createdAt) - new Date(a.createdAt);
        }
        return indexA - indexB;
      });
    } else {
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
    const email = req.user.email;
    const { photoId } = req.params;

    const photo = await UserPhoto.findOne({ _id: photoId, email });
    if (!photo) {
      return res.status(404).json({ success: false, message: 'Photo not found or unauthorized' });
    }

    // 1. ลบจาก Firebase Storage
    if (photo.storagePath) {
      const bucket = admin.storage().bucket(process.env.VITE_FIREBASE_STORAGE_BUCKET);
      await bucket.file(photo.storagePath).delete().catch((err) => {
        console.warn('⚠️ Warning: Could not delete file from Firebase during permanent deletion:', err.message);
        // สานต่อการลบใน DB แม้ไฟล์ใน Storage จะหายไปแล้วหรือลบไม่ได้
      });
    }

    // 2. ลบจาก MongoDB
    await UserPhoto.deleteOne({ _id: photoId });

    // 3. ลบ ID ออกจาก photosOrder
    await Gmail.updateOne({ email }, { $pull: { photosOrder: photoId } });

    res.json({ success: true, message: 'Photo deleted successfully' });
  } catch (error) {
    console.error('Error deleting user photo:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/user-photos/reorder', async (req, res) => {
  try {
    const email = req.user.email;
    const { photoIds } = req.body;
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
