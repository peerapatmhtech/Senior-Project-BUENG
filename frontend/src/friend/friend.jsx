import React, { useEffect, useState, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./friend.css";
import { FaSearch } from "react-icons/fa";
import { IoMdPersonAdd } from "react-icons/io";
import RequireLogin from "../ui/RequireLogin";
import { BsThreeDots } from "react-icons/bs";
import { useTheme } from "../context/themecontext";
import { useNotifications } from "../context/notificationContext";
import HeaderProfile from "../ui/HeaderProfile";

// --- API Helper Functions ---
const fetchAllUsers = () => api.get(`/api/users`).then(res => res.data);
const fetchAllNicknames = () => api.get(`/api/infos`).then(res => res.data);
const fetchFollowInfo = (email) => api.get(`/api/user/${email}/follow-info`).then(res => res.data);

const Friend = () => {
  const queryClient = useQueryClient();
  const { socket } = useNotifications();
  const userEmail = localStorage.getItem("userEmail");
  const { isDarkMode } = useTheme();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [openMenuFor, setOpenMenuFor] = useState(null);
  const [showFriendList, setShowFriendList] = useState(true);
  const [showOnlineUsersList, setShowOnlineUsersList] = useState(true);
  const modalRef = useRef(null);
  const dropdownRefs = useRef({});

  // 1. Centralized data fetching with useQuery
  const { data: users = [], isLoading: isLoadingUsers } = useQuery({ 
    queryKey: ['users'], 
    queryFn: fetchAllUsers, 
    staleTime: 1000 * 60 * 2 
  });

  const { data: nicknames = [] } = useQuery({ 
    queryKey: ['nicknames'], 
    queryFn: fetchAllNicknames, 
    staleTime: 1000 * 60 * 5 
  });

  const { data: followInfo, refetch: refetchFollowInfo } = useQuery({
    queryKey: ['followInfo', selectedUser?.email],
    queryFn: () => fetchFollowInfo(selectedUser.email),
    enabled: false, // Initially disabled, triggered manually
  });

  // 2. Derived state from queries using useMemo
  const { currentUser, friends } = useMemo(() => {
    const me = users.find(u => u.email === userEmail);
    if (!me) return { currentUser: null, friends: [] };
    const friendEmails = me.friends?.map(f => typeof f === 'string' ? f : f.email) || [];
    const friendList = users
      .filter(u => friendEmails.includes(u.email))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
    return { currentUser: me, friends: friendList };
  }, [users, userEmail]);

  // 3. Mutations for all actions
  const addFriendMutation = useMutation({
    mutationFn: (friendEmail) => api.post(`/api/friend-request`, {
      from: { email: userEmail, displayName: currentUser.displayName, photoURL: currentUser.photoURL },
      to: friendEmail,
      timestamp: new Date().toISOString(),
      type: "friend-request",
      requestId: Date.now(),
    }),
    onSuccess: (_, friendEmail) => toast.success(`ส่งคำขอเป็นเพื่อนถึง ${friendEmail} แล้ว`),
    onError: (err) => toast.error(err.response?.data?.message || "ไม่สามารถเพิ่มเพื่อนได้"),
  });

  const removeFriendMutation = useMutation({
    mutationFn: (friendEmail) => api.delete(`/api/users/${userEmail}/friends/${friendEmail}`),
    onSuccess: (_, friendEmail) => {
      toast.success("ลบเพื่อนสำเร็จ!");
      queryClient.invalidateQueries({ queryKey: ['users'] });
      if (socket?.connected) {
        socket.emit("notify-friend-removed", { to: friendEmail, from: userEmail });
      }
    },
    onError: () => toast.error("เกิดข้อผิดพลาดในการลบเพื่อน"),
  });

  const followToggleMutation = useMutation({
    mutationFn: ({ targetEmail, isFollowing }) => {
      const method = isFollowing ? "DELETE" : "POST";
      const action = isFollowing ? "unfollow" : "follow";
      return api({ method, url: `/api/users/${userEmail}/${action}/${targetEmail}` });
    },
    onSuccess: (_, { isFollowing }) => {
      toast.success(isFollowing ? "Unfollowed" : "Followed");
      queryClient.invalidateQueries({ queryKey: ['users'] });
      if (selectedUser) {
        queryClient.invalidateQueries({ queryKey: ['followInfo', selectedUser.email] });
      }
    },
    onError: () => toast.error("Follow/unfollow error"),
  });

  // 4. Simplified Socket.IO handling
  useEffect(() => {
    if (!socket || !userEmail) return;
    const invalidateUsers = () => queryClient.invalidateQueries({ queryKey: ['users'] });
    socket.on("update-users", invalidateUsers);
    socket.on("user-offline", invalidateUsers);
    socket.on("user-online", invalidateUsers);
    socket.on("notify-friend-accept", invalidateUsers);
    socket.on("notify-friend-removed", invalidateUsers);
    return () => {
      socket.off("update-users", invalidateUsers);
      socket.off("user-offline", invalidateUsers);
      socket.off("user-online", invalidateUsers);
      socket.off("notify-friend-accept", invalidateUsers);
      socket.off("notify-friend-removed", invalidateUsers);
    };
  }, [socket, userEmail, queryClient]);

  // --- Handlers ---
  const handleProfileClick = (user) => {
    setSelectedUser(user);
    setIsModalOpen(true);
    refetchFollowInfo(); // Manually trigger fetch for this user
  };

  const handleCloseModal = () => setIsModalOpen(false);

  const handleFollow = (targetEmail) => {
    const isFollowing = currentUser?.following?.includes(targetEmail);
    followToggleMutation.mutate({ targetEmail, isFollowing });
  };

  const filteredFriends = friends.filter(f => f.displayName.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredUsers = users.filter(u => 
    u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) && 
    u.email !== userEmail && 
    !friends.some(f => f.email === u.email)
  );

  const formatLastSeen = (lastSeen) => {
    if (!lastSeen) return "ไม่ทราบ";
    const now = new Date();
    const diffMs = now - new Date(lastSeen);
    const diffMinutes = Math.floor(diffMs / 60000);
    if (diffMinutes < 1) return "เมื่อสักครู่";
    if (diffMinutes < 60) return `${diffMinutes} นาทีที่แล้ว`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`;
    return `${Math.floor(diffHours / 24)} วันที่แล้ว`;
  };

  return (
    <RequireLogin>
      <div className={`fr-container ${isDarkMode ? "dark-mode" : ""}`}>
        <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
        <header className="header-home"><HeaderProfile isFriend={(email) => friends.some(f => f.email === email)} /></header>
        
        <div className="search-friend-con">
          <FaSearch className="search-icon-friend" />
          <input type="text" placeholder="Search Friend" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="search-input-chat" />
        </div>

        <div className="slide-con">
          {/* Friends List */}
          <div className="list-section">
            <div className="list-header" onClick={() => setShowFriendList(!showFriendList)}>
              <h2>Favorite ({filteredFriends.length})</h2>
              <span className={`toggle-icon ${showFriendList ? "open" : ""}`}>▼</span>
            </div>
            <div className={`list-content ${showFriendList ? "expanded" : "collapsed"}`}>
              {isLoadingUsers ? <p>Loading friends...</p> : filteredFriends.length > 0 ? (
                <ul className="friend-list">
                  {filteredFriends.map((friend) => (
                    <li key={friend.email} className="button-friend-item">
                      <div className="mobile-small">
                        <img src={friend.photoURL} className="friend-photo" alt={friend.displayName} />
                        <div className="friend-detail-friend">
                          <span className="friend-name-friend">{nicknames.find(n => n.email === friend.email)?.nickname || friend.displayName}</span>
                          <span className="friend-email">{friend.email}</span>
                        </div>
                      </div>
                      <div className="con-right">
                        <span className={`status ${friend.isOnline ? "online" : "offline"}`}>{friend.isOnline ? "ออนไลน์" : formatLastSeen(friend.lastSeen)}</span>
                        <div className="dropdown-wrapper" ref={el => dropdownRefs.current[friend.email] = el}>
                          <button onClick={() => setOpenMenuFor(prev => prev === friend.email ? null : friend.email)} className="dropdown-toggle"><BsThreeDots size={20} /></button>
                          {openMenuFor === friend.email && (
                            <div className="dropdown-menu">
                              <button onClick={() => { handleProfileClick(friend); setOpenMenuFor(null); }}>Profile</button>
                              <button onClick={() => handleFollow(friend.email)}>{currentUser?.following?.includes(friend.email) ? "Following" : "Follow"}</button>
                              <button className="danger" onClick={() => removeFriendMutation.mutate(friend.email)} disabled={removeFriendMutation.isPending}>Delete Friend</button>
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : <div className="empty-friend"><p>ยังไม่มีเพื่อนในรายการโปรด</p></div>}
            </div>
          </div>

          {/* Online Users List */}
          <div className="list-section">
            <div className="list-header" onClick={() => setShowOnlineUsersList(!showOnlineUsersList)}>
              <h2>Online Users ({filteredUsers.filter(u => u.isOnline).length})</h2>
              <span className={`toggle-icon ${showOnlineUsersList ? "open" : ""}`}>▼</span>
            </div>
            <div className={`list-content ${showOnlineUsersList ? "expanded" : "collapsed"}`}>
              {isLoadingUsers ? <p>Loading users...</p> : filteredUsers.filter(u => u.isOnline).length > 0 ? (
                <ul className="friend-recommend">
                  {filteredUsers.filter(u => u.isOnline).map((user) => (
                    <li key={user.email} className="button-friend-item">
                      <div className="mobile-small">
                        <img src={user.photoURL} alt={user.displayName} className="friend-photo" />
                        <div className="friend-detail-friend">
                          <span className="friend-name-friend">{nicknames.find(n => n.email === user.email)?.nickname || user.displayName}</span>
                          <span className="friend-email">{user.email}</span>
                        </div>
                      </div>
                      <div className="con-right">
                        <span className="status online">ออนไลน์</span>
                        <button className="add-friend-btn" onClick={() => addFriendMutation.mutate(user.email)} disabled={addFriendMutation.isPending}>{addFriendMutation.isPending ? "..." : <IoMdPersonAdd />}</button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : <div className="empty-friend"><p>ไม่มีผู้ใช้ออนไลน์อื่น</p></div>}
            </div>
          </div>
        </div>

        {isModalOpen && selectedUser && (
          <div className="friend-profile-modal" onClick={handleCloseModal}>
            <div className="friend-modal-content" ref={modalRef} onClick={e => e.stopPropagation()}>
              <img src={selectedUser.photoURL} alt={selectedUser.displayName} className="profile-photo" />
              <h2>{nicknames.find(n => n.email === selectedUser.email)?.nickname || selectedUser.displayName}</h2>
              <div className="tabs">
                <ul className="followers"><li>{followInfo?.followers.length || 0} followers</li></ul>
                <ul className="following"><li>{followInfo?.following.length || 0} following</li></ul>
              </div>
              <p>Email: {selectedUser.email}</p>
              <p>สถานะ: {selectedUser.isOnline ? "ออนไลน์" : `ออฟไลน์ - ${formatLastSeen(selectedUser.lastSeen)}`}</p>
            </div>
          </div>
        )}
      </div>
    </RequireLogin>
  );
};

export default Friend;