/**
 * OpenStreetMap Service
 * Fetches real hospital, clinic, and pharmacy data from Overpass API
 */

// Multiple Overpass API endpoints for redundancy
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',        // Primary (public server)
  'https://overpass.kumi.systems/api/interpreter',  // Fallback 1
  'https://z.overpass-api.de/api/interpreter',      // Fallback 2
];

let currentEndpointIndex = 0;

function getNextEndpoint() {
  const endpoint = OVERPASS_ENDPOINTS[currentEndpointIndex];
  currentEndpointIndex = (currentEndpointIndex + 1) % OVERPASS_ENDPOINTS.length;
  return endpoint;
}

/**
 * Fetch hospitals from OpenStreetMap Overpass API
 * @param {number} latitude - User latitude
 * @param {number} longitude - User longitude
 * @param {number} radiusMeters - Search radius in meters
 * @param {string} type - Type: hospital, clinic, pharmacy, or all
 * @returns {Promise<Array>} Hospitals with real data
 */
async function fetchNearbyHospitals(latitude, longitude, radiusMeters = 5000, type = 'all') {
  try {
    console.log(`🏥 Fetching ${type} facilities within ${radiusMeters}m of (${latitude}, ${longitude})`);
    
    const queries = getOverpassQueries(type, radiusMeters, latitude, longitude);
    const responseData = await executeOverpassQuery(queries);
    
    if (!responseData || !responseData.elements) {
      console.warn('⚠️  No response from Overpass API');
      return [];
    }

    console.log(`📊 Processing ${responseData.elements.length} elements from Overpass`);

    const hospitals = responseData.elements
      .map((element) => toHospitalData(element, latitude, longitude, type))
      .filter((h) => h !== null && h.latitude && h.longitude);

    console.log(`✅ Converted to ${hospitals.length} valid facilities`);

    // Sort by distance
    return hospitals.sort((a, b) => (a.distance || 0) - (b.distance || 0));
  } catch (error) {
    console.error('❌ Error fetching from Overpass API:', error.message);
    return [];
  }
}

/**
 * Fetch nearby facilities from Nominatim as a live fallback when Overpass is unavailable.
 */
async function fetchNearbyFromNominatim(latitude, longitude, radiusMeters = 5000, type = 'all') {
  try {
    const radiusKm = Math.max(1, Number(radiusMeters || 5000) / 1000);
    const latDelta = radiusKm / 111;
    const lonDelta = radiusKm / (111 * Math.max(0.2, Math.cos((latitude * Math.PI) / 180)));

    const left = longitude - lonDelta;
    const right = longitude + lonDelta;
    const top = latitude + latDelta;
    const bottom = latitude - latDelta;
    const viewbox = `${left},${top},${right},${bottom}`;

    const queryByType = {
      hospital: ['hospital', 'medical center'],
      clinic: ['clinic', 'doctor'],
      pharmacy: ['pharmacy', 'medical store', 'chemist'],
      all: ['hospital', 'clinic', 'doctor', 'pharmacy', 'medical store'],
    };

    const queries = queryByType[type] || queryByType.hospital;
    const rows = [];

    for (const query of queries) {
      const url =
        `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=25` +
        `&bounded=1&viewbox=${encodeURIComponent(viewbox)}&q=${encodeURIComponent(query)}`;

      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Nominatim timeout after 8s')), 8000)
        );

        const response = await Promise.race([
          fetch(url, {
            headers: {
              Accept: 'application/json',
              'User-Agent': 'Telemedicine-App/1.0 (https://github.com/telemedicine-app)',
            },
          }),
          timeoutPromise,
        ]);

        if (!response.ok) {
          continue;
        }

        const data = await response.json();
        if (Array.isArray(data)) {
          rows.push(...data);
        }
      } catch {
        // Try next query
      }
    }

    const mapType = (item = {}, fallbackType = 'hospital') => {
      const kind = String(item?.type || '').toLowerCase();
      const display = String(item?.display_name || '').toLowerCase();

      if (kind.includes('pharmacy') || display.includes('pharmacy') || display.includes('chemist')) {
        return 'pharmacy';
      }
      if (kind.includes('clinic') || kind.includes('doctor') || display.includes('clinic') || display.includes('doctor')) {
        return 'clinic';
      }
      if (kind.includes('hospital') || display.includes('hospital') || display.includes('medical center')) {
        return 'hospital';
      }
      return fallbackType === 'all' ? 'hospital' : fallbackType;
    };

    const mapped = rows
      .map((item, index) => {
        const lat = Number(item?.lat);
        const lon = Number(item?.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
          return null;
        }

        const facilityType = mapType(item, type);
        if (type !== 'all' && facilityType !== type) {
          return null;
        }

        return {
          id: `nom_${item?.osm_type || 'node'}_${item?.osm_id || index}`,
          name: item?.name || String(item?.display_name || '').split(',')[0] || `Nearby ${facilityType}`,
          type: facilityType,
          address: item?.display_name || 'Address not available',
          city: item?.address?.city || item?.address?.town || item?.address?.village || 'City',
          state: item?.address?.state || 'State',
          latitude: lat,
          longitude: lon,
          phone: null,
          email: null,
          website: null,
          rating: null,
          reviewCount: 0,
          services: ['General Healthcare'],
          operatingHours: null,
          emergencyAvailable: facilityType === 'hospital',
          ambulanceAvailable: false,
          acceptingNewPatients: true,
          imageUrl: null,
          distance: calculateDistance(latitude, longitude, lat, lon),
          createdAt: new Date(),
          updatedAt: new Date(),
          source: 'Nominatim',
        };
      })
      .filter(Boolean)
      .filter((item) => Number(item.distance || 0) <= radiusKm + 0.5)
      .sort((a, b) => (a.distance || 0) - (b.distance || 0));

    const deduped = [];
    const seen = new Set();
    mapped.forEach((item) => {
      const key = `${String(item.name || '').toLowerCase()}_${Number(item.latitude).toFixed(4)}_${Number(item.longitude).toFixed(4)}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(item);
      }
    });

    return deduped;
  } catch (error) {
    console.error('❌ Error fetching from Nominatim:', error.message);
    return [];
  }
}

/**
 * Build Overpass API query for different hospital types
 */
function getOverpassQueries(type, radiusMeters, latitude, longitude) {
  const around = `(around:${radiusMeters},${latitude},${longitude})`;

  const queries = [];

  if (type === 'hospital' || type === 'all') {
    queries.push(
      `[timeout:10];(node["amenity"="hospital"]${around};way["amenity"="hospital"]${around};relation["amenity"="hospital"]${around};node["healthcare"="hospital"]${around};way["healthcare"="hospital"]${around};relation["healthcare"="hospital"]${around};);out center;`
    );
  }

  if (type === 'clinic' || type === 'all') {
    queries.push(
      `[timeout:10];(node["amenity"="clinic"]${around};way["amenity"="clinic"]${around};relation["amenity"="clinic"]${around};node["healthcare"="clinic"]${around};way["healthcare"="clinic"]${around};relation["healthcare"="clinic"]${around};node["healthcare"="doctor"]${around};way["healthcare"="doctor"]${around};relation["healthcare"="doctor"]${around};);out center;`
    );
  }

  if (type === 'pharmacy' || type === 'all') {
    queries.push(
      `[timeout:10];(node["amenity"="pharmacy"]${around};way["amenity"="pharmacy"]${around};relation["amenity"="pharmacy"]${around};node["healthcare"="pharmacy"]${around};way["healthcare"="pharmacy"]${around};relation["healthcare"="pharmacy"]${around};);out center;`
    );
  }

  return queries;
}

/**
 * Execute Overpass API query with retry logic across multiple endpoints
 */
async function executeOverpassQuery(queries) {
  if (!queries || queries.length === 0) {
    return null;
  }

  console.log('📍 Querying Overpass API for hospitals/clinics/pharmacies...');

  const runSingleQueryAcrossEndpoints = async (query, label) => {
    for (let attempt = 0; attempt < OVERPASS_ENDPOINTS.length; attempt++) {
      const endpoint = getNextEndpoint();
      console.log(`⚡ [${label}] Attempt ${attempt + 1}/${OVERPASS_ENDPOINTS.length}: ${endpoint}`);

      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Overpass API timeout after 20s')),
            20000
          )
        );

        const response = await Promise.race([
          fetch(endpoint, {
            method: 'POST',
            body: `data=${encodeURIComponent(query)}`,
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'User-Agent': 'Telemedicine-App/1.0 (https://github.com/telemedicine-app)',
              Accept: 'application/json',
            },
          }),
          timeoutPromise,
        ]);

        if (!response.ok) {
          console.warn(`⚠️  [${label}] Endpoint returned HTTP ${response.status}, trying next...`);
          continue;
        }

        const responseText = await response.text();
        let data = null;

        try {
          data = JSON.parse(responseText);
        } catch {
          const shortPreview = String(responseText || '').slice(0, 160).replace(/\s+/g, ' ');
          console.warn(`⚠️  [${label}] Non-JSON Overpass response, trying next endpoint. Preview: ${shortPreview}`);
          continue;
        }

        console.log(`✅ [${label}] Overpass returned ${data.elements?.length || 0} facilities`);
        return data;
      } catch (error) {
        console.warn(`⚠️  [${label}] Endpoint failed: ${error.message}`);
      }
    }

    return null;
  };

  const mergedElements = [];
  for (let index = 0; index < queries.length; index++) {
    const label = `query-${index + 1}`;
    const result = await runSingleQueryAcrossEndpoints(queries[index], label);
    if (result?.elements?.length) {
      mergedElements.push(...result.elements);
    }
  }

  if (mergedElements.length === 0) {
    console.error('❌ All Overpass queries failed or returned no JSON data');
    return null;
  }

  const uniqueByElement = new Map();
  mergedElements.forEach((element) => {
    const key = `${element?.type || 'node'}_${element?.id || Math.random()}`;
    if (!uniqueByElement.has(key)) {
      uniqueByElement.set(key, element);
    }
  });

  return {
    elements: [...uniqueByElement.values()],
  };
}

/**
 * Convert OpenStreetMap element to hospital data format
 */
function toHospitalData(element, userLat, userLon, type = 'all') {
  try {
    const lat = Number(element?.lat ?? element?.center?.lat);
    const lon = Number(element?.lon ?? element?.center?.lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      console.warn(`⚠️  Invalid coordinates for element ${element.id}: lat=${lat}, lon=${lon}`);
      return null;
    }

    const tags = element.tags || {};
    const name = tags.name || `${tags.amenity || tags.healthcare} (${element.id})`;
    const healthcare = String(tags.healthcare || '').toLowerCase();
    const amenity = String(tags.amenity || '').toLowerCase();

    // Determine type
    let facilityType = 'hospital';
    if (amenity.includes('pharmacy') || healthcare.includes('pharmacy')) {
      facilityType = 'pharmacy';
    } else if (amenity.includes('clinic') || healthcare.includes('clinic') || healthcare.includes('doctor')) {
      facilityType = 'clinic';
    }

    // Filter by type
    if (type !== 'all' && facilityType !== type) {
      return null;
    }

    const address = getAddressFromTags(tags);
    const distance = calculateDistance(userLat, userLon, lat, lon);

    console.log(`  📍 ${name} (${facilityType}) - ${distance.toFixed(2)}m away`);

    return {
      id: `osm_${element.type}_${element.id}`,
      name: name,
      type: facilityType,
      address: address,
      city: tags['addr:city'] || tags['addr:town'] || tags['addr:village'] || 'City',
      state: tags['addr:state'] || 'State',
      latitude: lat,
      longitude: lon,
      phone: tags.phone || tags.contact_phone || null,
      email: tags.email || tags.contact_email || null,
      website: tags.website || tags.contact_website || tags.url || null,
      rating: null, // OSM doesn't have ratings, could integrate with another API
      reviewCount: 0,
      services: extractServices(tags),
      operatingHours: tags.opening_hours || '24/7',
      emergencyAvailable: amenity.includes('emergency') || healthcare.includes('emergency') || facilityType === 'hospital',
      ambulanceAvailable: facilityType === 'hospital',
      acceptingNewPatients: true,
      imageUrl: null,
      distance: distance,
      createdAt: new Date(),
      updatedAt: new Date(),
      source: 'OpenStreetMap',
    };
  } catch (error) {
    console.error(`❌ Error converting OSM element ${element.id}:`, error.message);
    return null;
  }
}

/**
 * Extract services from OpenStreetMap tags
 */
function extractServices(tags) {
  const services = [];
  const specialties = String(tags.healthcare || tags.speciality || tags.specialties || '').split(';');

  specialties.forEach((spec) => {
    const trimmed = spec.trim();
    if (trimmed) {
      services.push(trimmed.charAt(0).toUpperCase() + trimmed.slice(1));
    }
  });

  if (services.length === 0) {
    if (String(tags.amenity || '').includes('pharmacy')) {
      services.push('Pharmacy');
    } else if (String(tags.amenity || '').includes('clinic')) {
      services.push('General Practice');
    } else {
      services.push('General Healthcare');
    }
  }

  return services;
}

/**
 * Get address from OpenStreetMap tags
 */
function getAddressFromTags(tags) {
  const parts = [
    tags['addr:housenumber'],
    tags['addr:street'],
    tags['addr:suburb'],
    tags['addr:city'] || tags['addr:town'] || tags['addr:village'],
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(', ') : (tags.address || 'Address not available');
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(2));
}

module.exports = {
  fetchNearbyHospitals,
  fetchNearbyFromNominatim,
};
