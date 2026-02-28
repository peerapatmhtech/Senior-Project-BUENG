import admin from '../firebase/firebaseAdmin.js';
import { Gmail } from '../model/gmail.js';

export const authMiddleware = async (req, res, next) => {
  // Bypass middleware for email verification link (GET)
  if (req.originalUrl.includes('/api/auth/verify-email')) {
    return next();
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized: No token provided or invalid format.' });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    // Find user in local MongoDB
    let user = await Gmail.findOne({ email: decodedToken.email });

    if (!user) {
      // Auto-create record for Google-authenticated users
      const signInProvider = decodedToken.firebase?.sign_in_provider;
      if (signInProvider === 'google.com') {
        user = await Gmail.findOneAndUpdate(
          { email: decodedToken.email },
          {
            $setOnInsert: {
              displayName: decodedToken.name || decodedToken.email.split('@')[0],
              photoURL: decodedToken.picture || '',
            },
            $set: { isVerified: true },
          },
          { upsert: true, new: true }
        );
        console.info('✅ Auto-created/found user record for Google login:', decodedToken.email);
      } else {
        return res.status(401).json({ message: 'User not found in database.' });
      }
    }

    // Check if user is verified
    if (!user.isVerified) {
      return res.status(403).json({
        message: 'Account not verified. Please check your email.',
        requiresVerification: true,
      });
    }

    // Attach real user object to the request
    req.user = user;
    next();
  } catch (error) {
    console.error('Error verifying token:', error);
    return res.status(401).json({ message: 'Unauthorized: Invalid token.', error: error.message });
  }
};
