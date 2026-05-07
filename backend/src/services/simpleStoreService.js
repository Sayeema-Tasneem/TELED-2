const fs = require('fs/promises');
const path = require('path');
const { db } = require('../config/firebase');

const defaultFallbackStore = {
  patients: [],
  doctors: [],
  appointments: [],
  prescriptions: [],
  consultations: [],
  pharmacies: [],
};

const storeFilePath = path.join(__dirname, '../../data/simpleStore.json');
let fallbackStore = null;

const seedDoctors = [
  { id: 'd1', name: 'Dr Ramesh', pin: '1234', specialty: 'General Physician' },
  { id: 'd2', name: 'Dr Asha', pin: '1234', specialty: 'Pediatrics' },
  { id: 'd3', name: 'Dr Meena', pin: '1234', specialty: 'Gynecologist' },
  { id: 'd4', name: 'Dr Suresh', pin: '1234', specialty: 'ENT' },
  { id: 'd5', name: 'Dr Priya', pin: '1234', specialty: 'Dermatologist' },
  { id: 'd6', name: 'Dr Arjun', pin: '1234', specialty: 'Cardiologist' },
  { id: 'd7', name: 'Dr Kiran', pin: '1234', specialty: 'Orthopedic' },
  { id: 'd8', name: 'Dr Nisha', pin: '1234', specialty: 'Gastroenterologist' },
  { id: 'd9', name: 'Dr Vivek', pin: '1234', specialty: 'Pulmonologist' },
  { id: 'd10', name: 'Dr Kavya', pin: '1234', specialty: 'Ophthalmologist' },
  { id: 'd11', name: 'Dr Anand', pin: '1234', specialty: 'Dentist' },
  { id: 'd12', name: 'Dr Neeraj', pin: '1234', specialty: 'Neurologist' },
  { id: 'd13', name: 'Dr Harish', pin: '1234', specialty: 'Hepatologist' },
  { id: 'd14', name: 'Dr Alina', pin: '1234', specialty: 'Allergist' },
  { id: 'd15', name: 'Dr Tejas', pin: '1234', specialty: 'Endocrinologist' },
  { id: 'd16', name: 'Dr Pooja', pin: '1234', specialty: 'Urologist' },
  { id: 'd17', name: 'Dr Ritu', pin: '1234', specialty: 'Nephrologist' },
  { id: 'd18', name: 'Dr Sameer', pin: '1234', specialty: 'Psychiatrist' },
  { id: 'd19', name: 'Dr Lata', pin: '1234', specialty: 'Psychologist' },
];

const DEFAULT_DOCTOR_TIME_SLOTS = [
  '09:00 AM',
  '09:30 AM',
  '10:00 AM',
  '10:30 AM',
  '11:00 AM',
  '11:30 AM',
  '02:00 PM',
  '02:30 PM',
  '03:00 PM',
  '03:30 PM',
  '04:00 PM',
  '04:30 PM',
];

const SYMPTOM_SPECIALTY_COVERAGE = [
  { symptomId: 'fever', specialty: 'General Physician' },
  { symptomId: 'cough', specialty: 'Pulmonologist' },
  { symptomId: 'headache', specialty: 'Neurologist' },
  { symptomId: 'fatigue', specialty: 'General Physician' },
  { symptomId: 'bodyPain', specialty: 'Orthopedic' },
  { symptomId: 'soreThroat', specialty: 'ENT' },
  { symptomId: 'runnyNose', specialty: 'ENT' },
  { symptomId: 'stomachPain', specialty: 'Gastroenterologist' },
  { symptomId: 'nausea', specialty: 'Gastroenterologist' },
  { symptomId: 'vomiting', specialty: 'Gastroenterologist' },
  { symptomId: 'diarrhea', specialty: 'Gastroenterologist' },
  { symptomId: 'chestPain', specialty: 'Cardiologist' },
  { symptomId: 'shortnessOfBreath', specialty: 'Pulmonologist' },
  { symptomId: 'dizziness', specialty: 'Neurologist' },
  { symptomId: 'skinRash', specialty: 'Dermatologist' },
];

const collections = {
  patients: 'simplePatients',
  doctors: 'simpleDoctors',
  appointments: 'simpleAppointments',
  prescriptions: 'simplePrescriptions',
  consultations: 'simpleConsultations',
  pharmacies: 'simplePharmacies',
};

const isFirebaseEnabled = () => String(process.env.USE_FIREBASE || 'false').toLowerCase() === 'true';

const canUseFirestore = () => {
  try {
    return isFirebaseEnabled() && !!db && typeof db.collection === 'function';
  } catch (error) {
    return false;
  }
};

const ensureFallbackStore = async () => {
  if (fallbackStore) {
    return;
  }

  try {
    const raw = await fs.readFile(storeFilePath, 'utf-8');
    const parsed = JSON.parse(raw);
    fallbackStore = {
      ...defaultFallbackStore,
      ...parsed,
      patients: Array.isArray(parsed?.patients) ? parsed.patients : [],
      doctors: Array.isArray(parsed?.doctors) ? parsed.doctors : [],
      appointments: Array.isArray(parsed?.appointments) ? parsed.appointments : [],
      prescriptions: Array.isArray(parsed?.prescriptions) ? parsed.prescriptions : [],
      consultations: Array.isArray(parsed?.consultations) ? parsed.consultations : [],
      pharmacies: Array.isArray(parsed?.pharmacies) ? parsed.pharmacies : [],
    };

    if (!Array.isArray(fallbackStore.doctors) || fallbackStore.doctors.length === 0) {
      fallbackStore.doctors = [...seedDoctors];
      await persistFallbackStore();
    }
  } catch (error) {
    fallbackStore = {
      patients: [],
      doctors: [...seedDoctors],
      appointments: [],
      prescriptions: [],
      consultations: [],
      pharmacies: [],
    };

    await fs.mkdir(path.dirname(storeFilePath), { recursive: true });
    await fs.writeFile(storeFilePath, JSON.stringify(fallbackStore, null, 2), 'utf-8');
  }
};

const persistFallbackStore = async () => {
  await fs.mkdir(path.dirname(storeFilePath), { recursive: true });
  await fs.writeFile(storeFilePath, JSON.stringify(fallbackStore, null, 2), 'utf-8');
};

const addId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const toPlain = (doc) => ({ id: doc.id, ...doc.data() });

const createPatient = async ({ name, phone, age, gender, village, pin }) => {
  if (canUseFirestore()) {
    const patientRef = db.collection(collections.patients).doc(phone);
    const existing = await patientRef.get();

    if (existing.exists) {
      throw new Error('Patient already registered');
    }

    const payload = {
      id: addId('p'),
      name,
      phone,
      age,
      gender,
      village,
      pin,
      createdAt: new Date().toISOString(),
    };

    await patientRef.set(payload);
    return payload;
  }

  await ensureFallbackStore();

  const existing = fallbackStore.patients.find((p) => p.phone === phone);
  if (existing) {
    throw new Error('Patient already registered');
  }

  const payload = {
    id: addId('p'),
    name,
    phone,
    age,
    gender,
    village,
    pin,
    createdAt: new Date().toISOString(),
  };

  fallbackStore.patients.unshift(payload);
  await persistFallbackStore();
  return payload;
};

const loginPatient = async (phone, pin) => {
  if (canUseFirestore()) {
    const patientRef = db.collection(collections.patients).doc(phone);
    const snapshot = await patientRef.get();

    if (!snapshot.exists) {
      return null;
    }

    const patient = snapshot.data();
    return patient.pin === pin ? patient : null;
  }

  await ensureFallbackStore();
  return fallbackStore.patients.find((p) => p.phone === phone && p.pin === pin) || null;
};

const patientExists = async (phone) => {
  if (canUseFirestore()) {
    const patientRef = db.collection(collections.patients).doc(phone);
    const snapshot = await patientRef.get();
    return snapshot.exists;
  }

  await ensureFallbackStore();
  return fallbackStore.patients.some((p) => p.phone === phone);
};

const getPatients = async () => {
  if (canUseFirestore()) {
    const snapshot = await db.collection(collections.patients).orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(toPlain);
  }

  await ensureFallbackStore();
  return [...fallbackStore.patients];
};

const toSafeDoctor = (doctor) => {
  if (!doctor) return null;
  const { pin, ...rest } = doctor;
  return rest;
};

const normalizeDoctorRecord = (doctor = {}) => {
  const slots = Array.isArray(doctor.availableTimeSlots) && doctor.availableTimeSlots.length > 0
    ? doctor.availableTimeSlots
    : DEFAULT_DOCTOR_TIME_SLOTS;

  return {
    ...doctor,
    availableTimeSlots: [...new Set(slots.map((slot) => String(slot || '').trim()).filter(Boolean))],
  };
};

const getDoctorsWithPin = async () => {
  if (canUseFirestore()) {
    const snapshot = await db.collection(collections.doctors).get();
    let doctors = snapshot.docs.map(toPlain);

    if (doctors.length === 0) {
      const nowIso = new Date().toISOString();
      await Promise.all(
        seedDoctors.map((doctor) => db.collection(collections.doctors).doc(doctor.id).set({
          ...doctor,
          createdAt: nowIso,
        }))
      );
      const seededSnapshot = await db.collection(collections.doctors).get();
      doctors = seededSnapshot.docs.map(toPlain);
    }

    return doctors.map(normalizeDoctorRecord);
  }

  await ensureFallbackStore();
  if (!Array.isArray(fallbackStore.doctors) || fallbackStore.doctors.length === 0) {
    fallbackStore.doctors = [...seedDoctors];
    await persistFallbackStore();
  }
  return fallbackStore.doctors.map(normalizeDoctorRecord);
};

const getDoctors = async () => {
  const doctors = await getDoctorsWithPin();
  return doctors.map(toSafeDoctor).filter(Boolean);
};

const addDoctor = async ({ name, specialty, pin }) => {
  if (!name || !specialty) {
    throw new Error('Doctor name, specialty, and PIN are required');
  }

  const allDoctors = await getDoctorsWithPin();
  const nameExists = allDoctors.some(
    (doctor) => normalizeValue(doctor.name) === normalizeValue(name)
  );

  if (nameExists) {
    throw new Error('Doctor with this name already exists');
  }

  const payload = {
    id: addId('d'),
    name: String(name).trim(),
    specialty: String(specialty).trim(),
    pin: '1234',
    availableTimeSlots: [...DEFAULT_DOCTOR_TIME_SLOTS],
    createdAt: new Date().toISOString(),
  };

  if (canUseFirestore()) {
    await db.collection(collections.doctors).doc(payload.id).set(payload);
    return toSafeDoctor(payload);
  }

  await ensureFallbackStore();
  fallbackStore.doctors.unshift(payload);
  await persistFallbackStore();
  return toSafeDoctor(payload);
};

const deleteDoctor = async (doctorId) => {
  if (!doctorId) {
    throw new Error('Doctor ID is required');
  }

  if (canUseFirestore()) {
    const ref = db.collection(collections.doctors).doc(String(doctorId));
    const snapshot = await ref.get();
    if (!snapshot.exists) {
      throw new Error('Doctor not found');
    }

    const doctor = toPlain(snapshot);
    await ref.delete();
    return toSafeDoctor(doctor);
  }

  await ensureFallbackStore();
  const existing = fallbackStore.doctors.find((doctor) => doctor.id === doctorId);
  if (!existing) {
    throw new Error('Doctor not found');
  }

  fallbackStore.doctors = fallbackStore.doctors.filter((doctor) => doctor.id !== doctorId);
  await persistFallbackStore();
  return toSafeDoctor(existing);
};

const getDoctorTimeSlots = async (doctorId) => {
  if (!doctorId) {
    throw new Error('Doctor ID is required');
  }

  const allDoctors = await getDoctorsWithPin();
  const doctor = allDoctors.find((item) => String(item.id) === String(doctorId));

  if (!doctor) {
    throw new Error('Doctor not found');
  }

  return Array.isArray(doctor.availableTimeSlots) && doctor.availableTimeSlots.length > 0
    ? doctor.availableTimeSlots
    : [...DEFAULT_DOCTOR_TIME_SLOTS];
};

const updateDoctorTimeSlots = async (doctorId, slots = []) => {
  if (!doctorId) {
    throw new Error('Doctor ID is required');
  }

  const normalizedSlots = Array.isArray(slots)
    ? [...new Set(slots.map((slot) => String(slot || '').trim()).filter(Boolean))]
    : [];

  if (normalizedSlots.length === 0) {
    throw new Error('At least one time slot is required');
  }

  if (canUseFirestore()) {
    const ref = db.collection(collections.doctors).doc(String(doctorId));
    const snapshot = await ref.get();
    if (!snapshot.exists) {
      throw new Error('Doctor not found');
    }

    await ref.update({
      availableTimeSlots: normalizedSlots,
      updatedAt: new Date().toISOString(),
    });

    const updated = await ref.get();
    return toSafeDoctor(normalizeDoctorRecord(toPlain(updated)));
  }

  await ensureFallbackStore();
  const index = fallbackStore.doctors.findIndex((doctor) => String(doctor.id) === String(doctorId));
  if (index < 0) {
    throw new Error('Doctor not found');
  }

  fallbackStore.doctors[index] = {
    ...fallbackStore.doctors[index],
    availableTimeSlots: normalizedSlots,
    updatedAt: new Date().toISOString(),
  };
  await persistFallbackStore();

  return toSafeDoctor(normalizeDoctorRecord(fallbackStore.doctors[index]));
};

const getSymptomDoctorCoverage = async () => {
  const doctors = await getDoctors();

  const rowsBySpecialty = SYMPTOM_SPECIALTY_COVERAGE.reduce((acc, item) => {
    const key = String(item.specialty || '').trim();
    if (!key) return acc;
    if (!acc[key]) {
      acc[key] = { specialty: key, symptomCount: 0, doctorCount: 0, hasDoctor: false };
    }
    acc[key].symptomCount += 1;
    return acc;
  }, {});

  Object.values(rowsBySpecialty).forEach((row) => {
    const doctorCount = doctors.filter((doctor) => String(doctor?.specialty || '').trim().toLowerCase() === row.specialty.toLowerCase()).length;
    row.doctorCount = doctorCount;
    row.hasDoctor = doctorCount > 0;
  });

  return Object.values(rowsBySpecialty)
    .sort((a, b) => a.specialty.localeCompare(b.specialty));
};

const loginDoctor = async (doctorName, pin) => {
  const allDoctors = await getDoctorsWithPin();
  const normalizedPin = String(pin || '').trim();

  if (normalizedPin !== '1234') {
    return null;
  }

  const doctor = allDoctors.find(
    (d) => normalizeDoctorLoginName(d.name) === normalizeDoctorLoginName(doctorName)
  );

  if (!doctor) {
    return null;
  }

  return toSafeDoctor(doctor);
};

const getPharmacies = async () => {
  if (canUseFirestore()) {
    const snapshot = await db.collection(collections.pharmacies).orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(toPlain);
  }

  await ensureFallbackStore();
  return [...fallbackStore.pharmacies];
};

const addPharmacy = async ({ name, address = '', contact = '' }) => {
  if (!name) {
    throw new Error('Pharmacy name is required');
  }

  const payload = {
    id: addId('pharm'),
    name: String(name).trim(),
    address: String(address || '').trim(),
    contact: String(contact || '').trim(),
    stock: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (canUseFirestore()) {
    await db.collection(collections.pharmacies).doc(payload.id).set(payload);
    return payload;
  }

  await ensureFallbackStore();
  fallbackStore.pharmacies.unshift(payload);
  await persistFallbackStore();
  return payload;
};

const updatePharmacyStock = async (pharmacyId, { medicineName, quantity, unit = 'tabs' }) => {
  if (!pharmacyId || !medicineName) {
    throw new Error('Pharmacy ID and medicine name are required');
  }

  const normalizedQuantity = Number(quantity);
  if (!Number.isFinite(normalizedQuantity) || normalizedQuantity < 0) {
    throw new Error('Quantity must be a valid non-negative number');
  }

  const upsertStock = (pharmacy) => {
    const safeStock = Array.isArray(pharmacy.stock) ? [...pharmacy.stock] : [];
    const existingIndex = safeStock.findIndex(
      (item) => normalizeValue(item?.name) === normalizeValue(medicineName)
    );

    const stockPayload = {
      id: existingIndex >= 0 ? safeStock[existingIndex].id : addId('stk'),
      name: String(medicineName).trim(),
      quantity: normalizedQuantity,
      unit: String(unit || 'tabs').trim(),
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      safeStock[existingIndex] = stockPayload;
    } else {
      safeStock.unshift(stockPayload);
    }

    return {
      ...pharmacy,
      stock: safeStock,
      updatedAt: new Date().toISOString(),
    };
  };

  if (canUseFirestore()) {
    const ref = db.collection(collections.pharmacies).doc(String(pharmacyId));
    const snapshot = await ref.get();
    if (!snapshot.exists) {
      throw new Error('Pharmacy not found');
    }

    const current = toPlain(snapshot);
    const updated = upsertStock(current);
    await ref.set(updated, { merge: true });
    return updated;
  }

  await ensureFallbackStore();
  const existing = fallbackStore.pharmacies.find((pharmacy) => pharmacy.id === pharmacyId);
  if (!existing) {
    throw new Error('Pharmacy not found');
  }

  const updated = upsertStock(existing);
  fallbackStore.pharmacies = fallbackStore.pharmacies.map((pharmacy) => (
    pharmacy.id === pharmacyId ? updated : pharmacy
  ));
  await persistFallbackStore();
  return updated;
};

const loginAdmin = async (username, password) => {
  const normalizedUsername = String(username || '').trim().toLowerCase();
  const normalizedPassword = String(password || '').trim();
  return normalizedUsername === 'admin' && normalizedPassword === 'admin';
};

const normalizeValue = (value) => String(value || '').trim().toLowerCase();

const normalizeDoctorLoginName = (value) => normalizeValue(value).replace(/^dr\.?\s+/, '');

const isBookedAppointment = (appointment) => normalizeValue(appointment?.status || 'scheduled') !== 'cancelled';

const isSameAppointmentSlot = (appointment, doctorName, appointmentDate, appointmentTime) => (
  normalizeValue(appointment?.doctorName) === normalizeValue(doctorName)
  && normalizeValue(appointment?.appointmentDate || appointment?.date) === normalizeValue(appointmentDate)
  && normalizeValue(appointment?.appointmentTime) === normalizeValue(appointmentTime)
  && isBookedAppointment(appointment)
);

const parseAppointmentDateTime = (appointment) => {
  const dateValue = appointment?.appointmentDate || appointment?.date;
  if (!dateValue) {
    return null;
  }

  const [datePart] = String(dateValue).split('T');
  const [time, modifier = 'AM'] = String(appointment?.appointmentTime || '09:00 AM').split(' ');
  const [hourString = '9', minuteString = '00'] = String(time || '09:00').split(':');

  let hours = Number(hourString);
  const minutes = Number(minuteString);

  if (modifier.toUpperCase() === 'PM' && hours < 12) {
    hours += 12;
  }

  if (modifier.toUpperCase() === 'AM' && hours === 12) {
    hours = 0;
  }

  const parsedDate = new Date(`${datePart}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  parsedDate.setHours(hours, minutes, 0, 0);
  return parsedDate;
};

const buildConsultationFromAppointment = (appointment, completedAt) => ({
  id: addId('consult'),
  appointmentId: appointment.id,
  patientPhone: appointment.patientPhone,
  patientName: appointment.patientName,
  doctorName: appointment.doctorName,
  consultationType: appointment.consultationType || 'Video Call',
  date: appointment.appointmentDate || appointment.date || '',
  time: appointment.appointmentTime || '',
  reason: appointment.reason || '',
  symptoms: appointment.symptoms || '',
  status: 'completed',
  source: 'auto-archived',
  completedAt,
  createdAt: new Date().toISOString(),
});

const createAppointment = async ({
  patientName,
  patientPhone,
  doctorName,
  date,
  reason,
  appointmentDate,
  appointmentTime,
  appointmentDay,
  consultationType = 'Video Call',
  symptoms = '',
  suggestedSpecialty = '',
  suggestedBySymptoms = false,
  status = 'scheduled',
}) => {
  const normalizedAppointmentDate = appointmentDate || date;
  const normalizedAppointmentTime = appointmentTime || '';

  const existingAppointments = await getAppointments({ doctorName });
  const slotAlreadyBooked = existingAppointments.some((appointment) =>
    isSameAppointmentSlot(appointment, doctorName, normalizedAppointmentDate, normalizedAppointmentTime)
  );

  if (slotAlreadyBooked) {
    throw new Error('This time slot is already booked. Please choose another time.');
  }

  const payload = {
    id: addId('a'),
    patientName,
    patientPhone,
    doctorName,
    date: date || normalizedAppointmentDate,
    appointmentDate: normalizedAppointmentDate,
    appointmentTime: normalizedAppointmentTime,
    appointmentDay: appointmentDay || '',
    consultationType,
    reason,
    symptoms,
    suggestedSpecialty,
    suggestedBySymptoms,
    status,
    createdAt: new Date().toISOString(),
  };

  if (canUseFirestore()) {
    await db.collection(collections.appointments).doc(payload.id).set(payload);
    return payload;
  }

  await ensureFallbackStore();
  fallbackStore.appointments.unshift(payload);
  await persistFallbackStore();
  return payload;
};

const getAppointmentById = async (appointmentId) => {
  if (canUseFirestore()) {
    const snapshot = await db.collection(collections.appointments).doc(appointmentId).get();
    if (!snapshot.exists) {
      return null;
    }

    return toPlain(snapshot);
  }

  await ensureFallbackStore();
  return fallbackStore.appointments.find((appointment) => appointment.id === appointmentId) || null;
};

const getAppointments = async ({ doctorName, patientPhone, status } = {}) => {
  if (canUseFirestore()) {
    const snapshot = await db.collection(collections.appointments).orderBy('createdAt', 'desc').get();
    const all = snapshot.docs.map(toPlain);
    return all.filter((appointment) => {
      const matchesDoctor = doctorName ? appointment.doctorName === doctorName : true;
      const matchesPatient = patientPhone ? appointment.patientPhone === patientPhone : true;
      const matchesStatus = status ? appointment.status === status : true;
      return matchesDoctor && matchesPatient && matchesStatus;
    });
  }

  await ensureFallbackStore();
  const all = [...fallbackStore.appointments];
  return all.filter((appointment) => {
    const matchesDoctor = doctorName ? appointment.doctorName === doctorName : true;
    const matchesPatient = patientPhone ? appointment.patientPhone === patientPhone : true;
    const matchesStatus = status ? appointment.status === status : true;
    return matchesDoctor && matchesPatient && matchesStatus;
  });
};

const updateAppointment = async (appointmentId, updates = {}) => {
  const existingAppointment = await getAppointmentById(appointmentId);

  if (!existingAppointment) {
    throw new Error('Appointment not found');
  }

  const nextDoctorName = updates.doctorName || existingAppointment.doctorName;
  const nextDate = updates.appointmentDate || updates.date || existingAppointment.appointmentDate || existingAppointment.date;
  const nextTime = updates.appointmentTime || existingAppointment.appointmentTime || '';
  const nextStatus = updates.status || existingAppointment.status || 'scheduled';

  if (normalizeValue(nextStatus) !== 'cancelled' && nextDate && nextTime) {
    const appointmentsForDoctor = await getAppointments({ doctorName: nextDoctorName });
    const hasConflict = appointmentsForDoctor.some((appointment) => (
      appointment.id !== appointmentId
      && isSameAppointmentSlot(appointment, nextDoctorName, nextDate, nextTime)
    ));

    if (hasConflict) {
      throw new Error('This time slot is already booked. Please choose another time.');
    }
  }

  const payload = {
    ...existingAppointment,
    ...updates,
    doctorName: nextDoctorName,
    date: updates.date || nextDate,
    appointmentDate: nextDate,
    appointmentTime: nextTime,
    appointmentDay: updates.appointmentDay ?? existingAppointment.appointmentDay ?? '',
    consultationType: updates.consultationType || existingAppointment.consultationType || 'Video Call',
    reason: updates.reason ?? existingAppointment.reason,
    symptoms: updates.symptoms ?? existingAppointment.symptoms ?? '',
    suggestedSpecialty: updates.suggestedSpecialty ?? existingAppointment.suggestedSpecialty ?? '',
    suggestedBySymptoms: updates.suggestedBySymptoms ?? existingAppointment.suggestedBySymptoms ?? false,
    status: nextStatus,
    updatedAt: new Date().toISOString(),
  };

  if (canUseFirestore()) {
    await db.collection(collections.appointments).doc(appointmentId).set(payload, { merge: true });
    return payload;
  }

  await ensureFallbackStore();
  fallbackStore.appointments = fallbackStore.appointments.map((appointment) => (
    appointment.id === appointmentId ? payload : appointment
  ));
  await persistFallbackStore();
  return payload;
};

const deleteAppointment = async (appointmentId) => {
  const existingAppointment = await getAppointmentById(appointmentId);

  if (!existingAppointment) {
    throw new Error('Appointment not found');
  }

  if (canUseFirestore()) {
    await db.collection(collections.appointments).doc(appointmentId).delete();
    return existingAppointment;
  }

  await ensureFallbackStore();
  fallbackStore.appointments = fallbackStore.appointments.filter((appointment) => appointment.id !== appointmentId);
  await persistFallbackStore();
  return existingAppointment;
};

const createPrescription = async ({
  patientPhone,
  doctorName,
  text,
  diagnosis = '',
  medicines = [],
  tests = [],
  scans = [],
  doctorNotes = '',
  followUpDays = '',
}) => {
  const now = new Date();
  const payload = {
    id: addId('rx'),
    patientPhone,
    doctorName,
    text,
    diagnosis,
    medicines: Array.isArray(medicines) ? medicines : [],
    tests: Array.isArray(tests) ? tests : [],
    scans: Array.isArray(scans) ? scans : [],
    doctorNotes,
    followUpDays,
    date: now.toLocaleDateString(),
    time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    createdAt: now.toISOString(),
  };

  if (canUseFirestore()) {
    await db.collection(collections.prescriptions).doc(payload.id).set(payload);
    return payload;
  }

  await ensureFallbackStore();
  fallbackStore.prescriptions.unshift(payload);
  await persistFallbackStore();
  return payload;
};

const getPrescriptionsByPatient = async (patientPhone) => {
  if (canUseFirestore()) {
    const snapshot = await db.collection(collections.prescriptions).orderBy('createdAt', 'desc').get();
    return snapshot.docs
      .map(toPlain)
      .filter((item) => item.patientPhone === patientPhone);
  }

  await ensureFallbackStore();
  return fallbackStore.prescriptions.filter((item) => item.patientPhone === patientPhone);
};

const findConsultationByAppointmentId = async (appointmentId) => {
  if (!appointmentId) {
    return null;
  }

  if (canUseFirestore()) {
    const snapshot = await db
      .collection(collections.consultations)
      .where('appointmentId', '==', appointmentId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    return toPlain(snapshot.docs[0]);
  }

  await ensureFallbackStore();
  return fallbackStore.consultations.find((item) => item.appointmentId === appointmentId) || null;
};

const createConsultationFromAppointment = async (appointment, completedAt = new Date().toISOString()) => {
  if (!appointment?.id) {
    throw new Error('Appointment is required to create consultation record');
  }

  const existing = await findConsultationByAppointmentId(appointment.id);
  if (existing) {
    return existing;
  }

  const payload = buildConsultationFromAppointment(appointment, completedAt);

  if (canUseFirestore()) {
    await db.collection(collections.consultations).doc(payload.id).set(payload);
    return payload;
  }

  await ensureFallbackStore();
  fallbackStore.consultations.unshift(payload);
  await persistFallbackStore();
  return payload;
};

const getConsultationsByPatient = async (patientPhone) => {
  if (canUseFirestore()) {
    const snapshot = await db.collection(collections.consultations).orderBy('createdAt', 'desc').get();
    return snapshot.docs
      .map(toPlain)
      .filter((item) => item.patientPhone === patientPhone)
      .sort((a, b) => String(b.completedAt || b.createdAt).localeCompare(String(a.completedAt || a.createdAt)));
  }

  await ensureFallbackStore();
  return fallbackStore.consultations
    .filter((item) => item.patientPhone === patientPhone)
    .sort((a, b) => String(b.completedAt || b.createdAt).localeCompare(String(a.completedAt || a.createdAt)));
};

const getPatientDoctorHistorySummary = async ({
  patientPhone,
  doctorName,
  limit = 5,
  appointmentId,
  appointmentDate,
}) => {
  const normalizedPatientPhone = String(patientPhone || '').trim();
  const normalizedDoctorName = String(doctorName || '').trim();

  if (!normalizedPatientPhone || !normalizedDoctorName) {
    return {
      hasHistory: false,
      visitCountWithDoctor: 0,
      lastVisitDate: null,
      recentDiagnoses: [],
      recentMedicines: [],
      summaryBullets: [],
      summaryText: '',
      entries: [],
    };
  }

  const safeLimit = Number.isFinite(Number(limit))
    ? Math.max(1, Math.min(10, Number(limit)))
    : 5;

  const [consultationRows, prescriptionRows] = await Promise.all([
    getConsultationsByPatient(normalizedPatientPhone),
    getPrescriptionsByPatient(normalizedPatientPhone),
  ]);

  const appointmentRecord = appointmentId
    ? await getAppointmentById(String(appointmentId))
    : null;
  const anchorAppointmentDate = String(
    appointmentDate
      || appointmentRecord?.appointmentDate
      || appointmentRecord?.date
      || ''
  ).trim();

  const doctorMatches = (name = '') => normalizeValue(name) === normalizeValue(normalizedDoctorName);

  const consultationEntries = (Array.isArray(consultationRows) ? consultationRows : [])
    .filter((row) => doctorMatches(row?.doctorName))
    .map((row) => ({
      source: 'consultation',
      id: row.id,
      date: row.date || row.completedAt?.slice(0, 10) || row.createdAt?.slice(0, 10) || null,
      timestamp: row.completedAt || row.createdAt || row.date || '',
      diagnosis: '',
      reason: row.reason || '',
      symptoms: row.symptoms || '',
      medicines: [],
    }));

  const prescriptionEntries = (Array.isArray(prescriptionRows) ? prescriptionRows : [])
    .filter((row) => doctorMatches(row?.doctorName))
    .map((row) => ({
      source: 'prescription',
      id: row.id,
      date: row.date || row.createdAt?.slice(0, 10) || null,
      timestamp: row.createdAt || row.date || '',
      diagnosis: String(row.diagnosis || '').trim(),
      reason: '',
      medicines: (Array.isArray(row.medicines) ? row.medicines : [])
        .map((medicine) => String(medicine?.name || '').trim())
        .filter(Boolean),
    }));

  const timestampOf = (entry) => new Date(String(entry?.timestamp || entry?.date || 0)).getTime();
  const normalizedDatePart = (value = '') => {
    const text = String(value || '');
    if (!text) return '';
    return text.includes('T') ? text.split('T')[0] : text;
  };

  const hasAnchor = Boolean(anchorAppointmentDate);
  const anchorDateOnly = normalizedDatePart(anchorAppointmentDate);
  const anchorTime = hasAnchor ? new Date(`${anchorDateOnly}T23:59:59`).getTime() : null;

  const mergedEntries = [...consultationEntries, ...prescriptionEntries]
    .sort((a, b) => {
      if (!hasAnchor) {
        return timestampOf(b) - timestampOf(a);
      }

      const aTime = timestampOf(a);
      const bTime = timestampOf(b);
      const aIsBeforeOrOnAnchor = aTime <= anchorTime;
      const bIsBeforeOrOnAnchor = bTime <= anchorTime;

      // Prioritize records that happened on/before this appointment timeline.
      if (aIsBeforeOrOnAnchor !== bIsBeforeOrOnAnchor) {
        return aIsBeforeOrOnAnchor ? -1 : 1;
      }

      if (aIsBeforeOrOnAnchor && bIsBeforeOrOnAnchor) {
        // Among historical records, closest recent first.
        return bTime - aTime;
      }

      // For records after anchor date, keep nearest future first.
      return aTime - bTime;
    });

  const recentEntries = mergedEntries.slice(0, safeLimit);
  const visitCountWithDoctor = mergedEntries.length;
  const hasHistory = visitCountWithDoctor > 0;
  const lastVisitDate = hasHistory ? (recentEntries[0]?.date || null) : null;

  const latestPrescription = prescriptionEntries
    .sort((a, b) => timestampOf(b) - timestampOf(a))[0] || null;

  const diagnosisSet = [];
  const diagnosisSeen = new Set();
  recentEntries.forEach((entry) => {
    const diagnosis = String(entry?.diagnosis || '').trim();
    if (!diagnosis) return;
    const key = diagnosis.toLowerCase();
    if (diagnosisSeen.has(key)) return;
    diagnosisSeen.add(key);
    diagnosisSet.push(diagnosis);
  });

  const medicineSet = [];
  const medicineSeen = new Set();
  recentEntries.forEach((entry) => {
    (Array.isArray(entry?.medicines) ? entry.medicines : []).forEach((medicineName) => {
      const clean = String(medicineName || '').trim();
      if (!clean) return;
      const key = clean.toLowerCase();
      if (medicineSeen.has(key)) return;
      medicineSeen.add(key);
      medicineSet.push(clean);
    });
  });

  const symptomSet = [];
  const symptomSeen = new Set();
  recentEntries.forEach((entry) => {
    const symptomText = String(entry?.symptoms || '').trim();
    if (!symptomText) return;
    const key = symptomText.toLowerCase();
    if (symptomSeen.has(key)) return;
    symptomSeen.add(key);
    symptomSet.push(symptomText);
  });

  const recentReasons = recentEntries
    .map((entry) => String(entry?.reason || '').trim())
    .filter(Boolean)
    .slice(0, 3);

  const summaryBullets = [];
  if (hasHistory) {
    summaryBullets.push(`Visited this doctor ${visitCountWithDoctor} time${visitCountWithDoctor > 1 ? 's' : ''}.`);
  }
  if (lastVisitDate) {
    summaryBullets.push(`Last visit: ${lastVisitDate}.`);
  }
  if (symptomSet.length > 0) {
    summaryBullets.push(`Recent symptoms: ${symptomSet.slice(0, 3).join(', ')}.`);
  }
  if (diagnosisSet.length > 0) {
    summaryBullets.push(`Recent diagnosis: ${diagnosisSet.slice(0, 3).join(', ')}.`);
  }
  if (medicineSet.length > 0) {
    summaryBullets.push(`Recently prescribed: ${medicineSet.slice(0, 5).join(', ')}.`);
  }
  if (recentReasons.length > 0) {
    summaryBullets.push(`Recent concerns: ${recentReasons.join('; ')}.`);
  }
  if (hasAnchor) {
    summaryBullets.push(`Timeline prioritized for appointment on ${anchorDateOnly || anchorAppointmentDate}.`);
  }

  return {
    hasHistory,
    visitCountWithDoctor,
    lastVisitDate,
    appointmentAnchorDate: hasAnchor ? (anchorDateOnly || anchorAppointmentDate) : null,
    prioritizedByAppointment: hasAnchor,
    recentSymptoms: symptomSet.slice(0, 5),
    recentDiagnoses: diagnosisSet.slice(0, 5),
    recentMedicines: medicineSet.slice(0, 10),
    lastPrescriptionFromDoctor: latestPrescription
      ? {
          id: latestPrescription.id,
          date: latestPrescription.date,
          diagnosis: latestPrescription.diagnosis,
          medicines: latestPrescription.medicines,
        }
      : null,
    summaryBullets,
    summaryText: summaryBullets.join(' '),
    entries: recentEntries.map((entry) => ({
      source: entry.source,
      id: entry.id,
      date: entry.date,
      diagnosis: entry.diagnosis,
      reason: entry.reason,
      symptoms: entry.symptoms,
      medicines: entry.medicines,
    })),
  };
};

const archiveExpiredAppointmentsForPatient = async (patientPhone) => {
  const appointments = await getAppointments({ patientPhone });
  const now = Date.now();
  const archived = [];

  for (const appointment of appointments) {
    const normalizedStatus = normalizeValue(appointment?.status || 'scheduled');
    if (normalizedStatus === 'cancelled' || normalizedStatus === 'completed') {
      continue;
    }

    const appointmentDateTime = parseAppointmentDateTime(appointment);
    if (!appointmentDateTime) {
      continue;
    }

    if (appointmentDateTime.getTime() < now) {
      const completedAt = new Date().toISOString();
      const consultation = await createConsultationFromAppointment(appointment, completedAt);
      archived.push(consultation);
      await updateAppointment(appointment.id, { status: 'completed', completedAt });
    }
  }

  return {
    archivedCount: archived.length,
    consultations: archived,
  };
};

module.exports = {
  createPatient,
  loginPatient,
  patientExists,
  getPatients,
  getDoctors,
  addDoctor,
  deleteDoctor,
  getDoctorTimeSlots,
  updateDoctorTimeSlots,
  getSymptomDoctorCoverage,
  loginDoctor,
  loginAdmin,
  getPharmacies,
  addPharmacy,
  updatePharmacyStock,
  createAppointment,
  getAppointmentById,
  getAppointments,
  updateAppointment,
  deleteAppointment,
  createPrescription,
  getPrescriptionsByPatient,
  createConsultationFromAppointment,
  getConsultationsByPatient,
  getPatientDoctorHistorySummary,
  archiveExpiredAppointmentsForPatient,
};
