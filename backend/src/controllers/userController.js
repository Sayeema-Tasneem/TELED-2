// User Controller
// Handles user-related operations

const { db } = require('../config/firebase');

const createUser = async (phoneNumber, userData) => {
  try {
    const userRef = db.collection('users').doc(phoneNumber);
    await userRef.set({
      phoneNumber,
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return { id: phoneNumber, ...userData };
  } catch (error) {
    throw new Error(`Failed to create user: ${error.message}`);
  }
};

const getUserByPhone = async (phoneNumber) => {
  try {
    const userDoc = await db.collection('users').doc(phoneNumber).get();
    if (userDoc.exists) {
      return userDoc.data();
    }
    return null;
  } catch (error) {
    throw new Error(`Failed to fetch user: ${error.message}`);
  }
};

module.exports = {
  createUser,
  getUserByPhone,
};
