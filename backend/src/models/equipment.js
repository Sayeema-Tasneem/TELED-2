/**
 * Medical Equipment Rotation Model
 * Provides in-memory equipment inventory, slot booking, availability tracking,
 * distance-based discovery, and user booking history.
 */

const { v4: uuidv4 } = require('uuid');

const createDateString = (dayOffset = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  return date.toISOString().split('T')[0];
};

const createDailySlots = (dayOffset) => {
  const date = createDateString(dayOffset);
  const timeRanges = [
    ['09:00', '10:00'],
    ['10:30', '11:30'],
    ['12:00', '13:00'],
    ['14:00', '15:00'],
    ['15:30', '16:30'],
    ['17:00', '18:00'],
  ];

  return timeRanges.map(([startTime, endTime]) => ({
    id: `slot_${uuidv4().slice(0, 8)}`,
    date,
    startTime,
    endTime,
    status: 'available',
    bookedBy: null,
    bookingId: null,
  }));
};

const buildSlots = () => {
  const slots = [];
  for (let day = 0; day < 5; day += 1) {
    slots.push(...createDailySlots(day));
  }
  return slots;
};

let equipmentInventory = [
  {
    id: 'equip_oxygen_1',
    name: 'Portable Oxygen Concentrator',
    category: 'respiratory',
    description: 'Battery-backed oxygen concentrator for short-term respiratory support.',
    providerName: 'Apollo Hospital Outreach Van',
    ownerType: 'hospital',
    address: '123 Main St, Bangalore, KA 560001',
    city: 'Bangalore',
    state: 'Karnataka',
    latitude: 12.9716,
    longitude: 77.5946,
    contactPhone: '+91-80-40961000',
    totalUnits: 3,
    tags: ['oxygen', 'portable', 'respiratory'],
    condition: 'Excellent',
    depositAmount: 500,
    usageInstructions: 'Use only with prescribed flow rate settings. Clean tubing after every use.',
    maintenanceStatus: 'ready',
    imageUrl: 'https://example.com/equipment/oxygen.jpg',
    timeSlots: buildSlots(),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'equip_nebulizer_1',
    name: 'Community Nebulizer Kit',
    category: 'respiratory',
    description: 'Nebulizer with reusable mask set for asthma and COPD support.',
    providerName: 'Quick Care Clinic',
    ownerType: 'clinic',
    address: '987 Wellness Blvd, Bangalore, KA 560009',
    city: 'Bangalore',
    state: 'Karnataka',
    latitude: 12.9316,
    longitude: 77.6268,
    contactPhone: '+91-80-35552200',
    totalUnits: 4,
    tags: ['asthma', 'nebulizer', 'breathing'],
    condition: 'Good',
    depositAmount: 250,
    usageInstructions: 'Sterilize mask cup after each use and return kit within booked window.',
    maintenanceStatus: 'ready',
    imageUrl: 'https://example.com/equipment/nebulizer.jpg',
    timeSlots: buildSlots(),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'equip_glucometer_1',
    name: 'Digital Glucometer Pack',
    category: 'diagnostic',
    description: 'Glucometer with strips for short-duration blood glucose monitoring.',
    providerName: 'Life Care Pharmacy',
    ownerType: 'pharmacy',
    address: '321 Medical Street, Bangalore, KA 560004',
    city: 'Bangalore',
    state: 'Karnataka',
    latitude: 12.9698,
    longitude: 77.5997,
    contactPhone: '+91-80-26567890',
    totalUnits: 6,
    tags: ['diabetes', 'glucometer', 'home test'],
    condition: 'Excellent',
    depositAmount: 150,
    usageInstructions: 'Use fresh strips and keep the device dry after use.',
    maintenanceStatus: 'ready',
    imageUrl: 'https://example.com/equipment/glucometer.jpg',
    timeSlots: buildSlots(),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'equip_wheelchair_1',
    name: 'Foldable Wheelchair',
    category: 'mobility',
    description: 'Compact wheelchair for transport within villages and hospital visits.',
    providerName: 'Fortis Hospital Mobility Desk',
    ownerType: 'hospital',
    address: '456 Park Road, Bangalore, KA 560008',
    city: 'Bangalore',
    state: 'Karnataka',
    latitude: 12.9352,
    longitude: 77.6245,
    contactPhone: '+91-80-40611666',
    totalUnits: 2,
    tags: ['mobility', 'wheelchair', 'transport'],
    condition: 'Good',
    depositAmount: 400,
    usageInstructions: 'Lock brakes during transfers and return the footrests with the chair.',
    maintenanceStatus: 'ready',
    imageUrl: 'https://example.com/equipment/wheelchair.jpg',
    timeSlots: buildSlots(),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'equip_bp_1',
    name: 'Digital BP Monitor',
    category: 'diagnostic',
    description: 'Upper-arm blood pressure monitor for home tracking and community camps.',
    providerName: 'Dr. Sharma Clinic',
    ownerType: 'clinic',
    address: '789 Health Ave, Bangalore, KA 560010',
    city: 'Bangalore',
    state: 'Karnataka',
    latitude: 12.9549,
    longitude: 77.6499,
    contactPhone: '+91-80-23456789',
    totalUnits: 5,
    tags: ['blood pressure', 'diagnostic', 'cardiac'],
    condition: 'Excellent',
    depositAmount: 100,
    usageInstructions: 'Sit calmly for five minutes before using the cuff for consistent readings.',
    maintenanceStatus: 'ready',
    imageUrl: 'https://example.com/equipment/bp-monitor.jpg',
    timeSlots: buildSlots(),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

let equipmentBookings = [];

/**
 * Calculate distance between two coordinates in kilometers.
 */
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

const getEquipmentById = (equipmentId) => {
  return equipmentInventory.find((item) => item.id === equipmentId) || null;
};

const getSlotsForDate = (equipment, date) => {
  return equipment.timeSlots.filter((slot) => slot.date === date);
};

const findNextAvailableSlot = (equipment) => {
  const slot = equipment.timeSlots.find((item) => item.status === 'available');
  if (!slot) {
    return null;
  }

  return {
    id: slot.id,
    date: slot.date,
    startTime: slot.startTime,
    endTime: slot.endTime,
  };
};

const enrichEquipment = (equipment, userLat = null, userLon = null) => {
  const availableSlots = equipment.timeSlots.filter((slot) => slot.status === 'available');
  const bookedSlots = equipment.timeSlots.filter((slot) => slot.status === 'booked');
  const today = createDateString(0);
  const todaySlots = equipment.timeSlots.filter((slot) => slot.date === today);
  const todayAvailableSlots = todaySlots.filter((slot) => slot.status === 'available');
  const distance =
    typeof userLat === 'number' && typeof userLon === 'number'
      ? calculateDistance(userLat, userLon, equipment.latitude, equipment.longitude)
      : null;

  return {
    ...equipment,
    distance,
    availability: {
      status: availableSlots.length > 0 ? 'available' : 'fully_booked',
      availableSlotsCount: availableSlots.length,
      bookedSlotsCount: bookedSlots.length,
      todayAvailableSlots: todayAvailableSlots.length,
      totalSlotsCount: equipment.timeSlots.length,
      nextAvailableSlot: findNextAvailableSlot(equipment),
    },
  };
};

const getAllEquipment = (userLat = null, userLon = null, filters = {}) => {
  const { radiusKm = null, category = 'all', availability = 'all', query = '' } = filters;
  const normalizedQuery = query.trim().toLowerCase();

  return equipmentInventory
    .map((item) => enrichEquipment(item, userLat, userLon))
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
        item.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery))
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

const getEquipmentSlots = (equipmentId, date = null) => {
  const equipment = getEquipmentById(equipmentId);
  if (!equipment) {
    return null;
  }

  const slots = date ? getSlotsForDate(equipment, date) : equipment.timeSlots;
  return slots.map((slot) => ({
    ...slot,
    equipmentId,
  }));
};

const bookEquipmentSlot = (equipmentId, bookingData) => {
  const equipment = getEquipmentById(equipmentId);
  if (!equipment) {
    return { error: 'Equipment not found', status: 404 };
  }

  const { userId, userName, date, slotId, purpose = '', contactPhone = '' } = bookingData;
  const slot = equipment.timeSlots.find((item) => item.id === slotId && item.date === date);

  if (!slot) {
    return { error: 'Selected slot not found', status: 404 };
  }

  if (slot.status === 'booked') {
    return { error: 'Selected slot is already booked', status: 400 };
  }

  const bookingId = `booking_${uuidv4().slice(0, 10)}`;
  slot.status = 'booked';
  slot.bookedBy = userId;
  slot.bookingId = bookingId;

  const booking = {
    id: bookingId,
    equipmentId,
    equipmentName: equipment.name,
    providerName: equipment.providerName,
    userId,
    userName,
    contactPhone,
    date,
    slotId,
    startTime: slot.startTime,
    endTime: slot.endTime,
    purpose,
    address: equipment.address,
    latitude: equipment.latitude,
    longitude: equipment.longitude,
    status: 'confirmed',
    createdAt: new Date(),
  };

  equipmentBookings.push(booking);
  equipment.updatedAt = new Date();

  return {
    booking,
    equipment: enrichEquipment(equipment),
  };
};

const getUserEquipmentHistory = (userId) => {
  return equipmentBookings
    .filter((booking) => booking.userId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

const getEquipmentAreaSummary = (userLat, userLon, radiusKm = 5) => {
  const nearby = getAllEquipment(userLat, userLon, { radiusKm });
  const availableNow = nearby.filter((item) => item.availability.status === 'available').length;
  const categories = nearby.reduce(
    (summary, item) => {
      summary[item.category] = (summary[item.category] || 0) + 1;
      return summary;
    },
    {}
  );

  return {
    total: nearby.length,
    availableNow,
    respiratory: categories.respiratory || 0,
    diagnostic: categories.diagnostic || 0,
    mobility: categories.mobility || 0,
    radiusKm,
  };
};

module.exports = {
  calculateDistance,
  getAllEquipment,
  getEquipmentById,
  getEquipmentSlots,
  bookEquipmentSlot,
  getUserEquipmentHistory,
  getEquipmentAreaSummary,
};