const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const otpService = require('../services/otpService');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

// Validation middleware
const validatePhone = body('phoneNumber')
  .trim()
  .matches(/^\d{10}$/)
  .withMessage('Please provide a valid 10-digit phone number');

const validateOTP = body('otp')
  .trim()
  .matches(/^\d{6}$/)
  .withMessage('Please provide a valid 6-digit OTP');

// Send OTP Route
router.post('/send-otp', validatePhone, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { phoneNumber } = req.body;
    const result = await otpService.sendOTP(phoneNumber);

    // For development/testing, include OTP in response
    if (process.env.NODE_ENV === 'development') {
      result.otp = otpService.getOTP(phoneNumber);
    }

    res.json({
      success: true,
      message: 'OTP sent successfully',
      phoneNumber,
      ...result,
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      error: 'Failed to send OTP',
      message: error.message,
    });
  }
});

// Verify OTP Route
router.post('/verify-otp', validatePhone, validateOTP, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { phoneNumber, otp } = req.body;
    await otpService.verifyOTP(phoneNumber, otp);

    const exists = await authController.userExists(phoneNumber);
    let user = exists ? await authController.getUserByPhone(phoneNumber) : null;

    if (!exists) {
      await authController.createUser(phoneNumber, {
        role: 'patient',
        profileCompleted: false,
      });
      user = await authController.getUserByPhone(phoneNumber);
    }

    // Generate JWT token
    const token = authController.generateToken(phoneNumber);

    res.json({
      success: true,
      message: 'OTP verified successfully',
      token,
      user: {
        phoneNumber,
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        city: user?.city || '',
        pincode: user?.pincode || '',
        role: user?.role || 'patient',
        assignedDoctorUserId: user?.assignedDoctorUserId || '',
        assignedDoctorPhone: user?.assignedDoctorPhone || '',
        assignedDoctorName: user?.assignedDoctorName || '',
        isDonor: !!user?.isDonor,
        profileCompleted: !!user?.profileCompleted,
        isNewUser: !exists,
      },
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(401).json({
      error: 'OTP verification failed',
      message: error.message,
    });
  }
});

// Create/Update User Profile
router.post('/create-profile', async (req, res) => {
  try {
    const {
      phoneNumber,
      firstName,
      lastName,
      email,
      gender,
      bloodType,
      address,
      city,
      state,
      pincode,
      preferredLanguage,
      role,
      assignedDoctorUserId,
      assignedDoctorPhone,
      assignedDoctorName,
      isDonor,
    } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'phoneNumber is required',
      });
    }

    const profilePayload = {
      firstName: firstName || '',
      lastName: lastName || '',
      email: email || '',
      gender: gender || '',
      bloodType: bloodType || '',
      address: address || '',
      city: city || '',
      state: state || '',
      pincode: pincode || '',
      preferredLanguage: preferredLanguage || 'en',
      role: role || 'patient',
      assignedDoctorUserId: assignedDoctorUserId || '',
      assignedDoctorPhone: assignedDoctorPhone || '',
      assignedDoctorName: assignedDoctorName || '',
      isDonor: !!isDonor,
      profileCompleted: true,
    };

    const exists = await authController.userExists(phoneNumber);
    if (exists) {
      await authController.updateUserProfile(phoneNumber, profilePayload);
    } else {
      await authController.createUser(phoneNumber, profilePayload);
    }

    const user = await authController.getUserByPhone(phoneNumber);

    res.json({
      success: true,
      message: 'Profile created successfully',
      user: {
        phoneNumber,
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        email: user?.email || '',
        city: user?.city || '',
        pincode: user?.pincode || '',
        role: user?.role || 'patient',
        assignedDoctorUserId: user?.assignedDoctorUserId || '',
        assignedDoctorPhone: user?.assignedDoctorPhone || '',
        assignedDoctorName: user?.assignedDoctorName || '',
        isDonor: !!user?.isDonor,
        profileCompleted: !!user?.profileCompleted,
      },
    });
  } catch (error) {
    console.error('Create profile error:', error);
    res.status(500).json({
      error: 'Failed to create profile',
      message: error.message,
    });
  }
});

// Current authenticated user profile
router.get('/me', authenticate, async (req, res) => {
  try {
    const phoneNumber = req.user?.phoneNumber;
    if (!phoneNumber) {
      return res.status(401).json({
        success: false,
        message: 'Invalid auth token payload',
      });
    }

    const user = await authController.getUserByPhone(phoneNumber);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found',
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        phoneNumber,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        city: user.city || '',
        pincode: user.pincode || '',
        role: user.role || 'patient',
        assignedDoctorUserId: user.assignedDoctorUserId || '',
        assignedDoctorPhone: user.assignedDoctorPhone || '',
        assignedDoctorName: user.assignedDoctorName || '',
        isDonor: !!user.isDonor,
        preferredLanguage: user.preferredLanguage || 'en',
        profileCompleted: !!user.profileCompleted,
      },
    });
  } catch (error) {
    console.error('Get current user error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load current user profile',
      error: error.message,
    });
  }
});

// Logout
router.post('/logout', (req, res) => {
  // TODO: Implement logout logic (blacklist token if needed)
  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

module.exports = router;
