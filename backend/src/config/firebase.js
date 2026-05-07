const admin = require('firebase-admin');

const useFirebase = String(process.env.USE_FIREBASE || 'false').toLowerCase() === 'true';
let db = null;

// Initialize Firebase Admin
if (useFirebase) {
  try {
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    });
    db = admin.firestore();
    console.log('✅ Firebase Admin initialized successfully');
  } catch (error) {
    console.error('❌ Firebase initialization error:', error.message);
    db = null;
  }
} else {
  console.log('ℹ️ Firebase disabled (USE_FIREBASE=false). Using local storage mode.');
}

module.exports = { admin, db };
