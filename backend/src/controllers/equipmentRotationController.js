/**
 * Equipment Rotation Controller (Phase-1)
 */

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
  markPickupConfirmed,
  markReturned,
  addSanitizationLog,
  getDonorImpact,
  recalculateDonorImpact,
  getAdminSummary,
} = require('../models/equipmentRotation');
const { resolveAssignedDoctorUserId } = require('../services/doctorAssignmentService');

const handleResult = (res, result, successStatus = 200, successPayload = {}) => {
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

exports.activateDonor = (req, res) => {
  try {
    const result = activateDonor({
      ...req.body,
      userId: req.user?.phoneNumber,
      phone: req.user?.phoneNumber,
    });
    return handleResult(res, result, 200, {
      message: result.isNew ? 'Donor profile activated successfully' : 'Donor profile updated successfully',
    });
  } catch (error) {
    console.error('Error activating donor:', error);
    return res.status(500).json({ success: false, message: 'Failed to activate donor profile', error: error.message });
  }
};

exports.createListing = (req, res) => {
  try {
    const result = createListing({
      ...req.body,
      donorUserId: req.user?.phoneNumber,
    });
    return handleResult(res, result, 201, {
      message: 'Equipment listing submitted for admin review',
    });
  } catch (error) {
    console.error('Error creating listing:', error);
    return res.status(500).json({ success: false, message: 'Failed to create equipment listing', error: error.message });
  }
};

exports.getListings = (req, res) => {
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
    console.error('Error fetching listings:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch equipment listings', error: error.message });
  }
};

exports.getDonorListings = (req, res) => {
  try {
    const donorUserId = req.user?.role === 'admin'
      ? req.params?.donorUserId
      : req.user?.phoneNumber;
    const listings = getListingsByDonor(donorUserId);

    return res.status(200).json({
      success: true,
      count: listings.length,
      listings,
    });
  } catch (error) {
    console.error('Error fetching donor listings:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch donor listings', error: error.message });
  }
};

exports.deleteListing = (req, res) => {
  try {
    const { id: listingId } = req.params;
    const result = deleteListing({
      listingId,
      requesterUserId: req.user?.phoneNumber,
      requesterRole: req.user?.role,
    });

    if (result?.listing?.donorUserId) {
      recalculateDonorImpact(result.listing.donorUserId);
    }

    return handleResult(res, result, 200, {
      message: 'Equipment listing deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting listing:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete equipment listing', error: error.message });
  }
};

exports.moderateListing = (req, res) => {
  try {
    const { id: listingId } = req.params;
    const { adminDecision, adminNote = '' } = req.body;

    const result = moderateListing({ listingId, adminDecision, adminNote });
    return handleResult(res, result, 200, {
      message: `Listing ${adminDecision === 'approved' ? 'approved' : 'rejected'} successfully`,
    });
  } catch (error) {
    console.error('Error moderating listing:', error);
    return res.status(500).json({ success: false, message: 'Failed to moderate listing', error: error.message });
  }
};

exports.createRequest = async (req, res) => {
  try {
    const patientUserId = req.user?.phoneNumber;
    const doctorUserId = req.body?.doctorUserId || await resolveAssignedDoctorUserId(patientUserId);

    if (!doctorUserId) {
      return res.status(400).json({
        success: false,
        message: 'No assigned doctor found for this patient. Please ask admin to assign a doctor first.',
      });
    }

    const result = createRequest({
      ...req.body,
      patientUserId,
      doctorUserId,
    });

    return handleResult(res, result, 201, {
      message: 'Request submitted to assigned doctor for approval',
      notification: {
        targetRole: 'doctor',
        trigger: 'Patient submitted request',
      },
    });
  } catch (error) {
    console.error('Error creating request:', error);
    return res.status(500).json({ success: false, message: 'Failed to create equipment request', error: error.message });
  }
};

exports.getDoctorQueue = (req, res) => {
  try {
    const doctorUserId = req.user?.role === 'admin'
      ? req.params?.doctorUserId
      : req.user?.phoneNumber;
    const requests = getRequestsByDoctor(doctorUserId);

    return res.status(200).json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error) {
    console.error('Error fetching doctor queue:', error);
    return res.status(500).json({ success: false, message: 'Failed to load doctor queue', error: error.message });
  }
};

exports.getPatientRequests = (req, res) => {
  try {
    const patientUserId = req.user?.role === 'admin'
      ? req.params?.patientUserId
      : req.user?.phoneNumber;
    const requests = getRequestsByPatient(patientUserId);

    return res.status(200).json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error) {
    console.error('Error fetching patient requests:', error);
    return res.status(500).json({ success: false, message: 'Failed to load patient requests', error: error.message });
  }
};

exports.doctorDecision = (req, res) => {
  try {
    const { id: requestId } = req.params;
    const { decision, doctorNote = '', suggestedCategory = '' } = req.body;

    const result = doctorDecision({ requestId, decision, doctorNote, suggestedCategory });
    if (result?.listing?.donorUserId) {
      recalculateDonorImpact(result.listing.donorUserId);
    }

    const notifyTargets = decision === 'approve' ? ['patient', 'donor'] : ['patient'];

    return handleResult(res, result, 200, {
      message: `Doctor decision (${decision}) applied successfully`,
      notification: {
        targetRoles: notifyTargets,
        trigger: `Doctor ${decision}`,
      },
    });
  } catch (error) {
    console.error('Error applying doctor decision:', error);
    return res.status(500).json({ success: false, message: 'Failed to apply doctor decision', error: error.message });
  }
};

exports.confirmPickup = (req, res) => {
  try {
    const { id: requestId } = req.params;
    const result = markPickupConfirmed({ requestId });

    return handleResult(res, result, 200, {
      message: 'Pickup confirmed',
      notification: {
        targetRoles: ['patient', 'donor'],
        trigger: 'Pickup confirmed',
      },
    });
  } catch (error) {
    console.error('Error confirming pickup:', error);
    return res.status(500).json({ success: false, message: 'Failed to confirm pickup', error: error.message });
  }
};

exports.markReturned = (req, res) => {
  try {
    const { id: requestId } = req.params;
    const result = markReturned({ requestId });

    if (result?.listing?.donorUserId) {
      recalculateDonorImpact(result.listing.donorUserId);
    }

    return handleResult(res, result, 200, {
      message: 'Item marked as returned',
      notification: {
        targetRoles: ['donor'],
        trigger: 'Item returned',
      },
    });
  } catch (error) {
    console.error('Error marking return:', error);
    return res.status(500).json({ success: false, message: 'Failed to mark returned', error: error.message });
  }
};

exports.addSanitizationLog = (req, res) => {
  try {
    const { id: listingId } = req.params;
    const { photoUrl = '', notes = '' } = req.body;
    const sanitizedBy = req.user?.phoneNumber;

    const result = addSanitizationLog({ listingId, sanitizedBy, photoUrl, notes });
    if (result?.listing?.donorUserId) {
      recalculateDonorImpact(result.listing.donorUserId);
    }

    return handleResult(res, result, 201, {
      message: 'Sanitization log added and item re-listed if eligible',
      notification: {
        targetRoles: ['admin'],
        trigger: 'Item re-sanitized',
      },
    });
  } catch (error) {
    console.error('Error adding sanitization log:', error);
    return res.status(500).json({ success: false, message: 'Failed to add sanitization log', error: error.message });
  }
};

exports.getDonorImpact = (req, res) => {
  try {
    const { donorUserId } = req.params;
    const impact = getDonorImpact(donorUserId);

    return res.status(200).json({
      success: true,
      impact,
    });
  } catch (error) {
    console.error('Error getting donor impact:', error);
    return res.status(500).json({ success: false, message: 'Failed to load donor impact', error: error.message });
  }
};

exports.getAdminSummary = (req, res) => {
  try {
    const summary = getAdminSummary();
    return res.status(200).json({
      success: true,
      summary,
    });
  } catch (error) {
    console.error('Error loading admin summary:', error);
    return res.status(500).json({ success: false, message: 'Failed to load admin summary', error: error.message });
  }
};
