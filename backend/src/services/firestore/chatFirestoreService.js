const { admin, now, mapDoc, getCollection } = require('./firestoreHelpers');

const getChatSessionsCollection = () => getCollection('chatSessions');
const getMessagesCollection = (sessionId) => getCollection(`chatSessions/${sessionId}/messages`);

const createChatSession = async (sessionData) => {
  const docRef = getChatSessionsCollection().doc();
  const payload = {
    participantIds: [sessionData.userOneId, sessionData.userTwoId],
    participantOne: {
      userId: sessionData.userOneId,
      name: sessionData.userOneName,
      role: sessionData.userOneRole,
      avatar: sessionData.userOneAvatar || '👤',
    },
    participantTwo: {
      userId: sessionData.userTwoId,
      name: sessionData.userTwoName,
      role: sessionData.userTwoRole,
      avatar: sessionData.userTwoAvatar || '👨‍⚕️',
    },
    appointmentId: sessionData.appointmentId || null,
    callId: sessionData.callId || null,
    createdAt: now(),
    updatedAt: now(),
    lastMessageTime: null,
    lastMessagePreview: '',
    messageCount: 0,
    status: 'active',
    isTyping: {
      [sessionData.userOneId]: false,
      [sessionData.userTwoId]: false,
    },
  };

  await docRef.set(payload);
  return mapDoc(await docRef.get());
};

const getOrCreateChatSession = async (userId1, userId2, userData) => {
  const snapshot = await getChatSessionsCollection()
    .where('participantIds', 'array-contains', userId1)
    .where('status', 'in', ['active', 'closed'])
    .get();

  const existing = snapshot.docs
    .map(mapDoc)
    .find(
      (session) =>
        session.participantIds.includes(userId1) && session.participantIds.includes(userId2)
    );

  return existing || createChatSession(userData);
};

const getChatSession = async (sessionId) => {
  const doc = await getChatSessionsCollection().doc(sessionId).get();
  return doc.exists ? mapDoc(doc) : null;
};

const addMessage = async (sessionId, messageData) => {
  const sessionRef = getChatSessionsCollection().doc(sessionId);
  const messageRef = getMessagesCollection(sessionId).doc();

  await admin.firestore().runTransaction(async (transaction) => {
    const sessionDoc = await transaction.get(sessionRef);
    if (!sessionDoc.exists) {
      throw new Error('Chat session not found');
    }

    transaction.set(messageRef, {
      senderId: messageData.senderId,
      senderName: messageData.senderName,
      senderRole: messageData.senderRole,
      content: messageData.content || '',
      messageType: messageData.messageType || 'text',
      mediaUrl: messageData.mediaUrl || null,
      mediaType: messageData.mediaType || null,
      fileName: messageData.fileName || null,
      fileSize: messageData.fileSize || null,
      replyToMessageId: messageData.replyToMessageId || null,
      isRead: false,
      readAt: null,
      reactions: {},
      timestamp: now(),
    });

    transaction.update(sessionRef, {
      lastMessageTime: now(),
      lastMessagePreview: messageData.content || messageData.fileName || '[attachment]',
      messageCount: admin.firestore.FieldValue.increment(1),
      updatedAt: now(),
    });
  });

  return mapDoc(await messageRef.get());
};

const getChatMessages = async (sessionId, limit = 50, offset = 0) => {
  const snapshot = await getMessagesCollection(sessionId).orderBy('timestamp', 'asc').get();
  const allMessages = snapshot.docs.map(mapDoc);
  const messages = allMessages.slice(offset, offset + limit);

  return {
    messages,
    total: allMessages.length,
    hasMore: offset + limit < allMessages.length,
  };
};

const getUserChatSessions = async (userId) => {
  const snapshot = await getChatSessionsCollection()
    .where('participantIds', 'array-contains', userId)
    .orderBy('updatedAt', 'desc')
    .get();
  return snapshot.docs.map(mapDoc);
};

const markMessageAsRead = async (sessionId, messageId) => {
  const docRef = getMessagesCollection(sessionId).doc(messageId);
  await docRef.update({
    isRead: true,
    readAt: now(),
  });
  return mapDoc(await docRef.get());
};

const markAllMessagesAsRead = async (sessionId, userId) => {
  const snapshot = await getMessagesCollection(sessionId)
    .where('senderId', '!=', userId)
    .where('isRead', '==', false)
    .get();

  const batch = admin.firestore().batch();
  snapshot.docs.forEach((doc) => {
    batch.update(doc.ref, {
      isRead: true,
      readAt: now(),
    });
  });
  await batch.commit();
  return Promise.all(snapshot.docs.map((doc) => doc.ref.get().then(mapDoc)));
};

const updateTypingStatus = async (sessionId, userId, isTyping) => {
  const docRef = getChatSessionsCollection().doc(sessionId);
  await docRef.update({
    [`isTyping.${userId}`]: isTyping,
    updatedAt: now(),
  });
  return getChatSession(sessionId);
};

const getUnreadCount = async (userId) => {
  const sessions = await getUserChatSessions(userId);
  const counts = await Promise.all(
    sessions.map(async (session) => {
      const snapshot = await getMessagesCollection(session.id)
        .where('senderId', '!=', userId)
        .where('isRead', '==', false)
        .get();
      return snapshot.size;
    })
  );
  return counts.reduce((sum, count) => sum + count, 0);
};

const searchMessages = async (sessionId, searchText) => {
  const snapshot = await getMessagesCollection(sessionId).orderBy('timestamp', 'desc').get();
  const normalizedSearch = searchText.toLowerCase();
  return snapshot.docs
    .map(mapDoc)
    .filter(
      (message) =>
        (message.content || '').toLowerCase().includes(normalizedSearch) ||
        (message.fileName || '').toLowerCase().includes(normalizedSearch)
    );
};

const deleteMessage = async (sessionId, messageId) => {
  const docRef = getMessagesCollection(sessionId).doc(messageId);
  await docRef.update({
    content: '[Message deleted]',
    messageType: 'deleted',
    mediaUrl: null,
    fileName: null,
    fileSize: null,
  });
  return mapDoc(await docRef.get());
};

const closeChatSession = async (sessionId) => {
  const docRef = getChatSessionsCollection().doc(sessionId);
  await docRef.update({
    status: 'closed',
    updatedAt: now(),
  });
  return getChatSession(sessionId);
};

const getSessionStatistics = async (sessionId) => {
  const session = await getChatSession(sessionId);
  if (!session) {
    return null;
  }

  const snapshot = await getMessagesCollection(sessionId).get();
  const messages = snapshot.docs.map(mapDoc);
  const imageCount = messages.filter((message) => message.messageType === 'image').length;
  const fileCount = messages.filter((message) => message.messageType === 'file').length;
  return {
    totalMessages: messages.length,
    imageCount,
    fileCount,
    messagesByUser: {
      [session.participantOne.userId]: messages.filter(
        (message) => message.senderId === session.participantOne.userId
      ).length,
      [session.participantTwo.userId]: messages.filter(
        (message) => message.senderId === session.participantTwo.userId
      ).length,
    },
    duration:
      session.lastMessageTime && session.createdAt
        ? Math.floor(
            (new Date(session.lastMessageTime) - new Date(session.createdAt)) / 1000
          )
        : 0,
  };
};

module.exports = {
  createChatSession,
  getOrCreateChatSession,
  getChatSession,
  addMessage,
  getChatMessages,
  getUserChatSessions,
  markMessageAsRead,
  markAllMessagesAsRead,
  updateTypingStatus,
  getUnreadCount,
  searchMessages,
  deleteMessage,
  closeChatSession,
  getSessionStatistics,
};