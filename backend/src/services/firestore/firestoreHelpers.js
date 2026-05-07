const { db, admin } = require('../../config/firebase');

const toIsoString = (value) => {
  if (!value) {
    return value;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value.toDate === 'function') {
    return value.toDate().toISOString();
  }

  return value;
};

const normalizeData = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeData(item));
  }

  if (value && typeof value === 'object') {
    const normalized = {};
    Object.entries(value).forEach(([key, currentValue]) => {
      normalized[key] = normalizeData(currentValue);
    });
    return normalized;
  }

  return toIsoString(value);
};

const mapDoc = (doc) => ({
  id: doc.id,
  ...normalizeData(doc.data()),
});

const now = () => admin.firestore.FieldValue.serverTimestamp();

const getCollection = (path) => db.collection(path);

module.exports = {
  db,
  admin,
  now,
  mapDoc,
  normalizeData,
  getCollection,
};