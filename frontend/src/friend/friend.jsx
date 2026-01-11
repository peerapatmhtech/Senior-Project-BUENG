import { useEffect, useState, useRef, useCallback } from 'react';
import api from '../server/api';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { FaSearch } from 'react-icons/fa';

import { IoMdPersonAdd } from 'react-icons/io';
import { useParams } from 'react-router-dom';
import { BsThreeDots } from 'react-icons/bs';
////////-------- Import Contexts ---------////////
import { useTheme } from '../context/themecontext';
import { useNotifications } from '../context/notificationContext';
import { useSocket } from '../context/socketcontext';

////////-------- Import CSS ---------////////
import './friend.css';
import './OnlineStatus.css';

////////-------- Import Components ---------////////
import RequireLogin from '../components/RequireLogin';
import '../components/NotificationBell.css';
import HeaderProfile from '../components/HeaderProfile';
import { useQuery } from '@tanstack/react-query';
import { fetchPhoto } from '../lib/queries';

// แสดงข้อมูลสถานะการเชื่อมต่อ socket อย่างละเอียด
// socket.on("connect", () => {

// การจัดการสถานะการเชื่อมต่อของ socket ทั้งหมดถูกย้ายไปที่ socketcontext.jsx แล้ว

// ฟังก์ชันเพื่อจัดการกับเวลาที่แสดง last seen

const Friend = () => {
  const { data: userPhotos = [], refetch: refetchPhoto } = useQuery({
    queryKey: ['userPhoto'],
    queryFn: fetchPhoto,
  });
  const { socket, onlineUsers } = useSocket();
  const { friends, setFriends } = useNotifications();
  // รับ roomId จาก URL ถ้ามี เช่น /friend/:roomId
  const { roomId } = useParams();

  // ย้ายตัวแปรเหล่านี้มาอยู่ด้านบนก่อนการใช้งานใน useEffect
  const userEmail = localStorage.getItem('userEmail');
  const displayName = localStorage.getItem('userName');
  const photoURL = localStorage.getItem('userPhoto');

  const [users, setUsers] = useState([]);
  const [currentUserfollow, setCurrentUserfollow] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingFriendEmail, setLoadingFriendEmail] = useState(null);
  const [loadingCurrentUser, setLoadingCurrentUser] = useState(true);
  const modalRef = useRef(null);
  const [openMenuFor, setOpenMenuFor] = useState(null);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [getnickName, getNickName] = useState([]);
  const dropdownRefs = useRef({});
  const { isDarkMode } = useTheme();
  const [error, setError] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [newFriendRequest, setNewFriendRequest] = useState(null);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);

  // States for list view toggle
  const [showFriendList, setShowFriendList] = useState(false);
  const [showOnlineUsersList, setShowOnlineUsersList] = useState(false);
  const [photo, setPhoto] = useState(null);

  const getFullImageUrl = (url) => {
    if (!url) return ''; // Or a default image
    if (url.startsWith('http')) {
      return url; // It's already an absolute URL
    }
    // It's a relative URL from our backend, so prepend the API base URL
    return `${import.meta.env.VITE_APP_API_BASE_URL}${url}`;
  };
  useEffect(() => {
    if (userPhotos && userPhotos.length > 0) {
      setPhoto(userPhotos);
    } else {
      refetchPhoto();
    }
  }, [userPhotos, refetchPhoto]);
  // โหลดการแจ้งเตือนจาก localStorage เมื่อเริ่มต้น
  useEffect(() => {
    if (userEmail) {
      const savedNotifications = localStorage.getItem(`notifications_${userEmail}`);
      if (savedNotifications) {
        try {
          const parsedNotifications = JSON.parse(savedNotifications);
          setNotifications(parsedNotifications);
        } catch (error) {
          console.error('เกิดข้อผิดพลาดในการแปลงข้อมูลแจ้งเตือนจาก localStorage:', error);
        }
      }
    }
  }, [userEmail]);

  // บันทึกการแจ้งเตือนลงใน localStorage ทุกครั้งที่มีการเปลี่ยนแปลง
  useEffect(() => {
    if (userEmail && notifications.length > 0) {
      localStorage.setItem(`notifications_${userEmail}`, JSON.stringify(notifications));
    }
  }, [notifications, userEmail]);

  // ตรวจสอบว่ามีคำขอเพื่อนที่ยังไม่อ่านอยู่หรือไม่ เพื่อแสดงการแจ้งเตือน
  useEffect(() => {
    if (userEmail && notifications.length > 0) {
      // ค้นหาคำขอเพื่อนที่ยังไม่ได้อ่าน
      const unreadFriendRequest = notifications.find((n) => n.type === 'friend-request' && !n.read);

      // ถ้ามีคำขอเพื่อนที่ยังไม่ได้อ่าน ให้แสดงใน newFriendRequest
      if (unreadFriendRequest && !newFriendRequest) {
        setNewFriendRequest({
          ...unreadFriendRequest,
          id: unreadFriendRequest.id,
        });
      }
    }
  }, [notifications, newFriendRequest, userEmail]);

  const fetchGmailUser = useCallback(async () => {
    try {
      const res = await api.get(`/api/users/${userEmail}`);
      setCurrentUserfollow(res.data);
    } catch (err) {
      setError('โหลด Gmail currentUser ไม่ได้');
    }
  }, [userEmail]);

  ///////Mounting///////
  useEffect(() => {
    fetchGmailUser();
  }, [fetchGmailUser]);

  const fetchCurrentUserAndFriends = useCallback(async () => {
    setError('');
    try {
      const encodedEmail = encodeURIComponent(userEmail);

      ////////Fetch Online Users////////
      const allUsersRes = await api.get(`/api/users`);
      const allUsers = allUsersRes.data;

      /////////Set Online Users////////
      setUsers(allUsers);

      //////////Fetch  Favorites////////
      const userRes = await api.get(`/api/friends/${encodedEmail}`);
      const currentUser = userRes.data;

      /////////Set Favorites////////
      if (Array.isArray(currentUser)) {
        // ดึง email จาก friends array (object)
        const friendEmails = currentUser.map((f) => f.email);
        const filteredFriends = allUsers
          .filter((user) => friendEmails.includes(user.email))
          .map((user) => ({
            photoURL: user.photoURL,
            email: user.email,
            displayName: user.displayName,
            isOnline: user.isOnline || false,
          }))
          .sort((a, b) => a.displayName.localeCompare(b.displayName)); // เรียงตามชื่อ
        setFriends(filteredFriends);
      } else {
        setFriends([]);
      }
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้:', error);
      setError('เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้');
      toast.error('เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้');
    }
  }, [userEmail]);

  useEffect(() => {
    if (!userEmail) return;
    fetchCurrentUserAndFriends();

    // แจ้งสถานะออนไลน์เมื่อเริ่มต้น
    // socket.emit("user-online", {
    //   displayName,
    //   photoURL,
    //   email: userEmail,
    // });

    // ลองเช็คการเชื่อมต่อของ socket ทุกๆ 10 วินาที
    const socketCheckInterval = setInterval(() => {
      if (!socket.connected) {
        console.warn('⚠️ Socket ไม่ได้เชื่อมต่อ! กำลังลองเชื่อมต่อใหม่...');
        socket.connect();
      }
    }, 10000);

    // ฟังการแจ้งเตือนเมื่อมีคนยอมรับคำขอเป็นเพื่อน
    socket.on('notify-friend-accept', async () => {
      try {
        // ดึงข้อมูลเพื่อนล่าสุด
        await fetchCurrentUserAndFriends();

        // ต้องดึงข้อมูลจาก API เพื่อดูว่าใครยอมรับคำขอเพื่อนเรา
        const response = await api.get(
          `${import.meta.env.VITE_APP_API_BASE_URL}/api/friend-accepts/${userEmail}`
        );

        if (response.data && response.data.latestAccept) {
          const acceptInfo = response.data.latestAccept;

          // แสดง toast notification
          toast.success(
            <div className="friend-request-toast">
              <img
                src={getFullImageUrl(acceptInfo.photoURL)}
                alt={acceptInfo.displayName}
                className="toast-profile-img"
              />
              <div className="toast-content">
                <strong>{acceptInfo.displayName}</strong> ได้ตอบรับคำขอเป็นเพื่อนของคุณแล้ว
              </div>
            </div>,
            {
              autoClose: 5000,
              position: 'bottom-right',
            }
          );
        }
      } catch (error) {
        console.error('เกิดข้อผิดพลาดในการดึงข้อมูลการยอมรับคำขอเพื่อน:', error);
      }
    });

    // ฟังเมื่อเราถูกลบออกจากรายการเพื่อน
    socket.on('notify-friend-removed', async (data) => {
      if (data.to === userEmail) {
        // ดึงข้อมูลเพื่อนใหม่
        await fetchCurrentUserAndFriends();

        // แสดง toast notification
        toast.info(`คุณถูกลบออกจากรายการเพื่อน`, {
          autoClose: 5000,
          position: 'bottom-right',
        });
      }
    });

    // ทำความสะอาด event listeners เมื่อ unmount
    return () => {
      socket.emit('user-offline', { email: userEmail });
      clearInterval(socketCheckInterval);

      socket.off('notify-friend-request');
      socket.off('notify-friend-accept');
      socket.off('notify-friend-removed');
    };
  }, [socket, userEmail, fetchCurrentUserAndFriends]);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value.toLowerCase());
  };

  // ฟังก์ชันสุ่ม roomId (UUID v4 แบบง่าย)
  function generateRoomId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0,
        v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  const handleAddFriend = async (friendEmail) => {
    try {
      setLoadingFriendEmail(friendEmail);
      // ใช้ roomId จาก useParams ถ้ามี ถ้าไม่มีให้ gen ใหม่
      // const finalRoomId = roomId || generateRoomId(); // Unused

      // สร้าง ID สำหรับคำขอเพื่อน
      const requestId = Date.now();

      // ข้อมูลคำขอเพื่อน
      const requestData = {
        from: {
          email: userEmail,
          displayName: displayName,
          photoURL: photoURL,
        },
        to: friendEmail,
        timestamp: new Date().toISOString(),
        type: 'friend-request',
        requestId: requestId,
      };

      const response = await api.post(`/api/friend-request`, requestData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (response.status !== 400) {
        toast.error(response.data.message || 'ไม่สามารถเพิ่มเพื่อนได้');
      }

      toast.success('เพิ่มเพื่อนสำเร็จ! กรุณารอการตอบกลับจาก ' + friendEmail);
    } catch (error) {
      console.error('ข้อผิดพลาดในการเพิ่มเพื่อน:', error);
      setError('ไม่สามารถเพิ่มเพื่อนได้');
      toast.error('ไม่สามารถเพิ่มเพื่อนได้');
    } finally {
      setLoadingFriendEmail(null);
    }
  };

  const handleRemoveFriend = async (friendEmail) => {
    try {
      setLoadingFriendEmail(friendEmail);

      // ลบเพื่อนผ่าน REST API
      await api.delete(`/api/users/${userEmail}/friends/${friendEmail}`);
      try {
        await api.delete(
          `${
            import.meta.env.VITE_APP_API_BASE_URL
          }/api/friend-request-email/${userEmail}/${friendEmail}`
        );
      } catch (err) {
        console.error('เกิดข้อผิดพลาดในการลบคำขอเพื่อน:', err);
      }

      // อัปเดต UI ทันที
      setFriends((prevFriends) => prevFriends.filter((friend) => friend.email !== friendEmail));

      // แจ้งเตือน real-time ให้อีกฝ่ายทราบ (เพื่อให้เขาสามารถอัปเดต UI ได้ทันที)
      if (socket.connected) {
        socket.emit('notify-friend-removed', {
          to: friendEmail,
          from: userEmail,
        });
      }

      toast.success('ลบเพื่อนสําเร็จ!');
    } catch (err) {
      console.error('เกิดข้อผิดพลาดในการลบเพื่อน:', err);
      setError('เกิดข้อผิดพลาดในการลบเพื่อน');
      toast.error('เกิดข้อผิดพลาดในการลบเพื่อน');
    } finally {
      setLoadingFriendEmail(null);
    }
  };

  const isFriend = (email) =>
    Array.isArray(friends) && friends.some((friend) => friend.email === email);

  const handleProfileClick = (user) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        handleCloseModal();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const filteredUsers = users.filter(
    (u) =>
      (u.displayName || '').toLowerCase().includes(searchTerm.toLowerCase()) &&
      u.email !== userEmail &&
      !friends.some((f) => f.email === u.email)
  );

  const fetchCurrentUser = useCallback(async () => {
    try {
      const res = await api.get(`/api/users/${userEmail}`);
      const userData = {
        ...res.data,
        following: Array.isArray(res.data.following) ? res.data.following : [],
      };
      setLoadingCurrentUser(false);
    } catch (err) {
      setError('คุณสามารถเพิ่มเพื่อนได้ทันที');
      setLoadingCurrentUser(false);
    }
  }, [userEmail]);

  const handleFollow = async (targetEmail) => {
    await fetchGmailUser();
    if (!currentUserfollow || !Array.isArray(currentUserfollow.following)) {
      toast.error('ข้อมูลผู้ใช้ยังไม่พร้อม');
      return;
    }
    const isFollowing = currentUserfollow.following.includes(targetEmail);
    const url = `${import.meta.env.VITE_APP_API_BASE_URL}/api/users/${userEmail}/${
      isFollowing ? 'unfollow' : 'follow'
    }/${targetEmail}`;
    const method = isFollowing ? 'DELETE' : 'POST';
    try {
      await api({ method, url });
      await fetchGmailUser();
      toast.success(isFollowing ? 'Unfollowed' : 'Followed');
    } catch (err) {
      setError('Follow/unfollow error');
      toast.error('Follow/unfollow error');
    }
  };

  useEffect(() => {
    if (!userEmail) {
      setLoadingCurrentUser(false);
      return;
    }
    fetchCurrentUser();
  }, [userEmail, fetchCurrentUser]);

  // Refs for the notification dropdown
  const notificationDropdownRef = useRef(null);
  const bellButtonRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      // For normal dropdowns
      const isClickInsideAny = Object.values(dropdownRefs.current).some((ref) =>
        ref?.contains(event.target)
      );
      if (!isClickInsideAny) {
        setOpenMenuFor(null);
      }

      // For notification dropdown
      if (
        showNotificationDropdown &&
        notificationDropdownRef.current &&
        !notificationDropdownRef.current.contains(event.target) &&
        bellButtonRef.current &&
        !bellButtonRef.current.contains(event.target)
      ) {
        setShowNotificationDropdown(false);
      }
    };

    // เพิ่ม event scroll เพื่อปิด dropdown
    const handleScroll = () => {
      setOpenMenuFor(null);
      setShowNotificationDropdown(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true); // true เพื่อจับทุก scroll

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [showNotificationDropdown]);

  const filteredFriends = friends.filter((friend) =>
    friend.displayName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const fetchFollowInfo = async (targetEmail) => {
    try {
      const res = await api.get(`/api/user/${targetEmail}/follow-info`);
      setFollowers(res.data.followers);
      setFollowing(res.data.following);
    } catch (error) {
      setError('Error fetching follow info');
    }
  };

  useEffect(() => {
    const getNickNameF = async () => {
      try {
        const res = await api.get(`/api/infos`);
        getNickName(res.data);
      } catch (err) {
        setError('โหลด nickname ล้มเหลว');
      }
    };
    getNickNameF();
  }, []);

  // ฟังก์ชันสำหรับแปลงเวลา lastSeen
  const formatLastSeen = (lastSeen) => {
    if (!lastSeen) return 'ไม่ทราบ';

    const now = new Date();
    const lastSeenDate = new Date(lastSeen);
    const diffMs = now - lastSeenDate;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'เมื่อสักครู่';
    if (diffMinutes < 60) return `${diffMinutes} นาทีที่แล้ว`;
    if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`;
    if (diffDays < 7) return `${diffDays} วันที่แล้ว`;

    return lastSeenDate.toLocaleDateString('th-TH');
  };

  return (
    <RequireLogin>
      <div className={`fr-container ${isDarkMode ? 'dark-mode' : ''}`}>
        <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
        <header className="header-home">
          <HeaderProfile userPhoto={photoURL} setFriends={setFriends} />
        </header>
        {error && <div className="error-message">{error}</div>}

        <div className="search-friend-con">
          <FaSearch className="search-icon-friend" />
          <input
            type="text"
            placeholder="Search Friend"
            value={searchTerm}
            onChange={handleSearch}
            className="search-input-chat"
            aria-label="ค้นหาเพื่อน"
          />
        </div>
        <div className="slide-con">
          <div className="list-section">
            <div className="list-header" onClick={() => setShowFriendList(!showFriendList)}>
              <h2>Favorite ({filteredFriends.length})</h2>
              <span className={`toggle-icon ${showFriendList ? 'open' : ''}`}>▼</span>
            </div>
            <div className={`list-content ${showFriendList ? 'expanded' : 'collapsed'}`}>
              <div
                className={
                  filteredFriends.length === filteredUsers.length
                    ? 'special-friend-list'
                    : filteredFriends.length > 0
                      ? 'con-friend-list'
                      : 'empty-friend-list'
                }
              >
                <ul className="friend-list">
                  {filteredFriends.length > 0 ? (
                    filteredFriends.map((friend) => (
                      <li
                        key={friend.email}
                        className={`button-friend-item ${
                          openMenuFor === friend.email ? 'dropdown-active' : ''
                        }`}
                      >
                        <div className="mobile-small">
                          <img
                            src={
                              getFullImageUrl(friend.photoURL) ||
                              'https://cdn.pixabay.com/photo/2023/02/18/11/00/icon-7797704_640.png'
                            }
                            className="friend-photo"
                            alt={friend.displayName}
                          />
                          <div className="friend-detail-friend">
                            <span className="friend-name-friend">
                              {(Array.isArray(getnickName) &&
                                getnickName.find((n) => n.email === friend.email)?.nickname) ||
                                friend.displayName}
                            </span>
                            <span className="friend-email">{friend.email}</span>
                          </div>
                        </div>
                        <div className="con-right">
                          <span
                            className={`status ${
                              onlineUsers[friend.email]?.online ? 'online' : 'offline'
                            }`}
                            aria-label={onlineUsers[friend.email]?.online ? 'ออนไลน์' : 'ออฟไลน์'}
                          >
                            {onlineUsers[friend.email]?.online
                              ? 'ออนไลน์'
                              : onlineUsers[friend.email]?.lastActive
                                ? `ออฟไลน์ - ${formatLastSeen(
                                    onlineUsers[friend.email]?.lastActive
                                  )}`
                                : 'ออฟไลน์'}
                          </span>
                          <div
                            className={`dropdown-wrapper ${
                              openMenuFor === friend.email ? 'active' : ''
                            }`}
                            ref={(el) => (dropdownRefs.current[friend.email] = el)}
                          >
                            <button
                              onClick={() =>
                                setOpenMenuFor((prev) =>
                                  prev === friend.email ? null : friend.email
                                )
                              }
                              className="dropdown-toggle"
                              aria-label="เมนูเพื่อน"
                            >
                              <BsThreeDots size={20} />
                            </button>
                            {openMenuFor === friend.email && (
                              <div
                                className="dropdown-menu"
                                onMouseLeave={() => setOpenMenuFor(null)}
                              >
                                <button
                                  className="dropdown-item"
                                  onClick={() => {
                                    handleProfileClick(friend);
                                    fetchFollowInfo(friend.email);
                                    setOpenMenuFor(null);
                                  }}
                                  aria-label="ดูโปรไฟล์"
                                >
                                  Profile
                                </button>
                                <button
                                  className="dropdown-item"
                                  onClick={() => {
                                    if (
                                      !currentUserfollow ||
                                      !Array.isArray(currentUserfollow.following)
                                    )
                                      return;
                                    handleFollow(friend.email);
                                  }}
                                  aria-label={
                                    Array.isArray(currentUserfollow?.following) &&
                                    currentUserfollow.following.includes(friend.email)
                                      ? 'Following'
                                      : 'Follow'
                                  }
                                >
                                  {Array.isArray(currentUserfollow?.following) &&
                                  currentUserfollow.following.includes(friend.email)
                                    ? 'Following'
                                    : 'Follow'}
                                </button>
                                <button
                                  className="dropdown-item danger"
                                  onClick={() => {
                                    handleRemoveFriend(friend.email);
                                    setOpenMenuFor(null);
                                  }}
                                  disabled={loadingFriendEmail === friend.email}
                                  aria-label="ลบเพื่อน"
                                >
                                  {loadingFriendEmail === friend.email
                                    ? 'Deleting...'
                                    : 'Delete Friend'}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </li>
                    ))
                  ) : (
                    <div className="empty-friend">
                      <div className="roomlist-empty-loading">
                        <div className="roomlist-empty-spinner">
                          <div className="roomlist-empty-bar"></div>
                          <div className="roomlist-empty-bar"></div>
                          <div className="roomlist-empty-bar"></div>
                          <div className="roomlist-empty-bar"></div>
                        </div>
                        <div className="roomlist-empty-text">ยังไม่มีเพื่อนในรายการโปรด</div>
                      </div>
                    </div>
                  )}
                </ul>
              </div>
            </div>
          </div>

          <div className="list-section">
            <div
              className="list-header"
              onClick={() => setShowOnlineUsersList(!showOnlineUsersList)}
            >
              <h2>Recommend ({filteredUsers.filter((user) => !isFriend(user.email)).length})</h2>

              <span className={`toggle-icon ${showOnlineUsersList ? 'open' : ''}`}>▼</span>
            </div>
            <div className={`list-content ${showOnlineUsersList ? 'expanded' : 'collapsed'}`}>
              <div
                className={
                  filteredUsers.filter((user) => !isFriend(user.email)).length > 0 &&
                  filteredFriends.length === 0
                    ? 'special-friend-recommand'
                    : filteredUsers.filter((user) => !isFriend(user.email)).length === 0
                      ? 'empty-friend-recommand'
                      : 'con-friend-recommand'
                }
              >
                {/* {filteredUsers.filter(
                  (user) =>
                    !isFriend(user.email) && onlineUsers[user.email]?.online
                ).length === 0 && (
                  <div className="empty-friend">
                    <div className="roomlist-empty-loading">
                      <div className="roomlist-empty-text">
                        ไม่มีผู้ใช้ที่ออนไลน์อยู่ในขณะนี้
                      </div>
                    </div>
                  </div>
                )} */}
                <ul className="friend-recommend">
                  {!loadingCurrentUser &&
                    filteredUsers
                      .filter((user) => !isFriend(user.email))
                      .map((user) => (
                        <li
                          key={user.email}
                          className={`button-friend-item ${
                            openMenuFor === user.email ? 'dropdown-active' : ''
                          }`}
                        >
                          <div className="mobile-small">
                            <img
                              src={
                                getFullImageUrl(user.photoURL) ||
                                'https://cdn.pixabay.com/photo/2023/02/18/11/00/icon-7797704_640.png'
                              }
                              alt={user.displayName}
                              className="friend-photo"
                            />
                            <div className="friend-detail-friend">
                              <span className="friend-name-friend">
                                {getnickName.find((n) => n.email === user.email)?.nickname ||
                                  user.displayName}
                              </span>
                              <span className="friend-email">{user.email}</span>
                            </div>
                          </div>
                          <div className="con-right">
                            <span
                              className={`status ${
                                onlineUsers[user.email]?.online ? 'online' : 'offline'
                              }`}
                              aria-label={onlineUsers[user.email]?.online ? 'ออนไลน์' : 'ออฟไลน์'}
                            >
                              {onlineUsers[user.email]?.online
                                ? 'ออนไลน์'
                                : onlineUsers[user.email]?.lastActive
                                  ? `ออฟไลน์ - ${formatLastSeen(
                                      onlineUsers[user.email]?.lastActive
                                    )}`
                                  : 'ออฟไลน์'}
                            </span>
                            <button
                              className="add-friend-btn"
                              onClick={() => handleAddFriend(user.email)}
                              disabled={loadingFriendEmail === user.email}
                              aria-label="เพิ่มเพื่อน"
                            >
                              {loadingFriendEmail === user.email ? (
                                'กำลังเพิ่ม...'
                              ) : (
                                <IoMdPersonAdd />
                              )}
                            </button>
                            <div
                              className={`dropdown-wrapper ${
                                openMenuFor === user.email ? 'active' : ''
                              }`}
                              ref={(el) => (dropdownRefs.current[user.email] = el)}
                            >
                              <button
                                onClick={() =>
                                  setOpenMenuFor((prev) =>
                                    prev === user.email ? null : user.email
                                  )
                                }
                                className="dropdown-toggle"
                                aria-label="เมนูผู้ใช้"
                              >
                                <BsThreeDots size={20} />
                              </button>
                              {openMenuFor === user.email && (
                                <div
                                  className="dropdown-menu"
                                  onMouseLeave={() => setOpenMenuFor(null)}
                                >
                                  <button
                                    className="dropdown-item"
                                    onClick={() => {
                                      handleProfileClick(user);
                                      setOpenMenuFor(null);
                                    }}
                                    aria-label="ดูโปรไฟล์"
                                  >
                                    Profile
                                  </button>
                                  <button
                                    className="dropdown-item"
                                    onClick={() => {
                                      if (
                                        !currentUserfollow ||
                                        !Array.isArray(currentUserfollow.following)
                                      )
                                        return;
                                      handleFollow(user.email);
                                    }}
                                    aria-label={
                                      Array.isArray(currentUserfollow?.following) &&
                                      currentUserfollow.following.includes(user.email)
                                        ? 'Following'
                                        : 'Follow'
                                    }
                                  >
                                    {Array.isArray(currentUserfollow?.following) &&
                                    currentUserfollow.following.includes(user.email)
                                      ? 'Following'
                                      : 'Follow'}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </li>
                      ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
        {isModalOpen && selectedUser && (
          <div className="friend-profile-modal">
            <div className="friend-modal-content" ref={modalRef}>
              <div className="profile-info">
                <img
                  src={getFullImageUrl(selectedUser.photoURL)}
                  alt={selectedUser.displayName}
                  className="profile-photo"
                />
                <h2>
                  {getnickName.find((n) => n.email === selectedUser.email)?.nickname ||
                    selectedUser.displayName}
                </h2>
                <div className="tabs">
                  <ul className="followers">
                    <li>{followers.length} followers</li>
                  </ul>
                  <ul className="following">
                    <li>{following.length} following</li>
                  </ul>
                </div>
                <p>Email: {selectedUser.email}</p>
                <p>
                  สถานะ:{' '}
                  {onlineUsers[selectedUser.email]?.online
                    ? 'ออนไลน์'
                    : onlineUsers[selectedUser.email]?.lastActive
                      ? `ออฟไลน์ - เห็นล่าสุด ${formatLastSeen(
                          onlineUsers[selectedUser.email]?.lastActive
                        )}`
                      : 'ออฟไลน์'}
                </p>
                <div className="photo-modal">
                  {photo && photo.length > 0
                    ? photo
                        .filter((u) => u.email === selectedUser.email)
                        .map((photoItem) => (
                          <div key={photoItem._id} className="photo-modal-warpper">
                            <img src={getFullImageUrl(photoItem.url)} alt={`User Photo`} />
                          </div>
                        ))
                    : null}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </RequireLogin>
  );
};

export default Friend;
