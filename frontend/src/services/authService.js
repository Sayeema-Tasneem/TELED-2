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
  // Send OTP
  sendOTP: async (phoneNumber) => {
    try {
      const response = await api.post('/api/auth/send-otp', {
        phoneNumber,
      });
      return response.data;
    } catch (error) {
      console.error('Send OTP error:', error);
      throw error;
    }
  },

  // Verify OTP
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
      }
      
      return { token, user };
    } catch (error) {
      console.error('Verify OTP error:', error);
      throw error;
    }
  },

  // Logout
  logout: async () => {
    try {
      await SecureStore.deleteItemAsync('authToken');
    } catch (error) {
      console.error('Logout error:', error);
    }
  },
};

export default authService;
