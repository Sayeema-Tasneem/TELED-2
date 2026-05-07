/**
 * Chat Service - API calls for chat management
 */

import axios from 'axios';

const API_BASE_URL = `${process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:5000'}/api`;

const chatService = {
  /**
   * Create or get chat session
   */
  createOrGetSession: async (userData) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/chat/sessions`, userData);
      return response.data;
    } catch (error) {
      console.error('Error creating chat session:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Get chat session details
   */
  getSession: async (sessionId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/chat/sessions/${sessionId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting chat session:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Get all chat sessions for a user
   */
  getUserSessions: async (userId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/chat/user/${userId}/sessions`);
      return response.data;
    } catch (error) {
      console.error('Error getting user sessions:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Send a text message
   */
  sendMessage: async (sessionId, messageData) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/chat/sessions/${sessionId}/messages`,
        {
          senderId: messageData.senderId,
          senderName: messageData.senderName,
          senderRole: messageData.senderRole,
          content: messageData.content,
          messageType: messageData.messageType || 'text',
          mediaUrl: messageData.mediaUrl,
          mediaType: messageData.mediaType,
          fileName: messageData.fileName,
          fileSize: messageData.fileSize,
          replyToMessageId: messageData.replyToMessageId,
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Get messages for a chat session
   */
  getMessages: async (sessionId, limit = 50, offset = 0) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/chat/sessions/${sessionId}/messages?limit=${limit}&offset=${offset}`
      );
      return response.data;
    } catch (error) {
      console.error('Error getting messages:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Mark message as read
   */
  markAsRead: async (messageId, sessionId) => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/chat/messages/${messageId}/read`,
        { sessionId }
      );
      return response.data;
    } catch (error) {
      console.error('Error marking message as read:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Mark all messages as read in a session
   */
  markAllAsRead: async (sessionId, userId) => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/chat/sessions/${sessionId}/read-all`,
        { userId }
      );
      return response.data;
    } catch (error) {
      console.error('Error marking all as read:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Update typing status
   */
  updateTypingStatus: async (sessionId, userId, isTyping) => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/chat/sessions/${sessionId}/typing`,
        { userId, isTyping }
      );
      return response.data;
    } catch (error) {
      console.error('Error updating typing status:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Get unread message count
   */
  getUnreadCount: async (userId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/chat/user/${userId}/unread`);
      return response.data;
    } catch (error) {
      console.error('Error getting unread count:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Search messages
   */
  searchMessages: async (sessionId, query) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/chat/sessions/${sessionId}/search?query=${encodeURIComponent(query)}`
      );
      return response.data;
    } catch (error) {
      console.error('Error searching messages:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Delete a message
   */
  deleteMessage: async (messageId) => {
    try {
      const response = await axios.delete(`${API_BASE_URL}/chat/messages/${messageId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Get session statistics
   */
  getSessionStatistics: async (sessionId) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/chat/sessions/${sessionId}/statistics`
      );
      return response.data;
    } catch (error) {
      console.error('Error getting session statistics:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Close chat session
   */
  closeSession: async (sessionId) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/chat/sessions/${sessionId}/close`);
      return response.data;
    } catch (error) {
      console.error('Error closing session:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Upload a file
   */
  uploadFile: async (sessionId, file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sessionId', sessionId);
      formData.append('fileType', file.type.split('/')[0]); // 'image' or 'application'

      const response = await axios.post(`${API_BASE_URL}/chat/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error.response?.data || error;
    }
  },
};

export default chatService;
