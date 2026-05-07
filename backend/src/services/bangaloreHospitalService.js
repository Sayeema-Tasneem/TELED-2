/**
 * Bangalore Hospital Database Service
 * Provides pre-loaded, curated hospital data for Bangalore area
 * Used as fallback when external APIs are unavailable
 */

const hospitalsData = require('../data/hospitals-bangalore.json');

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
}

/**
 * Get nearby hospitals from pre-loaded database
 */
function getNearbyFromDatabase(latitude, longitude, radiusKm = 5, type = 'all') {
  console.log(`📦 Searching local database for ${type} within ${radiusKm}km`);

  const results = hospitalsData.hospitals
    .filter((hospital) => {
      // Filter by type
      if (type !== 'all' && hospital.type !== type) {
        return false;
      }

      // Calculate distance
      const distance = calculateDistance(
        latitude,
        longitude,
        hospital.latitude,
        hospital.longitude
      );

      // Filter by radius
      return distance <= radiusKm;
    })
    .map((hospital) => {
      // Add distance to result
      const distance = calculateDistance(
        latitude,
        longitude,
        hospital.latitude,
        hospital.longitude
      );
      return {
        ...hospital,
        distance: distance,
        source: 'BangaloreDatabase',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    })
    .sort((a, b) => a.distance - b.distance);

  console.log(
    `✅ Database returned ${results.length} ${type} facilities`
  );
  return results;
}

/**
 * Search hospitals by name
 */
function searchByName(query) {
  const lowerQuery = query.toLowerCase();
  return hospitalsData.hospitals
    .filter(
      (h) =>
        h.name.toLowerCase().includes(lowerQuery) ||
        h.address.toLowerCase().includes(lowerQuery) ||
        h.city.toLowerCase().includes(lowerQuery)
    )
    .map((h) => ({
      ...h,
      source: 'BangaloreDatabase',
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
}

/**
 * Get all hospitals in database
 */
function getAllHospitals() {
  return hospitalsData.hospitals.map((h) => ({
    ...h,
    source: 'BangaloreDatabase',
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
}

/**
 * Get hospitals by type
 */
function getByType(type) {
  return hospitalsData.hospitals
    .filter((h) => h.type === type)
    .map((h) => ({
      ...h,
      source: 'BangaloreDatabase',
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
}

/**
 * Get statistics about the database
 */
function getStats() {
  const types = {};
  hospitalsData.hospitals.forEach((h) => {
    types[h.type] = (types[h.type] || 0) + 1;
  });

  return {
    totalFacilities: hospitalsData.hospitals.length,
    byType: types,
    coverage: hospitalsData.coverage,
    lastUpdated: hospitalsData.lastUpdated,
  };
}

module.exports = {
  getNearbyFromDatabase,
  searchByName,
  getAllHospitals,
  getByType,
  getStats,
  calculateDistance,
};
