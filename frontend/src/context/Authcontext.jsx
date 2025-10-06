import React, { createContext, useContext, useEffect, useState } from "react";
import { auth } from "../firebase/firebase"; // import Firebase auth
import { onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, sendPasswordResetEmail } from "firebase/auth";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [idToken, setIdToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const token = await currentUser.getIdToken();
          setIdToken(token);
          localStorage.setItem('idToken', token);
        } catch (error) {
          console.error('❌ Error getting ID token:', error);
          setIdToken(null);
          localStorage.removeItem('idToken');
        }
      } else {
        setIdToken(null);
        localStorage.removeItem('idToken');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // ฟังก์ชันรีเฟรช token
  const refreshToken = async () => {
    if (auth.currentUser) {
      try {
        const freshToken = await auth.currentUser.getIdToken(true);
        setIdToken(freshToken);
        localStorage.setItem('idToken', freshToken);
        return freshToken;
      } catch (error) {
        console.error('❌ Error refreshing token:', error);
        return null;
      }
    }
    return null;
  };

  // ตั้งเวลารีเฟรช token ทุก 50 นาที (token หมดอายุใน 1 ชม.)
  useEffect(() => {
    if (user) {
      const interval = setInterval(refreshToken, 50 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // ฟังก์ชัน register สำหรับ @bumail.net
  const registerWithEmail = async (email, password, displayName) => {
    // ตรวจสอบว่าเป็น @bumail.net เท่านั้น
    if (!email.endsWith('@bumail.net')) {
      throw new Error('Only @bumail.net email addresses are allowed');
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // อัปเดต display name
      if (displayName) {
        await updateProfile(userCredential.user, {
          displayName: displayName
        });
      }
      
      return userCredential.user;
    } catch (error) {
      console.error('❌ Registration failed:', error);
      
      // แปล Firebase error codes เป็นภาษาไทย
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('อีเมลนี้มีผู้ใช้แล้ว กรุณาใช้อีเมลอื่น');
      } else if (error.code === 'auth/weak-password') {
        throw new Error('รหัสผ่านไม่แข็งแรงพอ กรุณาใช้รหัสผ่านที่มีอย่างน้อย 6 ตัวอักษร');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('รูปแบบอีเมลไม่ถูกต้อง');
      } else if (error.code === 'auth/operation-not-allowed') {
        throw new Error('ระบบยังไม่เปิดใช้งาน Email/Password authentication กรุณาติดต่อผู้ดูแลระบบ');
      }
      
      throw error;
    }
  };

  // ฟังก์ชัน login สำหรับ @bumail.net
  const loginWithEmail = async (email, password) => {
    // ตรวจสอบว่าเป็น @bumail.net เท่านั้น
    if (!email.endsWith('@bumail.net')) {
      throw new Error('Only @bumail.net email addresses are allowed');
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      console.error('❌ Login failed:', error);
      
      // แปล Firebase error codes เป็นภาษาไทย
      if (error.code === 'auth/user-not-found') {
        throw new Error('ไม่พบผู้ใช้นี้ กรุณาสมัครสมาชิกก่อน');
      } else if (error.code === 'auth/wrong-password') {
        throw new Error('รหัสผ่านไม่ถูกต้อง');
      } else if (error.code === 'auth/invalid-login-credentials') {
        throw new Error('ข้อมูลการเข้าสู่ระบบไม่ถูกต้อง กรุณาตรวจสอบอีเมลและรหัสผ่าน');
      } else if (error.code === 'auth/too-many-requests') {
        throw new Error('มีการพยายามเข้าสู่ระบบมากเกินไป กรุณาลองใหม่ภายหลัง');
      } else if (error.code === 'auth/operation-not-allowed') {
        throw new Error('ระบบยังไม่เปิดใช้งาน Email/Password authentication กรุณาติดต่อผู้ดูแลระบบ');
      }
      
      throw error;
    }
  };

  // ฟังก์ชัน reset password สำหรับ @bumail.net
  const resetPassword = async (email) => {
    // ตรวจสอบว่าเป็น @bumail.net เท่านั้น
    if (!email.endsWith('@bumail.net')) {
      throw new Error('สามารถใช้งานได้เฉพาะอีเมล @bumail.net เท่านั้น');
    }

    try {
      await sendPasswordResetEmail(auth, email, {
        url: window.location.origin + '/login', // URL ที่ผู้ใช้จะถูก redirect หลังจาก reset password
        handleCodeInApp: false
      });
      return true;
    } catch (error) {
      console.error('❌ Password reset failed:', error);
      
      // แปล Firebase error codes เป็นภาษาไทย
      if (error.code === 'auth/user-not-found') {
        throw new Error('ไม่พบอีเมลนี้ในระบบ กรุณาตรวจสอบอีเมลที่กรอก');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('รูปแบบอีเมลไม่ถูกต้อง');
      } else if (error.code === 'auth/too-many-requests') {
        throw new Error('มีการขอรีเซ็ตรหัสผ่านมากเกินไป กรุณาลองใหม่ภายหลัง');
      }
      
      throw error;
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setIdToken(null);
    localStorage.removeItem('idToken');
  };

  return (
    <AuthContext.Provider value={{ user, idToken, loading, refreshToken, logout, registerWithEmail, loginWithEmail, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
