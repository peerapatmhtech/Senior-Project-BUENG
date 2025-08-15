import React, { useState, useEffect } from "react";
import RequireLogin from "../ui/RequireLogin";
import { IoIosSearch } from "react-icons/io";
import { FaChevronDown, FaChevronRight } from "react-icons/fa";
import { useTheme } from "../context/themecontext";
import "./setup.css";

const setup = () => {
  // const [darkMode, setDarkMode] = useState(false);
  const [language, setLanguage] = useState("en");
  const [openSettings, setOpenSettings] = useState({});
  const { isDarkMode, setIsDarkMode } = useTheme();

  const settingsList = [
    {
      key: "account",
      title: language === "th" ? "การตั้งค่าบัญชี" : "Account Settings",
    },
    {
      key: "notifications",
      title: language === "th" ? "การแจ้งเตือน" : "Notifications",
    },
    {
      key: "privacy",
      title: language === "th" ? "ความเป็นส่วนตัว" : "Privacy",
    },
  ];

  const toggleOpen = (key) => {
    setOpenSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  const changeLanguage = (lang) => {
    setLanguage(lang);
    // ในอนาคตสามารถใช้ i18n ได้
  };
  useEffect(() => {
    // เพิ่ม/ลบ class "dark" ที่ html tag ทันทีเมื่อเปลี่ยน
    const html = document.documentElement;
    if (isDarkMode) {
      html.classList.add("dark");
    } else {
      html.classList.remove("dark");
    }

    // เก็บค่าลง localStorage ด้วย
    localStorage.setItem("darkMode", isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    document.body.className = isDarkMode ? "dark" : "";
  }, [isDarkMode]);

  return (
    <RequireLogin>
      <div className={`container-profile ${isDarkMode ? "dark-mode" : ""}`}>
        <div className="con-header">
          <div className="header-setup">
            <h1>{language === "th" ? "ตั้งค่า" : "Setup"}</h1>
            <div className="setting-actions">
              <button onClick={() => setIsDarkMode((prev) => !prev)}>{isDarkMode ? "☀️" : "🌙"}</button>
              <select
                onChange={(e) => changeLanguage(e.target.value)}
                value={language}
              >
                <option value="en">EN</option>
                <option value="th">TH</option>
              </select>
            </div>
          </div>
        </div>
        <div className="search-input-setup">
          <div className="row-setup-input">
            <div className="emoji-right">
              <IoIosSearch />
            </div>
            <input
              type="text"
              placeholder={
                language === "th" ? "เขียนบางอย่าง..." : "Writing something..."
              }
              className="chat-input-setup"
            />
          </div>
        </div>

        <div className="bg-setup-content">
          <div className="bg-card-content">
            {settingsList.map((setting) => (
              <div className="card-con" key={setting.key}>
                <div
                  className="card-title"
                  onClick={() => toggleOpen(setting.key)}
                >
                  {setting.title}
                  <div className="card-svg">
                    <div className="favorite-toggle">
                      {openSettings[setting.key] ? (
                        <FaChevronDown />
                      ) : (
                        <FaChevronRight />
                      )}
                    </div>
                  </div>
                </div>

                <div
                  className={`card-detail-wrapper ${openSettings[setting.key] ? "open" : ""
                    }`}
                >
                  <div className="card-detail-content">
                    <p>รายละเอียดของ {setting.title}</p>
                    {/* สามารถใส่ input, toggle หรืออื่นๆ ได้ตรงนี้ */}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </RequireLogin>
  );
};

export default setup;
