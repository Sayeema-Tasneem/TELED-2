const { now, mapDoc, getCollection } = require('./firestoreHelpers');

const COLLECTION = 'hospitals';

const getHospitalsCollection = () => getCollection(COLLECTION);

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

const getAllHospitals = async () => {
  const snapshot = await getHospitalsCollection().orderBy('name', 'asc').get();
  return snapshot.docs.map(mapDoc);
};

const getHospitalById = async (hospitalId) => {
  const doc = await getHospitalsCollection().doc(hospitalId).get();
  return doc.exists ? mapDoc(doc) : null;
};

const addHospital = async (hospitalData) => {
  const docRef = getHospitalsCollection().doc();
  await docRef.set({
    ...hospitalData,
    createdAt: now(),
    updatedAt: now(),
  });
  return mapDoc(await docRef.get());
};

const updateHospital = async (hospitalId, updateData) => {
  const docRef = getHospitalsCollection().doc(hospitalId);
  await docRef.update({
    ...updateData,
    updatedAt: now(),
  });
  return getHospitalById(hospitalId);
};

const deleteHospital = async (hospitalId) => {
  const hospital = await getHospitalById(hospitalId);
  if (!hospital) {
    return null;
  }
  await getHospitalsCollection().doc(hospitalId).delete();
  return hospital;
};

const getHospitalsByType = async (type) => {
  const snapshot = await getHospitalsCollection().where('type', '==', type).get();
  return snapshot.docs.map(mapDoc);
};

const getHospitalsByCity = async (city) => {
  const snapshot = await getHospitalsCollection().where('city', '==', city).get();
  return snapshot.docs.map(mapDoc);
};

const searchHospitals = async (query) => {
  const normalizedQuery = query.toLowerCase();
  const hospitals = await getAllHospitals();
  return hospitals.filter(
    (hospital) =>
      hospital.name.toLowerCase().includes(normalizedQuery) ||
      hospital.city.toLowerCase().includes(normalizedQuery) ||
      (hospital.services || []).some((service) => service.toLowerCase().includes(normalizedQuery))
  );
};

const getTopRatedHospitals = async (minRating = 4, limit = 10) => {
  const snapshot = await getHospitalsCollection()
    .where('rating', '>=', minRating)
    .orderBy('rating', 'desc')
    .limit(limit)
    .get();
  return snapshot.docs.map(mapDoc);
};

const getNearbyHospitals = async (userLat, userLon, radiusKm = 5, type = 'all') => {
  const hospitals = await getAllHospitals();
  return hospitals
    .map((hospital) => ({
      ...hospital,
      distance: calculateDistance(userLat, userLon, hospital.latitude, hospital.longitude),
    }))
    .filter((hospital) => hospital.distance <= radiusKm)
    .filter((hospital) => (type === 'all' ? true : hospital.type === type))
    .sort((a, b) => a.distance - b.distance);
};

const getHospitalsByServices = async (services, userLat, userLon, radiusKm = 5) => {
  const nearby = await getNearbyHospitals(userLat, userLon, radiusKm, 'all');
  return nearby.filter((hospital) =>
    services.every((service) => (hospital.services || []).includes(service))
  );
};

const getEmergencyHospitals = async (userLat, userLon, radiusKm = 10) => {
  const nearby = await getNearbyHospitals(userLat, userLon, radiusKm, 'all');
  return nearby.filter((hospital) => hospital.emergencyAvailable === true);
};

const getHospitalsWithAmbulance = async (userLat, userLon, radiusKm = 10) => {
  const nearby = await getNearbyHospitals(userLat, userLon, radiusKm, 'all');
  return nearby.filter((hospital) => hospital.ambulanceAvailable === true);
};

module.exports = {
  calculateDistance,
  getAllHospitals,
  getHospitalById,
  addHospital,
  updateHospital,
  deleteHospital,
  getHospitalsByType,
  getHospitalsByCity,
  searchHospitals,
  getTopRatedHospitals,
  getNearbyHospitals,
  getHospitalsByServices,
  getEmergencyHospitals,
  getHospitalsWithAmbulance,
};