import admin from '../firebase/firebaseAdmin.js';
import { Gmail } from '../model/gmail.js';

export const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized: No token provided or invalid format.' });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // Find or create user in local MongoDB
    let user = await Gmail.findOne({ email: decodedToken.email });

    if (!user) {
      user = new Gmail({
        displayName: decodedToken.name,
        email: decodedToken.email,
        photoURL: decodedToken.picture,
      });
      await user.save();
    }

    // Attach user object to the request
    req.user = user;

    next();
  } catch (error) {
    console.error('Error verifying token:', error);
    return res.status(401).json({ message: 'Unauthorized: Invalid token.', error: error.message });
  }
};
