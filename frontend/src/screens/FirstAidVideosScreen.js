import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Video, ResizeMode } from 'expo-av';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import firstAidVideoService from '../services/firstAidVideoService';

const LEVEL_STYLES = {
  Critical: { backgroundColor: '#fde2e2', color: '#b42318' },
  High: { backgroundColor: '#fff1d6', color: '#9a6700' },
  Medium: { backgroundColor: '#e8f1ff', color: '#175cd3' },
};

const BADGE_STYLES = {
  Emergency: { backgroundColor: '#fff0f0', color: '#b42318' },
  Wounds: { backgroundColor: '#ecfdf3', color: '#067647' },
  Bites: { backgroundColor: '#eef4ff', color: '#175cd3' },
  'General Care': { backgroundColor: '#f4f3ff', color: '#6941c6' },
};

const STORAGE_KEY = 'firstAidVideos:downloadedIds';

const SCREEN_COPY = {
  en: {
    title: 'Primary Treatment Videos',
    eyebrow: 'Doctor-approved first aid',
    subtitle: 'Short, clear instructions for urgent situations like snake bites, burns, bleeding, and choking.',
    search: 'Search snake bite, burn, choking...',
    trusted: 'Trusted guidance',
    downloadReady: 'Download ready',
    videosLabel: 'Videos',
    urgentLabel: 'Urgent',
    quickAccessLabel: 'Quick access',
    quickAccessValue: 'Offline',
    filterAll: 'All',
    emergencyTopics: 'Emergency topics',
    selectedLabel: 'First aid video',
    tapToLoad: 'Tap to load video',
    doTitle: 'Do this',
    avoidTitle: 'Avoid this',
    openEmergency: 'Open Emergency Help',
    download: 'Download',
    downloaded: 'Downloaded',
    openVideo: 'Open video',
    warningTitle: 'Emergency warning',
    noMatchTitle: 'No matching videos',
    noMatchText: 'Try a different search term or category.',
    loading: 'Loading your guidance...',
    languageLabel: 'Guidance language',
  },
  hi: {
    title: 'प्राथमिक उपचार वीडियो',
    eyebrow: 'डॉक्टर द्वारा अनुमोदित प्रथम उपचार',
    subtitle: 'साँप के काटने, जलने, खून बहने, और घुटन जैसी आपात स्थितियों के लिए छोटे और स्पष्ट निर्देश।',
    search: 'साँप काटना, जलना, घुटन खोजें...',
    trusted: 'विश्वसनीय मार्गदर्शन',
    downloadReady: 'डाउनलोड के लिए तैयार',
    videosLabel: 'वीडियो',
    urgentLabel: 'तत्काल',
    quickAccessLabel: 'त्वरित पहुँच',
    quickAccessValue: 'ऑफ़लाइन',
    filterAll: 'सभी',
    emergencyTopics: 'आपातकालीन विषय',
    selectedLabel: 'प्राथमिक उपचार वीडियो',
    tapToLoad: 'वीडियो देखने के लिए टैप करें',
    doTitle: 'यह करें',
    avoidTitle: 'यह न करें',
    openEmergency: 'आपातकालीन सहायता खोलें',
    download: 'डाउनलोड',
    downloaded: 'डाउनलोड हो गया',
    openVideo: 'वीडियो खोलें',
    warningTitle: 'आपातकालीन चेतावनी',
    noMatchTitle: 'कोई वीडियो नहीं मिला',
    noMatchText: 'कृपया दूसरा खोज शब्द या श्रेणी चुनें।',
    loading: 'आपका मार्गदर्शन लोड हो रहा है...',
    languageLabel: 'मार्गदर्शन भाषा',
  },
  kn: {
    title: 'ಪ್ರಾಥಮಿಕ ಚಿಕಿತ್ಸೆ ವೀಡಿಯೊಗಳು',
    eyebrow: 'ವೈದ್ಯರು ಅನುಮೋದಿಸಿದ ಪ್ರಥಮ ಚಿಕಿತ್ಸೆ',
    subtitle: 'ಹಾವಿನ ಕಚ್ಚು, ಸುಡು, ರಕ್ತಸ್ರಾವ, ಮತ್ತು ಉಸಿರುಗಟ್ಟುವಿಕೆಂತಹ ತುರ್ತು ಸಂದರ್ಭಗಳಿಗೆ ಚಿಕ್ಕ ಹಾಗೂ ಸ್ಪಷ್ಟ ಸೂಚನೆಗಳು.',
    search: 'ಹಾವಿನ ಕಚ್ಚು, ಸುಡು, ಉಸಿರುಗಟ್ಟುವಿಕೆ ಹುಡುಕಿ...',
    trusted: 'ವಿಶ್ವಾಸಾರ್ಹ ಮಾರ್ಗದರ್ಶನ',
    downloadReady: 'ಡೌನ್‌ಲೋಡ್‌ಗೆ ಸಿದ್ಧ',
    videosLabel: 'ವೀಡಿಯೊಗಳು',
    urgentLabel: 'ತುರ್ತು',
    quickAccessLabel: 'ತ್ವರಿತ ಪ್ರವೇಶ',
    quickAccessValue: 'ಆಫ್‌ಲೈನ್',
    filterAll: 'ಎಲ್ಲಾ',
    emergencyTopics: 'ತುರ್ತು ವಿಷಯಗಳು',
    selectedLabel: 'ಪ್ರಥಮ ಚಿಕಿತ್ಸೆ ವೀಡಿಯೊ',
    tapToLoad: 'ವೀಡಿಯೊ ಲೋಡ್ ಮಾಡಲು ಟ್ಯಾಪ್ ಮಾಡಿ',
    doTitle: 'ಇದು ಮಾಡಿ',
    avoidTitle: 'ಇದು ತಪ್ಪಿಸಿ',
    openEmergency: 'ತುರ್ತು ಸಹಾಯ ತೆರೆಯಿರಿ',
    download: 'ಡೌನ್‌ಲೋಡ್',
    downloaded: 'ಡೌನ್‌ಲೋಡ್ ಆಯಿತು',
    openVideo: 'ವೀಡಿಯೊ ತೆರೆಯಿರಿ',
    warningTitle: 'ತುರ್ತು ಎಚ್ಚರಿಕೆ',
    noMatchTitle: 'ಯಾವುದೇ ವೀಡಿಯೊಗಳು ಇಲ್ಲ',
    noMatchText: 'ಬೇರೆ ಹುಡುಕಾಟ ಪದ ಅಥವಾ ವರ್ಗ ಪ್ರಯತ್ನಿಸಿ.',
    loading: 'ನಿಮ್ಮ ಮಾರ್ಗದರ್ಶನ ಲೋಡ್ ಆಗುತ್ತಿದೆ...',
    languageLabel: 'ಮಾರ್ಗದರ್ಶನ ಭಾಷೆ',
  },
};

const VIDEO_COPY = {
  'snake-bite': {
    en: {
      title: 'Snake Bite First Aid',
      summary: 'Stay calm, keep the person still, remove rings/tight items, and rush to the hospital immediately.',
      do: ['Keep the patient calm and still.', 'Immobilize the bitten limb below heart level if possible.', 'Get emergency medical help immediately.'],
      dont: ['Do not cut, suck, or squeeze the bite.', 'Do not apply ice, a tourniquet, or chemicals.', 'Do not let the patient walk around unnecessarily.'],
      warning: 'Snake bites can become life-threatening fast. This video is for first aid only — go to a hospital immediately.',
    },
    hi: {
      title: 'साँप के काटने का प्राथमिक उपचार',
      summary: 'शांत रहें, व्यक्ति को स्थिर रखें, अंगूठी/कसे हुए सामान हटाएँ, और तुरंत अस्पताल जाएँ।',
      do: ['रोगी को शांत और स्थिर रखें।', 'यदि संभव हो तो काटे हुए अंग को दिल से नीचे स्थिर रखें।', 'तुरंत आपातकालीन चिकित्सा सहायता लें।'],
      dont: ['घाव को काटें, चूसें या निचोड़ें नहीं।', 'बर्फ, टूर्निकेट या रसायन न लगाएँ।', 'रोगी को अनावश्यक रूप से चलने न दें।'],
      warning: 'साँप का काटना जल्दी जानलेवा हो सकता है। यह वीडियो केवल प्राथमिक उपचार के लिए है — तुरंत अस्पताल जाएँ।',
    },
    kn: {
      title: 'ಹಾವಿನ ಕಚ್ಚಿಗೆ ಪ್ರಥಮ ಚಿಕಿತ್ಸೆ',
      summary: 'ಶಾಂತವಾಗಿರಿ, ವ್ಯಕ್ತಿಯನ್ನು ಸ್ಥಿರವಾಗಿ ಇಡಿ, ಉಂಗುರ/ಬಿಗಿಯಾದ ವಸ್ತುಗಳನ್ನು ತೆಗೆದುಹಾಕಿ, ಮತ್ತು ತಕ್ಷಣ ಆಸ್ಪತ್ರೆಗೆ ಕರೆದೊಯ್ಯಿರಿ.',
      do: ['ರೋಗಿಯನ್ನು ಶಾಂತವಾಗಿ ಮತ್ತು ಸ್ಥಿರವಾಗಿ ಇಡಿ.', 'ಸಾಧ್ಯವಾದರೆ ಕಚ್ಚಿದ ಅಂಗವನ್ನು ಹೃದಯ ಮಟ್ಟಕ್ಕಿಂತ ಕೆಳಗೆ ಸ್ಥಿರಗೊಳಿಸಿ.', 'ತಕ್ಷಣ ತುರ್ತು ವೈದ್ಯಕೀಯ ಸಹಾಯ ಪಡೆಯಿರಿ.'],
      dont: ['ಕಚ್ಚಿದ ಸ್ಥಳವನ್ನು ಕತ್ತರಿಸಬೇಡಿ, ಹೀರುವುದಿಲ್ಲ, ಅಥವಾ ಒತ್ತಬೇಡಿ.', 'ಐಸ್, ಟೂರ್ನಿಕೇಟ್ ಅಥವಾ ರಾಸಾಯನಿಕಗಳನ್ನು ಹಾಕಬೇಡಿ.', 'ರೋಗಿಯನ್ನು ಅನಗತ್ಯವಾಗಿ ನಡೆಯಲು ಬಿಡಬೇಡಿ.'],
      warning: 'ಹಾವಿನ ಕಚ್ಚು ವೇಗವಾಗಿ ಜೀವಕ್ಕೆ ಅಪಾಯಕಾರಿಯಾಗಬಹುದು. ಈ ವೀಡಿಯೊ ಪ್ರಥಮ ಚಿಕಿತ್ಸೆಯಷ್ಟೆ — ತಕ್ಷಣ ಆಸ್ಪತ್ರೆಗೆ ಹೋಗಿ.',
    },
  },
  'leech-bite': {
    en: {
      title: 'Leech Bite Care',
      summary: 'Detach the leech safely, clean the wound, and watch for prolonged bleeding or infection.',
      do: ['Wash hands and clean the area with clean water.', 'Let the leech release naturally or gently detach it from the head end.', 'Apply gentle pressure if there is bleeding and seek help if bleeding continues.'],
      dont: ['Do not yank the leech off forcefully.', 'Do not use salt, heat, or chemicals directly on the skin.', 'Do not scratch the wound.'],
      warning: 'If the wound keeps bleeding, swells, or shows signs of infection, get medical help.',
    },
    hi: {
      title: 'जोंक काटने की देखभाल',
      summary: 'जोंक को सुरक्षित हटाएँ, घाव साफ करें, और अधिक रक्तस्राव या संक्रमण पर ध्यान दें।',
      do: ['हाथ धोएँ और साफ पानी से जगह साफ करें।', 'जोंक को अपने आप छोड़ने दें या धीरे से उसके सिर वाले हिस्से से हटाएँ।', 'यदि खून बह रहा हो तो हल्का दबाव दें।'],
      dont: ['जोंक को जोर से न खींचें।', 'नमक, गर्मी या रसायन सीधे त्वचा पर न लगाएँ।', 'घाव को न खुजलाएँ।'],
      warning: 'यदि घाव से खून बहता रहे, सूजन हो, या संक्रमण के लक्षण हों तो डॉक्टर को दिखाएँ।',
    },
    kn: {
      title: 'ಜೂಕು ಕಡಿತದ ಆರೈಕೆ',
      summary: 'ಜೂಕನ್ನು ಸುರಕ್ಷಿತವಾಗಿ ತೆಗೆದುಹಾಕಿ, ಗಾಯವನ್ನು ಸ್ವಚ್ಛಗೊಳಿಸಿ, ಮತ್ತು ದೀರ್ಘಕಾಲದ ರಕ್ತಸ್ರಾವ ಅಥವಾ ಸೋಂಕು ಗಮನಿಸಿ.',
      do: ['ಕೈ ತೊಳೆಯಿರಿ ಮತ್ತು ಸ್ವಚ್ಛ ನೀರಿನಿಂದ ಪ್ರದೇಶವನ್ನು ಸ್ವಚ್ಛಗೊಳಿಸಿ.', 'ಜೂಕು ಸಹಜವಾಗಿ ಬಿಡುವಂತೆ ಮಾಡಿ ಅಥವಾ ತಲೆಭಾಗದಿಂದ ನಿಧಾನವಾಗಿ ಬಿಡಿಸಿ.', 'ರಕ್ತಸ್ರಾವ ಇದ್ದರೆ ನಿಧಾನ ಒತ್ತಡ ನೀಡಿ.'],
      dont: ['ಜೂಕನ್ನು ಬಲವಾಗಿ ಎಳೆಯಬೇಡಿ.', 'ಉಪ್ಪು, ಉರಿ, ಅಥವಾ ರಾಸಾಯನಿಕಗಳನ್ನು ನೇರವಾಗಿ ಹಾಕಬೇಡಿ.', 'ಗಾಯವನ್ನು ಕೊರೆಯಬೇಡಿ.'],
      warning: 'ಗಾಯದಿಂದ ರಕ್ತಸ್ರಾವ ಮುಂದುವರಿದರೆ, ಊತ ಬಂದರೆ ಅಥವಾ ಸೋಂಕಿನ ಲಕ್ಷಣಗಳು ಕಂಡರೆ ವೈದ್ಯಕೀಯ ಸಹಾಯ ಪಡೆಯಿರಿ.',
    },
  },
  burns: {
    en: {
      title: 'Burns First Aid',
      summary: 'Cool the burn with running water, remove tight items, and cover with a clean cloth.',
      do: ['Cool the area under cool running water for 20 minutes.', 'Remove rings, watches, or tight clothing near the burn.', 'Cover with a sterile non-stick dressing or clean cloth.'],
      dont: ['Do not apply toothpaste, butter, oil, or ice directly.', 'Do not pop blisters.', 'Do not peel stuck clothing off the burn.'],
      warning: 'For large, deep, facial, or electrical burns, seek emergency care immediately.',
    },
    hi: {
      title: 'जलने का प्राथमिक उपचार',
      summary: 'ठंडे बहते पानी से जलन को ठंडा करें, कसे सामान हटाएँ, और साफ कपड़े से ढकें।',
      do: ['20 मिनट तक ठंडे बहते पानी से क्षेत्र ठंडा करें।', 'जलन के पास की अंगूठी/घड़ी/कसे कपड़े हटाएँ।', 'साफ और गैर-चिपकने वाली पट्टी से ढकें।'],
      dont: ['टूथपेस्ट, मक्खन, तेल या बर्फ सीधे न लगाएँ।', 'छाले न फोड़ें।', 'चिपका कपड़ा जबरदस्ती न हटाएँ।'],
      warning: 'बड़ी, गहरी, चेहरे की या बिजली से हुई जलन पर तुरंत आपातकालीन मदद लें।',
    },
    kn: {
      title: 'ಸುಟ್ಟ ಗಾಯಗಳಿಗೆ ಪ್ರಥಮ ಚಿಕಿತ್ಸೆ',
      summary: 'ತಣ್ಣನೆಯ ಹರಿವ ನೀರಿನಿಂದ ಸುಡಿದ ಭಾಗವನ್ನು ತಣ್ಣಗಿಸಿ, ಬಿಗಿಯಾದ ವಸ್ತುಗಳನ್ನು ತೆಗೆದು, ಸ್ವಚ್ಛ ಬಟ್ಟೆಯಿಂದ ಮುಚ್ಚಿ.',
      do: ['20 ನಿಮಿಷ ತಣ್ಣನೆಯ ಹರಿವ ನೀರಿನಿಂದ ತಣ್ಣಗಿಸಿ.', 'ಸುಟ್ಟ ಭಾಗದ ಬಳಿ ಇರುವ ಉಂಗುರ/ಗಡಿಯಾರ/ಬಿಗಿಯಾದ ಬಟ್ಟೆಗಳನ್ನು ತೆಗೆದುಹಾಕಿ.', 'ಸ್ವಚ್ಛ, ಅಂಟದ ಬಟ್ಟೆ ಅಥವಾ ಡ್ರೆಸಿಂಗ್‌ನಿಂದ ಮುಚ್ಚಿ.'],
      dont: ['ಟೂತ್‌ಪೇಸ್ಟ್, ಬೆಣ್ಣೆ, ಎಣ್ಣೆ ಅಥವಾ ಐಸ್ ನೇರವಾಗಿ ಹಾಕಬೇಡಿ.', 'ಗಾಳಿಬುಬ್ಬುಗಳನ್ನು ಒಡೆಬೇಡಿ.', 'ಅಂಟಿಕೊಂಡ ಬಟ್ಟೆಯನ್ನು ಎಳೆದು ತೆಗೆದುಹಾಕಬೇಡಿ.'],
      warning: 'ದೊಡ್ಡ, ಆಳವಾದ, ಮುಖದ, ಅಥವಾ ವಿದ್ಯುತ್ ಸುಟ್ಟ ಗಾಯಗಳಿಗೆ ತಕ್ಷಣ ತುರ್ತು ಸಹಾಯ ಪಡೆಯಿರಿ.',
    },
  },
  'bleeding-cuts': {
    en: {
      title: 'Cuts and Bleeding',
      summary: 'Apply firm pressure, raise the wound if possible, and keep it clean until help arrives.',
      do: ['Apply direct pressure using clean cloth or gauze.', 'Raise the injured area if it does not cause more pain.', 'Seek urgent care if bleeding is heavy or not stopping.'],
      dont: ['Do not keep lifting the cloth to check every few seconds.', 'Do not remove deeply embedded objects.', 'Do not ignore signs of shock or fainting.'],
      warning: 'If blood soaks through cloth quickly or the wound is deep, call emergency services.',
    },
    hi: {
      title: 'कट और खून बहना',
      summary: 'मजबूत दबाव दें, संभव हो तो घाव को ऊपर रखें, और मदद आने तक साफ रखें।',
      do: ['साफ कपड़े/गॉज़ से सीधे दबाव दें।', 'यदि दर्द न बढ़े तो घायल भाग को ऊपर उठाएँ।', 'खून अधिक हो या बंद न हो तो तुरंत इलाज लें।'],
      dont: ['हर कुछ सेकंड में कपड़ा उठाकर न देखें।', 'अंदर धँसी वस्तु न निकालें।', 'बेहोशी या शॉक के लक्षणों को नज़रअंदाज़ न करें।'],
      warning: 'यदि कपड़ा जल्दी भीग जाए या घाव गहरा हो, आपातकालीन सेवा बुलाएँ।',
    },
    kn: {
      title: 'ಕಟ್ ಮತ್ತು ರಕ್ತಸ್ರಾವ',
      summary: 'ಬಲವಾದ ಒತ್ತಡ ನೀಡಿ, ಸಾಧ್ಯವಾದರೆ ಗಾಯವನ್ನು ಮೇಲಕ್ಕೆ ಎತ್ತು, ಮತ್ತು ಸಹಾಯ ಬರೆಯುವವರೆಗೆ ಸ್ವಚ್ಛವಾಗಿ ಇಡಿ.',
      do: ['ಸ್ವಚ್ಛ ಬಟ್ಟೆ ಅಥವಾ ಗಾಜ್‌ನಿಂದ ನೇರ ಒತ್ತಡ ನೀಡಿ.', 'ಹೆಚ್ಚು ನೋವು ಆಗದಿದ್ದರೆ ಗಾಯಗೊಂಡ ಭಾಗವನ್ನು ಮೇಲಕ್ಕೆ ಎತ್ತು.', 'ರಕ್ತಸ್ರಾವ ಹೆಚ್ಚು ಇದ್ದರೆ ತುರ್ತು ಚಿಕಿತ್ಸೆ ಪಡೆಯಿರಿ.'],
      dont: ['ಪ್ರತಿ ಕೆಲವು ಸೆಕೆಂಡಿಗೆ ಬಟ್ಟೆಯನ್ನು ಎತ್ತಿ ನೋಡಬೇಡಿ.', 'ಆಳವಾಗಿ ಅಂಟಿರುವ ವಸ್ತುಗಳನ್ನು ತೆಗೆದುಬೇಡಿ.', 'ಶಾಕ್ ಅಥವಾ ಅಸ್ವಸ್ಥತೆ ಲಕ್ಷಣಗಳನ್ನು ನಿರ್ಲಕ್ಷಿಸಬೇಡಿ.'],
      warning: 'ರಕ್ತವು ಬೇಗನೆ ಬಟ್ಟೆಯನ್ನು ತೊಯ್ದರೆ ಅಥವಾ ಗಾಯ ಆಳವಾದರೆ, ತುರ್ತು ಸೇವೆ ಕರೆ ಮಾಡಿ.',
    },
  },
  choking: {
    en: {
      title: 'Choking Response',
      summary: 'If the person cannot speak or breathe, get emergency help and start first-response measures immediately.',
      do: ['Ask the person to cough if they can speak.', 'Call emergency help if breathing is blocked.', 'Use approved first-aid technique if you are trained to do so.'],
      dont: ['Do not put fingers blindly into the mouth.', 'Do not give water or food.', 'Do not wait if the person is turning blue or cannot breathe.'],
      warning: 'Choking is an emergency. If the airway is blocked, act immediately.',
    },
    hi: {
      title: 'घुटन होने पर प्रतिक्रिया',
      summary: 'यदि व्यक्ति बोल या साँस नहीं ले पा रहा है, तुरंत मदद लें और प्राथमिक उपाय शुरू करें।',
      do: ['यदि बोल पा रहा हो तो खाँसने के लिए कहें।', 'साँस रुक रही हो तो तुरंत आपातकालीन मदद लें।', 'यदि आप प्रशिक्षित हैं तो उचित प्राथमिक उपचार करें।'],
      dont: ['बिना देखे उँगली मुँह में न डालें।', 'पानी या खाना न दें।', 'यदि नीला पड़ रहा हो या साँस नहीं आ रही हो तो इंतज़ार न करें।'],
      warning: 'घुटन एक आपातकालीन स्थिति है। तुरंत कार्रवाई करें।',
    },
    kn: {
      title: 'ಉಸಿರುಗಟ್ಟುವಿಕೆ ಪ್ರತಿಕ್ರಿಯೆ',
      summary: 'ವ್ಯಕ್ತಿಗೆ ಮಾತನಾಡಲು ಅಥವಾ ಉಸಿರಾಡಲು ಸಾಧ್ಯವಾಗದಿದ್ದರೆ, ತುರ್ತು ಸಹಾಯ ಪಡೆದು ತಕ್ಷಣ ಪ್ರಾರಂಭಿಕ ಕ್ರಮಗಳನ್ನು ತೆಗೆದುಕೊಳ್ಳಿ.',
      do: ['ಮಾತನಾಡಬಹುದಾದರೆ ಕೆಮ್ಮಲು ಹೇಳಿ.', 'ಉಸಿರಾಟ ಅಡ್ಡಿಯಾಗಿದ್ದರೆ ತುರ್ತು ಸಹಾಯ ಕರೆ ಮಾಡಿ.', 'ನೀವು ತರಬೇತಿ ಪಡೆದಿದ್ದರೆ ಅನುಮೋದಿತ ಪ್ರಥಮ ಚಿಕಿತ್ಸೆ ಬಳಸಿ.'],
      dont: ['ಬಾಯಿಯಲ್ಲಿ ಅಜಾಗರೂಕವಾಗಿ ಬೆರಳು ಹಾಕಬೇಡಿ.', 'ನೀರು ಅಥವಾ ಆಹಾರ ಕೊಡಬೇಡಿ.', 'ನೀಲಿ ಬಣ್ಣಕ್ಕೆ ತಿರುಗಿದರೆ ಅಥವಾ ಉಸಿರಾಡಲಾಗದಿದ್ದರೆ ಕಾಯಬೇಡಿ.'],
      warning: 'ಉಸಿರುಗಟ್ಟುವಿಕೆ ತುರ್ತು ಪರಿಸ್ಥಿತಿ. ತಕ್ಷಣ ಕ್ರಮ ತೆಗೆದುಕೊಳ್ಳಿ.',
    },
  },
  dehydration: {
    en: {
      title: 'Dehydration Support',
      summary: 'Give small sips of water or ORS, rest the person, and watch for dizziness or weakness.',
      do: ['Offer small, frequent sips of clean water or ORS.', 'Keep the person in a cool place and allow rest.', 'Monitor for confusion, fainting, or no urination.'],
      dont: ['Do not force large amounts of fluid at once.', 'Do not ignore signs of severe weakness or confusion.', 'Do not delay medical care if vomiting continues.'],
      warning: 'Severe dehydration needs medical attention, especially in children or elderly patients.',
    },
    hi: {
      title: 'निर्जलीकरण में सहायता',
      summary: 'पानी या ORS के छोटे घूंट दें, आराम कराएँ, और चक्कर/कमज़ोरी पर नज़र रखें।',
      do: ['साफ पानी या ORS छोटे-छोटे घूंट में दें।', 'व्यक्ति को ठंडी जगह में आराम करने दें।', 'भ्रम, बेहोशी या पेशाब न आने पर ध्यान रखें।'],
      dont: ['एक बार में बहुत अधिक तरल न दें।', 'गंभीर कमज़ोरी या भ्रम को नज़रअंदाज़ न करें।', 'उल्टी जारी रहे तो इलाज देर न करें।'],
      warning: 'गंभीर निर्जलीकरण में तुरंत चिकित्सा सहायता जरूरी है।',
    },
    kn: {
      title: 'ನೀರಿಲ್ಲದೆ ತೊಂದರೆ ಪರಿಹಾರ',
      summary: 'ನೀರು ಅಥವಾ ORS ನ ಸಣ್ಣ ಸಿಪ್‌ಗಳು ನೀಡಿ, ವಿಶ್ರಾಂತಿ ಕೊಡಿಸಿ, ಮತ್ತು ತಲೆಸುತ್ತು/ದುರ್ಬಲತೆಯನ್ನು ಗಮನಿಸಿ.',
      do: ['ಶುದ್ಧ ನೀರು ಅಥವಾ ORS ಅನ್ನು ಸ್ವಲ್ಪ-ಸ್ವಲ್ಪವಾಗಿ ನೀಡಿ.', 'ವ್ಯಕ್ತಿಯನ್ನು ತಂಪಾದ ಸ್ಥಳದಲ್ಲಿ ವಿಶ್ರಾಂತಿಗೆ ಇಡಿ.', 'ಗೊಂದಲ, ಮೂರ್ಚೆ, ಅಥವಾ ಮೂತ್ರ ಬರದಿರುವುದನ್ನು ಗಮನಿಸಿ.'],
      dont: ['ಒಮ್ಮೆಲೇ ಹೆಚ್ಚಿನ ದ್ರವ ನೀಡಬೇಡಿ.', 'ತೀವ್ರ ದುರ್ಬಲತೆ ಅಥವಾ ಗೊಂದಲವನ್ನು ನಿರ್ಲಕ್ಷಿಸಬೇಡಿ.', 'ವಾಂತಿ ಮುಂದುವರೆದರೆ ಚಿಕಿತ್ಸೆ ತಡ ಮಾಡಬೇಡಿ.'],
      warning: 'ತೀವ್ರ ನೀರಿಲ್ಲದಿಕೆ ಮಕ್ಕಳಿಗೆ ಅಥವಾ ಹಿರಿಯರಿಗೆ ವೈದ್ಯಕೀಯ ಸಹಾಯ ಅಗತ್ಯವಾಗುತ್ತದೆ.',
    },
  },
};

const getLocalVideoPath = (video) => {
  const filename = video?.downloadName || `${String(video?.id || video?.title || 'video').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.mp4`;
  return `${FileSystem.documentDirectory}first-aid-videos/${filename}`;
};

const getLocalizedVideo = (video, language) => {
  const copy = VIDEO_COPY?.[video?.id]?.[language] || VIDEO_COPY?.[video?.id]?.en || {};
  return {
    ...video,
    localizedTitle: copy.title || video.title,
    localizedSummary: copy.summary || video.summary,
    localizedDo: copy.do || video.do,
    localizedDont: copy.dont || video.dont,
    localizedWarning: copy.warning || video.warning,
  };
};

const Section = ({ icon, title, children }) => (
  <View style={styles.sectionCard}>
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionIcon}>{icon}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    {children}
  </View>
);

const BulletList = ({ items = [], tone = 'default' }) => (
  <View style={styles.bulletList}>
    {items.map((item, index) => (
      <View key={`${tone}-${index}`} style={styles.bulletRow}>
        <Text style={[styles.bulletDot, tone === 'danger' && styles.bulletDotDanger]}>•</Text>
        <Text style={styles.bulletText}>{item}</Text>
      </View>
    ))}
  </View>
);

export default function FirstAidVideosScreen({ navigation, route }) {
  const patient = route?.params?.patient || null;
  const videos = useMemo(() => firstAidVideoService.list(), []);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [guidanceLanguage, setGuidanceLanguage] = useState('en');
  const [selectedVideo, setSelectedVideo] = useState(videos[0] || null);
  const [playbackUri, setPlaybackUri] = useState(null);
  const [isResolvingPlayback, setIsResolvingPlayback] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadMessage, setDownloadMessage] = useState('');
  const [downloadedIds, setDownloadedIds] = useState([]);
  const [initializing, setInitializing] = useState(true);

  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(videos.map((video) => video.category))];
    return [SCREEN_COPY[guidanceLanguage].filterAll, ...uniqueCategories];
  }, [videos]);

  useEffect(() => {
    const loadDownloadedIds = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        setDownloadedIds(Array.isArray(parsed) ? parsed : []);
      } catch (error) {
        setDownloadedIds([]);
      } finally {
        setInitializing(false);
      }
    };

    loadDownloadedIds();
  }, []);

  useEffect(() => {
    setSelectedCategory(SCREEN_COPY[guidanceLanguage].filterAll);
  }, [guidanceLanguage]);

  const filteredVideos = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const normalizedAll = SCREEN_COPY[guidanceLanguage].filterAll;
    return videos.filter((video) => {
      const matchesCategory = selectedCategory === normalizedAll || video.category === selectedCategory;
      const localized = getLocalizedVideo(video, guidanceLanguage);
      const matchesQuery = !query
        || `${localized.localizedTitle} ${video.category} ${localized.localizedSummary} ${localized.localizedWarning}`.toLowerCase().includes(query);
      return matchesCategory && matchesQuery;
    });
  }, [guidanceLanguage, searchQuery, selectedCategory, videos]);

  useEffect(() => {
    if (filteredVideos.length === 0) {
      return;
    }

    const stillVisible = filteredVideos.some((video) => video.id === selectedVideo?.id);
    if (!stillVisible) {
      setSelectedVideo(filteredVideos[0]);
    }
  }, [filteredVideos, selectedVideo?.id]);

  const localizedSelectedVideo = useMemo(
    () => (selectedVideo ? getLocalizedVideo(selectedVideo, guidanceLanguage) : null),
    [guidanceLanguage, selectedVideo]
  );

  const isSelectedDownloaded = Boolean(selectedVideo && downloadedIds.includes(selectedVideo.id));

  useEffect(() => {
    let cancelled = false;

    const resolveSource = async () => {
      if (!selectedVideo) {
        setPlaybackUri(null);
        return;
      }

      try {
        setIsResolvingPlayback(true);
        const resolved = await firstAidVideoService.resolvePlaybackUri(selectedVideo);
        if (!cancelled) {
          setPlaybackUri(resolved);
        }
      } catch (error) {
        if (!cancelled) {
          setPlaybackUri(selectedVideo.videoUrl);
        }
      } finally {
        if (!cancelled) {
          setIsResolvingPlayback(false);
        }
      }
    };

    resolveSource();

    return () => {
      cancelled = true;
    };
  }, [selectedVideo]);

  const stats = useMemo(() => {
    const emergencyCount = videos.filter((video) => video.emergencyLevel === 'Critical' || video.emergencyLevel === 'High').length;
    return [
      { label: SCREEN_COPY[guidanceLanguage].videosLabel, value: String(videos.length), tone: 'blue' },
      { label: SCREEN_COPY[guidanceLanguage].urgentLabel, value: String(emergencyCount), tone: 'red' },
      { label: SCREEN_COPY[guidanceLanguage].quickAccessLabel, value: SCREEN_COPY[guidanceLanguage].quickAccessValue, tone: 'green' },
    ];
  }, [guidanceLanguage, videos]);

  const openEmergencyHelp = () => {
    navigation.navigate('EmergencyHelp', { patient });
  };

  const handleDownload = async (video) => {
    if (!video) {
      return;
    }

    try {
      setIsDownloading(true);
      setDownloadMessage('');
      await firstAidVideoService.downloadVideo(video);
      const nextIds = [...new Set([...downloadedIds, video.id])];
      setDownloadedIds(nextIds);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextIds));
      setDownloadMessage('Video downloaded successfully.');
    } catch (error) {
      Alert.alert('Download failed', error?.message || 'Unable to download this video right now.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleOpenExternal = async (video) => {
    if (!video?.videoUrl) {
      return;
    }

    try {
      await Linking.openURL(video.videoUrl);
    } catch (error) {
      Alert.alert('Unable to open video', 'Please try again later.');
    }
  };

  const isOfflinePlayback = Boolean(selectedVideo && playbackUri && playbackUri !== selectedVideo.videoUrl);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroGlow} />
          <View style={styles.heroGlowAccent} />
          <View style={styles.heroTopRow}>
            <View style={styles.heroIconWrap}>
              <MaterialCommunityIcons name="medical-bag" size={28} color="#1157c2" />
            </View>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.85}>
              <MaterialCommunityIcons name="chevron-left" size={20} color="#1157c2" />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.heroEyebrow}>{SCREEN_COPY[guidanceLanguage].eyebrow}</Text>
          <Text style={styles.title}>{SCREEN_COPY[guidanceLanguage].title}</Text>
          <Text style={styles.subtitle}>
            {SCREEN_COPY[guidanceLanguage].subtitle}
          </Text>

          <View style={styles.badgeRow}>
            <View style={styles.safeBadge}>
              <MaterialCommunityIcons name="shield-check" size={14} color="#067647" />
              <Text style={styles.safeBadgeText}>{SCREEN_COPY[guidanceLanguage].trusted}</Text>
            </View>
            <View style={styles.safeBadge}>
              <MaterialCommunityIcons name="download" size={14} color="#175cd3" />
              <Text style={styles.safeBadgeText}>{SCREEN_COPY[guidanceLanguage].downloadReady}</Text>
            </View>
          </View>

          <View style={styles.languageCard}>
            <View style={styles.languageCardRow}>
              <MaterialCommunityIcons name="translate" size={18} color="#1157c2" />
              <Text style={styles.languageLabel}>{SCREEN_COPY[guidanceLanguage].languageLabel}</Text>
            </View>
            <View style={styles.languagePills}>
              {['en', 'hi', 'kn'].map((lang) => {
                const active = guidanceLanguage === lang;
                return (
                  <TouchableOpacity
                    key={lang}
                    onPress={() => setGuidanceLanguage(lang)}
                    style={[styles.languagePill, active && styles.languagePillActive]}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.languagePillText, active && styles.languagePillTextActive]}>
                      {lang === 'en' ? 'English' : lang === 'hi' ? 'हिन्दी' : 'ಕನ್ನಡ'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        <View style={styles.statsRow}>
          {stats.map((item) => (
            <View key={item.label} style={styles.statCard}>
              <Text style={[styles.statValue, item.tone === 'red' && styles.statValueRed, item.tone === 'green' && styles.statValueGreen]}>
                {item.value}
              </Text>
              <Text style={styles.statLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.searchCard}>
          <View style={styles.searchWrap}>
            <MaterialCommunityIcons name="magnify" size={20} color="#667085" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={SCREEN_COPY[guidanceLanguage].search}
              placeholderTextColor="#98a2b3"
              style={styles.searchInput}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                <MaterialCommunityIcons name="close-circle" size={18} color="#98a2b3" />
              </TouchableOpacity>
            ) : null}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScrollContent}>
            {categories.map((category) => {
              const active = selectedCategory === category;
              return (
                <TouchableOpacity
                  key={category}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => setSelectedCategory(category)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{category}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {selectedVideo ? (
          <View style={styles.playerCard}>
            <View style={styles.playerHeader}>
              <View style={styles.playerTitleWrap}>
                <View style={styles.playerMetaRow}>
                  <View style={[styles.categoryPill, { backgroundColor: BADGE_STYLES[selectedVideo.category]?.backgroundColor || '#eef4ff' }]}>
                    <Text style={[styles.categoryPillText, { color: BADGE_STYLES[selectedVideo.category]?.color || '#175cd3' }]}>
                      {selectedVideo.category}
                    </Text>
                  </View>
                  <Text style={styles.playerCategory}>{SCREEN_COPY[guidanceLanguage].selectedLabel}</Text>
                </View>
                <Text style={styles.playerTitle}>{localizedSelectedVideo?.localizedTitle || selectedVideo.title}</Text>
                <Text style={styles.playerMiniCopy}>{localizedSelectedVideo?.localizedSummary || selectedVideo.summary}</Text>
              </View>
              <View style={[styles.levelPill, { backgroundColor: LEVEL_STYLES[selectedVideo.emergencyLevel]?.backgroundColor || '#eef2ff' }]}>
                <Text style={[styles.levelPillText, { color: LEVEL_STYLES[selectedVideo.emergencyLevel]?.color || '#4338ca' }]}>
                  {selectedVideo.emergencyLevel}
                </Text>
              </View>
            </View>

            <View style={styles.downloadStateRow}>
              <View style={[styles.downloadStatePill, isSelectedDownloaded && styles.downloadStatePillActive]}>
                <MaterialCommunityIcons name={isSelectedDownloaded ? 'check-circle' : 'cloud-download-outline'} size={14} color={isSelectedDownloaded ? '#067647' : '#175cd3'} />
                <Text style={[styles.downloadStateText, isSelectedDownloaded && styles.downloadStateTextActive]}>
                  {isSelectedDownloaded ? SCREEN_COPY[guidanceLanguage].downloaded : SCREEN_COPY[guidanceLanguage].downloadReady}
                </Text>
              </View>
              <View style={[styles.playbackStatePill, isOfflinePlayback && styles.playbackStatePillActive]}>
                <MaterialCommunityIcons name={isOfflinePlayback ? 'wifi-off' : 'wifi'} size={14} color={isOfflinePlayback ? '#067647' : '#175cd3'} />
                <Text style={[styles.playbackStateText, isOfflinePlayback && styles.playbackStateTextActive]}>
                  {isResolvingPlayback
                    ? SCREEN_COPY[guidanceLanguage].loading
                    : isOfflinePlayback
                      ? 'Offline playback'
                      : 'Streaming'
                  }
                </Text>
              </View>
              <Text style={styles.downloadHintText}>{Platform.OS === 'web' ? 'Downloads open in share mode' : 'Saved videos stay available on this device'}</Text>
            </View>

            <View style={styles.videoWrap}>
              <Video
                source={{ uri: playbackUri || selectedVideo.videoUrl }}
                style={styles.video}
                useNativeControls
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay={false}
              />
            </View>

            <Text style={styles.summary}>{localizedSelectedVideo?.localizedSummary || selectedVideo.summary}</Text>

            <View style={styles.actionRow}>
              <Pressable style={styles.primaryAction} onPress={() => handleDownload(selectedVideo)} disabled={isDownloading}>
                {isDownloading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryActionText}>{isSelectedDownloaded ? SCREEN_COPY[guidanceLanguage].downloaded : SCREEN_COPY[guidanceLanguage].download}</Text>}
              </Pressable>
              <Pressable style={styles.secondaryAction} onPress={() => handleOpenExternal(selectedVideo)}>
                <Text style={styles.secondaryActionText}>{SCREEN_COPY[guidanceLanguage].openVideo}</Text>
              </Pressable>
            </View>

            {isOfflinePlayback ? (
              <View style={styles.offlineBanner}>
                <MaterialCommunityIcons name="check-decagram" size={16} color="#067647" />
                <Text style={styles.offlineBannerText}>Playing from the saved file on this device.</Text>
              </View>
            ) : null}

            {downloadMessage ? <Text style={styles.downloadMessage}>{downloadMessage}</Text> : null}
          </View>
        ) : null}

        <Section icon="⚠️" title="What to do right now">
          <Text style={styles.sectionBody}>
            These videos are for first aid support only. For severe symptoms, bleeding, breathing issues, or loss of consciousness, call emergency help immediately.
          </Text>
        </Section>

        <Section icon="📹" title={SCREEN_COPY[guidanceLanguage].emergencyTopics}>
          {filteredVideos.length === 0 ? (
            <View style={styles.emptyStateCard}>
              <MaterialCommunityIcons name="video-off-outline" size={28} color="#98a2b3" />
              <Text style={styles.emptyStateTitle}>{SCREEN_COPY[guidanceLanguage].noMatchTitle}</Text>
              <Text style={styles.emptyStateText}>{SCREEN_COPY[guidanceLanguage].noMatchText}</Text>
            </View>
          ) : filteredVideos.map((video) => {
            const isActive = selectedVideo?.id === video.id;
            const localizedVideo = getLocalizedVideo(video, guidanceLanguage);
            return (
              <Pressable
                key={video.id}
                style={[styles.topicCard, isActive && styles.topicCardActive]}
                onPress={() => setSelectedVideo(video)}
              >
                <View style={styles.topicCardTopRow}>
                  <View style={styles.topicTitleWrap}>
                    <Text style={styles.topicTitle}>{localizedVideo.localizedTitle}</Text>
                    <Text style={styles.topicSubtitle}>{localizedVideo.localizedSummary}</Text>
                  </View>
                  <View style={[styles.topicPill, { backgroundColor: LEVEL_STYLES[video.emergencyLevel]?.backgroundColor || '#eef2ff' }]}>
                    <Text style={[styles.topicPillText, { color: LEVEL_STYLES[video.emergencyLevel]?.color || '#4338ca' }]}>
                      {video.emergencyLevel}
                    </Text>
                  </View>
                </View>
                <View style={styles.topicMetaRow}>
                  <View style={[styles.topicMiniPill, { backgroundColor: BADGE_STYLES[video.category]?.backgroundColor || '#eef4ff' }]}>
                    <Text style={[styles.topicMiniPillText, { color: BADGE_STYLES[video.category]?.color || '#175cd3' }]}>
                      {video.category}
                    </Text>
                  </View>
                  <View style={styles.topicRightMeta}>
                    {downloadedIds.includes(video.id) ? (
                      <View style={styles.offlinePill}>
                        <MaterialCommunityIcons name="check" size={12} color="#067647" />
                        <Text style={styles.offlinePillText}>Saved</Text>
                      </View>
                    ) : null}
                    <Text style={styles.topicHint}>{SCREEN_COPY[guidanceLanguage].tapToLoad}</Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </Section>

        {selectedVideo ? (
          <Section icon="✅" title="Do this">
            <BulletList items={localizedSelectedVideo?.localizedDo || selectedVideo.do} />
          </Section>
        ) : null}

        {selectedVideo ? (
          <Section icon="⛔" title="Avoid this">
            <BulletList items={localizedSelectedVideo?.localizedDont || selectedVideo.dont} tone="danger" />
          </Section>
        ) : null}

        {selectedVideo ? (
          <View style={styles.warningCard}>
            <Text style={styles.warningTitle}>{SCREEN_COPY[guidanceLanguage].warningTitle}</Text>
            <Text style={styles.warningText}>{localizedSelectedVideo?.localizedWarning || selectedVideo.warning}</Text>
          </View>
        ) : null}

        <TouchableOpacity style={styles.emergencyButton} onPress={openEmergencyHelp}>
          <Text style={styles.emergencyButtonText}>{SCREEN_COPY[guidanceLanguage].openEmergency}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f7ff',
  },
  content: {
    padding: 16,
    gap: 14,
    paddingBottom: 28,
  },
  heroCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e4e7ec',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
    gap: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  heroGlow: {
    position: 'absolute',
    top: -36,
    right: -36,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(17, 87, 194, 0.10)',
  },
  heroGlowAccent: {
    position: 'absolute',
    bottom: -30,
    left: -24,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(6, 118, 71, 0.08)',
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#eef4ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEyebrow: {
    color: '#175cd3',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontSize: 11,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#eef4ff',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
  },
  backText: {
    color: '#1157c2',
    fontWeight: '700',
    fontSize: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#101828',
    marginBottom: 8,
  },
  subtitle: {
    color: '#475467',
    lineHeight: 20,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  safeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#f4fdf7',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d0f1df',
  },
  safeBadgeText: {
    color: '#067647',
    fontWeight: '700',
    fontSize: 12,
  },
  languageCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e4e7ec',
    padding: 12,
    gap: 10,
  },
  languageCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  languageLabel: {
    color: '#101828',
    fontWeight: '800',
  },
  languagePills: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  languagePill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d0d5dd',
  },
  languagePillActive: {
    backgroundColor: '#1157c2',
    borderColor: '#1157c2',
  },
  languagePillText: {
    color: '#344054',
    fontWeight: '700',
    fontSize: 12,
  },
  languagePillTextActive: {
    color: '#fff',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e4e7ec',
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1157c2',
  },
  statValueRed: {
    color: '#b42318',
  },
  statValueGreen: {
    color: '#067647',
  },
  statLabel: {
    marginTop: 4,
    color: '#667085',
    fontSize: 12,
    fontWeight: '600',
  },
  searchCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e4e7ec',
    gap: 12,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e4e7ec',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    color: '#101828',
    fontWeight: '600',
  },
  clearButton: {
    padding: 4,
  },
  chipScrollContent: {
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#f2f4f7',
  },
  filterChipActive: {
    backgroundColor: '#1157c2',
  },
  filterChipText: {
    color: '#344054',
    fontWeight: '700',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  playerCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e4e7ec',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
    gap: 12,
  },
  playerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  playerTitleWrap: {
    flex: 1,
    gap: 6,
  },
  playerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  playerCategory: {
    color: '#667085',
    fontWeight: '700',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  playerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#101828',
  },
  playerMiniCopy: {
    color: '#667085',
    lineHeight: 20,
  },
  downloadStateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  downloadStatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#eef4ff',
  },
  downloadStatePillActive: {
    backgroundColor: '#ecfdf3',
  },
  downloadStateText: {
    color: '#175cd3',
    fontWeight: '800',
    fontSize: 12,
  },
  downloadStateTextActive: {
    color: '#067647',
  },
  downloadHintText: {
    color: '#667085',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  playbackStatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#f2f4f7',
  },
  playbackStatePillActive: {
    backgroundColor: '#ecfdf3',
  },
  playbackStateText: {
    color: '#175cd3',
    fontWeight: '800',
    fontSize: 12,
  },
  playbackStateTextActive: {
    color: '#067647',
  },
  categoryPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  categoryPillText: {
    fontWeight: '800',
    fontSize: 11,
  },
  levelPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  levelPillText: {
    fontWeight: '700',
    fontSize: 12,
  },
  videoWrap: {
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  summary: {
    fontSize: 15,
    color: '#344054',
    lineHeight: 22,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryAction: {
    flex: 1,
    backgroundColor: '#1157c2',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionText: {
    color: '#fff',
    fontWeight: '800',
  },
  secondaryAction: {
    flex: 1,
    backgroundColor: '#e8f1ff',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionText: {
    color: '#1157c2',
    fontWeight: '800',
  },
  downloadMessage: {
    color: '#067647',
    fontWeight: '700',
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e4e7ec',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 1,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionIcon: {
    fontSize: 22,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#101828',
  },
  sectionBody: {
    color: '#475467',
    lineHeight: 21,
  },
  bulletList: {
    gap: 10,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bulletDot: {
    fontSize: 20,
    lineHeight: 22,
    color: '#1157c2',
  },
  bulletDotDanger: {
    color: '#d92d20',
  },
  bulletText: {
    flex: 1,
    color: '#344054',
    lineHeight: 22,
  },
  topicCard: {
    borderWidth: 1,
    borderColor: '#e4e7ec',
    borderRadius: 16,
    padding: 14,
    backgroundColor: '#fafbff',
    gap: 10,
  },
  topicCardActive: {
    borderColor: '#1157c2',
    backgroundColor: '#eef4ff',
  },
  topicCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  topicTitleWrap: {
    flex: 1,
    gap: 4,
  },
  topicTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#101828',
  },
  topicSubtitle: {
    color: '#667085',
    lineHeight: 20,
  },
  topicSummary: {
    color: '#475467',
    lineHeight: 20,
  },
  topicMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  topicMiniPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  topicMiniPillText: {
    fontWeight: '700',
    fontSize: 11,
  },
  topicHint: {
    color: '#667085',
    fontSize: 12,
    fontWeight: '600',
  },
  topicRightMeta: {
    alignItems: 'flex-end',
    gap: 6,
  },
  offlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#ecfdf3',
  },
  offlinePillText: {
    color: '#067647',
    fontWeight: '800',
    fontSize: 11,
  },
  topicPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  topicPillText: {
    fontWeight: '700',
    fontSize: 12,
  },
  warningCard: {
    backgroundColor: '#fff4db',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ffd27d',
  },
  warningTitle: {
    fontWeight: '800',
    color: '#9a6700',
    marginBottom: 6,
  },
  warningText: {
    color: '#7a4b00',
    lineHeight: 21,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ecfdf3',
    borderWidth: 1,
    borderColor: '#d0f1df',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
  },
  offlineBannerText: {
    color: '#067647',
    fontWeight: '800',
    flex: 1,
  },
  emptyStateCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e4e7ec',
    gap: 6,
  },
  emptyStateTitle: {
    color: '#101828',
    fontWeight: '800',
    fontSize: 14,
  },
  emptyStateText: {
    color: '#667085',
    textAlign: 'center',
    lineHeight: 20,
  },
  emergencyButton: {
    backgroundColor: '#d92d20',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 28,
  },
  emergencyButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
});
