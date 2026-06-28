/**
 * Health Records Model - Store prescriptions, consultations, and health events
 * Manages complete health history timeline for users
 */

let prescriptions = {
  // Prescription ID -> Prescription object
};

let consultations = {
  // Consultation ID -> Consultation object
};

let healthTimeline = {
  // User ID -> Array of health events (sorted by date)
};

let videoLibrary = {
  // Video ID -> Video object
};

let videoAssignments = {
  // Assignment ID -> Assignment object
};

// Generate unique IDs
const generatePrescriptionId = () => {
  return `rx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const generateConsultationId = () => {
  return `cons_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const generateHealthEventId = () => {
  return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const generateVideoId = () => {
  return `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const generateVideoAssignmentId = () => {
  return `vassign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const clampPercentage = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(100, numeric));
};

const seedCuratedVideos = () => {
  const seededVideos = [
    {
      id: 'lib_cpr_basics',
      title: 'Hands-Only CPR Basics',
      category: 'Emergency first aid',
      tags: ['cpr', 'emergency', 'cardiac'],
      thumbnail: 'https://img.youtube.com/vi/-NodDRTsV88/hqdefault.jpg',
      youtubeEmbedUrl: 'https://www.youtube.com/embed/-NodDRTsV88',
      targetCondition: 'Cardiac arrest',
      recommendedByDoctor: false,
      captionsAvailable: true,
      playbackSpeeds: [0.75, 1, 1.25, 1.5],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'lib_choking_response',
      title: 'Adult Choking Response',
      category: 'Emergency first aid',
      tags: ['choking', 'heimlich', 'emergency'],
      thumbnail: 'https://img.youtube.com/vi/7CgtIgSyAiU/hqdefault.jpg',
      youtubeEmbedUrl: 'https://www.youtube.com/embed/7CgtIgSyAiU',
      targetCondition: 'Airway obstruction',
      recommendedByDoctor: false,
      captionsAvailable: true,
      playbackSpeeds: [0.75, 1, 1.25, 1.5],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'lib_asthma_breathing',
      title: 'Breathing Exercises for Asthma',
      category: 'Breathing & lungs',
      tags: ['asthma', 'breathing', 'lungs'],
      thumbnail: 'https://img.youtube.com/vi/DG_0P5MriqY/hqdefault.jpg',
      youtubeEmbedUrl: 'https://www.youtube.com/embed/DG_0P5MriqY',
      targetCondition: 'Asthma',
      recommendedByDoctor: false,
      captionsAvailable: true,
      playbackSpeeds: [0.75, 1, 1.25, 1.5],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'lib_low_back_rehab',
      title: 'Lower Back Rehab Routine',
      category: 'Rehabilitation',
      tags: ['back pain', 'rehab', 'exercise'],
      thumbnail: 'https://img.youtube.com/vi/4BOTvaRaDjI/hqdefault.jpg',
      youtubeEmbedUrl: 'https://www.youtube.com/embed/4BOTvaRaDjI',
      targetCondition: 'Lower back pain',
      recommendedByDoctor: false,
      captionsAvailable: true,
      playbackSpeeds: [0.75, 1, 1.25, 1.5],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'lib_diabetes_nutrition',
      title: 'Diabetes Nutrition Planning',
      category: 'Nutrition',
      tags: ['diabetes', 'nutrition', 'diet'],
      thumbnail: 'https://img.youtube.com/vi/S6z6I6sXQbA/hqdefault.jpg',
      youtubeEmbedUrl: 'https://www.youtube.com/embed/S6z6I6sXQbA',
      targetCondition: 'Type 2 diabetes',
      recommendedByDoctor: false,
      captionsAvailable: true,
      playbackSpeeds: [0.75, 1, 1.25, 1.5],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'lib_bp_management',
      title: 'Blood Pressure Self-Management',
      category: 'Chronic disease',
      tags: ['hypertension', 'blood pressure', 'chronic'],
      thumbnail: 'https://img.youtube.com/vi/JhWQ2aA3fVQ/hqdefault.jpg',
      youtubeEmbedUrl: 'https://www.youtube.com/embed/JhWQ2aA3fVQ',
      targetCondition: 'Hypertension',
      recommendedByDoctor: false,
      captionsAvailable: true,
      playbackSpeeds: [0.75, 1, 1.25, 1.5],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'lib_senior_fall_prevention',
      title: 'Senior Fall Prevention Exercises',
      category: 'Senior care',
      tags: ['senior', 'fall prevention', 'mobility'],
      thumbnail: 'https://img.youtube.com/vi/1JgBp7dX4AU/hqdefault.jpg',
      youtubeEmbedUrl: 'https://www.youtube.com/embed/1JgBp7dX4AU',
      targetCondition: 'Fall risk',
      recommendedByDoctor: false,
      captionsAvailable: true,
      playbackSpeeds: [0.75, 1, 1.25, 1.5],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'lib_child_fever_care',
      title: 'Child Fever Home Care',
      category: 'Pediatric',
      tags: ['pediatric', 'fever', 'home care'],
      thumbnail: 'https://img.youtube.com/vi/Gj8E3s-k6yQ/hqdefault.jpg',
      youtubeEmbedUrl: 'https://www.youtube.com/embed/Gj8E3s-k6yQ',
      targetCondition: 'Pediatric fever',
      recommendedByDoctor: false,
      captionsAvailable: true,
      playbackSpeeds: [0.75, 1, 1.25, 1.5],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  seededVideos.forEach((video) => {
    videoLibrary[video.id] = video;
  });
};

seedCuratedVideos();

module.exports = {
  /**
   * Get curated video library
   */
  listVideoLibrary: (filters = {}) => {
    const categoryFilter = (filters.category || '').toLowerCase();
    const tagFilter = (filters.tag || '').toLowerCase();
    const conditionFilter = (filters.condition || '').toLowerCase();
    const queryFilter = (filters.q || '').toLowerCase();

    return Object.values(videoLibrary)
      .filter((video) => video.isActive !== false)
      .filter((video) => {
        if (categoryFilter && (video.category || '').toLowerCase() !== categoryFilter) {
          return false;
        }

        if (
          tagFilter &&
          !(video.tags || []).some((tag) => tag.toLowerCase().includes(tagFilter))
        ) {
          return false;
        }

        if (
          conditionFilter &&
          !(video.targetCondition || '').toLowerCase().includes(conditionFilter)
        ) {
          return false;
        }

        if (queryFilter) {
          const haystack = [
            video.title,
            video.category,
            video.targetCondition,
            ...(video.tags || []),
          ]
            .join(' ')
            .toLowerCase();

          if (!haystack.includes(queryFilter)) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => a.title.localeCompare(b.title));
  },

  /**
   * Add video to curated library
   */
  addVideoToLibrary: (videoData) => {
    const videoId = videoData.id || generateVideoId();
    const now = new Date().toISOString();

    const video = {
      id: videoId,
      title: videoData.title || 'Untitled video',
      category: videoData.category || 'General',
      tags: Array.isArray(videoData.tags) ? videoData.tags : [],
      thumbnail: videoData.thumbnail || '',
      youtubeEmbedUrl: videoData.youtubeEmbedUrl || '',
      targetCondition: videoData.targetCondition || '',
      recommendedByDoctor: Boolean(videoData.recommendedByDoctor),
      captionsAvailable: videoData.captionsAvailable !== false,
      playbackSpeeds: Array.isArray(videoData.playbackSpeeds)
        ? videoData.playbackSpeeds
        : [0.75, 1, 1.25, 1.5],
      isActive: videoData.isActive !== false,
      createdAt: now,
      updatedAt: now,
    };

    videoLibrary[videoId] = video;
    return video;
  },

  /**
   * Update video in library
   */
  updateVideoInLibrary: (videoId, updateData) => {
    if (!videoLibrary[videoId]) {
      return null;
    }

    videoLibrary[videoId] = {
      ...videoLibrary[videoId],
      ...updateData,
      id: videoId,
      updatedAt: new Date().toISOString(),
    };

    return videoLibrary[videoId];
  },

  /**
   * Delete video from library
   */
  deleteVideoFromLibrary: (videoId) => {
    const existing = videoLibrary[videoId];
    if (!existing) {
      return null;
    }

    delete videoLibrary[videoId];
    return existing;
  },

  /**
   * Assign a video to patient
   */
  assignVideoToPatient: (assignmentData) => {
    const {
      userId,
      doctorId,
      doctorName,
      videoId,
      notes,
      dueDate,
      targetCondition,
    } = assignmentData;

    const video = videoLibrary[videoId];
    if (!video) {
      throw new Error('Video not found in library');
    }

    const assignmentId = generateVideoAssignmentId();
    const now = new Date().toISOString();
    const assignment = {
      id: assignmentId,
      userId,
      doctorId: doctorId || '',
      doctorName: doctorName || '',
      videoId,
      title: video.title,
      category: video.category,
      tags: video.tags || [],
      thumbnail: video.thumbnail || '',
      youtubeEmbedUrl: video.youtubeEmbedUrl,
      targetCondition: targetCondition || video.targetCondition || '',
      recommendedByDoctor: assignmentData.recommendedByDoctor !== false,
      notes: notes || '',
      dueDate: dueDate || null,
      watchPercentage: 0,
      lastPositionSeconds: 0,
      playbackRate: 1,
      captionsEnabled: true,
      status: 'assigned', // assigned, in_progress, completed
      notificationSent: assignmentData.notificationSent !== false,
      assignedAt: now,
      lastWatchedAt: null,
      completedAt: null,
      updatedAt: now,
    };

    videoAssignments[assignmentId] = assignment;

    if (!healthTimeline[userId]) {
      healthTimeline[userId] = [];
    }

    healthTimeline[userId].push({
      id: generateHealthEventId(),
      type: 'video-assignment',
      referenceId: assignmentId,
      date: new Date().toISOString().split('T')[0],
      title: `Care video assigned: ${video.title}`,
      description: notes || `Assigned by ${doctorName || 'doctor'}`,
      timestamp: now,
    });

    return assignment;
  },

  /**
   * Get assigned videos for user
   */
  getUserAssignedVideos: (userId, status = '') => {
    return Object.values(videoAssignments)
      .filter((assignment) => assignment.userId === userId)
      .filter((assignment) => (status ? assignment.status === status : true))
      .sort((a, b) => new Date(b.assignedAt) - new Date(a.assignedAt));
  },

  /**
   * Track watch progress for assigned video
   */
  updateAssignedVideoProgress: (assignmentId, progressData) => {
    const existing = videoAssignments[assignmentId];
    if (!existing) {
      return null;
    }

    const now = new Date().toISOString();
    const watchPercentage = clampPercentage(
      progressData.watchPercentage !== undefined
        ? progressData.watchPercentage
        : existing.watchPercentage
    );

    const nextStatus = watchPercentage >= 90
      ? 'completed'
      : watchPercentage > 0
        ? 'in_progress'
        : 'assigned';

    const updated = {
      ...existing,
      watchPercentage,
      lastPositionSeconds:
        progressData.lastPositionSeconds !== undefined
          ? Number(progressData.lastPositionSeconds) || 0
          : existing.lastPositionSeconds,
      playbackRate:
        progressData.playbackRate !== undefined
          ? Number(progressData.playbackRate) || existing.playbackRate
          : existing.playbackRate,
      captionsEnabled:
        progressData.captionsEnabled !== undefined
          ? Boolean(progressData.captionsEnabled)
          : existing.captionsEnabled,
      status: nextStatus,
      lastWatchedAt: now,
      completedAt:
        nextStatus === 'completed' && !existing.completedAt
          ? now
          : existing.completedAt,
      updatedAt: now,
    };

    videoAssignments[assignmentId] = updated;

    if (nextStatus === 'completed' && !existing.completedAt) {
      if (!healthTimeline[existing.userId]) {
        healthTimeline[existing.userId] = [];
      }

      healthTimeline[existing.userId].push({
        id: generateHealthEventId(),
        type: 'video-completion',
        referenceId: assignmentId,
        date: new Date().toISOString().split('T')[0],
        title: `Completed care video: ${existing.title}`,
        description: `Watch progress reached ${watchPercentage}%`,
        timestamp: now,
      });
    }

    return updated;
  },

  /**
   * Doctor-facing assigned video dashboard data
   */
  getDoctorAssignedVideos: (doctorId, userId = '', status = '') => {
    return Object.values(videoAssignments)
      .filter((assignment) => assignment.doctorId === doctorId)
      .filter((assignment) => (userId ? assignment.userId === userId : true))
      .filter((assignment) => (status ? assignment.status === status : true))
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  },

  /**
   * Add a new prescription
   */
  addPrescription: (userId, prescriptionData) => {
    const prescriptionId = generatePrescriptionId();
    const newPrescription = {
      id: prescriptionId,
      userId,
      doctorId: prescriptionData.doctorId || '',
      doctorName: prescriptionData.doctorName || '',
      consultationId: prescriptionData.consultationId || null,
      date: prescriptionData.date || new Date().toISOString().split('T')[0],
      diagnosis: prescriptionData.diagnosis || '',
      medicines: prescriptionData.medicines || [], // Array of { name, dosage, frequency, duration }
      advice: prescriptionData.advice || '',
      followUpDate: prescriptionData.followUpDate || null,
      notes: prescriptionData.notes || '',
      status: 'active', // 'active', 'completed', 'expired'
      attachments: prescriptionData.attachments || [], // URLs of prescription images
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    prescriptions[prescriptionId] = newPrescription;

    // Add to health timeline
    if (!healthTimeline[userId]) {
      healthTimeline[userId] = [];
    }
    healthTimeline[userId].push({
      id: generateHealthEventId(),
      type: 'prescription',
      referenceId: prescriptionId,
      date: prescriptionData.date || new Date().toISOString().split('T')[0],
      title: `Prescription from ${prescriptionData.doctorName || 'Doctor'}`,
      description: prescriptionData.diagnosis || 'Medical prescription',
      timestamp: new Date().toISOString(),
    });

    return newPrescription;
  },

  /**
   * Get prescription by ID
   */
  getPrescriptionById: (prescriptionId) => {
    return prescriptions[prescriptionId] || null;
  },

  /**
   * Get all prescriptions for a user
   */
  getUserPrescriptions: (userId) => {
    return Object.values(prescriptions)
      .filter((rx) => rx.userId === userId)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  /**
   * Get active prescriptions
   */
  getActivePrescriptions: (userId) => {
    return Object.values(prescriptions)
      .filter((rx) => rx.userId === userId && rx.status === 'active')
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  /**
   * Update prescription
   */
  updatePrescription: (prescriptionId, updateData) => {
    if (prescriptions[prescriptionId]) {
      prescriptions[prescriptionId] = {
        ...prescriptions[prescriptionId],
        ...updateData,
        updatedAt: new Date().toISOString(),
      };
      return prescriptions[prescriptionId];
    }
    return null;
  },

  /**
   * Delete prescription
   */
  deletePrescription: (prescriptionId) => {
    const prescription = prescriptions[prescriptionId];
    if (prescription) {
      delete prescriptions[prescriptionId];
      return prescription;
    }
    return null;
  },

  /**
   * Add a new consultation
   */
  addConsultation: (userId, consultationData) => {
    const consultationId = generateConsultationId();
    const newConsultation = {
      id: consultationId,
      userId,
      doctorId: consultationData.doctorId || '',
      doctorName: consultationData.doctorName || '',
      appointmentId: consultationData.appointmentId || null,
      date: consultationData.date || new Date().toISOString().split('T')[0],
      time: consultationData.time || '',
      type: consultationData.type || 'video', // 'video', 'audio', 'chat'
      chiefComplaint: consultationData.chiefComplaint || '',
      symptoms: consultationData.symptoms || [],
      diagnosis: consultationData.diagnosis || '',
      medicines: consultationData.medicines || [],
      advice: consultationData.advice || '',
      testRecommendations: consultationData.testRecommendations || [],
      followUpDate: consultationData.followUpDate || null,
      callDuration: consultationData.callDuration || 0, // in minutes
      notes: consultationData.notes || '',
      attachments: consultationData.attachments || [], // URLs of reports/images
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    consultations[consultationId] = newConsultation;

    // Add to health timeline
    if (!healthTimeline[userId]) {
      healthTimeline[userId] = [];
    }
    healthTimeline[userId].push({
      id: generateHealthEventId(),
      type: 'consultation',
      referenceId: consultationId,
      date: consultationData.date || new Date().toISOString().split('T')[0],
      title: `Consultation with ${consultationData.doctorName || 'Doctor'}`,
      description: consultationData.chiefComplaint || 'Health consultation',
      timestamp: new Date().toISOString(),
    });

    return newConsultation;
  },

  /**
   * Get consultation by ID
   */
  getConsultationById: (consultationId) => {
    return consultations[consultationId] || null;
  },

  /**
   * Get all consultations for a user
   */
  getUserConsultations: (userId) => {
    return Object.values(consultations)
      .filter((cons) => cons.userId === userId)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  /**
   * Get recent consultations
   */
  getRecentConsultations: (userId, limit = 10) => {
    return Object.values(consultations)
      .filter((cons) => cons.userId === userId)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, limit);
  },

  /**
   * Update consultation
   */
  updateConsultation: (consultationId, updateData) => {
    if (consultations[consultationId]) {
      consultations[consultationId] = {
        ...consultations[consultationId],
        ...updateData,
        updatedAt: new Date().toISOString(),
      };
      return consultations[consultationId];
    }
    return null;
  },

  /**
   * Delete consultation
   */
  deleteConsultation: (consultationId) => {
    const consultation = consultations[consultationId];
    if (consultation) {
      delete consultations[consultationId];
      return consultation;
    }
    return null;
  },

  /**
   * Add health event to timeline
   */
  addHealthEvent: (userId, eventData) => {
    if (!healthTimeline[userId]) {
      healthTimeline[userId] = [];
    }

    const event = {
      id: generateHealthEventId(),
      type: eventData.type || 'other', // 'consultation', 'prescription', 'test', 'note', 'other'
      referenceId: eventData.referenceId || null,
      date: eventData.date || new Date().toISOString().split('T')[0],
      title: eventData.title || '',
      description: eventData.description || '',
      tags: eventData.tags || [],
      attachments: eventData.attachments || [],
      timestamp: new Date().toISOString(),
    };

    healthTimeline[userId].push(event);
    healthTimeline[userId].sort((a, b) => new Date(b.date) - new Date(a.date));

    return event;
  },

  /**
   * Get health timeline for user
   */
  getHealthTimeline: (userId, monthsBack = 12) => {
    if (!healthTimeline[userId]) {
      return [];
    }

    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - monthsBack);

    return healthTimeline[userId]
      .filter((event) => new Date(event.date) >= cutoffDate)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  /**
   * Get health timeline by type
   */
  getHealthTimelineByType: (userId, type) => {
    if (!healthTimeline[userId]) {
      return [];
    }

    return healthTimeline[userId]
      .filter((event) => event.type === type)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  /**
   * Get health records summary
   */
  getHealthRecordsSummary: (userId) => {
    const userPrescriptions = Object.values(prescriptions).filter(
      (rx) => rx.userId === userId
    );
    const userConsultations = Object.values(consultations).filter(
      (cons) => cons.userId === userId
    );
    const userTimeline = healthTimeline[userId] || [];
    const userVideoAssignments = Object.values(videoAssignments).filter(
      (assignment) => assignment.userId === userId
    );

    const activePrescriptions = userPrescriptions.filter(
      (rx) => rx.status === 'active'
    );
    const completedPrescriptions = userPrescriptions.filter(
      (rx) => rx.status === 'completed'
    );

    const completedVideos = userVideoAssignments.filter(
      (assignment) => assignment.status === 'completed'
    );

    // Get most common diagnoses
    const diagnosisMap = {};
    userConsultations.forEach((cons) => {
      if (cons.diagnosis) {
        diagnosisMap[cons.diagnosis] = (diagnosisMap[cons.diagnosis] || 0) + 1;
      }
    });
    const topDiagnoses = Object.entries(diagnosisMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([diagnosis]) => diagnosis);

    // Get all unique medicines prescribed
    const medicinesSet = new Set();
    userPrescriptions.forEach((rx) => {
      (rx.medicines || []).forEach((med) => {
        medicinesSet.add(med.name);
      });
    });
    userConsultations.forEach((cons) => {
      (cons.medicines || []).forEach((med) => {
        medicinesSet.add(med.name);
      });
    });

    return {
      totalConsultations: userConsultations.length,
      totalPrescriptions: userPrescriptions.length,
      activePrescriptions: activePrescriptions.length,
      completedPrescriptions: completedPrescriptions.length,
      totalAssignedVideos: userVideoAssignments.length,
      completedVideos: completedVideos.length,
      averageVideoWatchPercentage:
        userVideoAssignments.length > 0
          ? Math.round(
            userVideoAssignments.reduce((sum, assignment) => sum + (assignment.watchPercentage || 0), 0) /
                userVideoAssignments.length
          )
          : 0,
      timelineEvents: userTimeline.length,
      topDiagnoses,
      uniqueMedicines: Array.from(medicinesSet),
      lastConsultationDate:
        userConsultations.length > 0
          ? userConsultations[0].date
          : null,
      lastPrescriptionDate:
        userPrescriptions.length > 0
          ? userPrescriptions[0].date
          : null,
    };
  },

  /**
   * Search health records
   */
  searchHealthRecords: (userId, searchTerm) => {
    const results = [];

    // Search in prescriptions
    const userPrescriptions = Object.values(prescriptions).filter(
      (rx) => rx.userId === userId
    );
    userPrescriptions.forEach((rx) => {
      if (
        rx.diagnosis.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rx.doctorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rx.medicines.some((m) => m.name.toLowerCase().includes(searchTerm.toLowerCase()))
      ) {
        results.push({
          type: 'prescription',
          id: rx.id,
          date: rx.date,
          title: `Prescription: ${rx.diagnosis}`,
          doctor: rx.doctorName,
        });
      }
    });

    // Search in consultations
    const userConsultations = Object.values(consultations).filter(
      (cons) => cons.userId === userId
    );
    userConsultations.forEach((cons) => {
      if (
        cons.chiefComplaint.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cons.diagnosis.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cons.doctorName.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        results.push({
          type: 'consultation',
          id: cons.id,
          date: cons.date,
          title: `Consultation: ${cons.chiefComplaint}`,
          doctor: cons.doctorName,
        });
      }
    });

    return results.sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  /**
   * Clear all health records (for testing)
   */
  clearAllRecords: () => {
    Object.keys(prescriptions).forEach((key) => delete prescriptions[key]);
    Object.keys(consultations).forEach((key) => delete consultations[key]);
    Object.keys(healthTimeline).forEach((key) => delete healthTimeline[key]);
    Object.keys(videoAssignments).forEach((key) => delete videoAssignments[key]);
  },
};
