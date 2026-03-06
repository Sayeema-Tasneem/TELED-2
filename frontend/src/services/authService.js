import * as SecureStore from 'expo-secure-store';
import axios from 'axios';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: BACKEND_URL,
  timeout: 10000,
});

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
      const response = await api.post('/api/auth/send-otp', {
        phoneNumber,
      });
      return response.data;
    } catch (error) {
      console.error('Send OTP error:', error.response?.data || error.message);
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
      return response.data;
    } catch (error) {
      console.error('Create profile error:', error.response?.data || error.message);
      throw error.response?.data || error;
    }
  },

  // Logout user
  logout: async () => {
    try {
      await api.post('/api/auth/logout');
      // Clear stored data
      await SecureStore.deleteItemAsync('authToken');
      await SecureStore.deleteItemAsync('phoneNumber');
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local data even if API fails
      await SecureStore.deleteItemAsync('authToken');
      await SecureStore.deleteItemAsync('phoneNumber');
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
