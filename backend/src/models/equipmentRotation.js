/**
 * Equipment Rotation Phase-1 Model (in-memory)
 * Donor activation, listing lifecycle, patient requests, doctor approvals,
 * return tracking, sanitization logs, and donor impact counters.
 */

const { v4: uuidv4 } = require('uuid');

const EQUIPMENT_CATEGORIES = [
  'wheelchair',
  'walker',
  'hospital bed',
  'bp monitor',
  'crutches',
  'back brace',
  'cpap',
  'knee brace',
  'other',
];

const LISTING_STATUSES = [
  'pending_admin_review',
  'active',
  'on_loan',
  'returned',
  'donated',
  'rejected',
];

const REQUEST_APPROVAL_STATUSES = ['pending', 'approved', 'rejected', 'modified'];
const REQUEST_PATIENT_STATUSES = ['pending', 'approved', 'active', 'completed', 'rejected'];

const nowIso = () => new Date().toISOString();

const addDays = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
};

const parseDurationToDays = (duration) => {
  const normalized = String(duration || '').toLowerCase();
  if (normalized === '1 month') return 30;
  if (normalized === '3 months') return 90;
  if (normalized === '6 months') return 180;
  if (normalized === 'open-ended') return null;
  const maybeNum = Number(duration);
  if (!Number.isNaN(maybeNum) && maybeNum > 0) return maybeNum;
  return null;
};

let donorProfiles = [
  {
    userId: 'demo-donor-1',
    name: 'Ramesh Kumar',
    city: 'Bengaluru',
    pincode: '560001',
    phone: '+91-9000000001',
    isDonor: true,
    activatedAt: nowIso(),
    updatedAt: nowIso(),
  },
];

let equipmentListings = [
  {
    id: 'listing_wheelchair_1',
    donorUserId: 'demo-donor-1',
    category: 'wheelchair',
    itemName: 'Foldable Wheelchair',
    condition: 'Good',
    photos: ['https://example.com/wheelchair-1.jpg'],
    availabilityType: 'lend',
    lendDurationDays: 90,
    city: 'Bengaluru',
    pincode: '560001',
    handoverType: 'Self-pickup',
    status: 'active',
    adminReviewNote: 'Approved for rotation',
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
];

let equipmentRequests = [];
let sanitizationLogs = [];

let donorImpact = [
  {
    donorUserId: 'demo-donor-1',
    totalLends: 1,
    totalDonations: 0,
    familiesHelped: 1,
    badges: ['First Lend'],
    updatedAt: nowIso(),
  },
];

const getDonorProfile = (userId) => donorProfiles.find((item) => item.userId === userId) || null;

const activateDonor = ({ userId, name, city, pincode, phone }) => {
  if (!userId || !name || !city || !pincode || !phone) {
    return { error: 'Required fields: userId, name, city, pincode, phone', status: 400 };
  }

  const existing = getDonorProfile(userId);
  if (existing) {
    const updated = { ...existing, name, city, pincode, phone, isDonor: true, updatedAt: nowIso() };
    donorProfiles = donorProfiles.map((item) => (item.userId === userId ? updated : item));
    return { donorProfile: updated, isNew: false };
  }

  const donorProfile = {
    userId,
    name,
    city,
    pincode,
    phone,
    isDonor: true,
    activatedAt: nowIso(),
    updatedAt: nowIso(),
  };

  donorProfiles.push(donorProfile);
  donorImpact.push({
    donorUserId: userId,
    totalLends: 0,
    totalDonations: 0,
    familiesHelped: 0,
    badges: ['First Step Donor'],
    updatedAt: nowIso(),
  });

  return { donorProfile, isNew: true };
};

const createListing = (payload) => {
  const {
    donorUserId,
    category,
    itemName,
    condition,
    photos,
    availabilityType,
    lendDuration,
    city,
    pincode,
    handoverType,
  } = payload;

  if (!donorUserId || !category || !condition || !availabilityType || !city || !pincode || !handoverType) {
    return {
      error: 'Required fields: donorUserId, category, condition, availabilityType, city, pincode, handoverType',
      status: 400,
    };
  }

  if (!EQUIPMENT_CATEGORIES.includes(category)) {
    return { error: 'Invalid equipment category', status: 400 };
  }

  if (!['lend', 'donate'].includes(availabilityType)) {
    return { error: 'availabilityType must be lend or donate', status: 400 };
  }

  if (!['Good', 'Gently Used', 'Needs minor repair'].includes(condition)) {
    return { error: 'Invalid condition value', status: 400 };
  }

  if (!Array.isArray(photos) || photos.length < 1 || photos.length > 4) {
    return { error: 'Photos must be an array with 1 to 4 items', status: 400 };
  }

  const donor = getDonorProfile(donorUserId);
  if (!donor) {
    return { error: 'Donor profile not found. Activate donor first.', status: 400 };
  }

  const lendDurationDays = availabilityType === 'lend' ? parseDurationToDays(lendDuration) : null;
  if (availabilityType === 'lend' && lendDurationDays === null) {
    return { error: 'lendDuration is required for lend listings', status: 400 };
  }

  const listing = {
    id: `listing_${uuidv4().slice(0, 10)}`,
    donorUserId,
    category,
    itemName: itemName || category,
    condition,
    photos,
    availabilityType,
    lendDurationDays,
    city,
    pincode,
    handoverType,
    status: 'pending_admin_review',
    adminReviewNote: '',
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  equipmentListings.push(listing);
  return { listing };
};

const getListings = (filters = {}) => {
  const {
    city = '',
    pincode = '',
    category = 'all',
    availabilityType = 'all',
    condition = 'all',
    includePending = false,
  } = filters;

  const normalizedCity = String(city).trim().toLowerCase();
  const normalizedPincode = String(pincode).trim();

  return equipmentListings
    .filter((item) => (includePending ? true : item.status === 'active'))
    .filter((item) => (normalizedCity ? item.city.toLowerCase() === normalizedCity : true))
    .filter((item) => (normalizedPincode ? item.pincode === normalizedPincode : true))
    .filter((item) => (category === 'all' ? true : item.category === category))
    .filter((item) => (availabilityType === 'all' ? true : item.availabilityType === availabilityType))
    .filter((item) => (condition === 'all' ? true : item.condition === condition))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

const getListingById = (listingId) => equipmentListings.find((item) => item.id === listingId) || null;

const moderateListing = ({ listingId, adminDecision, adminNote = '' }) => {
  const listing = getListingById(listingId);
  if (!listing) {
    return { error: 'Listing not found', status: 404 };
  }

  if (!['approved', 'rejected'].includes(adminDecision)) {
    return { error: 'adminDecision must be approved or rejected', status: 400 };
  }

  listing.status = adminDecision === 'approved' ? 'active' : 'rejected';
  listing.adminReviewNote = adminNote;
  listing.updatedAt = nowIso();

  return { listing };
};

const createRequest = (payload) => {
  const {
    patientUserId,
    listingId,
    reason,
    durationDays,
    doctorUserId,
    preferredPickupMethod,
  } = payload;

  if (!patientUserId || !listingId || !reason || !doctorUserId || !preferredPickupMethod) {
    return {
      error: 'Required fields: patientUserId, listingId, reason, doctorUserId, preferredPickupMethod',
      status: 400,
    };
  }

  const listing = getListingById(listingId);
  if (!listing) {
    return { error: 'Listing not found', status: 404 };
  }

  if (listing.status !== 'active') {
    return { error: 'Listing is not currently available for request', status: 400 };
  }

  if (String(reason).length > 200) {
    return { error: 'Reason must be 200 characters or less', status: 400 };
  }

  if (patientUserId === listing.donorUserId) {
    return { error: 'Donor cannot request their own equipment', status: 400 };
  }

  const existingActiveRequest = equipmentRequests.find(
    (item) => item.patientUserId === patientUserId && ['approved', 'active', 'pending'].includes(item.patientStatus)
  );

  if (existingActiveRequest) {
    return {
      error: 'Patient already has an active or pending equipment request (Phase-1 anti-misuse rule)',
      status: 400,
    };
  }

  const duration = durationDays || listing.lendDurationDays || 30;
  const requestDate = nowIso();
  const returnDueDate = addDays(duration);

  const request = {
    id: `request_${uuidv4().slice(0, 10)}`,
    patientUserId,
    listingId,
    reason,
    durationDays: duration,
    preferredPickupMethod,
    doctorUserId,
    doctorApprovalStatus: 'pending',
    doctorNote: '',
    patientStatus: 'pending',
    requestDate,
    returnDueDate,
    returnedAt: null,
    createdAt: requestDate,
    updatedAt: requestDate,
  };

  equipmentRequests.push(request);
  return { request, listing };
};

const getRequestsByDoctor = (doctorUserId) => {
  return equipmentRequests
    .filter((item) => item.doctorUserId === doctorUserId && item.doctorApprovalStatus === 'pending')
    .map((request) => ({
      ...request,
      listing: getListingById(request.listingId),
    }))
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
};

const getRequestsByPatient = (patientUserId) => {
  return equipmentRequests
    .filter((item) => item.patientUserId === patientUserId)
    .map((request) => ({
      ...request,
      listing: getListingById(request.listingId),
    }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

const doctorDecision = ({ requestId, decision, doctorNote = '', suggestedCategory = '' }) => {
  const request = equipmentRequests.find((item) => item.id === requestId);
  if (!request) {
    return { error: 'Request not found', status: 404 };
  }

  if (!['approve', 'reject', 'modify'].includes(decision)) {
    return { error: 'decision must be approve, reject, or modify', status: 400 };
  }

  const listing = getListingById(request.listingId);

  if (decision === 'approve') {
    request.doctorApprovalStatus = 'approved';
    request.patientStatus = 'approved';
    request.doctorNote = doctorNote;

    if (listing) {
      listing.status = 'on_loan';
      listing.updatedAt = nowIso();
    }
  }

  if (decision === 'reject') {
    request.doctorApprovalStatus = 'rejected';
    request.patientStatus = 'rejected';
    request.doctorNote = doctorNote;
  }

  if (decision === 'modify') {
    request.doctorApprovalStatus = 'modified';
    request.patientStatus = 'pending';
    request.doctorNote = suggestedCategory
      ? `${doctorNote} | Suggested equipment: ${suggestedCategory}`
      : doctorNote;
  }

  request.updatedAt = nowIso();

  return {
    request,
    listing,
  };
};

const markPickupConfirmed = ({ requestId }) => {
  const request = equipmentRequests.find((item) => item.id === requestId);
  if (!request) {
    return { error: 'Request not found', status: 404 };
  }

  if (request.doctorApprovalStatus !== 'approved') {
    return { error: 'Doctor approval is required before pickup', status: 400 };
  }

  request.patientStatus = 'active';
  request.updatedAt = nowIso();

  return { request };
};

const markReturned = ({ requestId }) => {
  const request = equipmentRequests.find((item) => item.id === requestId);
  if (!request) {
    return { error: 'Request not found', status: 404 };
  }

  request.patientStatus = 'completed';
  request.returnedAt = nowIso();
  request.updatedAt = nowIso();

  const listing = getListingById(request.listingId);
  if (listing && listing.availabilityType === 'lend') {
    listing.status = 'returned';
    listing.updatedAt = nowIso();
  }
  if (listing && listing.availabilityType === 'donate') {
    listing.status = 'donated';
    listing.updatedAt = nowIso();
  }

  return { request, listing };
};

const addSanitizationLog = ({ listingId, sanitizedBy, photoUrl = '', notes = '' }) => {
  const listing = getListingById(listingId);
  if (!listing) {
    return { error: 'Listing not found', status: 404 };
  }

  if (!sanitizedBy) {
    return { error: 'sanitizedBy is required', status: 400 };
  }

  const log = {
    id: `san_${uuidv4().slice(0, 10)}`,
    listingId,
    sanitizedBy,
    sanitizedAt: nowIso(),
    photoUrl,
    notes,
  };

  sanitizationLogs.push(log);

  if (listing.availabilityType === 'lend' && ['returned', 'on_loan'].includes(listing.status)) {
    listing.status = 'active';
    listing.updatedAt = nowIso();
  }

  return { log, listing };
};

const getDonorImpact = (donorUserId) => {
  let impact = donorImpact.find((item) => item.donorUserId === donorUserId);
  if (!impact) {
    impact = {
      donorUserId,
      totalLends: 0,
      totalDonations: 0,
      familiesHelped: 0,
      badges: ['First Step Donor'],
      updatedAt: nowIso(),
    };
    donorImpact.push(impact);
  }

  return impact;
};

const recalculateDonorImpact = (donorUserId) => {
  const donorListings = equipmentListings.filter((item) => item.donorUserId === donorUserId);
  const donorCompletedRequests = equipmentRequests.filter((request) => {
    const listing = getListingById(request.listingId);
    return listing && listing.donorUserId === donorUserId && request.patientStatus === 'completed';
  });

  const totalDonations = donorListings.filter((item) => item.status === 'donated').length;
  const totalLends = donorCompletedRequests.length - totalDonations > 0
    ? donorCompletedRequests.length - totalDonations
    : donorCompletedRequests.length;

  const familiesHelped = new Set(donorCompletedRequests.map((item) => item.patientUserId)).size;

  const badges = [];
  if (donorCompletedRequests.length >= 1) badges.push('First Lend');
  if (donorCompletedRequests.length >= 5) badges.push('5-time Donor');
  if (familiesHelped >= 5) badges.push('Community Hero');
  if (badges.length === 0) badges.push('First Step Donor');

  const existing = donorImpact.find((item) => item.donorUserId === donorUserId);
  const impactPayload = {
    donorUserId,
    totalLends,
    totalDonations,
    familiesHelped,
    badges,
    updatedAt: nowIso(),
  };

  if (existing) {
    donorImpact = donorImpact.map((item) => (item.donorUserId === donorUserId ? impactPayload : item));
  } else {
    donorImpact.push(impactPayload);
  }

  return impactPayload;
};

const getAdminSummary = () => {
  const pendingListings = equipmentListings.filter((item) => item.status === 'pending_admin_review').length;
  const activeListings = equipmentListings.filter((item) => item.status === 'active').length;
  const cityWiseDemand = equipmentRequests.reduce((acc, request) => {
    const listing = getListingById(request.listingId);
    const key = listing?.city || 'Unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return {
    pendingListings,
    activeListings,
    totalRequests: equipmentRequests.length,
    pendingDoctorApprovals: equipmentRequests.filter((item) => item.doctorApprovalStatus === 'pending').length,
    totalSanitizationLogs: sanitizationLogs.length,
    cityWiseDemand,
  };
};

module.exports = {
  EQUIPMENT_CATEGORIES,
  LISTING_STATUSES,
  REQUEST_APPROVAL_STATUSES,
  REQUEST_PATIENT_STATUSES,
  activateDonor,
  getDonorProfile,
  createListing,
  getListings,
  getListingById,
  moderateListing,
  createRequest,
  getRequestsByDoctor,
  getRequestsByPatient,
  doctorDecision,
  markPickupConfirmed,
  markReturned,
  addSanitizationLog,
  getDonorImpact,
  recalculateDonorImpact,
  getAdminSummary,
};
