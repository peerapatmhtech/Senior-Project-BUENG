import express from 'express';
import jwt from 'jsonwebtoken';
import { Gmail } from '../model/gmail.js';
import { sendVerificationEmail } from '../services/emailService.js';
import admin from '../firebase/firebaseAdmin.js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Multer Storage Configuration (Recycling logic from userPhoto.js)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.resolve(__dirname, '..', '..', 'uploads', 'user-photos');
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

// 📌 API สำหรับยืนยัน Token (เมื่อผู้ใช้คลิกลิงก์)
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).send('<h1>Invalid Link</h1><p>Missing verification token.</p>');
    }

    // Decode JWT
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return res
        .status(400)
        .send(
          '<h1>Invalid or Expired Link</h1><p>The verification link has expired or is invalid.</p>'
        );
    }

    const { email } = decoded;

    // 1. Update user record in MongoDB to mark as verified
    const user = await Gmail.findOneAndUpdate({ email }, { isVerified: true }, { new: true });

    if (!user) {
      return res
        .status(404)
        .send(
          '<h1>User Not Found</h1><p>The user associated with this token could not be found.</p>'
        );
    }

    // 2. Update Firebase Auth user to mark email as verified
    try {
      const firebaseUser = await admin.auth().getUserByEmail(email);
      await admin.auth().updateUser(firebaseUser.uid, {
        emailVerified: true,
      });
    } catch (fbError) {
      console.error('⚠️ Could not update Firebase emailVerified status:', fbError.message);
      // We don't necessarily want to fail the whole request if this minor update fails,
      // as long as our backend isVerified flag is set.
    }

    console.info('✅ User email verified successfully:', email);

    // Redirect กลับไปหน้า Frontend
    const frontendUrl = process.env.VITE_APP_WEB_BASE_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/login?verified=true`);
  } catch (error) {
    console.error('Error during email verification:', error);
    res.status(500).send('<h1>Server Error</h1><p>Something went wrong during verification.</p>');
  }
});

// 📌 API สำหรับขอสมัครสมาชิก (สร้าง User ใน Firebase ทันทีแบบ unverified และส่งอีเมล)
router.post('/register-request', upload.single('photo'), async (req, res) => {
  try {
    const { email, password, displayName } = req.body;

    if (!email || !password || !displayName) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }

    if (!email.endsWith('@bumail.net')) {
      return res.status(400).json({ message: 'Only @bumail.net emails are allowed.' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'กรุณาอัปโหลดรูปภาพโปรไฟล์' });
    }

    // Generate Photo URL
    const photoURL = `/uploads/user-photos/${req.file.filename}`;

    // 1. Create user in Firebase Auth (emailVerified: false)
    try {
      await admin.auth().createUser({
        email,
        password,
        displayName,
        photoURL,
        emailVerified: false,
      });
    } catch (firebaseError) {
      if (firebaseError.code === 'auth/email-already-exists') {
        return res.status(400).json({ message: 'อีเมลนี้ถูกใช้งานไปแล้ว' });
      }
      throw firebaseError;
    }

    // 2. Save user record in MongoDB (isVerified: false)
    await Gmail.findOneAndUpdate(
      { email },
      {
        displayName,
        photoURL,
        isVerified: false,
      },
      { upsert: true, new: true }
    );

    // 3. Create a JWT for verification link
    const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '1h' });

    // 4. ส่งอีเมลยืนยัน
    await sendVerificationEmail(email, token);

    res.status(200).json({ message: 'สมัครสมาชิกสำเร็จ! กรุณาตรวจสอบอีเมลของคุณเพื่อยืนยันบัญชี' });
  } catch (error) {
    console.error('Error in register-request:', error);
    res.status(500).json({
      message: 'ไม่สามารถส่งอีเมลยืนยันได้ หรือเกิดข้อผิดพลาดในการสมัคร',
      error: error.message,
    });
  }
});

// 📌 API สำหรับขอส่งอีเมลยืนยันซ้ำ (กรณีทำหาย) - ยังคงมีอยูเผื่ออนาคต
router.post('/resend-verification', (req, res) => {
  // Logic สำหรับส่งซ้ำ โดยใช้ข้อมูลที่มีอยู่ หรือรับใหม่
  res.status(501).json({ message: 'Not implemented yet.' });
});

export default router;
