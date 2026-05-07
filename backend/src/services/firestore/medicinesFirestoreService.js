const { now, mapDoc, getCollection } = require('./firestoreHelpers');

const getMedicineCollection = (userId) => getCollection(`users/${userId}/medicineSchedules`);
const getIntakeLogsCollection = (userId) => getCollection(`users/${userId}/medicineIntakeLogs`);

const addMedicine = async (userId, medicineData) => {
  const docRef = getMedicineCollection(userId).doc();
  const payload = {
    userId,
    name: medicineData.name,
    dosage: medicineData.dosage,
    frequency: medicineData.frequency,
    times: medicineData.times || [],
    instructions: medicineData.instructions || '',
    startDate: medicineData.startDate || new Date().toISOString().split('T')[0],
    endDate: medicineData.endDate || null,
    daysToTake: medicineData.daysToTake || 'daily',
    specificDays: medicineData.specificDays || [],
    purpose: medicineData.purpose || '',
    sideEffects: medicineData.sideEffects || '',
    prescribedBy: medicineData.prescribedBy || '',
    status: medicineData.status || 'active',
    createdAt: now(),
    updatedAt: now(),
  };

  await docRef.set(payload);
  const doc = await docRef.get();
  return mapDoc(doc);
};

const getMedicineById = async (userId, medicineId) => {
  const doc = await getMedicineCollection(userId).doc(medicineId).get();
  return doc.exists ? mapDoc(doc) : null;
};

const getUserMedicines = async (userId) => {
  const snapshot = await getMedicineCollection(userId).orderBy('createdAt', 'desc').get();
  return snapshot.docs.map(mapDoc);
};

const getUserActiveMedicines = async (userId) => {
  const snapshot = await getMedicineCollection(userId)
    .where('status', '==', 'active')
    .orderBy('createdAt', 'desc')
    .get();
  return snapshot.docs.map(mapDoc);
};

const updateMedicine = async (userId, medicineId, updateData) => {
  const docRef = getMedicineCollection(userId).doc(medicineId);
  await docRef.update({
    ...updateData,
    updatedAt: now(),
  });
  return getMedicineById(userId, medicineId);
};

const markAsTaken = async (userId, medicineId, date, scheduledTime) => {
  const logId = `${medicineId}_${date}_${scheduledTime.replace(':', '-')}`;
  await getIntakeLogsCollection(userId)
    .doc(logId)
    .set(
      {
        medicineId,
        date,
        scheduledTime,
        taken: true,
        takenAt: now(),
      },
      { merge: true }
    );

  await getMedicineCollection(userId).doc(medicineId).update({
    updatedAt: now(),
  });

  return getMedicineById(userId, medicineId);
};

const pauseMedicine = async (userId, medicineId) => updateMedicine(userId, medicineId, { status: 'paused' });
const resumeMedicine = async (userId, medicineId) => updateMedicine(userId, medicineId, { status: 'active' });
const completeMedicine = async (userId, medicineId) =>
  updateMedicine(userId, medicineId, {
    status: 'completed',
    endDate: new Date().toISOString().split('T')[0],
  });

const deleteMedicine = async (userId, medicineId) => {
  const medicine = await getMedicineById(userId, medicineId);
  if (!medicine) {
    return null;
  }

  const logsSnapshot = await getIntakeLogsCollection(userId)
    .where('medicineId', '==', medicineId)
    .get();

  const batch = getCollection('users').firestore.batch();
  batch.delete(getMedicineCollection(userId).doc(medicineId));
  logsSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  return medicine;
};

const getIntakeHistory = async (userId, medicineId, days = 30) => {
  const medicine = await getMedicineById(userId, medicineId);
  if (!medicine) {
    return null;
  }

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const snapshot = await getIntakeLogsCollection(userId)
    .where('medicineId', '==', medicineId)
    .where('date', '>=', startDate.toISOString().split('T')[0])
    .orderBy('date', 'desc')
    .get();

  const intakeRecords = snapshot.docs.map(mapDoc);
  return {
    medicineId,
    medicineName: medicine.name,
    period: `Last ${days} days`,
    intakeRecords,
    totalDosesTaken: intakeRecords.length,
    averageIntakesPerDay: (intakeRecords.length / days).toFixed(1),
  };
};

const getTodaysMedicines = async (userId, date = new Date().toISOString().split('T')[0]) => {
  const [medicines, logsSnapshot] = await Promise.all([
    getUserActiveMedicines(userId),
    getIntakeLogsCollection(userId).where('date', '==', date).get(),
  ]);

  const logs = logsSnapshot.docs.map(mapDoc);
  return medicines.map((medicine) => ({
    ...medicine,
    scheduledTimes: medicine.times || [],
    takenTimes: logs
      .filter((log) => log.medicineId === medicine.id && log.taken)
      .map((log) => log.scheduledTime),
    notes: logs.find((log) => log.medicineId === medicine.id)?.note || '',
  }));
};

const addIntakeNote = async (userId, medicineId, date, note) => {
  const snapshot = await getIntakeLogsCollection(userId)
    .where('medicineId', '==', medicineId)
    .where('date', '==', date)
    .get();

  const batch = getCollection('users').firestore.batch();
  if (snapshot.empty) {
    const docRef = getIntakeLogsCollection(userId).doc(`${medicineId}_${date}_note`);
    batch.set(docRef, {
      medicineId,
      date,
      scheduledTime: null,
      taken: false,
      note,
      createdAt: now(),
    });
  } else {
    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { note });
    });
  }
  await batch.commit();
  return getMedicineById(userId, medicineId);
};

const getMedicineStatistics = async (userId) => {
  const medicines = await getUserMedicines(userId);
  const logsSnapshot = await getIntakeLogsCollection(userId).get();
  const logs = logsSnapshot.docs.map(mapDoc);

  const activeMedicines = medicines.filter((med) => med.status === 'active').length;
  const completedMedicines = medicines.filter((med) => med.status === 'completed').length;
  const pausedMedicines = medicines.filter((med) => med.status === 'paused').length;
  const totalIntakes = logs.filter((log) => log.taken).length;
  const totalScheduled = medicines.reduce((sum, medicine) => sum + (medicine.times || []).length, 0);

  return {
    totalMedicines: medicines.length,
    activeMedicines,
    completedMedicines,
    pausedMedicines,
    totalIntakes,
    adherenceRate: totalScheduled > 0 ? Math.round((totalIntakes / totalScheduled) * 100) : 0,
    averageIntakesPerDay: medicines.length > 0 ? (totalIntakes / medicines.length).toFixed(1) : 0,
  };
};

module.exports = {
  addMedicine,
  getMedicineById,
  getUserMedicines,
  getUserActiveMedicines,
  updateMedicine,
  markAsTaken,
  pauseMedicine,
  resumeMedicine,
  completeMedicine,
  deleteMedicine,
  getIntakeHistory,
  getTodaysMedicines,
  addIntakeNote,
  getMedicineStatistics,
};