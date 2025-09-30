import express from "express";
import { Gmail } from "../model/gmail.js";
const app = express.Router();

// 📌 4️⃣ API ดึงผู้ใช้ทั้งหมด (สำหรับแสดง Friend List)
app.get("/users", async (req, res) => {
  try {
    const users = await Gmail.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "ไม่สามารถโหลดผู้ใช้ได้" });
  }
});

app.get("/users/:email", async (req, res) => {
  try {
    if (!req.params.email) {
      return res.status(400).json({ error: "Email is required" });
    }
    const user = await Gmail.findOne({ email: req.params.email });
    if (!user) {
      return res.status(404).json({ error: "ไม่พบผู้ใช้" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "ไม่สามารถโหลดผู้ใช้ได้" });
  }
});



// สำหรับดึงข้อมูลเพื่อน (usersfriends)
app.get("/usersfriends", async (req, res) => {
  try {
    const email = JSON.parse(decodeURIComponent(req.query.emails));
    const users = await Gmail.find({ email: { $in: email } });
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});

export default app;
