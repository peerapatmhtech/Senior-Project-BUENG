import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
} from "react";
import io from "socket.io-client";
import axios from "axios";
import { toast } from "react-toastify";

// สร้าง socket instance พร้อม options เพื่อแก้ปัญหาการเชื่อมต่อ
const socket = io(import.meta.env.VITE_APP_API_BASE_URL, {
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  transports: ["websocket", "polling"],
  autoConnect: true,
  forceNew: false,
  query: { clientId: "notification-context-" + Date.now() },
});

// สร้าง Context
const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [newFriendRequest, setNewFriendRequest] = useState(null);
  const [showNotificationDropdown, setShowNotificationDropdown] =
    useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // ข้อมูลผู้ใช้จาก localStorage
  const userEmail = localStorage.getItem("userEmail");
  const displayName = localStorage.getItem("userName");
  const photoURL = localStorage.getItem("userPhoto");

  ///////functions call friend request///////
  const fetchNotifications = useCallback(async () => {

    setIsLoading(true);
    try {
      console.log("🔄 Fetching notifications for:", userEmail);

      // ดึงข้อมูลคำขอเพื่อนล่าสุดผ่าน REST API
      const response = await axios.get(
        `${
          import.meta.env.VITE_APP_API_BASE_URL
        }/api/friend-requests/${userEmail}`
      );

      console.log("📨 API Response:", response.data);

      // ถ้าไม่มีคำขอเพื่อน
      if (
        !response.data ||
        !response.data.requests ||
        response.data.requests.length === 0
      ) {
        console.log("📭 No friend requests found");
        // ยังคง update state เพื่อล้างข้อมูลเก่า
        setNotifications([]);
        setNewFriendRequest(null);
        return;
      }

      // แปลงข้อมูล API เป็น notification format
      const notificationData = response.data.requests.map((request) => ({
        id: request.requestId || `${request.from?.email}-${Date.now()}`,
        type: "friend-request",
        from: request.from,
        to: request.to,
        timestamp: request.timestamp,
        read: false, // ตั้งเป็น false ทุกครั้งที่ fetch ใหม่
      }));

      console.log("📋 Processed notifications:", notificationData);

      // อัพเดตการแจ้งเตือนใน state
      setNotifications(notificationData);
      console.log(notificationData)

      // ตั้งค่า newFriendRequest เป็นคำขอล่าสุด
      if (notificationData.length > 0) {
        const latestRequest = notificationData[0];
        setNewFriendRequest(latestRequest);

        // แสดง toast notification เฉพาะเมื่อมี notification ใหม่
        toast.info(
          <div className="friend-request-toast">
            <img
              src={latestRequest.from?.photoURL}
              alt={latestRequest.from?.displayName}
              className="toast-profile-img"
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                marginRight: "8px",
              }}
            />
            <div className="toast-content">
              <strong>{latestRequest.from?.displayName}</strong>{" "}
              ได้ส่งคำขอเป็นเพื่อนถึงคุณ
            </div>
          </div>,
          {
            autoClose: 8000,
            position: "bottom-right",
          }
        );
      }
    } catch (error) {
      console.error("❌ Error fetching notifications:", error);
      // อย่า toast error ทุกครั้ง เพราะอาจเป็น 404 (ไม่มี notifications)
      if (error.response && error.response.status !== 404) {
        toast.error("ไม่สามารถโหลดการแจ้งเตือนได้");
      }
    } finally {
      setIsLoading(false);
    }
  }, [userEmail]);

  // โหลด notifications เมื่อเริ่มต้น
  useEffect(() => {
    if (userEmail) {
      // โหลดจาก localStorage ก่อน
      const savedNotifications = localStorage.getItem(
        `notifications_${userEmail}`
      );
      if (savedNotifications) {
        try {
          const parsedNotifications = JSON.parse(savedNotifications);
          console.log(
            "💾 Loaded notifications from localStorage:",
            parsedNotifications
          );
          setNotifications(parsedNotifications);
        } catch (error) {
          console.error(
            "❌ Error parsing notifications from localStorage:",
            error
          );
        }
      }

      // จากนั้น fetch ข้อมูลล่าสุดจาก API
      fetchNotifications();
    }
  }, [userEmail, fetchNotifications]);

  // บันทึกการแจ้งเตือนลงใน localStorage ทุกครั้งที่มีการเปลี่ยนแปลง
  useEffect(() => {
    if (userEmail && notifications.length >= 0) {
      // เปลี่ยนจาก > 0 เป็น >= 0 เพื่อบันทึก array ว่างด้วย
      console.log("💾 Saving notifications to localStorage:", notifications);
      localStorage.setItem(
        `notifications_${userEmail}`,
        JSON.stringify(notifications)
      );
    }
  }, [notifications, userEmail]);

  // ตรวจสอบว่ามีคำขอเพื่อนที่ยังไม่อ่านอยู่หรือไม่ เพื่อแสดงการแจ้งเตือน
  useEffect(() => {
    if (userEmail && notifications.length > 0) {
      // ค้นหาคำขอเพื่อนที่ยังไม่ได้อ่าน
      const unreadFriendRequest = notifications.find(
        (n) => n.type === "friend-request" && !n.read
      );

      console.log("🔍 Checking unread requests:", unreadFriendRequest);

      // ถ้ามีคำขอเพื่อนที่ยังไม่ได้อ่าน ให้แสดงใน newFriendRequest
      if (
        unreadFriendRequest &&
        (!newFriendRequest || newFriendRequest.id !== unreadFriendRequest.id)
      ) {
        setNewFriendRequest({
          ...unreadFriendRequest,
          id: unreadFriendRequest.id,
        });
      }
    }
  }, [notifications, userEmail]);

  // Socket connection handling
  useEffect(() => {
    if (!userEmail) return;

    console.log("🔌 Setting up socket listeners for:", userEmail);

    // Join user's room สำหรับรับ notifications
    socket.emit("join-user-room", userEmail);

    // ฟังการแจ้งเตือนเมื่อมีคนส่งคำขอเพื่อนใหม่
    const handleNotifyFriendRequest = async (data) => {
      console.log("🔔 Received notify-friend-request:", data);

      // ตรวจสอบว่า notification นี้เป็นของผู้ใช้ปัจจุบันหรือไม่
      if (data.to === userEmail || data.targetEmail === userEmail) {
        // Fetch notifications ใหม่เมื่อได้รับ socket event
        await fetchNotifications();
      }
    };

    // ฟังการแจ้งเตือนเมื่อมีการยอมรับคำขอเพื่อน
    const handleNotifyFriendAccept = async (data) => {
      console.log("✅ Received notify-friend-accept:", data);

      if (data.to === userEmail || data.targetEmail === userEmail) {
        // Refresh notifications
        await fetchNotifications();

        toast.success("คำขอเป็นเพื่อนของคุณได้รับการยอมรับแล้ว!", {
          position: "bottom-right",
          autoClose: 3000,
        });
      }
    };

    // ตั้งค่า socket listeners
    socket.on("notify-friend-request", handleNotifyFriendRequest);
    socket.on("notify-friend-accept", handleNotifyFriendAccept);

    // ตรวจสอบการเชื่อมต่อ socket
    socket.on("connect", () => {
      console.log("🟢 Socket connected");
      // Re-join room เมื่อเชื่อมต่อใหม่
      socket.emit("join-user-room", userEmail);
    });

    socket.on("disconnect", () => {
      console.log("🔴 Socket disconnected");
    });

    // Cleanup
    return () => {
      console.log("🧹 Cleaning up socket listeners");
      socket.off("notify-friend-request", handleNotifyFriendRequest);
      socket.off("notify-friend-accept", handleNotifyFriendAccept);
      socket.off("connect");
      socket.off("disconnect");
    };
  }, [userEmail, fetchNotifications]);


  // ฟังก์ชันสำหรับการทำเครื่องหมายว่าแจ้งเตือนได้อ่านแล้ว
  const markNotificationAsRead = (notificationId) => {

    // หาอินเด็กซ์ของการแจ้งเตือนที่จะทำเครื่องหมายว่าอ่านแล้ว
    const notificationElement = document.querySelector(
      `[data-notification-id="${notificationId}"]`
    );
    try {
      axios.put(
        `${import.meta.env.VITE_APP_API_BASE_URL}/api/mark-notification-read/${notificationId}`,
        { read: true },
        { headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("❌ Error marking notification as read:", error);
      toast.error("ไม่สามารถทำเครื่องหมายว่าอ่านแล้วได้");
      return;
    }

    if (notificationElement) {
      // เพิ่มคลาสสำหรับแอนิเมชันการอ่าน
      notificationElement.classList.add("just-read");

      // รอให้แอนิเมชันเสร็จก่อนที่จะอัพเดต state
      setTimeout(() => {
        setNotifications((prevNotifications) => {
          const updatedNotifications = prevNotifications.map((notification) => {
            if (notification.id === notificationId) {
              return { ...notification, read: true };
            }
            return notification;
          });
          return updatedNotifications;
        });
      }, 500);
    } else {
      // ถ้าไม่พบ element ให้อัพเดต state ทันที
      setNotifications((prevNotifications) => {
        return prevNotifications.map((notification) => {
          if (notification.id === notificationId) {
            return { ...notification, read: true };
          }
          return notification;
        });
      });
    }

    // ตรวจสอบว่า newFriendRequest ตรงกับ notificationId ที่กำลังทำเครื่องหมาย
    if (newFriendRequest && newFriendRequest.id === notificationId) {
      // รอให้แอนิเมชันเสร็จก่อนที่จะซ่อนการแจ้งเตือน
      setTimeout(() => {
        setNewFriendRequest(null); // ลบการแสดงแจ้งเตือนใหม่ออก
      }, 800);
    }
  };

  // ฟังก์ชันสุ่ม roomId (UUID v4 แบบง่าย)
  function generateRoomId() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0,
          v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
  }

  // ฟังก์ชันสำหรับจัดการกับการตอบกลับคำขอเป็นเพื่อน
  const handleFriendRequestResponse = async (requestId, response, roomId) => {

    // ทำเครื่องหมายว่าอ่านแล้ว
    markNotificationAsRead(requestId);

    // ถ้าตอบรับเป็นเพื่อน
    if (response === "accept") {
      // แจ้งกลับไปยังผู้ส่งคำขอว่าได้ตอบรับแล้ว
      const notification = notifications.find((n) => n.id === requestId);
      if (notification) {
        try {
          // ใช้ roomId ที่ส่งเข้ามา ถ้าไม่มีให้ gen ใหม่
          const finalRoomId = roomId || generateRoomId();

          // ส่งการตอบกลับคำขอเพื่อนผ่าน REST API
          const responseData = await axios.post(
            `${
              import.meta.env.VITE_APP_API_BASE_URL
            }/api/friend-request-response`,
            {
              requestId: requestId,
              userEmail: userEmail,
              friendEmail: notification.from.email,
              response: "accept",
              roomId: finalRoomId,
              from: {
                email: userEmail,
                displayName: displayName,
                photoURL: photoURL,
              },
              to: notification.from.email,
              timestamp: new Date().toISOString(),
            },
            {
              headers: {
                "Content-Type": "application/json",
              },
            }
          );

          await axios.post(
            `${import.meta.env.VITE_APP_API_BASE_URL}/api/add-friend`,
            {
              userEmail: notification.from.email,
              friendEmail: userEmail,
              roomId: requestId,
            },
            {
              headers: {
                "Content-Type": "application/json",
              },
            }
          );

          if (responseData.status === 200) {
            toast.success(
              responseData.data.message ||
                `คุณได้ตอบรับคำขอเป็นเพื่อนจาก ${notification.from.displayName} แล้ว`
            );

            // ลบ notification ออกจาก state หลังยอมรับ
            setNotifications((prevNotifications) =>
              prevNotifications.filter((n) => n.id !== requestId)
            );

            // Emit socket event
            if (socket.connected) {
              socket.emit("notify-friend-accept", {
                to: notification.from.email,
                from: userEmail,
              });
            }

            // Fetch ข้อมูลใหม่เพื่อให้แน่ใจว่า sync กับ database
            setTimeout(() => fetchNotifications(), 1000);

            return true;
          }
        } catch (error) {
          console.error("❌ Error accepting friend request:", error);
          toast.error("ไม่สามารถตอบรับคำขอเพื่อนได้");
          return false;
        }
      }
    }
    return false;
  };

  // ฟังก์ชันสำหรับลบคำขอเพื่อน
  const handleDeleteFriendRequest = async (requestId) => {

    // ทำเครื่องหมายว่าอ่านแล้ว
    markNotificationAsRead(requestId);

    try {
      // ค้นหาข้อมูลการแจ้งเตือนคำขอเพื่อน
      const notification = notifications.find((n) => n.id === requestId);
      if (notification) {
        // ส่งคำขอไปยัง API เพื่อลบคำขอเพื่อน
        await axios.delete(
          `${
            import.meta.env.VITE_APP_API_BASE_URL
          }/api/friend-request/${requestId}`
        );

        // อัพเดต UI โดยการลบคำขอนี้ออกจาก notifications
        setNotifications((prevNotifications) =>
          prevNotifications.filter((n) => n.id !== requestId)
        );

        toast.info(
          `คุณได้ปฏิเสธคำขอเป็นเพื่อนจาก ${notification.from.displayName} แล้ว`,
          {
            position: "bottom-right",
            autoClose: 3000,
          }
        );

        // Fetch ข้อมูลใหม่เพื่อให้แน่ใจว่า sync กับ database
        setTimeout(() => fetchNotifications(), 1000);

        return true;
      }
      return false;
    } catch (error) {
      console.error("❌ Error deleting friend request:", error);
      toast.error("ไม่สามารถลบคำขอเพื่อนได้");
      return false;
    }
  };

  // ฟังก์ชันสำหรับล้างการแจ้งเตือนที่อ่านแล้ว
  const clearReadNotifications = () => {
    console.log("🧹 Clearing read notifications");

    setNotifications((prevNotifications) => {
      // กรองเอาเฉพาะการแจ้งเตือนที่ยังไม่ได้อ่าน
      const unreadNotifications = prevNotifications.filter((n) => !n.read);
      return unreadNotifications;
    });
  };

  // Toggle notification dropdown
  const toggleNotificationDropdown = (value = null) => {
    setShowNotificationDropdown((prev) => (value !== null ? value : !prev));
  };

  // ฟังก์ชันสำหรับ refresh notifications แบบ manual
  const refreshNotifications = () => {
    console.log("🔄 Manual refresh notifications");
    fetchNotifications();
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        setNotifications,
        newFriendRequest,
        showNotificationDropdown,
        toggleNotificationDropdown,
        markNotificationAsRead,
        clearReadNotifications,
        handleFriendRequestResponse,
        fetchNotifications,
        handleDeleteFriendRequest,
        refreshNotifications,
        isLoading,
        fetchNotifications, // เพิ่ม fetchNotifications สำหรับการเรียกจากภายนอก
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

// Custom hook สำหรับใช้งาน context
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider"
    );
  }
  return context;
};
