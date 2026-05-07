/**
 * Emergency Routes
 * Handles emergency help endpoints
 */

const express = require('express');
const EmergencySmsService = require('../services/emergencySmsService');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/emergency/notify-contact
 * Send emergency SMS to emergency contact
 * 
 * Body:
 * {
 *   phoneNumber: string (emergency contact phone),
 *   userName: string (optional),
 *   userPhone: string (optional),
 *   location: { latitude, longitude, accuracy } (optional)
 * }
 */
router.post('/notify-contact', async (req, res) => {
  try {
    const { phoneNumber, userName, userPhone, location, customMessage } = req.body;

    // Validate phone number
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Emergency contact phone number is required',
      });
    }

    // Get user info
    const userInfo = {
      name: userName || 'Anonymous Patient',
      phone: userPhone || 'Unknown',
    };

    // Format emergency message (allow explicit custom message from caller)
    const message = String(customMessage || '').trim() || EmergencySmsService.formatEmergencyMessage(userInfo, location);

    // Send SMS
    const result = await EmergencySmsService.sendEmergencySms(
      phoneNumber,
      message,
      {
        userId: req.user?.uid || 'anonymous',
        location,
      }
    );

    // Log emergency event
    console.log('🚨 EMERGENCY NOTIFICATION SENT:', {
      success: result.success,
      to: phoneNumber.replace(/\d(?=\d{4})/g, '*'), // Mask phone for logs
      timestamp: new Date().toISOString(),
      provider: result.provider,
    });

    // Return response
    res.json({
      success: result.success,
      message: result.success 
        ? 'Emergency contact notified successfully!' 
        : 'Failed to send notification',
      messageId: result.messageId,
      provider: result.provider,
      error: result.error,
    });

  } catch (error) {
    console.error('Emergency notification endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send emergency notification',
      details: error.message,
    });
  }
});

/**
 * POST /api/emergency/call-ambulance
 * Log that user is calling ambulance
 */
router.post('/call-ambulance', async (req, res) => {
  try {
    const { location, userName, userPhone } = req.body;

    console.log('🚑 AMBULANCE CALL INITIATED:', {
      user: userName || 'Unknown',
      phone: userPhone || 'Unknown',
      location: location ? `${location.latitude}, ${location.longitude}` : 'No location',
      timestamp: new Date().toISOString(),
      userAgent: req.headers['user-agent'],
    });

    // In production, you could:
    // - Send notification to emergency services
    // - Log to database
    // - Send alert SMS to multiple contacts
    // - Trigger location tracking

    res.json({
      success: true,
      message: 'Ambulance call logged. Stay safe!',
      ambulanceNumber: '108',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Ambulance call endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to log ambulance call',
    });
  }
});

/**
 * GET /api/emergency/sms-status/:messageId
 * Check SMS delivery status
 */
router.get('/sms-status/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;

    // In production, query your SMS provider API
    // For now, return a mock response
    res.json({
      messageId,
      status: 'sent', // or 'delivered', 'failed', 'pending'
      timestamp: new Date().toISOString(),
      // deliveredAt: '2024-04-15T...'
    });

  } catch (error) {
    console.error('SMS status endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check SMS status',
    });
  }
});

module.exports = router;
