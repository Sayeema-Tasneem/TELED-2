import React, { createContext, useCallback, useContext, useMemo, useRef, useState, useEffect } from 'react';
import {
  Alert,
  ActivityIndicator,
  BackHandler,
  AppState,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as Location from 'expo-location';
import { StatusBar } from 'expo-status-bar';
import simpleApiService from '../services/simpleApiService';
import HospitalsService from '../services/hospitalsService';
import NotificationService from '../services/notificationService';
import languageService from '../services/languageService';
import voiceCommandService from '../services/voiceCommandService';
import { VoiceProvider } from '../context/VoiceContext';
import GlobalVoiceFAB from '../components/GlobalVoiceFAB';
import BookAppointmentScreen from '../screens/BookAppointmentScreen';
import VideoCallScreen from '../screens/VideoCallScreen';
import HealthRecordsScreen from '../screens/HealthRecordsScreen';
import FirstAidVideosScreen from '../screens/FirstAidVideosScreen';
import SymptomCheckerScreen from '../screens/SymptomCheckerScreen';
import NearbyHospitalsScreen from '../screens/NearbyHospitalsScreen';
import MedicineReminderScreen from '../screens/MedicineReminderScreen';
import AddMedicineScreen from '../screens/AddMedicineScreen';
import MedicalEquipmentScreen from '../screens/MedicalEquipmentScreen';
import EquipmentHubScreen from '../screens/EquipmentHubScreen';
import EmergencyHelpScreen from '../screens/EmergencyHelpScreen';
import EmergencyAnimationListScreen from '../screens/EmergencyAnimationListScreen';
import AdminVideoUploadScreen from '../screens/AdminVideoUploadScreen';

const Stack = createNativeStackNavigator();
const navigationRef = createNavigationContainerRef();
const EMERGENCY_CONTACT_KEY = 'emergency_contact_number';

let ExpoSpeechRecognitionModule = null;
let useSpeechRecognitionEvent = () => {};
let speechRecognitionNativeAvailable = false;

try {
  const speechRecognition = require('expo-speech-recognition');
  ExpoSpeechRecognitionModule = speechRecognition?.ExpoSpeechRecognitionModule || null;
  useSpeechRecognitionEvent = speechRecognition?.useSpeechRecognitionEvent || (() => {});
  speechRecognitionNativeAvailable = !!ExpoSpeechRecognitionModule?.isRecognitionAvailable;
} catch (error) {
  ExpoSpeechRecognitionModule = null;
  useSpeechRecognitionEvent = () => {};
  speechRecognitionNativeAvailable = false;
}

const translations = {
  en: {
    appTitle: 'Rural Telemedicine',
    chooseRole: 'Choose Login',
    patientLogin: 'Patient Login',
    doctorLogin: 'Doctor Login',
    adminLogin: 'Admin Login',
    back: 'Back',
    patientAuthTitle: 'Patient Access',
    newUser: 'New User Registration',
    existingUser: 'Existing User Login',
    fullName: 'Name',
    phone: 'Phone Number',
    age: 'Age',
    gender: 'Gender',
    village: 'Village',
    createPin: 'Create 4 Digit PIN',
    enterPin: 'Enter 4 Digit PIN',
    register: 'Register',
    login: 'Login',
    selectGender: 'Select Gender',
    male: 'Male',
    female: 'Female',
    other: 'Other',
    patientDashboard: 'Patient Dashboard',
    welcome: 'Welcome',
    bookConsultation: 'Book Consultation',
    viewPrescriptions: 'View Prescriptions',
    joinVideoCall: 'Join Video Call',
    healthRecords: 'Health Records',
    medicalEquipment: 'Medical Equipment',
    symptomChecker: 'Symptom Checker',
    nearbyHospitals: 'Nearby Hospitals',
    medicineReminder: 'Medicine Reminder',
    emergencyHelp: 'Emergency Help',
    logout: 'Logout',
    doctorDashboard: 'Doctor Dashboard',
    patientAppointments: 'Patient Appointments',
    videoConsultation: 'Video Consultation',
    uploadPrescription: 'Upload Prescription',
    doctorName: 'Doctor Name',
    adminDashboard: 'Admin Dashboard',
    viewDoctors: 'View Doctors',
    viewPatients: 'View Patients',
    viewAppointments: 'View Appointments',
    username: 'Username',
    password: 'Password',
    bookingTitle: 'Book Consultation',
    consultationDate: 'Date (DD-MM-YYYY)',
    reason: 'Reason',
    submitBooking: 'Confirm Booking',
    prescriptionsTitle: 'My Prescriptions',
    noPrescriptions: 'No prescriptions yet',
    noAppointments: 'No appointments yet',
    chooseDoctor: 'Choose Doctor',
    doctorLoginTitle: 'Doctor Login',
    adminLoginTitle: 'Admin Login',
    savePrescription: 'Save Prescription',
    prescriptionText: 'Prescription Details',
    patientPhone: 'Patient Phone Number',
    simpleVideoText: 'Tap button to start consultation call',
    startCall: 'Start Video Call',
    bookingSuccess: 'Appointment booked successfully',
    registrationSuccess: 'Registration completed. Please login now.',
    invalidCredentials: 'Invalid credentials',
    pleaseRegister: 'Please register first',
    notRegisteredTitle: 'Not Registered',
    notRegisteredMsg: 'This number is not registered. Please register first to login.',
    registerNow: 'Register Now',
    cancel: 'Cancel',
    newHere: 'New here? Register',
    alreadyHaveAccount: 'Already registered? Login',
    requiredFields: 'Please fill all required fields correctly',
    pinRule: 'PIN must be exactly 4 digits',
    phoneRule: 'Phone must be exactly 10 digits',
    alreadyRegistered: 'Patient already registered. Please login.',
    noPatients: 'No patients found',
    noDoctors: 'No doctors found',
    noData: 'No data found',
    language: 'Language',
    patientLabel: 'Patient',
    nextConsultation: 'Next Consultation',
    nextConsultationWith: 'Consultation with',
    nextConsultationDate: 'Date',
    nextConsultationTime: 'Time',
    voiceHelp: 'Voice Help',
    startVoiceHelp: 'Start Voice Help',
    stopVoiceHelp: 'Stop Voice Help',
    listening: 'Listening...',
    processingVoice: 'Processing your command...',
    heardCommand: 'Heard',
    voiceCommandHint: 'Say: book consultation, medicine reminder, emergency help, nearby hospitals, symptom checker, health records, join video call, or logout.',
    voiceNotAvailable: 'Voice recognition is not available on this device.',
    voicePermissionDenied: 'Microphone permission is required for voice commands.',
    voiceTryAgain: 'Sorry, I could not understand. Please try again.',
    voiceDidYouMean: 'Did you mean',
    voiceSayYesNo: 'Say yes to continue or no to try again.',
    voiceConfirmed: 'Okay, opening',
    voiceCancelled: 'Okay, please say your command again.',
    voiceTapToRecordHint: 'Tap once to start, tap again to stop.',
    voiceLowConfidenceTitle: 'Voice not clear',
    voiceLowConfidenceMessage: 'I heard "{{text}}". Do you want to retry?',
    voiceRetry: 'Retry',
    voiceUseAnyway: 'Use this',
    voiceSessionBusy: 'Microphone is busy right now. Please close other audio apps/calls and try again.',
    voiceSetupHint: 'Voice help is local-only. Enable device speech recognition (and use a development build if required) to use voice commands.',
  },
  hi: {
    appTitle: 'ग्रामीण टेलीमेडिसिन',
    chooseRole: 'लॉगिन चुनें',
    patientLogin: 'रोगी लॉगिन',
    doctorLogin: 'डॉक्टर लॉगिन',
    adminLogin: 'एडमिन लॉगिन',
    back: 'वापस',
    patientAuthTitle: 'रोगी प्रवेश',
    newUser: 'नया पंजीकरण',
    existingUser: 'पुराना उपयोगकर्ता लॉगिन',
    fullName: 'नाम',
    phone: 'फोन नंबर',
    age: 'उम्र',
    gender: 'लिंग',
    village: 'गांव',
    createPin: '4 अंकों का पिन बनाएं',
    enterPin: '4 अंकों का पिन डालें',
    register: 'पंजीकरण करें',
    login: 'लॉगिन करें',
    selectGender: 'लिंग चुनें',
    male: 'पुरुष',
    female: 'महिला',
    other: 'अन्य',
    patientDashboard: 'रोगी डैशबोर्ड',
    welcome: 'नमस्ते',
    bookConsultation: 'कंसल्टेशन बुक करें',
    viewPrescriptions: 'प्रिस्क्रिप्शन देखें',
    joinVideoCall: 'वीडियो कॉल जॉइन करें',
    healthRecords: 'स्वास्थ्य रिकॉर्ड',
    medicalEquipment: 'मेडिकल उपकरण',
    symptomChecker: 'लक्षण जांच',
    nearbyHospitals: 'पास के अस्पताल',
    medicineReminder: 'दवा रिमाइंडर',
    emergencyHelp: 'आपातकालीन सहायता',
    logout: 'लॉगआउट',
    doctorDashboard: 'डॉक्टर डैशबोर्ड',
    patientAppointments: 'रोगी अपॉइंटमेंट',
    videoConsultation: 'वीडियो कंसल्टेशन',
    uploadPrescription: 'प्रिस्क्रिप्शन अपलोड करें',
    doctorName: 'डॉक्टर का नाम',
    adminDashboard: 'एडमिन डैशबोर्ड',
    viewDoctors: 'डॉक्टर देखें',
    viewPatients: 'रोगी देखें',
    viewAppointments: 'अपॉइंटमेंट देखें',
    username: 'यूजरनेम',
    password: 'पासवर्ड',
    bookingTitle: 'कंसल्टेशन बुक करें',
    consultationDate: 'तारीख (DD-MM-YYYY)',
    reason: 'समस्या',
    submitBooking: 'बुकिंग करें',
    prescriptionsTitle: 'मेरे प्रिस्क्रिप्शन',
    noPrescriptions: 'अभी कोई प्रिस्क्रिप्शन नहीं है',
    noAppointments: 'अभी कोई अपॉइंटमेंट नहीं है',
    chooseDoctor: 'डॉक्टर चुनें',
    doctorLoginTitle: 'डॉक्टर लॉगिन',
    adminLoginTitle: 'एडमिन लॉगिन',
    savePrescription: 'प्रिस्क्रिप्शन सेव करें',
    prescriptionText: 'प्रिस्क्रिप्शन विवरण',
    patientPhone: 'रोगी का फोन नंबर',
    simpleVideoText: 'कॉल शुरू करने के लिए बटन दबाएं',
    startCall: 'वीडियो कॉल शुरू करें',
    bookingSuccess: 'अपॉइंटमेंट सफलतापूर्वक बुक हो गया',
    registrationSuccess: 'पंजीकरण पूरा हुआ। अब लॉगिन करें।',
    invalidCredentials: 'गलत जानकारी',
    pleaseRegister: 'कृपया पहले पंजीकरण करें',
    notRegisteredTitle: 'पंजीकृत नहीं है',
    notRegisteredMsg: 'यह नंबर पंजीकृत नहीं है। लॉगिन के लिए पहले पंजीकरण करें।',
    registerNow: 'अभी पंजीकरण करें',
    cancel: 'रद्द करें',
    newHere: 'नए हैं? पंजीकरण करें',
    alreadyHaveAccount: 'पहले से पंजीकृत? लॉगिन करें',
    requiredFields: 'कृपया सभी जानकारी सही भरें',
    pinRule: 'पिन ठीक 4 अंक का होना चाहिए',
    phoneRule: 'फोन नंबर ठीक 10 अंक का होना चाहिए',
    alreadyRegistered: 'रोगी पहले से पंजीकृत है। लॉगिन करें।',
    noPatients: 'कोई रोगी नहीं मिला',
    noDoctors: 'कोई डॉक्टर नहीं मिला',
    noData: 'कोई डेटा नहीं मिला',
    language: 'भाषा',
    patientLabel: 'रोगी',
    nextConsultation: 'अगला कंसल्टेशन',
    nextConsultationWith: 'डॉक्टर',
    nextConsultationDate: 'तारीख',
    nextConsultationTime: 'समय',
    voiceHelp: 'आवाज़ सहायता',
    startVoiceHelp: 'आवाज़ सहायता शुरू करें',
    stopVoiceHelp: 'आवाज़ सहायता बंद करें',
    listening: 'सुन रहा है...',
    processingVoice: 'आपकी कमांड समझ रहा है...',
    heardCommand: 'सुना गया',
    voiceCommandHint: 'कहें: कंसल्टेशन बुक करें, दवा रिमाइंडर, इमरजेंसी हेल्प, पास के अस्पताल, लक्षण जांच, स्वास्थ्य रिकॉर्ड, वीडियो कॉल, या लॉगआउट।',
    voiceNotAvailable: 'इस डिवाइस पर आवाज़ पहचान उपलब्ध नहीं है।',
    voicePermissionDenied: 'आवाज़ कमांड के लिए माइक्रोफोन अनुमति जरूरी है।',
    voiceTryAgain: 'माफ़ कीजिए, मैं समझ नहीं पाया। कृपया फिर बोलें।',
    voiceDidYouMean: 'क्या आपने कहा',
    voiceSayYesNo: 'जारी रखने के लिए हाँ बोलें, या फिर से कोशिश के लिए नहीं बोलें।',
    voiceConfirmed: 'ठीक है, खोल रहा हूँ',
    voiceCancelled: 'ठीक है, कृपया अपनी कमांड दोबारा बोलें।',
    voiceTapToRecordHint: 'एक बार दबाकर शुरू करें, फिर दोबारा दबाकर बंद करें।',
    voiceLowConfidenceTitle: 'आवाज़ साफ़ नहीं है',
    voiceLowConfidenceMessage: 'मैंने "{{text}}" सुना। क्या दोबारा कोशिश करें?',
    voiceRetry: 'फिर से कोशिश',
    voiceUseAnyway: 'इसी का उपयोग करें',
    voiceSessionBusy: 'माइक्रोफोन अभी व्यस्त है। कृपया अन्य ऑडियो ऐप/कॉल बंद करके फिर प्रयास करें।',
    voiceSetupHint: 'वॉइस हेल्प केवल डिवाइस पर चलता है। वॉइस कमांड के लिए फोन में स्पीच रिकग्निशन सक्षम करें (ज़रूरत हो तो डेवलपमेंट बिल्ड उपयोग करें)।',
  },
  kn: {
    appTitle: 'ಗ್ರಾಮೀಣ ಟೆಲಿಮೆಡಿಸಿನ್',
    chooseRole: 'ಲಾಗಿನ್ ಆಯ್ಕೆಮಾಡಿ',
    patientLogin: 'ರೋಗಿ ಲಾಗಿನ್',
    doctorLogin: 'ಡಾಕ್ಟರ್ ಲಾಗಿನ್',
    adminLogin: 'ನಿರ್ವಹಣಾ ಲಾಗಿನ್',
    back: 'ಹಿಂದೆ',
    patientAuthTitle: 'ರೋಗಿ ಪ್ರವೇಶ',
    newUser: 'ಹೊಸ ನೋಂದಣಿ',
    existingUser: 'ಹಳೆಯ ಬಳಕೆದಾರ ಲಾಗಿನ್',
    fullName: 'ಹೆಸರು',
    phone: 'ಫೋನ್ ಸಂಖ್ಯೆ',
    age: 'ವಯಸ್ಸು',
    gender: 'ಲಿಂಗ',
    village: 'ಗ್ರಾಮ',
    createPin: '4 ಅಂಕೆಯ ಪಿನ್ ರಚಿಸಿ',
    enterPin: '4 ಅಂಕೆಯ ಪಿನ್ ನಮೂದಿಸಿ',
    register: 'ನೋಂದಣಿ',
    login: 'ಲಾಗಿನ್',
    selectGender: 'ಲಿಂಗ ಆಯ್ಕೆಮಾಡಿ',
    male: 'ಪುರುಷ',
    female: 'ಮಹಿಳೆ',
    other: 'ಇತರೆ',
    patientDashboard: 'ರೋಗಿ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    welcome: 'ಸ್ವಾಗತ',
    bookConsultation: 'ಸಲಹೆ ಬುಕ್ ಮಾಡಿ',
    viewPrescriptions: 'ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್ ನೋಡಿ',
    joinVideoCall: 'ವೀಡಿಯೋ ಕಾಲ್ ಸೇರಿ',
    healthRecords: 'ಆರೋಗ್ಯ ದಾಖಲೆಗಳು',
    medicalEquipment: 'ವೈದ್ಯಕೀಯ ಉಪಕರಣಗಳು',
    symptomChecker: 'ಲಕ್ಷಣ ಪರಿಶೀಲನೆ',
    nearbyHospitals: 'ಹತ್ತಿರದ ಆಸ್ಪತ್ರೆಗಳು',
    medicineReminder: 'ಔಷಧಿ ರಿಮೈಂಡರ್',
    emergencyHelp: 'ತುರ್ತು ಸಹಾಯ',
    logout: 'ಲಾಗ್ ಔಟ್',
    voiceHelp: 'ಧ್ವನಿ ಸಹಾಯ',
    startVoiceHelp: 'ಧ್ವನಿ ಸಹಾಯ ಪ್ರಾರಂಭಿಸಿ',
    stopVoiceHelp: 'ಧ್ವನಿ ಸಹಾಯ ನಿಲ್ಲಿಸಿ',
    listening: 'ಕೆಳಗುತ್ತಿದೆ...',
    processingVoice: 'ನಿಮ್ಮ ಕಮಾಂಡ್ ಪ್ರಕ್ರಿಯೆಗೊಳಿಸಲಾಗುತ್ತಿದೆ...',
    heardCommand: 'ಕೇಳಿದುದು',
    voiceCommandHint: 'ಹೇಳಿ: ಸಲಹೆ ಬುಕ್ ಮಾಡಿ, ಔಷಧಿ ರಿಮೈಂಡರ್, ತುರ್ತು ಸಹಾಯ, ಹತ್ತಿರದ ಆಸ್ಪತ್ರೆಗಳು, ಲಕ್ಷಣ ಪರಿಶೀಲನೆ, ಆರೋಗ್ಯ ದಾಖಲೆಗಳು, ವೀಡಿಯೋ ಕಾಲ್, ಅಥವಾ ಲಾಗ್ ಔಟ್.',
    voiceNotAvailable: 'ಈ ಸಾಧನದಲ್ಲಿ ಧ್ವನಿ ಗುರುತಿಸುವಿಕೆ ಲಭ್ಯವಿಲ್ಲ.',
    voicePermissionDenied: 'ಧ್ವನಿ ಕಮಾಂಡ್‌ಗಳಿಗೆ ಮೈಕ್ರೊಫೋನ್ ಅನುಮತಿ ಅಗತ್ಯ.',
    voiceTryAgain: 'ಕ್ಷಮಿಸಿ, ನನಗೆ ಅರ್ಥವಾಗಲಿಲ್ಲ. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
    voiceDidYouMean: 'ನೀವು ಹೇಳಿದ್ದು',
    voiceSayYesNo: 'ಮುಂದುವರಿಸಲು ಹೌದು ಹೇಳಿ ಅಥವಾ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಲು ಇಲ್ಲ ಹೇಳಿ.',
    voiceConfirmed: 'ಸರಿ, ತೆರೆಯಲಾಗುತ್ತಿದೆ',
    voiceCancelled: 'ಸರಿ, ದಯವಿಟ್ಟು ನಿಮ್ಮ ಕಮಾಂಡ್ ಮತ್ತೆ ಹೇಳಿ.',
    voiceTapToRecordHint: 'ಒಮ್ಮೆ ಒತ್ತಿ ಪ್ರಾರಂಭಿಸಿ, ಮತ್ತೆ ಒತ್ತಿ ನಿಲ್ಲಿಸಿ.',
    voiceLowConfidenceTitle: 'ಧ್ವನಿ ಸ್ಪಷ್ಟವಾಗಿಲ್ಲ',
    voiceLowConfidenceMessage: 'ನಾನು "{{text}}" ಎಂದು ಕೇಳಿದೆ. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಬೇಕೇ?',
    voiceRetry: 'ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ',
    voiceUseAnyway: 'ಇದನ್ನೇ ಬಳಸಿ',
    voiceSessionBusy: 'ಮೈಕ್ರೋಫೋನ್ ಈಗ ಬ್ಯುಸಿಯಾಗಿದೆ. ದಯವಿಟ್ಟು ಇತರೆ ಆಡಿಯೋ ಆಪ್/ಕಾಲ್‌ಗಳನ್ನು ಮುಚ್ಚಿ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
    voiceSetupHint: 'ಧ್ವನಿ ಸಹಾಯ ಸ್ಥಳೀಯ (ಡಿವೈಸ್) ಮಾತ್ರ. ಧ್ವನಿ ಕಮಾಂಡ್‌ಗಳಿಗೆ ಫೋನ್‌ನಲ್ಲಿ ಸ್ಪೀಚ್ ಗುರುತಿಸುವಿಕೆಯನ್ನು ಸಕ್ರಿಯಗೊಳಿಸಿ (ಅಗತ್ಯವಿದ್ದರೆ ಡೆವಲಪ್‌ಮೆಂಟ್ ಬಿಲ್ಡ್ ಬಳಸಿ).',
  },
};

const LanguageContext = createContext({
  language: 'en',
  setLanguage: () => {},
  t: (key) => key,
});

const useI18n = () => useContext(LanguageContext);

const parseAppointmentDateTime = (appointment) => {
  const dateValue = appointment?.appointmentDate || appointment?.date;
  if (!dateValue) {
    return null;
  }

  const [datePart] = String(dateValue).split('T');
  const [time, modifier = 'AM'] = String(appointment?.appointmentTime || '09:00 AM').split(' ');
  const [hourString = '9', minuteString = '00'] = String(time || '09:00').split(':');

  let hours = Number(hourString);
  const minutes = Number(minuteString);

  if (modifier.toUpperCase() === 'PM' && hours < 12) {
    hours += 12;
  }

  if (modifier.toUpperCase() === 'AM' && hours === 12) {
    hours = 0;
  }

  const parsedDate = new Date(`${datePart}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  parsedDate.setHours(hours, minutes, 0, 0);
  return parsedDate;
};

const VIDEO_JOIN_EXPIRY_MINUTES = 20;

const isVideoJoinExpired = (appointment) => {
  const appointmentDateTime = parseAppointmentDateTime(appointment);
  if (!appointmentDateTime) {
    return true;
  }

  const joinEndTime = appointmentDateTime.getTime() + VIDEO_JOIN_EXPIRY_MINUTES * 60 * 1000;
  return Date.now() > joinEndTime;
};

const formatAppointmentDate = (appointment, language = 'en') => {
  const appointmentDate = parseAppointmentDateTime(appointment);
  if (!appointmentDate) {
    return appointment?.appointmentDate || appointment?.date || '-';
  }

  return appointmentDate.toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const getSpeechLocaleForLanguage = (language) => {
  if (language === 'hi') {
    return 'hi-IN';
  }
  if (language === 'kn') {
    return 'kn-IN';
  }
  return 'en-IN';
};

const normalizeCommand = (input = '') =>
  String(input)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const getIntentFromCommand = (rawText = '') => {
  const text = normalizeCommand(rawText);
  if (!text) {
    return null;
  }

  const commands = [
    {
      intent: 'book',
      keywords: ['book', 'consultation', 'appointment', 'consulation', 'book consultation', 'book appointment', 'बुक', 'अपॉइंटमेंट', 'कंसल्टेशन', 'ಬುಕ್', 'ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್', 'ಸಲಹೆ'],
    },
    {
      intent: 'call',
      keywords: ['video', 'call', 'join', 'start', 'वीडियो', 'कॉल', 'ವೀಡಿಯೋ', 'ಕಾಲ್'],
    },
    {
      intent: 'hospitals',
      keywords: ['hospital', 'hospitals', 'nearby', 'पास', 'अस्पताल', 'ಹತ್ತಿರ', 'ಆಸ್ಪತ್ರೆ'],
    },
    {
      intent: 'medicine',
      keywords: ['medicine', 'reminder', 'tablet', 'दवा', 'मेडिसिन', 'रिमाइंडर', 'ಔಷಧಿ', 'ರಿಮೈಂಡರ್'],
    },
    {
      intent: 'symptoms',
      keywords: ['symptom', 'checker', 'लक्षण', 'सिम्पटम', 'ಲಕ್ಷಣ', 'ಸಿಂಪ್ಟಮ್'],
    },
    {
      intent: 'records',
      keywords: ['record', 'records', 'health', 'रिकॉर्ड', 'स्वास्थ्य', 'ಆರೋಗ್ಯ', 'ದಾಖಲೆ'],
    },
    {
      intent: 'equipment',
      keywords: ['equipment', 'medical', 'उपकरण', 'मेडिकल', 'ವೈದ್ಯಕೀಯ', 'ಉಪಕರಣ'],
    },
    {
      intent: 'emergency',
      keywords: ['emergency', 'help', 'आपातकालीन', 'इमरजेंसी', 'मदद', 'ತುರ್ತು', 'ಸಹಾಯ'],
    },
    {
      intent: 'logout',
      keywords: ['logout', 'log', 'out', 'sign', 'लॉगआउट', 'ಲಾಗ್', 'ಔಟ್'],
    },
  ];

  const matched = commands.find((command) =>
    command.keywords.some((keyword) => text.includes(normalizeCommand(keyword)))
  );

  return matched?.intent || null;
};

const getConfirmationFromCommand = (rawText = '') => {
  const text = normalizeCommand(rawText);
  if (!text) {
    return null;
  }

  const yesWords = ['yes', 'haan', 'ha', 'हाँ', 'हां', 'हांजी', 'हೌದು', 'ಹೌದು'];
  const noWords = ['no', 'nahi', 'ना', 'नहीं', 'ಇಲ್ಲ', 'ಬೇಡ'];

  if (yesWords.some((word) => text.includes(normalizeCommand(word)))) {
    return 'yes';
  }
  if (noWords.some((word) => text.includes(normalizeCommand(word)))) {
    return 'no';
  }
  return null;
};

const getIntentLabel = (intent, t) => {
  switch (intent) {
    case 'book':
      return t('bookConsultation');
    case 'call':
      return t('joinVideoCall');
    case 'hospitals':
      return t('nearbyHospitals');
    case 'medicine':
      return t('medicineReminder');
    case 'symptoms':
      return t('symptomChecker');
    case 'records':
      return t('healthRecords');
    case 'equipment':
      return t('medicalEquipment');
    case 'emergency':
      return t('emergencyHelp');
    case 'logout':
      return t('logout');
    default:
      return '';
  }
};

const hasNativeSpeechRecognitionModule = () => Boolean(ExpoSpeechRecognitionModule);

const canUseNativeSpeechRecognition = () => {
  if (!ExpoSpeechRecognitionModule) {
    return false;
  }

  if (!speechRecognitionNativeAvailable) {
    // Some runtimes may not expose availability checks reliably.
    // If the module exists, still allow a runtime start attempt.
    return true;
  }

  return !!ExpoSpeechRecognitionModule?.isRecognitionAvailable?.();
};

const isWeakTranscript = (transcript, confidence) => {
  const text = String(transcript || '').trim();
  if (!text) {
    return true;
  }

  const words = text.split(/\s+/).filter(Boolean);
  const explicitLowConfidence = Number.isFinite(confidence) && confidence < 0.55;
  const tooShort = text.length < 8 || words.length < 2;
  return explicitLowConfidence || tooShort;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getActivationErrorMessage = (error, fallbackMessage) => {
  const raw = String(error?.message || '');
  const lowered = raw.toLowerCase();

  if (
    lowered.includes('session activation failed')
    || lowered.includes('nsosstatuserrordomain')
    || lowered.includes('code=561017449')
  ) {
    return fallbackMessage;
  }

  return raw || fallbackMessage;
};

const FAST_RECORDING_OPTIONS = {
  android: {
    extension: '.m4a',
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 32000,
  },
  ios: {
    extension: '.m4a',
    outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
    audioQuality: Audio.IOSAudioQuality.LOW,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 32000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 32000,
  },
};

const cloudVoiceTranscriptionSetting =
  String(process.env.EXPO_PUBLIC_ENABLE_CLOUD_VOICE_TRANSCRIPTION || 'auto').trim().toLowerCase();

const isCloudVoiceTranscriptionExplicitlyDisabled = [
  'off',
  'disabled',
  'force-off',
].includes(cloudVoiceTranscriptionSetting);

const InlineLanguageSwitcher = () => {
  const { language, setLanguage, t } = useI18n();

  return (
    <View style={styles.languageWrap}>
      <Text style={styles.languageLabel}>{t('language')}:</Text>
      <Pressable
        onPress={() => setLanguage('en')}
        style={[styles.languageButton, language === 'en' && styles.languageButtonActive]}
      >
        <Text style={[styles.languageText, language === 'en' && styles.languageTextActive]}>English</Text>
      </Pressable>
      <Pressable
        onPress={() => setLanguage('hi')}
        style={[styles.languageButton, language === 'hi' && styles.languageButtonActive]}
      >
        <Text style={[styles.languageText, language === 'hi' && styles.languageTextActive]}>हिन्दी</Text>
      </Pressable>
    </View>
  );
};

const AppShell = ({ children }) => (
  <SafeAreaView style={styles.safeArea}>
    <ScrollView contentContainerStyle={styles.screenContainer}>{children}</ScrollView>
  </SafeAreaView>
);

const BigButton = ({ title, onPress, variant = 'primary' }) => (
  <Pressable
    style={({ pressed }) => [
      styles.bigButton,
      variant === 'secondary' ? styles.secondaryButton : styles.primaryButton,
      pressed && styles.buttonPressed,
    ]}
    onPress={onPress}
  >
    <Text
      style={[
        styles.bigButtonText,
        variant === 'secondary' ? styles.secondaryButtonText : styles.primaryButtonText,
      ]}
    >
      {title}
    </Text>
  </Pressable>
);

const Input = ({ placeholder, value, onChangeText, secureTextEntry = false, keyboardType = 'default', ...rest }) => (
  <TextInput
    style={styles.input}
    placeholder={placeholder}
    placeholderTextColor="#7a7a7a"
    value={value}
    onChangeText={onChangeText}
    secureTextEntry={secureTextEntry}
    keyboardType={keyboardType}
    {...rest}
  />
);

function RoleSelectScreen({ navigation }) {
  const { language, setLanguage, t } = useI18n();

  return (
    <AppShell>
      <Text style={styles.title}>{t('appTitle')}</Text>
      <Text style={styles.subtitle}>{t('chooseRole')}</Text>

      <View style={styles.languageWrap}>
        <Text style={styles.languageLabel}>{t('language')}:</Text>
        <Pressable
          onPress={() => setLanguage('en')}
          style={[styles.languageButton, language === 'en' && styles.languageButtonActive]}
        >
          <Text style={[styles.languageText, language === 'en' && styles.languageTextActive]}>English</Text>
        </Pressable>
        <Pressable
          onPress={() => setLanguage('hi')}
          style={[styles.languageButton, language === 'hi' && styles.languageButtonActive]}
        >
          <Text style={[styles.languageText, language === 'hi' && styles.languageTextActive]}>हिन्दी</Text>
        </Pressable>
      </View>

      <BigButton title={t('patientLogin')} onPress={() => navigation.navigate('PatientLogin')} />
      <BigButton title={t('doctorLogin')} onPress={() => navigation.navigate('DoctorLogin')} />
      <BigButton title={t('adminLogin')} onPress={() => navigation.navigate('AdminLogin')} />
    </AppShell>
  );
}

function PatientLoginScreen({ navigation }) {
  const { t } = useI18n();
  const [mode, setMode] = useState('login');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [village, setVillage] = useState('');
  const [pin, setPin] = useState('');

  const [loginPhone, setLoginPhone] = useState('');
  const [loginPin, setLoginPin] = useState('');

  const validatePhone = (v) => /^\d{10}$/.test(v);
  const validatePin = (v) => /^\d{4}$/.test(v);

  const registerPatient = async () => {
    if (!name || !age || !gender || !village || !validatePhone(phone) || !validatePin(pin)) {
      Alert.alert(t('requiredFields'));
      return;
    }

    try {
      await simpleApiService.registerPatient({
        name,
        phone,
        age,
        gender,
        village,
        pin,
      });

      Alert.alert(t('registrationSuccess'));
      setMode('login');
      setLoginPhone(phone);
      setLoginPin(pin);
    } catch (error) {
      const message = error?.message || t('alreadyRegistered');
      Alert.alert(message);
    }
  };

  const loginPatient = async () => {
    if (!validatePhone(loginPhone)) {
      Alert.alert(t('phoneRule'));
      return;
    }
    if (!validatePin(loginPin)) {
      Alert.alert(t('pinRule'));
      return;
    }

    try {
      const result = await simpleApiService.loginPatient(loginPhone, loginPin);
      navigation.replace('PatientDashboard', { patient: result.patient });
    } catch (error) {
      const message = error?.message || '';
      if (message.toLowerCase().includes('register')) {
        Alert.alert(t('notRegisteredTitle'), t('notRegisteredMsg'));
        return;
      }

      Alert.alert(message || t('invalidCredentials'));
    }
  };
      
  return (
    <AppShell>
      <Text style={styles.title}>{t('patientAuthTitle')}</Text>
      <InlineLanguageSwitcher />

      {mode === 'register' ? (
        <View style={styles.formWrap}>
          <Input placeholder={t('fullName')} value={name} onChangeText={setName} />
          <Input
            placeholder={t('phone')}
            value={phone}
            onChangeText={(v) => setPhone(v.replace(/[^0-9]/g, ''))}
            keyboardType="phone-pad"
          />
          <Input
            placeholder={t('age')}
            value={age}
            onChangeText={(v) => setAge(v.replace(/[^0-9]/g, ''))}
            keyboardType="numeric"
          />

          <Text style={styles.label}>{t('selectGender')}</Text>
          <View style={styles.genderWrap}>
            {[{ key: 'male', value: t('male') }, { key: 'female', value: t('female') }, { key: 'other', value: t('other') }].map((g) => (
              <Pressable
                key={g.key}
                onPress={() => setGender(g.value)}
                style={[styles.genderButton, gender === g.value && styles.genderButtonActive]}
              >
                <Text style={[styles.genderText, gender === g.value && styles.genderTextActive]}>{g.value}</Text>
              </Pressable>
            ))}
          </View>

          <Input placeholder={t('village')} value={village} onChangeText={setVillage} />
          <Input
            placeholder={t('createPin')}
            value={pin}
            onChangeText={(v) => setPin(v.replace(/[^0-9]/g, '').slice(0, 4))}
            keyboardType="numeric"
            secureTextEntry
          />

          <BigButton title={t('register')} onPress={registerPatient} />
          <BigButton
            title={t('alreadyHaveAccount')}
            variant="secondary"
            onPress={() => setMode('login')}
          />
        </View>
      ) : (
        <View style={styles.formWrap}>
          <Input
            placeholder={t('phone')}
            value={loginPhone}
            onChangeText={(v) => setLoginPhone(v.replace(/[^0-9]/g, ''))}
            keyboardType="phone-pad"
          />
          <Input
            placeholder={t('enterPin')}
            value={loginPin}
            onChangeText={(v) => setLoginPin(v.replace(/[^0-9]/g, '').slice(0, 4))}
            keyboardType="numeric"
            secureTextEntry
          />
          <BigButton title={t('login')} onPress={loginPatient} />
          <BigButton
            title={t('newHere')}
            variant="secondary"
            onPress={() => setMode('register')}
          />
        </View>
      )}

      <BigButton title={t('back')} variant="secondary" onPress={() => navigation.goBack()} />
    </AppShell>
  );
}

function PatientDashboardScreen({ navigation, route }) {
  const { t, language } = useI18n();
  const patient = route.params?.patient;
  const [nextAppointment, setNextAppointment] = useState(null);
  const [latestPrescription, setLatestPrescription] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [heardText, setHeardText] = useState('');
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [isFallbackRecording, setIsFallbackRecording] = useState(false);
  const [voiceStage, setVoiceStage] = useState('idle');
  const [pendingIntent, setPendingIntent] = useState(null);
  const confirmationTimeoutRef = useRef(null);
  const voiceSessionTimeoutRef = useRef(null);
  const recordingRef = useRef(null);
  const recordingInitRef = useRef(false);

  const resetAudioSession = useCallback(async () => {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      playThroughEarpieceAndroid: false,
      shouldDuckAndroid: true,
    });
  }, []);

  const activateRecordingSession = useCallback(async () => {
    let lastError;

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        await resetAudioSession();
        await sleep(120 * attempt);
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          playThroughEarpieceAndroid: false,
          shouldDuckAndroid: true,
        });
        return;
      } catch (error) {
        lastError = error;
        await sleep(120 * attempt);
      }
    }

    throw lastError;
  }, [resetAudioSession]);

  const formatTextTemplate = useCallback((template, values = {}) => {
    let output = String(template || '');
    Object.entries(values).forEach(([key, value]) => {
      output = output.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), String(value));
    });
    return output;
  }, []);

  const speakText = useCallback(
    (text) => {
      Speech.stop();
      Speech.speak(String(text), {
        language: getSpeechLocaleForLanguage(language),
        rate: 0.95,
      });
    },
    [language]
  );

  const stopListening = useCallback(async () => {
    if (voiceSessionTimeoutRef.current) {
      clearTimeout(voiceSessionTimeoutRef.current);
      voiceSessionTimeoutRef.current = null;
    }

    if (confirmationTimeoutRef.current) {
      clearTimeout(confirmationTimeoutRef.current);
      confirmationTimeoutRef.current = null;
    }

    setVoiceStage('idle');
    setPendingIntent(null);
    setIsProcessingVoice(false);
    ExpoSpeechRecognitionModule?.stop?.();
  }, [resetAudioSession]);

  const startSpeechSession = useCallback(
    async (nextStage, options = {}) => {
      if (!ExpoSpeechRecognitionModule) {
        Alert.alert(t('voiceHelp'), t('voiceNotAvailable'));
        return false;
      }

      setVoiceStage(nextStage);
      setIsProcessingVoice(true);
      await ExpoSpeechRecognitionModule.start({
        lang: getSpeechLocaleForLanguage(language),
        interimResults: true,
        maxAlternatives: 1,
        continuous: false,
        iosTaskHint: 'confirmation',
        androidIntentOptions: {
          EXTRA_LANGUAGE_MODEL: 'web_search',
        },
        requiresOnDeviceRecognition: Platform.OS === 'ios',
        ...options,
      });

      return true;
    },
    [language, t]
  );

  const executeIntent = useCallback(
    (intent, voiceInput = '') => {
      const navParams = {
        patient,
        userId: patient?.phone || patient?.id,
      };

      // Extract symptoms and specialty recommendations from voice input
      if (voiceInput) {
        navParams.voiceInput = voiceInput;
        
        if (intent === 'book') {
          const consultationReq = voiceCommandService.createVoiceConsultationRequest(voiceInput, language);
          navParams.voiceSymptoms = consultationReq.symptoms;
          navParams.recommendedSpecialty = consultationReq.specialty;
          navParams.voiceDescription = consultationReq.voiceDescription;
        } else if (intent === 'symptoms') {
          const symptomReq = voiceCommandService.createVoiceSymptomCheckRequest(voiceInput, language);
          navParams.voiceSymptoms = symptomReq.symptoms;
          navParams.voiceDescription = symptomReq.voiceDescription;
        }
      }

      switch (intent) {
        case 'book':
          speakText(t('bookConsultation'));
          navigation.navigate('BookAppointment', navParams);
          break;
        case 'call':
          speakText(t('joinVideoCall'));
          navigation.navigate('VideoCall', navParams);
          break;
        case 'hospitals':
          speakText(t('nearbyHospitals'));
          navigation.navigate('NearbyHospitals', navParams);
          break;
        case 'medicine':
          speakText(t('medicineReminder'));
          navigation.navigate('MedicineReminder', navParams);
          break;
        case 'symptoms':
          speakText(t('symptomChecker'));
          navigation.navigate('SymptomChecker', navParams);
          break;
        case 'records':
          speakText(t('healthRecords'));
          navigation.navigate('HealthRecords', navParams);
          break;
        case 'equipment':
          speakText(t('medicalEquipment'));
          navigation.navigate('EquipmentHub', navParams);
          break;
        case 'emergency':
          speakText(t('emergencyHelp'));
          navigation.navigate('EmergencyHelp', navParams);
          break;
        case 'logout':
          speakText(t('logout'));
          navigation.replace('RoleSelect');
          break;
        default:
          speakText(t('voiceTryAgain'));
          break;
      }
    },
    [navigation, patient, speakText, t, language]
  );

  useSpeechRecognitionEvent('start', () => {
    console.log('🎙️ VOICE SESSION STARTED');
    setIsListening(true);
    setIsProcessingVoice(false);

    if (voiceSessionTimeoutRef.current) {
      clearTimeout(voiceSessionTimeoutRef.current);
      voiceSessionTimeoutRef.current = null;
    }

    // Give user 15 seconds to speak (increased from 6.5s)
    voiceSessionTimeoutRef.current = setTimeout(() => {
      console.log('⏱️ TIMEOUT: 15 seconds expired, stopping listening');
      setIsListening(false);
      setIsProcessingVoice(false);
      setVoiceStage('idle');
      setPendingIntent(null);
      ExpoSpeechRecognitionModule?.stop?.();
      Alert.alert('Voice Help', 'No speech detected. Please try again.');
    }, 15000);
  });

  useSpeechRecognitionEvent('end', () => {
    console.log('🎙️ VOICE SESSION ENDED');
    setIsListening(false);
    setIsProcessingVoice(false);

    if (voiceSessionTimeoutRef.current) {
      clearTimeout(voiceSessionTimeoutRef.current);
      voiceSessionTimeoutRef.current = null;
    }
  });

  useSpeechRecognitionEvent('result', (event) => {
    const latestText = event?.results?.[0]?.transcript;
    const confidence = Number(event?.results?.[0]?.confidence ?? 1);
    
    console.log('🎙️ Voice result:', { latestText, confidence, isFinal: event?.isFinal, voiceStage });
    
    if (!latestText) {
      console.log('❌ No transcript received');
      return;
    }

    setHeardText(latestText);

    if (!event?.isFinal) {
      console.log('⏳ Not final yet, waiting for final result');
      return;
    }

    if (voiceStage === 'awaiting-confirmation') {
      const answer = getConfirmationFromCommand(latestText);
      if (answer === 'yes' && pendingIntent) {
        setPendingIntent(null);
        setVoiceStage('idle');
        speakText(`${t('voiceConfirmed')} ${getIntentLabel(pendingIntent, t)}`);
        executeIntent(pendingIntent, heardText);
        return;
      }

      if (answer === 'no') {
        setPendingIntent(null);
        speakText(t('voiceCancelled'));
        startSpeechSession('awaiting-command');
        return;
      }

      speakText(t('voiceSayYesNo'));
      startSpeechSession('awaiting-confirmation', {
        contextualStrings: ['yes', 'no', 'हाँ', 'नहीं', 'ಹೌದು', 'ಇಲ್ಲ'],
      }).catch(() => {});
      return;
    }

    console.log('🔍 Checking for intent match...');
    const intent = getIntentFromCommand(latestText);
    console.log('✅ Intent detected:', intent);
    
    // Much more forgiving: if speech was recognized, accept it
    // If no specific intent matched, default to 'book' (most common action)
    const finalIntent = intent || 'book';
    console.log('🎯 Final intent to execute:', finalIntent);
    
    setIsProcessingVoice(false);
    setPendingIntent(null);
    setVoiceStage('idle');
    
    const intentLabel = getIntentLabel(finalIntent, t);
    console.log('🚀 Executing intent:', finalIntent, 'Label:', intentLabel);
    speakText(`${t('voiceConfirmed')} ${intentLabel}`);
    executeIntent(finalIntent, latestText);
  });

  useSpeechRecognitionEvent('error', () => {
    setIsListening(false);
    setIsProcessingVoice(false);
    if (voiceSessionTimeoutRef.current) {
      clearTimeout(voiceSessionTimeoutRef.current);
      voiceSessionTimeoutRef.current = null;
    }
    if (voiceStage !== 'idle') {
      setVoiceStage('idle');
      setPendingIntent(null);
    }
    speakText(t('voiceTryAgain'));
  });

  const startListening = useCallback(async () => {
    if (isProcessingVoice || recordingInitRef.current || isListening) {
      return;
    }

    const nativeReady = canUseNativeSpeechRecognition();
    if (!nativeReady) {
      Speech.stop();
      Alert.alert(
        t('voiceHelp'),
        isExpoGoRuntime
          ? 'Use a Development Build (not Expo Go) on iOS to enable voice help.'
          : 'Enable speech recognition in phone settings and try again.'
      );
      return;
    }

    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permission?.granted) {
      Alert.alert(t('voiceHelp'), t('voicePermissionDenied'));
      return;
    }

    setHeardText('');
    setPendingIntent(null);

    // Disabled voice hint - only show text on screen
    // speakText(t('voiceCommandHint'));

    try {
      await startSpeechSession('awaiting-command');
    } catch (error) {
      Alert.alert(t('voiceHelp'), error?.message || t('voiceTryAgain'));
    }
  }, [speakText, startSpeechSession, t, isExpoGoRuntime]);

  const isNativeVoiceReady = canUseNativeSpeechRecognition();
  const isExpoGoRuntime = Constants?.appOwnership === 'expo';
  const voiceSetupHintText = isExpoGoRuntime
    ? `${t('voiceSetupHint')} Use a Development Build (not Expo Go) on iOS for speech recognition APIs.`
    : t('voiceSetupHint');

  useEffect(() => () => {
    if (voiceSessionTimeoutRef.current) {
      clearTimeout(voiceSessionTimeoutRef.current);
      voiceSessionTimeoutRef.current = null;
    }

    if (confirmationTimeoutRef.current) {
      clearTimeout(confirmationTimeoutRef.current);
      confirmationTimeoutRef.current = null;
    }

    if (recordingRef.current) {
      recordingRef.current.stopAndUnloadAsync().catch(() => {});
      recordingRef.current = null;
    }

    resetAudioSession().catch(() => {});
    Speech.stop();
    ExpoSpeechRecognitionModule?.abort?.();
  }, [resetAudioSession]);

  const handleJoinNextConsultation = () => {
    if (!nextAppointment || isVideoJoinExpired(nextAppointment)) {
      Alert.alert('Consultation closed', 'Join consultation is disabled 20 minutes after appointment time.');
      return;
    }

    navigation.navigate('VideoCall', {
      patient,
      focusAppointmentId: nextAppointment?.id,
    });
  };

  useEffect(() => {
    const loadNextAppointment = async () => {
      if (!patient?.phone) {
        setNextAppointment(null);
        return;
      }

      try {
        await simpleApiService.archiveExpiredAppointments(patient.phone);

        const result = await simpleApiService.getAppointments({
          patientPhone: patient.phone,
          status: 'scheduled',
        });

        const appointments = Array.isArray(result?.appointments) ? result.appointments : [];
        const now = Date.now();

        const sortedAppointments = [...appointments].sort((first, second) => {
          const firstTime = parseAppointmentDateTime(first)?.getTime() || Number.MAX_SAFE_INTEGER;
          const secondTime = parseAppointmentDateTime(second)?.getTime() || Number.MAX_SAFE_INTEGER;
          return firstTime - secondTime;
        });

        const upcoming = sortedAppointments.find((appointment) => {
          const appointmentTime = parseAppointmentDateTime(appointment)?.getTime();
          return appointmentTime ? appointmentTime >= now : false;
        }) || null;

        setNextAppointment(upcoming);
      } catch (error) {
        setNextAppointment(null);
      }
    };

    const unsubscribe = navigation.addListener('focus', loadNextAppointment);
    return unsubscribe;
  }, [navigation, patient?.phone]);

  useEffect(() => {
    const loadLatestPrescription = async () => {
      if (!patient?.phone) {
        setLatestPrescription(null);
        return;
      }

      try {
        const result = await simpleApiService.getPatientPrescriptions(patient.phone);
        const prescriptions = Array.isArray(result?.prescriptions) ? result.prescriptions : [];
        const latest = [...prescriptions].sort((left, right) => {
          const leftTime = new Date(left?.createdAt || left?.date || 0).getTime();
          const rightTime = new Date(right?.createdAt || right?.date || 0).getTime();
          return rightTime - leftTime;
        })[0] || null;
        setLatestPrescription(latest);
      } catch (error) {
        setLatestPrescription(null);
      }
    };

    const unsubscribe = navigation.addListener('focus', loadLatestPrescription);
    return unsubscribe;
  }, [navigation, patient?.phone]);

  const menuItems = [
    { icon: '👨‍⚕️', title: t('bookConsultation'), action: 'BookAppointment' },
    { icon: '🎥', title: t('joinVideoCall'), action: 'VideoCall' },
    { icon: '🏥', title: t('nearbyHospitals'), action: 'NearbyHospitals' },
    { icon: '💊', title: t('medicineReminder'), action: 'MedicineReminder' },
    { icon: '🔍', title: t('symptomChecker'), action: 'SymptomChecker' },
    { icon: '📹', title: 'Primary Care Videos', action: 'FirstAidVideos' },
    { icon: '♻️', title: 'Equipment Hub', action: 'EquipmentHub' },
    { icon: '📄', title: t('healthRecords'), action: 'HealthRecords' },
    { icon: '🚨', title: t('emergencyHelp'), action: 'EmergencyHelp' },
  ];

  return (
    <AppShell>
      <View style={styles.patientDashboardHeader}>
        <View>
          <Text style={styles.patientGreeting}>{t('welcome')} 👋</Text>
          <Text style={styles.patientName}>{patient?.name || t('patientLabel')}</Text>
        </View>
      </View>

      <InlineLanguageSwitcher />

      <View style={styles.voiceHelpCard}>
        <Pressable
          style={[
            styles.voiceHelpButton,
            isListening && styles.voiceHelpButtonActive,
            (!isNativeVoiceReady) && styles.voiceHelpButtonDisabled,
          ]}
          onPress={!isNativeVoiceReady ? () => {
            Alert.alert(
              t('voiceHelp'),
              isExpoGoRuntime
                ? 'Use a Development Build (not Expo Go) on iOS to enable voice help.'
                : 'Enable speech recognition in phone settings and try again.'
            );
          } : (isListening ? stopListening : startListening)}
          disabled={isProcessingVoice || recordingInitRef.current || !isNativeVoiceReady}
        >
          <Text style={styles.voiceHelpButtonText}>
            {isListening ? t('stopVoiceHelp') : t('startVoiceHelp')}
          </Text>
          {isListening && <Text style={styles.voiceListeningText}>{t('listening')}</Text>}
        </Pressable>
      </View>

      {nextAppointment && (
        <View style={styles.nextConsultationBanner}>
          <Text style={styles.nextConsultationTitle}>✅ {t('bookingSuccess')}</Text>
          <Text style={styles.nextConsultationSubTitle}>{t('nextConsultation')}</Text>
          <Text style={styles.nextConsultationText}>
            {t('nextConsultationWith')}: {nextAppointment.doctorName || '-'}
          </Text>
          <Text style={styles.nextConsultationText}>
            {t('nextConsultationDate')}: {formatAppointmentDate(nextAppointment, language)}
          </Text>
          <Text style={styles.nextConsultationText}>
            {t('nextConsultationTime')}: {nextAppointment.appointmentTime || '09:00 AM'}
          </Text>

          <Pressable
            style={[styles.nextConsultationButton, isVideoJoinExpired(nextAppointment) && styles.nextConsultationButtonDisabled]}
            onPress={handleJoinNextConsultation}
            disabled={isVideoJoinExpired(nextAppointment)}
          >
            <Text style={styles.nextConsultationButtonText}>{t('joinVideoCall')}</Text>
          </Pressable>
        </View>
      )}

      {latestPrescription && (
        <View style={styles.prescriptionPreviewBanner}>
          <Text style={styles.prescriptionPreviewTitle}>📝 Latest prescription</Text>
          <Text style={styles.prescriptionPreviewText}>Doctor: {latestPrescription.doctorName || '-'}</Text>
          <Text style={styles.prescriptionPreviewText}>Date: {latestPrescription.date || latestPrescription.createdAt?.slice(0, 10) || '-'}</Text>
          <Text style={styles.prescriptionPreviewText} numberOfLines={2}>
            {String(latestPrescription.diagnosis || latestPrescription.text || 'Prescription available').replace(/\n/g, ' ')}
          </Text>

          <TouchableOpacity
            style={styles.prescriptionPreviewButton}
            onPress={() => navigation.navigate('HealthRecords', { patient })}
          >
            <Text style={styles.prescriptionPreviewButtonText}>View prescriptions</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={styles.featureGrid} showsVerticalScrollIndicator={false}>
        <View style={styles.gridContainer}>
          {menuItems.map((item, idx) => (
            <Pressable
              key={idx}
              style={styles.featureCard}
              onPress={() => navigation.navigate(item.action, {
                patient,
                userId: patient?.phone || patient?.id,
              })}
            >
              <Text style={styles.featureIcon}>{item.icon}</Text>
              <Text style={styles.featureTitle}>{item.title}</Text>
            </Pressable>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={() => navigation.replace('RoleSelect')}>
          <Text style={styles.logoutButtonText}>{t('logout')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </AppShell>
  );
}




function PatientPrescriptionsScreen({ navigation, route }) {
  const { t } = useI18n();
  const patient = route.params?.patient;
  const [items, setItems] = useState([]);
  const [nearbyVisible, setNearbyVisible] = useState(false);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyTitle, setNearbyTitle] = useState('Nearby Facilities');
  const [nearbyResults, setNearbyResults] = useState([]);

  const formatPrescriptionDateTime = (item) => {
    if (item?.createdAt) {
      const dt = new Date(item.createdAt);
      if (!Number.isNaN(dt.getTime())) {
        return dt.toLocaleString();
      }
    }
    const date = item?.date || '-';
    const time = item?.time || '--';
    return `${date} ${time}`;
  };

  const openNearbyFacility = async (mode = 'blood-test', item = null) => {
    try {
      setNearbyVisible(true);
      setNearbyLoading(true);

      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission?.granted) {
        setNearbyLoading(false);
        Alert.alert('Location permission is required to find nearby centres');
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        maximumAge: 0,
      });
      const latitude = position?.coords?.latitude;
      const longitude = position?.coords?.longitude;

      if (!latitude || !longitude) {
        setNearbyLoading(false);
        Alert.alert('Unable to detect current location');
        return;
      }

      const rawNearby = await HospitalsService.getNearby(
        latitude,
        longitude,
        8,
        mode === 'pharmacy' ? 'pharmacy' : 'all',
        { liveOnly: true }
      );

      const normalize = (value = '') =>
        String(value)
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

      const splitWords = (value = '') =>
        normalize(value)
          .split(/[\s,-]+/)
          .map((word) => word.trim())
          .filter((word) => word.length >= 3);

      const requestedContextText =
        mode === 'scan'
          ? (Array.isArray(item?.scans) ? item.scans.join(' ') : '')
          : (Array.isArray(item?.tests) ? item.tests.join(' ') : '');

      const requestedTerms = [...new Set(splitWords(requestedContextText))];

      const pharmacyKeywords = ['pharmacy', 'medical store', 'chemist', 'medicals'];
      const labKeywords = ['lab', 'laboratory', 'pathology', 'diagnostic', 'blood', 'collection'];
      const scanKeywords = ['scan', 'scanning', 'imaging', 'radiology', 'mri', 'ct', 'x-ray', 'ultrasound'];

      const filtered = (Array.isArray(rawNearby) ? rawNearby : []).filter((place) => {
        const servicesText = Array.isArray(place?.services)
          ? place.services.join(' ')
          : String(place?.services || '');

        const haystack = normalize(
          `${place?.name || ''} ${place?.address || ''} ${servicesText} ${place?.type || ''}`
        );

        const isPharmacy =
          String(place?.type || '').toLowerCase() === 'pharmacy' ||
          pharmacyKeywords.some((keyword) => haystack.includes(keyword));

        if (mode === 'pharmacy') {
          return isPharmacy;
        }

        const hasRequestedTerm = requestedTerms.some((term) => haystack.includes(term));

        if (mode === 'scan') {
          const looksLikeScanCenter = scanKeywords.some((keyword) => haystack.includes(keyword));
          return !isPharmacy && (looksLikeScanCenter || hasRequestedTerm);
        }

        const looksLikeLab = labKeywords.some((keyword) => haystack.includes(keyword));
        return !isPharmacy && (looksLikeLab || hasRequestedTerm);
      });

      const filteredSorted = [...filtered].sort(
        (a, b) => Number(a?.distance ?? Number.MAX_SAFE_INTEGER) - Number(b?.distance ?? Number.MAX_SAFE_INTEGER)
      );

      setNearbyTitle(
        mode === 'pharmacy'
          ? 'Nearby Pharmacies'
          : mode === 'scan'
            ? 'Nearby Scan Centres'
            : 'Nearby Blood Test Labs'
      );

      setNearbyResults(filteredSorted.slice(0, 20));
      setNearbyLoading(false);
    } catch (error) {
      setNearbyLoading(false);
      Alert.alert('Unable to open nearby search');
    }
  };

  const handleCallPlace = async (place) => {
    const rawPhone = String(place?.phone || '').trim();
    const dialPhone = rawPhone.replace(/[^+\d]/g, '');
    if (!dialPhone) {
      Alert.alert('Phone number not available for this place');
      return;
    }

    await Linking.openURL(`tel:${dialPhone}`);
  };

  const handleDirectionsToPlace = async (place) => {
    const latitude = Number(place?.latitude);
    const longitude = Number(place?.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      Alert.alert('Location not available for this place');
      return;
    }

    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    await Linking.openURL(mapsUrl);
  };

  const downloadPrescriptionPdf = async (item) => {
    try {
      const medicineLines = Array.isArray(item?.medicines)
        ? item.medicines
            .map((med, idx) => `${idx + 1}. ${med?.name || ''} ${med?.dose ? `(${med.dose})` : ''} ${med?.duration ? `- ${med.duration}` : ''}`.trim())
            .join('<br/>')
        : '';

      const html = `
        <html>
          <body style="font-family: Arial, sans-serif; padding: 22px; color: #1f2937;">
            <h2 style="color: #1157c2; margin-bottom: 8px;">Prescription</h2>
            <p><strong>Patient:</strong> ${patient?.name || '-'}</p>
            <p><strong>Patient Phone:</strong> ${item?.patientPhone || patient?.phone || '-'}</p>
            <p><strong>Doctor:</strong> ${item?.doctorName || '-'}</p>
            <p><strong>Date & Time:</strong> ${formatPrescriptionDateTime(item)}</p>
            ${item?.diagnosis ? `<p><strong>Diagnosis:</strong> ${item.diagnosis}</p>` : ''}
            ${medicineLines ? `<p><strong>Medicines:</strong><br/>${medicineLines}</p>` : ''}
            ${Array.isArray(item?.tests) && item.tests.length > 0 ? `<p><strong>Blood/Lab Tests:</strong> ${item.tests.join(', ')}</p>` : ''}
            ${Array.isArray(item?.scans) && item.scans.length > 0 ? `<p><strong>Scans:</strong> ${item.scans.join(', ')}</p>` : ''}
            ${item?.doctorNotes ? `<p><strong>Doctor Notes:</strong> ${item.doctorNotes}</p>` : ''}
            ${item?.text ? `<hr/><p style="white-space: pre-wrap;"><strong>Full Prescription:</strong><br/>${String(item.text).replace(/\n/g, '<br/>')}</p>` : ''}
          </body>
        </html>
      `;

      const file = await Print.printToFileAsync({ html });
      const canShare = await Sharing.isAvailableAsync();

      if (canShare) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Download Prescription PDF',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('PDF generated', 'Sharing is not available on this device.');
      }
    } catch (error) {
      Alert.alert('Failed to generate prescription PDF');
    }
  };

  React.useEffect(() => {
    const load = async () => {
      try {
        const result = await simpleApiService.getPatientPrescriptions(patient?.phone);
        setItems(result.prescriptions || []);
      } catch (error) {
        setItems([]);
      }
    };
    const unsubscribe = navigation.addListener('focus', load);
    return unsubscribe;
  }, [navigation, patient?.phone]);

  return (
    <AppShell>
      <Text style={styles.title}>{t('prescriptionsTitle')}</Text>

      {items.length === 0 ? (
        <Text style={styles.emptyText}>{t('noPrescriptions')}</Text>
      ) : (
        items.map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.cardTitle}>{item.doctorName}</Text>
            <Text style={styles.smallText}>Date & Time: {formatPrescriptionDateTime(item)}</Text>
            {item?.diagnosis ? <Text style={styles.cardText}>Diagnosis: {item.diagnosis}</Text> : null}
            {Array.isArray(item?.medicines) && item.medicines.length > 0 ? (
              <Text style={styles.cardText}>Medicines: {item.medicines.map((med) => med?.name).filter(Boolean).join(', ')}</Text>
            ) : null}
            {Array.isArray(item?.tests) && item.tests.length > 0 ? (
              <Text style={styles.smallText}>Tests: {item.tests.join(', ')}</Text>
            ) : null}
            {Array.isArray(item?.scans) && item.scans.length > 0 ? (
              <Text style={styles.smallText}>Scans: {item.scans.join(', ')}</Text>
            ) : null}
            <Text style={styles.cardText}>{item.text}</Text>

            <View style={styles.adminActionRow}>
              <TouchableOpacity style={styles.inlineActionButton} onPress={() => downloadPrescriptionPdf(item)}>
                <Text style={styles.inlineActionButtonText}>Download PDF</Text>
              </TouchableOpacity>

              {Array.isArray(item?.tests) && item.tests.length > 0 ? (
                <TouchableOpacity style={styles.inlineActionButton} onPress={() => openNearbyFacility('blood-test', item)}>
                  <Text style={styles.inlineActionButtonText}>Nearby Blood Test</Text>
                </TouchableOpacity>
              ) : null}

              {Array.isArray(item?.scans) && item.scans.length > 0 ? (
                <TouchableOpacity style={styles.inlineActionButton} onPress={() => openNearbyFacility('scan', item)}>
                  <Text style={styles.inlineActionButtonText}>Nearby Scan Center</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity style={styles.inlineActionButton} onPress={() => openNearbyFacility('pharmacy', item)}>
                <Text style={styles.inlineActionButtonText}>Nearby Pharmacies</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      <Modal visible={nearbyVisible} animationType="slide" transparent onRequestClose={() => setNearbyVisible(false)}>
        <View style={styles.nearbyModalOverlay}>
          <View style={styles.nearbyModalCard}>
            <View style={styles.nearbyModalHeader}>
              <Text style={styles.nearbyModalTitle}>{nearbyTitle}</Text>
              <TouchableOpacity onPress={() => setNearbyVisible(false)}>
                <Text style={styles.nearbyCloseText}>Close</Text>
              </TouchableOpacity>
            </View>

            {nearbyLoading ? (
              <View style={styles.nearbyLoadingWrap}>
                <ActivityIndicator size="large" color="#1157c2" />
                <Text style={styles.nearbyLoadingText}>Finding nearby places...</Text>
              </View>
            ) : nearbyResults.length === 0 ? (
              <View style={styles.nearbyLoadingWrap}>
                <Text style={styles.nearbyLoadingText}>No nearby places found. Try again in a different area.</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {nearbyResults.map((place, index) => (
                  <View key={place?.id || `${place?.name || 'place'}_${index}`} style={styles.nearbyItemCard}>
                    <Text style={styles.nearbyItemName}>{place?.name || 'Nearby place'}</Text>
                    <Text style={styles.nearbyItemMeta}>📍 {place?.address || 'Address not available'}</Text>
                    <Text style={styles.nearbyItemMeta}>📏 {Number(place?.distance || 0).toFixed(1)} km away</Text>
                    <Text style={styles.nearbyItemMeta}>☎️ {place?.phone || 'Phone not available'}</Text>

                    <View style={styles.nearbyActionsRow}>
                      <TouchableOpacity style={styles.nearbyActionButton} onPress={() => handleCallPlace(place)}>
                        <Text style={styles.nearbyActionButtonText}>Call</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.nearbyActionButton} onPress={() => handleDirectionsToPlace(place)}>
                        <Text style={styles.nearbyActionButtonText}>Directions</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <BigButton title={t('back')} variant="secondary" onPress={() => navigation.goBack()} />
    </AppShell>
  );
}

function DoctorLoginScreen({ navigation }) {
  const { t } = useI18n();
  const [doctorName, setDoctorName] = useState('');
  const [pin, setPin] = useState('');

  const loginDoctor = async () => {
    try {
      const result = await simpleApiService.loginDoctor(doctorName.trim(), pin.trim());
      navigation.replace('DoctorDashboard', { doctor: result.doctor });
    } catch (error) {
      Alert.alert(error?.message || t('invalidCredentials'));
    }
  };

  return (
    <AppShell>
      <Text style={styles.title}>{t('doctorLoginTitle')}</Text>
      <Input placeholder={t('doctorName')} value={doctorName} onChangeText={setDoctorName} />
      <Input
        placeholder={t('enterPin')}
        value={pin}
        onChangeText={(v) => setPin(v.replace(/[^0-9]/g, '').slice(0, 4))}
        keyboardType="numeric"
        secureTextEntry
      />
      <BigButton title={t('login')} onPress={loginDoctor} />
      <BigButton title={t('back')} variant="secondary" onPress={() => navigation.goBack()} />
    </AppShell>
  );
}

function DoctorDashboardScreen({ navigation, route }) {
  const { t } = useI18n();
  const doctor = route.params?.doctor;

  const quickActions = [
    {
      title: 'View Appointments',
      subtitle: 'Check patient bookings and follow-ups',
      onPress: () => navigation.navigate('DoctorAppointments', { doctor }),
    },
    {
      title: 'Upload Prescription',
      subtitle: 'Create or update a prescription',
      onPress: () => navigation.navigate('UploadPrescription', { doctor }),
    },
    {
      title: 'Back to role select',
      subtitle: 'Switch back to the login screen',
      onPress: () => navigation.replace('RoleSelect'),
    },
  ];

  return (
    <AppShell>
      <Text style={styles.title}>{t('doctorDashboard')}</Text>
      <Text style={styles.subtitle}>{`${t('welcome')}, ${doctor?.name || 'Doctor'}`}</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Doctor profile</Text>
        <Text style={styles.cardText}>{doctor?.name || 'Doctor'}</Text>
        <Text style={styles.smallText}>{doctor?.specialization || 'General Physician'}</Text>
        <Text style={styles.smallText}>Use the actions below to manage appointments and prescriptions.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Quick actions</Text>
        {quickActions.map((item) => (
          <TouchableOpacity
            key={item.title}
            style={styles.inlineActionButton}
            onPress={item.onPress}
            activeOpacity={0.85}
          >
            <Text style={styles.inlineActionButtonText}>{item.title}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Today</Text>
        <Text style={styles.cardText}>Appointments and consultation tasks will appear here.</Text>
        <Text style={styles.smallText}>Open Appointments to review patient bookings, then upload the prescription.</Text>
      </View>
    </AppShell>
  );
}

function DoctorAppointmentsScreen({ navigation, route }) {
  const { t } = useI18n();
  const doctor = route.params?.doctor;

  return (
    <AppShell>
      <Text style={styles.title}>{t('patientAppointments')}</Text>
      <Text style={styles.emptyText}>
        {doctor?.name ? `${doctor.name} appointments can be opened from the dashboard.` : t('noAppointments')}
      </Text>
      <BigButton title={t('back')} variant="secondary" onPress={() => navigation.navigate('DoctorDashboard', { doctor })} />
    </AppShell>
  );
}

function UploadPrescriptionScreen({ navigation, route }) {
  const { t } = useI18n();
  const doctor = route.params?.doctor;
  const appointmentId = route.params?.appointmentId;
  const appointmentDate = route.params?.appointmentDate;
  const [patientPhone, setPatientPhone] = useState(route.params?.patientPhone || '');
  const isPatientPhonePrefilled = Boolean(route.params?.patientPhone);
  const [historySummary, setHistorySummary] = useState(null);
  const [loadingHistorySummary, setLoadingHistorySummary] = useState(false);
  const [historySummaryError, setHistorySummaryError] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [doctorNotes, setDoctorNotes] = useState('');
  const [followUpDays, setFollowUpDays] = useState('');
  const [testsText, setTestsText] = useState('');
  const [scansText, setScansText] = useState('');
  const [medicineRows, setMedicineRows] = useState([
    {
      id: `med_${Date.now()}`,
      name: '',
      dose: '',
      quantity: '',
      duration: '',
      frequency: '',
      instructions: '',
    },
  ]);
  const [activeMedicineRowId, setActiveMedicineRowId] = useState(null);

  useEffect(() => {
    if (route.params?.patientPhone) {
      setPatientPhone(String(route.params.patientPhone));
    }
  }, [route.params?.patientPhone]);

  useEffect(() => {
    let cancelled = false;

    const loadHistorySummary = async () => {
      const normalizedPhone = String(patientPhone || '').trim();
      const doctorName = String(doctor?.name || '').trim();

      if (!/^\d{10}$/.test(normalizedPhone) || !doctorName) {
        setHistorySummary(null);
        setHistorySummaryError('');
        setLoadingHistorySummary(false);
        return;
      }

      try {
        setLoadingHistorySummary(true);
        setHistorySummaryError('');

        const result = await simpleApiService.getPatientDoctorHistorySummary(
          normalizedPhone,
          doctorName,
          5,
          {
            appointmentId,
            appointmentDate,
          }
        );

        if (cancelled) return;
        setHistorySummary(result?.summary || null);
      } catch (error) {
        if (cancelled) return;
        setHistorySummary(null);
        setHistorySummaryError(error?.message || 'Unable to load history summary');
      } finally {
        if (!cancelled) {
          setLoadingHistorySummary(false);
        }
      }
    };

    loadHistorySummary();
    return () => {
      cancelled = true;
    };
  }, [patientPhone, doctor?.name, appointmentId, appointmentDate]);

  const MEDICINE_MASTER = [
    'Paracetamol', 'Dolo 650', 'Ibuprofen', 'Azithromycin', 'Amoxicillin', 'Pantoprazole', 'Omeprazole',
    'Cetirizine', 'Levocetirizine', 'Montelukast', 'Cough Syrup', 'ORS', 'Metformin', 'Amlodipine', 'Telmisartan',
    'Atorvastatin', 'Ecosprin', 'Thyroxine', 'Vitamin D3', 'Calcium', 'Iron Folic Acid', 'Zinc', 'B-Complex',
    'Ondansetron', 'Domperidone', 'Loperamide', 'Ranitidine', 'Rabeprazole', 'Dicyclomine', 'Meftal Spas',
    'Aceclofenac', 'Diclofenac', 'Naproxen', 'Tramadol', 'Allegra', 'Hydroxyzine', 'Prednisolone',
    'Salbutamol Inhaler', 'Budesonide Inhaler', 'Insulin', 'Glimepiride', 'Sitagliptin',
  ];

  const TEST_SUGGESTIONS = [
    'CBC', 'CRP', 'ESR', 'LFT', 'KFT', 'RBS', 'HbA1c', 'Thyroid Profile', 'Lipid Profile',
    'Urine Routine', 'Urine Culture', 'Dengue NS1', 'Malaria Test', 'COVID RT-PCR',
  ];

  const SCAN_SUGGESTIONS = [
    'Chest X-Ray', 'Abdomen Ultrasound', 'ECG', '2D Echo', 'CT Brain', 'CT Chest',
    'MRI Brain', 'USG Pelvis', 'KUB Scan',
  ];

  const parseCommaSeparated = (value = '') =>
    String(value)
      .split(/[,\n]/)
      .map((item) => item.trim())
      .filter(Boolean);

  const buildPrescriptionText = ({ diagnosisText, medicines, tests, scans, notes, followUp }) => {
    const medicineLines = medicines.length > 0
      ? medicines.map((med, index) => {
          const parts = [
            med.name,
            med.dose ? `Dose: ${med.dose}` : '',
            med.quantity ? `Qty: ${med.quantity}` : '',
            med.frequency ? `Freq: ${med.frequency}` : '',
            med.duration ? `Duration: ${med.duration}` : '',
            med.instructions ? `Instructions: ${med.instructions}` : '',
          ].filter(Boolean);
          return `${index + 1}. ${parts.join(' | ')}`;
        })
      : [];

    const lines = [
      diagnosisText ? `Diagnosis: ${diagnosisText}` : '',
      medicineLines.length > 0 ? `Medicines:\n${medicineLines.join('\n')}` : '',
      tests.length > 0 ? `Blood / Lab Tests: ${tests.join(', ')}` : '',
      scans.length > 0 ? `Scans: ${scans.join(', ')}` : '',
      notes ? `Doctor Notes: ${notes}` : '',
      followUp ? `Follow-up: ${followUp} days` : '',
    ].filter(Boolean);

    return lines.join('\n\n');
  };

  const getMedicineSuggestions = (query = '') => {
    const cleaned = String(query).trim().toLowerCase();
    if (cleaned.length < 2) return [];

    return MEDICINE_MASTER
      .filter((name) => name.toLowerCase().includes(cleaned))
      .slice(0, 8);
  };

  const updateMedicineRow = (rowId, patch) => {
    setMedicineRows((prev) => prev.map((row) => (row.id === rowId ? { ...row, ...patch } : row)));
  };

  const addMedicineRow = () => {
    setMedicineRows((prev) => ([
      ...prev,
      {
        id: `med_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: '',
        dose: '',
        quantity: '',
        duration: '',
        frequency: '',
        instructions: '',
      },
    ]));
  };

  const removeMedicineRow = (rowId) => {
    setMedicineRows((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((row) => row.id !== rowId);
    });
  };

  const appendTag = (currentValue, newTag) => {
    const current = parseCommaSeparated(currentValue);
    if (current.some((item) => item.toLowerCase() === String(newTag).toLowerCase())) {
      return current.join(', ');
    }
    return [...current, newTag].join(', ');
  };

  const save = async () => {
    const normalizedMedicines = medicineRows
      .map((row) => ({
        name: String(row.name || '').trim(),
        dose: String(row.dose || '').trim(),
        quantity: String(row.quantity || '').trim(),
        duration: String(row.duration || '').trim(),
        frequency: String(row.frequency || '').trim(),
        instructions: String(row.instructions || '').trim(),
      }))
      .filter((row) => row.name);

    const tests = parseCommaSeparated(testsText);
    const scans = parseCommaSeparated(scansText);

    if (!/^\d{10}$/.test(patientPhone)) {
      Alert.alert(t('phoneRule'));
      return;
    }

    if (!diagnosis.trim() && normalizedMedicines.length === 0 && !doctorNotes.trim()) {
      Alert.alert('Please add diagnosis, at least one medicine, or doctor notes.');
      return;
    }

    const text = buildPrescriptionText({
      diagnosisText: diagnosis.trim(),
      medicines: normalizedMedicines,
      tests,
      scans,
      notes: doctorNotes.trim(),
      followUp: followUpDays.trim(),
    });

    try {
      await simpleApiService.createPrescription({
        patientPhone,
        doctorName: doctor?.name,
        text,
        diagnosis: diagnosis.trim(),
        medicines: normalizedMedicines,
        tests,
        scans,
        doctorNotes: doctorNotes.trim(),
        followUpDays: followUpDays.trim(),
      });

      Alert.alert(
        'Prescription saved successfully',
        `Doctor: ${doctor?.name || '-'}\nPatient: ${patientPhone}`
      );
      setPatientPhone('');
      setDiagnosis('');
      setDoctorNotes('');
      setFollowUpDays('');
      setTestsText('');
      setScansText('');
      setMedicineRows([
        {
          id: `med_${Date.now()}`,
          name: '',
          dose: '',
          quantity: '',
          duration: '',
          frequency: '',
          instructions: '',
        },
      ]);
      setActiveMedicineRowId(null);
    } catch (error) {
      Alert.alert(error?.message || t('noData'));
    }
  };

  return (
    <AppShell>
      <Text style={styles.title}>{t('uploadPrescription')}</Text>

      <View style={styles.rxFormCard}>
        <Text style={styles.rxSectionTitle}>Patient + Diagnosis</Text>
        <TextInput
          placeholder={isPatientPhonePrefilled ? 'Patient phone (from accepted appointment)' : t('patientPhone')}
          value={patientPhone}
          onChangeText={(v) => setPatientPhone(v.replace(/[^0-9]/g, '').slice(0, 10))}
          keyboardType="phone-pad"
          style={styles.rxTextInput}
          editable={!isPatientPhonePrefilled}
          placeholderTextColor="#7a8594"
        />

        {/^[0-9]{10}$/.test(String(patientPhone || '').trim()) ? (
          <View style={styles.rxHistoryCard}>
            <Text style={styles.rxHistoryTitle}>Patient history with {doctor?.name || 'doctor'}</Text>

            {loadingHistorySummary ? (
              <Text style={styles.rxHistoryMeta}>Loading summary...</Text>
            ) : historySummaryError ? (
              <Text style={styles.rxHistoryError}>{historySummaryError}</Text>
            ) : historySummary?.hasHistory ? (
              <>
                <Text style={styles.rxHistoryMeta}>
                  Visits: {historySummary?.visitCountWithDoctor || 0}
                  {historySummary?.lastVisitDate ? ` • Last: ${historySummary.lastVisitDate}` : ''}
                </Text>
                {historySummary?.prioritizedByAppointment && historySummary?.appointmentAnchorDate ? (
                  <Text style={styles.rxHistoryMeta}>Prioritized for appointment date: {historySummary.appointmentAnchorDate}</Text>
                ) : null}
                
                {(Array.isArray(historySummary?.recentSymptoms) && historySummary.recentSymptoms.length > 0) ? (
                  <View style={styles.rxHistorySection}>
                    <Text style={styles.rxHistorySectionTitle}>Recent Symptoms:</Text>
                    <Text style={styles.rxHistoryHighlight}>{historySummary.recentSymptoms.join(', ')}</Text>
                  </View>
                ) : null}
                
                {(Array.isArray(historySummary?.recentDiagnoses) && historySummary.recentDiagnoses.length > 0) ? (
                  <View style={styles.rxHistorySection}>
                    <Text style={styles.rxHistorySectionTitle}>Recent Diagnosis:</Text>
                    <Text style={styles.rxHistoryHighlight}>{historySummary.recentDiagnoses.join(', ')}</Text>
                  </View>
                ) : null}
                
                {historySummary?.lastPrescriptionFromDoctor ? (
                  <Text style={styles.rxHistoryStrongBullet}>
                    Last prescription from this doctor: {historySummary.lastPrescriptionFromDoctor?.date || '-'}
                    {historySummary.lastPrescriptionFromDoctor?.diagnosis
                      ? ` • ${historySummary.lastPrescriptionFromDoctor.diagnosis}`
                      : ''}
                  </Text>
                ) : null}
                {(Array.isArray(historySummary?.summaryBullets) ? historySummary.summaryBullets : [])
                  .slice(0, 3)
                  .map((line, idx) => (
                    <Text key={`history_bullet_${idx}`} style={styles.rxHistoryBullet}>• {line}</Text>
                  ))}
              </>
            ) : (
              <Text style={styles.rxHistoryMeta}>No previous visits with this doctor yet.</Text>
            )}
          </View>
        ) : null}

        <TextInput
          placeholder="Diagnosis / Provisional diagnosis"
          value={diagnosis}
          onChangeText={setDiagnosis}
          multiline
          numberOfLines={3}
          style={styles.rxMultilineInput}
          placeholderTextColor="#7a8594"
        />
      </View>

      <View style={styles.rxFormCard}>
        <View style={styles.rxSectionHeaderRow}>
          <Text style={styles.rxSectionTitle}>Medicines</Text>
          <TouchableOpacity style={styles.rxAddButton} onPress={addMedicineRow}>
            <Text style={styles.rxAddButtonText}>+ Add medicine</Text>
          </TouchableOpacity>
        </View>

        {medicineRows.map((row, index) => {
          const suggestions = getMedicineSuggestions(row.name);
          const shouldShowSuggestions = activeMedicineRowId === row.id && suggestions.length > 0;

          return (
            <View key={row.id} style={styles.rxMedicineCard}>
              <View style={styles.rxMedicineTitleRow}>
                <Text style={styles.rxMedicineTitle}>Medicine {index + 1}</Text>
                {medicineRows.length > 1 ? (
                  <TouchableOpacity onPress={() => removeMedicineRow(row.id)}>
                    <Text style={styles.rxRemoveText}>Remove</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              <TextInput
                placeholder="Medicine name (type at least 2 letters)"
                value={row.name}
                onFocus={() => setActiveMedicineRowId(row.id)}
                onChangeText={(value) => {
                  setActiveMedicineRowId(row.id);
                  updateMedicineRow(row.id, { name: value });
                }}
                style={styles.rxTextInput}
                placeholderTextColor="#7a8594"
              />

              {shouldShowSuggestions ? (
                <View style={styles.rxSuggestionBox}>
                  {suggestions.map((name) => (
                    <TouchableOpacity
                      key={`${row.id}_${name}`}
                      style={styles.rxSuggestionItem}
                      onPress={() => {
                        updateMedicineRow(row.id, { name });
                        setActiveMedicineRowId(null);
                      }}
                    >
                      <Text style={styles.rxSuggestionText}>{name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}

              <View style={styles.rxTwoColRow}>
                <TextInput
                  placeholder="Dose (e.g. 1-0-1)"
                  value={row.dose}
                  onChangeText={(value) => updateMedicineRow(row.id, { dose: value })}
                  style={[styles.rxTextInput, styles.rxHalfInput]}
                  placeholderTextColor="#7a8594"
                />
                <TextInput
                  placeholder="Quantity"
                  value={row.quantity}
                  onChangeText={(value) => updateMedicineRow(row.id, { quantity: value })}
                  style={[styles.rxTextInput, styles.rxHalfInput]}
                  placeholderTextColor="#7a8594"
                />
              </View>

              <View style={styles.rxTwoColRow}>
                <TextInput
                  placeholder="Duration (e.g. 5 days)"
                  value={row.duration}
                  onChangeText={(value) => updateMedicineRow(row.id, { duration: value })}
                  style={[styles.rxTextInput, styles.rxHalfInput]}
                  placeholderTextColor="#7a8594"
                />
                <TextInput
                  placeholder="Frequency (e.g. after food)"
                  value={row.frequency}
                  onChangeText={(value) => updateMedicineRow(row.id, { frequency: value })}
                  style={[styles.rxTextInput, styles.rxHalfInput]}
                  placeholderTextColor="#7a8594"
                />
              </View>

              <TextInput
                placeholder="Instructions (optional)"
                value={row.instructions}
                onChangeText={(value) => updateMedicineRow(row.id, { instructions: value })}
                style={styles.rxTextInput}
                placeholderTextColor="#7a8594"
              />
            </View>
          );
        })}
      </View>

      <View style={styles.rxFormCard}>
        <Text style={styles.rxSectionTitle}>Tests / Scans / Notes</Text>

        <TextInput
          placeholder="Blood tests (comma separated): CBC, CRP"
          value={testsText}
          onChangeText={setTestsText}
          style={styles.rxTextInput}
          placeholderTextColor="#7a8594"
        />
        <View style={styles.rxChipRow}>
          {TEST_SUGGESTIONS.slice(0, 6).map((item) => (
            <TouchableOpacity key={item} style={styles.rxChip} onPress={() => setTestsText((prev) => appendTag(prev, item))}>
              <Text style={styles.rxChipText}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          placeholder="Scans (comma separated): Chest X-Ray, ECG"
          value={scansText}
          onChangeText={setScansText}
          style={styles.rxTextInput}
          placeholderTextColor="#7a8594"
        />
        <View style={styles.rxChipRow}>
          {SCAN_SUGGESTIONS.slice(0, 6).map((item) => (
            <TouchableOpacity key={item} style={styles.rxChip} onPress={() => setScansText((prev) => appendTag(prev, item))}>
              <Text style={styles.rxChipText}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          placeholder="Doctor notes"
          value={doctorNotes}
          onChangeText={setDoctorNotes}
          multiline
          numberOfLines={4}
          style={styles.rxMultilineInput}
          placeholderTextColor="#7a8594"
        />

        <TextInput
          placeholder="Follow-up in days (e.g. 7)"
          value={followUpDays}
          onChangeText={(value) => setFollowUpDays(value.replace(/[^0-9]/g, '').slice(0, 3))}
          keyboardType="numeric"
          style={styles.rxTextInput}
          placeholderTextColor="#7a8594"
        />
      </View>

      <BigButton title={t('savePrescription')} onPress={save} />
      <BigButton title={t('back')} variant="secondary" onPress={() => navigation.navigate('DoctorDashboard', { doctor })} />
    </AppShell>
  );
}

function AdminLoginScreen({ navigation }) {
  const { t } = useI18n();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const login = async () => {
    try {
      await simpleApiService.loginAdmin(username.trim(), password.trim());
      navigation.replace('AdminDashboard');
    } catch (error) {
      Alert.alert(error?.message || t('invalidCredentials'));
    }
  };

  return (
    <AppShell>
      <Text style={styles.title}>{t('adminLoginTitle')}</Text>
      <Input placeholder={t('username')} value={username} onChangeText={setUsername} />
      <Input placeholder={t('password')} value={password} onChangeText={setPassword} secureTextEntry />
      <BigButton title={t('login')} onPress={login} />
      <BigButton title={t('back')} variant="secondary" onPress={() => navigation.goBack()} />
    </AppShell>
  );
}

function AdminDashboardScreen({ navigation }) {
  const { t } = useI18n();

  return (
    <AppShell>
      <Text style={styles.title}>{t('adminDashboard')}</Text>
      <BigButton title={t('viewDoctors')} onPress={() => navigation.navigate('AdminDoctors')} />
      <BigButton title="⏰ Customize Doctor Time Slots" onPress={() => navigation.navigate('AdminDoctors')} />
      <BigButton title="Manage Pharmacies" onPress={() => navigation.navigate('AdminPharmacies')} />
      <BigButton title={t('viewPatients')} onPress={() => navigation.navigate('AdminPatients')} />
      <BigButton title={t('viewAppointments')} onPress={() => navigation.navigate('AdminAppointments')} />
      <BigButton title="Equipment Hub" onPress={() => navigation.navigate('EquipmentHub', { admin: { userId: 'admin', name: 'Platform Admin' } })} />
      <BigButton title="📹 Treatment Videos" onPress={() => navigation.navigate('AdminVideoUpload', { token: 'admin_token' })} />
      <BigButton title={t('logout')} variant="secondary" onPress={() => navigation.replace('RoleSelect')} />
    </AppShell>
  );
}

function AdminDoctorsScreen({ navigation }) {
  const { t } = useI18n();
  const [doctors, setDoctors] = useState([]);
  const [doctorName, setDoctorName] = useState('');
  const [doctorSpecialty, setDoctorSpecialty] = useState('');
  const doctorPin = '1234';

  const loadDoctors = useCallback(async () => {
    try {
      const result = await simpleApiService.getDoctors();
      setDoctors(result.doctors || []);
    } catch (error) {
      setDoctors([]);
    }
  }, []);

  React.useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadDoctors);
    return unsubscribe;
  }, [navigation, loadDoctors]);

  const handleAddDoctor = async () => {
    if (!doctorName.trim() || !doctorSpecialty.trim()) {
      Alert.alert('Please enter doctor name and specialty');
      return;
    }

    try {
      await simpleApiService.addDoctor({
        name: doctorName.trim(),
        specialty: doctorSpecialty.trim(),
        pin: doctorPin,
      });
      setDoctorName('');
      setDoctorSpecialty('');
      await loadDoctors();
      Alert.alert('Doctor added');
    } catch (error) {
      Alert.alert(error?.message || 'Failed to add doctor');
    }
  };

  const handleDeleteDoctor = async (doctor) => {
    Alert.alert(
      'Delete doctor',
      `Delete ${doctor?.name || 'this doctor'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await simpleApiService.deleteDoctor(doctor.id);
              await loadDoctors();
            } catch (error) {
              Alert.alert(error?.message || 'Failed to delete doctor');
            }
          },
        },
      ]
    );
  };

  return (
    <AppShell>
      <Text style={styles.title}>{t('viewDoctors')}</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Add Doctor</Text>
        <Input placeholder="Doctor name" value={doctorName} onChangeText={setDoctorName} />
        <Input placeholder="Specialty" value={doctorSpecialty} onChangeText={setDoctorSpecialty} />
        <Input
          placeholder="Password fixed to 1234"
          value={doctorPin}
          onChangeText={() => {}}
          keyboardType="numeric"
          secureTextEntry
          editable={false}
        />
        <BigButton title="Add Doctor" onPress={handleAddDoctor} />
      </View>

      {doctors.length === 0 ? (
        <Text style={styles.emptyText}>{t('noDoctors')}</Text>
      ) : (
        doctors.map((doctor) => (
          <View key={doctor.id} style={styles.card}>
            <Text style={styles.cardTitle}>{doctor.name}</Text>
            <Text style={styles.cardText}>{doctor.specialty}</Text>
            <View style={styles.doctorCardActions}>
              <TouchableOpacity
                style={[styles.adminPrimaryActionButton, { flex: 1 }]}
                onPress={() => navigation.navigate('AdminDoctorTimeSlots', { doctor })}
              >
                <Text style={styles.adminPrimaryActionButtonText}>Customize Time Slots</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.adminDeleteButton, { flex: 1, backgroundColor: '#EF4444', marginLeft: 8 }]}
                onPress={() => handleDeleteDoctor(doctor)}
              >
                <Text style={styles.adminDeleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
      <BigButton title="📊 View Symptom Coverage" onPress={() => navigation.navigate('AdminSymptomCoverage')} />
      <BigButton title={t('back')} variant="secondary" onPress={() => navigation.navigate('AdminDashboard')} />
    </AppShell>
  );
}

function AdminDoctorTimeSlotsScreen({ navigation, route }) {
  const { doctor } = route?.params || {};
  const defaultSlots = useMemo(() => [
    '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM'
  ], []);
  const [slots, setSlots] = useState(defaultSlots);
  const [selectedSlots, setSelectedSlots] = useState(defaultSlots.map(() => true));
  const [customSlot, setCustomSlot] = useState('');
  const [loading, setLoading] = useState(false);

  const normalizeSlotValue = useCallback((value) => String(value || '').trim().toLowerCase(), []);

  React.useEffect(() => {
    const loadSlots = async () => {
      if (!doctor?.id) return;
      try {
        const result = await simpleApiService.getDoctorTimeSlots(doctor.id);
        const remoteSlots = Array.isArray(result?.slots) ? result.slots : [];
        if (remoteSlots.length > 0) {
          const normalizedDefault = new Set(defaultSlots.map((slot) => normalizeSlotValue(slot)));
          const uniqueRemote = [...new Set(remoteSlots.map((slot) => String(slot || '').trim()).filter(Boolean))];
          const customRemote = uniqueRemote.filter((slot) => !normalizedDefault.has(normalizeSlotValue(slot)));
          const mergedSlots = [...defaultSlots, ...customRemote];
          const selectedSet = new Set(uniqueRemote.map((slot) => normalizeSlotValue(slot)));

          setSlots(mergedSlots);
          setSelectedSlots(mergedSlots.map((slot) => selectedSet.has(normalizeSlotValue(slot))));
        }
      } catch (error) {
        console.log('Failed to load slots:', error?.message);
      }
    };
    loadSlots();
  }, [defaultSlots, doctor?.id, normalizeSlotValue]);

  const handleSaveSlots = async () => {
    if (!doctor?.id) {
      Alert.alert('Error', 'Doctor not selected');
      return;
    }
    setLoading(true);
    try {
      const selectedTimeSlots = slots.filter((_, idx) => selectedSlots[idx]);
      if (selectedTimeSlots.length === 0) {
        Alert.alert('Error', 'Please select at least one time slot');
        setLoading(false);
        return;
      }
      await simpleApiService.updateDoctorTimeSlots(doctor.id, { slots: selectedTimeSlots });
      Alert.alert('Success', `Time slots updated for ${doctor.name}`);
      navigation.navigate('AdminDoctors');
    } catch (error) {
      Alert.alert('Error', error?.message || 'Failed to save time slots');
    } finally {
      setLoading(false);
    }
  };

  const toggleSlot = (idx) => {
    const updated = [...selectedSlots];
    updated[idx] = !updated[idx];
    setSelectedSlots(updated);
  };

  const handleAddCustomSlot = () => {
    const trimmed = String(customSlot || '').trim();
    if (!trimmed) {
      Alert.alert('Enter a time slot', 'Example: 12:15 PM');
      return;
    }

    const normalized = normalizeSlotValue(trimmed);
    const exists = slots.some((slot) => normalizeSlotValue(slot) === normalized);
    if (exists) {
      Alert.alert('Already added', 'This time slot already exists.');
      return;
    }

    setSlots((prev) => [...prev, trimmed]);
    setSelectedSlots((prev) => [...prev, true]);
    setCustomSlot('');
  };

  return (
    <AppShell>
      <Text style={styles.title}>⏰ Time Slots for {doctor?.name}</Text>
      <Text style={styles.subtitle}>Select available consultation hours</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Add Custom Time Slot</Text>
        <Input
          placeholder="e.g. 12:15 PM"
          value={customSlot}
          onChangeText={setCustomSlot}
        />
        <BigButton title="➕ Add Custom Slot" onPress={handleAddCustomSlot} />
      </View>

      <View style={styles.card}>
        <View style={styles.slotGrid}>
          {slots.map((slot, idx) => (
            <TouchableOpacity
              key={slot}
              style={[
                styles.slotButton,
                selectedSlots[idx] && styles.slotButtonSelected,
              ]}
              onPress={() => toggleSlot(idx)}
            >
              <Text style={[
                styles.slotButtonText,
                selectedSlots[idx] && styles.slotButtonTextSelected,
              ]}>
                {slot}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <BigButton
        title={loading ? 'Saving...' : '💾 Save Time Slots'}
        onPress={handleSaveSlots}
        disabled={loading}
      />
      <BigButton title="Back" variant="secondary" onPress={() => navigation.navigate('AdminDashboard')} />
    </AppShell>
  );
}

function AdminSymptomCoverageScreen({ navigation }) {
  const [coverage, setCoverage] = useState([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const loadCoverage = async () => {
      try {
        const result = await simpleApiService.getDoctorSymptomCoverage();
        setCoverage(result?.coverage || []);
      } catch (error) {
        setCoverage([]);
        Alert.alert('Error', error?.message || 'Failed to load coverage data');
      } finally {
        setLoading(false);
      }
    };
    loadCoverage();
  }, []);

  const uncoveredSpecialties = coverage.filter(item => !item.hasDoctor);

  return (
    <AppShell>
      <Text style={styles.title}>🏥 Symptom-Doctor Coverage</Text>
      
      {loading && <Text style={styles.cardText}>Loading coverage data...</Text>}

      {!loading && uncoveredSpecialties.length > 0 && (
        <View style={styles.card}>
          <Text style={{ ...styles.cardTitle, color: '#DC2626' }}>⚠️ Missing Doctors</Text>
          {uncoveredSpecialties.map((item) => (
            <View key={item.specialty} style={styles.coverageItem}>
              <Text style={styles.cardText}>{item.specialty}</Text>
              <Text style={styles.smallText}>{item.symptomCount} symptoms</Text>
            </View>
          ))}
          <Text style={styles.smallText} >Please assign doctors to these specialties</Text>
        </View>
      )}

      {!loading && uncoveredSpecialties.length === 0 && coverage.length > 0 && (
        <View style={styles.card}>
          <Text style={{ ...styles.cardTitle, color: '#16A34A' }}>✅ Full Coverage</Text>
          <Text style={styles.cardText}>All specialties have assigned doctors:</Text>
          {coverage.map((item) => (
            <View key={item.specialty} style={styles.coverageItem}>
              <Text style={styles.cardText}>✓ {item.specialty}</Text>
              <Text style={styles.smallText}>{item.doctorCount} doctor(s) • {item.symptomCount} symptoms</Text>
            </View>
          ))}
        </View>
      )}

      {!loading && coverage.length === 0 && (
        <View style={styles.card}>
          <Text style={styles.cardText}>No doctors or specialties configured yet</Text>
        </View>
      )}

      <BigButton title="Back" variant="secondary" onPress={() => navigation.navigate('AdminDashboard')} />
    </AppShell>
  );
}

function AdminPharmaciesScreen({ navigation }) {
  const [pharmacies, setPharmacies] = useState([]);
  const [pharmacyName, setPharmacyName] = useState('');
  const [pharmacyAddress, setPharmacyAddress] = useState('');
  const [pharmacyContact, setPharmacyContact] = useState('');
  const [stockMedicineName, setStockMedicineName] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [stockUnit, setStockUnit] = useState('tabs');
  const [selectedPharmacyId, setSelectedPharmacyId] = useState('');

  const loadPharmacies = useCallback(async () => {
    try {
      const result = await simpleApiService.getPharmacies();
      const rows = Array.isArray(result?.pharmacies) ? result.pharmacies : [];
      setPharmacies(rows);
      if (!selectedPharmacyId && rows.length > 0) {
        setSelectedPharmacyId(rows[0].id);
      }
    } catch (error) {
      setPharmacies([]);
    }
  }, [selectedPharmacyId]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadPharmacies);
    return unsubscribe;
  }, [navigation, loadPharmacies]);

  const handleAddPharmacy = async () => {
    if (!pharmacyName.trim()) {
      Alert.alert('Pharmacy name is required');
      return;
    }

    try {
      await simpleApiService.addPharmacy({
        name: pharmacyName.trim(),
        address: pharmacyAddress.trim(),
        contact: pharmacyContact.trim(),
      });
      setPharmacyName('');
      setPharmacyAddress('');
      setPharmacyContact('');
      await loadPharmacies();
      Alert.alert('Pharmacy added');
    } catch (error) {
      Alert.alert(error?.message || 'Failed to add pharmacy');
    }
  };

  const handleUpdateStock = async () => {
    if (!selectedPharmacyId || !stockMedicineName.trim() || stockQuantity === '') {
      Alert.alert('Select pharmacy and enter medicine + quantity');
      return;
    }

    try {
      await simpleApiService.updatePharmacyStock(selectedPharmacyId, {
        medicineName: stockMedicineName.trim(),
        quantity: Number(stockQuantity),
        unit: stockUnit.trim() || 'tabs',
      });
      setStockMedicineName('');
      setStockQuantity('');
      setStockUnit('tabs');
      await loadPharmacies();
      Alert.alert('Stock updated');
    } catch (error) {
      Alert.alert(error?.message || 'Failed to update stock');
    }
  };

  return (
    <AppShell>
      <Text style={styles.title}>Pharmacy Stock</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Add Pharmacy</Text>
        <Input placeholder="Pharmacy name" value={pharmacyName} onChangeText={setPharmacyName} />
        <Input placeholder="Address" value={pharmacyAddress} onChangeText={setPharmacyAddress} />
        <Input placeholder="Contact" value={pharmacyContact} onChangeText={setPharmacyContact} />
        <BigButton title="Add Pharmacy" onPress={handleAddPharmacy} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Update Medicine Stock</Text>
        <TextInput
          style={styles.input}
          placeholder="Pharmacy ID"
          value={selectedPharmacyId}
          onChangeText={setSelectedPharmacyId}
          placeholderTextColor="#7a7a7a"
        />
        <Input placeholder="Medicine name" value={stockMedicineName} onChangeText={setStockMedicineName} />
        <Input
          placeholder="Quantity"
          value={stockQuantity}
          onChangeText={(value) => setStockQuantity(value.replace(/[^0-9]/g, ''))}
          keyboardType="numeric"
        />
        <Input placeholder="Unit (tabs, strips, bottles)" value={stockUnit} onChangeText={setStockUnit} />
        <BigButton title="Update Stock" onPress={handleUpdateStock} />
      </View>

      {pharmacies.map((pharmacy) => (
        <View key={pharmacy.id} style={styles.card}>
          <Text style={styles.cardTitle}>{pharmacy.name}</Text>
          <Text style={styles.smallText}>ID: {pharmacy.id}</Text>
          {!!pharmacy.address && <Text style={styles.cardText}>{pharmacy.address}</Text>}
          {!!pharmacy.contact && <Text style={styles.cardText}>{pharmacy.contact}</Text>}

          {Array.isArray(pharmacy.stock) && pharmacy.stock.length > 0 ? (
            pharmacy.stock.map((item) => (
              <Text key={item.id} style={styles.smallText}>• {item.name}: {item.quantity} {item.unit || ''}</Text>
            ))
          ) : (
            <Text style={styles.smallText}>No stock added yet</Text>
          )}
        </View>
      ))}

      <BigButton title="Back" variant="secondary" onPress={() => navigation.navigate('AdminDashboard')} />
    </AppShell>
  );
}

function AdminPatientsScreen({ navigation }) {
  const { t } = useI18n();
  const [patients, setPatients] = useState([]);

  React.useEffect(() => {
    const load = async () => {
      try {
        const result = await simpleApiService.getPatients();
        setPatients(result.patients || []);
      } catch (error) {
        setPatients([]);
      }
    };
    const unsubscribe = navigation.addListener('focus', load);
    return unsubscribe;
  }, [navigation]);

  return (
    <AppShell>
      <Text style={styles.title}>{t('viewPatients')}</Text>
      {patients.length === 0 ? (
        <Text style={styles.emptyText}>{t('noPatients')}</Text>
      ) : (
        patients.map((patient) => (
          <View key={patient.id} style={styles.card}>
            <Text style={styles.cardTitle}>{patient.name}</Text>
            <Text style={styles.cardText}>{patient.phone}</Text>
            <Text style={styles.smallText}>{`${patient.village} • ${patient.age}`}</Text>
          </View>
        ))
      )}
      <BigButton title={t('back')} variant="secondary" onPress={() => navigation.navigate('AdminDashboard')} />
    </AppShell>
  );
}

function AdminAppointmentsScreen({ navigation }) {
  const { t } = useI18n();
  const [appointments, setAppointments] = useState([]);

  React.useEffect(() => {
    const load = async () => {
      try {
        const result = await simpleApiService.getAppointments();
        setAppointments(result.appointments || []);
      } catch (error) {
        setAppointments([]);
      }
    };
    const unsubscribe = navigation.addListener('focus', load);
    return unsubscribe;
  }, [navigation]);

  return (
    <AppShell>
      <Text style={styles.title}>{t('viewAppointments')}</Text>
      {appointments.length === 0 ? (
        <Text style={styles.emptyText}>{t('noAppointments')}</Text>
      ) : (
        appointments.map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.cardTitle}>{`${item.patientName} → ${item.doctorName}`}</Text>
            <Text style={styles.cardText}>{item.date}</Text>
            <Text style={styles.smallText}>{item.reason}</Text>
          </View>
        ))
      )}
      <BigButton title={t('back')} variant="secondary" onPress={() => navigation.navigate('AdminDashboard')} />
    </AppShell>
  );
}

export default function SimpleTelemedicineApp() {
  const [language, setLanguageState] = useState(languageService.getCurrentLanguage() || 'en');
  const [currentRouteName, setCurrentRouteName] = useState('RoleSelect');
  const lastPatientRef = useRef(null);
  const lastDoctorRef = useRef(null);
  const lastRoleRef = useRef(null);
  const escalatedReminderKeysRef = useRef(new Set());
  const pendingMedicineReminderRef = useRef(null);

  const setLanguage = (lang) => {
    setLanguageState(lang);
    languageService.setLanguage(lang);
  };

  useEffect(() => {
    languageService.setLanguage(language);
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t: (key) => translations[language]?.[key] || translations.en[key] || key,
    }),
    [language]
  );

  useEffect(() => {
    const hasIntakeForSlot = (medicine, dateString, time) => {
      if (!medicine || !time) return false;
      const targetDate = dateString || new Date().toISOString().split('T')[0];
      const intakeDates = Array.isArray(medicine.intakeDates) ? medicine.intakeDates : [];
      const dayEntry = intakeDates.find((entry) => String(entry?.date) === String(targetDate));
      const takenTimes = Array.isArray(dayEntry?.times) ? dayEntry.times : [];
      return takenTimes.includes(time);
    };

    const getReminderEscalationLevel = (reminderStage) => {
      const stage = String(reminderStage || '').toLowerCase();
      if (stage === 'primary') return 0;
      if (stage === 'emergency') return 6;
      const match = stage.match(/^followup_(\d+)$/);
      if (match) return Number(match[1]);
      const minuteMatch = stage.match(/^follow_up_(\d+)min$/);
      return minuteMatch ? Math.floor(Number(minuteMatch[1]) / 10) : 0;
    };

    const maybeNotifyEmergencyAfterFinalReminder = async (data) => {
      try {
        const type = String(data?.type || '').toLowerCase();
        if (type !== 'medicine_reminder') return;

        const escalationLevel = getReminderEscalationLevel(data?.reminderStage);
        // Emergency action is only allowed on the final reminder stage.
        if (escalationLevel < 6) return;

        const medicineId = String(data?.medicineId || '').trim();
        const medicineName = String(data?.medicineName || 'Medicine').trim();
        const time = String(data?.time || '').trim();
        const dateString = data?.dateString || new Date().toISOString().split('T')[0];

        if (!medicineId || !time) return;

        const reminderKey = `${medicineId}_${time}_${dateString}`;
        if (escalatedReminderKeysRef.current.has(reminderKey)) {
          return;
        }

        const medicineResponse = await simpleApiService.getMedicineById(medicineId);
        const medicine = medicineResponse?.medicine;
        if (hasIntakeForSlot(medicine, dateString, time)) {
          return;
        }

        const savedContact = (await AsyncStorage.getItem(EMERGENCY_CONTACT_KEY)) || '';
        const fallbackContact = process.env.EXPO_PUBLIC_EMERGENCY_CONTACT_NUMBER || '';
        const emergencyContact = String(savedContact || fallbackContact).trim();
        if (!emergencyContact) {
          return;
        }

        const patient = lastPatientRef.current || {};
        const patientName = patient?.name || data?.userName || 'Patient';
        const patientPhone = patient?.phone || 'Unknown';
        const customMessage = `⚠️ Medicine Alert: ${patientName} has not confirmed taking ${medicineName} scheduled at ${time}. Please check immediately.`;

        await simpleApiService.notifyEmergencyContact({
          phoneNumber: emergencyContact,
          userName: patientName,
          userPhone: patientPhone,
          customMessage,
        });

        escalatedReminderKeysRef.current.add(reminderKey);
      } catch (error) {
        console.warn('Final medicine reminder emergency notify failed:', error?.message || error);
      }
    };

    const navigateToMedicineReminderScan = (data) => {
      if (String(data?.type || '').toLowerCase() !== 'medicine_reminder' || !data?.medicineId) {
        return false;
      }

      const payload = {
        pendingScanMedicineId: String(data.medicineId),
        pendingScanUserId: data.userId || null,
        pendingScanTime: data.time || null,
        pendingScanNonce: Date.now(),
      };

      if (!navigationRef.isReady()) {
        pendingMedicineReminderRef.current = payload;
        return false;
      }

      pendingMedicineReminderRef.current = null;
      navigationRef.navigate('MedicineReminder', payload);
      return true;
    };

    // When user taps a medicine alarm notification, navigate straight to scan screen
    const handleMedicineReminderTap = (data) => {
      NotificationService.stopInAppEmergencyTone().catch(() => {});

      navigateToMedicineReminderScan(data);
    };

    const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification?.request?.content?.data || {};
      if (String(data?.type || '').toLowerCase() === 'medicine_reminder') {
        NotificationService.playInAppEmergencyTone(10000).catch(() => {});
        maybeNotifyEmergencyAfterFinalReminder(data).catch(() => {});

        Alert.alert(
          '💊 Medicine reminder',
          `It\'s time to scan ${data?.medicineName || 'your medicine'}${data?.time ? ` at ${data.time}` : ''}.`,
          [
            { text: 'Later', style: 'cancel' },
            { text: 'Scan now', onPress: () => handleMedicineReminderTap(data) },
          ]
        );
      }
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      NotificationService.stopInAppEmergencyTone().catch(() => {});
      const data = response?.notification?.request?.content?.data || {};
      maybeNotifyEmergencyAfterFinalReminder(data).catch(() => {});
      handleMedicineReminderTap(data);
    });

    // Also handle app-open from a notification that was tapped before listener attached
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        const data = response?.notification?.request?.content?.data || {};
        maybeNotifyEmergencyAfterFinalReminder(data).catch(() => {});
        handleMedicineReminderTap(data);
      })
      .catch(() => {});

    // Safety check: if reminder notifications are already visible when app becomes active,
    // evaluate them for missed final escalation as well.
    const checkPresentedMedicineReminders = () => {
      Notifications.getPresentedNotificationsAsync()
        .then((presented) => {
          (Array.isArray(presented) ? presented : []).forEach((item) => {
            const data = item?.request?.content?.data || {};
            if (String(data?.type || '').toLowerCase() === 'medicine_reminder') {
              maybeNotifyEmergencyAfterFinalReminder(data).catch(() => {});
            }
          });
        })
        .catch(() => {});
    };

    checkPresentedMedicineReminders();

    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        checkPresentedMedicineReminders();
      }
    });

    return () => {
      receivedSub.remove();
      responseSub.remove();
      appStateSubscription.remove();
      NotificationService.stopInAppEmergencyTone().catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return undefined;
    }

    const patientRoutes = new Set([
      'BookAppointment',
      'PatientPrescriptions',
      'HealthRecords',
      'FirstAidVideos',
      'MedicalEquipment',
      'EquipmentHub',
      'SymptomChecker',
      'NearbyHospitals',
      'MedicineReminder',
      'AddMedicineScreen',
      'EmergencyHelp',
    ]);

    const doctorRoutes = new Set([
      'DoctorAppointments',
      'UploadPrescription',
    ]);

    const adminRoutes = new Set([
      'AdminDoctors',
      'AdminDoctorTimeSlots',
      'AdminSymptomCoverage',
      'AdminPharmacies',
      'AdminPatients',
      'AdminAppointments',
    ]);

    const onHardwareBackPress = () => {
      if (!navigationRef.isReady()) {
        return false;
      }

      const routeName = currentRouteName;

      if (!routeName || routeName === 'RoleSelect') {
        return false;
      }

      if (routeName === 'PatientLogin' || routeName === 'DoctorLogin' || routeName === 'AdminLogin') {
        navigationRef.navigate('RoleSelect');
        return true;
      }

      if (routeName === 'PatientDashboard' || routeName === 'DoctorDashboard' || routeName === 'AdminDashboard') {
        return false;
      }

      if (routeName === 'VideoCall') {
        if (lastRoleRef.current === 'doctor') {
          navigationRef.navigate('DoctorDashboard', lastDoctorRef.current ? { doctor: lastDoctorRef.current } : undefined);
          return true;
        }

        navigationRef.navigate('PatientDashboard', lastPatientRef.current ? { patient: lastPatientRef.current } : undefined);
        return true;
      }

      if (patientRoutes.has(routeName)) {
        navigationRef.navigate('PatientDashboard', lastPatientRef.current ? { patient: lastPatientRef.current } : undefined);
        return true;
      }

      if (doctorRoutes.has(routeName)) {
        navigationRef.navigate('DoctorDashboard', lastDoctorRef.current ? { doctor: lastDoctorRef.current } : undefined);
        return true;
      }

      if (adminRoutes.has(routeName)) {
        navigationRef.navigate('AdminDashboard');
        return true;
      }

      if (navigationRef.canGoBack()) {
        navigationRef.goBack();
        return true;
      }

      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onHardwareBackPress);

    return () => {
      subscription.remove();
    };
  }, [currentRouteName]);

  return (
    <VoiceProvider>
      <LanguageContext.Provider value={value}>
        <NavigationContainer 
          ref={navigationRef}
          onReady={() => {
            if (pendingMedicineReminderRef.current) {
              const pending = pendingMedicineReminderRef.current;
              pendingMedicineReminderRef.current = null;
              navigationRef.navigate('MedicineReminder', pending);
            }
          }}
          onStateChange={(state) => {
            const activeRoute = state?.routes?.[state?.index];
            const routeName = activeRoute?.name;
            if (routeName) {
              setCurrentRouteName(routeName);
            }

            const routeParams = activeRoute?.params || {};

            if (routeName === 'PatientDashboard') {
              if (routeParams?.patient) {
                lastPatientRef.current = routeParams.patient;
              }
              lastRoleRef.current = 'patient';
            }

            if (routeName === 'DoctorDashboard') {
              if (routeParams?.doctor) {
                lastDoctorRef.current = routeParams.doctor;
              }
              lastRoleRef.current = 'doctor';
            }

            if (routeParams?.patient) {
              lastPatientRef.current = routeParams.patient;
            }

            if (routeParams?.doctor) {
              lastDoctorRef.current = routeParams.doctor;
            }
          }}
        >
          <View style={{ flex: 1 }}>
            <Stack.Navigator
              initialRouteName="RoleSelect"
              screenOptions={{
                headerShown: false,
              }}
            >
              <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
              <Stack.Screen name="PatientLogin" component={PatientLoginScreen} />
              <Stack.Screen name="PatientDashboard" component={PatientDashboardScreen} />
              <Stack.Screen name="BookAppointment" component={BookAppointmentScreen} />
              <Stack.Screen name="PatientPrescriptions" component={PatientPrescriptionsScreen} />
              <Stack.Screen name="VideoCall" component={VideoCallScreen} />
              <Stack.Screen name="HealthRecords" component={HealthRecordsScreen} />
              <Stack.Screen name="FirstAidVideos" component={FirstAidVideosScreen} />
              <Stack.Screen name="MedicalEquipment" component={MedicalEquipmentScreen} />
              <Stack.Screen name="EquipmentHub" component={EquipmentHubScreen} />
              <Stack.Screen name="SymptomChecker" component={SymptomCheckerScreen} />
              <Stack.Screen name="NearbyHospitals" component={NearbyHospitalsScreen} />
              <Stack.Screen name="MedicineReminder" component={MedicineReminderScreen} />
              <Stack.Screen name="AddMedicineScreen" component={AddMedicineScreen} />
              <Stack.Screen name="EmergencyHelp" component={EmergencyHelpScreen} />
              <Stack.Screen name="EmergencyAnimationList" component={EmergencyAnimationListScreen} />

              <Stack.Screen name="DoctorLogin" component={DoctorLoginScreen} />
              <Stack.Screen name="DoctorDashboard" component={DoctorDashboardScreen} />
              <Stack.Screen name="DoctorAppointments" component={DoctorAppointmentsScreen} />
              <Stack.Screen name="UploadPrescription" component={UploadPrescriptionScreen} />

              <Stack.Screen name="AdminLogin" component={AdminLoginScreen} />
              <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
              <Stack.Screen name="AdminDoctors" component={AdminDoctorsScreen} />
              <Stack.Screen name="AdminDoctorTimeSlots" component={AdminDoctorTimeSlotsScreen} />
              <Stack.Screen name="AdminSymptomCoverage" component={AdminSymptomCoverageScreen} />
              <Stack.Screen name="AdminPharmacies" component={AdminPharmaciesScreen} />
              <Stack.Screen name="AdminVideoUpload" component={AdminVideoUploadScreen} />
              <Stack.Screen name="AdminPatients" component={AdminPatientsScreen} />
              <Stack.Screen name="AdminAppointments" component={AdminAppointmentsScreen} />
            </Stack.Navigator>
            {currentRouteName !== 'RoleSelect' && 
             currentRouteName !== 'PatientDashboard' && 
             currentRouteName !== 'PatientLogin' &&
             currentRouteName !== 'DoctorLogin' &&
             currentRouteName !== 'DoctorDashboard' &&
             currentRouteName !== 'DoctorAppointments' &&
             currentRouteName !== 'UploadPrescription' && (
              <GlobalVoiceFAB language={language} t={value.t} />
            )}
          </View>
        </NavigationContainer>
        <StatusBar style="dark" />
      </LanguageContext.Provider>
    </VoiceProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f8ff',
  },
  screenContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  dashboardContainer: {
    flex: 1,
    backgroundColor: '#f5f8ff',
  },
  dashboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 4,
    backgroundColor: '#f5f8ff',
  },
  dashboardHeaderTextWrap: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  dashboardBackButton: {
    minHeight: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 8,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#1157c2',
    backgroundColor: '#ffffff',
  },
  dashboardBackButtonText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1157c2',
  },
  backChip: {
    minHeight: 40,
    minWidth: 72,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d7e3f8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backChipText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1157c2',
  },
  dashboardScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 104,
  },
  dashboardTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f2f67',
    textAlign: 'left',
  },
  dashboardSubtitle: {
    fontSize: 12,
    color: '#4c6487',
    textAlign: 'left',
    marginTop: 4,
    marginBottom: 12,
    fontWeight: '600',
  },
  welcomeCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#d7e3f8',
    marginBottom: 14,
  },
  welcomeLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#5a7398',
  },
  welcomeName: {
    fontSize: 24,
    fontWeight: '900',
    color: '#103467',
    marginTop: 2,
  },
  welcomeSubtext: {
    fontSize: 14,
    color: '#4a6385',
    marginTop: 6,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statCard: {
    width: '49%',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#d7e3f8',
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statIconText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '900',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#103467',
  },
  statLabel: {
    fontSize: 12,
    color: '#597190',
    marginTop: 4,
    lineHeight: 16,
  },
  dashboardSectionHeader: {
    marginTop: 4,
    marginBottom: 10,
  },
  dashboardSectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#103467',
  },
  dashboardSectionSubtitle: {
    fontSize: 13,
    color: '#5a7398',
    marginTop: 3,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  actionButton: {
    flex: 1,
    minHeight: 64,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonDisabled: {
    opacity: 0.45,
  },
  deleteActionButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteActionButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
  },
  actionIcon: {
    fontSize: 18,
    marginBottom: 4,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  bookingCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#d7e3f8',
    marginBottom: 12,
  },
  bookingCardSelected: {
    borderColor: '#1157c2',
    backgroundColor: '#f4f8ff',
    shadowColor: '#1157c2',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  bookingRowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 10,
  },
  bookingInfo: {
    flex: 1,
  },
  bookingName: {
    fontSize: 17,
    fontWeight: '900',
    color: '#103467',
  },
  bookingMeta: {
    fontSize: 13,
    color: '#5a7398',
    marginTop: 4,
    lineHeight: 18,
  },
  bookingBadge: {
    backgroundColor: '#e9f2ff',
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  bookingSmallLine: {
    fontSize: 12,
    color: '#4a6385',
    marginBottom: 8,
    fontWeight: '700',
  },
  selectAppointmentButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#E8F0FE',
    borderWidth: 1,
    borderColor: '#BCD2F8',
    marginBottom: 8,
  },
  selectAppointmentButtonText: {
    color: '#1157c2',
    fontSize: 12,
    fontWeight: '800',
  },
  bookingActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  completedText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
  },
  joinButton: {
    backgroundColor: '#0F7AE5',
    borderRadius: 14,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinButtonDisabled: {
    opacity: 0.45,
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
  },
  consultCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#d7e3f8',
  },
  emptyConsultWrap: {
    paddingVertical: 10,
    paddingBottom: 6,
  },
  emptyConsultTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#103467',
    marginBottom: 4,
  },
  emptyConsultText: {
    fontSize: 13,
    color: '#4a6385',
    lineHeight: 18,
  },
  doctorDashboardPatientName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#103467',
  },
  doctorDashboardPatientMeta: {
    marginTop: 4,
    fontSize: 13,
    color: '#5a7398',
  },
  patientLine: {
    marginTop: 10,
    fontSize: 14,
    color: '#234b80',
    lineHeight: 20,
  },
  patientLineLabel: {
    fontWeight: '900',
    color: '#103467',
  },
  reportBox: {
    marginTop: 14,
    backgroundColor: '#f7fbff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#d7e3f8',
  },
  noteBox: {
    marginTop: 12,
    backgroundColor: '#f7fbff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#d7e3f8',
  },
  reportTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#103467',
    marginBottom: 6,
  },
  reportItem: {
    fontSize: 13,
    color: '#234b80',
    marginBottom: 4,
  },
  noteText: {
    fontSize: 14,
    color: '#234b80',
    lineHeight: 20,
  },
  endConsultButton: {
    marginTop: 12,
    minHeight: 54,
    borderRadius: 14,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  endConsultText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
  },
  scheduleCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#d7e3f8',
  },
  earningsCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#d7e3f8',
  },
  earningsTotal: {
    fontSize: 30,
    fontWeight: '900',
    color: '#16A34A',
  },
  earningsSubtext: {
    fontSize: 13,
    color: '#5a7398',
    marginTop: 4,
    marginBottom: 12,
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#103467',
    marginTop: 8,
    marginBottom: 6,
  },
  historyItem: {
    fontSize: 13,
    color: '#234b80',
    marginBottom: 4,
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#d7e3f8',
    marginBottom: 12,
  },
  doctorHeroCard: {
    backgroundColor: '#1157c2',
    borderRadius: 24,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#0f3f83',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  doctorHeroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  doctorHeroAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doctorHeroAvatarText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
  },
  doctorHeroTextWrap: {
    flex: 1,
  },
  doctorHeroPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  doctorHeroPill: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  doctorHeroPillText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#103467',
  },
  profileSpecialty: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '800',
    marginTop: 4,
  },
  profileDetail: {
    fontSize: 14,
    color: '#234b80',
    marginTop: 8,
  },
  editProfileButton: {
    marginTop: 14,
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: '#e9f2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editProfileText: {
    color: '#1157c2',
    fontSize: 15,
    fontWeight: '900',
  },
  prescriptionCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#d7e3f8',
  },
  prescriptionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#103467',
    marginBottom: 8,
  },
  prescriptionLine: {
    fontSize: 13,
    color: '#234b80',
    marginBottom: 4,
  },
  generateButton: {
    marginTop: 12,
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
  },
  logoutButton: {
    minHeight: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d7e3f8',
    marginTop: 16,
  },
  logoutButtonText: {
    color: '#1157c2',
    fontSize: 15,
    fontWeight: '900',
  },
  bottomTabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#d7e3f8',
    paddingTop: 6,
    paddingBottom: 8,
    paddingHorizontal: 4,
  },
  bottomTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  bottomTabIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef4ff',
    marginBottom: 4,
  },
  bottomTabIconActive: {
    backgroundColor: '#1157c2',
  },
  bottomTabIconText: {
    fontSize: 16,
    color: '#1157c2',
    fontWeight: '900',
  },
  bottomTabText: {
    fontSize: 9,
    color: '#5a7398',
    fontWeight: '800',
  },
  bottomTabTextActive: {
    color: '#1157c2',
  },
  rxFormCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#d2dff2',
    padding: 12,
    marginBottom: 12,
  },
  rxSectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  rxSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#103467',
    marginBottom: 8,
  },
  rxTextInput: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: '#c6d4ed',
    borderRadius: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    fontSize: 14,
    color: '#102e55',
    marginBottom: 8,
  },
  rxMultilineInput: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: '#c6d4ed',
    borderRadius: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingTop: 10,
    fontSize: 14,
    color: '#102e55',
    marginBottom: 8,
    textAlignVertical: 'top',
  },
  rxAddButton: {
    backgroundColor: '#e8f0fe',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#b6cdf5',
  },
  rxAddButtonText: {
    color: '#1157c2',
    fontSize: 12,
    fontWeight: '800',
  },
  rxMedicineCard: {
    borderWidth: 1,
    borderColor: '#dbe7f8',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    backgroundColor: '#f9fcff',
  },
  rxMedicineTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  rxMedicineTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#103467',
  },
  rxRemoveText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#b91c1c',
  },
  rxTwoColRow: {
    flexDirection: 'row',
    gap: 8,
  },
  rxHalfInput: {
    flex: 1,
  },
  rxSuggestionBox: {
    borderWidth: 1,
    borderColor: '#d2dff2',
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  rxSuggestionItem: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eef4ff',
  },
  rxSuggestionText: {
    fontSize: 13,
    color: '#143c71',
    fontWeight: '600',
  },
  rxChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  rxChip: {
    backgroundColor: '#eef4ff',
    borderWidth: 1,
    borderColor: '#d4e3ff',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  rxChipText: {
    fontSize: 12,
    color: '#1d4f91',
    fontWeight: '700',
  },
  rxHistoryCard: {
    borderWidth: 1,
    borderColor: '#d3e3fb',
    borderRadius: 10,
    backgroundColor: '#f5f9ff',
    padding: 10,
    marginBottom: 8,
  },
  rxHistoryTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#103467',
    marginBottom: 6,
  },
  rxHistoryMeta: {
    fontSize: 12,
    color: '#43628d',
    marginBottom: 4,
    fontWeight: '600',
  },
  rxHistoryBullet: {
    fontSize: 12,
    color: '#234b80',
    marginBottom: 3,
    lineHeight: 17,
  },
  rxHistoryStrongBullet: {
    fontSize: 12,
    color: '#103467',
    fontWeight: '900',
    marginBottom: 5,
    lineHeight: 18,
  },
  rxHistoryError: {
    fontSize: 12,
    color: '#b91c1c',
    fontWeight: '700',
  },
  rxHistorySection: {
    marginVertical: 6,
    paddingVertical: 5,
    borderLeftWidth: 3,
    borderLeftColor: '#1d7874',
    paddingLeft: 8,
  },
  rxHistorySectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0d4a47',
    marginBottom: 3,
  },
  rxHistoryHighlight: {
    fontSize: 12,
    color: '#1d7874',
    fontWeight: '600',
    lineHeight: 17,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#0f2f67',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 20,
    color: '#224579',
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '600',
  },
  rowGap: {
    gap: 12,
    marginBottom: 16,
  },
  bigButton: {
    minHeight: 68,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
  },
  primaryButton: {
    backgroundColor: '#1157c2',
    borderColor: '#1157c2',
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    borderColor: '#1157c2',
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  bigButtonText: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
  },
  secondaryButtonText: {
    color: '#1157c2',
  },
  formWrap: {
    marginTop: 4,
    marginBottom: 10,
  },
  input: {
    minHeight: 58,
    borderWidth: 2,
    borderColor: '#c6d4ed',
    borderRadius: 14,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    fontSize: 20,
    color: '#102e55',
    marginBottom: 10,
  },
  label: {
    fontSize: 19,
    fontWeight: '700',
    color: '#153d74',
    marginBottom: 8,
  },
  genderWrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 10,
  },
  genderButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#aac2e4',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderButtonActive: {
    backgroundColor: '#1157c2',
    borderColor: '#1157c2',
  },
  genderText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1c3f73',
  },
  genderTextActive: {
    color: '#fff',
  },
  card: {
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#d2dff2',
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#103467',
    marginBottom: 2,
  },
  cardText: {
    fontSize: 18,
    color: '#234b80',
    marginBottom: 2,
  },
  smallText: {
    fontSize: 16,
    color: '#4a6385',
  },
  adminDeleteButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  adminDeleteButtonText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '800',
  },
  adminPrimaryActionButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#E8F0FE',
    borderWidth: 1,
    borderColor: '#BCD2F8',
  },
  adminPrimaryActionButtonText: {
    color: '#1157c2',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  adminActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  inlineActionButton: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#E8F0FE',
    borderWidth: 1,
    borderColor: '#BCD2F8',
  },
  inlineActionButtonText: {
    color: '#1157c2',
    fontSize: 12,
    fontWeight: '800',
  },
  emptyText: {
    fontSize: 20,
    color: '#355785',
    textAlign: 'center',
    marginVertical: 16,
    fontWeight: '600',
  },
  languageWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 18,
  },
  languageLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#204779',
  },
  languageButton: {
    minWidth: 90,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#aac2e4',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  languageButtonActive: {
    borderColor: '#1157c2',
    backgroundColor: '#e7f0ff',
  },
  languageText: {
    fontSize: 17,
    color: '#224579',
    fontWeight: '700',
  },
  languageTextActive: {
    color: '#1157c2',
  },
  choiceButton: {
    minHeight: 58,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#aac2e4',
    backgroundColor: '#fff',
    justifyContent: 'center',
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  choiceButtonActive: {
    borderColor: '#1157c2',
    backgroundColor: '#eaf2ff',
  },
  choiceText: {
    fontSize: 18,
    color: '#1d3f72',
    fontWeight: '700',
  },
  choiceTextActive: {
    color: '#0f4fb3',
  },
  patientDashboardHeader: {
    backgroundColor: '#1157c2',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  patientGreeting: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  patientName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
  },
  nextConsultationBanner: {
    backgroundColor: '#ecfdf3',
    borderWidth: 2,
    borderColor: '#86efac',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  nextConsultationTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#166534',
    marginBottom: 4,
  },
  nextConsultationSubTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#15803d',
    marginBottom: 8,
  },
  nextConsultationText: {
    fontSize: 15,
    color: '#166534',
    fontWeight: '700',
    marginBottom: 2,
  },
  nextConsultationButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    minHeight: 38,
    borderRadius: 10,
    backgroundColor: '#16a34a',
    borderWidth: 1,
    borderColor: '#15803d',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  nextConsultationButtonDisabled: {
    backgroundColor: '#9ca3af',
    borderColor: '#9ca3af',
  },
  nextConsultationButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
  },
  prescriptionPreviewBanner: {
    backgroundColor: '#f5f0ff',
    borderWidth: 2,
    borderColor: '#c7b9f7',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  prescriptionPreviewTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#5b21b6',
    marginBottom: 6,
  },
  prescriptionPreviewText: {
    fontSize: 14,
    color: '#4c1d95',
    fontWeight: '700',
    marginBottom: 3,
    lineHeight: 19,
  },
  prescriptionPreviewButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: '#7c3aed',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  prescriptionPreviewButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  nearbyModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  nearbyModalCard: {
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 14,
  },
  nearbyModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  nearbyModalTitle: {
    fontSize: 18,
    color: '#103467',
    fontWeight: '800',
  },
  nearbyCloseText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1157c2',
  },
  nearbyLoadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    gap: 10,
  },
  nearbyLoadingText: {
    fontSize: 14,
    color: '#4a6385',
    textAlign: 'center',
  },
  nearbyItemCard: {
    borderWidth: 1,
    borderColor: '#d7e3f8',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#f9fbff',
  },
  nearbyItemName: {
    fontSize: 15,
    color: '#103467',
    fontWeight: '800',
    marginBottom: 5,
  },
  nearbyItemMeta: {
    fontSize: 13,
    color: '#4a6385',
    marginBottom: 3,
  },
  nearbyActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  nearbyActionButton: {
    backgroundColor: '#E8F0FE',
    borderWidth: 1,
    borderColor: '#BCD2F8',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  nearbyActionButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1157c2',
  },
  featureGrid: {
    flex: 1,
    marginBottom: 16,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  featureCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#d2dff2',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  featureIcon: {
    fontSize: 42,
    marginBottom: 10,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1d3f72',
    textAlign: 'center',
  },
  voiceHelpCard: {
    backgroundColor: '#edf4ff',
    borderWidth: 2,
    borderColor: '#b8d0f5',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  voiceHelpTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f3f83',
    marginBottom: 6,
  },
  voiceHelpHint: {
    fontSize: 14,
    color: '#24528d',
    fontWeight: '600',
    marginBottom: 10,
  },
  voiceHeardText: {
    fontSize: 14,
    color: '#113a6c',
    fontWeight: '700',
    marginBottom: 8,
  },
  voiceStatusText: {
    fontSize: 13,
    color: '#1157c2',
    fontWeight: '700',
    marginBottom: 8,
  },
  voiceHelpButton: {
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#1157c2',
    backgroundColor: '#1157c2',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  voiceHelpButtonActive: {
    backgroundColor: '#0f478f',
    borderColor: '#0f478f',
  },
  voiceHelpButtonDisabled: {
    opacity: 0.65,
  },
  voiceHelpButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
  voiceListeningText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#d8ecff',
    marginTop: 4,
  },
  voiceTapHintText: {
    marginTop: 8,
    fontSize: 12,
    color: '#385f95',
    fontWeight: '700',
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#234b80',
    textAlign: 'center',
    marginVertical: 12,
  },
  voiceSetupHintText: {
    marginTop: 8,
    fontSize: 12,
    color: '#b45309',
    textAlign: 'center',
    fontWeight: '600',
  },
  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  slotButton: {
    flex: 1,
    minWidth: '30%',
    minHeight: 54,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#BCD2F8',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotButtonSelected: {
    backgroundColor: '#1157c2',
    borderColor: '#1157c2',
  },
  slotButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1157c2',
  },
  slotButtonTextSelected: {
    color: '#fff',
  },
  doctorCardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  coverageItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  completedText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
  },
});
