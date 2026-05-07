const { now, mapDoc, getCollection } = require('./firestoreHelpers');

const getPrescriptionsCollection = (userId) => getCollection(`users/${userId}/prescriptions`);
const getConsultationsCollection = (userId) => getCollection(`users/${userId}/consultations`);
const getTimelineCollection = (userId) => getCollection(`users/${userId}/healthTimeline`);

const addHealthEvent = async (userId, eventData) => {
  const docRef = getTimelineCollection(userId).doc();
  await docRef.set({
    ...eventData,
    timestamp: now(),
  });
  const doc = await docRef.get();
  return mapDoc(doc);
};

const addPrescription = async (userId, prescriptionData) => {
  const docRef = getPrescriptionsCollection(userId).doc();
  const payload = {
    userId,
    doctorId: prescriptionData.doctorId || '',
    doctorName: prescriptionData.doctorName || '',
    consultationId: prescriptionData.consultationId || null,
    date: prescriptionData.date || new Date().toISOString().split('T')[0],
    diagnosis: prescriptionData.diagnosis || '',
    medicines: prescriptionData.medicines || [],
    advice: prescriptionData.advice || '',
    followUpDate: prescriptionData.followUpDate || null,
    notes: prescriptionData.notes || '',
    status: prescriptionData.status || 'active',
    attachments: prescriptionData.attachments || [],
    createdAt: now(),
    updatedAt: now(),
  };

  await docRef.set(payload);
  const prescription = mapDoc(await docRef.get());
  await addHealthEvent(userId, {
    type: 'prescription',
    referenceId: prescription.id,
    date: prescription.date,
    title: `Prescription from ${prescription.doctorName || 'Doctor'}`,
    description: prescription.diagnosis || 'Medical prescription',
    tags: ['prescription'],
    attachments: prescription.attachments,
  });
  return prescription;
};

const getPrescriptionById = async (userId, prescriptionId) => {
  const doc = await getPrescriptionsCollection(userId).doc(prescriptionId).get();
  return doc.exists ? mapDoc(doc) : null;
};

const getUserPrescriptions = async (userId) => {
  const snapshot = await getPrescriptionsCollection(userId).orderBy('date', 'desc').get();
  return snapshot.docs.map(mapDoc);
};

const getActivePrescriptions = async (userId) => {
  const snapshot = await getPrescriptionsCollection(userId)
    .where('status', '==', 'active')
    .orderBy('date', 'desc')
    .get();
  return snapshot.docs.map(mapDoc);
};

const updatePrescription = async (userId, prescriptionId, updateData) => {
  const docRef = getPrescriptionsCollection(userId).doc(prescriptionId);
  await docRef.update({
    ...updateData,
    updatedAt: now(),
  });
  return getPrescriptionById(userId, prescriptionId);
};

const deletePrescription = async (userId, prescriptionId) => {
  const prescription = await getPrescriptionById(userId, prescriptionId);
  if (!prescription) {
    return null;
  }
  await getPrescriptionsCollection(userId).doc(prescriptionId).delete();
  return prescription;
};

const addConsultation = async (userId, consultationData) => {
  const docRef = getConsultationsCollection(userId).doc();
  const payload = {
    userId,
    doctorId: consultationData.doctorId || '',
    doctorName: consultationData.doctorName || '',
    appointmentId: consultationData.appointmentId || null,
    date: consultationData.date || new Date().toISOString().split('T')[0],
    time: consultationData.time || '',
    type: consultationData.type || 'video',
    chiefComplaint: consultationData.chiefComplaint || '',
    symptoms: consultationData.symptoms || [],
    diagnosis: consultationData.diagnosis || '',
    medicines: consultationData.medicines || [],
    advice: consultationData.advice || '',
    testRecommendations: consultationData.testRecommendations || [],
    followUpDate: consultationData.followUpDate || null,
    callDuration: consultationData.callDuration || 0,
    notes: consultationData.notes || '',
    attachments: consultationData.attachments || [],
    createdAt: now(),
    updatedAt: now(),
  };

  await docRef.set(payload);
  const consultation = mapDoc(await docRef.get());
  await addHealthEvent(userId, {
    type: 'consultation',
    referenceId: consultation.id,
    date: consultation.date,
    title: `Consultation with ${consultation.doctorName || 'Doctor'}`,
    description: consultation.chiefComplaint || 'Health consultation',
    tags: ['consultation', consultation.type],
    attachments: consultation.attachments,
  });
  return consultation;
};

const getConsultationById = async (userId, consultationId) => {
  const doc = await getConsultationsCollection(userId).doc(consultationId).get();
  return doc.exists ? mapDoc(doc) : null;
};

const getUserConsultations = async (userId) => {
  const snapshot = await getConsultationsCollection(userId).orderBy('date', 'desc').get();
  return snapshot.docs.map(mapDoc);
};

const getRecentConsultations = async (userId, limit = 10) => {
  const snapshot = await getConsultationsCollection(userId).orderBy('date', 'desc').limit(limit).get();
  return snapshot.docs.map(mapDoc);
};

const updateConsultation = async (userId, consultationId, updateData) => {
  const docRef = getConsultationsCollection(userId).doc(consultationId);
  await docRef.update({
    ...updateData,
    updatedAt: now(),
  });
  return getConsultationById(userId, consultationId);
};

const deleteConsultation = async (userId, consultationId) => {
  const consultation = await getConsultationById(userId, consultationId);
  if (!consultation) {
    return null;
  }
  await getConsultationsCollection(userId).doc(consultationId).delete();
  return consultation;
};

const getHealthTimeline = async (userId, monthsBack = 12) => {
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - monthsBack);
  const snapshot = await getTimelineCollection(userId)
    .where('date', '>=', cutoffDate.toISOString().split('T')[0])
    .orderBy('date', 'desc')
    .get();
  return snapshot.docs.map(mapDoc);
};

const getHealthTimelineByType = async (userId, type) => {
  const snapshot = await getTimelineCollection(userId)
    .where('type', '==', type)
    .orderBy('date', 'desc')
    .get();
  return snapshot.docs.map(mapDoc);
};

const getHealthRecordsSummary = async (userId) => {
  const [prescriptions, consultations, timeline] = await Promise.all([
    getUserPrescriptions(userId),
    getUserConsultations(userId),
    getHealthTimeline(userId, 24),
  ]);

  const activePrescriptions = prescriptions.filter((item) => item.status === 'active').length;
  const completedPrescriptions = prescriptions.filter((item) => item.status === 'completed').length;
  const diagnosisMap = {};
  consultations.forEach((item) => {
    if (item.diagnosis) {
      diagnosisMap[item.diagnosis] = (diagnosisMap[item.diagnosis] || 0) + 1;
    }
  });

  const topDiagnoses = Object.entries(diagnosisMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([diagnosis]) => diagnosis);

  const uniqueMedicines = Array.from(
    new Set(
      [...prescriptions, ...consultations].flatMap((item) =>
        (item.medicines || []).map((medicine) => medicine.name)
      )
    )
  );

  return {
    totalConsultations: consultations.length,
    totalPrescriptions: prescriptions.length,
    activePrescriptions,
    completedPrescriptions,
    timelineEvents: timeline.length,
    topDiagnoses,
    uniqueMedicines,
    lastConsultationDate: consultations[0]?.date || null,
    lastPrescriptionDate: prescriptions[0]?.date || null,
  };
};

const searchHealthRecords = async (userId, searchTerm) => {
  const normalizedSearch = searchTerm.toLowerCase();
  const [prescriptions, consultations] = await Promise.all([
    getUserPrescriptions(userId),
    getUserConsultations(userId),
  ]);

  const prescriptionResults = prescriptions
    .filter(
      (rx) =>
        (rx.diagnosis || '').toLowerCase().includes(normalizedSearch) ||
        (rx.doctorName || '').toLowerCase().includes(normalizedSearch) ||
        (rx.medicines || []).some((medicine) =>
          (medicine.name || '').toLowerCase().includes(normalizedSearch)
        )
    )
    .map((rx) => ({
      type: 'prescription',
      id: rx.id,
      date: rx.date,
      title: `Prescription: ${rx.diagnosis}`,
      doctor: rx.doctorName,
    }));

  const consultationResults = consultations
    .filter(
      (consultation) =>
        (consultation.chiefComplaint || '').toLowerCase().includes(normalizedSearch) ||
        (consultation.diagnosis || '').toLowerCase().includes(normalizedSearch) ||
        (consultation.doctorName || '').toLowerCase().includes(normalizedSearch)
    )
    .map((consultation) => ({
      type: 'consultation',
      id: consultation.id,
      date: consultation.date,
      title: `Consultation: ${consultation.chiefComplaint}`,
      doctor: consultation.doctorName,
    }));

  return [...prescriptionResults, ...consultationResults].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );
};

module.exports = {
  addPrescription,
  getPrescriptionById,
  getUserPrescriptions,
  getActivePrescriptions,
  updatePrescription,
  deletePrescription,
  addConsultation,
  getConsultationById,
  getUserConsultations,
  getRecentConsultations,
  updateConsultation,
  deleteConsultation,
  addHealthEvent,
  getHealthTimeline,
  getHealthTimelineByType,
  getHealthRecordsSummary,
  searchHealthRecords,
};