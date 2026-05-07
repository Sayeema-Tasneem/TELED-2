/**
 * Chat Model - Chat session and message management
 * Handles real-time chat between patients and doctors
 */

let chatSessions = {
  // Chat session ID -> Chat object mapping
};

let messageHistory = [
  // Historical messages across all chats
];

// Generate unique chat session ID
const generateChatSessionId = () => {
  return `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Generate unique message ID
const generateMessageId = () => {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

module.exports = {
  // Create a new chat session
  createChatSession: (sessionData) => {
    const sessionId = generateChatSessionId();
    const newSession = {
      id: sessionId,
      participantOne: {
        userId: sessionData.userOneId,
        name: sessionData.userOneName,
        role: sessionData.userOneRole, // 'patient' or 'doctor'
        avatar: sessionData.userOneAvatar || '👤',
      },
      participantTwo: {
        userId: sessionData.userTwoId,
        name: sessionData.userTwoName,
        role: sessionData.userTwoRole,
        avatar: sessionData.userTwoAvatar || '👨‍⚕️',
      },
      appointmentId: sessionData.appointmentId,
      callId: sessionData.callId || null,
      createdAt: new Date().toISOString(),
      lastMessageTime: null,
      messageCount: 0,
      status: 'active', // active, closed, archived
      isTyping: {
        [sessionData.userOneId]: false,
        [sessionData.userTwoId]: false,
      },
    };
    
    chatSessions[sessionId] = newSession;
    return newSession;
  },

  // Get or create chat session between two users
  getOrCreateChatSession: (userId1, userId2, userData) => {
    const existingSession = Object.values(chatSessions).find(
      (session) =>
        (session.participantOne.userId === userId1 &&
          session.participantTwo.userId === userId2) ||
        (session.participantOne.userId === userId2 &&
          session.participantTwo.userId === userId1)
    );

    if (existingSession) {
      return existingSession;
    }

    return module.exports.createChatSession(userData);
  },

  // Add a message to chat
  addMessage: (sessionId, messageData) => {
    if (!chatSessions[sessionId]) {
      return null;
    }

    const messageId = generateMessageId();
    const newMessage = {
      id: messageId,
      sessionId,
      senderId: messageData.senderId,
      senderName: messageData.senderName,
      senderRole: messageData.senderRole,
      content: messageData.content || '',
      messageType: messageData.messageType, // 'text', 'image', 'file', 'prescription'
      mediaUrl: messageData.mediaUrl || null,
      mediaType: messageData.mediaType || null, // 'image/jpeg', 'application/pdf', etc.
      fileName: messageData.fileName || null,
      fileSize: messageData.fileSize || null, // in bytes
      timestamp: new Date().toISOString(),
      isRead: false,
      readAt: null,
      reactions: {}, // emoji reactions
      replyToMessageId: messageData.replyToMessageId || null,
    };

    messageHistory.push(newMessage);
    chatSessions[sessionId].lastMessageTime = newMessage.timestamp;
    chatSessions[sessionId].messageCount += 1;

    return newMessage;
  },

  // Get chat session by ID
  getChatSession: (sessionId) => {
    return chatSessions[sessionId] || null;
  },

  // Get all messages for a chat session
  getChatMessages: (sessionId, limit = 50, offset = 0) => {
    const sessionMessages = messageHistory
      .filter((msg) => msg.sessionId === sessionId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(offset, offset + limit)
      .reverse();

    return {
      messages: sessionMessages,
      total: messageHistory.filter((msg) => msg.sessionId === sessionId).length,
      hasMore: offset + limit < messageHistory.filter((msg) => msg.sessionId === sessionId).length,
    };
  },

  // Get chat sessions for a user
  getUserChatSessions: (userId) => {
    return Object.values(chatSessions)
      .filter(
        (session) =>
          session.participantOne.userId === userId ||
          session.participantTwo.userId === userId
      )
      .sort((a, b) => new Date(b.lastMessageTime || b.createdAt) - new Date(a.lastMessageTime || a.createdAt));
  },

  // Mark message as read
  markMessageAsRead: (sessionId, messageId) => {
    const message = messageHistory.find((msg) => msg.id === messageId);
    if (message) {
      message.isRead = true;
      message.readAt = new Date().toISOString();
    }
    return message;
  },

  // Mark all messages as read for a session
  markAllMessagesAsRead: (sessionId, userId) => {
    const messages = messageHistory.filter((msg) => msg.sessionId === sessionId && msg.senderId !== userId);
    messages.forEach((msg) => {
      msg.isRead = true;
      msg.readAt = new Date().toISOString();
    });
    return messages;
  },

  // Update typing status
  updateTypingStatus: (sessionId, userId, isTyping) => {
    if (chatSessions[sessionId]) {
      chatSessions[sessionId].isTyping[userId] = isTyping;
      return chatSessions[sessionId];
    }
    return null;
  },

  // Get unread count for user in all sessions
  getUnreadCount: (userId) => {
    const userSessions = Object.values(chatSessions).filter(
      (session) =>
        session.participantOne.userId === userId ||
        session.participantTwo.userId === userId
    );

    let totalUnread = 0;
    userSessions.forEach((session) => {
      const unreadMessages = messageHistory.filter(
        (msg) =>
          msg.sessionId === session.id &&
          msg.senderId !== userId &&
          !msg.isRead
      );
      totalUnread += unreadMessages.length;
    });

    return totalUnread;
  },

  // Search messages in a chat
  searchMessages: (sessionId, searchText) => {
    return messageHistory.filter(
      (msg) =>
        msg.sessionId === sessionId &&
        (msg.content.toLowerCase().includes(searchText.toLowerCase()) ||
          msg.fileName?.toLowerCase().includes(searchText.toLowerCase()))
    );
  },

  // Delete a message (soft delete)
  deleteMessage: (messageId) => {
    const message = messageHistory.find((msg) => msg.id === messageId);
    if (message) {
      message.content = '[Message deleted]';
      message.messageType = 'deleted';
      return message;
    }
    return null;
  },

  // Close chat session
  closeChatSession: (sessionId) => {
    if (chatSessions[sessionId]) {
      chatSessions[sessionId].status = 'closed';
      return chatSessions[sessionId];
    }
    return null;
  },

  // Get session statistics
  getSessionStatistics: (sessionId) => {
    const session = chatSessions[sessionId];
    if (!session) return null;

    const messages = messageHistory.filter((msg) => msg.sessionId === sessionId);
    const imageMessages = messages.filter((msg) => msg.messageType === 'image');
    const fileMessages = messages.filter((msg) => msg.messageType === 'file');

    return {
      totalMessages: messages.length,
      imageCount: imageMessages.length,
      fileCount: fileMessages.length,
      messagesByUser: {
        [session.participantOne.userId]: messages.filter((m) => m.senderId === session.participantOne.userId).length,
        [session.participantTwo.userId]: messages.filter((m) => m.senderId === session.participantTwo.userId).length,
      },
      duration: session.lastMessageTime
        ? Math.floor((new Date(session.lastMessageTime) - new Date(session.createdAt)) / 1000)
        : 0,
    };
  },

  // Clear all chat data (for testing)
  clearAllChats: () => {
    chatSessions = {};
    messageHistory = [];
  },
};
