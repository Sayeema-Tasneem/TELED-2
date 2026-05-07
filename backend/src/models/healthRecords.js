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

module.exports = {
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

    const activePrescriptions = userPrescriptions.filter(
      (rx) => rx.status === 'active'
    );
    const completedPrescriptions = userPrescriptions.filter(
      (rx) => rx.status === 'completed'
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
  },
};
