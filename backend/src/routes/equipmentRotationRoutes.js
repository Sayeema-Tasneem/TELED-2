/**
 * Equipment Rotation Routes (Phase-1)
 */

const express = require('express');
const router = express.Router();
const equipmentRotationController = require('../controllers/equipmentRotationController');
const { authenticate, requireRoles, requireSelfOrRoles } = require('../middleware/auth');

router.use(authenticate);

router.post('/donor/activate', requireRoles('patient', 'doctor', 'admin'), equipmentRotationController.activateDonor);
router.post('/listings', requireRoles('patient', 'doctor', 'admin'), equipmentRotationController.createListing);
router.get('/listings', requireRoles('patient', 'doctor', 'admin'), equipmentRotationController.getListings);
router.patch('/listings/:id/moderate', requireRoles('admin'), equipmentRotationController.moderateListing);

router.post('/requests', requireRoles('patient'), equipmentRotationController.createRequest);
router.get('/requests/doctor/:doctorUserId', requireSelfOrRoles('doctorUserId', ['admin']), equipmentRotationController.getDoctorQueue);
router.get('/requests/patient/:patientUserId', requireSelfOrRoles('patientUserId', ['admin']), equipmentRotationController.getPatientRequests);
router.patch('/requests/:id/doctor-decision', requireRoles('doctor', 'admin'), equipmentRotationController.doctorDecision);
router.patch('/requests/:id/pickup-confirm', requireRoles('patient', 'doctor', 'admin'), equipmentRotationController.confirmPickup);
router.patch('/requests/:id/mark-returned', requireRoles('patient', 'admin'), equipmentRotationController.markReturned);

router.post('/listings/:id/sanitization', requireRoles('patient', 'doctor', 'admin'), equipmentRotationController.addSanitizationLog);
router.get('/donor/:donorUserId/impact', requireSelfOrRoles('donorUserId', ['admin']), equipmentRotationController.getDonorImpact);
router.get('/admin/summary', requireRoles('admin'), equipmentRotationController.getAdminSummary);

module.exports = router;
