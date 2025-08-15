import admin from 'firebase-admin';

let firebaseAdmin = null;

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    
    if (!serviceAccountJson || serviceAccountJson.includes('your_project_id')) {
      console.warn('⚠️  Firebase Admin not configured - Service Account JSON missing or incomplete');
      console.warn('⚠️  Token verification will be disabled. Set FIREBASE_SERVICE_ACCOUNT_JSON in .env');
      firebaseAdmin = null;
    } else {
      const serviceAccount = JSON.parse(serviceAccountJson);
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      
      console.log('✅ Firebase Admin initialized');
      firebaseAdmin = admin;
    }
  } catch (error) {
    console.error('❌ Firebase Admin initialization failed:', error.message);
    console.warn('⚠️  Token verification will be disabled');
    firebaseAdmin = null;
  }
} else {
  firebaseAdmin = admin;
}

export default firebaseAdmin;
