import React, { useRef, useState, useEffect } from "react";
import { useTheme } from "../context/themecontext";
import { useNotifications } from "../context/notificationContext";
import "./HeaderProfile.css";
import { useAuth } from "../../../backend/src/firebase/Authcontext";
import { Bell, LogOut, Sun, Moon, X, Check, UserPlus } from "lucide-react";

const HeaderProfile = ({
  showNotification = true,
  className = "",
  bellButtonRef: externalBellButtonRef,
  notificationDropdownRef: externalDropdownRef,
  isFriend,
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

  const userPhoto = localStorage.getItem("userPhoto");
  const displayName = localStorage.getItem("userName");
  const userEmail = localStorage.getItem("userEmail");

  const { isDarkMode, setIsDarkMode } = useTheme();
  const { user, logout } = useAuth();
  const [language, setLanguage] = useState("en");
  const [profileModal, setProfileModalOpen] = useState(false);
  const containerRef = useRef(null);
  const localBellButtonRef = useRef(null);
  const localDropdownRef = useRef(null);
  const bellButtonRef = externalBellButtonRef || localBellButtonRef;
  const notificationDropdownRef = externalDropdownRef || localDropdownRef;

  const changeLanguage = (lang) => {
    setLanguage(lang);
  };

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (socket) {
      socket.emit("user-online", {
        displayName,
        photoURL: userPhoto,
        email: userEmail,
      });
      const handleFriendRequest = (data) => {
        console.log("Received notify-friend-request in HeaderProfile:", data);
        fetchNotifications();
      };
      const handleFriendAccept = (data) => {
        console.log("Received notify-friend-accept in HeaderProfile:", data);
        fetchNotifications();
      };
      socket.on("notify-friend-request", handleFriendRequest);
      socket.on("notify-friend-accept", handleFriendAccept);

      return () => {
        socket.off("notify-friend-request", handleFriendRequest);
        socket.off("notify-friend-accept", handleFriendAccept);
      };
    }
  }, [socket, fetchNotifications, displayName, userPhoto, userEmail]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setProfileModalOpen(false);
        toggleNotificationDropdown(false);
      }
    }

    if (profileModal || showNotificationDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [profileModal, showNotificationDropdown, toggleNotificationDropdown]);

  const handleLogout = async () => {
    if (user && user.email) {
      try {
        await fetch(`${import.meta.env.VITE_APP_API_BASE_URL}/api/logout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: user.email }),
        });
        localStorage.removeItem("userName");
        localStorage.removeItem("userPhoto");
        logout();
      } catch (error) {
        console.error("❌ Logout failed:", error);
      }
    }
  };

  return (
    <div className={`profile-section ${className}`} ref={containerRef}>
      {showNotification && (
        <>
          <div className="notification-container">
            <button
              ref={bellButtonRef}
              className="bell-btn-home"
              aria-label="Notifications"
              onClick={() => {
                toggleNotificationDropdown();
                setProfileModalOpen(false);
              }}
            >
              <Bell className={`bell-icon ${isDarkMode ? "dark" : ""}`} />
              {notifications.filter((n) => !n.read).length > 0 && (
                <span className="notifications-badge">
                  {notifications.filter((n) => !n.read).length}
                </span>
              )}
            </button>

            {showNotificationDropdown && (
              <div
                className={`notification-dropdown ${isDarkMode ? "dark-mode" : ""}`}
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
                    Total: {notifications.length} | Requests:{" "}
                    {
                      notifications.filter((n) => n.type === "friend-request")
                        .length
                    }
                  </span>
                  <button
                    onClick={clearReadNotifications}
                    className="notification-clear-btn"
                  >
                    Clear Read
                  </button>
                </div>

                <div className="notification-list">
                  {notifications && notifications.length > 0 ? (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        data-notification-id={notif.id}
                        className={`notification-item ${notif.read ? "read" : "unread"}`}
                        onClick={() => markNotificationAsRead(notif.id)}
                      >
                        <div className="notification-item-content">
                          <div className="notification-item-avatar">
                            <img
                              src={
                                notif.from?.photoURL ||
                                "https://via.placeholder.com/40"
                              }
                              alt={notif.from?.displayName || "User"}
                            />
                            {!notif.read && (
                              <div className="notification-unread-dot"></div>
                            )}
                          </div>

                          <div className="notification-item-details">
                            <div className="notification-item-header">
                              <p className="notification-item-user">
                                {notif.from?.displayName || "User"}
                              </p>
                              <span
                                className={`notification-item-tag ${
                                  isFriend && isFriend(notif.from?.email)
                                    ? "friend"
                                    : "request"
                                }`}
                              >
                                {isFriend && isFriend(notif.from?.email)
                                  ? "Friend"
                                  : "Request"}
                              </span>
                            </div>

                            <p className="notification-item-message">
                              {isFriend && isFriend(notif.from?.email)
                                ? "You are now friends"
                                : "Sent you a friend request"}
                            </p>

                            <p className="notification-item-time">
                              {new Date(notif.timestamp).toLocaleString(
                                "en-US",
                                {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </p>

                            {(!isFriend || !isFriend(notif.from?.email)) && (
                              <div className="notification-item-actions">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleFriendRequestResponse(
                                      notif.id,
                                      "accept"
                                    );
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
                    ))
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

          <select
            onChange={(e) => changeLanguage(e.target.value)}
            value={language}
            className={`language-selector ${isDarkMode ? "dark-mode" : ""}`}
          >
            <option value="en">🇺🇸 EN</option>
            <option value="th">🇹🇭 TH</option>
          </select>
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
        <img src={userPhoto} alt="Profile" className="profile-image-header" />
      </div>

      <div
        className={`list-profile ${profileModal ? "active" : ""} ${
          isDarkMode ? "dark-mode" : ""
        }`}
      >
        <div className="list-profile-header">
          <img
            src={userPhoto}
            alt="Profile"
            className="list-profile-image"
          />
          <div>
            <p className="list-profile-name">{displayName}</p>
            <p className="list-profile-email">{userEmail}</p>
          </div>
        </div>

        <div className="list-profile-menu">
          <button
            onClick={() => setIsDarkMode((prev) => !prev)}
            className="list-profile-menu-item"
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            <span>{isDarkMode ? "Light Mode" : "Dark Mode"}</span>
          </button>

          <button
            onClick={handleLogout}
            className="list-profile-menu-item danger"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default HeaderProfile;