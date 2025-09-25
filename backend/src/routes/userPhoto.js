import express from "express";
import { Gmail } from "../model/gmail.js";
import { UserPhoto } from "../model/userPhoto.js";
import multer from "multer";
import fs from "fs";
import path from "path";

const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(process.cwd(), "uploads", "user-photos");
    // Create the directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

// File filter to only allow image files
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("กรุณาอัปโหลดไฟล์รูปภาพเท่านั้น"), false);
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter,
});

router.post("/upload-user-photo", upload.single("photo"), async (req, res) => {
  console.log("Upload photo API called", req.file, req.body);
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "ไม่พบไฟล์รูปภาพ",
      });
    }

    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "ไม่พบอีเมลผู้ใช้",
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
      message: "อัปโหลดรูปภาพสำเร็จ",
      photo: {
        id: newPhoto._id,
        url: newPhoto.url,
        title: newPhoto.title,
        createdAt: newPhoto.createdAt,
      },
    });
  } catch (error) {
    console.error("❌ Error uploading user photo:", error);
    res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ",
    });
  }
});
router.get("/user-photos/:email", async (req, res) => {
  const { email } = req.params;
  try {
    if (!email)
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });

    const user = await UserPhoto.find({ email: req.params.email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Empty Photo this user" });
    }
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.delete("/user-photo/:photoId", async (req, res) => {
  try {
    const { email } = req.body;
    const { photoId } = req.params;

    const user = await UserPhoto.findOne({ email: email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    await UserPhoto.findByIdAndDelete(photoId);

    res.json({ success: true, message: "Photo deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post("/user-photos/reorder", async (req, res) => {
  try {
    const { email, photoIds } = req.body;
    const user = await UserPhoto.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    user.photos = photoIds;
    await user.save();
    res.json({ success: true, message: "Photo order updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
