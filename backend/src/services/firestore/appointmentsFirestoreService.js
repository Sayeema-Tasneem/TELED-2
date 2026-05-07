const { admin, now, mapDoc, normalizeData, getCollection } = require('./firestoreHelpers');

const COLLECTION = 'appointments';

const getAppointmentsCollection = () => getCollection(COLLECTION);

const createAppointment = async (appointmentData) => {
  const docRef = getAppointmentsCollection().doc();
  const payload = {
    ...appointmentData,
    status: appointmentData.status || 'confirmed',
    cancelledAt: appointmentData.cancelledAt || null,
    cancelReason: appointmentData.cancelReason || null,
    createdAt: now(),
    updatedAt: now(),
  };

  await docRef.set(payload);
  const doc = await docRef.get();
  return mapDoc(doc);
};

const getAppointmentById = async (appointmentId) => {
  const doc = await getAppointmentsCollection().doc(appointmentId).get();
  return doc.exists ? mapDoc(doc) : null;
};

const getUserAppointments = async (userId) => {
  const snapshot = await getAppointmentsCollection()
    .where('userId', '==', userId)
    .orderBy('date', 'desc')
    .get();

  return snapshot.docs.map(mapDoc);
};

const getUpcomingAppointments = async (userId, today = new Date().toISOString().split('T')[0]) => {
  const snapshot = await getAppointmentsCollection()
    .where('userId', '==', userId)
    .where('date', '>=', today)
    .orderBy('date', 'asc')
    .get();

  return snapshot.docs
    .map(mapDoc)
    .filter((appointment) => appointment.status !== 'cancelled');
};

const getPastAppointments = async (userId, today = new Date().toISOString().split('T')[0]) => {
  const snapshot = await getAppointmentsCollection()
    .where('userId', '==', userId)
    .orderBy('date', 'desc')
    .get();

  return snapshot.docs
    .map(mapDoc)
    .filter((appointment) => appointment.date < today || appointment.status === 'completed');
};

const cancelAppointment = async (appointmentId, reason = '') => {
  const docRef = getAppointmentsCollection().doc(appointmentId);
  await docRef.update({
    status: 'cancelled',
    cancelReason: reason,
    cancelledAt: now(),
    updatedAt: now(),
  });
  return getAppointmentById(appointmentId);
};

const rescheduleAppointment = async (appointmentId, newDate, newTime) => {
  const docRef = getAppointmentsCollection().doc(appointmentId);
  await docRef.update({
    date: newDate,
    time: newTime,
    updatedAt: now(),
  });
  return getAppointmentById(appointmentId);
};

const completeAppointment = async (appointmentId, prescription = null, notes = '') => {
  const docRef = getAppointmentsCollection().doc(appointmentId);
  await docRef.update({
    status: 'completed',
    prescription,
    notes,
    updatedAt: now(),
  });
  return getAppointmentById(appointmentId);
};

const getDoctorAppointmentsForDate = async (doctorId, date) => {
  const snapshot = await getAppointmentsCollection()
    .where('doctorId', '==', doctorId)
    .where('date', '==', date)
    .where('status', '==', 'confirmed')
    .get();

  return snapshot.docs.map(mapDoc);
};

module.exports = {
  createAppointment,
  getAppointmentById,
  getUserAppointments,
  getUpcomingAppointments,
  getPastAppointments,
  cancelAppointment,
  rescheduleAppointment,
  completeAppointment,
  getDoctorAppointmentsForDate,
  normalizeData,
};