 /**
 * Call Model - Call session management
 * Handles video/audio call tracking and history
 */

let calls = {
  // Call ID -> Call object mapping
};

let callHistory = [
  // Historical call records
];

// Generate unique call ID
const generateCallId = () => {
  return `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

module.exports = {
  // Initialize a new call session
  initializeCall: (callData) => {
    const callId = generateCallId();
    const newCall = {
      id: callId,
      callType: callData.callType, // 'audio' or 'video'
      initiatorUserId: callData.initiatorUserId,
      initiatorName: callData.initiatorName,
      recipientUserId: callData.recipientUserId,
      recipientName: callData.recipientName,
      appointmentId: callData.appointmentId,
      startTime: new Date().toISOString(),
      endTime: null,
      duration: null,
      status: 'initiated', // initiated, connecting, active, ended, failed
      agoraChannel: callId,
      agoraToken: null,
      initiatorQuality: 'good',
      recipientQuality: 'good',
      networkCondition: 'good', // good, fair, poor
      callQualityMetrics: {
        videoBitrate: [],
        audioBitrate: [],
        jitter: [],
        packetLoss: [],
        roundTripTime: [],
      },
      disconnectReason: null,
      notes: '',
    };
    
    calls[callId] = newCall;
    return newCall;
  },

  // Get active call by ID
  getCallById: (callId) => {
    return calls[callId] || null;
  },

  // Get active call between users
  getActiveCallBetweenUsers: (userId1, userId2) => {
    return Object.values(calls).find(
      (call) =>
        call.status === 'active' &&
        ((call.initiatorUserId === userId1 && call.recipientUserId === userId2) ||
          (call.initiatorUserId === userId2 && call.recipientUserId === userId1))
    );
  },

  // Update call status
  updateCallStatus: (callId, status, additionalData = {}) => {
    if (calls[callId]) {
      calls[callId].status = status;
      Object.assign(calls[callId], additionalData);
      return calls[callId];
    }
    return null;
  },

  // Update call quality metrics
  updateCallQuality: (callId, quality, metrics) => {
    if (calls[callId]) {
      calls[callId].initiatorQuality = quality.initiator || 'good';
      calls[callId].recipientQuality = quality.recipient || 'good';
      calls[callId].networkCondition = quality.network || 'good';
      
      if (metrics) {
        // Store last 10 metrics to track trends
        if (metrics.videoBitrate !== undefined) {
          calls[callId].callQualityMetrics.videoBitrate.push(metrics.videoBitrate);
          if (calls[callId].callQualityMetrics.videoBitrate.length > 10) {
            calls[callId].callQualityMetrics.videoBitrate.shift();
          }
        }
        if (metrics.audioBitrate !== undefined) {
          calls[callId].callQualityMetrics.audioBitrate.push(metrics.audioBitrate);
          if (calls[callId].callQualityMetrics.audioBitrate.length > 10) {
            calls[callId].callQualityMetrics.audioBitrate.shift();
          }
        }
        if (metrics.jitter !== undefined) {
          calls[callId].callQualityMetrics.jitter.push(metrics.jitter);
          if (calls[callId].callQualityMetrics.jitter.length > 10) {
            calls[callId].callQualityMetrics.jitter.shift();
          }
        }
        if (metrics.packetLoss !== undefined) {
          calls[callId].callQualityMetrics.packetLoss.push(metrics.packetLoss);
          if (calls[callId].callQualityMetrics.packetLoss.length > 10) {
            calls[callId].callQualityMetrics.packetLoss.shift();
          }
        }
        if (metrics.roundTripTime !== undefined) {
          calls[callId].callQualityMetrics.roundTripTime.push(metrics.roundTripTime);
          if (calls[callId].callQualityMetrics.roundTripTime.length > 10) {
            calls[callId].callQualityMetrics.roundTripTime.shift();
          }
        }
      }
      
      return calls[callId];
    }
    return null;
  },

  // End call and move to history
  endCall: (callId, reason = 'completed') => {
    if (calls[callId]) {
      const call = calls[callId];
      call.status = 'ended';
      call.endTime = new Date().toISOString();
      call.disconnectReason = reason;
      
      // Calculate duration
      const startTime = new Date(call.startTime);
      const endTime = new Date(call.endTime);
      call.duration = Math.floor((endTime - startTime) / 1000); // in seconds
      
      // Move to history
      callHistory.push({
        ...call,
        archivedAt: new Date().toISOString(),
      });
      
      // Remove from active calls
      delete calls[callId];
      
      return call;
    }
    return null;
  },

  // Get call history for user
  getCallHistoryForUser: (userId) => {
    return callHistory.filter(
      (call) =>
        call.initiatorUserId === userId || call.recipientUserId === userId
    );
  },

  // Get call history for appointment
  getCallHistoryForAppointment: (appointmentId) => {
    return callHistory.filter((call) => call.appointmentId === appointmentId);
  },

  // Get all active calls
  getAllActiveCalls: () => {
    return Object.values(calls).filter((call) => call.status === 'active');
  },

  // Clear all call data (for testing)
  clearAllCalls: () => {
    calls = {};
    callHistory = [];
  },

  // Get call statistics
  getCallStatistics: (userId) => {
    const userCalls = callHistory.filter(
      (call) =>
        call.initiatorUserId === userId || call.recipientUserId === userId
    );
    
    const totalCalls = userCalls.length;
    const completedCalls = userCalls.filter((c) => c.status === 'ended').length;
    const failedCalls = userCalls.filter((c) => c.status === 'failed').length;
    const totalDuration = userCalls.reduce((sum, c) => sum + (c.duration || 0), 0);
    const averageDuration = totalCalls > 0 ? Math.floor(totalDuration / completedCalls) : 0;
    
    const videoCallCount = userCalls.filter((c) => c.callType === 'video').length;
    const audioCallCount = userCalls.filter((c) => c.callType === 'audio').length;
    
    return {
      totalCalls,
      completedCalls,
      failedCalls,
      totalDuration, // in seconds
      averageDuration, // in seconds
      videoCallCount,
      audioCallCount,
      successRate: totalCalls > 0 ? Math.round((completedCalls / totalCalls) * 100) : 0,
    };
  },
};
