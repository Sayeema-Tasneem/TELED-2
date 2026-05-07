/**
 * Medicine Controller - Handle medicine reminder API requests
 * Manages medicine schedules, intake tracking, and reminders
 */

const medicineModel = require('../models/medicines');

module.exports = {
  /**
   * POST /api/medicines
   * Add a new medicine
   */
  addMedicine: (req, res) => {
    try {
      const { userId } = req.body;
      const medicineData = req.body;

      // Validation
      if (!userId || !medicineData.name || !medicineData.dosage || !medicineData.times) {
        return res.status(400).json({
          success: false,
          message: 'Required fields: userId, name, dosage, times',
        });
      }

      const medicine = medicineModel.addMedicine(userId, medicineData);

      return res.status(201).json({
        success: true,
        message: 'Medicine added successfully',
        medicine,
      });
    } catch (error) {
      console.error('Error adding medicine:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to add medicine',
        error: error.message,
      });
    }
  },

  /**
   * GET /api/medicines/:medicineId
   * Get medicine details
   */
  getMedicine: (req, res) => {
    try {
      const { medicineId } = req.params;

      const medicine = medicineModel.getMedicineById(medicineId);
      if (!medicine) {
        return res.status(404).json({
          success: false,
          message: 'Medicine not found',
        });
      }

      return res.status(200).json({
        success: true,
        medicine,
      });
    } catch (error) {
      console.error('Error getting medicine:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get medicine',
        error: error.message,
      });
    }
  },

  /**
   * GET /api/medicines/user/:userId
   * Get all medicines for a user
   */
  getUserMedicines: (req, res) => {
    try {
      const { userId } = req.params;

      const medicines = medicineModel.getUserMedicines(userId);

      return res.status(200).json({
        success: true,
        medicines,
        count: medicines.length,
      });
    } catch (error) {
      console.error('Error getting user medicines:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get medicines',
        error: error.message,
      });
    }
  },

  /**
   * GET /api/medicines/user/:userId/active
   * Get active medicines for a user
   */
  getActiveMedicines: (req, res) => {
    try {
      const { userId } = req.params;

      const medicines = medicineModel.getUserActiveMedicines(userId);

      return res.status(200).json({
        success: true,
        medicines,
        count: medicines.length,
      });
    } catch (error) {
      console.error('Error getting active medicines:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get active medicines',
        error: error.message,
      });
    }
  },

  /**
   * PUT /api/medicines/:medicineId
   * Update medicine details
   */
  updateMedicine: (req, res) => {
    try {
      const { medicineId } = req.params;
      const updateData = req.body;

      const medicine = medicineModel.updateMedicine(medicineId, updateData);
      if (!medicine) {
        return res.status(404).json({
          success: false,
          message: 'Medicine not found',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Medicine updated successfully',
        medicine,
      });
    } catch (error) {
      console.error('Error updating medicine:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update medicine',
        error: error.message,
      });
    }
  },

  /**
   * POST /api/medicines/:medicineId/intake
   * Record medicine intake
   */
  recordIntake: (req, res) => {
    try {
      const { medicineId } = req.params;
      const { date, scheduledTime } = req.body;

      if (!date || !scheduledTime) {
        return res.status(400).json({
          success: false,
          message: 'Date and scheduledTime are required',
        });
      }

      const medicine = medicineModel.markAsTaken(medicineId, date, scheduledTime);
      if (!medicine) {
        return res.status(404).json({
          success: false,
          message: 'Medicine not found',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Intake recorded successfully',
        medicine,
      });
    } catch (error) {
      console.error('Error recording intake:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to record intake',
        error: error.message,
      });
    }
  },

  /**
   * GET /api/medicines/:medicineId/history
   * Get intake history for a medicine
   */
  getIntakeHistory: (req, res) => {
    try {
      const { medicineId } = req.params;
      const days = parseInt(req.query.days) || 30;

      const history = medicineModel.getIntakeHistory(medicineId, days);
      if (!history) {
        return res.status(404).json({
          success: false,
          message: 'Medicine not found',
        });
      }

      return res.status(200).json({
        success: true,
        history,
      });
    } catch (error) {
      console.error('Error getting intake history:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get intake history',
        error: error.message,
      });
    }
  },

  /**
   * GET /api/medicines/user/:userId/today
   * Get today's medicines for a user
   */
  getTodaysMedicines: (req, res) => {
    try {
      const { userId } = req.params;
      const { date } = req.query;

      const medicines = medicineModel.getTodaysMedicines(userId, date);

      return res.status(200).json({
        success: true,
        medicines,
        count: medicines.length,
      });
    } catch (error) {
      console.error('Error getting today medicines:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get today medicines',
        error: error.message,
      });
    }
  },

  /**
   * PUT /api/medicines/:medicineId/pause
   * Pause a medicine
   */
  pauseMedicine: (req, res) => {
    try {
      const { medicineId } = req.params;

      const medicine = medicineModel.pauseMedicine(medicineId);
      if (!medicine) {
        return res.status(404).json({
          success: false,
          message: 'Medicine not found',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Medicine paused',
        medicine,
      });
    } catch (error) {
      console.error('Error pausing medicine:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to pause medicine',
        error: error.message,
      });
    }
  },

  /**
   * PUT /api/medicines/:medicineId/resume
   * Resume a medicine
   */
  resumeMedicine: (req, res) => {
    try {
      const { medicineId } = req.params;

      const medicine = medicineModel.resumeMedicine(medicineId);
      if (!medicine) {
        return res.status(404).json({
          success: false,
          message: 'Medicine not found',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Medicine resumed',
        medicine,
      });
    } catch (error) {
      console.error('Error resuming medicine:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to resume medicine',
        error: error.message,
      });
    }
  },

  /**
   * PUT /api/medicines/:medicineId/complete
   * Mark medicine as completed
   */
  completeMedicine: (req, res) => {
    try {
      const { medicineId } = req.params;

      const medicine = medicineModel.completeMedicine(medicineId);
      if (!medicine) {
        return res.status(404).json({
          success: false,
          message: 'Medicine not found',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Medicine marked as completed',
        medicine,
      });
    } catch (error) {
      console.error('Error completing medicine:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to complete medicine',
        error: error.message,
      });
    }
  },

  /**
   * DELETE /api/medicines/:medicineId
   * Delete a medicine
   */
  deleteMedicine: (req, res) => {
    try {
      const { medicineId } = req.params;

      const medicine = medicineModel.deleteMedicine(medicineId);
      if (!medicine) {
        return res.status(404).json({
          success: false,
          message: 'Medicine not found',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Medicine deleted',
        medicine,
      });
    } catch (error) {
      console.error('Error deleting medicine:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete medicine',
        error: error.message,
      });
    }
  },

  /**
   * GET /api/medicines/user/:userId/statistics
   * Get medicine statistics for a user
   */
  getMedicineStatistics: (req, res) => {
    try {
      const { userId } = req.params;

      const stats = medicineModel.getMedicineStatistics(userId);

      return res.status(200).json({
        success: true,
        statistics: stats,
      });
    } catch (error) {
      console.error('Error getting medicine statistics:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get statistics',
        error: error.message,
      });
    }
  },

  /**
   * PUT /api/medicines/:medicineId/note
   * Add note to medicine intake
   */
  addIntakeNote: (req, res) => {
    try {
      const { medicineId } = req.params;
      const { date, note } = req.body;

      if (!date || !note) {
        return res.status(400).json({
          success: false,
          message: 'Date and note are required',
        });
      }

      const medicine = medicineModel.addIntakeNote(medicineId, date, note);
      if (!medicine) {
        return res.status(404).json({
          success: false,
          message: 'Medicine not found',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Note added',
        medicine,
      });
    } catch (error) {
      console.error('Error adding note:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to add note',
        error: error.message,
      });
    }
  },
};
