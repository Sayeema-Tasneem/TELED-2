/**
 * Hospitals Service - API wrapper for hospital endpoints
 * Handles all hospital/clinic/pharmacy API calls
 */

import Constants from 'expo-constants';

const normalizeBaseUrl = (url) => {
  if (!url) return null;
  return String(url).replace(/\/$/, '');
};

const getExpoHostBackendUrl = () => {
  const hostUri = Constants?.expoConfig?.hostUri || Constants?.manifest2?.extra?.expoClient?.hostUri;
  if (!hostUri) return null;

  const host = hostUri.split(':')[0];
  if (!host) return null;

  return `http://${host}:5000`;
};

const getBackendCandidates = () => {
  const configuredBackend = normalizeBaseUrl(process.env.EXPO_PUBLIC_BACKEND_URL);
  const candidates = [
    configuredBackend,
    normalizeBaseUrl(getExpoHostBackendUrl()),
    'http://10.0.2.2:5000',
    'http://localhost:5000',
  ].filter(Boolean);

  return [...new Set(candidates)];
};

const buildHospitalsUrl = (baseUrl, path) => `${baseUrl}/api/hospitals${path}`;

const fetchWithTimeout = async (url, options = {}, timeoutMs = 8000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      const hint = `Request to ${url} timed out after ${timeoutMs}ms. Backend may be slow or unreachable.`;
      console.warn(`[Hospitals] ⏱️  ${hint}`);
      const timeoutError = new Error(`Network timeout: ${hint}`);
      timeoutError.code = 'ETIMEDOUT';
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
};

const dedupeByIdentity = (items = []) => {
  const unique = new Map();
  items.forEach((item) => {
    const lat = Number(item?.latitude || 0).toFixed(4);
    const lon = Number(item?.longitude || 0).toFixed(4);
    const key = `${String(item?.name || '').toLowerCase()}_${lat}_${lon}`;
    if (!unique.has(key)) {
      unique.set(key, item);
    }
  });
  return [...unique.values()];
};

const shouldUseMockNearby = () =>
  String(process.env.EXPO_PUBLIC_ENABLE_MOCK_NEARBY || '').toLowerCase() === 'true';

const sortByDistance = (items = [], latitude, longitude) => {
  const baseLat = Number(latitude);
  const baseLon = Number(longitude);

  return items
    .map((item) => {
      const lat = Number(item?.latitude);
      const lon = Number(item?.longitude);
      const normalizedDistance =
        Number.isFinite(lat) && Number.isFinite(lon)
          ? calculateDistance(baseLat, baseLon, lat, lon)
          : Number(item?.distance || 0);

      return {
        ...item,
        latitude: Number.isFinite(lat) ? lat : item?.latitude,
        longitude: Number.isFinite(lon) ? lon : item?.longitude,
        distance: normalizedDistance,
      };
    })
    .sort((a, b) => Number(a.distance || 0) - Number(b.distance || 0));
};

const getLiveNearbyWithTimeout = async (
  latitude,
  longitude,
  radius,
  type,
  timeoutMs = 9000
) => {
  try {
    const timeoutPromise = new Promise((resolve) =>
      setTimeout(() => resolve([]), timeoutMs)
    );

    const liveResults = await Promise.race([
      getLiveNearbyWithExpansion(latitude, longitude, radius, type),
      timeoutPromise,
    ]);

    return Array.isArray(liveResults) ? liveResults : [];
  } catch (error) {
    return [];
  }
};

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(2));
};

const getAddressFromTags = (tags = {}) => {
  const parts = [
    tags['addr:housenumber'],
    tags['addr:street'],
    tags['addr:suburb'],
    tags['addr:city'] || tags['addr:town'] || tags['addr:village'],
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(', ') : (tags.address || 'Address not available');
};

const normalizeType = (amenity = '', healthcare = '') => {
  const value = String(healthcare || amenity || '').toLowerCase();
  if (value.includes('pharmacy')) return 'pharmacy';
  if (value.includes('clinic')) return 'clinic';
  if (value.includes('doctor')) return 'clinic';
  return 'hospital';
};

const getOverpassTypeQueries = (type, radiusMeters, latitude, longitude) => {
  const around = `(around:${radiusMeters},${latitude},${longitude})`;

  if (type === 'hospital') {
    return [
      `node["amenity"="hospital"]${around};`,
      `way["amenity"="hospital"]${around};`,
      `relation["amenity"="hospital"]${around};`,
      `node["healthcare"="hospital"]${around};`,
      `way["healthcare"="hospital"]${around};`,
      `relation["healthcare"="hospital"]${around};`,
    ];
  }

  if (type === 'clinic') {
    return [
      `node["amenity"="clinic"]${around};`,
      `way["amenity"="clinic"]${around};`,
      `relation["amenity"="clinic"]${around};`,
      `node["healthcare"="clinic"]${around};`,
      `way["healthcare"="clinic"]${around};`,
      `relation["healthcare"="clinic"]${around};`,
      `node["healthcare"="doctor"]${around};`,
      `way["healthcare"="doctor"]${around};`,
      `relation["healthcare"="doctor"]${around};`,
    ];
  }

  if (type === 'pharmacy') {
    return [
      `node["amenity"="pharmacy"]${around};`,
      `way["amenity"="pharmacy"]${around};`,
      `relation["amenity"="pharmacy"]${around};`,
      `node["healthcare"="pharmacy"]${around};`,
      `way["healthcare"="pharmacy"]${around};`,
      `relation["healthcare"="pharmacy"]${around};`,
    ];
  }

  return [
    ...getOverpassTypeQueries('hospital', radiusMeters, latitude, longitude),
    ...getOverpassTypeQueries('clinic', radiusMeters, latitude, longitude),
    ...getOverpassTypeQueries('pharmacy', radiusMeters, latitude, longitude),
  ];
};

const toOverpassHospital = (element, latitude, longitude) => {
  const lat = Number(element?.lat ?? element?.center?.lat);
  const lon = Number(element?.lon ?? element?.center?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null;
  }

  const tags = element.tags || {};
  const type = normalizeType(tags.amenity, tags.healthcare);

  return {
    id: `osm_${element.type}_${element.id}`,
    name: tags.name || `Nearby ${type}`,
    type,
    rating: null,
    phone: tags.phone || tags['contact:phone'] || '',
    address: getAddressFromTags(tags),
    latitude: lat,
    longitude: lon,
    emergencyAvailable: tags.emergency === 'yes',
    services: [tags.healthcare, tags['healthcare:speciality']].filter(Boolean),
    distance: calculateDistance(latitude, longitude, lat, lon),
  };
};

const getOverpassNearby = async (latitude, longitude, radius = 5, type = 'all') => {
  const radiusMeters = Math.max(500, Math.round(Number(radius || 5) * 1000));
  const overpassParts = getOverpassTypeQueries(type, radiusMeters, latitude, longitude).join('');

  const query = `[out:json][timeout:25];(${overpassParts});out center;`;
  const response = await fetchWithTimeout(
    `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`,
    {},
    5000
  );
  if (!response.ok) {
    throw new Error('Live map source unavailable right now');
  }

  const data = await response.json();
  const elements = Array.isArray(data?.elements) ? data.elements : [];

  const uniqueById = new Map();

  elements.forEach((item) => {
    const parsedItem = toOverpassHospital(item, latitude, longitude);
    if (parsedItem) {
      uniqueById.set(parsedItem.id, parsedItem);
    }
  });

  const parsed = [...uniqueById.values()]
    .filter((item) => (type === 'all' ? true : item.type === type))
    .sort((a, b) => a.distance - b.distance);

  return parsed;
};

const getNominatimQueries = (type) => {
  if (type === 'hospital') return ['hospital', 'medical center'];
  if (type === 'clinic') return ['clinic', 'doctor'];
  if (type === 'pharmacy') return ['pharmacy', 'medical store', 'chemist'];
  return ['hospital', 'clinic', 'doctor', 'pharmacy', 'medical store'];
};

const getNominatimType = (item = {}, fallbackType = 'hospital') => {
  const kind = String(item?.type || '').toLowerCase();
  const className = String(item?.class || '').toLowerCase();
  const display = String(item?.display_name || '').toLowerCase();

  if (kind.includes('pharmacy') || display.includes('pharmacy') || display.includes('chemist')) {
    return 'pharmacy';
  }
  if (
    kind.includes('clinic') ||
    kind.includes('doctors') ||
    display.includes('clinic') ||
    display.includes('doctor')
  ) {
    return 'clinic';
  }
  if (
    kind.includes('hospital') ||
    className.includes('amenity') ||
    display.includes('hospital') ||
    display.includes('medical center')
  ) {
    return 'hospital';
  }

  return fallbackType === 'all' ? 'hospital' : fallbackType;
};

const toNominatimHospital = (item, latitude, longitude, requestedType) => {
  const lat = Number(item?.lat);
  const lon = Number(item?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null;
  }

  const normalizedType = getNominatimType(item, requestedType);

  return {
    id: `nom_${item?.osm_type || 'node'}_${item?.osm_id || `${lat}_${lon}`}`,
    name: item?.name || item?.display_name?.split(',')?.[0] || `Nearby ${normalizedType}`,
    type: normalizedType,
    rating: null,
    phone: '',
    address: item?.display_name || 'Address not available',
    latitude: lat,
    longitude: lon,
    emergencyAvailable: false,
    services: [],
    distance: calculateDistance(latitude, longitude, lat, lon),
  };
};

const getNominatimNearby = async (latitude, longitude, radius = 5, type = 'all') => {
  const radiusKm = Math.max(1, Number(radius || 5));
  const latDelta = radiusKm / 111;
  const lonDelta = radiusKm / (111 * Math.max(0.2, Math.cos((latitude * Math.PI) / 180)));

  const left = longitude - lonDelta;
  const right = longitude + lonDelta;
  const top = latitude + latDelta;
  const bottom = latitude - latDelta;
  const viewbox = `${left},${top},${right},${bottom}`;

  const queries = getNominatimQueries(type);
  const combined = [];

  const requests = queries.map(async (queryText) => {
    const url =
      `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=20` +
      `&bounded=1&viewbox=${encodeURIComponent(viewbox)}&q=${encodeURIComponent(queryText)}`;

    const response = await fetchWithTimeout(
      url,
      {
        headers: {
          Accept: 'application/json',
        },
      },
      2500
    );

    if (!response.ok) {
      return [];
    }

    const rows = await response.json();
    return Array.isArray(rows) ? rows : [];
  });

  const settled = await Promise.allSettled(requests);
  settled.forEach((result) => {
    if (result.status !== 'fulfilled') return;
    result.value.forEach((item) => {
      const mapped = toNominatimHospital(item, latitude, longitude, type);
      if (mapped) {
        combined.push(mapped);
      }
    });
  });

  const deduped = dedupeByIdentity(combined)
    .filter((item) => (type === 'all' ? true : item.type === type))
    .filter((item) => item.distance <= radiusKm + 0.5)
    .sort((a, b) => a.distance - b.distance);

  return deduped;
};

const getLiveNearbyWithExpansion = async (latitude, longitude, radius = 5, type = 'all') => {
  const initialRadius = Math.max(1, Number(radius || 5));
  const attempts = [...new Set([
    initialRadius,
    Math.max(10, initialRadius),
    Math.max(20, initialRadius),
  ])];

  for (const attemptRadius of attempts) {
    try {
      const overpassResults = await getOverpassNearby(latitude, longitude, attemptRadius, type);
      if (overpassResults.length > 0) {
        return overpassResults;
      }
    } catch (error) {
      // Try the next provider/radius silently
    }

    try {
      const nominatimResults = await getNominatimNearby(latitude, longitude, attemptRadius, type);
      if (nominatimResults.length > 0) {
        return nominatimResults;
      }
    } catch (error) {
      // Try next radius
    }
  }

  return [];
};

const getMockNearby = (latitude, longitude, radius = 5, type = 'all') => {
  const candidates = [
    {
      id: 'mock_hosp_1',
      name: 'City Care Hospital',
      type: 'hospital',
      rating: 4.6,
      phone: '+91-80-40000001',
      address: 'Main Road, Near Bus Stand',
      latitude: latitude + 0.012,
      longitude: longitude + 0.008,
      emergencyAvailable: true,
      services: ['Emergency', 'General Medicine', 'ICU'],
    },
    {
      id: 'mock_clinic_1',
      name: 'Community Health Clinic',
      type: 'clinic',
      rating: 4.3,
      phone: '+91-80-40000002',
      address: 'Ward 4, Market Street',
      latitude: latitude - 0.01,
      longitude: longitude + 0.006,
      emergencyAvailable: false,
      services: ['Consultation', 'Pediatrics'],
    },
    {
      id: 'mock_pharm_1',
      name: '24x7 Medi Pharmacy',
      type: 'pharmacy',
      rating: 4.4,
      phone: '+91-80-40000003',
      address: 'Temple Road Junction',
      latitude: latitude + 0.006,
      longitude: longitude - 0.007,
      emergencyAvailable: false,
      services: ['Medicines', 'Home Delivery'],
    },
  ];

  const withDistance = candidates.map((item) => ({
    ...item,
    distance: calculateDistance(latitude, longitude, item.latitude, item.longitude),
  }));

  return withDistance
    .filter((item) => (type === 'all' ? true : item.type === type))
    .filter((item) => item.distance <= Number(radius || 5))
    .sort((a, b) => a.distance - b.distance);
};

const requestWithFallback = async (path, timeoutMs = 12000) => {
  const baseUrls = getBackendCandidates();
  console.log(`[Hospitals] Trying ${baseUrls.length} backend URLs: ${baseUrls.join(', ')}`);
  let lastError;

  for (const baseUrl of baseUrls) {
    try {
      const url = buildHospitalsUrl(baseUrl, path);
      console.log(`[Hospitals] Fetching: ${url} (timeout: ${timeoutMs}ms)`);
      const response = await fetchWithTimeout(url, {}, timeoutMs);
      const text = await response.text();
      console.log(`[Hospitals] ✅ Response status: ${response.status}, body length: ${text.length}`);
      let data = {};

      try {
        data = text ? JSON.parse(text) : {};
      } catch (parseError) {
        console.warn(`[Hospitals] JSON parse failed:`, parseError.message);
        data = { message: text || 'Invalid response from server' };
      }

      if (!response.ok) {
        console.warn(`[Hospitals] Request failed with status ${response.status}:`, data.message);
        throw new Error(data.message || 'Request failed');
      }
      console.log(`[Hospitals] ✅ Success! Got ${Array.isArray(data?.hospitals) ? data.hospitals.length : 0} results`);
      return data;
    } catch (error) {
      if (error.code === 'ETIMEDOUT') {
        console.warn(`[Hospitals] ⏱️  Timeout on ${baseUrl} after ${timeoutMs}ms`);
      } else {
        console.warn(`[Hospitals] ❌ Failed on ${baseUrl}:`, error.message);
      }
      lastError = error;
    }
  }

  console.error(`[Hospitals] ❌ All ${baseUrls.length} backend URLs failed.`);
  console.error(`[Hospitals] Last error: ${lastError?.message}`);
  console.error(`[Hospitals] Diagnostic: Ensure backend is running and EXPO_PUBLIC_BACKEND_URL=${process.env.EXPO_PUBLIC_BACKEND_URL} is correct.`);
  throw lastError;
};

class HospitalsService {
  /**
   * Get nearby hospitals/clinics/pharmacies
   */
  static async getNearby(latitude, longitude, radius = 5, type = 'all', options = {}) {
    const liveOnly = Boolean(options?.liveOnly);
    console.log(`[Hospitals] getNearby called: lat=${latitude}, lon=${longitude}, radius=${radius}, type=${type}, liveOnly=${liveOnly}`);
    let backendNearby = [];
    const numericRadius = Math.max(1, Number(radius || 5));

    try {
      const data = await requestWithFallback(
        `/nearby?latitude=${latitude}&longitude=${longitude}&radius=${numericRadius}&type=${type}&source=google`
      );
      backendNearby = Array.isArray(data?.hospitals) ? data.hospitals : [];
      console.log(`[Hospitals] Got ${backendNearby.length} hospitals from backend`);
    } catch (error) {
      console.error('Error getting nearby hospitals:', error);
    }

    if (liveOnly && backendNearby.length > 0) {
      const realtimeBackend = backendNearby.filter(
        (item) => String(item?.source || '').toLowerCase() !== 'bangaloredatabase'
      );

      if (realtimeBackend.length > 0) {
        console.log(`[Hospitals] liveOnly=true: returning ${realtimeBackend.length} realtime backend results`);
        return sortByDistance(realtimeBackend, latitude, longitude);
      }

      console.log('[Hospitals] liveOnly=true: backend returned only static rows, trying live APIs');
    }

    try {
      const hasOnlyStaticDatabaseResults =
        backendNearby.length > 0 &&
        backendNearby.every(
          (item) => String(item?.source || '').toLowerCase() === 'bangaloredatabase'
        );

      const shouldTryLive = liveOnly || backendNearby.length === 0 || hasOnlyStaticDatabaseResults;
      console.log(`[Hospitals] shouldTryLive=${shouldTryLive} (backendCount=${backendNearby.length}, hasOnlyStatic=${hasOnlyStaticDatabaseResults})`);

      if (shouldTryLive) {
        const liveNearby = await getLiveNearbyWithTimeout(
          latitude,
          longitude,
          numericRadius,
          type
        );
        console.log(`[Hospitals] Got ${liveNearby.length} hospitals from live APIs`);

        let mergedCandidates = dedupeByIdentity([...liveNearby, ...backendNearby]);

        if (type === 'all') {
          const hasHospitalInMerged = mergedCandidates.some(
            (item) => String(item?.type || '').toLowerCase() === 'hospital'
          );

          if (!hasHospitalInMerged) {
            const expandedHospitalLive = await getLiveNearbyWithTimeout(
              latitude,
              longitude,
              Math.max(15, Number(radius || 5)),
              'hospital',
              4500
            );

            if (expandedHospitalLive.length > 0) {
              console.log(
                `[Hospitals] Added ${expandedHospitalLive.length} hospital-only results from expanded live search`
              );
              mergedCandidates = dedupeByIdentity([...expandedHospitalLive, ...mergedCandidates]);
            }
          }
        }

        if (mergedCandidates.length > 0) {
          if (liveOnly) {
            const liveOnlyCandidates = mergedCandidates.filter(
              (item) => String(item?.source || '').toLowerCase() !== 'bangaloredatabase'
            );

            if (liveOnlyCandidates.length > 0) {
              console.log(`[Hospitals] liveOnly=true: merged live result ${liveOnlyCandidates.length} facilities`);
              return sortByDistance(liveOnlyCandidates, latitude, longitude);
            }
          }

          const merged = mergedCandidates;
          console.log(`[Hospitals] Merged result: ${merged.length} unique facilities`);
          return sortByDistance(merged, latitude, longitude);
        }
      }
    } catch (liveError) {
      console.error('Error getting live nearby hospitals:', liveError);
    }

    if (liveOnly) {
      // Still live-only: retry backend Google source with wider radii, but never use static DB rows.
      const liveOnlyRadii = [...new Set([
        Math.max(12, numericRadius),
        Math.max(20, numericRadius),
        Math.max(35, numericRadius),
      ])];

      for (const expandedRadius of liveOnlyRadii) {
        try {
          const expandedData = await requestWithFallback(
            `/nearby?latitude=${latitude}&longitude=${longitude}&radius=${expandedRadius}&type=${type}&source=google`,
            18000
          );

          const expandedNearby = Array.isArray(expandedData?.hospitals) ? expandedData.hospitals : [];
          const realtimeExpanded = expandedNearby.filter(
            (item) => String(item?.source || '').toLowerCase() !== 'bangaloredatabase'
          );

          if (realtimeExpanded.length > 0) {
            console.log(`[Hospitals] liveOnly=true: expanded realtime backend success at ${expandedRadius}km with ${realtimeExpanded.length} results`);
            return sortByDistance(realtimeExpanded, latitude, longitude);
          }
        } catch (expandedError) {
          console.warn(`[Hospitals] liveOnly expanded realtime fetch failed at ${expandedRadius}km: ${expandedError?.message || 'unknown'}`);
        }
      }

      console.log('[Hospitals] liveOnly=true: no realtime data available after expansion; skipping static/mock fallbacks');
      return [];
    }

    // Fallback 1: retry backend nearby search with wider radii.
    // Helpful when providers return empty in tight radius or sparse regions.
    if (backendNearby.length === 0) {
      const expandedRadii = [...new Set([
        Math.max(12, numericRadius),
        Math.max(25, numericRadius),
        Math.max(50, numericRadius),
      ])];

      for (const expandedRadius of expandedRadii) {
        try {
          const expandedData = await requestWithFallback(
            `/nearby?latitude=${latitude}&longitude=${longitude}&radius=${expandedRadius}&type=${type}&source=google`,
            16000
          );

          const expandedNearby = Array.isArray(expandedData?.hospitals) ? expandedData.hospitals : [];
          if (expandedNearby.length > 0) {
            console.log(`[Hospitals] Expanded nearby search succeeded (radius=${expandedRadius}km): ${expandedNearby.length} results`);
            return sortByDistance(expandedNearby, latitude, longitude);
          }
        } catch (expandedError) {
          console.warn(`[Hospitals] Expanded nearby search failed at ${expandedRadius}km: ${expandedError?.message || 'unknown'}`);
        }
      }
    }

    // Fallback 2: backend master dataset (real data), sorted by distance.
    // This prevents empty UI when geospatial providers return 0 results.
    if (backendNearby.length === 0) {
      try {
        const datasetPath = type === 'all' ? '/admin/all' : `/type/${type}`;
        const datasetData = await requestWithFallback(datasetPath, 16000);
        const datasetRows = Array.isArray(datasetData?.hospitals) ? datasetData.hospitals : [];

        const withCoordinates = datasetRows.filter((item) => {
          const lat = Number(item?.latitude);
          const lon = Number(item?.longitude);
          return Number.isFinite(lat) && Number.isFinite(lon);
        });

        if (withCoordinates.length > 0) {
          const ranked = sortByDistance(withCoordinates, latitude, longitude);
          const trimmed = ranked.slice(0, 50);
          console.log(`[Hospitals] Master dataset fallback used: ${trimmed.length} results`);
          return trimmed;
        }
      } catch (datasetError) {
        console.warn(`[Hospitals] Master dataset fallback failed: ${datasetError?.message || 'unknown'}`);
      }
    }

    const mockEnabled = shouldUseMockNearby();
    console.log(`[Hospitals] Final fallback: backendCount=${backendNearby.length}, mockEnabled=${mockEnabled}`);
    
    if (backendNearby.length > 0) {
      console.log(`[Hospitals] Returning ${backendNearby.length} backend results`);
      return sortByDistance(backendNearby, latitude, longitude);
    }
    
    if (mockEnabled) {
      const mockData = getMockNearby(latitude, longitude, Math.max(5, Number(radius || 5)), type);
      console.log(`[Hospitals] Returning ${mockData.length} mock results (mock data enabled)`);
      return mockData;
    }
    
    console.log(`[Hospitals] No data available - returning empty`);
    return [];
  }

  /**
   * Get hospital by ID
   */
  static async getHospitalById(id) {
    try {
      const data = await requestWithFallback(`/${id}`);
      return data.hospital;
    } catch (error) {
      console.error('Error getting hospital:', error);
      throw error;
    }
  }

  /**
   * Search hospitals
   */
  static async search(query) {
    try {
      const encodedQuery = encodeURIComponent(query);
      const data = await requestWithFallback(`/search/query?q=${encodedQuery}`);
      return data.hospitals || [];
    } catch (error) {
      console.error('Error searching hospitals:', error);
      throw error;
    }
  }

  /**
   * Get hospitals by type (hospital/clinic/pharmacy)
   */
  static async getByType(type) {
    try {
      const data = await requestWithFallback(`/type/${type}`);
      return data.hospitals || [];
    } catch (error) {
      console.error('Error getting hospitals by type:', error);
      throw error;
    }
  }

  /**
   * Get top-rated hospitals
   */
  static async getTopRated(minRating = 4.0, limit = 10) {
    try {
      const data = await requestWithFallback(
        `/ratings/top-rated?minRating=${minRating}&limit=${limit}`
      );
      return data.hospitals || [];
    } catch (error) {
      console.error('Error getting top-rated hospitals:', error);
      throw error;
    }
  }

  /**
   * Get hospitals by city
   */
  static async getByCity(city) {
    try {
      const data = await requestWithFallback(`/city/${city}`);
      return data.hospitals || [];
    } catch (error) {
      console.error('Error getting hospitals by city:', error);
      throw error;
    }
  }

  /**
   * Get emergency hospitals
   */
  static async getEmergency(latitude, longitude, radius = 10) {
    try {
      const data = await requestWithFallback(
        `/emergency/nearby?latitude=${latitude}&longitude=${longitude}&radius=${radius}`
      );
      return data.hospitals || [];
    } catch (error) {
      console.error('Error getting emergency hospitals:', error);
      throw error;
    }
  }

  /**
   * Get hospitals with ambulance services
   */
  static async getWithAmbulance(latitude, longitude, radius = 10) {
    try {
      const data = await requestWithFallback(
        `/ambulance/nearby?latitude=${latitude}&longitude=${longitude}&radius=${radius}`
      );
      return data.hospitals || [];
    } catch (error) {
      console.error('Error getting hospitals with ambulance:', error);
      throw error;
    }
  }

  /**
   * Get hospitals by specific services
   */
  static async getByServices(latitude, longitude, services, radius = 5) {
    try {
      const serviceString = services.join(',');
      const data = await requestWithFallback(
        `/services/search?latitude=${latitude}&longitude=${longitude}&services=${serviceString}&radius=${radius}`
      );
      return data.hospitals || [];
    } catch (error) {
      console.error('Error getting hospitals by services:', error);
      throw error;
    }
  }

  /**
   * Get area summary
   */
  static async getAreaSummary(latitude, longitude, radius = 5) {
    try {
      const data = await requestWithFallback(
        `/summary/area?latitude=${latitude}&longitude=${longitude}&radius=${radius}`
      );
      return data.summary;
    } catch (error) {
      console.error('Error getting area summary:', error);
      const liveNearby = await this.getNearby(latitude, longitude, radius, 'all');
      return {
        hospitals: liveNearby.filter((item) => item.type === 'hospital').length,
        clinics: liveNearby.filter((item) => item.type === 'clinic').length,
        pharmacies: liveNearby.filter((item) => item.type === 'pharmacy').length,
      };
    }
  }

  /**
   * Calculate distance to hospital
   */
  static async calculateDistance(latitude, longitude, hospitalId) {
    try {
      const data = await requestWithFallback(
        `/distance/calculate?latitude=${latitude}&longitude=${longitude}&hospitalId=${hospitalId}`
      );
      return data.distance;
    } catch (error) {
      console.error('Error calculating distance:', error);
      throw error;
    }
  }

  /**
   * Get all hospitals (admin)
   */
  static async getAll() {
    try {
      const data = await requestWithFallback('/admin/all');
      return data.hospitals || [];
    } catch (error) {
      console.error('Error getting all hospitals:', error);
      throw error;
    }
  }
}

export default HospitalsService;
