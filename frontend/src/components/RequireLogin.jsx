import { useNavigate } from "react-router-dom";
import "./RequireLogin.css";

const RequireLogin = ({ children }) => {
  const navigate = useNavigate();
  const userName = localStorage.getItem("userName");
  const userEmail = localStorage.getItem("userEmail");
  if (!userName || !userEmail) {
    return (
      <div className="require-login-container">
        <div className="require-login-content">
          <h2 className="require-login-heading">
            กรุณาเข้าสู่ระบบก่อนเข้าใช้งาน
          </h2>
          <div
            className="require-login-button"
            onClick={() => navigate("/login")}
          >
            ไปหน้าเข้าสู่ระบบ
          </div>
        </div>
      </div>
    );
  }

  return children;
};

export default RequireLogin;
