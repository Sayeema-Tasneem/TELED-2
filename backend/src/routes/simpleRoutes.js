const express = require('express');
const router = express.Router();
const multer = require('multer');
const simpleStoreService = require('../services/simpleStoreService');
const voiceTranscriptionService = require('../services/voiceTranscriptionService');
const {
  activateDonor,
  createListing,
  getListings,
  getListingsByDonor,
  deleteListing,
  moderateListing,
  createRequest,
  getRequestsByDoctor,
  getRequestsByPatient,
  doctorDecision,
  markReturned,
  addSanitizationLog,
  getDonorImpact,
  recalculateDonorImpact,
  getAdminSummary,
} = require('../models/equipmentRotation');

const voiceUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

const normalizeValue = (value) => String(value || '').trim();
const normalizeKey = (value) => normalizeValue(value).toLowerCase();

const getSimpleEquipmentActor = (req) => {
  const role = normalizeKey(req.headers['x-simple-role']);
  const userId = normalizeValue(req.headers['x-simple-user-id']);
  const name = normalizeValue(req.headers['x-simple-name']);
  const phone = normalizeValue(req.headers['x-simple-phone']);
  const city = normalizeValue(req.headers['x-simple-city']);
  const pincode = normalizeValue(req.headers['x-simple-pincode']);

  if (!role) {
    return null;
  }

  return { role, userId, name, phone, city, pincode };
};

const requireSimpleEquipmentRoles = (...allowedRoles) => (req, res, next) => {
  const actor = getSimpleEquipmentActor(req);
  if (!actor) {
    return res.status(401).json({ success: false, message: 'Simple login session is required' });
  }

  if (!allowedRoles.includes(actor.role)) {
    return res.status(403).json({ success: false, message: 'Insufficient role permissions' });
  }

  req.simpleEquipmentActor = actor;
  return next();
};

const handleEquipmentResult = (res, result, successStatus = 200, successPayload = {}) => {
  if (result?.error) {
    return res.status(result.status || 400).json({
      success: false,
      message: result.error,
    });
  }

  return res.status(successStatus).json({
    success: true,
    ...successPayload,
    ...result,
  });
};

const resolveSimpleDoctorUserId = async (patientUserId) => {
  const appointments = await simpleStoreService.getAppointments({ patientPhone: patientUserId });
  const latestAppointment = (Array.isArray(appointments) ? appointments : [])
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())[0];

  if (!latestAppointment?.doctorName) {
    return null;
  }

  const doctors = await simpleStoreService.getDoctors();
  const match = (Array.isArray(doctors) ? doctors : []).find(
    (doctor) => normalizeKey(doctor.name) === normalizeKey(latestAppointment.doctorName)
  );

  return match?.id || null;
};

const assertSimpleSelfOrAdmin = (actor, targetUserId, roleLabel) => {
  if (actor.role === 'admin') {
    return null;
  }

  if (normalizeValue(actor.userId) !== normalizeValue(targetUserId)) {
    return `${roleLabel} can only access their own equipment hub data`;
  }

  return null;
};

router.post('/voice/transcribe', voiceUpload.single('audio'), async (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ success: false, message: 'Audio file is required' });
    }

    if ((req.file?.size || 0) <= 0) {
      return res.status(400).json({ success: false, message: 'Uploaded audio is empty' });
    }

    const { language, prompt } = req.body || {};
    const transcription = await voiceTranscriptionService.transcribeAudioBuffer({
      audioBuffer: req.file.buffer,
      filename: req.file.originalname || `voice-${Date.now()}.m4a`,
      mimetype: req.file.mimetype || 'audio/m4a',
      language: language || 'en',
      prompt,
    });

    return res.status(200).json({
      success: true,
      transcript: transcription.transcript,
      provider: transcription.provider,
      model: transcription.model,
    });
  } catch (error) {
    const message = error?.response?.data?.error?.message || error.message || 'Failed to transcribe voice';
    const statusCode = Number(error?.statusCode) || Number(error?.response?.status) || 500;
    return res.status(statusCode).json({ success: false, message, code: error?.code });
  }
});

router.post('/patients/register', async (req, res) => {
  try {
    const { name, phone, age, gender, village, pin } = req.body;

    if (!name || !phone || !age || !gender || !village || !pin) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    if (!/^\d{10}$/.test(String(phone))) {
      return res.status(400).json({ success: false, message: 'Phone must be 10 digits' });
    }

    if (!/^\d{4}$/.test(String(pin))) {
      return res.status(400).json({ success: false, message: 'PIN must be 4 digits' });
    }

    const patient = await simpleStoreService.createPatient({
      name,
      phone: String(phone),
      age: String(age),
      gender,
      village,
      pin: String(pin),
    });

    return res.status(201).json({ success: true, patient });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message || 'Failed to register patient' });
  }
});

router.post('/patients/login', async (req, res) => {
  try {
    const { phone, pin } = req.body;
    if (!phone || !pin) {
      return res.status(400).json({ success: false, message: 'Phone and PIN are required' });
    }

    const normalizedPhone = String(phone);
    const normalizedPin = String(pin);
    const patient = await simpleStoreService.loginPatient(normalizedPhone, normalizedPin);
    if (!patient) {
      const isRegistered = await simpleStoreService.patientExists(normalizedPhone);
      if (!isRegistered) {
        return res.status(404).json({ success: false, message: 'Please register first' });
      }

      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    return res.status(200).json({ success: true, patient });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to login patient' });
  }
});

router.get('/patients', async (req, res) => {
  try {
    const patients = await simpleStoreService.getPatients();
    return res.status(200).json({ success: true, patients });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch patients' });
  }
});

router.get('/doctors', async (req, res) => {
  try {
    const doctors = await simpleStoreService.getDoctors();
    return res.status(200).json({ success: true, doctors });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch doctors' });
  }
});

router.post('/doctors', async (req, res) => {
  try {
    const { name, specialty, pin } = req.body || {};
    const doctor = await simpleStoreService.addDoctor({ name, specialty, pin });
    return res.status(201).json({ success: true, doctor });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message || 'Failed to add doctor' });
  }
});

router.delete('/doctors/:id', async (req, res) => {
  try {
    const doctor = await simpleStoreService.deleteDoctor(req.params.id);
    return res.status(200).json({ success: true, doctor });
  } catch (error) {
    const message = error.message || 'Failed to delete doctor';
    const statusCode = message.toLowerCase().includes('not found') ? 404 : 400;
    return res.status(statusCode).json({ success: false, message });
  }
});

router.get('/doctors/:id/timeslots', async (req, res) => {
  try {
    const timeslots = await simpleStoreService.getDoctorTimeSlots(req.params.id);
    return res.status(200).json({ success: true, slots: timeslots });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch time slots' });
  }
});

router.put('/doctors/:id/timeslots', async (req, res) => {
  try {
    const { slots } = req.body || {};
    const doctor = await simpleStoreService.updateDoctorTimeSlots(req.params.id, slots);
    return res.status(200).json({ success: true, doctor });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message || 'Failed to update time slots' });
  }
});

router.get('/doctors/coverage/symptoms', async (req, res) => {
  try {
    const coverage = await simpleStoreService.getSymptomDoctorCoverage();
    return res.status(200).json({ success: true, coverage });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch coverage' });
  }
});

router.post('/doctors/login', async (req, res) => {
  try {
    const { doctorName, pin } = req.body;
    if (!doctorName || !pin) {
      return res.status(400).json({ success: false, message: 'Doctor name and PIN are required' });
    }

    const doctor = await simpleStoreService.loginDoctor(doctorName, String(pin));
    if (!doctor) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    return res.status(200).json({ success: true, doctor });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to login doctor' });
  }
});

router.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const ok = await simpleStoreService.loginAdmin(username, password);

    if (!ok) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to login admin' });
  }
});

router.get('/equipment-rotation/listings', requireSimpleEquipmentRoles('patient', 'doctor', 'admin'), async (req, res) => {
  try {
    const {
      city = '',
      pincode = '',
      category = 'all',
      availabilityType = 'all',
      condition = 'all',
      includePending = 'false',
    } = req.query;

    const listings = getListings({
      city,
      pincode,
      category,
      availabilityType,
      condition,
      includePending: includePending === 'true',
    });

    return res.status(200).json({
      success: true,
      count: listings.length,
      listings,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch equipment listings' });
  }
});

router.post('/equipment-rotation/donor/activate', requireSimpleEquipmentRoles('patient', 'doctor', 'admin'), async (req, res) => {
  try {
    const actor = req.simpleEquipmentActor;
    const result = activateDonor({
      ...req.body,
      userId: actor.userId || actor.phone,
      name: req.body?.name || actor.name || 'Community Donor',
      city: req.body?.city || actor.city || 'Bengaluru',
      pincode: req.body?.pincode || actor.pincode || '560001',
      phone: req.body?.phone || actor.phone || actor.userId,
    });

    return handleEquipmentResult(res, result, 200, {
      message: result.isNew ? 'Donor profile activated successfully' : 'Donor profile updated successfully',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to activate donor profile' });
  }
});

router.post('/equipment-rotation/listings', requireSimpleEquipmentRoles('patient', 'doctor', 'admin'), async (req, res) => {
  try {
    const actor = req.simpleEquipmentActor;
    const result = createListing({
      ...req.body,
      donorUserId: actor.userId || actor.phone,
    });

    return handleEquipmentResult(res, result, 201, {
      message: 'Equipment listing submitted for admin review',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to create equipment listing' });
  }
});

router.get('/equipment-rotation/donor/:donorUserId/listings', requireSimpleEquipmentRoles('patient', 'doctor', 'admin'), async (req, res) => {
  try {
    const actor = req.simpleEquipmentActor;
    const authError = assertSimpleSelfOrAdmin(actor, req.params.donorUserId, 'User');
    if (authError && actor.role !== 'doctor') {
      return res.status(403).json({ success: false, message: authError });
    }

    const listings = getListingsByDonor(req.params.donorUserId);
    return res.status(200).json({ success: true, count: listings.length, listings });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to load donor listings' });
  }
});

router.delete('/equipment-rotation/listings/:id', requireSimpleEquipmentRoles('patient', 'doctor', 'admin'), async (req, res) => {
  try {
    const actor = req.simpleEquipmentActor;
    const result = deleteListing({
      listingId: req.params.id,
      requesterUserId: actor.userId || actor.phone,
      requesterRole: actor.role,
    });

    if (result?.listing?.donorUserId) {
      recalculateDonorImpact(result.listing.donorUserId);
    }

    return handleEquipmentResult(res, result, 200, {
      message: 'Equipment listing deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to delete equipment listing' });
  }
});

router.patch('/equipment-rotation/listings/:id/moderate', requireSimpleEquipmentRoles('admin'), async (req, res) => {
  try {
    const result = moderateListing({
      listingId: req.params.id,
      adminDecision: req.body?.adminDecision,
      adminNote: req.body?.adminNote || '',
    });

    return handleEquipmentResult(res, result, 200, {
      message: `Listing ${req.body?.adminDecision === 'approved' ? 'approved' : 'rejected'} successfully`,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to moderate listing' });
  }
});

router.post('/equipment-rotation/requests', requireSimpleEquipmentRoles('patient'), async (req, res) => {
  try {
    const actor = req.simpleEquipmentActor;
    const patientUserId = actor.userId || actor.phone;
    const doctorUserId = req.body?.doctorUserId || await resolveSimpleDoctorUserId(patientUserId);

    if (!doctorUserId) {
      return res.status(400).json({
        success: false,
        message: 'No assigned doctor found for this patient. Book or assign a doctor first.',
      });
    }

    const result = createRequest({
      ...req.body,
      patientUserId,
      doctorUserId,
    });

    return handleEquipmentResult(res, result, 201, {
      message: 'Request submitted to doctor for approval',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to create equipment request' });
  }
});

router.get('/equipment-rotation/requests/patient/:patientUserId', requireSimpleEquipmentRoles('patient', 'admin'), async (req, res) => {
  try {
    const actor = req.simpleEquipmentActor;
    const authError = assertSimpleSelfOrAdmin(actor, req.params.patientUserId, 'Patient');
    if (authError) {
      return res.status(403).json({ success: false, message: authError });
    }

    const requests = getRequestsByPatient(req.params.patientUserId);
    return res.status(200).json({ success: true, count: requests.length, requests });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to load patient requests' });
  }
});

router.get('/equipment-rotation/requests/doctor/:doctorUserId', requireSimpleEquipmentRoles('doctor', 'admin'), async (req, res) => {
  try {
    const actor = req.simpleEquipmentActor;
    const authError = assertSimpleSelfOrAdmin(actor, req.params.doctorUserId, 'Doctor');
    if (authError) {
      return res.status(403).json({ success: false, message: authError });
    }

    const requests = getRequestsByDoctor(req.params.doctorUserId);
    return res.status(200).json({ success: true, count: requests.length, requests });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to load doctor queue' });
  }
});

router.patch('/equipment-rotation/requests/:id/doctor-decision', requireSimpleEquipmentRoles('doctor', 'admin'), async (req, res) => {
  try {
    const actor = req.simpleEquipmentActor;
    if (actor.role === 'doctor') {
      const queue = getRequestsByDoctor(actor.userId || actor.phone);
      const inQueue = queue.some((item) => item.id === req.params.id);
      if (!inQueue) {
        return res.status(403).json({ success: false, message: 'Unauthorized access to requested doctor queue item' });
      }
    }

    const result = doctorDecision({
      requestId: req.params.id,
      decision: req.body?.decision,
      doctorNote: req.body?.doctorNote || '',
      suggestedCategory: req.body?.suggestedCategory || '',
    });

    if (result?.listing?.donorUserId) {
      recalculateDonorImpact(result.listing.donorUserId);
    }

    return handleEquipmentResult(res, result, 200, {
      message: `Doctor decision (${req.body?.decision}) applied successfully`,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to apply doctor decision' });
  }
});

router.patch('/equipment-rotation/requests/:id/mark-returned', requireSimpleEquipmentRoles('patient', 'admin'), async (req, res) => {
  try {
    const actor = req.simpleEquipmentActor;
    if (actor.role === 'patient') {
      const requests = getRequestsByPatient(actor.userId || actor.phone);
      const ownsRequest = requests.some((item) => item.id === req.params.id);
      if (!ownsRequest) {
        return res.status(403).json({ success: false, message: 'Unauthorized access to requested patient item' });
      }
    }

    const result = markReturned({ requestId: req.params.id });
    if (result?.listing?.donorUserId) {
      recalculateDonorImpact(result.listing.donorUserId);
    }

    return handleEquipmentResult(res, result, 200, {
      message: 'Item marked as returned',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to mark returned' });
  }
});

router.post('/equipment-rotation/listings/:id/sanitization', requireSimpleEquipmentRoles('patient', 'doctor', 'admin'), async (req, res) => {
  try {
    const actor = req.simpleEquipmentActor;
    const result = addSanitizationLog({
      listingId: req.params.id,
      sanitizedBy: actor.userId || actor.phone,
      photoUrl: req.body?.photoUrl || '',
      notes: req.body?.notes || '',
    });

    if (result?.listing?.donorUserId) {
      recalculateDonorImpact(result.listing.donorUserId);
    }

    return handleEquipmentResult(res, result, 201, {
      message: 'Sanitization log added and item re-listed if eligible',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to add sanitization log' });
  }
});

router.get('/equipment-rotation/donor/:donorUserId/impact', requireSimpleEquipmentRoles('patient', 'doctor', 'admin'), async (req, res) => {
  try {
    const actor = req.simpleEquipmentActor;
    const authError = assertSimpleSelfOrAdmin(actor, req.params.donorUserId, 'User');
    if (authError && actor.role !== 'doctor') {
      return res.status(403).json({ success: false, message: authError });
    }

    const impact = getDonorImpact(req.params.donorUserId);
    return res.status(200).json({ success: true, impact });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to load donor impact' });
  }
});

router.get('/equipment-rotation/admin/summary', requireSimpleEquipmentRoles('admin'), async (req, res) => {
  try {
    const summary = getAdminSummary();
    return res.status(200).json({ success: true, summary });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to load admin summary' });
  }
});

router.get('/pharmacies', async (req, res) => {
  try {
    const pharmacies = await simpleStoreService.getPharmacies();
    return res.status(200).json({ success: true, pharmacies });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch pharmacies' });
  }
});

router.post('/pharmacies', async (req, res) => {
  try {
    const { name, address, contact } = req.body || {};
    const pharmacy = await simpleStoreService.addPharmacy({ name, address, contact });
    return res.status(201).json({ success: true, pharmacy });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message || 'Failed to add pharmacy' });
  }
});

router.put('/pharmacies/:id/stock', async (req, res) => {
  try {
    const { medicineName, quantity, unit } = req.body || {};
    const pharmacy = await simpleStoreService.updatePharmacyStock(req.params.id, {
      medicineName,
      quantity,
      unit,
    });
    return res.status(200).json({ success: true, pharmacy });
  } catch (error) {
    const message = error.message || 'Failed to update stock';
    const statusCode = message.toLowerCase().includes('not found') ? 404 : 400;
    return res.status(statusCode).json({ success: false, message });
  }
});

router.post('/appointments', async (req, res) => {
  try {
    const {
      patientName,
      patientPhone,
      doctorName,
      date,
      reason,
      appointmentDate,
      appointmentTime,
      appointmentDay,
      consultationType,
      symptoms,
      suggestedSpecialty,
      suggestedBySymptoms,
    } = req.body;

    if (!patientName || !patientPhone || !doctorName || !(appointmentDate || date) || !appointmentTime || !reason) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const appointment = await simpleStoreService.createAppointment({
      patientName,
      patientPhone,
      doctorName,
      date,
      appointmentDate,
      appointmentTime,
      appointmentDay,
      consultationType,
      reason,
      symptoms,
      suggestedSpecialty,
      suggestedBySymptoms,
    });

    return res.status(201).json({ success: true, appointment });
  } catch (error) {
    const statusCode = error.message?.toLowerCase().includes('already booked') ? 409 : 500;
    return res.status(statusCode).json({ success: false, message: error.message || 'Failed to create appointment' });
  }
});

router.get('/appointments', async (req, res) => {
  try {
    const { doctorName, patientPhone, status } = req.query;
    const appointments = await simpleStoreService.getAppointments({ doctorName, patientPhone, status });
    return res.status(200).json({ success: true, appointments });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch appointments' });
  }
});

router.patch('/appointments/:id', async (req, res) => {
  try {
    const appointment = await simpleStoreService.updateAppointment(req.params.id, req.body || {});
    return res.status(200).json({ success: true, appointment });
  } catch (error) {
    const message = error.message || 'Failed to update appointment';
    const normalized = message.toLowerCase();
    const statusCode = normalized.includes('not found') ? 404 : normalized.includes('already booked') ? 409 : 500;
    return res.status(statusCode).json({ success: false, message });
  }
});

router.delete('/appointments/:id', async (req, res) => {
  try {
    const appointment = await simpleStoreService.deleteAppointment(req.params.id);
    return res.status(200).json({ success: true, appointment });
  } catch (error) {
    const message = error.message || 'Failed to delete appointment';
    const statusCode = message.toLowerCase().includes('not found') ? 404 : 500;
    return res.status(statusCode).json({ success: false, message });
  }
});

router.post('/prescriptions', async (req, res) => {
  try {
    const {
      patientPhone,
      doctorName,
      text,
      diagnosis,
      medicines,
      tests,
      scans,
      doctorNotes,
      followUpDays,
    } = req.body || {};

    const normalizedPatientPhone = String(patientPhone || '').trim();

    const hasLegacyText = Boolean(String(text || '').trim());
    const hasStructuredData =
      Boolean(String(diagnosis || '').trim())
      || (Array.isArray(medicines) && medicines.length > 0)
      || (Array.isArray(tests) && tests.length > 0)
      || (Array.isArray(scans) && scans.length > 0)
      || Boolean(String(doctorNotes || '').trim());

    if (!normalizedPatientPhone || !doctorName || (!hasLegacyText && !hasStructuredData)) {
      return res.status(400).json({
        success: false,
        message: 'Patient phone, doctor name, and prescription details are required',
      });
    }

    if (!/^\d{10}$/.test(normalizedPatientPhone)) {
      return res.status(400).json({
        success: false,
        message: 'Patient phone must be a valid 10-digit number',
      });
    }

    const patientRegistered = await simpleStoreService.patientExists(normalizedPatientPhone);
    if (!patientRegistered) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found. Please register patient first and use the same phone number.',
      });
    }

    const prescription = await simpleStoreService.createPrescription({
      patientPhone: normalizedPatientPhone,
      doctorName,
      text: String(text || '').trim(),
      diagnosis: String(diagnosis || '').trim(),
      medicines: Array.isArray(medicines) ? medicines : [],
      tests: Array.isArray(tests) ? tests : [],
      scans: Array.isArray(scans) ? scans : [],
      doctorNotes: String(doctorNotes || '').trim(),
      followUpDays: String(followUpDays || '').trim(),
    });

    return res.status(201).json({ success: true, prescription });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to save prescription' });
  }
});

router.get('/prescriptions/patient/:phone', async (req, res) => {
  try {
    const prescriptions = await simpleStoreService.getPrescriptionsByPatient(req.params.phone);
    return res.status(200).json({ success: true, prescriptions });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch prescriptions' });
  }
});

router.post('/consultations/archive-expired', async (req, res) => {
  try {
    const { patientPhone } = req.body || {};

    if (!patientPhone) {
      return res.status(400).json({ success: false, message: 'Patient phone is required' });
    }

    const result = await simpleStoreService.archiveExpiredAppointmentsForPatient(String(patientPhone));
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to archive consultations' });
  }
});

router.get('/consultations/history-summary', async (req, res) => {
  try {
    const {
      patientPhone,
      doctorName,
      limit,
      appointmentId,
      appointmentDate,
    } = req.query || {};

    if (!patientPhone || !doctorName) {
      return res.status(400).json({
        success: false,
        message: 'patientPhone and doctorName are required',
      });
    }

    const summary = await simpleStoreService.getPatientDoctorHistorySummary({
      patientPhone: String(patientPhone),
      doctorName: String(doctorName),
      limit,
      appointmentId,
      appointmentDate,
    });

    return res.status(200).json({ success: true, summary });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch consultation history summary' });
  }
});

router.get('/consultations/patient/:phone', async (req, res) => {
  try {
    const consultations = await simpleStoreService.getConsultationsByPatient(req.params.phone);
    return res.status(200).json({ success: true, consultations });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch consultations' });
  }
});

module.exports = router;
