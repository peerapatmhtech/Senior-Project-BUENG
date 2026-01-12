import "./App.css";
import Navbar from "./Navbar";
import Profile from "./profile/Profile";
import Freind from "./friend/friend";
import NewLogin from "./auth/auth";
import Community from "./community/community";
import Home from "./home/Home";
import Chat from "./chat/chat";
import ChatContainerAI from "./chat/components/javascript/ChatContainerAI";
import { Route, Routes, useLocation } from "react-router-dom";
import { NotificationProvider } from "./context/notificationContext";
import { SocketProvider } from "./context/make.com";
import { useAuth } from "./context/Authcontext";

function App() {
  const location = useLocation(); // ใช้เพื่อดึงข้อมูล path ปัจจุบัน
  const { loading } = useAuth();
  // แสดง loading ระหว่างที่ check auth state
  if (loading) {
    return (
      <div className="auth-loading">
        <div className="auth-spinner"></div>
        <p>กำลังตรวจสอบสิทธิ์...</p>
      </div>
    );
  }



  return (
    <SocketProvider>
      <NotificationProvider>
        {/* หากไม่ใช่หน้า login, จะแสดง Navbar */}
        {/* <div className="reponsive"> */}
          {location.pathname !== "/login" && <Navbar />}

          <Routes>
            <Route path="/home" element={<Home />} />
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<NewLogin />} />
            <Route path="/friend" element={<Freind />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/community" element={<Community />} />
            <Route path="/chat/:roomId" element={<Chat />} />
            <Route path="/ai-chat" element={<ChatContainerAI />} />
          </Routes>
        {/* </div> */}
      </NotificationProvider>
    </SocketProvider>
  );
}

export default App;