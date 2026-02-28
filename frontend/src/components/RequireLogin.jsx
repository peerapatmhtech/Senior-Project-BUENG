import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContextProvider';
import './RequireLogin.css';

const RequireLogin = ({ children }) => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const userName = localStorage.getItem('userName');
  const userEmail = localStorage.getItem('userEmail');

  console.log('🛡️ [DEBUG] RequireLogin check:', {
    loading,
    user: user?.email || 'null',
    userName,
    userEmail,
  });

  if (loading) return null;

  if (!user || !userName || !userEmail) {
    console.log('🛡️ [DEBUG] RequireLogin BLOCKED — missing:', {
      user: !user,
      userName: !userName,
      userEmail: !userEmail,
    });
    return (
      <div className="require-login-container">
        <div className="require-login-content">
          <h2 className="require-login-heading">กรุณาเข้าสู่ระบบก่อนเข้าใช้งาน</h2>
          <div className="require-login-button" onClick={() => navigate('/login')}>
            ไปหน้าเข้าสู่ระบบ
          </div>
        </div>
      </div>
    );
  }

  return children;
};

export default RequireLogin;
