import { useRef, useState, useEffect } from 'react';
import { useTheme } from '../context/themecontext';
import { useNotifications } from '../context/notificationContext';
import './HeaderProfile.css';
import { useAuth } from '../context/AuthContextProvider';
import { useQuery } from '@tanstack/react-query';
import { fetchCurrentUser, fetchUserInfo, fetchUserPhotos } from '../lib/queries';
import { Bell, LogOut, Sun, Moon, X, Check, UserPlus } from 'lucide-react';
import { Info } from 'lucide-react';
import UserAvatar from './UserAvatar';

const HeaderProfile = ({
  showNotification = true,
  className = '',
  bellButtonRef: externalBellButtonRef,
  notificationDropdownRef: externalDropdownRef,
  isFriend,
  onStartTour,
}) => {
  const {
    notifications,
    showNotificationDropdown,
    toggleNotificationDropdown,
    fetchNotifications,
    markNotificationAsRead,
    clearReadNotifications,
    socket,
    handleFriendRequestResponse,
    handleDeleteFriendRequest,
  } = useNotifications();

  const userEmail = localStorage.getItem('userEmail');

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser', userEmail],
    queryFn: () => fetchCurrentUser(userEmail),
    enabled: !!userEmail,
  });

  const { data: infoUser } = useQuery({
    queryKey: ['userInfos', userEmail],
    queryFn: () => fetchUserInfo(userEmail),
    enabled: !!userEmail,
  });

  const { data: photoUsers = [] } = useQuery({
    queryKey: ['userPhotos', userEmail],
    queryFn: () => fetchUserPhotos(userEmail),
    enabled: !!userEmail,
  });

  const userPhoto = photoUsers.length > 0 ? photoUsers[0].url : (currentUser?.photoURL || localStorage.getItem('userPhoto'));
  const displayName = infoUser?.nickname || currentUser?.displayName || localStorage.getItem('userName');

  const { isDarkMode, setIsDarkMode } = useTheme();
  const { user, logout } = useAuth();
  const [profileModal, setProfileModalOpen] = useState(false);
  const containerRef = useRef(null);
  const localBellButtonRef = useRef(null);
  const localDropdownRef = useRef(null);
  const bellButtonRef = externalBellButtonRef || localBellButtonRef;
  const notificationDropdownRef = externalDropdownRef || localDropdownRef;

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (socket) {
      socket.emit('user-online', {
        displayName,
        photoURL: userPhoto,
        email: userEmail,
      });
      const handleFriendRequest = () => {
        fetchNotifications();
      };
      const handleFriendAccept = () => {
        fetchNotifications();
      };
      socket.on('notify-friend-request', handleFriendRequest);
      socket.on('notify-friend-accept', handleFriendAccept);

      return () => {
        socket.off('notify-friend-request', handleFriendRequest);
        socket.off('notify-friend-accept', handleFriendAccept);
      };
    }
  }, [socket, fetchNotifications, displayName, userPhoto, userEmail]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setProfileModalOpen(false);
        toggleNotificationDropdown(false);
      }
    }

    if (profileModal || showNotificationDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileModal, showNotificationDropdown, toggleNotificationDropdown]);

  const handleLogout = async () => {
    if (user && user.email) {
      try {
        localStorage.removeItem('userName');
        localStorage.removeItem('userPhoto');
        logout();
      } catch (error) {
        console.error('❌ Logout failed:', error);
      }
    }
  };

  return (
    <div className={`profile-section ${className}`} ref={containerRef}>
      {showNotification && (
        <>
          <div className="notification-container">
            <div className="row-profile-header">
              {/* ปุ่มสำหรับเริ่มคู่มือแนะนำอีกครั้ง */}
              {onStartTour && ( // แสดงปุ่มนี้ก็ต่อเมื่อมีการส่ง prop onStartTour มาเท่านั้น
                <button
                  onClick={() => {
                    onStartTour();
                    setProfileModalOpen(false);
                  }} // เมื่อกดปุ่ม ให้เริ่มทัวร์และปิดเมนูโปรไฟล์
                  className={`list-profile-menu-item ${isDarkMode ? 'dark-mode' : ''}`}
                >
                  <Info size={20} className="info-icon" /> {/* ใช้ไอคอน Info */}
                </button>
              )}
              <button
                ref={bellButtonRef}
                className="bell-btn-home"
                aria-label="Notifications"
                onClick={() => {
                  toggleNotificationDropdown();
                  setProfileModalOpen(false);
                }}
              >
                <Bell className={`bell-icon ${isDarkMode ? 'dark' : ''}`} />
                {notifications.filter((n) => !n.read).length > 0 && (
                  <span className="notifications-badge">
                    {notifications.filter((n) => !n.read).length}
                  </span>
                )}
              </button>
            </div>
            {showNotificationDropdown && (
              <div
                className={`notification-dropdown ${isDarkMode ? 'dark-mode' : ''}`}
                ref={notificationDropdownRef}
              >
                <div className="notification-header">
                  <h3 className="notification-title">
                    <UserPlus className="notification-title-icon" />
                    Friend Requests
                  </h3>
                  <button
                    onClick={() => toggleNotificationDropdown(false)}
                    className="notification-close-btn"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="notification-summary">
                  <span>
                    {/* {notifications.length}{" "} */}

                    {notifications.filter((n) => n.type === 'friend-request').length}
                  </span>
                  <button onClick={clearReadNotifications} className="notification-clear-btn">
                    Clear Read
                  </button>
                </div>

                <div className="notification-list">
                  {/* 1. Grouped Match Notification (Summary) */}
                  {notifications.filter((n) => n.type === 'match' && !n.read).length > 0 && (
                    <div className="notification-item unread summary-match-item">
                      <div className="notification-item-content">
                        <div className="notification-item-avatar match-avatar">
                          <div className="match-icon-pulse">🔥</div>
                        </div>
                        <div className="notification-item-details">
                          <p className="notification-item-user">Congratulations!</p>
                          <p className="notification-item-message">
                            {notifications.filter((n) => n.type === 'match' && !n.read).length} people are interested in matching with you
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 2. Friend Request Notifications (Individual) */}
                  {notifications && notifications.length > 0 ? (
                    notifications.map((notif) => {
                      // Only show individual items if they are friend requests
                      if (notif.type !== 'friend-request' && notif.type !== undefined) return null;

                      return (
                        <div
                          key={notif.id}
                          data-notification-id={notif.id}
                          className={`notification-item ${notif.read ? 'read' : 'unread'}`}
                          onClick={() => markNotificationAsRead(notif.id)}
                        >
                          <div className="notification-item-content">
                            <div className="notification-item-avatar">
                              <UserAvatar
                                src={notif.from?.photoURL}
                                alt={notif.from?.displayName || 'User'}
                              />
                              {!notif.read && <div className="notification-unread-dot"></div>}
                            </div>

                            <div className="notification-item-details">
                              <div className="notification-item-header">
                                <p className="notification-item-user">
                                  {notif.from?.displayName || 'User'}
                                </p>
                                <span
                                  className={`notification-item-tag ${
                                    isFriend && isFriend(notif.from?.email) ? 'friend' : 'request'
                                  }`}
                                >
                                  {isFriend && isFriend(notif.from?.email) ? 'Friend' : 'Request'}
                                </span>
                              </div>

                              <p className="notification-item-message">
                                {isFriend && isFriend(notif.from?.email)
                                  ? 'youAreNowFriends'
                                  : 'sentYouAFriendRequest'}
                              </p>

                              <p className="notification-item-time">
                                {new Date(notif.timestamp).toLocaleString(undefined, {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>

                              {(!isFriend || !isFriend(notif.from?.email)) && (
                                <div className="notification-item-actions">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleFriendRequestResponse(notif.id, 'accept');
                                    }}
                                    className="btn-accept"
                                  >
                                    <Check size={12} />
                                    Accept
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteFriendRequest(notif.id);
                                    }}
                                    className="btn-decline"
                                  >
                                    <X size={12} />
                                    Decline
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="notification-empty">
                      <Bell className="notification-empty-icon" />
                      <p>No new notifications</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* <select
            onChange={(e) => changeLanguage(e.target.value)}

            className={`language-selector ${isDarkMode ? "dark-mode" : ""}`}
          >
            <option value="en">🇺🇸 EN</option>
            <option value="th">🇹🇭 TH</option>
          </select> */}
          <span className="profile-divider">|</span>
        </>
      )}

      <div
        className="profile-img-wrapper"
        onClick={() => {
          toggleNotificationDropdown(false);
          setProfileModalOpen(!profileModal);
        }}
      >
        <UserAvatar src={userPhoto} alt="Profile" className="profile-image-header" />
      </div>

      <div
        className={`list-profile ${profileModal ? 'active' : ''} ${isDarkMode ? 'dark-mode' : ''}`}
      >
        <div className="list-profile-header">
          <UserAvatar src={userPhoto} alt="Profile" className="list-profile-image" />

          <div>
            <p className="list-profile-name">{displayName}</p>
            <p className="list-profile-email">{userEmail}</p>
          </div>
        </div>

        <div className="list-profile-menu">
          <button onClick={() => setIsDarkMode((prev) => !prev)} className="list-profile-menu-item">
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            <span>{isDarkMode ? 'lightMode' : 'DarkMode'}</span>
          </button>

          <button onClick={handleLogout} className="list-profile-menu-item danger">
            <LogOut size={20} />
            <span>{'logout'}</span>
          </button>
        </div>

        {/* ปุ่มสำหรับเริ่มคู่มือแนะนำอีกครั้ง */}
        {onStartTour && ( // แสดงปุ่มนี้ก็ต่อเมื่อมีการส่ง prop onStartTour มาเท่านั้น
          <button
            onClick={() => {
              onStartTour();
              setProfileModalOpen(false);
            }} // เมื่อกดปุ่ม ให้เริ่มทัวร์และปิดเมนูโปรไฟล์
            className="list-profile-menu-item"
          >
            <Info size={20} /> {/* ใช้ไอคอน Info */}
            <span>{'เริ่มคู่มือแนะนำ'}</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default HeaderProfile;
