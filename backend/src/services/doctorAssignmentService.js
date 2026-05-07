const { db } = require('../config/firebase');
const simpleStoreService = require('./simpleStoreService');

const normalize = (value) => String(value || '').trim().toLowerCase();

const buildFullName = (profile = {}) => `${profile.firstName || ''} ${profile.lastName || ''}`.trim();

const getUserByPhone = async (phoneNumber) => {
  try {
    if (!db || typeof db.collection !== 'function') {
      return null;
    }

    const snapshot = await db.collection('users').doc(String(phoneNumber || '')).get();
    if (!snapshot.exists) {
      return null;
    }

    return {
      phoneNumber,
      ...snapshot.data(),
    };
  } catch (error) {
    console.error('Error reading user profile for doctor assignment:', error.message || error);
    return null;
  }
};

const findDoctorByName = async (doctorName) => {
  try {
    const target = normalize(doctorName);
    if (!target) {
      return null;
    }

    if (!db || typeof db.collection !== 'function') {
      return null;
    }

    const snapshot = await db.collection('users').where('role', '==', 'doctor').get();
    if (snapshot.empty) {
      return null;
    }

    const match = snapshot.docs
      .map((doc) => ({ phoneNumber: doc.id, ...doc.data() }))
      .find((doctorProfile) => {
        const fullName = normalize(buildFullName(doctorProfile));
        const firstName = normalize(doctorProfile.firstName);
        const displayName = normalize(doctorProfile.name);
        return [fullName, firstName, displayName].includes(target);
      });

    return match?.phoneNumber || null;
  } catch (error) {
    console.error('Error matching doctor by name:', error.message || error);
    return null;
  }
};

const resolveAssignedDoctorUserId = async (patientUserId) => {
  const patientId = String(patientUserId || '').trim();
  if (!patientId) {
    return null;
  }

  const patientProfile = await getUserByPhone(patientId);
  if (patientProfile?.assignedDoctorUserId) {
    return String(patientProfile.assignedDoctorUserId).trim();
  }

  if (patientProfile?.assignedDoctorPhone) {
    return String(patientProfile.assignedDoctorPhone).trim();
  }

  if (patientProfile?.assignedDoctorName) {
    const matched = await findDoctorByName(patientProfile.assignedDoctorName);
    if (matched) {
      return matched;
    }
  }

  try {
    const appointments = await simpleStoreService.getAppointments({ patientPhone: patientId });
    const latestAppointment = (Array.isArray(appointments) ? appointments : [])
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())[0];

    if (!latestAppointment?.doctorName) {
      return null;
    }

    const matchedFromAppointment = await findDoctorByName(latestAppointment.doctorName);
    return matchedFromAppointment || null;
  } catch (error) {
    console.error('Error resolving doctor from appointment history:', error.message || error);
    return null;
  }
};

module.exports = {
  resolveAssignedDoctorUserId,
};
