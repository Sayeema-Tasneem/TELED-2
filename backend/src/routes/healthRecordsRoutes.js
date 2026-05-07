/**
 * Health Records Routes - API endpoints for health records management
 */

const express = require('express');
const router = express.Router();
const healthRecordsController = require('../controllers/healthRecordsController');

// Prescription routes
router.post('/prescriptions', healthRecordsController.addPrescription);
router.get('/prescriptions/:prescriptionId', healthRecordsController.getPrescription);
router.put('/prescriptions/:prescriptionId', healthRecordsController.updatePrescription);
router.delete('/prescriptions/:prescriptionId', healthRecordsController.deletePrescription);

// Consultation routes
router.post('/consultations', healthRecordsController.addConsultation);
router.get('/consultations/:consultationId', healthRecordsController.getConsultation);
router.put('/consultations/:consultationId', healthRecordsController.updateConsultation);
router.delete('/consultations/:consultationId', healthRecordsController.deleteConsultation);

// User-specific routes
router.get('/user/:userId/prescriptions', healthRecordsController.getUserPrescriptions);
router.get('/user/:userId/prescriptions/active', healthRecordsController.getActivePrescriptions);
router.get('/user/:userId/consultations', healthRecordsController.getUserConsultations);
router.get('/user/:userId/consultations/recent', healthRecordsController.getRecentConsultations);

// Health timeline routes
router.get('/user/:userId/timeline', healthRecordsController.getHealthTimeline);
router.get('/user/:userId/timeline/:type', healthRecordsController.getHealthTimelineByType);

// Summary and search
router.get('/user/:userId/summary', healthRecordsController.getHealthRecordsSummary);
router.get('/user/:userId/search', healthRecordsController.searchHealthRecords);

module.exports = router;
