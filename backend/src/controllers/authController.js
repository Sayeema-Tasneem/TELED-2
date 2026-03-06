// Auth Controller
// Handles authentication operations like OTP sending and verification

const { admin, db } = require('../config/firebase');
const jwt = require('jsonwebtoken');

// Function to generate JWT token
const generateToken = (phoneNumber) => {
  return jwt.sign(
    { phoneNumber, iat: Date.now() },
    process.env.JWT_SECRET || 'default-secret-key',
    { expiresIn: '30d' }
  );
};

// Check if user exists
const userExists = async (phoneNumber) => {
  try {
    const userDoc = await db.collection('users').doc(phoneNumber).get();
    return userDoc.exists;
  } catch (error) {
    console.error('Error checking user:', error);
    return false;
  }
};

// Create new user
const createUser = async (phoneNumber, userData = {}) => {
  try {
    await db.collection('users').doc(phoneNumber).set({
      phoneNumber,
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return true;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

// Get user by phone
const getUserByPhone = async (phoneNumber) => {
  try {
    const userDoc = await db.collection('users').doc(phoneNumber).get();
    if (userDoc.exists) {
      return userDoc.data();
    }
    return null;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
};

// Update user profile
const updateUserProfile = async (phoneNumber, profileData) => {
  try {
    await db.collection('users').doc(phoneNumber).update({
      ...profileData,
      updatedAt: new Date(),
    });
    return true;
  } catch (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
};

module.exports = {
  generateToken,
  userExists,
  createUser,
  getUserByPhone,
  updateUserProfile,
};
