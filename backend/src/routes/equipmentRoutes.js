/**
 * Medical Equipment Rotation Routes
 */

const express = require('express');
const router = express.Router();
const equipmentController = require('../controllers/equipmentController');

router.get('/nearby', equipmentController.getNearbyEquipment);
router.get('/summary/area', equipmentController.getEquipmentSummary);
router.get('/user/:userId/history', equipmentController.getUserHistory);
router.get('/:id/slots', equipmentController.getEquipmentSlots);
router.post('/:id/book', equipmentController.bookEquipment);
router.get('/:id', equipmentController.getEquipmentDetails);

module.exports = router;