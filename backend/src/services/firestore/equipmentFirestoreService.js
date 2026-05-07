const { admin, now, mapDoc, getCollection } = require('./firestoreHelpers');
const { calculateDistance } = require('./hospitalsFirestoreService');

const EQUIPMENT_COLLECTION = 'equipment';
const BOOKINGS_COLLECTION = 'equipmentBookings';

const getEquipmentCollection = () => getCollection(EQUIPMENT_COLLECTION);
const getEquipmentSlotsCollection = (equipmentId) =>
  getCollection(`equipment/${equipmentId}/slots`);
const getEquipmentBookingsCollection = () => getCollection(BOOKINGS_COLLECTION);
const getUserEquipmentBookingsCollection = (userId) =>
  getCollection(`users/${userId}/equipmentBookings`);

const getEquipmentById = async (equipmentId) => {
  const doc = await getEquipmentCollection().doc(equipmentId).get();
  return doc.exists ? mapDoc(doc) : null;
};

const getEquipmentSlots = async (equipmentId, date = null) => {
  let query = getEquipmentSlotsCollection(equipmentId).orderBy('date', 'asc').orderBy('startTime', 'asc');
  if (date) {
    query = getEquipmentSlotsCollection(equipmentId)
      .where('date', '==', date)
      .orderBy('startTime', 'asc');
  }
  const snapshot = await query.get();
  return snapshot.docs.map(mapDoc);
};

const getAllEquipment = async (userLat = null, userLon = null, filters = {}) => {
  const { radiusKm = null, category = 'all', availability = 'all', query = '' } = filters;
  const normalizedQuery = query.trim().toLowerCase();
  const snapshot = await getEquipmentCollection().get();

  const equipment = await Promise.all(
    snapshot.docs.map(async (doc) => {
      const item = mapDoc(doc);
      const slots = await getEquipmentSlots(item.id);
      const availableSlots = slots.filter((slot) => slot.status === 'available');
      const bookedSlots = slots.filter((slot) => slot.status === 'booked');
      const today = new Date().toISOString().split('T')[0];
      const nextAvailableSlot = availableSlots[0] || null;
      return {
        ...item,
        distance:
          typeof userLat === 'number' && typeof userLon === 'number'
            ? calculateDistance(userLat, userLon, item.latitude, item.longitude)
            : null,
        availability: {
          status: availableSlots.length > 0 ? 'available' : 'fully_booked',
          availableSlotsCount: availableSlots.length,
          bookedSlotsCount: bookedSlots.length,
          todayAvailableSlots: availableSlots.filter((slot) => slot.date === today).length,
          totalSlotsCount: slots.length,
          nextAvailableSlot,
        },
      };
    })
  );

  return equipment
    .filter((item) => (category === 'all' ? true : item.category === category))
    .filter((item) => (availability === 'all' ? true : item.availability.status === availability))
    .filter((item) => {
      if (!normalizedQuery) {
        return true;
      }

      return (
        item.name.toLowerCase().includes(normalizedQuery) ||
        item.providerName.toLowerCase().includes(normalizedQuery) ||
        item.address.toLowerCase().includes(normalizedQuery) ||
        (item.tags || []).some((tag) => tag.toLowerCase().includes(normalizedQuery))
      );
    })
    .filter((item) => {
      if (typeof radiusKm !== 'number' || Number.isNaN(radiusKm) || item.distance === null) {
        return true;
      }
      return item.distance <= radiusKm;
    })
    .sort((a, b) => {
      if (a.distance === null || b.distance === null) {
        return a.name.localeCompare(b.name);
      }
      return a.distance - b.distance;
    });
};

const bookEquipmentSlot = async (equipmentId, bookingData) => {
  const slotRef = getEquipmentSlotsCollection(equipmentId).doc(bookingData.slotId);
  const bookingRef = getEquipmentBookingsCollection().doc();
  const userBookingRef = getUserEquipmentBookingsCollection(bookingData.userId).doc(bookingRef.id);

  await admin.firestore().runTransaction(async (transaction) => {
    const slotDoc = await transaction.get(slotRef);
    const equipmentDoc = await transaction.get(getEquipmentCollection().doc(equipmentId));

    if (!equipmentDoc.exists) {
      throw new Error('Equipment not found');
    }
    if (!slotDoc.exists) {
      throw new Error('Selected slot not found');
    }

    const slotData = slotDoc.data();
    if (slotData.status === 'booked') {
      throw new Error('Selected slot is already booked');
    }

    transaction.update(slotRef, {
      status: 'booked',
      bookedBy: bookingData.userId,
      bookingId: bookingRef.id,
      updatedAt: now(),
    });

    const equipmentData = equipmentDoc.data();
    const bookingPayload = {
      equipmentId,
      equipmentName: equipmentData.name,
      providerName: equipmentData.providerName,
      userId: bookingData.userId,
      userName: bookingData.userName,
      contactPhone: bookingData.contactPhone || '',
      date: bookingData.date,
      slotId: bookingData.slotId,
      startTime: slotData.startTime,
      endTime: slotData.endTime,
      purpose: bookingData.purpose || '',
      address: equipmentData.address,
      latitude: equipmentData.latitude,
      longitude: equipmentData.longitude,
      status: 'confirmed',
      createdAt: now(),
    };

    transaction.set(bookingRef, bookingPayload);
    transaction.set(userBookingRef, bookingPayload);
    transaction.update(getEquipmentCollection().doc(equipmentId), {
      updatedAt: now(),
    });
  });

  return mapDoc(await bookingRef.get());
};

const getUserEquipmentHistory = async (userId) => {
  const snapshot = await getUserEquipmentBookingsCollection(userId)
    .orderBy('createdAt', 'desc')
    .get();
  return snapshot.docs.map(mapDoc);
};

const getEquipmentAreaSummary = async (userLat, userLon, radiusKm = 5) => {
  const equipment = await getAllEquipment(userLat, userLon, { radiusKm });
  const categories = equipment.reduce(
    (summary, item) => {
      summary[item.category] = (summary[item.category] || 0) + 1;
      return summary;
    },
    {}
  );

  return {
    total: equipment.length,
    availableNow: equipment.filter((item) => item.availability.status === 'available').length,
    respiratory: categories.respiratory || 0,
    diagnostic: categories.diagnostic || 0,
    mobility: categories.mobility || 0,
    radiusKm,
  };
};

module.exports = {
  getEquipmentById,
  getEquipmentSlots,
  getAllEquipment,
  bookEquipmentSlot,
  getUserEquipmentHistory,
  getEquipmentAreaSummary,
};