import I18n from 'i18n-js';
import * as Localization from 'expo-localization';
import en from '../locales/en.json';
import hi from '../locales/hi.json';
import kn from '../locales/kn.json';

// Supported languages
I18n.translations = {
  en,
  hi,
  kn,
};

// Set the locale
I18n.locale = Localization.locale;

// Enable fallback to English
I18n.enableFallback = true;
I18n.fallbacks = {
  'hi-IN': 'hi',
  'kn-IN': 'kn',
};

// Initialize with default language
let currentLanguage = 'en';

const languageService = {
  // Get current language
  getCurrentLanguage: () => currentLanguage,

  // Set language
  setLanguage: (lang) => {
    if (['en', 'hi', 'kn'].includes(lang)) {
      currentLanguage = lang;
      I18n.locale = lang;
      return true;
    }
    return false;
  },

  // Get translation
  t: (key, defaultValue = '', options = {}) => {
    return I18n.t(key, { defaultValue, ...options });
  },

  // Get all available languages
  getAvailableLanguages: () => [
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'हिन्दी' },
    { code: 'kn', name: 'ಕನ್ನಡ' },
  ],

  // Initialize language based on device locale
  initializeLanguage: async () => {
    const deviceLocale = Localization.locale;
    
    if (deviceLocale.startsWith('hi')) {
      languageService.setLanguage('hi');
    } else if (deviceLocale.startsWith('kn')) {
      languageService.setLanguage('kn');
    } else {
      languageService.setLanguage('en');
    }
  },
};

export default languageService;
