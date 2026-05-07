/**
 * Call Routes - API endpoints for call management
 */

const express = require('express');
const router = express.Router();
const callController = require('../controllers/callController');

// Call initiation and management
router.post('/initiate', callController.initiateCall);
router.get('/:callId', callController.getCall);
router.put('/:callId/status', callController.updateCallStatus);
router.post('/:callId/quality', callController.updateCallQuality);
router.post('/:callId/end', callController.endCall);

// Call history and statistics
router.get('/user/:userId/history', callController.getUserCallHistory);
router.get('/appointment/:appointmentId/history', callController.getAppointmentCallHistory);
router.get('/user/:userId/statistics', callController.getUserCallStatistics);

// Agora token
router.get('/token/agora', callController.getAgoraToken);

// Admin endpoints
router.get('/admin/active', callController.getActiveCalls);

module.exports = router;
