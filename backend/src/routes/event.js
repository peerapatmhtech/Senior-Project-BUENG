import express from "express";
import { Event } from "../model/event.js";
import { Filter } from "../model/filter.js";
import { Gmail } from "../model/gmail.js";

export default function (io) {
  const router = express.Router();

  // Save event

  router.post("/save-event", async (req, res) => {
    const { title, genre, description, link, image, email } = req.body;

    try {
      // ตรวจสอบ email
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // ตรวจสอบ required fields
      if (!title || !description || !link) {
        return res
          .status(400)
          .json({ message: "Title, description, link are required" });
      }

      // ตรวจสอบและ validate genre
      if (!genre) {
        return res.status(400).json({ message: "Genre is required" });
      }

      // ตรวจสอบว่า genre เป็น object หรือไม่
      if (typeof genre !== "object" || Array.isArray(genre)) {
        return res.status(400).json({
          message:
            "Genre must be an object with category keys and array values",
        });
      }

      // ตรวจสอบว่า genre object มีข้อมูลหรือไม่
      const genreKeys = Object.keys(genre);
      if (genreKeys.length === 0) {
        return res.status(400).json({
          message: "Genre must contain at least one category",
        });
      }

      // ตรวจสอบว่ามีข้อมูลซ้ำหรือไม่
      const existingEvent = await Event.findOne({ title: title, link: link, email: email });
      if (existingEvent) {
        return res.status(204).json({ message: "Event already created" }); // No Content;
      }

      // ตรวจสอบว่า values ใน genre เป็น array หรือไม่
      for (const key of genreKeys) {
        if (!Array.isArray(genre[key]) || genre[key].length === 0) {
          return res.status(400).json({
            message: `Genre category '${key}' must be a non-empty array`,
          });
        }
      }

      // สร้าง event ใหม่
      const newEvent = new Event({
        title,
        genre,
        description,
        link,
        image,
        createdByAI: true,
        email,
      });

      await newEvent.save();

      // แจ้งเตือนผ่าน socket
      io.emit("events_updated");

      res.status(201).json({
        message: "Event saved successfully",
        event: newEvent,
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

  // Get filter by email
  router.get("/filters/:email", async (req, res) => {
    try {
      const filter = await Filter.findOne({ email: req.params.email });
      res.json(filter || null);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Route for complex search (e.g., for make.com)
  router.post("/events/genre", async (req, res) => {
    try {
      const { subgenres, userEmail } = req.body;
      const filter = {};

      // Exclude events from the provided userEmail
      if (userEmail) {
        filter.email = { $ne: userEmail };
      }

      // Validate subgenres structure - it should be an object
      if (
        !subgenres ||
        typeof subgenres !== "object" ||
        Array.isArray(subgenres) ||
        subgenres === null
      ) {
        return res.status(400).json({
          message:
            "A 'subgenres' object with category filters is required in the request body.",
        });
      }

      const subgenresObject = subgenres; // Use subgenres directly
      const genreFilters = Object.entries(subgenresObject)
        .map(([category, subgenreList]) => {
          const trimmedCategory = category.trim();
          if (!trimmedCategory) return null;

          // If subgenres are provided, filter by them
          if (Array.isArray(subgenreList) && subgenreList.length > 0) {
            const cleanSubgenres = subgenreList
              .map((s) => String(s).trim())
              .filter((s) => s.length > 0);
            if (cleanSubgenres.length > 0) {
              return { [`genre.${trimmedCategory}`]: { $in: cleanSubgenres } };
            }
          }

          // Otherwise, match any event with the category
          return { [`genre.${trimmedCategory}`]: { $exists: true } };
        })
        .filter((f) => f !== null);

      if (genreFilters.length > 0) {
        if (genreFilters.length === 1) {
          Object.assign(filter, genreFilters[0]);
        } else {
          filter.$or = genreFilters;
        }
      } else {
        // If subgenresObject is empty (e.g., subgenres: {}), return no events
        return res.json([]);
      }

      const events = await Event.find(filter).sort({ date: 1 });

      // หา events ที่มี title หรือ link ซ้ำกับที่มีอยู่แล้ว
      const duplicateCheck = await Event.find({
        $and: [
          { _id: { $nin: events.map((e) => e._id) } }, // ไม่ใช่ตัวมันเอง
          {
            $or: [
              { title: { $in: events.map((e) => e.title) } },
              { link: { $in: events.map((e) => e.link) } },
            ],
          },
        ],
      });

      // กรองเอาเฉพาะที่ไม่ซ้ำ
      const duplicateTitles = new Set(duplicateCheck.map((e) => e.title));
      const duplicateLinks = new Set(duplicateCheck.map((e) => e.link));

      const uniqueEvents = events.filter(
        (event) =>
          !duplicateTitles.has(event.title) && !duplicateLinks.has(event.link)
      );

      if (uniqueEvents.length === 0) {
        return res.status(200).json([]);
      }

      res.status(200).json({
        message: "Unique events found",
        events: uniqueEvents,
        count: uniqueEvents.length,
      });
    } catch (error) {
      console.error("Error searching events:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  });

  // Get events with optional simple filtering
  router.get("/events/:email", async (req, res) => {
    const email = req.params;
    try {
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const events = await Event.find(email).sort({ date: 1 });

      if (!events || events.length === 0) {
        return res.status(200).json({ message: "No events found" });
      }
      if (events.length > 0) {

        return res.status(200).json(events);
      }
      io.emit("events_updated");
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  });

  //// Get All Events
  router.get("/events", async (req, res) => {
    try {
      const events = await Event.find().sort({ date: 1 });
      if (!events || events.length === 0) {
        return res.status(200).json({ message: "No events found" });
      }
      if (events.length > 0) {
        return res.status(200).json(events);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  });

  // Delete event by id
  router.delete("/events/:id", async (req, res) => {
    const { id } = req.params;
    try {
      const deleted = await Event.findByIdAndDelete(id);
      if (!deleted) {
        return res.status(404).json({ message: "Event not found" });
      }
      io.emit("events_updated");
      res.json({ message: "Event deleted", deleted });
    } catch (err) {
      console.error(`Delete failed for event ID: ${id}`, err);
      res.status(500).json({ message: "Delete failed" });
    }
  });

  // Delete all events by user
  router.delete("/events/user/:email", async (req, res) => {
    const { email } = req.params;
    try {
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      const deleted = await Event.deleteMany({ email: email });
      if (deleted.deletedCount === 0) {
        return res.status(404).json({ message: "Events not found" });
      }
      io.emit("events_updated");
      res.status(200).json({ message: "ลบกิจกรรมทั้งหมดเรียบร้อยแล้ว" });
    } catch (error) {
      res.status(500).json({ error: "เกิดข้อผิดพลาดในการลบกิจกรรม" });
    }
  });

  // Friend match
  router.get("/matches/:email", async (req, res) => {
    const { email } = req.params;
    try {
      const user = await Filter.findOne({ email });
      if (!user) return res.status(404).json({ message: "User not found" });
      const matches = await Filter.find({
        email: { $ne: email },
        genres: { $in: user.genres },
      });
      const matchEmails = matches.map((m) => m.email);
      const gmailUsers = await Gmail.find({ email: { $in: matchEmails } });
      const combinedMatches = matches.map((match) => {
        const gmailUser = gmailUsers.find((g) => g.email === match.email);
        return {
          ...match.toObject(),
          displayName: gmailUser?.displayName || "",
          photoURL: gmailUser?.photoURL || "",
        };
      });
      // Ensure results are unique by email
      const uniqueMatches = Array.from(
        new Map(combinedMatches.map((item) => [item.email, item])).values()
      );

      res.json(uniqueMatches);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  return router;
}
