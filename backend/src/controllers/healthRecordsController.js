/**
 * Health Records Controller - Handle health records API requests
 * Manages prescriptions, consultations, and health timeline
 */

const healthRecordsModel = require('../models/healthRecords');

module.exports = {
  /**
   * POST /api/health-records/prescriptions
   * Add a new prescription
   */
  addPrescription: (req, res) => {
    try {
      const { userId } = req.body;
      const prescriptionData = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'userId is required',
        });
      }

      const prescription = healthRecordsModel.addPrescription(
        userId,
        prescriptionData
      );

      return res.status(201).json({
        success: true,
        message: 'Prescription added successfully',
        prescription,
      });
    } catch (error) {
      console.error('Error adding prescription:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to add prescription',
        error: error.message,
      });
    }
  },

  /**
   * GET /api/health-records/prescriptions/:prescriptionId
   * Get prescription by ID
   */
  getPrescription: (req, res) => {
    try {
      const { prescriptionId } = req.params;

      const prescription = healthRecordsModel.getPrescriptionById(prescriptionId);
      if (!prescription) {
        return res.status(404).json({
          success: false,
          message: 'Prescription not found',
        });
      }

      return res.status(200).json({
        success: true,
        prescription,
      });
    } catch (error) {
      console.error('Error getting prescription:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get prescription',
        error: error.message,
      });
    }
  },

  /**
   * GET /api/health-records/user/:userId/prescriptions
   * Get all prescriptions for user
   */
  getUserPrescriptions: (req, res) => {
    try {
      const { userId } = req.params;

      const prescriptions = healthRecordsModel.getUserPrescriptions(userId);

      return res.status(200).json({
        success: true,
        prescriptions,
        count: prescriptions.length,
      });
    } catch (error) {
      console.error('Error getting prescriptions:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get prescriptions',
        error: error.message,
      });
    }
  },

  /**
   * GET /api/health-records/user/:userId/prescriptions/active
   * Get active prescriptions
   */
  getActivePrescriptions: (req, res) => {
    try {
      const { userId } = req.params;

      const prescriptions = healthRecordsModel.getActivePrescriptions(userId);

      return res.status(200).json({
        success: true,
        prescriptions,
        count: prescriptions.length,
      });
    } catch (error) {
      console.error('Error getting active prescriptions:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get active prescriptions',
        error: error.message,
      });
    }
  },

  /**
   * PUT /api/health-records/prescriptions/:prescriptionId
   * Update prescription
   */
  updatePrescription: (req, res) => {
    try {
      const { prescriptionId } = req.params;
      const updateData = req.body;

      const prescription = healthRecordsModel.updatePrescription(
        prescriptionId,
        updateData
      );
      if (!prescription) {
        return res.status(404).json({
          success: false,
          message: 'Prescription not found',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Prescription updated successfully',
        prescription,
      });
    } catch (error) {
      console.error('Error updating prescription:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update prescription',
        error: error.message,
      });
    }
  },

  /**
   * DELETE /api/health-records/prescriptions/:prescriptionId
   * Delete prescription
   */
  deletePrescription: (req, res) => {
    try {
      const { prescriptionId } = req.params;

      const prescription = healthRecordsModel.deletePrescription(prescriptionId);
      if (!prescription) {
        return res.status(404).json({
          success: false,
          message: 'Prescription not found',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Prescription deleted',
        prescription,
      });
    } catch (error) {
      console.error('Error deleting prescription:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete prescription',
        error: error.message,
      });
    }
  },

  /**
   * POST /api/health-records/consultations
   * Add a new consultation
   */
  addConsultation: (req, res) => {
    try {
      const { userId } = req.body;
      const consultationData = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'userId is required',
        });
      }

      const consultation = healthRecordsModel.addConsultation(
        userId,
        consultationData
      );

      return res.status(201).json({
        success: true,
        message: 'Consultation added successfully',
        consultation,
      });
    } catch (error) {
      console.error('Error adding consultation:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to add consultation',
        error: error.message,
      });
    }
  },

  /**
   * GET /api/health-records/consultations/:consultationId
   * Get consultation by ID
   */
  getConsultation: (req, res) => {
    try {
      const { consultationId } = req.params;

      const consultation = healthRecordsModel.getConsultationById(consultationId);
      if (!consultation) {
        return res.status(404).json({
          success: false,
          message: 'Consultation not found',
        });
      }

      return res.status(200).json({
        success: true,
        consultation,
      });
    } catch (error) {
      console.error('Error getting consultation:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get consultation',
        error: error.message,
      });
    }
  },

  /**
   * GET /api/health-records/user/:userId/consultations
   * Get all consultations for user
   */
  getUserConsultations: (req, res) => {
    try {
      const { userId } = req.params;

      const consultations = healthRecordsModel.getUserConsultations(userId);

      return res.status(200).json({
        success: true,
        consultations,
        count: consultations.length,
      });
    } catch (error) {
      console.error('Error getting consultations:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get consultations',
        error: error.message,
      });
    }
  },

  /**
   * GET /api/health-records/user/:userId/consultations/recent
   * Get recent consultations
   */
  getRecentConsultations: (req, res) => {
    try {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit) || 10;

      const consultations = healthRecordsModel.getRecentConsultations(userId, limit);

      return res.status(200).json({
        success: true,
        consultations,
        count: consultations.length,
      });
    } catch (error) {
      console.error('Error getting recent consultations:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get recent consultations',
        error: error.message,
      });
    }
  },

  /**
   * PUT /api/health-records/consultations/:consultationId
   * Update consultation
   */
  updateConsultation: (req, res) => {
    try {
      const { consultationId } = req.params;
      const updateData = req.body;

      const consultation = healthRecordsModel.updateConsultation(
        consultationId,
        updateData
      );
      if (!consultation) {
        return res.status(404).json({
          success: false,
          message: 'Consultation not found',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Consultation updated successfully',
        consultation,
      });
    } catch (error) {
      console.error('Error updating consultation:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update consultation',
        error: error.message,
      });
    }
  },

  /**
   * DELETE /api/health-records/consultations/:consultationId
   * Delete consultation
   */
  deleteConsultation: (req, res) => {
    try {
      const { consultationId } = req.params;

      const consultation = healthRecordsModel.deleteConsultation(consultationId);
      if (!consultation) {
        return res.status(404).json({
          success: false,
          message: 'Consultation not found',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Consultation deleted',
        consultation,
      });
    } catch (error) {
      console.error('Error deleting consultation:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete consultation',
        error: error.message,
      });
    }
  },

  /**
   * GET /api/health-records/user/:userId/timeline
   * Get health timeline
   */
  getHealthTimeline: (req, res) => {
    try {
      const { userId } = req.params;
      const monthsBack = parseInt(req.query.months) || 12;

      const timeline = healthRecordsModel.getHealthTimeline(userId, monthsBack);

      return res.status(200).json({
        success: true,
        timeline,
        count: timeline.length,
      });
    } catch (error) {
      console.error('Error getting health timeline:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get health timeline',
        error: error.message,
      });
    }
  },

  /**
   * GET /api/health-records/user/:userId/timeline/:type
   * Get health timeline by type
   */
  getHealthTimelineByType: (req, res) => {
    try {
      const { userId, type } = req.params;

      const timeline = healthRecordsModel.getHealthTimelineByType(userId, type);

      return res.status(200).json({
        success: true,
        timeline,
        count: timeline.length,
      });
    } catch (error) {
      console.error('Error getting health timeline by type:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get health timeline by type',
        error: error.message,
      });
    }
  },

  /**
   * GET /api/health-records/user/:userId/summary
   * Get health records summary
   */
  getHealthRecordsSummary: (req, res) => {
    try {
      const { userId } = req.params;

      const summary = healthRecordsModel.getHealthRecordsSummary(userId);

      return res.status(200).json({
        success: true,
        summary,
      });
    } catch (error) {
      console.error('Error getting health records summary:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get health records summary',
        error: error.message,
      });
    }
  },

  /**
   * GET /api/health-records/user/:userId/search
   * Search health records
   */
  searchHealthRecords: (req, res) => {
    try {
      const { userId } = req.params;
      const { q } = req.query;

      if (!q || q.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Search query is required',
        });
      }

      const results = healthRecordsModel.searchHealthRecords(userId, q);

      return res.status(200).json({
        success: true,
        results,
        count: results.length,
      });
    } catch (error) {
      console.error('Error searching health records:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to search health records',
        error: error.message,
      });
    }
  },
};
