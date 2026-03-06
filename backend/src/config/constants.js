// API Response Messages
const MESSAGES = {
  SUCCESS: 'Operation successful',
  ERROR: 'An error occurred',
  INVALID_INPUT: 'Invalid input provided',
  UNAUTHORIZED: 'Unauthorized access',
  NOT_FOUND: 'Resource not found',
  ALREADY_EXISTS: 'Resource already exists',
};

// User Roles
const ROLES = {
  PATIENT: 'patient',
  DOCTOR: 'doctor',
  ADMIN: 'admin',
};

// Call Types
const CALL_TYPES = {
  AUDIO: 'audio',
  VIDEO: 'video',
};

// Appointment Status
const APPOINTMENT_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

module.exports = {
  MESSAGES,
  ROLES,
  CALL_TYPES,
  APPOINTMENT_STATUS,
};
