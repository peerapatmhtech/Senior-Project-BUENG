import React, { useState } from 'react';
import { useAuth } from '../firebase/Authcontext';
import { useNavigate } from 'react-router-dom';
import './EmailLogin.css';

const EmailLogin = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { loginWithEmail, registerWithEmail } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError(''); // ลบ error เมื่อมีการพิมพ์
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // ตรวจสอบ email domain
      if (!formData.email.endsWith('@bumail.net')) {
        throw new Error('กรุณาใช้อีเมล @bumail.net เท่านั้น');
      }

      if (isRegister) {
        // ตรวจสอบรหัสผ่าน
        if (formData.password !== formData.confirmPassword) {
          throw new Error('รหัสผ่านไม่ตรงกัน');
        }
        if (formData.password.length < 6) {
          throw new Error('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
        }
        if (!formData.displayName.trim()) {
          throw new Error('กรุณากรอกชื่อที่แสดง');
        }

        await registerWithEmail(formData.email, formData.password, formData.displayName);
        alert('สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ');
        setIsRegister(false);
        setFormData({ email: '', password: '', confirmPassword: '', displayName: '' });
      } else {
        const result = await loginWithEmail(formData.email, formData.password);
        const user = result.user;
        console.log('User:', result);
        console.log('User:', user);


        // ส่งข้อมูลผู้ใช้ไปยัง backend (MongoDB)
        await axios.post(`${import.meta.env.VITE_APP_API_BASE_URL}/api/login`, {
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
        });

        localStorage.setItem('userName', user.displayName);
        localStorage.setItem('userPhoto', user.photoURL);
        localStorage.setItem('userEmail', user.email);

        setTimeout(() => {
          navigate("/home");
        }, 500);
      }
    } catch (error) {
      console.error('Auth error:', error);

      // แปล Firebase error messages
      let errorMessage = error.message;
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'ไม่พบผู้ใช้นี้ กรุณาสมัครสมาชิกก่อน';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'รหัสผ่านไม่ถูกต้อง';
      } else if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'อีเมลนี้มีผู้ใช้แล้ว';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'รหัสผ่านไม่แข็งแรงพอ';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'รูปแบบอีเมลไม่ถูกต้อง';
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="email-login-container">
      <div className="email-login-card">
        <h2>{isRegister ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}</h2>
        <p className="email-login-subtitle">
          สำหรับนักศึกษา Burapha University (@bumail.net)
        </p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="email-login-form">
          {isRegister && (
            <div className="form-group">
              <label>ชื่อที่แสดง</label>
              <input
                type="text"
                name="displayName"
                value={formData.displayName}
                onChange={handleChange}
                placeholder="กรอกชื่อของคุณ"
                required={isRegister}
              />
            </div>
          )}

          <div className="form-group">
            <label>อีเมล</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="yourname@bumail.net"
              required
            />
          </div>

          <div className="form-group">
            <label>รหัสผ่าน</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="กรอกรหัสผ่าน"
              required
              minLength={6}
            />
          </div>

          {isRegister && (
            <div className="form-group">
              <label>ยืนยันรหัสผ่าน</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="กรอกรหัสผ่านอีกครั้ง"
                required
                minLength={6}
              />
            </div>
          )}

          <button
            type="submit"
            className="email-login-btn"
            disabled={loading}
          >
            {loading ? 'กำลังดำเนินการ...' : (isRegister ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ')}
          </button>
        </form>

        <div className="email-login-toggle">
          {isRegister ? (
            <p>
              มีบัญชีแล้ว?{' '}
              <button
                type="button"
                onClick={() => setIsRegister(false)}
                className="toggle-btn"
              >
                เข้าสู่ระบบ
              </button>
            </p>
          ) : (
            <p>
              ยังไม่มีบัญชี?{' '}
              <button
                type="button"
                onClick={() => setIsRegister(true)}
                className="toggle-btn"
              >
                สมัครสมาชิก
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailLogin;
