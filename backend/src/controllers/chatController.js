/**
 * Chat Controller - Handle chat-related API requests
 * Manages chat sessions, messages, and file uploads
 */

const chatModel = require('../models/chats');
const fs = require('fs');
const path = require('path');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../uploads/chat');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

module.exports = {
  /**
   * POST /api/chat/sessions
   * Create or get chat session between two users
   */
  createOrGetSession: (req, res) => {
    try {
      const {
        userOneId,
        userOneName,
        userOneRole,
        userOneAvatar,
        userTwoId,
        userTwoName,
        userTwoRole,
        userTwoAvatar,
        appointmentId,
        callId,
      } = req.body;

      // Validation
      if (!userOneId || !userTwoId) {
        return res.status(400).json({
          success: false,
          message: 'Both user IDs are required',
        });
      }

      const session = chatModel.getOrCreateChatSession(userOneId, userTwoId, {
        userOneId,
        userOneName,
        userOneRole,
        userOneAvatar,
        userTwoId,
        userTwoName,
        userTwoRole,
        userTwoAvatar,
        appointmentId,
        callId,
      });

      return res.status(201).json({
        success: true,
        session,
      });
    } catch (error) {
      console.error('Error creating/getting chat session:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create/get chat session',
        error: error.message,
      });
    }
  },

  /**
   * GET /api/chat/sessions/:sessionId
   * Get chat session details
   */
  getSession: (req, res) => {
    try {
      const { sessionId } = req.params;

      const session = chatModel.getChatSession(sessionId);
      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Chat session not found',
        });
      }

      return res.status(200).json({
        success: true,
        session,
      });
    } catch (error) {
      console.error('Error getting chat session:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get chat session',
        error: error.message,
      });
    }
  },

  /**
   * GET /api/chat/user/:userId/sessions
   * Get all chat sessions for a user
   */
  getUserSessions: (req, res) => {
    try {
      const { userId } = req.params;

      const sessions = chatModel.getUserChatSessions(userId);

      return res.status(200).json({
        success: true,
        sessions,
        count: sessions.length,
      });
    } catch (error) {
      console.error('Error getting user chat sessions:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get user chat sessions',
        error: error.message,
      });
    }
  },

  /**
   * POST /api/chat/sessions/:sessionId/messages
   * Send a message
   */
  sendMessage: (req, res) => {
    try {
      const { sessionId } = req.params;
      const {
        senderId,
        senderName,
        senderRole,
        content,
        messageType,
        mediaUrl,
        mediaType,
        fileName,
        fileSize,
        replyToMessageId,
      } = req.body;

      // Validation
      if (!senderId || (!content && !mediaUrl)) {
        return res.status(400).json({
          success: false,
          message: 'Sender ID and content or media URL are required',
        });
      }

      const message = chatModel.addMessage(sessionId, {
        senderId,
        senderName,
        senderRole,
        content,
        messageType: messageType || 'text',
        mediaUrl,
        mediaType,
        fileName,
        fileSize,
        replyToMessageId,
      });

      if (!message) {
        return res.status(404).json({
          success: false,
          message: 'Chat session not found',
        });
      }

      return res.status(201).json({
        success: true,
        message,
      });
    } catch (error) {
      console.error('Error sending message:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to send message',
        error: error.message,
      });
    }
  },

  /**
   * GET /api/chat/sessions/:sessionId/messages
   * Get messages for a chat session (paginated)
   */
  getMessages: (req, res) => {
    try {
      const { sessionId } = req.params;
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;

      const result = chatModel.getChatMessages(sessionId, limit, offset);

      return res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      console.error('Error getting messages:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get messages',
        error: error.message,
      });
    }
  },

  /**
   * PUT /api/chat/messages/:messageId/read
   * Mark message as read
   */
  markMessageAsRead: (req, res) => {
    try {
      const { messageId } = req.params;
      const { sessionId } = req.body;

      const message = chatModel.markMessageAsRead(sessionId, messageId);
      if (!message) {
        return res.status(404).json({
          success: false,
          message: 'Message not found',
        });
      }

      return res.status(200).json({
        success: true,
        message,
      });
    } catch (error) {
      console.error('Error marking message as read:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to mark message as read',
        error: error.message,
      });
    }
  },

  /**
   * PUT /api/chat/sessions/:sessionId/read-all
   * Mark all messages in session as read
   */
  markAllAsRead: (req, res) => {
    try {
      const { sessionId } = req.params;
      const { userId } = req.body;

      const messages = chatModel.markAllMessagesAsRead(sessionId, userId);

      return res.status(200).json({
        success: true,
        marked: messages.length,
      });
    } catch (error) {
      console.error('Error marking all messages as read:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to mark messages as read',
        error: error.message,
      });
    }
  },

  /**
   * PUT /api/chat/sessions/:sessionId/typing
   * Update typing status
   */
  updateTypingStatus: (req, res) => {
    try {
      const { sessionId } = req.params;
      const { userId, isTyping } = req.body;

      const session = chatModel.updateTypingStatus(sessionId, userId, isTyping);
      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Chat session not found',
        });
      }

      return res.status(200).json({
        success: true,
        session,
      });
    } catch (error) {
      console.error('Error updating typing status:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update typing status',
        error: error.message,
      });
    }
  },

  /**
   * GET /api/chat/user/:userId/unread
   * Get unread message count for user
   */
  getUnreadCount: (req, res) => {
    try {
      const { userId } = req.params;

      const count = chatModel.getUnreadCount(userId);

      return res.status(200).json({
        success: true,
        unreadCount: count,
      });
    } catch (error) {
      console.error('Error getting unread count:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get unread count',
        error: error.message,
      });
    }
  },

  /**
   * GET /api/chat/sessions/:sessionId/search
   * Search messages in a chat
   */
  searchMessages: (req, res) => {
    try {
      const { sessionId } = req.params;
      const { query } = req.query;

      if (!query) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required',
        });
      }

      const results = chatModel.searchMessages(sessionId, query);

      return res.status(200).json({
        success: true,
        results,
        count: results.length,
      });
    } catch (error) {
      console.error('Error searching messages:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to search messages',
        error: error.message,
      });
    }
  },

  /**
   * DELETE /api/chat/messages/:messageId
   * Delete a message (soft delete)
   */
  deleteMessage: (req, res) => {
    try {
      const { messageId } = req.params;

      const message = chatModel.deleteMessage(messageId);
      if (!message) {
        return res.status(404).json({
          success: false,
          message: 'Message not found',
        });
      }

      return res.status(200).json({
        success: true,
        message,
      });
    } catch (error) {
      console.error('Error deleting message:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete message',
        error: error.message,
      });
    }
  },

  /**
   * POST /api/chat/upload
   * Upload a file (image or document)
   */
  uploadFile: (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file provided',
        });
      }

      const { sessionId, fileType } = req.body;

      // Create session-specific directory
      const sessionDir = path.join(uploadsDir, sessionId);
      if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
      }

      // File is automatically saved by multer
      const fileUrl = `/uploads/chat/${sessionId}/${req.file.filename}`;
      const mediaType = req.file.mimetype;
      const fileName = req.file.originalname;
      const fileSize = req.file.size;

      return res.status(200).json({
        success: true,
        fileUrl,
        mediaType,
        fileName,
        fileSize,
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to upload file',
        error: error.message,
      });
    }
  },

  /**
   * GET /api/chat/sessions/:sessionId/statistics
   * Get chat session statistics
   */
  getSessionStatistics: (req, res) => {
    try {
      const { sessionId } = req.params;

      const stats = chatModel.getSessionStatistics(sessionId);
      if (!stats) {
        return res.status(404).json({
          success: false,
          message: 'Chat session not found',
        });
      }

      return res.status(200).json({
        success: true,
        statistics: stats,
      });
    } catch (error) {
      console.error('Error getting session statistics:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get session statistics',
        error: error.message,
      });
    }
  },

  /**
   * PUT /api/chat/sessions/:sessionId/close
   * Close a chat session
   */
  closeSession: (req, res) => {
    try {
      const { sessionId } = req.params;

      const session = chatModel.closeChatSession(sessionId);
      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Chat session not found',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Chat session closed',
        session,
      });
    } catch (error) {
      console.error('Error closing session:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to close session',
        error: error.message,
      });
    }
  },
};
