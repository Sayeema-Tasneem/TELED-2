import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

let simpleSessionContext = null;

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

const getBackendCandidates = () => {
  const configuredBackend = normalizeBaseUrl(process.env.EXPO_PUBLIC_BACKEND_URL);
  const expoHostBackend = normalizeBaseUrl(getExpoHostBackendUrl());
  const candidates = [
    configuredBackend,
    expoHostBackend,
    Platform.OS === 'android' ? 'http://10.0.2.2:5000' : null,
    'http://localhost:5000',
  ].filter(Boolean);

  return [...new Set(candidates)];
};

const isNetworkError = (error) =>
  error?.name === 'TypeError'
  || error?.name === 'AbortError'
  || /network request failed/i.test(String(error?.message || ''));

const request = async (path, options = {}) => {
  const token = await SecureStore.getItemAsync('authToken');
  const useSimpleSession = !token && !!simpleSessionContext?.role;
  let lastError;

  for (const baseUrl of getBackendCandidates()) {
    try {
      const response = await fetch(
        `${baseUrl}${useSimpleSession ? '/api/simple/equipment-rotation' : '/api/equipment-rotation'}${path}`,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(useSimpleSession
              ? {
                  'x-simple-role': simpleSessionContext?.role || '',
                  'x-simple-user-id': simpleSessionContext?.userId || '',
                  'x-simple-name': simpleSessionContext?.name || '',
                  'x-simple-phone': simpleSessionContext?.phone || '',
                  'x-simple-city': simpleSessionContext?.city || '',
                  'x-simple-pincode': simpleSessionContext?.pincode || '',
                }
              : {}),
            ...(options.headers || {}),
          },
          ...options,
        },
      );

      const data = await response.json();
      if (!response.ok || data.success === false) {
        throw new Error(data.message || data.error || 'Request failed');
      }

      return data;
    } catch (error) {
      lastError = error;
      if (!isNetworkError(error)) {
        throw error;
      }
    }
  }

  throw lastError || new Error('Network request failed');
};

class EquipmentRotationService {
  static setSimpleSession(session) {
    simpleSessionContext = session || null;
  }

  static async activateDonor(payload) {
    return request('/donor/activate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  static async createListing(payload) {
    return request('/listings', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  static async getListings(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        params.append(key, String(value));
      }
    });

    const query = params.toString();
    return request(`/listings${query ? `?${query}` : ''}`);
  }

  static async moderateListing(listingId, payload) {
    return request(`/listings/${listingId}/moderate`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  static async getDonorListings(donorUserId) {
    return request(`/donor/${encodeURIComponent(donorUserId)}/listings`);
  }

  static async deleteListing(listingId) {
    return request(`/listings/${listingId}`, {
      method: 'DELETE',
    });
  }

  static async createRequest(payload) {
    return request('/requests', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  static async getDoctorQueue(doctorUserId) {
    return request(`/requests/doctor/${encodeURIComponent(doctorUserId)}`);
  }

  static async getPatientRequests(patientUserId) {
    return request(`/requests/patient/${encodeURIComponent(patientUserId)}`);
  }

  static async doctorDecision(requestId, payload) {
    return request(`/requests/${requestId}/doctor-decision`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  static async confirmPickup(requestId) {
    return request(`/requests/${requestId}/pickup-confirm`, {
      method: 'PATCH',
    });
  }

  static async markReturned(requestId) {
    return request(`/requests/${requestId}/mark-returned`, {
      method: 'PATCH',
    });
  }

  static async addSanitizationLog(listingId, payload) {
    return request(`/listings/${listingId}/sanitization`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  static async getDonorImpact(donorUserId) {
    return request(`/donor/${encodeURIComponent(donorUserId)}/impact`);
  }

  static async getAdminSummary() {
    return request('/admin/summary');
  }
}

export default EquipmentRotationService;
