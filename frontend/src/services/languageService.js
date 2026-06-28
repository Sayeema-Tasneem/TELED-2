import { I18n } from 'i18n-js';
import { getLocales } from 'expo-localization';
import en from '../locales/en.json';
import hi from '../locales/hi.json';
import kn from '../locales/kn.json';

export const i18n = new I18n({
  en,
  hi,
  kn,
});

i18n.enableFallback = true;
i18n.defaultLocale = 'en';

const getDeviceLocale = () => {
  const locales = getLocales();
  return locales?.[0]?.languageTag || locales?.[0]?.languageCode || 'en';
};

const normalizeLocale = (locale) => {
  if (!locale) return 'en';

  if (locale.startsWith('hi')) return 'hi';
  if (locale.startsWith('kn')) return 'kn';
  return 'en';
};

i18n.locale = normalizeLocale(getDeviceLocale());

// Initialize with default language
let currentLanguage = i18n.locale || 'en';
const subscribers = new Set();

const notifyLanguageChange = () => {
  subscribers.forEach((listener) => {
    try {
      listener(currentLanguage);
    } catch (error) {
      console.warn('Language listener error:', error);
    }
  });
};

const languageService = {
  // Get current language
  getCurrentLanguage: () => currentLanguage,

  // Set language
  setLanguage: (lang) => {
    if (['en', 'hi', 'kn'].includes(lang)) {
      const hasChanged = currentLanguage !== lang;
      currentLanguage = lang;
      i18n.locale = lang;
      if (hasChanged) {
        notifyLanguageChange();
      }
      return true;
    }
    return false;
  },

  // Subscribe to language changes for app-wide re-render
  subscribe: (listener) => {
    subscribers.add(listener);
    return () => subscribers.delete(listener);
  },

  // Get translation
  // Supports two common call styles:
  //  - t(key, 'default string', { count: 1 })
  //  - t(key, { count: 1 })
  t: (key, defaultValue = '', options = {}) => {
    // If caller passed an object as the second argument, treat it as options (interpolation, pluralization, etc.)
    if (defaultValue && typeof defaultValue === 'object' && !Array.isArray(defaultValue)) {
      return i18n.t(key, { ...defaultValue, ...options });
    }

    return i18n.t(key, { defaultValue, ...options });
  },

  // Get all available languages
  getAvailableLanguages: () => [
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'हिन्दी' },
    { code: 'kn', name: 'ಕನ್ನಡ' },
  ],

  // Initialize language based on device locale
  initializeLanguage: async () => {
    languageService.setLanguage(normalizeLocale(getDeviceLocale()));
  },
};

export default languageService;
