/**
 * Hospitals Controller
 * Handles all hospital/clinic/pharmacy related API endpoints
 */

const {
  calculateDistance,
  getNearbyHospitals,
  getHospitalById,
  getAllHospitals,
  getHospitalsByType,
  searchHospitals,
  getTopRatedHospitals,
  getHospitalsByCity,
  getEmergencyHospitals,
  getHospitalsWithAmbulance,
  addHospital,
  updateHospital,
  deleteHospital,
  getHospitalsByServices,
  getPharmacyCount,
  getClinicCount,
  getHospitalCount,
} = require('../models/hospitals');

const { fetchNearbyFromGoogleMaps } = require('../services/googleMapsService');
const { fetchNearbyHospitals, fetchNearbyFromNominatim } = require('../services/openStreetMapService');
const { getNearbyFromDatabase } = require('../services/bangaloreHospitalService');

const LIVE_API_TIMEOUT_MS = 5000;

const settleWithin = (promise, timeoutMs, source) =>
  Promise.race([
    promise
      .then((value) => ({ source, status: 'fulfilled', value }))
      .catch((reason) => ({ source, status: 'rejected', reason })),
    new Promise((resolve) =>
      setTimeout(
        () => resolve({ source, status: 'timeout', value: [] }),
        timeoutMs
      )
    ),
  ]);

/**
 * Get nearby hospitals/clinics/pharmacies
 * @query latitude, longitude, radius (km), type (hospital/clinic/pharmacy/all)
 */
exports.getNearby = async (req, res) => {
  try {
    const { latitude, longitude, radius = 5, type = 'all', source = 'google' } = req.query;

    console.log(`\n🏥 Nearby Request: lat=${latitude}, lon=${longitude}, radius=${radius}km, type=${type}`);

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required',
      });
    }

    const userLat = parseFloat(latitude);
    const userLon = parseFloat(longitude);
    const radiusKm = parseFloat(radius);

    if (isNaN(userLat) || isNaN(userLon) || isNaN(radiusKm)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinate values',
      });
    }

    const radiusMeters = radiusKm * 1000;
    let realFacilities = [];

    const normalizedSource = String(source || 'google').toLowerCase();

    // PRIMARY: Google Maps Places for best GPS-accurate nearby ranking
    if (normalizedSource === 'google' || normalizedSource === 'auto') {
      const googleMapsResult = await settleWithin(
        fetchNearbyFromGoogleMaps(userLat, userLon, radiusMeters, type),
        LIVE_API_TIMEOUT_MS + 2000,
        'googlemaps'
      );

      if (googleMapsResult.status === 'fulfilled' && Array.isArray(googleMapsResult.value) && googleMapsResult.value.length > 0) {
        realFacilities = googleMapsResult.value;
        console.log(`✅ Google Maps primary result: ${realFacilities.length} facilities`);
      } else if (googleMapsResult.status === 'timeout') {
        console.log(`⏱️  googlemaps timed out after ${LIVE_API_TIMEOUT_MS + 2000}ms`);
      } else if (googleMapsResult.status === 'rejected') {
        console.log(`⚠️  googlemaps failed: ${googleMapsResult.reason?.message || 'unknown error'}`);
      } else {
        console.log('ℹ️  googlemaps returned no facilities');
      }
    }

    // FALLBACK 1: OpenStreetMap live data if Google unavailable/empty
    if (realFacilities.length === 0) {
      const openStreetMapResult = await settleWithin(
        fetchNearbyHospitals(userLat, userLon, radiusMeters, type),
        LIVE_API_TIMEOUT_MS,
        'openstreetmap'
      );

      if (openStreetMapResult.status === 'fulfilled' && Array.isArray(openStreetMapResult.value) && openStreetMapResult.value.length > 0) {
        realFacilities = openStreetMapResult.value;
        console.log(`✅ OSM fallback result: ${realFacilities.length} facilities`);
      } else if (openStreetMapResult.status === 'timeout') {
        console.log(`⏱️  openstreetmap timed out after ${LIVE_API_TIMEOUT_MS}ms`);
      } else if (openStreetMapResult.status === 'rejected') {
        console.log(`⚠️  openstreetmap failed: ${openStreetMapResult.reason?.message || 'unknown error'}`);
      } else {
        console.log('ℹ️  openstreetmap returned no facilities');
      }
    }

    // FALLBACK 1B: Nominatim live data when Overpass is empty/unavailable
    if (realFacilities.length === 0) {
      const nominatimResult = await settleWithin(
        fetchNearbyFromNominatim(userLat, userLon, radiusMeters, type),
        LIVE_API_TIMEOUT_MS + 3000,
        'nominatim'
      );

      if (nominatimResult.status === 'fulfilled' && Array.isArray(nominatimResult.value) && nominatimResult.value.length > 0) {
        realFacilities = nominatimResult.value;
        console.log(`✅ Nominatim fallback result: ${realFacilities.length} facilities`);
      } else if (nominatimResult.status === 'timeout') {
        console.log(`⏱️  nominatim timed out after ${LIVE_API_TIMEOUT_MS + 3000}ms`);
      } else if (nominatimResult.status === 'rejected') {
        console.log(`⚠️  nominatim failed: ${nominatimResult.reason?.message || 'unknown error'}`);
      } else {
        console.log('ℹ️  nominatim returned no facilities');
      }
    }

    // FALLBACK 2: Curated Bangalore dataset
    if (realFacilities.length === 0) {
      console.log('📦 Falling back to Bangalore hospital database...');
      realFacilities = getNearbyFromDatabase(userLat, userLon, radiusKm, type);
    }

    // Remove duplicates
    const uniqueFacilities = [];
    const seen = new Set();
    
    for (const facility of realFacilities) {
      const lat = Number(facility.latitude);
      const lon = Number(facility.longitude);
      const key = `${facility.name}_${Math.round(lat * 10000)}_${Math.round(lon * 10000)}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueFacilities.push(facility);
      }
    }

    // Sort by distance
    const nearby = uniqueFacilities.sort((a, b) => 
      (a.distance || 0) - (b.distance || 0)
    );

    console.log(`✅ Final result: ${nearby.length} unique facilities (first 3: ${nearby.slice(0, 3).map(f => f.name).join(', ')})`);

    return res.status(200).json({
      success: true,
      count: nearby.length,
      message: `Found ${nearby.length} nearby facilities`,
      hospitals: nearby,
    });
  } catch (error) {
    console.error('Error getting nearby hospitals:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get nearby hospitals',
      error: error.message,
    });
  }
};

/**
 * Get hospital details by ID
 */
exports.getById = (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Hospital ID is required',
      });
    }

    const hospital = getHospitalById(id);

    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: 'Hospital not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Hospital details retrieved',
      hospital,
    });
  } catch (error) {
    console.error('Error getting hospital:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get hospital details',
      error: error.message,
    });
  }
};

/**
 * Search hospitals by name, city, or services
 * @query q (search query)
 */
exports.search = (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required',
      });
    }

    const results = searchHospitals(q.trim());

    return res.status(200).json({
      success: true,
      count: results.length,
      message: `Found ${results.length} matching facilities`,
      hospitals: results,
    });
  } catch (error) {
    console.error('Error searching hospitals:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to search hospitals',
      error: error.message,
    });
  }
};

/**
 * Get hospitals by type (hospital/clinic/pharmacy)
 * @param type - Type filter
 */
exports.getByType = (req, res) => {
  try {
    const { type } = req.params;
    const validTypes = ['hospital', 'clinic', 'pharmacy'];

    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid type. Must be hospital, clinic, or pharmacy',
      });
    }

    const facilities = getHospitalsByType(type);

    return res.status(200).json({
      success: true,
      count: facilities.length,
      message: `Found ${facilities.length} ${type}${facilities.length !== 1 ? 's' : ''}`,
      hospitals: facilities,
    });
  } catch (error) {
    console.error('Error getting hospitals by type:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get hospitals by type',
      error: error.message,
    });
  }
};

/**
 * Get top-rated hospitals/clinics/pharmacies
 * @query minRating (default: 4.0), limit (default: 10)
 */
exports.getTopRated = (req, res) => {
  try {
    const { minRating = 4.0, limit = 10 } = req.query;

    const topRated = getTopRatedHospitals(parseFloat(minRating), parseInt(limit));

    return res.status(200).json({
      success: true,
      count: topRated.length,
      message: `Found ${topRated.length} highly-rated facilities`,
      hospitals: topRated,
    });
  } catch (error) {
    console.error('Error getting top-rated hospitals:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get top-rated hospitals',
      error: error.message,
    });
  }
};

/**
 * Get emergency hospitals in area
 * @query latitude, longitude, radius (default: 10 km)
 */
exports.getEmergency = (req, res) => {
  try {
    const { latitude, longitude, radius = 10 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required',
      });
    }

    const userLat = parseFloat(latitude);
    const userLon = parseFloat(longitude);
    const radiusKm = parseFloat(radius);

    if (isNaN(userLat) || isNaN(userLon) || isNaN(radiusKm)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinate values',
      });
    }

    const emergency = getEmergencyHospitals(userLat, userLon, radiusKm);

    return res.status(200).json({
      success: true,
      count: emergency.length,
      message: `Found ${emergency.length} emergency facilities`,
      hospitals: emergency,
    });
  } catch (error) {
    console.error('Error getting emergency hospitals:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get emergency hospitals',
      error: error.message,
    });
  }
};

/**
 * Get hospitals with ambulance services
 * @query latitude, longitude, radius (default: 10 km)
 */
exports.getWithAmbulance = (req, res) => {
  try {
    const { latitude, longitude, radius = 10 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required',
      });
    }

    const userLat = parseFloat(latitude);
    const userLon = parseFloat(longitude);
    const radiusKm = parseFloat(radius);

    if (isNaN(userLat) || isNaN(userLon) || isNaN(radiusKm)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinate values',
      });
    }

    const withAmbulance = getHospitalsWithAmbulance(userLat, userLon, radiusKm);

    return res.status(200).json({
      success: true,
      count: withAmbulance.length,
      message: `Found ${withAmbulance.length} facilities with ambulance services`,
      hospitals: withAmbulance,
    });
  } catch (error) {
    console.error('Error getting hospitals with ambulance:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get hospitals with ambulance',
      error: error.message,
    });
  }
};

/**
 * Get hospitals by specific services
 * @query latitude, longitude, radius, services (comma-separated)
 */
exports.getByServices = (req, res) => {
  try {
    const { latitude, longitude, radius = 5, services } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required',
      });
    }

    if (!services) {
      return res.status(400).json({
        success: false,
        message: 'Services parameter is required (comma-separated)',
      });
    }

    const userLat = parseFloat(latitude);
    const userLon = parseFloat(longitude);
    const radiusKm = parseFloat(radius);
    const serviceList = services.split(',').map((s) => s.trim());

    if (isNaN(userLat) || isNaN(userLon) || isNaN(radiusKm)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinate values',
      });
    }

    const withServices = getHospitalsByServices(serviceList, userLat, userLon, radiusKm);

    return res.status(200).json({
      success: true,
      count: withServices.length,
      message: `Found ${withServices.length} facilities with requested services`,
      hospitals: withServices,
    });
  } catch (error) {
    console.error('Error getting hospitals by services:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get hospitals by services',
      error: error.message,
    });
  }
};

/**
 * Get hospitals by city
 */
exports.getByCity = (req, res) => {
  try {
    const { city } = req.params;

    if (!city) {
      return res.status(400).json({
        success: false,
        message: 'City name is required',
      });
    }

    const facilities = getHospitalsByCity(city);

    return res.status(200).json({
      success: true,
      count: facilities.length,
      message: `Found ${facilities.length} facilities in ${city}`,
      hospitals: facilities,
    });
  } catch (error) {
    console.error('Error getting hospitals by city:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get hospitals by city',
      error: error.message,
    });
  }
};

/**
 * Get area summary (hospital, clinic, pharmacy counts)
 * @query latitude, longitude, radius
 */
exports.getAreaSummary = (req, res) => {
  try {
    const { latitude, longitude, radius = 5 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required',
      });
    }

    const userLat = parseFloat(latitude);
    const userLon = parseFloat(longitude);
    const radiusKm = parseFloat(radius);

    if (isNaN(userLat) || isNaN(userLon) || isNaN(radiusKm)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinate values',
      });
    }

    const hospitalCount = getHospitalCount(userLat, userLon, radiusKm);
    const clinicCount = getClinicCount(userLat, userLon, radiusKm);
    const pharmacyCount = getPharmacyCount(userLat, userLon, radiusKm);

    return res.status(200).json({
      success: true,
      message: 'Area summary retrieved',
      summary: {
        hospitals: hospitalCount,
        clinics: clinicCount,
        pharmacies: pharmacyCount,
        total: hospitalCount + clinicCount + pharmacyCount,
        radius: radiusKm,
      },
    });
  } catch (error) {
    console.error('Error getting area summary:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get area summary',
      error: error.message,
    });
  }
};

/**
 * Get all hospitals (admin)
 */
exports.getAll = (req, res) => {
  try {
    const all = getAllHospitals();

    return res.status(200).json({
      success: true,
      count: all.length,
      message: `Retrieved all ${all.length} facilities`,
      hospitals: all,
    });
  } catch (error) {
    console.error('Error getting all hospitals:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get all hospitals',
      error: error.message,
    });
  }
};

/**
 * Add new hospital (admin)
 */
exports.add = (req, res) => {
  try {
    const { name, type, address, city, state, latitude, longitude, phone, email } = req.body;

    if (!name || !type || !latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Name, type, latitude, and longitude are required',
      });
    }

    const newHospital = addHospital(req.body);

    return res.status(201).json({
      success: true,
      message: 'Hospital added successfully',
      hospital: newHospital,
    });
  } catch (error) {
    console.error('Error adding hospital:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to add hospital',
      error: error.message,
    });
  }
};

/**
 * Update hospital (admin)
 */
exports.update = (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Hospital ID is required',
      });
    }

    const updated = updateHospital(id, req.body);

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Hospital not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Hospital updated successfully',
      hospital: updated,
    });
  } catch (error) {
    console.error('Error updating hospital:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update hospital',
      error: error.message,
    });
  }
};

/**
 * Delete hospital (admin)
 */
exports.delete = (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Hospital ID is required',
      });
    }

    const deleted = deleteHospital(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Hospital not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Hospital deleted successfully',
      hospital: deleted,
    });
  } catch (error) {
    console.error('Error deleting hospital:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete hospital',
      error: error.message,
    });
  }
};

/**
 * Calculate distance between user and hospital
 * @query latitude, longitude, hospitalId
 */
exports.getDistance = (req, res) => {
  try {
    const { latitude, longitude, hospitalId } = req.query;

    if (!latitude || !longitude || !hospitalId) {
      return res.status(400).json({
        success: false,
        message: 'Latitude, longitude, and hospital ID are required',
      });
    }

    const hospital = getHospitalById(hospitalId);

    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: 'Hospital not found',
      });
    }

    const userLat = parseFloat(latitude);
    const userLon = parseFloat(longitude);

    if (isNaN(userLat) || isNaN(userLon)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinate values',
      });
    }

    const distance = calculateDistance(
      userLat,
      userLon,
      hospital.latitude,
      hospital.longitude
    );

    return res.status(200).json({
      success: true,
      message: 'Distance calculated',
      distance: {
        km: distance,
        hospitalName: hospital.name,
        estimatedTimeMinutes: Math.ceil(distance * 3), // Rough estimate: ~3 min per km
      },
    });
  } catch (error) {
    console.error('Error calculating distance:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to calculate distance',
      error: error.message,
    });
  }
};
