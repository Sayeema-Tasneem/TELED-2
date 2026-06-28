/**
 * Medicine Service - API wrapper for medicine management
 * Handles all medicine-related API calls
 */

import Constants from 'expo-constants';

const API_PATH = '/api/medicines';

const normalizeBaseUrl = (url) => {
  if (!url) return null;
  return String(url).replace(/\/$/, '');
};

const extractHostFromHostLike = (value) => {
  if (!value) return null;
  const first = String(value).split(',')[0].trim();
  const noScheme = first.replace(/^https?:\/\//, '');
  const host = noScheme.split(':')[0];
  return host || null;
};

const getExpoHostBackendUrl = () => {
  const hostCandidates = [
    Constants?.expoConfig?.hostUri,
    Constants?.manifest2?.extra?.expoClient?.hostUri,
    Constants?.expoGoConfig?.debuggerHost,
    Constants?.manifest?.debuggerHost,
  ];

  for (const entry of hostCandidates) {
    const host = extractHostFromHostLike(entry);
    if (host) {
      return `http://${host}:5000`;
    }
  }

  return null;
};

const getBackendCandidates = () => {
  const configuredBackend = normalizeBaseUrl(process.env.EXPO_PUBLIC_BACKEND_URL);
  const candidates = [
    configuredBackend,
    normalizeBaseUrl(getExpoHostBackendUrl()),
    'http://10.0.2.2:5000',
    'http://localhost:5000',
  ].filter(Boolean);

  return [...new Set(candidates)];
};

const fetchWithTimeout = async (url, options = {}, timeoutMs = 12000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
};

const requestWithFallback = async (path, options = {}) => {
  const baseUrls = getBackendCandidates();
  let lastError;

  for (const baseUrl of baseUrls) {
    try {
      return await fetchWithTimeout(`${baseUrl}${API_PATH}${path}`, options);
    } catch (error) {
      lastError = error;
    }
  }

  // Provide clearer diagnostic information so the app can show which
  // backend candidates were tried and the last error encountered.
  const message = `Cannot reach backend servers (${baseUrls.join(', ')}). Last error: ${
    lastError?.message || String(lastError)
  }`;
  const err = new Error(message);
  // Keep original stack for debugging if available
  if (lastError && lastError.stack) err.stack = lastError.stack;
  throw err;
};

const parseResponseJson = async (response) => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

class MedicineService {
  /**
   * Add a new medicine
   */
  static async addMedicine(userId, medicineData) {
    try {
      const response = await requestWithFallback('', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          ...medicineData,
        }),
      });
      const data = await parseResponseJson(response);
      if (!response.ok) throw new Error(data.message || 'Failed to add medicine');
      return data.medicine;
    } catch (error) {
      console.error('Error adding medicine:', error);
      throw error;
    }
  }

  /**
   * Get medicine by ID
   */
  static async getMedicine(medicineId) {
    try {
      const response = await requestWithFallback(`/${medicineId}`);
      const data = await parseResponseJson(response);
      if (!response.ok) throw new Error(data.message || 'Failed to get medicine');
      return data.medicine;
    } catch (error) {
      console.error('Error getting medicine:', error);
      throw error;
    }
  }

  /**
   * Get all medicines for a user
   */
  static async getUserMedicines(userId) {
    try {
      const response = await requestWithFallback(`/user/${userId}/all`);
      const data = await parseResponseJson(response);
      if (!response.ok) throw new Error(data.message || 'Failed to get medicines');
      return data.medicines;
    } catch (error) {
      console.error('Error getting user medicines:', error);
      throw error;
    }
  }

  /**
   * Get active medicines for a user
   */
  static async getActiveMedicines(userId) {
    try {
      const response = await requestWithFallback(`/user/${userId}/active`);
      const data = await parseResponseJson(response);
      if (!response.ok) throw new Error(data.message || 'Failed to get active medicines');
      return data.medicines;
    } catch (error) {
      console.error('Error getting active medicines:', error);
      throw error;
    }
  }

  /**
   * Get today's medicines
   */
  static async getTodaysMedicines(userId, date) {
    try {
      const path = date
        ? `/user/${userId}/today?date=${date}`
        : `/user/${userId}/today`;

      const response = await requestWithFallback(path);
      const data = await parseResponseJson(response);
      if (!response.ok) throw new Error(data.message || 'Failed to get today medicines');
      return data.medicines;
    } catch (error) {
      console.error('Error getting today medicines:', error);
      throw error;
    }
  }

  /**
   * Update medicine
   */
  static async updateMedicine(medicineId, updateData) {
    try {
      const response = await requestWithFallback(`/${medicineId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const data = await parseResponseJson(response);
      if (!response.ok) throw new Error(data.message || 'Failed to update medicine');
      return data.medicine;
    } catch (error) {
      console.error('Error updating medicine:', error);
      throw error;
    }
  }

  /**
   * Record medicine intake
   */
  static async recordIntake(medicineId, date, scheduledTime) {
    try {
      const response = await requestWithFallback(`/${medicineId}/intake`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date,
          scheduledTime,
        }),
      });

      const data = await parseResponseJson(response);
      console.log(`[MedicineService] recordIntake response:`, { status: response.status, data });
      if (!response.ok) {
        const message = data.message || `Server error: ${response.status}`;
        throw new Error(message);
      }
      return data.medicine;
    } catch (error) {
      console.error(`[MedicineService] Error recording intake for ${medicineId}:`, error);
      throw error;
    }
  }

  /**
   * Get intake history
   */
  static async getIntakeHistory(medicineId, days = 30) {
    try {
      const response = await requestWithFallback(`/${medicineId}/history?days=${days}`);
      const data = await parseResponseJson(response);
      if (!response.ok) throw new Error(data.message || 'Failed to get intake history');
      return data.history;
    } catch (error) {
      console.error('Error getting intake history:', error);
      throw error;
    }
  }

  /**
   * Pause a medicine
   */
  static async pauseMedicine(medicineId) {
    try {
      const response = await requestWithFallback(`/${medicineId}/pause`, {
        method: 'PUT',
      });

      const data = await parseResponseJson(response);
      if (!response.ok) throw new Error(data.message || 'Failed to pause medicine');
      return data.medicine;
    } catch (error) {
      console.error('Error pausing medicine:', error);
      throw error;
    }
  }

  /**
   * Resume a medicine
   */
  static async resumeMedicine(medicineId) {
    try {
      const response = await requestWithFallback(`/${medicineId}/resume`, {
        method: 'PUT',
      });

      const data = await parseResponseJson(response);
      if (!response.ok) throw new Error(data.message || 'Failed to resume medicine');
      return data.medicine;
    } catch (error) {
      console.error('Error resuming medicine:', error);
      throw error;
    }
  }

  /**
   * Complete a medicine
   */
  static async completeMedicine(medicineId) {
    try {
      const response = await requestWithFallback(`/${medicineId}/complete`, {
        method: 'PUT',
      });

      const data = await parseResponseJson(response);
      if (!response.ok) throw new Error(data.message || 'Failed to complete medicine');
      return data.medicine;
    } catch (error) {
      console.error('Error completing medicine:', error);
      throw error;
    }
  }

  /**
   * Delete a medicine
   */
  static async deleteMedicine(medicineId) {
    try {
      const response = await requestWithFallback(`/${medicineId}`, {
        method: 'DELETE',
      });

      const data = await parseResponseJson(response);
      if (!response.ok) throw new Error(data.message || 'Failed to delete medicine');
      return data.medicine;
    } catch (error) {
      console.error('Error deleting medicine:', error);
      throw error;
    }
  }

  /**
   * Get medicine statistics
   */
  static async getMedicineStatistics(userId) {
    try {
      const response = await requestWithFallback(`/user/${userId}/statistics`);
      const data = await parseResponseJson(response);
      if (!response.ok) throw new Error(data.message || 'Failed to get statistics');
      return data.statistics;
    } catch (error) {
      console.error('Error getting statistics:', error);
      throw error;
    }
  }

  /**
   * Add note to medicine intake
   */
  static async addIntakeNote(medicineId, date, note) {
    try {
      const response = await requestWithFallback(`/${medicineId}/note`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date,
          note,
        }),
      });

      const data = await parseResponseJson(response);
      if (!response.ok) throw new Error(data.message || 'Failed to add note');
      return data.medicine;
    } catch (error) {
      console.error('Error adding note:', error);
      throw error;
    }
  }
}

export default MedicineService;
