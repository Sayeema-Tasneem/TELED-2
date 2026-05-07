const jwt = require('jsonwebtoken');
const { db } = require('../config/firebase');

const getUserProfileByPhone = async (phoneNumber) => {
  try {
    if (!db || typeof db.collection !== 'function') {
      return null;
    }

    const snapshot = await db.collection('users').doc(String(phoneNumber || '')).get();
    if (!snapshot.exists) {
      return null;
    }

    return snapshot.data();
  } catch (error) {
    console.error('Error fetching user profile in auth middleware:', error.message || error);
    return null;
  }
};

const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const phoneNumber = decoded?.phoneNumber;
    const profile = phoneNumber ? await getUserProfileByPhone(phoneNumber) : null;

    req.user = {
      ...decoded,
      role: decoded?.role || profile?.role || 'patient',
      profile: profile || null,
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const requireRoles = (...allowedRoles) => {
  const normalizedAllowed = (allowedRoles || [])
    .map((role) => String(role || '').trim().toLowerCase())
    .filter(Boolean);

  return (req, res, next) => {
    const currentRole = String(req.user?.role || '').trim().toLowerCase();
    if (!currentRole || !normalizedAllowed.includes(currentRole)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient role permissions',
      });
    }
    return next();
  };
};

const requireSelfOrRoles = (paramKey, elevatedRoles = []) => {
  const normalizedElevatedRoles = (elevatedRoles || [])
    .map((role) => String(role || '').trim().toLowerCase())
    .filter(Boolean);

  return (req, res, next) => {
    const currentUserId = String(req.user?.phoneNumber || '').trim();
    const currentRole = String(req.user?.role || '').trim().toLowerCase();
    const targetId = String(req.params?.[paramKey] || '').trim();

    if (!currentUserId || !targetId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to requested user scope',
      });
    }

    if (currentUserId === targetId || normalizedElevatedRoles.includes(currentRole)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Unauthorized access to requested user scope',
    });
  };
};

const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
};

module.exports = {
  authenticate,
  requireRoles,
  requireSelfOrRoles,
  errorHandler,
};
