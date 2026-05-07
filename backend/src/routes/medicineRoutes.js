/**
 * Medicine Routes - API endpoints for medicine management
 */

const express = require('express');
const router = express.Router();
const medicineController = require('../controllers/medicineController');

// Medicine management routes
router.post('/', medicineController.addMedicine);
router.get('/:medicineId', medicineController.getMedicine);
router.put('/:medicineId', medicineController.updateMedicine);
router.delete('/:medicineId', medicineController.deleteMedicine);

// User-specific routes
router.get('/user/:userId/all', medicineController.getUserMedicines);
router.get('/user/:userId/active', medicineController.getActiveMedicines);
router.get('/user/:userId/today', medicineController.getTodaysMedicines);
router.get('/user/:userId/statistics', medicineController.getMedicineStatistics);

// Intake tracking routes
router.post('/:medicineId/intake', medicineController.recordIntake);
router.get('/:medicineId/history', medicineController.getIntakeHistory);
router.put('/:medicineId/note', medicineController.addIntakeNote);

// Medicine status routes
router.put('/:medicineId/pause', medicineController.pauseMedicine);
router.put('/:medicineId/resume', medicineController.resumeMedicine);
router.put('/:medicineId/complete', medicineController.completeMedicine);

module.exports = router;
