/**
 * Call Controller - Handle call-related API requests
 * Manages call initialization, status updates, quality metrics
 */

const callModel = require('../models/calls');

// Agora SDK would be initialized here
// For now, we'll generate tokens serverside
const generateAgoraToken = (channelId, uid, role = 'publisher') => {
  // In production, use agora-token-builder to generate real tokens
  // This is a mock token for demo purposes
  return `mock_token_${channelId}_${uid}_${Date.now()}`;
};

module.exports = {
  /**
   * POST /api/calls/initiate
   * Initiate a new call (video or audio)
   */
  initiateCall: (req, res) => {
    try {
      const {
        callType, // 'audio' or 'video'
        initiatorUserId,
        initiatorName,
        recipientUserId,
        recipientName,
        appointmentId,
      } = req.body;

      // Validation
      if (!callType || !initiatorUserId || !recipientUserId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields',
        });
      }

      if (!['audio', 'video'].includes(callType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid call type',
        });
      }

      // Check for existing active call
      const existingCall = callModel.getActiveCallBetweenUsers(initiatorUserId, recipientUserId);
      if (existingCall) {
        return res.status(409).json({
          success: false,
          message: 'Active call already exists between these users',
          existingCall,
        });
      }

      // Create new call
      const call = callModel.initializeCall({
        callType,
        initiatorUserId,
        initiatorName,
        recipientUserId,
        recipientName,
        appointmentId,
      });

      // Generate Agora token
      const agoraToken = generateAgoraToken(
        call.agoraChannel,
        initiatorUserId,
        'publisher'
      );
      call.agoraToken = agoraToken;

      return res.status(201).json({
        success: true,
        message: 'Call initiated successfully',
        call,
        agoraToken,
        agoraAppId: process.env.AGORA_APP_ID || 'mock_app_id',
      });
    } catch (error) {
      console.error('Error initiating call:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to initiate call',
        error: error.message,
      });
    }
  },

  /**
   * GET /api/calls/:callId
   * Get call details
   */
  getCall: (req, res) => {
    try {
      const { callId } = req.params;

      const call = callModel.getCallById(callId);
      if (!call) {
        return res.status(404).json({
          success: false,
          message: 'Call not found',
        });
      }

      return res.status(200).json({
        success: true,
        call,
      });
    } catch (error) {
      console.error('Error getting call:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get call',
        error: error.message,
      });
    }
  },

  /**
   * PUT /api/calls/:callId/status
   * Update call status
   */
  updateCallStatus: (req, res) => {
    try {
      const { callId } = req.params;
      const { status } = req.body;

      if (!['initiated', 'connecting', 'active', 'ended', 'failed'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status',
        });
      }

      const updatedCall = callModel.updateCallStatus(callId, status);
      if (!updatedCall) {
        return res.status(404).json({
          success: false,
          message: 'Call not found',
        });
      }

      return res.status(200).json({
        success: true,
        message: `Call status updated to ${status}`,
        call: updatedCall,
      });
    } catch (error) {
      console.error('Error updating call status:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update call status',
        error: error.message,
      });
    }
  },

  /**
   * POST /api/calls/:callId/quality
   * Update call quality metrics
   */
  updateCallQuality: (req, res) => {
    try {
      const { callId } = req.params;
      const { quality, metrics } = req.body;

      if (!quality) {
        return res.status(400).json({
          success: false,
          message: 'Quality data is required',
        });
      }

      const updatedCall = callModel.updateCallQuality(callId, quality, metrics);
      if (!updatedCall) {
        return res.status(404).json({
          success: false,
          message: 'Call not found',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Call quality updated',
        call: updatedCall,
      });
    } catch (error) {
      console.error('Error updating call quality:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update call quality',
        error: error.message,
      });
    }
  },

  /**
   * POST /api/calls/:callId/end
   * End a call
   */
  endCall: (req, res) => {
    try {
      const { callId } = req.params;
      const { reason } = req.body;

      const endedCall = callModel.endCall(callId, reason || 'user_ended');
      if (!endedCall) {
        return res.status(404).json({
          success: false,
          message: 'Call not found',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Call ended successfully',
        call: endedCall,
      });
    } catch (error) {
      console.error('Error ending call:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to end call',
        error: error.message,
      });
    }
  },

  /**
   * GET /api/calls/user/:userId/history
   * Get call history for a user
   */
  getUserCallHistory: (req, res) => {
    try {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit) || 20;

      const history = callModel.getCallHistoryForUser(userId);
      const paginatedHistory = history.slice(-limit).reverse();

      return res.status(200).json({
        success: true,
        totalCalls: history.length,
        calls: paginatedHistory,
      });
    } catch (error) {
      console.error('Error getting call history:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get call history',
        error: error.message,
      });
    }
  },

  /**
   * GET /api/calls/appointment/:appointmentId/history
   * Get call history for an appointment
   */
  getAppointmentCallHistory: (req, res) => {
    try {
      const { appointmentId } = req.params;

      const history = callModel.getCallHistoryForAppointment(appointmentId);

      return res.status(200).json({
        success: true,
        totalCalls: history.length,
        calls: history,
      });
    } catch (error) {
      console.error('Error getting appointment call history:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get call history',
        error: error.message,
      });
    }
  },

  /**
   * GET /api/calls/user/:userId/statistics
   * Get call statistics for a user
   */
  getUserCallStatistics: (req, res) => {
    try {
      const { userId } = req.params;

      const stats = callModel.getCallStatistics(userId);

      return res.status(200).json({
        success: true,
        statistics: stats,
      });
    } catch (error) {
      console.error('Error getting call statistics:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get call statistics',
        error: error.message,
      });
    }
  },

  /**
   * GET /api/calls/active
   * Get all active calls (admin)
   */
  getActiveCalls: (req, res) => {
    try {
      const activeCalls = callModel.getAllActiveCalls();

      return res.status(200).json({
        success: true,
        activeCalls,
        count: activeCalls.length,
      });
    } catch (error) {
      console.error('Error getting active calls:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get active calls',
        error: error.message,
      });
    }
  },

  /**
   * GET /api/calls/token
   * Get Agora token for recipient
   */
  getAgoraToken: (req, res) => {
    try {
      const { channelId, uid } = req.query;

      if (!channelId || !uid) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameters: channelId, uid',
        });
      }

      const token = generateAgoraToken(channelId, parseInt(uid), 'publisher');

      return res.status(200).json({
        success: true,
        token,
        appId: process.env.AGORA_APP_ID || 'mock_app_id',
      });
    } catch (error) {
      console.error('Error generating Agora token:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to generate token',
        error: error.message,
      });
    }
  },
};
