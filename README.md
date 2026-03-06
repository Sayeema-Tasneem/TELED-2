# 🏥 Telemedicine App - Rural Healthcare Solution

A comprehensive telemedicine mobile application built with React Native (Expo) to provide accessible healthcare services to rural communities in India.

## 📋 Project Overview

This application connects rural patients with healthcare providers through:
- **Doctor Consultations** via video/audio calls
- **Digital Prescriptions** and health records
- **Medicine Reminders** for medication management
- **Symptom Checker** for preliminary diagnosis
- **Nearby Hospital Locator** with Google Maps
- **Medicine Equipment Rotation** for rural communities
- **AI-powered Voice Health Assistant**
- **Emergency Response** system

## 🛠️ Tech Stack

### Frontend
- **React Native** with Expo
- **React Navigation** for routing
- **Firebase** for authentication & database
- **Agora** for video/audio calling
- **Google Maps API** for location services
- **Google Cloud Speech-to-Text** for voice assistant

### Backend
- **Node.js** with Express.js
- **Firebase Admin SDK** for database management
- **Twilio** for OTP delivery
- **Multer** for file uploads

### Database
- **Firebase Realtime Database** for real-time features
- **Firebase Storage** for medical reports & documents

## 📂 Project Structure

```
teled-2/
├── frontend/                  # React Native Expo App
│   ├── src/
│   │   ├── screens/          # Screen components
│   │   ├── components/       # Reusable components
│   │   ├── services/         # API services
│   │   ├── navigation/       # Navigation setup
│   │   └── assets/           # Images, icons, fonts
│   ├── App.js                # Root component
│   ├── app.json              # Expo configuration
│   └── package.json
│
├── backend/                   # Express.js Backend
│   ├── src/
│   │   ├── routes/           # API routes
│   │   ├── controllers/      # Business logic
│   │   ├── models/           # Database models
│   │   ├── config/           # Configuration files
│   │   ├── middleware/       # Express middleware
│   │   └── server.js         # Main server file
│   ├── .env.example          # Environment template
│   └── package.json
│
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Firebase account
- Google Maps API key
- Agora account

### Installation

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd teled-2
   ```

2. **Setup Frontend**
   ```bash
   cd frontend
   npm install
   cp .env.example .env.local
   # Update .env.local with your Firebase & API keys
   ```

3. **Setup Backend**
   ```bash
   cd ../backend
   npm install
   cp .env.example .env
   # Update .env with your Firebase & API keys
   ```

4. **Start Development**
   
   Terminal 1 - Backend:
   ```bash
   cd backend
   npm run dev
   ```
   
   Terminal 2 - Frontend:
   ```bash
   cd frontend
   npm start
   ```

## 🔑 Environment Variables

### Frontend (.env.local)
- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_AGORA_APP_ID`
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`
- `EXPO_PUBLIC_BACKEND_URL`

### Backend (.env)
- `PORT`
- `NODE_ENV`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_PRIVATE_KEY`
- `TWILIO_ACCOUNT_SID`
- `AGORA_APP_ID`

## 📱 Key Features

### Phase 1-12 (Core Features)
- [x] User authentication with OTP
- [ ] Doctor booking and appointments
- [ ] Video/Audio consultations
- [ ] Chat and file sharing
- [ ] Digital prescriptions
- [ ] Medicine reminders
- [ ] Health records
- [ ] Hospital locator
- [ ] Symptom checker
- [ ] Emergency help

### Innovation Features
- [ ] **Medical Equipment Rotation** - Share expensive medical devices
- [ ] **Voice Health Assistant** - AI-powered voice guidance

## 🏗️ Development Phases

- **Phase 1-2**: Project Setup ✅
- **Phase 3-5**: Core Features (In Progress)
- **Phase 6-12**: Advanced Features (Upcoming)
- **Phase 13-14**: Innovation Features (Upcoming)
- **Phase 15**: Testing & Optimization (Upcoming)

## 📝 License

MIT License - See LICENSE file for details

## 👥 Team

Telemedicine App Development Team

## 📞 Support

For issues and questions, please create an issue in the repository.

---

**Last Updated**: March 6, 2026
