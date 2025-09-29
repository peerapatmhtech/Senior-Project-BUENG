////------Libraries------////
import bodyParser from "body-parser";
import dotenv from "dotenv";
import mongoose from "mongoose";
import axios from "axios";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import session from "express-session";
import helmet from "helmet";
import OpenAI from 'openai';
import rateLimit from 'express-rate-limit';
import MongoStore from "connect-mongo";
import csrf from 'csurf';

////-------Routes-------////
import userRoutes from "./src/routes/gmail.js";
import friendRoutes from "./src/routes/friend.js";
import roomRoutes from "./src/routes/room.js";
import infoRoutes from "./src/routes/info.js";
import eventRoutes from "./src/routes/event.js";
import likeRoutes from "./src/routes/like.js";
import roommatchRoutes from "./src/routes/eventmatch.js";
import friendRequestRoutes from "./src/routes/friendRequest.js";
import friendApiRoutes from "./src/routes/friendApi.js";
import userPhotoRoutes from "./src/routes/userPhoto.js";
import infoMatchRoutes from "./src/routes/infomatch.js";
import aiRoutes from "./src/routes/ai.js";

////-------Protocal-------////
import http from "http";
import { Server } from "socket.io";

////-------MONGO DB-------////
import { Filter } from "./src/model/filter.js";
import { Event } from "./src/model/event.js";



////------Middleware------////
import { requireLogin } from "./src/middleware/required.js";
import { limiter } from "./src/middleware/ratelimit.js";
import { requireOwner } from "./src/middleware/required.js";

dotenv.config();

//////------Server------////
const allowedOrigins = [
  process.env.VITE_APP_WEB_BASE_URL, // Deployed frontend URL
  'http://localhost:5173',             // Common Vite/React dev port
  'http://localhost:3000',             // Common Create React App dev port
  'http://127.0.0.1:5173'              // Also allow 127.0.0.1 for different browser behaviors
];

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});////////enable CORS

///////------Environment------////
const port = process.env.PORT || 8080;
const MONGO_URI = process.env.MONGO_URI;
const MAKE_WEBHOOK_URL = process.env.MAKE_WEBHOOK_URL;
const COOKIE_SECRET = process.env.COOKIE_SECRET;
const isProduction = process.env.NODE_ENV === 'production';
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});


////////------Middleware------////////
app.use(express.json({ limit: '50mb' }));   //////////limit file size
app.use(helmet());  ///////////security
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);////////enable CORS
app.use(bodyParser.json());//////////parse JSON
app.use(cookieParser(COOKIE_SECRET));//////////////parse cookie


////////Protection Doss and DDos Attack////////
app.use(
  rateLimit({
    windowMs: 1 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  })
);

///////Protection Cross-Site Request Forgery (CSRF)////////
app.use(
  session({
    secret: COOKIE_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: MONGO_URI,
      collectionName: "sessions",
      ttl: 60 * 60, // อายุ session = 1 ชม.
    }),
    cookie: {
      secure: isProduction, // Use secure cookies in production
      httpOnly: true, // Prevent client-side script access
      sameSite: isProduction ? 'strict' : 'lax', // 'none' for cross-site requests, 'lax' for local dev
      maxAge: 1000 * 60 * 60, // อายุ cookie 30 นาที
    },
  })
);
const csrfProtection = csrf();

////--------CSRF Protection------////
app.use((req, res, next) => {
  const excludedPaths = ['/api/save-event', '/api/infomatch/create'];
  // Only exclude POST requests to specific paths from CSRF protection
  if (req.method === 'POST' && excludedPaths.includes(req.path)) {
    return next();
  }
  // Apply CSRF protection for all other routes
  return csrfProtection(req, res, next);
});   //////////Exclude POST requests

app.get('/api/csrf-token', (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});


// Serve static files from the uploads directory
app.use('/uploads', express.static('../uploads'));


// ✅ Connect MongoDB
mongoose.connect(MONGO_URI);
const db = mongoose.connection;
db.once("open", () => console.log("🔥 MongoDB Connected"));
db.on("error", (err) => console.error("❌ MongoDB Error:", err));

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

  io.emit("update-users", {
    onlineUsers: onlineUsersEmails,
    lastSeenTimes: lastSeenObj
  });
};

io.on("connection", (socket) => {
  console.log("🟢 New client connected", socket.id);

  socket.on("user-online", (user) => {
    console.log("🧑‍💻 User online", user);
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
    io.emit("user-online", {
      email,
      displayName,
      photoURL,
      isOnline: true
    });
  });

  socket.on("user-ping", (userData) => {
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

  socket.on("user-offline", (userData) => {
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
          io.emit("user-offline", {
            email,
            isOnline: false,
            lastSeen: timestamp,
            displayName: userDetails.get(email)?.displayName,
            photoURL: userDetails.get(email)?.photoURL
          });
        }
      }

      // ส่ง user list ไปให้ทุก client
      broadcastUserStatus();
    }
  });

  socket.on("disconnect", () => {
    console.log("🔴 Client disconnected", socket.id);
    const email = socket.email;
    if (email && onlineUsers.has(email)) {
      onlineUsers.get(email).delete(socket.id);
      if (onlineUsers.get(email).size === 0) {
        onlineUsers.delete(email); // ไม่มี socket เหลือแล้ว
        // บันทึกเวลาล่าสุดที่ออฟไลน์
        const timestamp = new Date().toISOString();
        lastSeenTimes.set(email, timestamp);

        // ส่งข้อมูลว่าผู้ใช้ออฟไลน์พร้อมเวลาล่าสุด
        io.emit("user-offline", {
          email,
          isOnline: false,
          lastSeen: timestamp,
          displayName: userDetails.get(email)?.displayName,
          photoURL: userDetails.get(email)?.photoURL
        });
      }
    }

    // ส่ง user list ไปให้ทุก client
    broadcastUserStatus();
  });
});
// 📌 API บันทึกหมวดหมู่เพลงที่ผู้ใช้เลือก
app.post("/api/update-genres", limiter, requireOwner, async (req, res) => {
  const { email, genres, subGenres, updatedAt } = req.body;
  if (!email || !genres || !subGenres) {
    return res
      .status(400)
      .json({ message: "Missing email, genres, or subGenres" });
  }

  try {

    //////validate email//////////
    if (!email) {
      return res
        .status(400)
        .json({ message: "Missing email" });
    };

    /////////////Find user and update genres and subgenres////////////
    const user = await Filter.findOneAndUpdate(
      { email },
      { genres, subGenres: subGenres || {} },
      { new: true, upsert: true } // เพิ่ม upsert เผื่อ user ยังไม่มีใน Filter
    );


    const filter = {};

    ////////////Filter out events from the provided userEmail////////
    // Exclude events from the provided userEmail
    if (user.email) {
      filter.email = { $ne: user.email };
    }

    // Validate subgenres structure - it should be an object
    if (
      !user.subGenres ||
      typeof user.subGenres !== "object" ||
      Array.isArray(user.subGenres) ||
      user.subGenres === null
    ) {
      return res.status(400).json({
        message:
          "A 'subgenres' object with category filters is required in the request body.",
      });
    }

    const subgenresObject = user.subGenres;
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
      (e) =>
        !duplicateTitles.has(e.title) && !duplicateLinks.has(e.link)
    );


    //////////////Send unique events to make.com////////
    if (uniqueEvents.length === 0 || uniqueEvents.length === events.length) {
      // ✅ ส่งข้อมูลไปยัง Make.com เฉพาะกรณีที่ genres/subGenres มีข้อมูล
      const hasGenres = Array.isArray(genres) ? genres.length > 0 : false;
      const hasSubGenres = subGenres && typeof subGenres === "object" && Object.values(subGenres).some(arr => Array.isArray(arr) ? arr.length > 0 : false);
      if (hasGenres && hasSubGenres) {
        await axios.post(MAKE_WEBHOOK_URL, {
          type: "update-genres",
          filter_info: {
            email: user.email,
            genres: user.genres,
            subGenres: user.subGenres,
            updatedAt: updatedAt || new Date().toISOString(),
          },
        });
      }
    }

    if (uniqueEvents.length > 0) {
      const savePromises = uniqueEvents.map(event =>
        axios.post(
          `/api/save-event`,
          {
            email: user.email,
            title: event.title,
            description: event.description,
            link: event.link,
            image: event.image,
            genre: event.subgenre,
            createdByAI: true,
          },
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        )
      );
      await Promise.all(savePromises);
    }

    res.json(uniqueEvents);
  } catch (error) {
    console.error("❌ Update failed:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// เก็บ socket instance ไว้ใช้ใน middleware
app.set('io', io);
app.set('userSockets', userSockets);

// ใช้งานเส้นทาง debug เพื่อตรวจสอบ API routes ทั้งหมด
app.get('/api/debug/routes', (req, res) => {
  const routes = [];
  app._router.stack.forEach(middleware => {
    if (middleware.route) {
      // Routes registered directly on the app
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods)
      });
    } else if (middleware.name === 'router') {
      // Router middleware
      middleware.handle.stack.forEach(handler => {
        if (handler.route) {
          routes.push({
            path: '/api' + handler.route.path,
            methods: Object.keys(handler.route.methods)
          });
        }
      });
    }
  });
  res.json(routes);
});

// ใช้งาน routes ที่แยกไว้
app.use("/api", userRoutes);
app.use("/api", friendRoutes);
app.use("/api", roomRoutes);
app.use("/api", eventRoutes(io));
app.use("/api", infoRoutes);
app.use("/api", roommatchRoutes);
app.use("/api", likeRoutes);
app.use("/api", infoMatchRoutes(io));
app.use("/api", aiRoutes);


// ลงทะเบียน friendRequest routes โดยตรงเพื่อแก้ปัญหาเรื่อง 404
// Log API requests for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

app.use("/api", friendRequestRoutes);
app.use("/api", friendApiRoutes);
app.use("/api", userPhotoRoutes);

// Test secure endpoint
app.get("/api/secure/me", (req, res) => {
  res.json({
    success: true,
    message: "Token valid",
    user: req.user
  });
});

// Endpoint เฉพาะสำหรับ BU students (@bumail.net)
app.get("/api/secure/bu-student", (req, res) => {
  if (!req.user.email.endsWith('@bumail.net')) {
    return res.status(403).json({
      success: false,
      message: 'Access restricted to @bumail.net email addresses only'
    });
  }

  res.json({
    success: true,
    message: 'Welcome BU student!',
    user: req.user,
    studentInfo: {
      email: req.user.email,
      domain: '@bumail.net',
      verified: true
    }
  });
});

// Fallback route to check if API is working
app.get("/api-status", (req, res) => {
  res.json({
    status: "API is running",
    routes: {
      userPhoto: "/api/test-photo-route",
      uploadPhoto: "/api/upload-user-photo"
    }
  });
});


// เริ่มต้นเซิร์ฟเวอร์
server.listen(port, () =>
  console.log(`🚀 Server is running on port ${(8080, "0.0.0.0")}`)
);