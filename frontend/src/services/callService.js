/**
 * Call Service - API calls for call management
 */

import axios from 'axios';

// Use your backend URL here
const API_BASE_URL = `${process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:5000'}/api`;

const callService = {
  /**
   * Initiate a new call
   */
  initiateCall: async (callData) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/calls/initiate`, {
        callType: callData.callType, // 'audio' or 'video'
        initiatorUserId: callData.initiatorUserId,
        initiatorName: callData.initiatorName,
        recipientUserId: callData.recipientUserId,
        recipientName: callData.recipientName,
        appointmentId: callData.appointmentId,
      });

      return response.data;
    } catch (error) {
      console.error('Error initiating call:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Get call details
   */
  getCall: async (callId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/calls/${callId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting call:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Update call status
   */
  updateCallStatus: async (callId, status) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/calls/${callId}/status`, {
        status,
      });
      return response.data;
    } catch (error) {
      console.error('Error updating call status:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Update call quality metrics
   */
  updateCallQuality: async (callId, quality, metrics = {}) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/calls/${callId}/quality`, {
        quality,
        metrics,
      });
      return response.data;
    } catch (error) {
      console.error('Error updating call quality:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * End a call
   */
  endCall: async (callId, reason = 'user_ended') => {
    try {
      const response = await axios.post(`${API_BASE_URL}/calls/${callId}/end`, {
        reason,
      });
      return response.data;
    } catch (error) {
      console.error('Error ending call:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Get call history for user
   */
  getUserCallHistory: async (userId, limit = 20) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/calls/user/${userId}/history?limit=${limit}`
      );
      return response.data;
    } catch (error) {
      console.error('Error getting user call history:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Get call history for appointment
   */
  getAppointmentCallHistory: async (appointmentId) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/calls/appointment/${appointmentId}/history`
      );
      return response.data;
    } catch (error) {
      console.error('Error getting appointment call history:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Get call statistics for user
   */
  getUserCallStatistics: async (userId) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/calls/user/${userId}/statistics`
      );
      return response.data;
    } catch (error) {
      console.error('Error getting call statistics:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Get Agora token
   */
  getAgoraToken: async (channelId, uid) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/calls/token/agora`, {
        params: {
          channelId,
          uid,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error getting Agora token:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Get active calls (admin)
   */
  getActiveCalls: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/calls/admin/active`);
      return response.data;
    } catch (error) {
      console.error('Error getting active calls:', error);
      throw error.response?.data || error;
    }
  },
};

export default callService;
