const { admin, now, mapDoc, getCollection } = require('./firestoreHelpers');

const ACTIVE_COLLECTION = 'calls';
const HISTORY_COLLECTION = 'callHistory';

const getCallsCollection = () => getCollection(ACTIVE_COLLECTION);
const getCallHistoryCollection = () => getCollection(HISTORY_COLLECTION);

const initializeCall = async (callData) => {
  const docRef = getCallsCollection().doc();
  const payload = {
    callType: callData.callType,
    initiatorUserId: callData.initiatorUserId,
    initiatorName: callData.initiatorName,
    recipientUserId: callData.recipientUserId,
    recipientName: callData.recipientName,
    appointmentId: callData.appointmentId || null,
    startTime: now(),
    endTime: null,
    duration: null,
    status: 'initiated',
    agoraChannel: docRef.id,
    agoraToken: null,
    initiatorQuality: 'good',
    recipientQuality: 'good',
    networkCondition: 'good',
    callQualityMetrics: {
      videoBitrate: [],
      audioBitrate: [],
      jitter: [],
      packetLoss: [],
      roundTripTime: [],
    },
    disconnectReason: null,
    notes: '',
    createdAt: now(),
    updatedAt: now(),
  };

  await docRef.set(payload);
  return mapDoc(await docRef.get());
};

const getCallById = async (callId) => {
  const doc = await getCallsCollection().doc(callId).get();
  return doc.exists ? mapDoc(doc) : null;
};

const getActiveCallBetweenUsers = async (userId1, userId2) => {
  const snapshot = await getCallsCollection()
    .where('status', '==', 'active')
    .where('initiatorUserId', 'in', [userId1, userId2])
    .get();

  return (
    snapshot.docs
      .map(mapDoc)
      .find(
        (call) =>
          (call.initiatorUserId === userId1 && call.recipientUserId === userId2) ||
          (call.initiatorUserId === userId2 && call.recipientUserId === userId1)
      ) || null
  );
};

const updateCallStatus = async (callId, status, additionalData = {}) => {
  const docRef = getCallsCollection().doc(callId);
  await docRef.update({
    status,
    ...additionalData,
    updatedAt: now(),
  });
  return getCallById(callId);
};

const updateCallQuality = async (callId, quality = {}, metrics = {}) => {
  const docRef = getCallsCollection().doc(callId);
  const doc = await docRef.get();
  if (!doc.exists) {
    return null;
  }

  const current = doc.data();
  const mergeMetricArray = (existing = [], nextValue) => {
    if (nextValue === undefined) {
      return existing;
    }
    const updated = [...existing, nextValue];
    return updated.slice(-10);
  };

  await docRef.update({
    initiatorQuality: quality.initiator || current.initiatorQuality,
    recipientQuality: quality.recipient || current.recipientQuality,
    networkCondition: quality.network || current.networkCondition,
    callQualityMetrics: {
      videoBitrate: mergeMetricArray(current.callQualityMetrics?.videoBitrate, metrics.videoBitrate),
      audioBitrate: mergeMetricArray(current.callQualityMetrics?.audioBitrate, metrics.audioBitrate),
      jitter: mergeMetricArray(current.callQualityMetrics?.jitter, metrics.jitter),
      packetLoss: mergeMetricArray(current.callQualityMetrics?.packetLoss, metrics.packetLoss),
      roundTripTime: mergeMetricArray(
        current.callQualityMetrics?.roundTripTime,
        metrics.roundTripTime
      ),
    },
    updatedAt: now(),
  });

  return getCallById(callId);
};

const endCall = async (callId, reason = 'completed') => {
  const activeRef = getCallsCollection().doc(callId);
  const historyRef = getCallHistoryCollection().doc(callId);

  await admin.firestore().runTransaction(async (transaction) => {
    const activeDoc = await transaction.get(activeRef);
    if (!activeDoc.exists) {
      throw new Error('Call not found');
    }

    const data = activeDoc.data();
    const startTime = data.startTime?.toDate ? data.startTime.toDate() : new Date(data.startTime);
    const endTime = new Date();
    const duration = Math.floor((endTime - startTime) / 1000);

    const archived = {
      ...data,
      endTime,
      duration,
      status: 'ended',
      disconnectReason: reason,
      archivedAt: now(),
      updatedAt: now(),
    };

    transaction.set(historyRef, archived);
    transaction.delete(activeRef);
  });

  const historyDoc = await historyRef.get();
  return historyDoc.exists ? mapDoc(historyDoc) : null;
};

const getCallHistoryForUser = async (userId) => {
  const [initiatedSnapshot, receivedSnapshot] = await Promise.all([
    getCallHistoryCollection().where('initiatorUserId', '==', userId).get(),
    getCallHistoryCollection().where('recipientUserId', '==', userId).get(),
  ]);

  const merged = new Map();
  [...initiatedSnapshot.docs, ...receivedSnapshot.docs].forEach((doc) => {
    merged.set(doc.id, mapDoc(doc));
  });

  return Array.from(merged.values()).sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
};

const getCallHistoryForAppointment = async (appointmentId) => {
  const snapshot = await getCallHistoryCollection()
    .where('appointmentId', '==', appointmentId)
    .orderBy('startTime', 'desc')
    .get();
  return snapshot.docs.map(mapDoc);
};

const getAllActiveCalls = async () => {
  const snapshot = await getCallsCollection().where('status', '==', 'active').get();
  return snapshot.docs.map(mapDoc);
};

const getCallStatistics = async (userId) => {
  const calls = await getCallHistoryForUser(userId);
  const totalCalls = calls.length;
  const completedCalls = calls.filter((call) => call.status === 'ended').length;
  const failedCalls = calls.filter((call) => call.status === 'failed').length;
  const totalDuration = calls.reduce((sum, call) => sum + (call.duration || 0), 0);
  const videoCallCount = calls.filter((call) => call.callType === 'video').length;
  const audioCallCount = calls.filter((call) => call.callType === 'audio').length;

  return {
    totalCalls,
    completedCalls,
    failedCalls,
    totalDuration,
    averageDuration: completedCalls > 0 ? Math.floor(totalDuration / completedCalls) : 0,
    videoCallCount,
    audioCallCount,
    successRate: totalCalls > 0 ? Math.round((completedCalls / totalCalls) * 100) : 0,
  };
};

module.exports = {
  initializeCall,
  getCallById,
  getActiveCallBetweenUsers,
  updateCallStatus,
  updateCallQuality,
  endCall,
  getCallHistoryForUser,
  getCallHistoryForAppointment,
  getAllActiveCalls,
  getCallStatistics,
};