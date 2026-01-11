import { Link, useLocation } from "react-router-dom";
import "./Navbar.css";
import { useTheme } from "./context/themecontext";
import { FaUsers, FaUserFriends, FaUserCircle } from "react-icons/fa";
import { BsFillChatLeftDotsFill } from "react-icons/bs";
import { IoHomeSharp } from "react-icons/io5";

const Navbar = () => {
  const location = useLocation();
  const { isDarkMode } = useTheme();

  // Updated isActive function to handle nested routes

  const menuItems = [
    { path: "/home", icon: <IoHomeSharp className="icon-nav" />, text: "Home" },
    {
      path: "/community",
      icon: <FaUsers className="icon-nav" />,
      text: "Community",
    },
    {
      path: "/friend",
      icon: <FaUserFriends className="icon-nav" />,
      text: "Friend",
    },
    {
      path: "/chat",
      icon: <BsFillChatLeftDotsFill className="icon-nav" />,
      text: "Chat",
    },
    {
      path: "/profile",
      icon: <FaUserCircle className="icon-nav" />,
      text: "Profile",
    },
  ];

  return (
    <div className={`navbar-container ${isDarkMode ? "dark-mode" : ""}`}>
      <Link to="/home" className="logo-con">
        <h3>Find Friend</h3>
      </Link>

      <ul className="menu-bar">
        {menuItems.map((item) => {
          // Special handling for chat route to not be active everywhere
          const chatPath = item.path === "/chat" ? "/chat" : item.path;
          const activeClass =
            location.pathname.startsWith(chatPath) &&
            (chatPath !== "/chat" || location.pathname.includes("/chat/"))
              ? "active"
              : "";

          // For chat, we might not have a generic /chat page, so link to a default/recent room or handle differently
          const toPath =
            item.path === "/chat" ? "/chat/some-default-room" : item.path; // Or handle as needed

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
    </div>
  );
};

export default Navbar;
