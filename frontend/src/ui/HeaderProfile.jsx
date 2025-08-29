import React, { useRef, useState, useEffect } from "react";
import { useTheme } from "../context/themecontext";
import { useNotifications } from "../context/notificationContext";
import "./HeaderProfile.css";
import { useAuth } from "../../../backend/src/firebase/Authcontext";
import { Bell, User, Settings, LogOut, Sun, Moon, Globe, X, Check, UserPlus } from 'lucide-react';

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

  /////Change Language/////
  const [language, setLanguage] = useState("en");

  const [profileModal, setProfileModalOpen] = useState(false);

  // เพิ่ม containerRef สำหรับ profile section
  const containerRef = useRef(null);

  // Local refs ถ้าไม่มี external refs
  const localBellButtonRef = useRef(null);
  const localDropdownRef = useRef(null);

  // ใช้ refs จากภายนอกถ้ามี หรือไม่ก็ใช้ local refs
  const bellButtonRef = externalBellButtonRef || localBellButtonRef;
  const notificationDropdownRef = externalDropdownRef || localDropdownRef;

  //////////Notification/////

  // ใช้ข้อมูลจาก notification context
  const {
    notifications,
    newFriendRequest,
    showNotificationDropdown,
    toggleNotificationDropdown,
    fetchNotifications,
    markNotificationAsRead,
    clearReadNotifications,
    handleFriendRequestResponse,
    handleDeleteFriendRequest,
  } = useNotifications();

  ////////Change Language///////
  const changeLanguage = (lang) => {
    setLanguage(lang);
  };

  useEffect(() => {
    fetchNotifications();
  }, []);
  // useEffect สำหรับตรวจจับการคลิกนอก profile modal
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setProfileModalOpen(false);
      }
    }

    // เพิ่ม event listener เมื่อ profile modal เปิดอยู่
    if (profileModal) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    // ลบ event listener เมื่อ component unmount หรือ modal ปิด
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [profileModal]); // เพิ่ม profileModal เป็น dependency

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
    <div className={`profile-section ${className}`} ref={containerRef}>
      {showNotification && (
        <>
          <div className="notification-container">
            <button
              ref={bellButtonRef}
              className="bell-btn-home"
              aria-label="Notifications"
              onClick={() => toggleNotificationDropdown()}
            >
              <Bell className="w-5 h-5" />
              {notifications.filter((n) => !n.read).length > 0 && (
                <span className="notifications-badge">
                  {notifications.filter((n) => !n.read).length}
                </span>
              )}
            </button>

            {/* Notification Dropdown - ปรับปรุงใหม่ด้วย Tailwind */}
            {showNotificationDropdown && (
              <div
                className={`notification-dropdown ${isDarkMode ? 'dark-mode' : ''}`}
                ref={notificationDropdownRef}
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: '0',
                  marginTop: '8px',
                  width: '400px',
                  maxWidth: '90vw',
                  backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                  border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
                  borderRadius: '16px',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                  zIndex: 50,
                  maxHeight: '400px',
                  overflow: 'hidden'
                }}
              >
                {/* Header */}
                <div 
                  style={{
                    padding: '16px',
                    borderBottom: `1px solid ${isDarkMode ? '#374151' : '#f3f4f6'}`
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '12px'
                  }}>
                    <h3 style={{
                      fontSize: '18px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      color: isDarkMode ? '#ffffff' : '#111827'
                    }}>
                      <UserPlus style={{ width: '20px', height: '20px', marginRight: '8px', color: '#3b82f6' }} />
                      การแจ้งเตือนคำขอเป็นเพื่อน
                    </h3>
                    <button
                      onClick={() => toggleNotificationDropdown(false)}
                      style={{
                        padding: '4px',
                        borderRadius: '8px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: isDarkMode ? '#9ca3af' : '#6b7280'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = isDarkMode ? '#374151' : '#f3f4f6'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      <X style={{ width: '16px', height: '16px' }} />
                    </button>
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '14px',
                    color: '#6b7280'
                  }}>
                    <span>
                      ทั้งหมด: {notifications.length} | คำขอเพื่อน: {notifications.filter(n => n.type === "friend-request").length}
                    </span>
                    <button
                      onClick={clearReadNotifications}
                      style={{
                        color: '#3b82f6',
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                      onMouseEnter={(e) => e.target.style.color = '#2563eb'}
                      onMouseLeave={(e) => e.target.style.color = '#3b82f6'}
                    >
                      ล้างที่อ่านแล้ว
                    </button>
                  </div>
                </div>

                {/* Notification List */}
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {notifications && notifications.length > 0 ? (
                    <div>
                      {notifications.map((notif) => (
                        <div
                          key={notif.id}
                          data-notification-id={notif.id}
                          style={{
                            padding: '16px',
                            borderBottom: `1px solid ${isDarkMode ? '#374151' : '#f3f4f6'}`,
                            backgroundColor: notif.read 
                              ? (isDarkMode ? '#1f2937' : '#f9fafb') 
                              : (isDarkMode ? '#1e3a8a20' : '#dbeafe'),
                            cursor: 'pointer',
                            transition: 'all 0.3s ease'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = isDarkMode ? '#374151' : '#f3f4f6'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = notif.read 
                            ? (isDarkMode ? '#1f2937' : '#f9fafb') 
                            : (isDarkMode ? '#1e3a8a20' : '#dbeafe')}
                          onClick={() => markNotificationAsRead(notif.id)}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                            <div style={{ position: 'relative' }}>
                              <img
                                src={notif.from?.photoURL || "https://via.placeholder.com/40"}
                                alt={notif.from?.displayName || "ผู้ใช้"}
                                style={{
                                  width: '48px',
                                  height: '48px',
                                  borderRadius: '50%',
                                  objectFit: 'cover'
                                }}
                              />
                              {!notif.read && (
                                <div style={{
                                  position: 'absolute',
                                  top: '-4px',
                                  right: '-4px',
                                  width: '16px',
                                  height: '16px',
                                  backgroundColor: '#3b82f6',
                                  borderRadius: '50%'
                                }}></div>
                              )}
                            </div>
                            
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                <p style={{
                                  fontWeight: '500',
                                  fontSize: '14px',
                                  margin: 0,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  color: isDarkMode ? '#ffffff' : '#111827'
                                }}>
                                  {notif.from?.displayName || "ผู้ใช้"}
                                </p>
                                <span style={{
                                  padding: '2px 8px',
                                  fontSize: '12px',
                                  borderRadius: '9999px',
                                  backgroundColor: isFriend && isFriend(notif.from?.email)
                                    ? '#dcfce7'
                                    : '#fef3c7',
                                  color: isFriend && isFriend(notif.from?.email)
                                    ? '#166534'
                                    : '#92400e'
                                }}>
                                  {isFriend && isFriend(notif.from?.email) ? "เพื่อนแล้ว" : "คำขอเพื่อน"}
                                </span>
                              </div>
                              
                              <p style={{
                                fontSize: '14px',
                                color: '#6b7280',
                                margin: '0 0 8px 0'
                              }}>
                                {isFriend && isFriend(notif.from?.email)
                                  ? "เป็นเพื่อนกันแล้ว"
                                  : "ส่งคำขอเป็นเพื่อน"}
                              </p>
                              
                              <p style={{
                                fontSize: '12px',
                                color: '#9ca3af',
                                margin: '0 0 12px 0'
                              }}>
                                {new Date(notif.timestamp).toLocaleString("th-TH")}
                              </p>

                              {(!isFriend || !isFriend(notif.from?.email)) && (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      console.log("กำลังยอมรับคำขอเพื่อน ID:", notif.id);
                                      handleFriendRequestResponse(notif.id, "accept");
                                    }}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      padding: '6px 12px',
                                      backgroundColor: '#10b981',
                                      color: 'white',
                                      fontSize: '12px',
                                      borderRadius: '8px',
                                      border: 'none',
                                      cursor: 'pointer',
                                      transition: 'background-color 0.3s ease'
                                    }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = '#059669'}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = '#10b981'}
                                  >
                                    <Check style={{ width: '12px', height: '12px', marginRight: '4px' }} />
                                    ยอมรับ
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      console.log("กำลังลบคำขอเพื่อน ID:", notif.id);
                                      handleDeleteFriendRequest(notif.id);
                                    }}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      padding: '6px 12px',
                                      backgroundColor: '#ef4444',
                                      color: 'white',
                                      fontSize: '12px',
                                      borderRadius: '8px',
                                      border: 'none',
                                      cursor: 'pointer',
                                      transition: 'background-color 0.3s ease'
                                    }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = '#dc2626'}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = '#ef4444'}
                                  >
                                    <X style={{ width: '12px', height: '12px', marginRight: '4px' }} />
                                    ปฏิเสธ
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{
                      padding: '32px',
                      textAlign: 'center',
                      color: '#6b7280'
                    }}>
                      <Bell style={{ width: '48px', height: '48px', margin: '0 auto 12px auto', opacity: 0.5 }} />
                      <p style={{ margin: 0 }}>ไม่มีการแจ้งเตือนใหม่</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Language Selector with improved styling */}
          <select
            onChange={(e) => changeLanguage(e.target.value)}
            value={language}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: `1px solid ${isDarkMode ? '#374151' : '#d1d5db'}`,
              backgroundColor: isDarkMode ? '#374151' : '#ffffff',
              color: isDarkMode ? '#ffffff' : '#111827',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            <option value="en">🇺🇸 EN</option>
            <option value="th">🇹🇭 TH</option>
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
      
      {/* Profile Modal - ปรับปรุงใหม่ */}
      <div
        className={`list-profile ${profileModal ? "active" : ""} ${
          isDarkMode ? "dark-mode" : ""
        }`}
        style={{
          position: 'absolute',
          top: '100%',
          right: '0',
          marginTop: '8px',
          width: '280px',
          backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
          border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
          borderRadius: '16px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          zIndex: 50,
          transform: profileModal ? 'translateY(0) scale(1)' : 'translateY(-10px) scale(0.95)',
          opacity: profileModal ? 1 : 0,
          visibility: profileModal ? 'visible' : 'hidden',
          transition: 'all 0.3s ease'
        }}
      >
        {/* User Info Section */}
        <div style={{
          padding: '16px',
          borderBottom: `1px solid ${isDarkMode ? '#374151' : '#f3f4f6'}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img 
              src={userPhoto} 
              alt="Profile" 
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                objectFit: 'cover'
              }}
            />
            <div>
              <p style={{
                fontWeight: '600',
                fontSize: '16px',
                margin: '0 0 4px 0',
                color: isDarkMode ? '#ffffff' : '#111827'
              }}>
                {displayName}
              </p>
              <p style={{
                fontSize: '14px',
                color: '#6b7280',
                margin: 0
              }}>
                {userEmail}
              </p>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div style={{ padding: '8px' }}>
          <button
            onClick={() => setIsDarkMode((prev) => !prev)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: 'transparent',
              color: isDarkMode ? '#ffffff' : '#374151',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'background-color 0.3s ease'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = isDarkMode ? '#374151' : '#f3f4f6'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            {isDarkMode ? <Sun style={{ width: '20px', height: '20px' }} /> : <Moon style={{ width: '20px', height: '20px' }} />}
            <span>{isDarkMode ? "Light Mode" : "Dark Mode"}</span>
          </button>

          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: 'transparent',
              color: '#ef4444',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'background-color 0.3s ease'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = isDarkMode ? '#7f1d1d20' : '#fef2f2'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            <LogOut style={{ width: '20px', height: '20px' }} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default HeaderProfile;