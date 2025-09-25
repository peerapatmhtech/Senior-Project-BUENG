import { Link, useLocation } from "react-router-dom";
import "./Navbar.css";
import { useAuth } from "../backend/src/firebase/Authcontext";
import { useTheme } from "../frontend/src/context/themecontext";
import {
  FaUsers,
  FaUserFriends,
  FaUserCircle,
} from "react-icons/fa";
import { BsFillChatLeftDotsFill } from "react-icons/bs";
import { IoHomeSharp, IoLogOutOutline } from "react-icons/io5";

const Navbar = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { isDarkMode } = useTheme();

  const handleLogout = async () => {
    if (user && user.email) {
      try {
        await fetch(`/api/logout`, {
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

  // Updated isActive function to handle nested routes
  const isActive = (path) => location.pathname.startsWith(path);

  const menuItems = [
    { path: "/home", icon: <IoHomeSharp className="icon-nav" />, text: "Home" },
    { path: "/community", icon: <FaUsers className="icon-nav" />, text: "Community" },
    { path: "/friend", icon: <FaUserFriends className="icon-nav" />, text: "Friend" },
    { path: "/chat", icon: <BsFillChatLeftDotsFill className="icon-nav" />, text: "Chat" },
    { path: "/profile", icon: <FaUserCircle className="icon-nav" />, text: "Profile" },
  ];

  return (
    <div className={`navbar-container ${isDarkMode ? "dark-mode" : ""}`}>
      <Link to="/home" className="logo-con">
        <h3>Find Friend</h3>
      </Link>

      <ul className="menu-bar">
        {menuItems.map((item) => {
          // Special handling for chat route to not be active everywhere
          const chatPath = item.path === '/chat' ? '/chat' : item.path;
          const activeClass = location.pathname.startsWith(chatPath) && (chatPath !== '/chat' || location.pathname.includes('/chat/')) ? "active" : "";

          // For chat, we might not have a generic /chat page, so link to a default/recent room or handle differently
          const toPath = item.path === '/chat' ? '/chat/some-default-room' : item.path; // Or handle as needed

          return (
            <li key={item.path}>
              <Link to={toPath} className={`menu-link ${activeClass}`}>
                {item.icon}
                <span className="text-nav">{item.text}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="logout-section">
        {user ? (
          <div className="logout-link" onClick={handleLogout}>
            <IoLogOutOutline className="icon-nav" />
            <span className="text-nav">Logout</span>
          </div>
        ) : (
          <Link to="/login" className={`menu-link ${isActive("/login")}`}>
            <IoLogOutOutline className="icon-nav" />
            <span className="text-nav">Login</span>
          </Link>
        )}
      </div>
    </div>
  );
};

export default Navbar;