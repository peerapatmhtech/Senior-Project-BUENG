import React, { useState, useEffect, useRef } from "react";
import { db } from "../../../backend/src/firebase/firebase";
import RequireLogin from "../ui/RequireLogin";
import { FaSearch } from "react-icons/fa";
import { RiRobot2Fill } from "react-icons/ri";
import { MdClose } from "react-icons/md";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useParams } from "react-router-dom";
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  updateDoc,
  query,
  orderBy,
  getDocs,
  doc,
  where,
} from "firebase/firestore";
import axios from "axios";

import { useNotifications } from "../context/notificationContext";
import { useTheme } from "../context/themecontext";

import ChatContainerAI from "./components/javascript/ChatContainerAI";
import ListUser from "./components/javascript/userlist";
import CommunityList from "./components/javascript/communitylist";
import ChatPanel from "./components/javascript/ChatPanel";
import MatchList from "./components/javascript/matchlist";
import ShowTitle from "./components/javascript/showtitle";

import "./components/css/ChatAI.css";
import "./css/ListItems.css";
import "./css/DropdownMenu.css";
import "./css/OnlineStatus.css";

// Helper Functions
const formatRelativeTime = (timestamp) => {
  if (!timestamp) return "";
  const now = new Date();
  const diffMs = now - timestamp;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return "เมื่อสักครู่";
  if (diffMin < 60) return `${diffMin} นาทีที่แล้ว`;
  if (diffHour < 24) return `${diffHour} ชม.ที่แล้ว`;

  return timestamp.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatChatDate = (date) => {
  const now = new Date();
  const diffInMs = now - date;
  const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

  if (diffInDays <= 7) {
    return date.toLocaleString("en-GB", {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } else {
    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }
};

// Child Components
const LoadingIndicator = ({ isDarkMode }) => (
  <div
    className={`main-container ${isDarkMode ? "dark-mode" : ""}`}
    style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "100vh",
    }}
  >
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: "2rem", animation: "spin 1s linear infinite" }}>
        ⏳
      </div>
      <p style={{ marginTop: "1rem", color: isDarkMode ? "#fff" : "#333" }}>
        กำลังโหลด...
      </p>
    </div>
  </div>
);

const ChatSidebar = ({
  openchat,
  searchTerm,
  setSearchTerm,
  sortedFriends,
  lastMessages,
  setOpenchat,
  setActiveUser,
  isOpen,
  setIsOpen,
  setIsGroupChat,
  dropdownRefs,
  getnickName,
  setSelectedTab,
  selectedTab,
  setUserImage,
  setFriends,
  formatOnlineStatus,
  communityData,
  allRooms,
  isOpencom,
  joinedRooms,
  setIsOpencom,
  setRoombar,
  loadingFriendRooms,
  openMenuFor,
  setOpenMenuFor,
  userMatchData,
  allEvents,
  users,
  isOpenMatch,
  setIsOpenMatch,
  infos,
  handleProfileClick,
  setJoinedRooms,
}) => (
  <div className={`user-container ${openchat ? "mobile-layout-mode" : ""}`}>
    <div className="chat">
      <h2>Chat</h2>
    </div>
    <div className="search-con">
      <FaSearch className="search-icon" />
      <input
        type="text"
        placeholder="Search"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value.toLowerCase())}
        className="search-input-chat"
        autoFocus
      />
    </div>
    <div className="slide-chat">
      <ListUser
        sortedFriends={sortedFriends}
        lastMessages={lastMessages}
        setOpenchat={setOpenchat}
        setActiveUser={setActiveUser}
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        setIsGroupChat={setIsGroupChat}
        dropdownRefs={dropdownRefs}
        getnickName={getnickName}
        setSelectedTab={setSelectedTab}
        selectedTab={selectedTab}
        setUserImage={setUserImage}
        setFriends={setFriends}
        formatOnlineStatus={formatOnlineStatus}
      />
      <CommunityList
        communityData={communityData}
        allRooms={allRooms}
        isOpencom={isOpencom}
        setUserImage={setUserImage}
        setIsOpen={setIsOpen}
        joinedRooms={joinedRooms}
        setOpenchat={setOpenchat}
        setSelectedTab={setSelectedTab}
        selectedTab={selectedTab}
        setIsOpencom={setIsOpencom}
        setActiveUser={(roomId) => {
          setActiveUser(roomId);
          setIsGroupChat(true);
        }}
        setIsGroupChat={setIsGroupChat}
        dropdownRefs={dropdownRefs}
        getnickName={getnickName}
        setFriends={setFriends}
        setRoombar={setRoombar}
        loadingFriendRooms={loadingFriendRooms}
        openMenuFor={openMenuFor}
        setOpenMenuFor={setOpenMenuFor}
      />
      <MatchList
        userMatchData={userMatchData}
        allEvents={allEvents}
        users={users}
        isOpenMatch={isOpenMatch}
        setOpenchat={setOpenchat}
        setSelectedTab={setSelectedTab}
        selectedTab={selectedTab}
        setIsOpenMatch={setIsOpenMatch}
        setActiveUser={setActiveUser}
        infos={infos}
        handleProfileClick={handleProfileClick}
        setRoombar={setRoombar}
        setIsGroupChat={setIsGroupChat}
        loadingFriendRooms={loadingFriendRooms}
        openMenuFor={openMenuFor}
        setOpenMenuFor={setOpenMenuFor}
        dropdownRefs={dropdownRefs}
        setJoinedRooms={setJoinedRooms}
        getnickName={getnickName}
        setFriends={setFriends}
        setUserImage={setUserImage}
      />
    </div>
  </div>
);

const ChatWindow = ({
  openchat,
  messages,
  users,
  userEmail,
  userPhoto,
  setJoinedRooms,
  userName,
  RoomsBar,
  getnickName,
  input,
  isOpencom,
  isOpenMatch,
  setFriends,
  userImage,
  sortedFriends,
  setInput,
  handleSend,
  setOpenchat,
  endOfMessagesRef,
  defaultProfileImage,
  loadingMessages,
}) => (
  <div className={`bg-chat-con ${openchat ? "mobile-layout-mode" : ""}`}>
    <ChatPanel
      messages={messages}
      users={users}
      userEmail={userEmail}
      userPhoto={userPhoto}
      setJoinedRooms={setJoinedRooms}
      userName={userName}
      RoomsBar={RoomsBar}
      getnickName={getnickName}
      input={input}
      isOpencom={isOpencom}
      isOpenMatch={isOpenMatch}
      setFriends={setFriends}
      userImage={userImage}
      sortedFriends={sortedFriends}
      openchat={openchat}
      setInput={setInput}
      handleSend={handleSend}
      setOpenchat={setOpenchat}
      endOfMessagesRef={endOfMessagesRef}
      defaultProfileImage={defaultProfileImage}
      formatChatDate={formatChatDate}
    />
    <div className="tabright">
      <ShowTitle userimage={userImage} openchat={openchat} />
      <ChatContainerAI
        loadingMessages={loadingMessages}
        messages={messages}
        users={users}
        openchat={openchat}
        userEmail={userEmail}
        defaultProfileImage={defaultProfileImage}
        formatChatDate={formatChatDate}
        endOfMessagesRef={endOfMessagesRef}
        input={input}
        setInput={setInput}
        handleSend={handleSend}
      />
    </div>
  </div>
);

const AIChatButtonAndModal = ({
  hasNewAiMessage,
  openAiChat,
  aiNotificationCount,
  isAiChatOpen,
  handleAiModalClick,
  closeAiChat,
  userEmail,
  defaultProfileImage,
}) => (
  <>
    <button
      className={`ai-chat-float-button ${hasNewAiMessage ? 'new-message' : ''}`}
      onClick={openAiChat}
      title="แชทกับ AI Assistant"
    >
      <RiRobot2Fill />
      {aiNotificationCount > 0 && (
        <span className="ai-chat-notification-badge">
          {aiNotificationCount > 9 ? '9+' : aiNotificationCount}
        </span>
      )}
    </button>

    {isAiChatOpen && (
      <div
        className={`ai-chat-overlay ${isAiChatOpen ? 'active' : ''}`}
        onClick={handleAiModalClick}
      >
        <div className="ai-chat-modal">
          <div className="ai-chat-modal-header">
            <h3 className="ai-chat-modal-title">
              <RiRobot2Fill />
              AI Assistant
            </h3>
            <button
              className="ai-chat-close-btn"
              onClick={closeAiChat}
              title="ปิด"
            >
              <MdClose />
            </button>
          </div>
          <div className="ai-chat-modal-content">
            <ChatContainerAI
              openchat={false}
              userEmail={userEmail}
              defaultProfileImage={defaultProfileImage}
            />
          </div>
        </div>
      </div>
    )}
  </>
);


const Chat = () => {
  const { socket, onlineUsers } = useNotifications();
  const { isDarkMode } = useTheme();
  const [isOpencom, setIsOpencom] = useState(false);
  const { roomId } = useParams();
  const [users, setUsers] = useState([]);
  const userPhoto = localStorage.getItem("userPhoto");
  const userName = localStorage.getItem("userName");
  const [searchTerm, setSearchTerm] = useState("");
  const [input, setInput] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [loadingFriendRooms, setLoadingRoomId] = useState(null);
  const [activeUser, setActiveUser] = useState(null);
  const [currentUserfollow, setCurrentUserfollow] = useState(null);
  const userEmail = localStorage.getItem("userEmail");
  const messagesRef = collection(db, "messages");
  const [isOpen, setIsOpen] = useState(false);
  const endOfMessagesRef = useRef(null);
  const dropdownRefs = useRef({});
  const [joinedRooms, setJoinedRooms] = useState([]);
  const [allRooms, setRooms] = useState([]);
  const [allEvents, setEvents] = useState([]);
  const [friends, setFriends] = useState([]);
  const [RoomsBar, setRoomBar] = useState([]);
  const [openMenuFor, setOpenMenuFor] = useState(null);
  const [isGroupChat, setIsGroupChat] = useState(false);
  const [getnickName, getNickName] = useState("");
  const [lastMessages, setLastMessages] = useState({});
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isOpenMatch, setIsOpenMatch] = useState(false);
  const [userImage, setUserImage] = useState({});
  const [selectedTab, setSelectedTab] = useState(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [openchat, setOpenchat] = useState(false);

  const [communityData, setCommunityData] = useState([]);
  const [userMatchData, setUserMatchData] = useState([]);
  const [infos, setInfos] = useState([]);

  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [aiNotificationCount, setAiNotificationCount] = useState(0);
  const [hasNewAiMessage, setHasNewAiMessage] = useState(false);

  const displayName = localStorage.getItem("userName");
  const photoURL = localStorage.getItem("userPhoto");
  const defaultProfileImage = userPhoto;

  const fetchUsersAndFriends = async () => {
    if (!userEmail) return;
    setLoadingFriends(true);
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_APP_API_BASE_URL}/api/users`
      );
      const allUsers = response.data;
      setUsers(allUsers);
      const currentUser = allUsers.find((u) => u.email === userEmail);
      if (currentUser && Array.isArray(currentUser)) {
        const friendEmails = currentUser.map((f) =>
          typeof f === "string" ? f : f.email
        );
        const filteredFriends = allUsers
          .filter((user) => friendEmails.includes(user.email))
          .map((user) => ({
            photoURL: user.photoURL,
            email: user.email,
            displayName: user.displayName,
            _id: user._id,
            isOnline: user.isOnline || false,
          }))
          .sort((a, b) => a.displayName.localeCompare(b.displayName));
        setFriends(filteredFriends);
      } else {
        setFriends([]);
      }
    } catch (error) {
      console.error("Error fetching users and friends:", error);
    } finally {
      setLoadingFriends(false);
    }
  };

  const fetchCurrentUserAndFriends = async () => {
    if (!userEmail) return;
    try {
      const encodedEmail = encodeURIComponent(userEmail);
      const userRes = await axios.get(
        `${import.meta.env.VITE_APP_API_BASE_URL}/api/users/${encodedEmail}`
      );
      const currentUser = userRes.data;
      if (Array.isArray(currentUser.friends)) {
        const friendArray = currentUser.friends;
        const friendEmails = friendArray.map((f) => f.email);
        const allUsersRes = await axios.get(
          `${import.meta.env.VITE_APP_API_BASE_URL}/api/users`
        );
        const allUsers = allUsersRes.data;
        const filteredFriends = allUsers
          .filter((user) => friendEmails.includes(user.email))
          .map((user) => ({
            photoURL: user.photoURL,
            email: user.email,
            displayName: user.displayName,
            isOnline: user.isOnline || false,
          }))
          .sort((a, b) => a.displayName.localeCompare(b.displayName));
        setFriends(filteredFriends);
        setUsers(allUsers);
      } else {
        setFriends([]);
      }
    } catch (error) {
      console.error("Error fetching current user or friends:", error);
    }
  };

  const fetchGmailUser = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_APP_API_BASE_URL}/api/users/${userEmail}`
      );
      setCurrentUserfollow(res.data);
    } catch (err) {
      console.error("โหลด Gmail currentUser ไม่ได้:", err);
    }
  };

  const handleProfileClick = (user) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const scrollToBottom = () => {
    if (endOfMessagesRef.current) {
      endOfMessagesRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const openAiChat = () => {
    setIsAiChatOpen(true);
    setAiNotificationCount(0);
    setHasNewAiMessage(false);
    if (window.navigator?.vibrate) {
      window.navigator.vibrate(50);
    }
  };

  const closeAiChat = () => {
    setIsAiChatOpen(false);
    if (window.navigator?.vibrate) {
      window.navigator.vibrate([30, 50, 30]);
    }
  };

  const handleAiModalClick = (e) => {
    if (e.target.classList.contains('ai-chat-overlay')) {
      closeAiChat();
    }
  };

  useEffect(() => {
    const handleEscKey = (e) => {
      if (e.key === 'Escape' && isAiChatOpen) {
        closeAiChat();
      }
    };
    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, [isAiChatOpen]);

  useEffect(() => {
    if (!isAiChatOpen) {
      const interval = setInterval(() => {
        const shouldShowNotification = Math.random() > 0.8;
        if (shouldShowNotification) {
          setAiNotificationCount(prev => prev + 1);
          setHasNewAiMessage(true);
        }
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [isAiChatOpen]);

  const handleSend = async () => {
    if (input.trim() === "") return;
    if (!isGroupChat && !selectedUser && !activeUser) {
      console.warn("ไม่สามารถส่งข้อความได้: ไม่มีผู้รับที่ระบุ");
      return;
    }

    const messageData = {
      sender: userEmail,
      content: input,
      timestamp: serverTimestamp(),
      roomId: roomId || "direct",
      isSeen: false,
    };

    if (isGroupChat === true) {
      messageData.type = "group";
      messageData.receiver = null;
    } else if (selectedUser && selectedUser.email) {
      messageData.receiver = selectedUser.email;
    } else if (activeUser) {
      messageData.receiver =
        typeof activeUser === "string" ? activeUser : activeUser.email;
    } else {
      console.error("ไม่สามารถส่งข้อความได้: ไม่มีผู้รับ");
      return;
    }

    try {
      await addDoc(messagesRef, messageData);
      setInput("");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("ไม่สามารถส่งข้อความได้ กรุณาลองใหม่อีกครั้ง");
    }
  };

  const setRoombar = (roomImage, roomName) => {
    setRoomBar({ roomImage, roomName });
  };

  useEffect(() => {
    if (userEmail && initialLoad) {
      setIsLoading(true);
      fetchUsersAndFriends().finally(() => {
        setIsLoading(false);
      });
      setInitialLoad(false);
    }
  }, [userEmail, initialLoad]);

  useEffect(() => {
    if (!userEmail) return;
    fetchCurrentUserAndFriends();

    socket.emit("user-online", { displayName, photoURL, email: userEmail });

    const pingInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit("user-ping", { email: userEmail });
      }
    }, 30000);

    socket.on("update-users", (data) => {
      if (Array.isArray(data)) {
        setUsers((prevUsers) =>
          prevUsers.map((user) => ({
            ...user,
            isOnline: data.some(onlineUser => onlineUser.email === user.email),
            lastSeen: data.find(onlineUser => onlineUser.email === user.email)?.lastSeen || user.lastSeen
          }))
        );
        setFriends((prevFriends) =>
          prevFriends.map((friend) => ({
            ...friend,
            isOnline: data.some(onlineUser => onlineUser.email === friend.email),
            lastSeen: data.find(onlineUser => onlineUser.email === friend.email)?.lastSeen || friend.lastSeen
          }))
        );
      } else if (data && Array.isArray(data.onlineUsers)) {
        setUsers((prevUsers) =>
          prevUsers.map((user) => ({
            ...user,
            isOnline: user.email ? data.onlineUsers.includes(user.email) : false,
            lastSeen: data.lastSeenTimes && data.lastSeenTimes[user.email] || user.lastSeen
          }))
        );
        setFriends((prevFriends) =>
          prevFriends.map((friend) => ({
            ...friend,
            isOnline: friend.email ? data.onlineUsers.includes(friend.email) : false,
            lastSeen: data.lastSeenTimes && data.lastSeenTimes[friend.email] || friend.lastSeen
          }))
        );
      }
    });

    socket.on("user-offline", (userData) => {
      const updateUserStatus = (users) => users.map((user) =>
        user.email === userData.email
          ? { ...user, isOnline: false, lastSeen: userData.lastSeen }
          : user
      );
      setUsers(updateUserStatus);
      setFriends(updateUserStatus);
    });

    socket.on("user-online", (userData) => {
      const updateUserStatus = (users) => users.map((user) =>
        user.email === userData.email
          ? { ...user, isOnline: true, lastSeen: null }
          : user
      );
      setUsers(updateUserStatus);
      setFriends(updateUserStatus);
    });

    socket.on("connect", () => {
      socket.emit("user-online", { displayName, photoURL, email: userEmail });
    });

    return () => {
      socket.emit("user-offline", { email: userEmail });
      socket.off("update-users");
      socket.off("user-offline");
      socket.off("user-online");
      socket.off("connect");
      clearInterval(pingInterval);
    };
  }, [userEmail, displayName, photoURL, socket]);

  useEffect(() => {
    if (userEmail) {
      fetchGmailUser();
    }
  }, [userEmail]);

  useEffect(() => {
    const fetchRoomAndEventData = async () => {
      if (!userEmail) return;
      setLoadingRooms(true);
      try {
        const encodedEmail = encodeURIComponent(userEmail);
        const [CommunityData, UserMatchData, AllRoomData, AllEventData, AllInfoData, AllJoinedRoomData] = await Promise.all([
          axios.get(`${import.meta.env.VITE_APP_API_BASE_URL}/api/user-rooms/${encodedEmail}`),
          axios.get(`${import.meta.env.VITE_APP_API_BASE_URL}/api/infomatch/all`),
          axios.get(`${import.meta.env.VITE_APP_API_BASE_URL}/api/allrooms`),
          axios.get(`${import.meta.env.VITE_APP_API_BASE_URL}/api/events/${encodedEmail}`),
          axios.get(`${import.meta.env.VITE_APP_API_BASE_URL}/api/get-all-info`),
          axios.get(`${import.meta.env.VITE_APP_API_BASE_URL}/api/user-rooms/${encodedEmail}`),
        ]);
        setCommunityData(CommunityData.data);
        setUserMatchData(UserMatchData.data.data);
        setRooms(AllRoomData.data);
        setJoinedRooms(AllJoinedRoomData.data)
        setEvents(AllEventData.data);
        setInfos(AllInfoData.data);
        getNickName(AllInfoData.data);
      } catch (error) {
        console.error("Error fetching user rooms:", error);
      } finally {
        setLoadingRooms(false);
      }
    };
    fetchRoomAndEventData();
  }, [userEmail]);

  useEffect(() => {
    if (!roomId) return;
    const q = query(messagesRef, orderBy("timestamp"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allMessages = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((msg) => msg.roomId === roomId);

      const filteredMessages = isGroupChat
        ? allMessages.filter((msg) => msg.type === "group" && msg.roomId === roomId)
        : allMessages.filter((msg) => {
          const isMyMsg = msg.sender === userEmail && msg.receiver === activeUser;
          const isTheirMsg = msg.sender === activeUser && (msg.receiver === userEmail || !msg.receiver);
          return isMyMsg || isTheirMsg;
        });

      setMessages(filteredMessages);
      scrollToBottom();
    });

    return () => unsubscribe();
  }, [roomId, userEmail, isGroupChat, activeUser]);

  useEffect(() => {
    const markMessagesAsSeen = async () => {
      const q = query(
        collection(db, "messages"),
        where("roomId", "==", roomId),
        where("isSeen", "==", false)
      );
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach(async (docSnap) => {
        const msg = docSnap.data();
        if (msg.sender !== userEmail && (!msg.receiver || msg.receiver === userEmail)) {
          await updateDoc(doc(db, "messages", docSnap.id), { isSeen: true });
        }
      });
    };
    if (messages.length > 0) {
      markMessagesAsSeen();
    }
  }, [messages, userEmail, roomId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!userEmail) return;
    const q = query(collection(db, "messages"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newMessages = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const latest = {};
      newMessages.forEach((msg) => {
        const otherEmail = msg.sender === userEmail ? msg.receiver : msg.sender;
        if ((msg.sender === userEmail || msg.receiver === userEmail || msg.receiver === null) && !latest[otherEmail]) {
          latest[otherEmail] = msg;
        }
      });
      setLastMessages(latest);
    });
    return () => unsubscribe();
  }, [userEmail]);

  const isOnline = (email) => email && onlineUsers && onlineUsers[email]?.online;

  const formatOnlineStatus = (user) => {
    if (!user || !user.email) return "";
    if (isOnline(user.email)) return "ออนไลน์";
    if (onlineUsers[user.email]?.lastActive) {
      return `ออฟไลน์ - ${formatRelativeTime(new Date(onlineUsers[user.email].lastActive))}`;
    }
    return "ออฟไลน์";
  };

  const friendsWithOnlineStatus = friends.map((friend) => ({
    ...friend,
    isOnline: isOnline(friend?.email),
    lastSeen: onlineUsers[friend?.email]?.lastActive,
  }));

  const sortedFriends = [...friendsWithOnlineStatus].sort((a, b) => {
    if (a?.email && b?.email) {
      if (isOnline(a.email) && !isOnline(b.email)) return -1;
      if (!isOnline(a.email) && isOnline(b.email)) return 1;
      const timeA = lastMessages[a.email]?.timestamp?.toDate()?.getTime() || 0;
      const timeB = lastMessages[b.email]?.timestamp?.toDate()?.getTime() || 0;
      return timeB - timeA;
    }
    return 0;
  });

  if (isLoading) {
    return <LoadingIndicator isDarkMode={isDarkMode} />;
  }

  return (
    <RequireLogin>
      <div className={`main-container ${isDarkMode ? "dark-mode" : ""}`}>
        <ChatSidebar
          openchat={openchat}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          sortedFriends={sortedFriends}
          lastMessages={lastMessages}
          setOpenchat={setOpenchat}
          setActiveUser={setActiveUser}
          isOpen={isOpen}
          setIsOpen={setIsOpen}
          setIsGroupChat={setIsGroupChat}
          dropdownRefs={dropdownRefs}
          getnickName={getnickName}
          setSelectedTab={setSelectedTab}
          selectedTab={selectedTab}
          setUserImage={setUserImage}
          setFriends={setFriends}
          formatOnlineStatus={formatOnlineStatus}
          communityData={communityData}
          allRooms={allRooms}
          isOpencom={isOpencom}
          joinedRooms={joinedRooms}
          setIsOpencom={setIsOpencom}
          setRoombar={setRoombar}
          loadingFriendRooms={loadingFriendRooms}
          openMenuFor={openMenuFor}
          setOpenMenuFor={setOpenMenuFor}
          userMatchData={userMatchData}
          allEvents={allEvents}
          users={users}
          isOpenMatch={isOpenMatch}
          setIsOpenMatch={setIsOpenMatch}
          infos={infos}
          handleProfileClick={handleProfileClick}
          setJoinedRooms={setJoinedRooms}
        />
        <ChatWindow
          openchat={openchat}
          messages={messages}
          users={users}
          userEmail={userEmail}
          userPhoto={userPhoto}
          setJoinedRooms={setJoinedRooms}
          userName={userName}
          RoomsBar={RoomsBar}
          getnickName={getnickName}
          input={input}
          isOpencom={isOpencom}
          isOpenMatch={isOpenMatch}
          setFriends={setFriends}
          userImage={userImage}
          sortedFriends={sortedFriends}
          setInput={setInput}
          handleSend={handleSend}
          setOpenchat={setOpenchat}
          endOfMessagesRef={endOfMessagesRef}
          defaultProfileImage={defaultProfileImage}
          loadingMessages={loadingMessages}
        />
      </div>
      <AIChatButtonAndModal
        hasNewAiMessage={hasNewAiMessage}
        openAiChat={openAiChat}
        aiNotificationCount={aiNotificationCount}
        isAiChatOpen={isAiChatOpen}
        handleAiModalClick={handleAiModalClick}
        closeAiChat={closeAiChat}
        userEmail={userEmail}
        defaultProfileImage={defaultProfileImage}
      />
    </RequireLogin>
  );
};

export default Chat;