import admin from '../../../firebaseAdmin.js';

// Middleware เพื่อตรวจสอบ Firebase ID Token
const verifyFirebaseToken = async (req, res, next) => {
  // ถ้า Firebase Admin ไม่พร้อม ให้ skip verification (development mode)
  if (!admin) {
    console.warn('⚠️  Firebase Admin not configured - skipping token verification');
    req.user = {
      uid: 'dev-user',
      email: 'dev@bumail.net',
      name: 'Development User',
      picture: null,
      emailVerified: true,
      provider: 'development'
    };
    return next();
  }

  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Missing or invalid authorization header' 
      });
    }

    const token = authHeader.slice(7); // ลบ "Bearer " ออก
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'No token provided' 
      });
    }

    // ตรวจสอบ token กับ Firebase Admin
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // เพิ่มข้อมูลผู้ใช้ใน request object
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name || decodedToken.displayName,
      picture: decodedToken.picture || decodedToken.photoURL,
      emailVerified: decodedToken.email_verified,
      provider: decodedToken.firebase?.sign_in_provider || 'unknown'
    };
    
    console.log('✅ Token verified for user:', req.user.email);
    next();
    
  } catch (error) {
    console.error('❌ Token verification failed:', error.message);
    
    // ส่ง error message ที่เหมาะสมตาม error type
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    } else if (error.code === 'auth/id-token-revoked') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token revoked',
        code: 'TOKEN_REVOKED'
      });
    } else {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }
  }
};

export default verifyFirebaseToken;
