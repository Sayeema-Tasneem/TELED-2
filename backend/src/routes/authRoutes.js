const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');

// Controllers (to be implemented)
// const authController = require('../controllers/authController');

// Validation middleware
const validatePhone = body('phoneNumber')
  .trim()
  .matches(/^\d{10}$/)
  .withMessage('Please provide a valid 10-digit phone number');

const validateOTP = body('otp')
  .trim()
  .matches(/^\d{6}$/)
  .withMessage('Please provide a valid 6-digit OTP');

// Routes
router.post(
  '/send-otp',
  validatePhone,
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    // TODO: Implement OTP sending logic
    res.json({
      message: 'OTP sent successfully',
      phoneNumber: req.body.phoneNumber,
    });
  }
);

router.post(
  '/verify-otp',
  validatePhone,
  validateOTP,
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    // TODO: Implement OTP verification logic
    res.json({
      message: 'OTP verified successfully',
      token: 'example-jwt-token',
      user: {
        id: '123',
        phoneNumber: req.body.phoneNumber,
      },
    });
  }
);

router.post('/logout', (req, res) => {
  // TODO: Implement logout logic
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
