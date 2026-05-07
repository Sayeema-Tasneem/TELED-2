/**
 * Hospitals Model
 * Manages hospital, clinic, and pharmacy data with geolocation features
 */

const { v4: uuidv4 } = require('uuid');

// In-memory storage (replace with Firebase Firestore in production)
let hospitals = [
  {
    id: 'hosp_1',
    name: 'Apollo Hospital',
    type: 'hospital', // hospital, clinic, pharmacy
    address: '123 Main St, Bangalore, KA 560001',
    city: 'Bangalore',
    state: 'Karnataka',
    latitude: 12.9716,
    longitude: 77.5946,
    phone: '+91-80-40961000',
    email: 'info@apollohospital.com',
    website: 'www.apollohospital.com',
    rating: 4.8,
    reviewCount: 245,
    services: ['Emergency', 'ICU', 'Surgery', 'Cardiology', 'Neurology', 'Oncology'],
    operatingHours: '24/7',
    emergencyAvailable: true,
    ambulanceAvailable: true,
    acceptingNewPatients: true,
    imageUrl: 'https://example.com/apollo.jpg',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'hosp_2',
    name: 'Fortis Hospital',
    type: 'hospital',
    address: '456 Park Road, Bangalore, KA 560008',
    city: 'Bangalore',
    state: 'Karnataka',
    latitude: 12.9352,
    longitude: 77.6245,
    phone: '+91-80-40611666',
    email: 'contact@fortishospitals.com',
    website: 'www.fortishospitals.com',
    rating: 4.7,
    reviewCount: 189,
    services: ['Emergency', 'Surgery', 'Pediatrics', 'Orthopedics', 'Radiology'],
    operatingHours: '24/7',
    emergencyAvailable: true,
    ambulanceAvailable: true,
    acceptingNewPatients: true,
    imageUrl: 'https://example.com/fortis.jpg',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'clinic_1',
    name: 'Dr. Sharma Clinic',
    type: 'clinic',
    address: '789 Health Ave, Bangalore, KA 560010',
    city: 'Bangalore',
    state: 'Karnataka',
    latitude: 12.9549,
    longitude: 77.6499,
    phone: '+91-80-23456789',
    email: 'clinic@drsharma.com',
    website: 'www.drsharma.com',
    rating: 4.5,
    reviewCount: 87,
    services: ['General Practice', 'Pediatrics', 'Dermatology', 'ENT'],
    operatingHours: '9:00 AM - 9:00 PM',
    emergencyAvailable: false,
    ambulanceAvailable: false,
    acceptingNewPatients: true,
    imageUrl: 'https://example.com/clinic1.jpg',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'pharmacy_1',
    name: 'Life Care Pharmacy',
    type: 'pharmacy',
    address: '321 Medical Street, Bangalore, KA 560004',
    city: 'Bangalore',
    state: 'Karnataka',
    latitude: 12.9698,
    longitude: 77.5997,
    phone: '+91-80-26567890',
    email: 'support@lifecarepharm.com',
    website: 'www.lifecarepharm.com',
    rating: 4.6,
    reviewCount: 156,
    services: ['Pharmacy', 'Medicine Delivery', 'Online Prescriptions'],
    operatingHours: '8:00 AM - 10:00 PM',
    emergencyAvailable: true,
    ambulanceAvailable: false,
    acceptingNewPatients: true,
    imageUrl: 'https://example.com/pharmacy1.jpg',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'hosp_3',
    name: 'St. Johns Hospital',
    type: 'hospital',
    address: '654 Care Lane, Bangalore, KA 560011',
    city: 'Bangalore',
    state: 'Karnataka',
    latitude: 12.9950,
    longitude: 77.7245,
    phone: '+91-80-44442222',
    email: 'info@stjohnshospital.com',
    website: 'www.stjohnshospital.com',
    rating: 4.4,
    reviewCount: 134,
    services: ['Emergency', 'ICU', 'General Surgery', 'Gynecology'],
    operatingHours: '24/7',
    emergencyAvailable: true,
    ambulanceAvailable: true,
    acceptingNewPatients: true,
    imageUrl: 'https://example.com/stjohns.jpg',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'clinic_2',
    name: 'Quick Care Clinic',
    type: 'clinic',
    address: '987 Wellness Blvd, Bangalore, KA 560009',
    city: 'Bangalore',
    state: 'Karnataka',
    latitude: 12.9316,
    longitude: 77.6268,
    phone: '+91-80-35552200',
    email: 'appointments@quickcare.com',
    website: 'www.quickcare.com',
    rating: 4.3,
    reviewCount: 95,
    services: ['General Practice', 'Dental', 'Eye Care', 'Physiotherapy'],
    operatingHours: '10:00 AM - 8:00 PM',
    emergencyAvailable: false,
    ambulanceAvailable: false,
    acceptingNewPatients: true,
    imageUrl: 'https://example.com/quickcare.jpg',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'pharmacy_2',
    name: 'MediShop Pharmacy',
    type: 'pharmacy',
    address: '543 Remedy Road, Bangalore, KA 560007',
    city: 'Bangalore',
    state: 'Karnataka',
    latitude: 12.9462,
    longitude: 77.6156,
    phone: '+91-80-27895432',
    email: 'contact@medishop.com',
    website: 'www.medishop.com',
    rating: 4.5,
    reviewCount: 118,
    services: ['Pharmacy', 'Health Supplements', 'Medical Equipment'],
    operatingHours: '7:00 AM - 11:00 PM',
    emergencyAvailable: true,
    ambulanceAvailable: false,
    acceptingNewPatients: true,
    imageUrl: 'https://example.com/medishop.jpg',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - User latitude
 * @param {number} lon1 - User longitude
 * @param {number} lat2 - Hospital latitude
 * @param {number} lon2 - Hospital longitude
 * @returns {number} Distance in kilometers
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
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
  return parseFloat((R * c).toFixed(2));
};

/**
 * Get nearby hospitals/clinics/pharmacies based on user location
 * @param {number} userLat - User latitude
 * @param {number} userLon - User longitude
 * @param {number} radiusKm - Search radius in kilometers (default: 5 km)
 * @param {string} type - Type filter: hospital, clinic, pharmacy, or 'all'
 * @returns {Array} Sorted by distance
 */
const getNearbyHospitals = (userLat, userLon, radiusKm = 5, type = 'all') => {
  const nearby = hospitals
    .map((hospital) => {
      const distance = calculateDistance(userLat, userLon, hospital.latitude, hospital.longitude);
      return { ...hospital, distance };
    })
    .filter((hospital) => hospital.distance <= radiusKm)
    .filter((hospital) => (type === 'all' ? true : hospital.type === type))
    .sort((a, b) => a.distance - b.distance);

  return nearby;
};

/**
 * Get hospital by ID
 */
const getHospitalById = (hospitalId) => {
  return hospitals.find((h) => h.id === hospitalId);
};

/**
 * Get all hospitals
 */
const getAllHospitals = () => {
  return hospitals;
};

/**
 * Get hospitals by type
 */
const getHospitalsByType = (type) => {
  return hospitals.filter((h) => h.type === type);
};

/**
 * Search hospitals by name or city
 */
const searchHospitals = (query) => {
  const lowerQuery = query.toLowerCase();
  return hospitals.filter(
    (h) =>
      h.name.toLowerCase().includes(lowerQuery) ||
      h.city.toLowerCase().includes(lowerQuery) ||
      h.services.some((s) => s.toLowerCase().includes(lowerQuery))
  );
};

/**
 * Get hospitals with rating above threshold
 */
const getTopRatedHospitals = (minRating = 4.0, limit = 10) => {
  return hospitals
    .filter((h) => h.rating >= minRating)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, limit);
};

/**
 * Get hospitals by city
 */
const getHospitalsByCity = (city) => {
  return hospitals.filter((h) => h.city.toLowerCase() === city.toLowerCase());
};

/**
 * Get hospitals with emergency services
 */
const getEmergencyHospitals = (userLat, userLon, radiusKm = 10) => {
  return getNearbyHospitals(userLat, userLon, radiusKm, 'all').filter(
    (h) => h.emergencyAvailable === true
  );
};

/**
 * Get hospitals with ambulance services
 */
const getHospitalsWithAmbulance = (userLat, userLon, radiusKm = 10) => {
  return getNearbyHospitals(userLat, userLon, radiusKm, 'all').filter(
    (h) => h.ambulanceAvailable === true
  );
};

/**
 * Add new hospital (admin function)
 */
const addHospital = (hospitalData) => {
  const newHospital = {
    id: `hosp_${uuidv4().substring(0, 8)}`,
    ...hospitalData,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  hospitals.push(newHospital);
  return newHospital;
};

/**
 * Update hospital (admin function)
 */
const updateHospital = (hospitalId, updateData) => {
  const hospital = hospitals.find((h) => h.id === hospitalId);
  if (!hospital) return null;

  Object.assign(hospital, updateData, { updatedAt: new Date() });
  return hospital;
};

/**
 * Delete hospital (admin function)
 */
const deleteHospital = (hospitalId) => {
  const index = hospitals.findIndex((h) => h.id === hospitalId);
  if (index === -1) return null;

  const deleted = hospitals[index];
  hospitals.splice(index, 1);
  return deleted;
};

/**
 * Get hospitals by multiple service criteria
 */
const getHospitalsByServices = (services, userLat, userLon, radiusKm = 5) => {
  const nearby = getNearbyHospitals(userLat, userLon, radiusKm, 'all');
  return nearby.filter((hospital) =>
    services.every((service) => hospital.services.includes(service))
  );
};

/**
 * Get pharmacy count by area
 */
const getPharmacyCount = (userLat, userLon, radiusKm = 5) => {
  return getNearbyHospitals(userLat, userLon, radiusKm, 'pharmacy').length;
};

/**
 * Get clinic count by area
 */
const getClinicCount = (userLat, userLon, radiusKm = 5) => {
  return getNearbyHospitals(userLat, userLon, radiusKm, 'clinic').length;
};

/**
 * Get hospital count by area
 */
const getHospitalCount = (userLat, userLon, radiusKm = 5) => {
  return getNearbyHospitals(userLat, userLon, radiusKm, 'hospital').length;
};

/**
 * Generate mock hospitals dynamically near any location
 * Creates realistic hospital names and coordinates near user location
 */
const generateMockNearbyHospitals = (userLat, userLon, radiusKm = 5, type = 'all') => {
  const hospitalNames = [
    'Apollo Hospital', 'Fortis Healthcare', 'Max Healthcare', 'Manipal Hospital',
    'Aditya Birla Hospital', 'Narayana Health', 'HealthCare Global', 'Lilavati Hospital',
    'Breach Candy Hospital', 'Wockhardt Hospital', 'Aster Hospitals', 'Care Hospitals',
  ];
  
  const clinicNames = [
    'Dr. Sharma Clinic', 'Quick Care Clinic', 'Family Health Center', 'Advanced Diagnostic Center',
    'Wellness Clinic', 'Community Health Center', 'Primary Care Clinic', 'Medical Plaza Clinic',
    'Health First Clinic', 'Care Plus Clinic', 'Medcare Clinic', 'Dr. Patel Clinic',
  ];
  
  const pharmacyNames = [
    'Life Care Pharmacy', 'MediShop Pharmacy', 'Apollo Pharmacy', 'Health Plus Pharmacy',
    'Quick Remedy Pharmacy', 'Care Pharmacy', 'Medline Pharmacy', 'Wellness Pharmacy',
    'Prime Pharmacy', 'Guardian Pharmacy', 'SafeRx Pharmacy', 'Trusted Pharmacy',
  ];
  
  const cities = ['Bangalore', 'Pune', 'Mumbai', 'Delhi', 'Hyderabad', 'Chennai', 'Kolkata', 'Ahmedabad'];
  const states = ['Karnataka', 'Maharashtra', 'Delhi', 'Telangana', 'Tamil Nadu', 'West Bengal', 'Gujarat'];

  const generated = [];
  const typeArray = type === 'all' ? ['hospital', 'clinic', 'pharmacy'] : [type];
  
  // Generate 6-8 hospitals per type within radius
  typeArray.forEach((currentType) => {
    let names = hospitalNames;
    if (currentType === 'clinic') names = clinicNames;
    if (currentType === 'pharmacy') names = pharmacyNames;
    
    const count = currentType === 'hospital' ? 4 : 2;
    
    for (let i = 0; i < count; i++) {
      // Random offset from user location
      const angle = (Math.random() * 2 * Math.PI);
      const distance = Math.random() * radiusKm;
      
      // Convert to lat/lon offset (rough approximation)
      const latOffset = (distance / 111) * Math.cos(angle); // 111 km per degree latitude
      const lonOffset = (distance / (111 * Math.cos((userLat * Math.PI) / 180))) * Math.sin(angle);
      
      const mockHospital = {
        id: `mock_${currentType}_${Date.now()}_${i}`,
        name: `${names[Math.floor(Math.random() * names.length)]} - ${i + 1}`,
        type: currentType,
        address: `${100 + i * 50} Medical Road, ${cities[Math.floor(Math.random() * cities.length)]}, ${states[0]} 560001`,
        city: cities[0],
        state: states[0],
        latitude: parseFloat((userLat + latOffset).toFixed(6)),
        longitude: parseFloat((userLon + lonOffset).toFixed(6)),
        phone: `+91-${80 + Math.floor(Math.random() * 9)}-${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`,
        email: `contact@hospital${i}.com`,
        website: `www.hospital${i}.com`,
        rating: 3.8 + Math.random() * 1.0,
        reviewCount: Math.floor(Math.random() * 300 + 50),
        services: currentType === 'hospital' 
          ? ['Emergency', 'ICU', 'Surgery', 'Cardiology', 'Neurology']
          : currentType === 'clinic'
          ? ['General Practice', 'Dental', 'Pediatrics', 'Dermatology']
          : ['Pharmacy', 'Medicine Delivery', 'Health Supplements'],
        operatingHours: currentType === 'hospital' ? '24/7' : (currentType === 'clinic' ? '9:00 AM - 9:00 PM' : '8:00 AM - 10:00 PM'),
        emergencyAvailable: currentType === 'hospital' || currentType === 'pharmacy',
        ambulanceAvailable: currentType === 'hospital',
        acceptingNewPatients: true,
        imageUrl: null,
        distance: distance,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      generated.push(mockHospital);
    }
  });
  
  // Sort by distance
  return generated
    .filter((h) => h.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance);
};

module.exports = {
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
  generateMockNearbyHospitals,
};
