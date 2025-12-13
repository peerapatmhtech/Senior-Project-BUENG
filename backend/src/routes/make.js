import express from "express";

////////-----Middleware-----/////////
import { limiter } from "../middleware/ratelimit.js";

/////////-----Model-----/////////
import { Like } from "../model/like.js"; // Import the Like model
import { InfoMatch } from "../model/infomatch.js"; // Import the InfoMatch model
import { Event } from "../model/event.js"; // Import the Event model
import { saveEventsFromSource } from "../services/eventService.js";
import { Info } from "../model/info.js";

export default function (io) {
  const app = express.Router();

  // CREATE - สร้าง InfoMatch ใหม่
  app.post("/infomatch/create", async (req, res) => {
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

  app.post("/save-event", async (req, res) => {
    try {
      const { data, email, indicesToExclude: rawIndicesToExclude, subGenres, updatedAt } = req.body;
      
      const newUserEvents = await saveEventsFromSource({
        data,
        email,
        rawIndicesToExclude,
        subGenres,
        updatedAt, // This is no longer used in the service but kept for compatibility
      });

      res.status(201).json({
        message: `Successfully saved ${newUserEvents.length} new events for the user.`,
        userEvents: newUserEvents,
      });
    } catch (error) {
      console.error("Error saving event:", error);
      if (error.name === "ValidationError") {
        return res.status(400).json({
          message: "Validation error",
          details: error.message,
        });
      }

      // Handle specific validation/business logic errors from the service
      if (
        error.message.includes("required") ||
        error.message.includes("non-empty array")
      ) {
        return res.status(400).json({ message: error.message });
      }

      res.status(500).json({
        message: "Failed to save event",
        error: process.env.NODE_ENV === "development" ? error.message : "An internal error occurred",
      });
    } finally {
      // Always emit events_updated to refresh client data
      io.emit("events_updated");
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
