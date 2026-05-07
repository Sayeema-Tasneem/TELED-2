/**
 * Health Records Service - API wrapper for health records
 * Handles prescriptions, consultations, and health timeline
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const normalizeBaseUrl = (url) => {
  if (!url) return null;
  return String(url).replace(/\/$/, '');
};

const getExpoHostBackendUrl = () => {
  const hostUri = Constants?.expoConfig?.hostUri || Constants?.manifest2?.extra?.expoClient?.hostUri;
  if (!hostUri) return null;

  const host = hostUri.split(':')[0];
  if (!host) return null;

  return `http://${host}:5000`;
};

const resolveBackendBaseUrl = () => {
  const configuredBackend = normalizeBaseUrl(process.env.EXPO_PUBLIC_BACKEND_URL);
  if (configuredBackend) return configuredBackend;

  const expoHostBackend = normalizeBaseUrl(getExpoHostBackendUrl());
  if (expoHostBackend) return expoHostBackend;

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000';
  }

  return 'http://localhost:5000';
};

const BASE_URL = `${resolveBackendBaseUrl()}/api/health-records`;
const PRESCRIPTION_CACHE_KEY = 'healthRecords:prescriptions';

const safeParseJSON = (value, fallback) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    console.error('Error parsing cached data:', error);
    return fallback;
  }
};

const getCachedPrescriptions = async () => {
  const raw = await AsyncStorage.getItem(PRESCRIPTION_CACHE_KEY);
  return safeParseJSON(raw, []);
};

const setCachedPrescriptions = async (prescriptions) => {
  await AsyncStorage.setItem(
    PRESCRIPTION_CACHE_KEY,
    JSON.stringify(Array.isArray(prescriptions) ? prescriptions : [])
  );
};

const upsertCachedPrescription = async (prescription) => {
  if (!prescription || !prescription.id) return;

  const existing = await getCachedPrescriptions();
  const index = existing.findIndex((item) => item.id === prescription.id);

  if (index >= 0) {
    existing[index] = { ...existing[index], ...prescription };
  } else {
    existing.unshift(prescription);
  }

  await setCachedPrescriptions(existing);
};

const removeCachedPrescription = async (prescriptionId) => {
  const existing = await getCachedPrescriptions();
  const filtered = existing.filter((item) => item.id !== prescriptionId);
  await setCachedPrescriptions(filtered);
};

class HealthRecordsService {
  /**
   * Add a new prescription
   */
  static async addPrescription(userId, prescriptionData) {
    try {
      const response = await fetch(`${BASE_URL}/prescriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...prescriptionData }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to add prescription');

      await upsertCachedPrescription(data.prescription);
      return data.prescription;
    } catch (error) {
      console.error('Error adding prescription:', error);
      throw error;
    }
  }

  /**
   * Get prescription by ID
   */
  static async getPrescription(prescriptionId) {
    try {
      const response = await fetch(`${BASE_URL}/prescriptions/${prescriptionId}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to get prescription');

      await upsertCachedPrescription(data.prescription);
      return data.prescription;
    } catch (error) {
      console.error('Error getting prescription:', error);

      const cached = await getCachedPrescriptions();
      const localPrescription = cached.find((item) => item.id === prescriptionId);
      if (localPrescription) {
        return localPrescription;
      }

      throw error;
    }
  }

  /**
   * Get all prescriptions for user
   */
  static async getUserPrescriptions(userId) {
    try {
      const response = await fetch(`${BASE_URL}/user/${userId}/prescriptions`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to get prescriptions');

      const prescriptions = data.prescriptions || [];
      await setCachedPrescriptions(prescriptions);

      return prescriptions;
    } catch (error) {
      console.error('Error getting prescriptions:', error);

      const cached = await getCachedPrescriptions();
      if (cached.length > 0) {
        return cached;
      }

      throw error;
    }
  }

  /**
   * Get active prescriptions
   */
  static async getActivePrescriptions(userId) {
    try {
      const response = await fetch(`${BASE_URL}/user/${userId}/prescriptions/active`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to get active prescriptions');
      return data.prescriptions;
    } catch (error) {
      console.error('Error getting active prescriptions:', error);
      throw error;
    }
  }

  /**
   * Update prescription
   */
  static async updatePrescription(prescriptionId, updateData) {
    try {
      const response = await fetch(`${BASE_URL}/prescriptions/${prescriptionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update prescription');

      await upsertCachedPrescription(data.prescription);
      return data.prescription;
    } catch (error) {
      console.error('Error updating prescription:', error);
      throw error;
    }
  }

  /**
   * Delete prescription
   */
  static async deletePrescription(prescriptionId) {
    try {
      const response = await fetch(`${BASE_URL}/prescriptions/${prescriptionId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to delete prescription');

      await removeCachedPrescription(prescriptionId);
      return data.prescription;
    } catch (error) {
      console.error('Error deleting prescription:', error);
      throw error;
    }
  }

  /**
   * Local cache helpers for offline mode
   */
  static async getLocalPrescriptions() {
    try {
      return await getCachedPrescriptions();
    } catch (error) {
      console.error('Error getting local prescriptions:', error);
      return [];
    }
  }

  static async saveLocalPrescriptions(prescriptions = []) {
    try {
      await setCachedPrescriptions(prescriptions);
      return true;
    } catch (error) {
      console.error('Error saving local prescriptions:', error);
      return false;
    }
  }

  static async saveLocalPrescription(prescription) {
    try {
      await upsertCachedPrescription(prescription);
      return true;
    } catch (error) {
      console.error('Error saving local prescription:', error);
      return false;
    }
  }

  static async deleteLocalPrescription(prescriptionId) {
    try {
      await removeCachedPrescription(prescriptionId);
      return true;
    } catch (error) {
      console.error('Error deleting local prescription:', error);
      return false;
    }
  }

  /**
   * Add a new consultation
   */
  static async addConsultation(userId, consultationData) {
    try {
      const response = await fetch(`${BASE_URL}/consultations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...consultationData }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to add consultation');
      return data.consultation;
    } catch (error) {
      console.error('Error adding consultation:', error);
      throw error;
    }
  }

  /**
   * Get consultation by ID
   */
  static async getConsultation(consultationId) {
    try {
      const response = await fetch(`${BASE_URL}/consultations/${consultationId}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to get consultation');
      return data.consultation;
    } catch (error) {
      console.error('Error getting consultation:', error);
      throw error;
    }
  }

  /**
   * Get all consultations for user
   */
  static async getUserConsultations(userId) {
    try {
      const response = await fetch(`${BASE_URL}/user/${userId}/consultations`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to get consultations');
      return data.consultations;
    } catch (error) {
      console.error('Error getting consultations:', error);
      throw error;
    }
  }

  /**
   * Get recent consultations
   */
  static async getRecentConsultations(userId, limit = 10) {
    try {
      const response = await fetch(
        `${BASE_URL}/user/${userId}/consultations/recent?limit=${limit}`
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to get recent consultations');
      return data.consultations;
    } catch (error) {
      console.error('Error getting recent consultations:', error);
      throw error;
    }
  }

  /**
   * Update consultation
   */
  static async updateConsultation(consultationId, updateData) {
    try {
      const response = await fetch(`${BASE_URL}/consultations/${consultationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update consultation');
      return data.consultation;
    } catch (error) {
      console.error('Error updating consultation:', error);
      throw error;
    }
  }

  /**
   * Delete consultation
   */
  static async deleteConsultation(consultationId) {
    try {
      const response = await fetch(`${BASE_URL}/consultations/${consultationId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to delete consultation');
      return data.consultation;
    } catch (error) {
      console.error('Error deleting consultation:', error);
      throw error;
    }
  }

  /**
   * Get health timeline
   */
  static async getHealthTimeline(userId, monthsBack = 12) {
    try {
      const response = await fetch(
        `${BASE_URL}/user/${userId}/timeline?months=${monthsBack}`
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to get health timeline');
      return data.timeline;
    } catch (error) {
      console.error('Error getting health timeline:', error);
      throw error;
    }
  }

  /**
   * Get health timeline by type
   */
  static async getHealthTimelineByType(userId, type) {
    try {
      const response = await fetch(`${BASE_URL}/user/${userId}/timeline/${type}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to get health timeline by type');
      return data.timeline;
    } catch (error) {
      console.error('Error getting health timeline by type:', error);
      throw error;
    }
  }

  /**
   * Get health records summary
   */
  static async getHealthRecordsSummary(userId) {
    try {
      const response = await fetch(`${BASE_URL}/user/${userId}/summary`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to get health summary');
      return data.summary;
    } catch (error) {
      console.error('Error getting health summary:', error);
      throw error;
    }
  }

  /**
   * Search health records
   */
  static async searchHealthRecords(userId, query) {
    try {
      const encodedQuery = encodeURIComponent(query);
      const response = await fetch(`${BASE_URL}/user/${userId}/search?q=${encodedQuery}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to search health records');
      return data.results;
    } catch (error) {
      console.error('Error searching health records:', error);
      throw error;
    }
  }
}

export default HealthRecordsService;
