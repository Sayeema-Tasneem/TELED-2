/**
 * Missed Medicine Alert Service
 * Handles notifications when medicine is not scanned within 30 minutes
 * Uses existing emergency SMS infrastructure
 */

import Constants from 'expo-constants';

const API_PATH = '/api/emergency';

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

  throw new Error(`Cannot reach backend. Last error: ${lastError?.message || String(lastError)}`);
};

const parseResponseJson = async (response) => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

class MissedMedicineAlertService {
  static pendingAlerts = new Map(); // Track pending 30-min alerts

  /**
   * Schedule a missed medicine alert for 30 minutes after the time
   * @param {string} medicineId - Medicine ID
   * @param {string} medicineName - Medicine name
   * @param {string} time - Scheduled time (HH:MM)
   * @param {string} emergencyContactPhone - Phone number to notify
   * @param {string} userName - Patient name
   * @param {string} userPhone - Patient phone
   */
  static scheduleMissedMedicineAlert(medicineId, medicineName, time, emergencyContactPhone, userName, userPhone) {
    if (!emergencyContactPhone) {
      console.warn('No emergency contact to notify for missed medicine');
      return;
    }

    const alertKey = `${medicineId}_${time}`;
    
    // Cancel any existing pending alert for this medicine/time
    if (MissedMedicineAlertService.pendingAlerts.has(alertKey)) {
      const existingTimeout = MissedMedicineAlertService.pendingAlerts.get(alertKey);
      clearTimeout(existingTimeout);
    }

    // Schedule alert after 30 minutes
    const timeoutId = setTimeout(async () => {
      try {
        await MissedMedicineAlertService.sendMissedMedicineAlert(
          medicineId,
          medicineName,
          time,
          emergencyContactPhone,
          userName,
          userPhone
        );
      } catch (error) {
        console.error('Failed to send missed medicine alert:', error);
      }
      
      // Clean up after sending
      MissedMedicineAlertService.pendingAlerts.delete(alertKey);
    }, 30 * 60 * 1000); // 30 minutes in milliseconds

    MissedMedicineAlertService.pendingAlerts.set(alertKey, timeoutId);
    console.log(`Missed medicine alert scheduled for ${medicineName} at ${time}`);
  }

  /**
   * Cancel a pending missed medicine alert
   * @param {string} medicineId - Medicine ID
   * @param {string} time - Scheduled time (HH:MM)
   */
  static cancelMissedMedicineAlert(medicineId, time) {
    const alertKey = `${medicineId}_${time}`;
    
    if (MissedMedicineAlertService.pendingAlerts.has(alertKey)) {
      const timeoutId = MissedMedicineAlertService.pendingAlerts.get(alertKey);
      clearTimeout(timeoutId);
      MissedMedicineAlertService.pendingAlerts.delete(alertKey);
      console.log(`Cancelled pending alert for medicine ${medicineId}`);
    }
  }

  /**
   * Send missed medicine alert via SMS to emergency contact
   * @private
   */
  static async sendMissedMedicineAlert(medicineId, medicineName, time, emergencyContactPhone, userName, userPhone) {
    try {
      const message = `⚠️ MEDICINE ALERT: ${userName || 'Patient'} has not taken ${medicineName} which was scheduled for ${time}. Please check on them. Contact: ${userPhone || 'N/A'}`;

      const response = await requestWithFallback('/notify-contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: emergencyContactPhone,
          userName: userName || 'Patient',
          userPhone: userPhone || 'Unknown',
          customMessage: message,
        }),
      });

      const data = await parseResponseJson(response);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send alert');
      }

      console.log('✅ Missed medicine alert sent to caregiver:', data);
      return data;
    } catch (error) {
      console.error('❌ Error sending missed medicine alert:', error);
      throw error;
    }
  }

  /**
   * Clear all pending alerts (useful when logging out or clearing data)
   */
  static clearAllPendingAlerts() {
    for (const timeoutId of MissedMedicineAlertService.pendingAlerts.values()) {
      clearTimeout(timeoutId);
    }
    MissedMedicineAlertService.pendingAlerts.clear();
    console.log('All pending missed medicine alerts cleared');
  }
}

export default MissedMedicineAlertService;
