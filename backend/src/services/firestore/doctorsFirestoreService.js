const { now, mapDoc, getCollection } = require('./firestoreHelpers');

const COLLECTION = 'doctors';

const getDoctorsCollection = () => getCollection(COLLECTION);
const getAvailabilityCollection = (doctorId) =>
  getDoctorsCollection().doc(doctorId).collection('availability');

const getAllDoctors = async () => {
  const snapshot = await getDoctorsCollection().orderBy('name', 'asc').get();
  return snapshot.docs.map(mapDoc);
};

const getDoctorById = async (doctorId) => {
  const doc = await getDoctorsCollection().doc(doctorId).get();
  return doc.exists ? mapDoc(doc) : null;
};

const setAvailabilityForDate = async (doctorId, date, slots = []) => {
  await getAvailabilityCollection(doctorId)
    .doc(date)
    .set({
      date,
      slots,
      updatedAt: now(),
    });

  return getAvailabilityForDate(doctorId, date);
};

const getAvailabilityForDate = async (doctorId, date) => {
  const doc = await getAvailabilityCollection(doctorId).doc(date).get();
  return doc.exists ? mapDoc(doc) : null;
};

const getAvailableSlots = async (doctorId, date) => {
  const availability = await getAvailabilityForDate(doctorId, date);
  return availability ? (availability.slots || []).filter((slot) => slot.available) : [];
};

const updateSlotAvailability = async (doctorId, date, time, available) => {
  const docRef = getAvailabilityCollection(doctorId).doc(date);
  const doc = await docRef.get();

  if (!doc.exists) {
    return false;
  }

  const data = doc.data();
  const updatedSlots = (data.slots || []).map((slot) =>
    slot.time === time ? { ...slot, available } : slot
  );

  await docRef.update({
    slots: updatedSlots,
    updatedAt: now(),
  });

  return true;
};

const bookSlot = async (doctorId, date, time) => updateSlotAvailability(doctorId, date, time, false);
const releaseSlot = async (doctorId, date, time) => updateSlotAvailability(doctorId, date, time, true);

module.exports = {
  getAllDoctors,
  getDoctorById,
  setAvailabilityForDate,
  getAvailabilityForDate,
  getAvailableSlots,
  bookSlot,
  releaseSlot,
};