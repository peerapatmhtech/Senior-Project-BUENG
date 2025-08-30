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
  const [events, setEvents] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState({});
  const [isConnected, setIsConnected] = useState(false);

  // ใช้ในโหมด demo - ปกติจะใช้ localStorage
  const userEmail = localStorage.getItem('userEmail');
  const displayName = localStorage.getItem('userName');
  const photoURL = localStorage.getItem('userPhoto');
  // สร้าง socket connection
  const socket = io(import.meta.env.VITE_APP_API_BASE_URL);

  useEffect(() => {
    if (!userEmail) {
      console.warn('No user email found');
      return;
    }

    // Set up event listeners
    setupSocketListeners(socket);

    // เมื่อเชื่อมต่อสำเร็จ
    socket.on('connect', () => {
      setIsConnected(true);
      // แจ้งเซิร์ฟเวอร์ว่าผู้ใช้ออนไลน์
      socket.emit("user-online", { displayName, photoURL, email: userEmail });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // ตั้งค่า ping interval
    const pingInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit("user-ping", { email: userEmail });
      }
    }, 30000);

    // จัดการเมื่อปิดแอป
    const handleBeforeUnload = () => {
      socket.emit("user-offline", { email: userEmail });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup function
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearInterval(pingInterval);
      socket.close();
    };
  }, [userEmail, displayName, photoURL]);

  const setupSocketListeners = (socket) => {
    // รับข้อมูลการอัปเดตสถานะผู้ใช้
    socket.on("update-users", (data) => {

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
      onlineUsers,
      isConnected
    }}>
      {children}
    </SocketContext.Provider>
  );
};