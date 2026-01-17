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
        typeof user.subGenres !== 'object' ||
        Array.isArray(user.subGenres) ||
        user.subGenres === null
      ) {
        return res.status(400).json({
          message: "A 'subgenres' object with category filters is required in the request body.",
        });
      }

      const subgenresObject = user.subGenres;
      // Build a dynamic query based on the user's selected genres and subgenres
      const genreFilters = Array.from(subgenresObject.entries())
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

      // Find events that match the user's filter preferences
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

      // Filter out events that are potential duplicates based on title or link
      const duplicateTitles = new Set(duplicateCheck.map((e) => e.title));
      const duplicateLinks = new Set(duplicateCheck.map((e) => e.link));

      const uniqueEvents = events.filter(
        (e) => !duplicateTitles.has(e.title) && !duplicateLinks.has(e.link)
      );

      // Trigger a webhook to an external service like Make.com
      if (uniqueEvents.length === 0 || uniqueEvents.length === events.length) {
        // ✅ ส่งข้อมูลไปยัง Make.com เฉพาะกรณีที่ genres/subGenres มีข้อมูล
        const hasGenres = Array.isArray(genres) ? genres.length > 0 : false;
        const hasSubGenres =
          subGenres &&
          typeof subGenres === 'object' &&
          Object.values(subGenres).some((arr) => (Array.isArray(arr) ? arr.length > 0 : false));
        if (hasGenres && hasSubGenres) {
          await axios.post(MAKE_WEBHOOK_URL, {
            type: 'update-genres',
            filter_info: {
              email: user.email,
              genres: user.genres,
              subGenres: user.subGenres,
              updatedAt: updatedAt || new Date().toISOString(),
            },
          });
        }
      }

      // If no unique events are found after filtering, return an empty array.
      if (uniqueEvents.length === 0) {
        return res.status(200).json([]);
      }

      // Prepare the found unique events to be saved for the user
      const data = uniqueEvents.map((e) => ({
        title: e.title,
        snippet: e.description,
        link: e.link,
        image: e.image,
      }));

      // Automatically save the recommended events for the user by calling the service
      if (data.length > 0) {
        await saveEventsFromSource({
          data,
          email,
          subGenres,
          updatedAt, // This is no longer used in the service but kept for compatibility
        });
      }

      // Return the unique events to the frontend
      res.json(uniqueEvents);
    } catch (error) {
      console.error('❌ Update failed:', error);
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
server.listen(port, () => console.info(`🚀 Server is running on port ${(8080, '0.0.0.0')}`));
