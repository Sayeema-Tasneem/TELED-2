/**
 * Google Maps Service
 * Fetches real hospital, clinic, and pharmacy data using Google Places API
 */

const getGoogleMapsApiKey = () => {
  const preferred = String(process.env.GOOGLE_MAPS_API_KEY || '').trim();
  const expoStyle = String(process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '').trim();
  const candidate = preferred || expoStyle;

  if (!candidate) {
    return '';
  }

  const normalized = candidate.toLowerCase();
  const looksLikePlaceholder =
    normalized.includes('your_google_maps_api_key') ||
    normalized === 'your-google-maps-api-key' ||
    normalized === 'replace-with-google-maps-key';

  return looksLikePlaceholder ? '' : candidate;
};

const GOOGLE_MAPS_API_KEY = getGoogleMapsApiKey();
const PLACES_API_URL = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';

const SEARCH_PLAN = {
  hospital: [{ placeType: 'hospital', keyword: 'hospital' }],
  clinic: [{ placeType: 'doctor', keyword: 'clinic' }],
  pharmacy: [{ placeType: 'pharmacy', keyword: 'pharmacy' }],
  all: [
    { placeType: 'hospital', keyword: 'hospital' },
    { placeType: 'doctor', keyword: 'clinic' },
    { placeType: 'pharmacy', keyword: 'pharmacy' },
  ],
};

/**
 * Fetch hospitals/clinics/pharmacies from Google Maps Places API
 * @param {number} latitude - User latitude
 * @param {number} longitude - User longitude
 * @param {number} radiusMeters - Search radius in meters (default: 5000m = 5km)
 * @param {string} type - Type: hospital, clinic, pharmacy, or all
 * @returns {Promise<Array>} Facilities with real data from Google Maps
 */
async function fetchNearbyFromGoogleMaps(latitude, longitude, radiusMeters = 5000, type = 'all') {
  try {
    if (!GOOGLE_MAPS_API_KEY) {
      throw new Error('GOOGLE_MAPS_API_KEY is not configured');
    }

    const facilities = [];

    const plan = SEARCH_PLAN[type] || SEARCH_PLAN.hospital;
    const radiusKm = Math.max(0.5, Number(radiusMeters || 5000) / 1000);

    // Fetch results for each type
    for (const { placeType, keyword } of plan) {
      try {
        const results = await searchGooglePlaces(latitude, longitude, placeType, keyword);
        facilities.push(...results);
      } catch (error) {
        console.error(`Error searching for ${placeType}/${keyword}:`, error);
      }
    }

    // Remove duplicates by name and location
    const unique = [];
    const seen = new Set();

    for (const facility of facilities) {
      const key = `${facility.name}_${facility.latitude.toFixed(4)}_${facility.longitude.toFixed(4)}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(facility);
      }
    }

    // Filter within requested radius and sort by GPS distance
    return unique
      .filter((item) => Number(item?.distance || 0) <= radiusKm + 0.2)
      .sort((a, b) => (a.distance || 0) - (b.distance || 0));
  } catch (error) {
    console.error('Error fetching from Google Maps:', error);
    return [];
  }
}

/**
 * Search Google Places API
 */
async function searchGooglePlaces(latitude, longitude, placeType, keyword) {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('GOOGLE_MAPS_API_KEY is missing');
  }

  const url = new URL(PLACES_API_URL);
  url.searchParams.append('location', `${latitude},${longitude}`);
  url.searchParams.append('rankby', 'distance');
  url.searchParams.append('type', placeType);
  if (keyword) {
    url.searchParams.append('keyword', keyword);
  }
  url.searchParams.append('key', GOOGLE_MAPS_API_KEY);

  try {
    console.log(`🔍 Searching Google Places for: type=${placeType}, keyword=${keyword || '-'}`);
    
    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Google Maps request timeout')), 10000)
    );

    const response = await Promise.race([
      fetch(url.toString(), { method: 'GET' }),
      timeoutPromise,
    ]);

    if (!response.ok) {
      console.error(`❌ Google Maps API error: ${response.status} - ${response.statusText}`);
      throw new Error(`Google Maps API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.status === 'REQUEST_DENIED') {
      console.error('❌ Google Maps API Key Invalid or Quotas Exceeded');
      console.warn('⚠️  Google Maps is disabled. Using OpenStreetMap instead.');
      throw new Error('Google Maps: Invalid API key or quota exceeded');
    }

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error(`❌ Google Maps API status: ${data.status}`);
      return [];
    }

    if (!data.results || data.results.length === 0) {
      console.log(`⚠️  No results found for: ${keyword}`);
      return [];
    }

    console.log(`✅ Found ${data.results.length} results for: ${placeType}`);

    // Convert Google Places results to our format
    return data.results.map((place) => toFacilityData(place, latitude, longitude)).filter((f) => f !== null);
  } catch (error) {
    console.error(`❌ Google Places API fetch error for ${placeType}:`, error.message);
    return [];
  }
}

/**
 * Convert Google Places API result to facility data format
 */
function toFacilityData(place, userLat, userLon) {
  try {
    const lat = place.geometry?.location?.lat;
    const lon = place.geometry?.location?.lng;

    if (!lat || !lon || typeof lat !== 'number' || typeof lon !== 'number') {
      return null;
    }

    const distance = calculateDistance(userLat, userLon, lat, lon);

    // Determine facility type
    let facilityType = 'hospital';
    const types = place.types || [];
    if (types.includes('pharmacy') || place.name.toLowerCase().includes('pharmacy')) {
      facilityType = 'pharmacy';
    } else if (
      types.includes('primary_care') ||
      types.includes('doctor') ||
      place.name.toLowerCase().includes('clinic') ||
      place.name.toLowerCase().includes('doctor')
    ) {
      facilityType = 'clinic';
    }

    return {
      id: place.place_id || place.name,
      name: place.name || 'Unknown Facility',
      type: facilityType,
      address: place.vicinity || place.formatted_address || 'Address not available',
      latitude: lat,
      longitude: lon,
      distance: distance,
      rating: place.rating || null,
      phone: place.formatted_phone_number || null,
      website: place.website || null,
      isOpen: place.opening_hours?.open_now || null,
      operatingHours: place.opening_hours?.weekday_text || [],
      services: extractServicesFromTypes(place.types),
      emergencyAvailable: place.name.toLowerCase().includes('emergency') || place.types?.includes('emergency_room') || place.types?.includes('hospital'),
      ambulanceAvailable: false,
      photoUrl: place.photos?.[0]?.photo_reference || null,
      source: 'google_maps_places',
    };
  } catch (error) {
    console.error('Error converting Google Places result:', error);
    return null;
  }
}

/**
 * Extract services from Google Places types
 */
function extractServicesFromTypes(types = []) {
  const typeToService = {
    'emergency_room': 'Emergency Services',
    'hospital': 'Hospital Services',
    'clinic': 'Clinic Services',
    'pharmacy': 'Pharmacy Services',
    'doctor': 'Doctor Consultation',
    'dentist': 'Dental Services',
    'physiotherapist': 'Physiotherapy',
    'lab': 'Laboratory Tests',
    'imaging': 'Medical Imaging',
  };

  const services = new Set();
  
  types.forEach((type) => {
    if (typeToService[type]) {
      services.add(typeToService[type]);
    }
  });

  // Add default services based on type
  if (types.includes('hospital') || types.includes('health')) {
    services.add('General Healthcare');
    services.add('Emergency Services');
  }

  return Array.from(services).slice(0, 5); // Return max 5 services
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

module.exports = {
  fetchNearbyFromGoogleMaps,
  searchGooglePlaces,
};
