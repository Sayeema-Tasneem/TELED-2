/**
 * Health Records Controller - Handle health records API requests
 * Manages prescriptions, consultations, and health timeline
 */

const healthRecordsModel = require('../models/healthRecords');

module.exports = {
  /**
   * GET /api/health-records/videos/library
   * List curated video library
   */
  listVideoLibrary: (req, res) => {
    try {
      const { category, tag, condition, q } = req.query;
      const videos = healthRecordsModel.listVideoLibrary({ category, tag, condition, q });

      return res.status(200).json({
        success: true,
        videos,
        count: videos.length,
      });
    } catch (error) {
      console.error('Error listing video library:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to list video library',
        error: error.message,
      });
    }
  },

  /**
   * POST /api/health-records/videos/library
   * Add curated video
   */
  addVideoToLibrary: (req, res) => {
    try {
      const { title, youtubeEmbedUrl } = req.body;

      if (!title || !youtubeEmbedUrl) {
        return res.status(400).json({
          success: false,
          message: 'title and youtubeEmbedUrl are required',
        });
      }

      const video = healthRecordsModel.addVideoToLibrary(req.body);
      return res.status(201).json({
        success: true,
        message: 'Video added to library',
        video,
      });
    } catch (error) {
      console.error('Error adding video to library:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to add video to library',
        error: error.message,
      });
    }
  },

  /**
   * PUT /api/health-records/videos/library/:videoId
   * Update curated video
   */
  updateVideoInLibrary: (req, res) => {
    try {
      const { videoId } = req.params;
      const video = healthRecordsModel.updateVideoInLibrary(videoId, req.body);

      if (!video) {
        return res.status(404).json({
          success: false,
          message: 'Video not found',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Video updated',
        video,
      });
    } catch (error) {
      console.error('Error updating video in library:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update video in library',
        error: error.message,
      });
    }
  },

  /**
   * DELETE /api/health-records/videos/library/:videoId
   * Delete curated video
   */
  deleteVideoFromLibrary: (req, res) => {
    try {
      const { videoId } = req.params;
      const video = healthRecordsModel.deleteVideoFromLibrary(videoId);

      if (!video) {
        return res.status(404).json({
          success: false,
          message: 'Video not found',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Video deleted from library',
        video,
      });
    } catch (error) {
      console.error('Error deleting video from library:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete video from library',
        error: error.message,
      });
    }
  },

  /**
   * POST /api/health-records/videos/assignments
   * Doctor assigns video to patient
   */
  assignVideoToPatient: (req, res) => {
    try {
      const { userId, videoId } = req.body;

      if (!userId || !videoId) {
        return res.status(400).json({
          success: false,
          message: 'userId and videoId are required',
        });
      }

      const assignment = healthRecordsModel.assignVideoToPatient(req.body);

      return res.status(201).json({
        success: true,
        message: 'Video assigned to patient',
        notification: {
          type: 'video_assignment',
          sent: assignment.notificationSent,
          recipientUserId: assignment.userId,
        },
        assignment,
      });
    } catch (error) {
      console.error('Error assigning video to patient:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to assign video to patient',
        error: error.message,
      });
    }
  },

  /**
   * GET /api/health-records/user/:userId/videos
   * List patient assigned videos
   */
  getUserAssignedVideos: (req, res) => {
    try {
      const { userId } = req.params;
      const { status } = req.query;
      const assignments = healthRecordsModel.getUserAssignedVideos(userId, status || '');

      return res.status(200).json({
        success: true,
        assignments,
        count: assignments.length,
      });
    } catch (error) {
      console.error('Error getting user assigned videos:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get user assigned videos',
        error: error.message,
      });
    }
  },

  /**
   * PUT /api/health-records/videos/assignments/:assignmentId/progress
   * Update watch progress from app/IFrame events
   */
  updateAssignedVideoProgress: (req, res) => {
    try {
      const { assignmentId } = req.params;
      const assignment = healthRecordsModel.updateAssignedVideoProgress(
        assignmentId,
        req.body
      );

      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: 'Video assignment not found',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Watch progress updated',
        assignment,
      });
    } catch (error) {
      console.error('Error updating assigned video progress:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update assigned video progress',
        error: error.message,
      });
    }
  },

  /**
   * GET /api/health-records/doctor/:doctorId/videos
   * Doctor dashboard for video completion tracking
   */
  getDoctorAssignedVideos: (req, res) => {
    try {
      const { doctorId } = req.params;
      const { userId, status } = req.query;
      const assignments = healthRecordsModel.getDoctorAssignedVideos(
        doctorId,
        userId || '',
        status || ''
      );

      const completedCount = assignments.filter((item) => item.status === 'completed').length;
      const averageWatchPercentage = assignments.length > 0
        ? Math.round(
          assignments.reduce((sum, item) => sum + Number(item.watchPercentage || 0), 0) /
              assignments.length
        )
        : 0;

      return res.status(200).json({
        success: true,
        assignments,
        count: assignments.length,
        summary: {
          completedCount,
          averageWatchPercentage,
        },
      });
    } catch (error) {
      console.error('Error getting doctor assigned videos:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get doctor assigned videos',
        error: error.message,
      });
    }
  },

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
