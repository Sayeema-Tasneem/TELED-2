// OTP Service
// Handles generation, storage, and verification of OTPs

// In-memory OTP storage (use Redis in production)
const otpStore = new Map();

// Generate a random 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP (currently logs to console, integrate Twilio if needed)
const sendOTP = async (phoneNumber) => {
  try {
    const otp = generateOTP();
    
    // Store OTP with 5-minute expiry
    otpStore.set(phoneNumber, {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000,
      attempts: 0,
    });

    // TODO: Integrate Twilio to send SMS
    console.log(`📱 OTP for ${phoneNumber}: ${otp}`);
    // For development: SMS will be logged
    // In production: use Twilio SDK to send actual SMS
    
    // if (process.env.NODE_ENV === 'production') {
    //   await twilioClient.messages.create({
    //     body: `Your Telemedicine OTP is: ${otp}. Valid for 5 minutes.`,
    //     from: process.env.TWILIO_PHONE_NUMBER,
    //     to: `+91${phoneNumber}`,
    //   });
    // }

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
    const otpData = otpStore.get(phoneNumber);

    if (!otpData) {
      throw new Error('Invalid phone number. Please request OTP first.');
    }

    // Check if OTP has expired
    if (Date.now() > otpData.expiresAt) {
      otpStore.delete(phoneNumber);
      throw new Error('OTP has expired. Please request a new one.');
    }

    // Check max attempts (5 attempts)
    if (otpData.attempts >= 5) {
      otpStore.delete(phoneNumber);
      throw new Error('Too many failed attempts. Please request a new OTP.');
    }

    // Verify OTP
    if (otpData.otp !== otp) {
      otpData.attempts += 1;
      throw new Error('Invalid OTP. Please try again.');
    }

    // OTP is valid, delete it
    otpStore.delete(phoneNumber);

    return {
      success: true,
      message: 'OTP verified successfully',
    };
  } catch (error) {
    throw new Error(error.message);
  }
};

// Get OTP (for development/testing only)
const getOTP = (phoneNumber) => {
  const otpData = otpStore.get(phoneNumber);
  if (otpData) {
    return otpData.otp;
  }
  return null;
};

module.exports = {
  generateOTP,
  sendOTP,
  verifyOTP,
  getOTP,
};
