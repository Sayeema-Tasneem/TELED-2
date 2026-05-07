/**
 * Medical Equipment Service
 * Handles discovery, map data, slot loading, bookings, and user history.
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';
import languageService from './languageService';

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
  const expoHostBackend = normalizeBaseUrl(getExpoHostBackendUrl());
  const candidates = [
    configuredBackend,
    expoHostBackend,
    Platform.OS === 'android' ? 'http://10.0.2.2:5000' : null,
    'http://localhost:5000',
  ].filter(Boolean);

  return [...new Set(candidates)];
};

const fetchJsonWithFallback = async (path, options = {}) => {
  let lastError;

  for (const baseUrl of getBackendCandidates()) {
    try {
      const response = await fetch(`${baseUrl}/api/equipment${path}`, options);
      const data = await response.json();
      return { response, data };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Network request failed');
};

const MOCK_EQUIPMENT = [
  {
    id: 'eq_oximeter_1',
    name: 'Pulse Oximeter',
    nameHi: 'पल्स ऑक्सीमीटर',
    nameKn: 'ಪಲ್ಸ್ ಆಕ್ಸಿಮೀಟರ್',
    category: 'diagnostic',
    providerName: 'PHC Community Center - Kengeri',
    latitude: 12.9182,
    longitude: 77.485,
    address: 'Kengeri, Bengaluru Rural',
    condition: 'Good',
    depositAmount: 300,
    description: 'Portable pulse oximeter for oxygen saturation and pulse monitoring at home.',
    descriptionHi: 'घर पर ऑक्सीजन और पल्स जांचने के लिए पोर्टेबल डिवाइस।',
    descriptionKn: 'ಮನೆಯಲ್ಲಿ ಆಮ್ಲಜನಕ ಮತ್ತು ನಾಡಿ ಅಳೆಯಲು ಪೋರ್ಟಬಲ್ ಸಾಧನ.',
    usageInstructions: 'Clip on finger and stay still for 20-30 seconds before reading.',
    usageInstructionsHi: 'उंगली में लगाएं और 20-30 सेकंड स्थिर रहें।',
    usageInstructionsKn: 'ಬೆರಳಿಗೆ ಅಳವಡಿಸಿ 20-30 ಸೆಕೆಂಡ್ ಸ್ಥಿರವಾಗಿರಿ.',
  },
  {
    id: 'eq_nebulizer_1',
    name: 'Nebulizer Machine',
    nameHi: 'नेब्युलाइज़र मशीन',
    nameKn: 'ನೆಬ್ಯುಲೈಸರ್ ಯಂತ್ರ',
    category: 'respiratory',
    providerName: 'Taluk Hospital Equipment Bank',
    latitude: 12.9355,
    longitude: 77.624,
    address: 'Jayanagar, Bengaluru',
    condition: 'Excellent',
    depositAmount: 600,
    description: 'Compressor nebulizer suitable for asthma/COPD medication delivery.',
    descriptionHi: 'अस्थमा/COPD दवा देने के लिए उपयुक्त नेब्युलाइज़र।',
    descriptionKn: 'ಅಸ್ತಮಾ/COPD ಔಷಧ ನೀಡಲು ಸೂಕ್ತ ನೆಬ್ಯುಲೈಸರ್.',
    usageInstructions: 'Use as advised by doctor; clean mask and cup after each use.',
    usageInstructionsHi: 'डॉक्टर की सलाह से उपयोग करें, हर उपयोग के बाद साफ करें।',
    usageInstructionsKn: 'ವೈದ್ಯರ ಸಲಹೆಯಂತೆ ಬಳಸಿ; ಪ್ರತಿ ಬಳಕೆಯ ನಂತರ ಸ್ವಚ್ಛಗೊಳಿಸಿ.',
  },
  {
    id: 'eq_wheelchair_1',
    name: 'Wheelchair',
    nameHi: 'व्हीलचेयर',
    nameKn: 'ವೀಲ್ಚೇರ್',
    category: 'mobility',
    providerName: 'Village Mobility Support Unit',
    latitude: 12.9716,
    longitude: 77.5946,
    address: 'MG Road, Bengaluru',
    condition: 'Good',
    depositAmount: 800,
    description: 'Foldable wheelchair for short-term mobility support.',
    usageInstructions: 'Lock brakes when transferring patient; avoid uneven steep slopes.',
  },
  {
    id: 'eq_bp_1',
    name: 'Digital BP Monitor',
    nameHi: 'डिजिटल BP मॉनिटर',
    nameKn: 'ಡಿಜಿಟಲ್ BP ಮಾನಿಟರ್',
    category: 'diagnostic',
    providerName: 'Rural Health Kiosk',
    latitude: 12.9569,
    longitude: 77.7011,
    address: 'Whitefield, Bengaluru',
    condition: 'Excellent',
    depositAmount: 500,
    description: 'Automatic blood pressure monitor with memory for home use.',
    usageInstructions: 'Sit quietly for 5 minutes before measurement; arm at heart level.',
    usageInstructionsHi: 'मापने से पहले 5 मिनट शांत बैठें; हाथ दिल की ऊंचाई पर रखें।',
    usageInstructionsKn: 'ಅಳೆಯುವ ಮೊದಲು 5 ನಿಮಿಷ ಶಾಂತವಾಗಿ ಕುಳಿತುಕೊಳ್ಳಿ; ಕೈ ಹೃದಯ ಮಟ್ಟದಲ್ಲಿ ಇರಲಿ.',
  },
  {
    id: 'eq_glucometer_1',
    name: 'Glucometer',
    nameHi: 'ग्लूकोमीटर',
    nameKn: 'ಗ್ಲುಕೋಮೀಟರ್',
    category: 'diagnostic',
    providerName: 'Community Health Kiosk - RR Nagar',
    latitude: 12.9231,
    longitude: 77.5152,
    address: 'RR Nagar, Bengaluru',
    condition: 'Good',
    depositAmount: 450,
    description: 'Home blood glucose monitor with strips support.',
    descriptionHi: 'घर पर शुगर जांचने की मशीन।',
    descriptionKn: 'ಮನೆಯಲ್ಲಿ ರಕ್ತ ಸಕ್ಕರೆ ಅಳೆಯುವ ಸಾಧನ.',
    usageInstructions: 'Wash hands, use strip, prick side of fingertip and record value.',
  },
  {
    id: 'eq_thermometer_1',
    name: 'Infrared Thermometer',
    nameHi: 'इन्फ्रारेड थर्मामीटर',
    nameKn: 'ಇನ್ಫ್ರಾರೆಡ್ ತಾಪಮಾನ ಮಾಪಕ',
    category: 'diagnostic',
    providerName: 'Ward Primary Care Unit',
    latitude: 12.9892,
    longitude: 77.572,
    address: 'Malleshwaram, Bengaluru',
    condition: 'Excellent',
    depositAmount: 250,
    description: 'Contactless thermometer for quick fever checks.',
    usageInstructions: 'Hold 2-3 cm from forehead and press scan button.',
  },
  {
    id: 'eq_oxygen_1',
    name: 'Oxygen Concentrator',
    nameHi: 'ऑक्सीजन कॉन्सेंट्रेटर',
    nameKn: 'ಆಮ್ಲಜನಕ ಕಾನ್ಸಂಟ್ರೇಟರ್',
    category: 'respiratory',
    providerName: 'District Health Equipment Bank',
    latitude: 12.9447,
    longitude: 77.5806,
    address: 'Basavanagudi, Bengaluru',
    condition: 'Good',
    depositAmount: 2500,
    description: '5L oxygen concentrator for low oxygen support at home.',
    usageInstructions: 'Use only as prescribed; keep machine ventilated.',
  },
  {
    id: 'eq_cpap_1',
    name: 'CPAP Machine',
    nameHi: 'CPAP मशीन',
    nameKn: 'CPAP ಯಂತ್ರ',
    category: 'respiratory',
    providerName: 'Sleep Care Outreach Center',
    latitude: 12.9611,
    longitude: 77.6387,
    address: 'Indiranagar, Bengaluru',
    condition: 'Excellent',
    depositAmount: 3200,
    description: 'CPAP support machine for sleep-related breathing issues.',
    usageInstructions: 'Fit mask properly and follow doctor pressure settings.',
  },
  {
    id: 'eq_spirometer_1',
    name: 'Portable Spirometer',
    nameHi: 'पोर्टेबल स्पाइरोमीटर',
    nameKn: 'ಪೋರ್ಟಬಲ್ ಸ್ಪೈರೋಮೀಟರ್',
    category: 'respiratory',
    providerName: 'Pulmonary Outreach Unit',
    latitude: 13.0025,
    longitude: 77.6074,
    address: 'Hebbal, Bengaluru',
    condition: 'Good',
    depositAmount: 1200,
    description: 'Lung function check device for home respiratory monitoring.',
    usageInstructions: 'Take deep breath and blow steadily into mouthpiece.',
  },
  {
    id: 'eq_walker_1',
    name: 'Walking Frame',
    nameHi: 'वॉकर',
    nameKn: 'ವಾಕರ್',
    category: 'mobility',
    providerName: 'Senior Care Equipment Pool',
    latitude: 12.9769,
    longitude: 77.545,
    address: 'Rajajinagar, Bengaluru',
    condition: 'Excellent',
    depositAmount: 700,
    description: 'Aluminium walker for senior mobility support.',
    usageInstructions: 'Adjust height to wrist level before walking.',
  },
  {
    id: 'eq_crutches_1',
    name: 'Elbow Crutches Pair',
    nameHi: 'एल्बो क्रचेस (जोड़ी)',
    nameKn: 'ಎಲ್ಬೋ ಕ್ರಚ್‌ಗಳು (ಜೋಡಿ)',
    category: 'mobility',
    providerName: 'Physio Rehab Center',
    latitude: 12.9081,
    longitude: 77.6474,
    address: 'HSR Layout, Bengaluru',
    condition: 'Good',
    depositAmount: 500,
    description: 'Forearm crutches for temporary leg injury support.',
    usageInstructions: 'Use rubber tip grip and keep posture upright while walking.',
  },
  {
    id: 'eq_commode_1',
    name: 'Bedside Commode Chair',
    nameHi: 'बेडसाइड कमोड चेयर',
    nameKn: 'ಬೆಡ್‌ಸೈಡ್ ಕಮೋಡ್ ಕುರ್ಚಿ',
    category: 'mobility',
    providerName: 'Home Care Support Trust',
    latitude: 12.936,
    longitude: 77.5492,
    address: 'Banashankari, Bengaluru',
    condition: 'Good',
    depositAmount: 650,
    description: 'Commode chair for patients with limited mobility.',
    usageInstructions: 'Ensure brakes and anti-slip feet are stable before use.',
  },
  {
    id: 'eq_suction_1',
    name: 'Portable Suction Machine',
    nameHi: 'पोर्टेबल सक्शन मशीन',
    nameKn: 'ಪೋರ್ಟಬಲ್ ಸಕ್ಷನ್ ಯಂತ್ರ',
    category: 'respiratory',
    providerName: 'Emergency Care Depot',
    latitude: 12.9483,
    longitude: 77.6672,
    address: 'Marathahalli, Bengaluru',
    condition: 'Excellent',
    depositAmount: 1800,
    description: 'Portable suction for airway secretion management.',
    usageInstructions: 'Use sterile tubing and clean collection jar daily.',
  },
  {
    id: 'eq_ecg_1',
    name: 'Portable ECG Monitor',
    nameHi: 'पोर्टेबल ECG मॉनिटर',
    nameKn: 'ಪೋರ್ಟಬಲ್ ECG ಮಾನಿಟರ್',
    category: 'diagnostic',
    providerName: 'Cardiac Rural Outreach',
    latitude: 13.0146,
    longitude: 77.5523,
    address: 'Yeshwanthpur, Bengaluru',
    condition: 'Good',
    depositAmount: 2200,
    description: 'Single-lead ECG monitor for home rhythm screening.',
    usageInstructions: 'Keep skin dry and place electrodes as instructed.',
  },
  {
    id: 'eq_weighing_1',
    name: 'Digital Weighing Scale',
    nameHi: 'डिजिटल वज़न मशीन',
    nameKn: 'ಡಿಜಿಟಲ್ ತೂಕದ ಯಂತ್ರ',
    category: 'diagnostic',
    providerName: 'Nutrition Monitoring Unit',
    latitude: 12.8941,
    longitude: 77.5975,
    address: 'Electronic City, Bengaluru',
    condition: 'Excellent',
    depositAmount: 300,
    description: 'Digital scale for weight tracking during treatment.',
    usageInstructions: 'Place on flat floor and stand still for accurate reading.',
  },
  {
    id: 'eq_bed_1',
    name: 'Manual Hospital Bed',
    nameHi: 'मैनुअल हॉस्पिटल बेड',
    nameKn: 'ಮ್ಯಾನುಯಲ್ ಆಸ್ಪತ್ರೆ ಹಾಸಿಗೆ',
    category: 'mobility',
    providerName: 'Community Palliative Care',
    latitude: 12.9992,
    longitude: 77.6391,
    address: 'Kalyan Nagar, Bengaluru',
    condition: 'Good',
    depositAmount: 5000,
    description: 'Adjustable manual hospital bed for home patient care.',
    usageInstructions: 'Lock wheel brakes and adjust height gradually.',
  },
  {
    id: 'eq_baby_nebulizer_1',
    name: 'Pediatric Nebulizer',
    nameHi: 'बाल नेब्युलाइज़र',
    nameKn: 'ಮಕ್ಕಳ ನೆಬ್ಯುಲೈಸರ್',
    category: 'respiratory',
    providerName: 'Child Health Support Desk',
    latitude: 12.9701,
    longitude: 77.5158,
    address: 'Nayandahalli, Bengaluru',
    condition: 'Excellent',
    depositAmount: 700,
    description: 'Child-friendly nebulizer kit with mask and mouthpiece.',
    usageInstructions: 'Use pediatric mask and follow pediatrician dose guidance.',
  },
];

const mockBookings = [];

const getCurrentLang = () => languageService.getCurrentLanguage?.() || 'en';

const getLocalized = (item, field) => {
  const lang = getCurrentLang();
  if (lang === 'hi' && item[`${field}Hi`]) return item[`${field}Hi`];
  if (lang === 'kn' && item[`${field}Kn`]) return item[`${field}Kn`];
  return item[field];
};

const toISODate = (date) => {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

const haversineKm = (lat1, lon1, lat2, lon2) => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2)
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2))
    * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const generateMockSlots = (equipmentId, date = toISODate(new Date())) => {
  const baseSlots = [
    { id: `${equipmentId}_${date}_s1`, startTime: '09:00', endTime: '11:00' },
    { id: `${equipmentId}_${date}_s2`, startTime: '12:00', endTime: '14:00' },
    { id: `${equipmentId}_${date}_s3`, startTime: '15:00', endTime: '17:00' },
  ];

  return baseSlots.map((slot) => {
    const alreadyBooked = mockBookings.some(
      (booking) => booking.equipmentId === equipmentId && booking.date === date && booking.slotId === slot.id
    );
    return {
      ...slot,
      date,
      status: alreadyBooked ? 'booked' : 'available',
    };
  });
};

const buildEquipmentWithAvailability = (item, distance, date = toISODate(new Date())) => {
  const slots = generateMockSlots(item.id, date);
  const availableSlots = slots.filter((slot) => slot.status === 'available');

  return {
    ...item,
    name: getLocalized(item, 'name'),
    description: getLocalized(item, 'description'),
    usageInstructions: getLocalized(item, 'usageInstructions'),
    distance,
    availability: {
      status: availableSlots.length > 0 ? 'available' : 'fully_booked',
      availableSlotsCount: availableSlots.length,
      nextAvailableSlot: availableSlots[0]
        ? { date, startTime: availableSlots[0].startTime }
        : null,
    },
  };
};

const getMockNearby = (latitude, longitude, radius = 8, category = 'all', query = '') => {
  const normalizedQuery = String(query || '').toLowerCase().trim();

  return MOCK_EQUIPMENT
    .map((item) => {
      const distance = haversineKm(latitude, longitude, item.latitude, item.longitude);
      return buildEquipmentWithAvailability(item, distance);
    })
    .filter((item) => item.distance <= radius)
    .filter((item) => category === 'all' || item.category === category)
    .filter((item) => {
      if (!normalizedQuery) return true;
      return (
        item.name.toLowerCase().includes(normalizedQuery)
        || String(item.nameHi || '').toLowerCase().includes(normalizedQuery)
        || String(item.nameKn || '').toLowerCase().includes(normalizedQuery)
        || item.providerName.toLowerCase().includes(normalizedQuery)
        || item.address.toLowerCase().includes(normalizedQuery)
      );
    })
    .sort((a, b) => a.distance - b.distance);
};

class EquipmentService {
  static async getNearby(latitude, longitude, radius = 8, category = 'all', query = '') {
    try {
      const params = new URLSearchParams({
        latitude: String(latitude),
        longitude: String(longitude),
        radius: String(radius),
        category,
        availability: 'all',
        query,
      });

      const { response, data } = await fetchJsonWithFallback(`/nearby?${params.toString()}`);

      if (!response.ok) {
        throw new Error(data.message || 'Failed to load nearby equipment');
      }

      if (!data.equipment || data.equipment.length === 0) {
        return getMockNearby(latitude, longitude, radius, category, query);
      }

      return data.equipment;
    } catch (error) {
      console.error('Error loading nearby equipment:', error);
      return getMockNearby(latitude, longitude, radius, category, query);
    }
  }

  static async getAreaSummary(latitude, longitude, radius = 8) {
    try {
      const params = new URLSearchParams({
        latitude: String(latitude),
        longitude: String(longitude),
        radius: String(radius),
      });

      const { response, data } = await fetchJsonWithFallback(`/summary/area?${params.toString()}`);

      if (!response.ok) {
        throw new Error(data.message || 'Failed to load equipment summary');
      }

      return data.summary;
    } catch (error) {
      console.error('Error loading equipment summary:', error);
      const nearby = getMockNearby(latitude, longitude, radius, 'all', '');
      return {
        total: nearby.length,
        availableNow: nearby.filter((item) => item.availability?.status === 'available').length,
        radiusKm: radius,
      };
    }
  }

  static async getEquipmentDetails(id) {
    try {
      const { response, data } = await fetchJsonWithFallback(`/${id}`);

      if (!response.ok) {
        throw new Error(data.message || 'Failed to load equipment details');
      }

      return data.equipment;
    } catch (error) {
      console.error('Error loading equipment details:', error);
      const fallback = MOCK_EQUIPMENT.find((item) => item.id === id);
      if (!fallback) throw error;
      return buildEquipmentWithAvailability(fallback, 0);
    }
  }

  static async getSlots(equipmentId, date) {
    try {
      const params = date ? `?date=${encodeURIComponent(date)}` : '';
      const { response, data } = await fetchJsonWithFallback(`/${equipmentId}/slots${params}`);

      if (!response.ok) {
        throw new Error(data.message || 'Failed to load equipment slots');
      }

      return data.slots || [];
    } catch (error) {
      console.error('Error loading equipment slots:', error);
      return generateMockSlots(equipmentId, date || toISODate(new Date()));
    }
  }

  static async bookSlot(equipmentId, bookingData) {
    try {
      const { response, data } = await fetchJsonWithFallback(`/${equipmentId}/book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData),
      });

      if (!response.ok) {
        throw new Error(data.message || 'Failed to book equipment slot');
      }

      return data;
    } catch (error) {
      console.error('Error booking equipment slot:', error);
      const booking = {
        id: `booking_${Date.now()}`,
        equipmentId,
        equipmentName:
          getLocalized(MOCK_EQUIPMENT.find((item) => item.id === equipmentId) || {}, 'name') || 'Medical Equipment',
        providerName:
          MOCK_EQUIPMENT.find((item) => item.id === equipmentId)?.providerName || 'Community Provider',
        date: bookingData?.date || toISODate(new Date()),
        slotId: bookingData?.slotId,
        startTime: bookingData?.startTime || '09:00',
        endTime: bookingData?.endTime || '11:00',
        userId: bookingData?.userId,
      };
      mockBookings.push(booking);
      return { success: true, booking };
    }
  }

  static async getUserHistory(userId) {
    try {
      const { response, data } = await fetchJsonWithFallback(`/user/${userId}/history`);

      if (!response.ok) {
        throw new Error(data.message || 'Failed to load equipment history');
      }

      return data.history || [];
    } catch (error) {
      console.error('Error loading equipment history:', error);
      return mockBookings.filter((booking) => booking.userId === userId);
    }
  }
}

export default EquipmentService;
