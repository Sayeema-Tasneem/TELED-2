/**
 * Medical Equipment Rotation Controller
 * Handles equipment discovery, availability, bookings, and history.
 */

const {
  getAllEquipment,
  getEquipmentById,
  getEquipmentSlots,
  bookEquipmentSlot,
  getUserEquipmentHistory,
  getEquipmentAreaSummary,
} = require('../models/equipment');

exports.getNearbyEquipment = (req, res) => {
  try {
    const {
      latitude,
      longitude,
      radius = 8,
      category = 'all',
      availability = 'all',
      query = '',
    } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required',
      });
    }

    const userLat = parseFloat(latitude);
    const userLon = parseFloat(longitude);
    const radiusKm = parseFloat(radius);

    if (Number.isNaN(userLat) || Number.isNaN(userLon) || Number.isNaN(radiusKm)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinate or radius values',
      });
    }

    const equipment = getAllEquipment(userLat, userLon, {
      radiusKm,
      category,
      availability,
      query,
    });

    return res.status(200).json({
      success: true,
      count: equipment.length,
      message: `Found ${equipment.length} equipment items nearby`,
      equipment,
    });
  } catch (error) {
    console.error('Error getting nearby equipment:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load nearby equipment',
      error: error.message,
    });
  }
};

exports.getEquipmentSummary = (req, res) => {
  try {
    const { latitude, longitude, radius = 8 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required',
      });
    }

    const userLat = parseFloat(latitude);
    const userLon = parseFloat(longitude);
    const radiusKm = parseFloat(radius);

    if (Number.isNaN(userLat) || Number.isNaN(userLon) || Number.isNaN(radiusKm)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinate or radius values',
      });
    }

    const summary = getEquipmentAreaSummary(userLat, userLon, radiusKm);

    return res.status(200).json({
      success: true,
      summary,
    });
  } catch (error) {
    console.error('Error getting equipment summary:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load equipment summary',
      error: error.message,
    });
  }
};

exports.getEquipmentDetails = (req, res) => {
  try {
    const { id } = req.params;
    const equipment = getEquipmentById(id);

    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: 'Equipment not found',
      });
    }

    return res.status(200).json({
      success: true,
      equipment,
    });
  } catch (error) {
    console.error('Error getting equipment details:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load equipment details',
      error: error.message,
    });
  }
};

exports.getEquipmentSlots = (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query;
    const slots = getEquipmentSlots(id, date);

    if (!slots) {
      return res.status(404).json({
        success: false,
        message: 'Equipment not found',
      });
    }

    return res.status(200).json({
      success: true,
      count: slots.length,
      slots,
    });
  } catch (error) {
    console.error('Error getting equipment slots:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load equipment slots',
      error: error.message,
    });
  }
};

exports.bookEquipment = (req, res) => {
  try {
    const { id } = req.params;
    const { userId, userName, date, slotId, purpose, contactPhone } = req.body;

    if (!userId || !userName || !date || !slotId) {
      return res.status(400).json({
        success: false,
        message: 'Required fields: userId, userName, date, slotId',
      });
    }

    const result = bookEquipmentSlot(id, {
      userId,
      userName,
      date,
      slotId,
      purpose,
      contactPhone,
    });

    if (result.error) {
      return res.status(result.status || 400).json({
        success: false,
        message: result.error,
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Equipment slot booked successfully',
      booking: result.booking,
      equipment: result.equipment,
    });
  } catch (error) {
    console.error('Error booking equipment slot:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to book equipment slot',
      error: error.message,
    });
  }
};

exports.getUserHistory = (req, res) => {
  try {
    const { userId } = req.params;
    const history = getUserEquipmentHistory(userId);

    return res.status(200).json({
      success: true,
      count: history.length,
      history,
    });
  } catch (error) {
    console.error('Error getting user equipment history:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load equipment history',
      error: error.message,
    });
  }
};