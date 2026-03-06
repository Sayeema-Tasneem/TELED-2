// Auth Controller
// Handles authentication operations like OTP sending and verification

const { admin } = require('../config/firebase');
const jwt = require('jsonwebtoken');

// Function to generate JWT token
const generateToken = (phoneNumber) => {
  return jwt.sign(
    { phoneNumber, iat: Date.now() },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};

// Send OTP (placeholder - implement with Twilio or Firebase)
const sendOTP = async (phoneNumber) => {
  try {
    // TODO: Integrate with Twilio or Firebase Authentication
    // For now, we'll just log it
    console.log(`Sending OTP to +91${phoneNumber}`);
    
    return {
      success: true,
      message: 'OTP sent successfully',
    };
  } catch (error) {
    throw new Error(`Failed to send OTP: ${error.message}`);
  }
};

// Verify OTP
const verifyOTP = async (phoneNumber, otp) => {
  try {
    // TODO: Implement OTP verification logic
    // This should verify against stored OTP in cache/database
    
    const token = generateToken(phoneNumber);
    
    return {
      token,
      user: {
        phoneNumber,
      },
    };
  } catch (error) {
    throw new Error(`Failed to verify OTP: ${error.message}`);
  }
};

module.exports = {
  sendOTP,
  verifyOTP,
  generateToken,
};
