import React, { useRef, useState } from "react";
import { useTheme } from "../context/themecontext";
import { useNotifications } from "../context/notificationContext";
import "./HeaderProfile.css";
import { useAuth } from "../../../backend/src/firebase/Authcontext";

/**
 * HeaderProfile - รูปโปรไฟล์และปุ่มแจ้งเตือนที่สามารถใช้ร่วมกันในหลาย component
 * @param {Object} props - Props ของ component
 * @param {string} props.userPhoto - URL ของรูปภาพโปรไฟล์ผู้ใช้
 * @param {boolean} [props.showNotification=true] - แสดงปุ่มการแจ้งเตือนหรือไม่
 * @param {string} [props.className=""] - className เพิ่มเติมสำหรับ container
 * @param {function} [props.customNotificationContent] - ฟังก์ชันที่รับ notifications และ notificationDropdownRef และคืนค่า JSX สำหรับแสดงข้อมูลใน dropdown
 * @param {boolean} [props.useDropdown=false] - แสดง dropdown หรือไม่
 * @param {React.RefObject} [props.bellButtonRef] - Ref สำหรับปุ่มแจ้งเตือน
 * @param {React.RefObject} [props.notificationDropdownRef] - Ref สำหรับ dropdown แจ้งเตือน
 * @param {function} [props.isFriend] - ฟังก์ชันสำหรับตรวจสอบว่าเป็นเพื่อนกันหรือไม่
 * @returns {React.Component} HeaderProfile component
 */
const HeaderProfile = ({
  showNotification = true,
  className = "",
  customNotificationContent,
  useDropdown = false,
  bellButtonRef: externalBellButtonRef,
  notificationDropdownRef: externalDropdownRef,
  isFriend,
}) => {
  const userPhoto = localStorage.getItem("userPhoto");
  const displayName = localStorage.getItem("userName");
  const userEmail = localStorage.getItem("userEmail");

  ////////Dark Mode///
  const { isDarkMode, setIsDarkMode } = useTheme();

  ///Logout////
  const { user, logout } = useAuth();

  /////Chance Language/////
  const [language, setLanguage] = useState("en");

  const [profileModal, setProfileModalOpen] = useState(false);
  // ถ้าไม่มี userPhoto ใช้ default image

  // Local refs ถ้าไม่มี external refs
  const localBellButtonRef = useRef(null);
  const localDropdownRef = useRef(null);

  // ใช้ refs จากภายนอกถ้ามี หรือไม่ก็ใช้ local refs
  const bellButtonRef = externalBellButtonRef || localBellButtonRef;
  const notificationDropdownRef = externalDropdownRef || localDropdownRef;

  // ใช้ข้อมูลจาก notification context
  const {
    notifications,
    showNotificationDropdown,
    toggleNotificationDropdown,
    markNotificationAsRead,
    clearReadNotifications,
    handleFriendRequestResponse,
    handleDeleteFriendRequest,
  } = useNotifications();
  ////////Change Langue///////
  const changeLanguage = (lang) => {
    setLanguage(lang);
  };

  ////////Logout////////
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
    <div className={`profile-section ${className}`}>
      {showNotification && (
        <>
          <div className="notification-wrapper">
            <button
              ref={bellButtonRef}
              className="bell-btn"
              aria-label="Notifications"
              onClick={() => toggleNotificationDropdown()}
            >
              <span className="bell-icon">&#128276;</span>
              {notifications &&
                notifications.filter((n) => !n.read).length > 0 && (
                  <span className="notification-badge">
                    {notifications.filter((n) => !n.read).length}
                  </span>
                )}
            </button>

            {/* Notification Dropdown */}
            {useDropdown && showNotificationDropdown && (
              <div
                className="notification-dropdown"
                ref={notificationDropdownRef}
              >
                {customNotificationContent ? (
                  customNotificationContent(
                    notifications,
                    notificationDropdownRef,
                    {
                      markNotificationAsRead,
                      clearReadNotifications,
                      handleFriendRequestResponse,
                      handleDeleteFriendRequest,
                      isFriend,
                    }
                  )
                ) : (
                  <div className="notification-default">
                    <h3>การแจ้งเตือน</h3>
                    {notifications && notifications.length > 0 ? (
                      <>
                        <div className="notification-header">
                          <button
                            className="clear-read-button"
                            onClick={clearReadNotifications}
                          >
                            ล้างที่อ่านแล้ว
                          </button>
                        </div>
                        <ul className="notification-list">
                          {notifications.map((notif) => (
                            <li
                              key={notif.id}
                              data-notification-id={notif.id}
                              className={`notification-item ${
                                notif.read ? "read" : "unread"
                              }`}
                              onClick={() => markNotificationAsRead(notif.id)}
                            >
                              <img
                                src={
                                  notif.from?.photoURL ||
                                  "https://via.placeholder.com/40"
                                }
                                alt={notif.from?.displayName || "ผู้ใช้"}
                                className="notification-avatar"
                              />
                              <div className="notification-message">
                                <strong>
                                  {notif.from?.displayName || "ผู้ใช้"}
                                </strong>{" "}
                                ส่งคำขอเป็นเพื่อน
                              </div>
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : (
                      <p className="no-notifications">ไม่มีการแจ้งเตือนใหม่</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          <select
            onChange={(e) => changeLanguage(e.target.value)}
            value={language}
          >
            <option value="en">EN</option>
            <option value="th">TH</option>
          </select>
          <span className="profile-divider">|</span>
        </>
      )}

      <div
        className="profile-img-wrapper"
        onClick={() => setProfileModalOpen(!profileModal)}
      >
        <img src={userPhoto} alt="Profile" className="profile-image" />
      </div>
      <div
        className={`list-profile ${profileModal ? "active" : ""} ${
          isDarkMode ? "dark-mode" : ""
        }`}
      >
        {" "}
        <div className="box-proflie-user">
          <div className="row-profile-list">
            <img src={userPhoto} alt="Profile" className="profile-list-image" />
          </div>

          <p className="profile-list-name">{displayName}</p>
          <p className="profile-list-email">{userEmail}</p>
        </div>
        <button
          onClick={() => setIsDarkMode((prev) => !prev)}
          className={`dark-mode-button ${isDarkMode ? "dark-mode" : ""}`}
        >
          <span>{isDarkMode ? "Light Mode" : "Dark Mode"}</span>{" "}
          {isDarkMode ? "☀️" : "🌙"}
        </button>
        <button
          className={`logout-button ${isDarkMode ? "dark-mode" : ""}`}
          onClick={handleLogout}
        >
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default HeaderProfile;
