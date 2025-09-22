// components/RequireLogin.jsx
// import { Button } from "@";
import { Button } from "../ui";
import { useNavigate } from "react-router-dom";

const RequireLogin = ({ children }) => {
  const navigate = useNavigate();
  const userName = localStorage.getItem("userName");
  const userEmail = localStorage.getItem("userEmail");

  if (!userName || !userEmail) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-full">
        <div className="text-center mt-10 w-full">
          <h2 className="text-xl font-semibold">
            กรุณาเข้าสู่ระบบก่อนเข้าใช้งาน
          </h2>
          <Button
            className="mt-4 px-6 py-2 font-semibold text-white bg-gradient-to-r from-purple-600 to-blue-500 rounded-lg shadow-md hover:shadow-lg hover:-translate-y-0.5 transform transition-all duration-300 ease-in-out"
            onClick={() => navigate("/login")}
          >
            ไปหน้าเข้าสู่ระบบ
          </Button>

        </div>
      </div>
    );
  }

  return children;
};

export default RequireLogin;
