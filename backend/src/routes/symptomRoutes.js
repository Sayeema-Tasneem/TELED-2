/**
 * Symptom Routes - API endpoints for symptom checker
 */

const express = require('express');
const router = express.Router();
const symptomController = require('../controllers/symptomController');

router.get('/catalog', symptomController.getSymptomCatalog);
router.post('/analyze', symptomController.analyze);

module.exports = router;
