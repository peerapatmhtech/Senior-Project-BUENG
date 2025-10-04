import express from "express";

////////-----Middleware-----/////////
import { limiter } from "../middleware/ratelimit.js";

/////////-----Model-----/////////
import { Like } from "../model/like.js"; // Import the Like model
import { InfoMatch } from "../model/infomatch.js"; // Import the InfoMatch model
import { Event } from "../model/event.js"; // Import the Event model
import { Info } from "../model/info.js";

export default function (io) {
  const app = express.Router();

  // CREATE - สร้าง InfoMatch ใหม่
  app.post("/infomatch/create", limiter, async (req, res) => {
    try {
      // const { detail, email, chance, usermatch, emailjoined, usermatchjoined } = req.body;
      const { data, email } = req.body;
      // ตรวจสอบข้อมูลที่จำเป็น
      if (!email) {
        return res.status(400).json({
          success: false,
          message: "กรุณากรอกข้อมูลที่จำเป็น",
        });
      }
      if (!data || !Array.isArray(data) || data.length === 0) {
        return res.status(400).json({
          success: false,
          message: "ข้อมูลไม่ถูกต้องหรือว่างเปล่า",
        });
      }
      const newMatch = [];
      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        const {
          detail,
          chance,
          usermatch,
          emailjoined = false,
          usermatchjoined = false,
        } = item;

        if (!detail || !email || !usermatch) {
          continue; // ข้ามรายการนี้ไป
        }
        const existingMatch = await InfoMatch.findOne({
          detail,
          email,
          usermatch,
        });
        const existingMatchFriend = await InfoMatch.findOne({
          detail,
          email: usermatch,
          usermatch: email,
        });     
        const isSameUser = email === usermatch;
        if (isSameUser) {
          continue; // ข้ามรายการนี้ไป
        }
        if (existingMatch) {    
          continue; // ข้ามรายการนี้ไป
        }
        if (existingMatchFriend) {
          continue; // ข้ามรายการนี้ไป
        }
        const newInfoMatch = new InfoMatch({
          detail,
          email,
          emailjoined,
          usermatchjoined,
          chance,
          usermatch,
        });
        await newInfoMatch.save();
        newMatch.push(newInfoMatch);
      }
      if (newMatch.length === 0) {
        return res.status(400).json({
          success: false,
          message: "ไม่พบข้อมูลที่จำเป็น",
        });
      }

      io.emit("match_updated");

      if (!newMatch) {
        return res.status(404).json({
          success: false,
          message: "ไม่สามารถสร้าง InfoMatch ได้",
        });
      }

      res.status(201).json({
        success: true,
        message: "สร้าง InfoMatch สำเร็จ",
        data: newMatch,
      });
    } catch (error) {
      console.error("Error creating InfoMatch:", error);
      res.status(500).json({
        success: false,
        message: "เกิดข้อผิดพลาดในการสร้าง InfoMatch",
        error: error.message,
      });
    }
  });
  app.post("/save-event", limiter, async (req, res) => {
    const {
      data,
      email,
      indicesToExclude: rawIndicesToExclude,
      subGenres,
      updatedAt,
    } = req.body;
    let indicesToExclude = [];
    if (
      Array.isArray(rawIndicesToExclude) &&
      rawIndicesToExclude.length === 0
    ) {
      indicesToExclude = [];
    }
    if (typeof rawIndicesToExclude === "string") {
      indicesToExclude = rawIndicesToExclude
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s !== "")
        .map(Number); // Convert to number
    } else if (Array.isArray(rawIndicesToExclude)) {
      indicesToExclude = rawIndicesToExclude
        .map((s) => String(s).trim()) // Ensure it's a string before trimming
        .filter((s) => s !== "")
        .map(Number); // Convert to number
    }

    // Filter out NaN values and get unique numbers
    indicesToExclude = [...new Set(indicesToExclude.filter((n) => !isNaN(n)))];

    try {
      // ตรวจสอบ email
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // ตรวจสอบ updatedAt
      if (!updatedAt || String(updatedAt).trim() === "") {
        return res.status(400).json({ message: "updatedAt is required" });
      }

      // ตรวจสอบ subGenres ว่ามีข้อมูลหรือไม่
      if (!subGenres || Object.keys(subGenres).length === 0) {
        return res.status(400).json({ message: "subGenres is required" });
      }

      // ตรวจสอบว่า data เป็น array ที่มีข้อมูลหรือไม่
      if (!Array.isArray(data) || data.length === 0) {
        return res
          .status(400)
          .json({ message: "Data must be a non-empty array" });
      }

      const newEvents = [];
      for (let i = 0; i < data.length; i++) {
        const item = data[i];

        // ตรวจสอบว่า index นี้ควรถูกยกเว้นหรือไม่
        if (indicesToExclude.includes(i)) {
          continue; // ข้ามรายการนี้ไป
        }

        const { title, link, snippet, pagemap } = item;

        // ข้ามถ้าไม่มีข้อมูลสำคัญ
        if (!title || !link) {
          continue;
        }

        // ตรวจสอบว่ามีข้อมูลซ้ำหรือไม่
        const existingEvent = await Event.findOne({ title, link, email });
        if (existingEvent) {
          continue; // ข้ามไปรายการถัดไปถ้ามี event นี้อยู่แล้ว
        }

        // ดึง URL รูปภาพออกมาอย่างปลอดภัย
        const image =
          pagemap?.cse_thumbnail?.[0]?.src ||
          pagemap?.cse_image?.[0]?.src ||
          null;

        // สร้าง event ใหม่
        const newEvent = new Event({
          title,
          description: snippet, // แมพ snippet ไปที่ description
          link,
          genre: subGenres,
          updatedAt,
          image,
          createdByAI: true,
          email,
        });

        await newEvent.save();
        newEvents.push(newEvent);
      }

      // แจ้งเตือนผ่าน socket ถ้ามีการสร้าง event ใหม่อย่างน้อยหนึ่งรายการ
      if (newEvents.length > 0) {
        io.emit("events_updated");
      }

      res.status(201).json({
        message: `Successfully saved ${newEvents.length} new events.`,
        events: newEvents,
      });
    } catch (error) {
      console.error("Error saving event:", error);

      // จัดการ validation errors ของ Mongoose
      if (error.name === "ValidationError") {
        return res.status(400).json({
          message: "Validation error",
          details: error.message,
        });
      }

      res.status(500).json({
        message: "Failed to save event",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  });
  // GET /likes/exclude/:email
  app.get("/likes/exclude/:email", async (req, res) => {
    const { email } = req.params;
    try {
      const likes = await Like.find({ userEmail: { $ne: email } });
      res.json(likes);
    } catch (err) {
      res
        .status(500)
        .json({ message: "Error fetching likes", error: err.message });
    }
  });
  // ดึงข้อมูลผู้ใช้ทุกคน ยกเว้นอีเมลที่รับมาจาก params
  app.get("/user-info-except/:email", async (req, res) => {
    const { email } = req.params;
    try {
      if (!email) {
        return res.status(400).json({ message: "Email is required." });
      }
      const users = await Info.find({ email: { $ne: email } });
      res.status(200).json({
        users: users.map((user) => ({ email: user.email, ...user.userInfo })),
      });
    } catch (error) {
      console.error("❌ Error fetching users:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  return app;
}
