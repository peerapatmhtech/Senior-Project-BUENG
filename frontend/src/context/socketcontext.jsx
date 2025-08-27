import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [events, setEvents] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState({});
  const [isConnected, setIsConnected] = useState(false);

  // ใช้ในโหมด demo - ปกติจะใช้ localStorage
  const userEmail = localStorage.getItem('userEmail');
  const displayName = localStorage.getItem('userName');
  const photoURL = localStorage.getItem('userPhoto');

  useEffect(() => {
    if (!userEmail) {
      console.warn('No user email found');
      return;
    }
    // สร้าง socket connection เพียงครั้งเดียว
    const newSocket = io(import.meta.env.VITE_APP_API_BASE_URL);

    // Set up event listeners
    setupSocketListeners(newSocket);

    // เมื่อเชื่อมต่อสำเร็จ
    newSocket.on('connect', () => {
      console.log('✅ Socket connected');
      setIsConnected(true);
      // แจ้งเซิร์ฟเวอร์ว่าผู้ใช้ออนไลน์
      newSocket.emit("user-online", { displayName, photoURL, email: userEmail });
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
      setIsConnected(false);
    });

    // ตั้งค่า ping interval
    const pingInterval = setInterval(() => {
      if (newSocket.connected) {
        newSocket.emit("user-ping", { email: userEmail });
        console.log('📡 Ping sent');
      }
    }, 30000);

    // จัดการเมื่อปิดแอป
    const handleBeforeUnload = () => {
      console.log('👋 User leaving, sending offline status');
      newSocket.emit("user-offline", { email: userEmail });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    setSocket(newSocket);

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up socket connection');
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearInterval(pingInterval);
      newSocket.close();
    };
  }, [userEmail, displayName, photoURL]);

  const setupSocketListeners = (socket) => {
    // รับข้อมูลการอัปเดตสถานะผู้ใช้
    socket.on("update-users", (data) => {
      console.log('👥 Users updated:', data);

      if (Array.isArray(data)) {
        const updatedUsers = {};
        data.forEach(user => {
          if (user && user.email) {
            updatedUsers[user.email] = {
              online: true,
              lastActive: Date.now(),
              ...user
            };
          }
        });
        setOnlineUsers(updatedUsers);
      } else if (data && Array.isArray(data.onlineUsers)) {
        setOnlineUsers(prev => {
          const updatedUsers = { ...prev };

          // อัปเดตผู้ใช้ออนไลน์
          data.onlineUsers.forEach(email => {
            if (email) {
              updatedUsers[email] = {
                ...updatedUsers[email],
                online: true,
                lastActive: Date.now()
              };
            }
          });

          // อัปเดต lastSeenTimes สำหรับผู้ใช้ออฟไลน์
          if (data.lastSeenTimes) {
            Object.entries(data.lastSeenTimes).forEach(([email, time]) => {
              if (updatedUsers[email] && !updatedUsers[email].online) {
                updatedUsers[email] = {
                  ...updatedUsers[email],
                  lastActive: time
                };
              }
            });
          }

          return updatedUsers;
        });
      }
    });

    // ฟังเมื่อมีผู้ใช้ออฟไลน์
    socket.on("user-offline", (userData) => {
      if (userData && userData.email) {
        console.log('📴 User went offline:', userData.email);
        setOnlineUsers(prev => ({
          ...prev,
          [userData.email]: {
            ...prev[userData.email],
            online: false,
            lastActive: userData.lastSeen || Date.now()
          }
        }));
      }
    });

    // ฟังเมื่อมีผู้ใช้ออนไลน์
    socket.on("user-online", (userData) => {
      if (userData && userData.email) {
        console.log('🟢 User came online:', userData.email);
        setOnlineUsers(prev => ({
          ...prev,
          [userData.email]: {
            ...prev[userData.email],
            online: true,
            lastActive: Date.now()
          }
        }));
      }
    });
  };

  return (
    <SocketContext.Provider value={{
      events,
      setEvents,
      socket,
      onlineUsers
      , isConnected
    }}>
      {children}
    </SocketContext.Provider>
  );
};