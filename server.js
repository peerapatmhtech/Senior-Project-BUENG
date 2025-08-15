
// ✅ Import libraries และตั้งค่าเบื้องต้น
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import userRoutes from "./backend/src/routes/gmail.js";
import friendRoutes from "./backend/src/routes/friend.js";
import roomRoutes from "./backend/src/routes/room.js";
import infoRoutes  from "./backend/src/routes/info.js";
import eventRoutes from "./backend/src/routes/event.js";
import likeRoutes from "./backend/src/routes/like.js"; // Routes from "./routes/like.js";
import roommatchRoutes  from "./backend/src/routes/eventmatch.js"; // Routes from "./routes/room.js";
import mongoose from "mongoose";
import { Filter } from "./backend/src/model/filter.js";
import axios from "axios";

// Import new routes (ES Modules style)
import friendRequestRoutes from "./backend/src/routes/friendRequest.js";
import friendApiRoutes from "./backend/src/routes/friendApi.js";
import userPhotoRoutes from "./backend/src/routes/userPhoto.js";
import infoMatchRoutes from "./backend/src/routes/infomatch.js"; // Import info match routes
import verifyFirebaseToken from "./backend/src/middleware/verifyToken.js"; // Import token verification middleware




dotenv.config();
const allowedOrigins = [
  "https://project-react-mocha-eta.vercel.app", // production frontend
  "http://localhost:5173", // local dev frontend
];

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const port = process.env.PORT || 8080;
const MONGO_URI = process.env.MONGO_URI;
const MAKE_WEBHOOK_URL = process.env.MAKE_WEBHOOK_URL;
// ✅ Middleware
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(bodyParser.json());

// Serve static files from the uploads directory
app.use('/uploads', express.static('uploads'));

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
app.post("/api/update-genres", async (req, res) => {
  const { email, genres, subGenres, updatedAt } = req.body;
  if (!email || !genres || !subGenres) {
    return res
      .status(400)
      .json({ message: "Missing email, genres, or subGenres" });
  }

  try {
    const user = await Filter.findOneAndUpdate(
      { email },
      { genres, subGenres: subGenres || {} },
      { new: true, upsert: true } // เพิ่ม upsert เผื่อ user ยังไม่มีใน Filter
    );

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

    res
      .status(200)
      .json({ message: "Genres updated & sent to Make.com", user });
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
app.use("/api", eventRoutes);
app.use("/api", infoRoutes);
app.use("/api", roommatchRoutes);
app.use("/api", likeRoutes);
app.use("/api", infoMatchRoutes); // ใช้งาน info match routes

// Secure routes (ต้องมี token)
app.use("/api/secure", verifyFirebaseToken);

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
