/**
 * Hospitals Routes
 * All hospital/clinic/pharmacy endpoints
 */

const express = require('express');
const router = express.Router();
const hospitalsController = require('../controllers/hospitalsController');

// Get nearby hospitals/clinics/pharmacies based on location
router.get('/nearby', hospitalsController.getNearby);

// Search hospitals by name, city, or services
router.get('/search/query', hospitalsController.search);

// Get hospitals by type (hospital/clinic/pharmacy)
router.get('/type/:type', hospitalsController.getByType);

// Get top-rated hospitals
router.get('/ratings/top-rated', hospitalsController.getTopRated);

// Get hospital by city
router.get('/city/:city', hospitalsController.getByCity);

// Get emergency hospitals in area
router.get('/emergency/nearby', hospitalsController.getEmergency);

// Get hospitals with ambulance services
router.get('/ambulance/nearby', hospitalsController.getWithAmbulance);

// Get hospitals by services
router.get('/services/search', hospitalsController.getByServices);

// Get area summary (counts of each type)
router.get('/summary/area', hospitalsController.getAreaSummary);

// Calculate distance to hospital
router.get('/distance/calculate', hospitalsController.getDistance);

// Get all hospitals (admin)
router.get('/admin/all', hospitalsController.getAll);

// Get hospital by ID
router.get('/:id', hospitalsController.getById);

// Admin: Add new hospital
router.post('/', hospitalsController.add);

// Admin: Update hospital
router.put('/:id', hospitalsController.update);

// Admin: Delete hospital
router.delete('/:id', hospitalsController.delete);

module.exports = router;
