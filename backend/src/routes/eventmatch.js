import express from "express";
import { EventMatch } from "../model/eventmatch.js";
import { Like } from "../model/like.js";
import { InfoMatch } from "../model/infomatch.js";
const router = express.Router();

router.post("/events/match", async (req, res) => {
  const { email, action } = req.body;

  try {
    // Find likes from other users
    const otherUserLikes = await Like.find({ userEmail: { $ne: email } });

    if (!otherUserLikes || otherUserLikes.length === 0) {
      return res.status(404).json({ message: "No likes found from other users" });
    }

    const currentUserEventTitles = action.eventsTitle;
    console.log(currentUserEventTitles);

    const matchedLikes = [];

    // Loop through other users' likes and find matches
    for (const like of otherUserLikes) {
      if (currentUserEventTitles.includes(like.eventTitle)) {
        matchedLikes.push(like);
      }
    } 
    console.log(matchedLikes);

    if (matchedLikes.length === 0) {
      return res.status(404).json({ message: "No matching events found" });
    }

    for (const like of matchedLikes) {
      const newInfoMatch = new InfoMatch({
        detail: like.eventTitle,
        usermatchjoined: false,
        emailjoined: false,
        email: req.body.email,
        chance: 40,
        usermatch: like.userEmail,
      });
      await newInfoMatch.save();
    }

    res.status(200).json({ message: "Matching events found", matchedLikes });
  } catch (error) {
    console.error("Error matching events:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/events-match/:email", async (req, res) => {
  try {
    const events = await EventMatch.find({ email: req.params.email }); // เรียงตามวันที่
    res.json(events);
  } catch (error) {
    console.error("❌ Error fetching events:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router.delete("/events-match", async (req, res) => {
  try {
    await EventMatch.deleteMany({}); // ลบทุกเอกสารใน collection
    res.status(200).json({ message: "ลบกิจกรรมทั้งหมดเรียบร้อยแล้ว" });
  } catch (error) {
    console.error("❌ Error deleting events:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ลบ event match เฉพาะห้องที่ระบุ
router.delete("/delete-event-match/:roomId", async (req, res) => {
  try {
    const { roomId } = req.params;
    const result = await EventMatch.deleteOne({ roomId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Event match not found" });
    }
    res.status(200).json({ message: "ลบ event match เรียบร้อยแล้ว" });
  } catch (error) {
    console.error("❌ Error deleting event match:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router.delete("/delete-event-match-all", async (req, res) => {
  try {
    await EventMatch.deleteMany({});
    res.status(200).json({ message: "ลบ event match ทั้งหมดเรียบร้อยแล้ว" });
  } catch (error) {
    console.error("❌ Error deleting event match:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
