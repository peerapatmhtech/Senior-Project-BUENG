// ✅ Import libraries และตั้งค่าเบื้องต้น
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import userRoutes from './src/routes/gmail.js';
import friendRoutes from './src/routes/friend.js';
import roomRoutes from './src/routes/room.js';
import infoRoutes from './src/routes/info.js';
import eventRoutes from './src/routes/event.js';
import likeRoutes from './src/routes/like.js'; // Routes from "./routes/like.js";
import roommatchRoutes from './src/routes/eventmatch.js'; // Routes from "./routes/room.js";
import mongoose from 'mongoose';
import { Filter } from './src/model/filter.js';
import { Event } from './src/model/event.js';
import { InfoMatch } from './src/model/infomatch.js';
import axios from 'axios';

// Import new routes (ES Modules style)
import friendRequestRoutes from './src/routes/friendRequest.js';
import aiRoute from './src/routes/ai.js';
import friendApiRoutes from './src/routes/friendApi.js';
import userPhotoRoutes from './src/routes/userPhoto.js';
import MakeRoutes from './src/routes/make.js';
import infoMatchRoutes from './src/routes/infomatch.js'; // Import info match routes
import { authMiddleware } from './src/middleware/authMiddleware.js';
import { saveEventsFromSource } from './src/services/eventService.js';

/////////Midleware for owner and admin/////////
import { limiter } from './src/middleware/ratelimit.js'; // Strings must use singlequote.
import { Gmail } from './src/model/gmail.js';

dotenv.config();
const allowedOrigins = process.env.VITE_APP_WEB_BASE_URL;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

const port = process.env.PORT || 8080;
const MONGO_URI = process.env.MONGO_URI;
const MAKE_WEBHOOK_URL = process.env.MAKE_WEBHOOK_URL;

// ✅ Middleware
// app.use(
//   helmet({
//     crossOriginResourcePolicy: { policy: "cross-origin" },
//     crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
//     contentSecurityPolicy: {
//       directives: {
//         defaultSrc: ["'self'"],
//         imgSrc: ["'self'", "data:", "https:", "blob:"],
//         scriptSrc: ["'self'", "'unsafe-inline'"],
//         styleSrc: ["'self'", "'unsafe-inline'"],
//         connectSrc: ["'self'", ...allowedOrigins],
//       },
//     },
//   })
// );
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(bodyParser.json());

////////Protection Doss and DDos Attack////////
// app.use(
//   rateLimit({
//     windowMs: 1 * 60 * 1000, // 1 minutes
//     max: 500, // limit each IP to 100 requests per windowMs
//     skip: (req, res) => req.method === "GET",
//   })
// );

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ✅ Connect MongoDB
mongoose.connect(MONGO_URI);
const db = mongoose.connection;
db.once('open', () => console.info('🔥 MongoDB Connected'));
db.on('error', (err) => console.error('❌ MongoDB Error:', err));

const onlineUsers = new Map(); // email => Set of socket IDs
const userDetails = new Map(); // email => {displayName, photoURL, email}
const lastSeenTimes = new Map(); // email => timestamp ล่าสุดที่เห็นผู้ใช้
const userSockets = {}; // email => socket.id (เก็บ socket ID ล่าสุดของแต่ละ user)

// ฟังก์ชันส่งสถานะปัจจุบันให้ทุก client
const broadcastUserStatus = () => {
  // ส่งข้อมูลแบบมีโครงสร้างชัดเจน
  const onlineUsersEmails = Array.from(onlineUsers.keys());
  const lastSeenObj = {};

  // แปลง Map เป็น object ธรรมดา
  lastSeenTimes.forEach((timestamp, email) => {
    lastSeenObj[email] = timestamp;
  });

  io.emit('update-users', {
    onlineUsers: onlineUsersEmails,
    lastSeenTimes: lastSeenObj,
  });
};

io.on('connection', (socket) => {
  socket.on('user-online', (user) => {
    const { email, displayName, photoURL } = user;
    if (!email) return;

    socket.email = email;

    // เก็บข้อมูลผู้ใช้
    userDetails.set(email, { displayName, photoURL, email });

    // เพิ่ม socket.id เข้าไปใน Set
    if (!onlineUsers.has(email)) {
      onlineUsers.set(email, new Set());
    }
    onlineUsers.get(email).add(socket.id);

    // เก็บ socket ID ล่าสุดของผู้ใช้สำหรับการส่งการแจ้งเตือนส่วนตัว
    userSockets[email] = socket.id;

    // ลบเวลาออฟไลน์ล่าสุด (เพราะตอนนี้ออนไลน์แล้ว)
    lastSeenTimes.delete(email);

    // แจ้งเตือนทุกคนว่ามีคนออนไลน์
    broadcastUserStatus();

    // ส่งเฉพาะข้อมูลผู้ใช้นี้ว่าออนไลน์
    io.emit('user-online', {
      email,
      displayName,
      photoURL,
      isOnline: true,
    });
  });

  socket.on('user-ping', (userData) => {
    // อัปเดตเวลาล่าสุดที่เห็นผู้ใช้
    if (userData && userData.email) {
      const { email, displayName, photoURL } = userData;
      if (onlineUsers.has(email)) {
        // ผู้ใช้ยังออนไลน์อยู่ ไม่ต้องทำอะไร
      } else {
        // ถ้าไม่มี socket id ของผู้ใช้ ให้เพิ่มเข้ามาใหม่
        onlineUsers.set(email, new Set([socket.id]));
        socket.email = email;

        // เก็บข้อมูลผู้ใช้
        if (displayName && photoURL) {
          userDetails.set(email, { displayName, photoURL, email });
        }

        // ลบเวลาออฟไลน์ล่าสุด (เพราะตอนนี้ออนไลน์แล้ว)
        lastSeenTimes.delete(email);

        // แจ้งเตือนทุกคน
        broadcastUserStatus();
      }
    }
  });

  socket.on('user-offline', (userData) => {
    if (userData && userData.email) {
      const { email } = userData;
      if (email && onlineUsers.has(email)) {
        onlineUsers.get(email).delete(socket.id);
        if (onlineUsers.get(email).size === 0) {
          onlineUsers.delete(email);
          // บันทึกเวลาล่าสุดที่ออฟไลน์
          const timestamp = new Date().toISOString();
          lastSeenTimes.set(email, timestamp);

          // ส่งข้อมูลว่าผู้ใช้ออฟไลน์พร้อมเวลาล่าสุด
          io.emit('user-offline', {
            email,
            isOnline: false,
            lastSeen: timestamp,
            displayName: userDetails.get(email)?.displayName,
            photoURL: userDetails.get(email)?.photoURL,
          });
        }
      }

      // ส่ง user list ไปให้ทุก client
      broadcastUserStatus();
    }
  });

  socket.on('disconnect', () => {
    const email = socket.email;
    if (email && onlineUsers.has(email)) {
      onlineUsers.get(email).delete(socket.id);
      if (onlineUsers.get(email).size === 0) {
        onlineUsers.delete(email); // ไม่มี socket เหลือแล้ว
        // บันทึกเวลาล่าสุดที่ออฟไลน์
        const timestamp = new Date().toISOString();
        lastSeenTimes.set(email, timestamp);

        // ส่งข้อมูลว่าผู้ใช้ออฟไลน์พร้อมเวลาล่าสุด
        io.emit('user-offline', {
          email,
          isOnline: false,
          lastSeen: timestamp,
          displayName: userDetails.get(email)?.displayName,
          photoURL: userDetails.get(email)?.photoURL,
        });
      }
    }

    // ส่ง user list ไปให้ทุก client
    broadcastUserStatus();
  });
});
// 📌 API บันทึกหมวดหมู่เพลงที่ผู้ใช้เลือก
app.post(
  '/api/update-genres',
  limiter, // ใช้ rate limiter เพื่อลดความเสี่ยงจาก DDoS
  async (req, res) => {
    const { email, genres, subGenres, updatedAt } = req.body;
    if (!email || !genres || !subGenres) {
      return res.status(400).json({ message: 'Missing email, genres, or subGenres' });
    }
    const emailValid = await Gmail.findOne({ email });

    if (!emailValid) {
      return res.status(404).json({ message: 'User not found' });
    }

    try {
      /////////////Find user and update genres and subgenres////////////
      const user = await Filter.findOneAndUpdate(
        { email },
        { genres, subGenres: subGenres || {} },
        { new: true, upsert: true } // เพิ่ม upsert เผื่อ user ยังไม่มีใน Filter
      );

      const filter = {};

      ////////////Filter out events from the provided userEmail////////
      // Exclude events created by the current user
      if (user.email) {
        filter.email = { $ne: user.email };
      }

      // Validate subgenres structure - it should be an object
      if (
        !user.subGenres ||
        (typeof user.subGenres !== 'object' && !(user.subGenres instanceof Map)) ||
        user.subGenres === null
      ) {
        return res.status(400).json({
          message: 'A \'subgenres\' object with category filters is required in the request body.',
        });
      }

      // Handle both Map (from Mongoose) and Object (potential raw data)
      const subgenresEntries =
        user.subGenres instanceof Map
          ? Array.from(user.subGenres.entries())
          : Object.entries(user.subGenres);

      // Find events that the user has already matched to exclude them
      const matchedInfos = await InfoMatch.find({
        $or: [{ email: user.email }, { usermatch: user.email }],
      }).select('eventId');
      const matchedEventIds = matchedInfos.map((info) => info.eventId);

      const allFoundEvents = [];
      const missingSubGenres = {};

      // Iterate through each filter to check if events exist
      // OPTIMIZATION: Use Promise.all to query all categories in parallel
      const searchPromises = subgenresEntries.map(async ([category, subgenreList]) => {
        const trimmedCategory = category.trim();
        if (!trimmedCategory) return null;

        const query = {
          email: { $ne: user.email }, // Exclude own events
          _id: { $nin: matchedEventIds }, // Exclude matched events
        };

        // Build specific query for this category
        if (Array.isArray(subgenreList) && subgenreList.length > 0) {
          const cleanSubgenres = subgenreList
            .map((s) => String(s).trim())
            .filter((s) => s.length > 0);

          if (cleanSubgenres.length > 0) {
            query[`genre.${trimmedCategory}`] = { $in: cleanSubgenres };
          } else {
            query[`genre.${trimmedCategory}`] = { $exists: true };
          }
        } else {
          query[`genre.${trimmedCategory}`] = { $exists: true };
        }

        // Search for events matching this specific filter
        const events = await Event.find(query)
          .sort({ date: 1 })
          .limit(50) // Limit per category to avoid overload
          .lean();

        return { category, subgenreList, events };
      });

      const results = await Promise.all(searchPromises);

      results.forEach((result) => {
        if (!result) return;
        if (result.events.length > 0) {
          allFoundEvents.push(...result.events);
        } else {
          // If no events found for this filter, add to missing list
          missingSubGenres[result.category] = result.subgenreList;
        }
      });

      // Deduplicate found events by _id
      const uniqueFoundEventsMap = new Map();
      allFoundEvents.forEach((e) => uniqueFoundEventsMap.set(e._id.toString(), e));
      const uniqueFoundEvents = Array.from(uniqueFoundEventsMap.values());

      // Filter out duplicates based on Title or Link (Global check)
      let finalEvents = [];
      if (uniqueFoundEvents.length > 0) {
        const duplicateCheck = await Event.find({
          $and: [
            { _id: { $nin: uniqueFoundEvents.map((e) => e._id) } }, // ไม่ใช่ตัวมันเอง
            {
              $or: [
                { title: { $in: uniqueFoundEvents.map((e) => e.title) } },
                { link: { $in: uniqueFoundEvents.map((e) => e.link) } },
              ],
            },
          ],
        })
          .select('title link')
          .lean();

        const duplicateTitles = new Set(duplicateCheck.map((e) => e.title));
        const duplicateLinks = new Set(duplicateCheck.map((e) => e.link));

        finalEvents = uniqueFoundEvents.filter(
          (e) => !duplicateTitles.has(e.title) && !duplicateLinks.has(e.link)
        );
      }

      // Trigger a webhook to an external service like Make.com if there are missing filters
      if (Object.keys(missingSubGenres).length > 0) {
        // ✅ OPTIMIZATION: Send each missing subgenre as a separate webhook request
        // ส่งแยกทีละ subgenre เพื่อให้ Make.com ได้รับข้อมูลทีละอัน (ตาม requirement "ส่งอันเดียวเท่านั้นต่อ request")
        const webhookPromises = [];

        for (const [category, subList] of Object.entries(missingSubGenres)) {
          // Ensure subList is an array and limit to 5 to prevent spamming
          const items = Array.isArray(subList) ? subList : [subList];
          const limitedItems = items.slice(0, 5);

          for (const item of limitedItems) {
            const subGenreStr = String(item).trim();
            if (!subGenreStr) continue;

            webhookPromises.push(
              (async () => {
                try {
                  await axios.post(MAKE_WEBHOOK_URL, {
                    type: 'update-genres',
                    filter_info: {
                      email: user.email,
                      genres: user.genres,
                      subGenres: { [category]: [subGenreStr] }, // ส่งไปแค่ 1 subgenre ใน array
                      updatedAt: updatedAt || new Date().toISOString(),
                    },
                  });
                } catch (webhookError) {
                  console.error(
                    `⚠️ Webhook failed for category '${category}' item '${subGenreStr}' but continuing:`,
                    webhookError.message
                  );
                }
              })()
            );
          }
        }

        await Promise.all(webhookPromises);
      }

      // Prepare the found unique events to be saved for the user
      if (finalEvents.length > 0) {
        const data = finalEvents.map((e) => ({
          title: e.title,
          snippet: e.description,
          link: e.link,
          image: e.image,
          date: e.date,
          address: e.address,
          thumbnail: e.thumbnail,
          venue: e.venue,
          ticket_info: e.ticket_info,
          event_location_map: e.event_location_map,
        }));

        // Automatically save the recommended events for the user by calling the service
        await saveEventsFromSource({
          data,
          email,
          subGenres,
          updatedAt, // This is no longer used in the service but kept for compatibility
        });
      }

      // Return the unique events to the frontend
      res.json(finalEvents);
    } catch (error) {
      console.error('Update failed:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// เก็บ socket instance ไว้ใช้ใน middleware
app.set('io', io);
app.set('userSockets', userSockets);

// ใช้งานเส้นทาง debug เพื่อตรวจสอบ API routes ทั้งหมด
app.get('/api/debug/routes', (req, res) => {
  const routes = [];
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      // Routes registered directly on the app
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods),
      });
    } else if (middleware.name === 'router') {
      // Router middleware
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          routes.push({
            path: '/api' + handler.route.path,
            methods: Object.keys(handler.route.methods),
          });
        }
      });
    }
  });
  res.json(routes);
});

// ใช้งาน routes ที่แยกไว้
app.use('/api', MakeRoutes(io));
// ใช้ authMiddleware กับทุก request ที่เข้ามาที่ /api
app.use('/api', authMiddleware);

// userPhotoRoutes must come before express.json() to handle multipart/form-data
app.use('/api', userPhotoRoutes);

// All routes after this will have their body parsed as JSON
app.use(express.json({ limit: '5mb' }));

// Register friendRequestRoutes with high priority to prevent 404 issues.
app.use('/api', infoMatchRoutes);
app.use('/api', aiRoute); // ใช้ aiRoute ก่อน routes อื่นๆ เพื่อป้องกัน 404
app.use('/api', eventRoutes(io));
app.use('/api', friendRequestRoutes);
app.use('/api', userRoutes);
app.use('/api', friendRoutes);
app.use('/api', roomRoutes);
app.use('/api', infoRoutes);
app.use('/api', likeRoutes);
app.use('/api', roommatchRoutes(io)); // Correctly call roommatchRoutes as a function with `io`
app.use('/api', friendApiRoutes);

// Log API requests for debugging
app.use((req, res, next) => {
  next();
});

// เริ่มต้นเซิร์ฟเวอร์
server.listen(port, () => console.info(`🚀 Server is running on port ${port}`));
