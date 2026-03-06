# 🚀 Project Setup & Development Guide

## Getting Started with Telemedicine App

### Prerequisites
- **Node.js**: v18+ (Download from nodejs.org)
- **npm** or **yarn**: Comes with Node.js
- **Git**: For version control
- **Expo CLI**: `npm install -g expo-cli`
- **Mobile emulator** or **Physical phone with Expo Go app**

### Step 1: Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project named "telemedicine-app"
3. Enable these services:
   - Authentication (Phone authentication)
   - Firestore Database
   - Storage
   - Cloud Functions (for OTP)

4. Get your Firebase config from Project Settings
5. Create `.env` file in frontend and backend folders with the credentials

### Step 2: Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env.local

# Update .env.local with your credentials
# Then start development server
npm start
```

**Expo will give you three options:**
- Press `a` for Android emulator
- Press `i` for iOS simulator
- Press `w` for web browser
- Scan QR code with Expo Go app on physical phone

### Step 3: Backend Setup

```bash
cd backend
npm install
cp .env.example .env

# Update .env with your credentials
npm run dev
```

Backend should start on `http://localhost:5000`

### Directory Structure Explained

```
frontend/
├── App.js                    # Root app component
├── app.json                 # Expo configuration
├── src/
│   ├── screens/            # Complete screens (LoginScreen, etc.)
│   ├── components/         # Reusable UI components
│   ├── services/           # API calls & Firebase integration
│   ├── navigation/         # Navigation setup
│   └── assets/             # Images, icons, fonts

backend/
├── src/
│   ├── server.js          # Main server file
│   ├── routes/            # API routes (auth, users, etc.)
│   ├── controllers/       # Business logic
│   ├── models/            # Database models
│   ├── config/            # Configuration (Firebase, constants)
│   └── middleware/        # Auth, error handling
```

### Environment Variables

**Frontend (.env.local)**
```
EXPO_PUBLIC_FIREBASE_API_KEY=xxx
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=xxx
EXPO_PUBLIC_FIREBASE_PROJECT_ID=xxx
EXPO_PUBLIC_BACKEND_URL=http://localhost:5000
```

**Backend (.env)**
```
PORT=5000
NODE_ENV=development
JWT_SECRET=your_secret_key_here
FIREBASE_PROJECT_ID=xxx
```

### Common Commands

**Frontend**
```bash
npm start              # Start Expo development server
npm run android        # Run on Android emulator
npm run ios            # Run on iOS simulator
```

**Backend**
```bash
npm run dev            # Start with auto-reload (nodemon)
npm start              # Start server
npm test               # Run tests
```

### Testing the App

1. **Test Login Flow**
   - Enter phone number
   - Verify OTP (use any 6 digits for now)
   - You should reach home screen

2. **Test API Calls**
   - Check backend logs to see requests
   - Use Postman/Insomnia to test endpoints directly

### Database Schema (Firebase Firestore)

### Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Module not found | Run `npm install` again |
| Port 5000 in use | Kill process or change PORT in .env |
| Firebase connection fails | Check .env credentials |
| Expo app not loading | Check your phone is on same WiFi as computer |
| CORS errors | Ensure backend CORS is configured |

### Next Steps

1. Complete Phase 1: Create Auth routes in backend
2. Test login/OTP flow end-to-end
3. Start Phase 2: Doctor booking system
4. Keep updating database schema as needed

### Useful Resources

- [React Native Docs](https://reactnative.dev/)
- [Expo Docs](https://docs.expo.dev/)
- [Firebase Setup Guide](https://firebase.google.com/docs/react-native/setup)
- [Express.js Docs](https://expressjs.com/)

### Contact & Support

For issues:
1. Check the error logs carefully
2. Google the error message
3. Check Firebase console for any issues
4. Ask in project documentation

---

**Happy Coding! 🎉**
