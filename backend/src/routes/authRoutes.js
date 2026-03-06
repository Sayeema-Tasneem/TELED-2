const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const otpService = require('../services/otpService');
const authController = require('../controllers/authController');

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

    // Generate JWT token
    const token = authController.generateToken(phoneNumber);

    res.json({
      success: true,
      message: 'OTP verified successfully',
      token,
      user: {
        phoneNumber,
        isNewUser: true, // Set based on user existence in DB
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
router.post('/create-profile', (req, res) => {
  try {
    // TODO: Implement profile creation with Firebase
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
    } = req.body;

    res.json({
      success: true,
      message: 'Profile created successfully',
      user: {
        phoneNumber,
        firstName,
        lastName,
        email,
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

// Logout
router.post('/logout', (req, res) => {
  // TODO: Implement logout logic (blacklist token if needed)
  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

module.exports = router;
