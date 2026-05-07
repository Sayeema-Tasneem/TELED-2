import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import Constants from 'expo-constants';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: BACKEND_URL,
  timeout: 15000,
});

const normalizeBaseUrl = (url) => {
  if (!url) return null;
  return url.replace(/\/$/, '');
};

const getExpoHostBackendUrl = () => {
  const hostUri = Constants?.expoConfig?.hostUri || Constants?.manifest2?.extra?.expoClient?.hostUri;
  if (!hostUri) return null;

  const host = hostUri.split(':')[0];
  if (!host) return null;

  return `http://${host}:5000`;
};

const getBackendCandidates = () => {
  const configuredBackend = normalizeBaseUrl(process.env.EXPO_PUBLIC_BACKEND_URL);
  const isConfiguredHttps = configuredBackend?.startsWith('https://');

  const candidates = [
    configuredBackend,
    ...(isConfiguredHttps
      ? []
      : [
          normalizeBaseUrl(getExpoHostBackendUrl()),
          'http://10.0.2.2:5000', // Android emulator -> host machine
          'http://localhost:5000',
        ]),
  ].filter(Boolean);

  // Remove duplicates while preserving order
  return [...new Set(candidates)];
};

const postWithFallback = async (path, payload, timeoutMs = 15000) => {
  const baseUrls = getBackendCandidates();
  let lastError;

  for (const baseURL of baseUrls) {
    try {
      const response = await axios.post(`${baseURL}${path}`, payload, {
        timeout: timeoutMs,
      });
      return response;
    } catch (error) {
      lastError = error;
      // Try next URL if network/timeout failure; for server validation errors, stop immediately.
      if (error.response) {
        throw error;
      }
    }
  }

  throw lastError;
};

const getWithFallback = async (path, timeoutMs = 15000, withAuth = false) => {
  const baseUrls = getBackendCandidates();
  let lastError;
  const token = withAuth ? await SecureStore.getItemAsync('authToken') : null;

  for (const baseURL of baseUrls) {
    try {
      const response = await axios.get(`${baseURL}${path}`, {
        timeout: timeoutMs,
        headers: withAuth && token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      return response;
    } catch (error) {
      lastError = error;
      // For server validation/auth errors, stop immediately.
      if (error.response) {
        throw error;
      }
    }
  }

  throw lastError;
};

// Add token to requests
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

const authService = {
  // Send OTP to phone number
  sendOTP: async (phoneNumber) => {
    try {
      const response = await postWithFallback('/api/auth/send-otp', {
        phoneNumber,
      });
      return response.data;
    } catch (error) {
      const timeoutHint =
        error?.code === 'ECONNABORTED'
          ? 'Request timed out. Ensure backend is running and EXPO_PUBLIC_BACKEND_URL points to a reachable IP from your phone/emulator.'
          : null;

      console.error('Send OTP error:', error.response?.data || error.message, timeoutHint || '');
      throw error.response?.data || error;
    }
  },

  // Verify OTP and get token
  verifyOTP: async (phoneNumber, otp) => {
    try {
      const response = await api.post('/api/auth/verify-otp', {
        phoneNumber,
        otp,
      });
      
      const { token, user } = response.data;
      
      // Store token securely
      if (token) {
        await SecureStore.setItemAsync('authToken', token);
        await SecureStore.setItemAsync('phoneNumber', phoneNumber);
        if (user) {
          await SecureStore.setItemAsync('userProfile', JSON.stringify(user));
        }
      }
      
      return { token, user };
    } catch (error) {
      console.error('Verify OTP error:', error.response?.data || error.message);
      throw error.response?.data || error;
    }
  },

  // Create or update user profile
  createProfile: async (profileData) => {
    try {
      const response = await api.post('/api/auth/create-profile', profileData);
      if (response?.data?.user) {
        await SecureStore.setItemAsync('userProfile', JSON.stringify(response.data.user));
      }
      return response.data;
    } catch (error) {
      console.error('Create profile error:', error.response?.data || error.message);
      throw error.response?.data || error;
    }
  },

  // Get authenticated user profile from backend and cache locally
  getCurrentUser: async () => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      if (!token) {
        const fallbackWithoutToken = await SecureStore.getItemAsync('userProfile');
        return fallbackWithoutToken ? JSON.parse(fallbackWithoutToken) : null;
      }

      const response = await getWithFallback('/api/auth/me', 15000, true);
      if (response?.data?.user) {
        await SecureStore.setItemAsync('userProfile', JSON.stringify(response.data.user));
      }
      return response.data?.user || null;
    } catch (error) {
      const fallback = await SecureStore.getItemAsync('userProfile');
      if (fallback) {
        console.warn('Get current user: backend unreachable, using cached profile');
        return JSON.parse(fallback);
      }
      if (error?.response?.status !== 401) {
        console.warn('Get current user fallback failed:', error.response?.data || error.message);
      }
      return null;
    }
  },

  // Read cached user profile
  getCachedUserProfile: async () => {
    try {
      const payload = await SecureStore.getItemAsync('userProfile');
      return payload ? JSON.parse(payload) : null;
    } catch (error) {
      console.error('Error getting cached user profile:', error);
      return null;
    }
  },

  // Merge updates into cached user profile
  updateCachedUserProfile: async (updates = {}) => {
    try {
      const existing = await authService.getCachedUserProfile();
      const merged = { ...(existing || {}), ...(updates || {}) };
      await SecureStore.setItemAsync('userProfile', JSON.stringify(merged));
      return merged;
    } catch (error) {
      console.error('Error updating cached user profile:', error);
      return null;
    }
  },

  // Logout user
  logout: async () => {
    try {
      await api.post('/api/auth/logout');
      // Clear stored data
      await SecureStore.deleteItemAsync('authToken');
      await SecureStore.deleteItemAsync('phoneNumber');
      await SecureStore.deleteItemAsync('userProfile');
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local data even if API fails
      await SecureStore.deleteItemAsync('authToken');
      await SecureStore.deleteItemAsync('phoneNumber');
      await SecureStore.deleteItemAsync('userProfile');
      return { success: true };
    }
  },

  // Get stored auth token
  getToken: async () => {
    try {
      return await SecureStore.getItemAsync('authToken');
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  },

  // Get stored phone number
  getPhoneNumber: async () => {
    try {
      return await SecureStore.getItemAsync('phoneNumber');
    } catch (error) {
      console.error('Error getting phone number:', error);
      return null;
    }
  },

  // Check if user is authenticated
  isAuthenticated: async () => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      return !!token;
    } catch (error) {
      console.error('Error checking authentication:', error);
      return false;
    }
  },
};

export default authService;
