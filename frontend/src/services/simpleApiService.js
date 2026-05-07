import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

let cachedWorkingBaseUrl = null;

const getAudioMimeTypeFromExtension = (extension = '') => {
  const ext = String(extension || '').toLowerCase();
  const map = {
    m4a: 'audio/x-m4a',
    mp4: 'audio/mp4',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    webm: 'audio/webm',
    aac: 'audio/aac',
    caf: 'audio/x-caf',
    '3gp': 'audio/3gpp',
    '3gpp': 'audio/3gpp',
  };

  return map[ext] || 'audio/m4a';
};

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

  const commonCandidates = [configuredBackend, expoHostBackend].filter(Boolean);

  const platformCandidates = Platform.OS === 'android'
    ? ['http://10.0.2.2:5000', 'http://localhost:5000']
    : ['http://localhost:5000'];

  const candidates = [...commonCandidates, ...platformCandidates].filter(Boolean);

  if (cachedWorkingBaseUrl && candidates.includes(cachedWorkingBaseUrl)) {
    return [cachedWorkingBaseUrl, ...candidates.filter((url) => url !== cachedWorkingBaseUrl)];
  }

  return [...new Set(candidates)];
};

const shouldTryNextBaseUrl = (error, retryOnStatuses = [502, 503, 504]) => {
  const status = error?.response?.status;
  return retryOnStatuses.includes(status);
};

const requestWithFallback = async (
  method,
  path,
  { data, params, headers, timeout = 15000, retryOnStatuses = [502, 503, 504] } = {}
) => {
  const baseUrls = getBackendCandidates();
  let lastError;

  for (const baseURL of baseUrls) {
    try {
      const response = await axios({
        method,
        url: `${baseURL}${path}`,
        data,
        params,
        headers,
        timeout,
      });

      cachedWorkingBaseUrl = baseURL;
      return response.data;
    } catch (error) {
      lastError = error;
      if (error.response && !shouldTryNextBaseUrl(error, retryOnStatuses)) {
        throw error;
      }
    }
  }

  throw lastError;
};

const parseError = (error) => {
  const status = Number(error?.response?.status);
  const backendMessage = String(error?.response?.data?.message || '');
  const loweredBackendMessage = backendMessage.toLowerCase();

  if (
    status === 429
    || loweredBackendMessage.includes('quota exceeded')
    || loweredBackendMessage.includes('insufficient_quota')
    || loweredBackendMessage.includes('billing')
  ) {
    return 'Cloud voice quota is exhausted. The app will try local device speech recognition first (no credits needed). If needed, enable phone speech services and retry voice help.';
  }

  if (status === 401 && loweredBackendMessage.includes('openai_api_key')) {
    return 'Voice service API key is invalid. Update OPENAI_API_KEY in backend/.env and restart backend.';
  }

  if (!error?.response) {
    const message = String(error?.message || '').toLowerCase();
    if (message.includes('network') || message.includes('timeout')) {
      return 'Cannot reach backend server. Please ensure backend is running on port 5000 and phone/laptop are on same Wi-Fi.';
    }
  }

  return error?.response?.data?.message || error?.message || 'Something went wrong';
};

const simpleApiService = {
  async registerPatient(payload) {
    try {
      return await requestWithFallback('post', '/api/simple/patients/register', { data: payload });
    } catch (error) {
      throw new Error(parseError(error));
    }
  },

  async loginPatient(phone, pin) {
    try {
      return await requestWithFallback('post', '/api/simple/patients/login', { data: { phone, pin } });
    } catch (error) {
      throw new Error(parseError(error));
    }
  },

  async getDoctors() {
    try {
      return await requestWithFallback('get', '/api/simple/doctors');
    } catch (error) {
      throw new Error(parseError(error));
    }
  },

  async addDoctor(payload) {
    try {
      return await requestWithFallback('post', '/api/simple/doctors', { data: payload });
    } catch (error) {
      throw new Error(parseError(error));
    }
  },

  async deleteDoctor(doctorId) {
    try {
      return await requestWithFallback('delete', `/api/simple/doctors/${doctorId}`);
    } catch (error) {
      throw new Error(parseError(error));
    }
  },

  async updateDoctor(doctorId, payload) {
    try {
      return await requestWithFallback('put', `/api/simple/doctors/${doctorId}`, { data: payload });
    } catch (error) {
      throw new Error(parseError(error));
    }
  },

  async loginDoctor(doctorName, pin) {
    try {
      return await requestWithFallback('post', '/api/simple/doctors/login', { data: { doctorName, pin } });
    } catch (error) {
      throw new Error(parseError(error));
    }
  },

  async loginAdmin(username, password) {
    try {
      return await requestWithFallback('post', '/api/simple/admin/login', { data: { username, password } });
    } catch (error) {
      throw new Error(parseError(error));
    }
  },

  async getPharmacies() {
    try {
      return await requestWithFallback('get', '/api/simple/pharmacies');
    } catch (error) {
      throw new Error(parseError(error));
    }
  },

  async addPharmacy(payload) {
    try {
      return await requestWithFallback('post', '/api/simple/pharmacies', { data: payload });
    } catch (error) {
      throw new Error(parseError(error));
    }
  },

  async updatePharmacyStock(pharmacyId, payload) {
    try {
      return await requestWithFallback('put', `/api/simple/pharmacies/${pharmacyId}/stock`, { data: payload });
    } catch (error) {
      throw new Error(parseError(error));
    }
  },

  async createAppointment(payload) {
    try {
      return await requestWithFallback('post', '/api/simple/appointments', { data: payload });
    } catch (error) {
      throw new Error(parseError(error));
    }
  },

  async getAppointments(filtersOrDoctorName) {
    try {
      const params = typeof filtersOrDoctorName === 'string'
        ? { doctorName: filtersOrDoctorName }
        : filtersOrDoctorName;

      return await requestWithFallback('get', '/api/simple/appointments', {
        params,
      });
    } catch (error) {
      throw new Error(parseError(error));
    }
  },

  async updateAppointment(appointmentId, payload) {
    try {
      return await requestWithFallback('patch', `/api/simple/appointments/${appointmentId}`, { data: payload });
    } catch (error) {
      throw new Error(parseError(error));
    }
  },

  async deleteAppointment(appointmentId) {
    try {
      return await requestWithFallback('delete', `/api/simple/appointments/${appointmentId}`);
    } catch (error) {
      throw new Error(parseError(error));
    }
  },

  async getPatients() {
    try {
      return await requestWithFallback('get', '/api/simple/patients');
    } catch (error) {
      throw new Error(parseError(error));
    }
  },

  async createPrescription(payload) {
    try {
      return await requestWithFallback('post', '/api/simple/prescriptions', { data: payload });
    } catch (error) {
      throw new Error(parseError(error));
    }
  },

  async getPatientPrescriptions(phone) {
    try {
      return await requestWithFallback('get', `/api/simple/prescriptions/patient/${phone}`);
    } catch (error) {
      throw new Error(parseError(error));
    }
  },

  async archiveExpiredAppointments(patientPhone) {
    try {
      return await requestWithFallback('post', '/api/simple/consultations/archive-expired', {
        data: { patientPhone },
      });
    } catch (error) {
      throw new Error(parseError(error));
    }
  },

  async getPatientConsultations(phone) {
    try {
      return await requestWithFallback('get', `/api/simple/consultations/patient/${phone}`);
    } catch (error) {
      throw new Error(parseError(error));
    }
  },

  async getPatientDoctorHistorySummary(patientPhone, doctorName, limit = 5, context = {}) {
    try {
      const appointmentId = context?.appointmentId;
      const appointmentDate = context?.appointmentDate;
      return await requestWithFallback('get', '/api/simple/consultations/history-summary', {
        params: { patientPhone, doctorName, limit, appointmentId, appointmentDate },
      });
    } catch (error) {
      throw new Error(parseError(error));
    }
  },

  async getMedicineById(medicineId) {
    try {
      return await requestWithFallback('get', `/api/medicines/${medicineId}`);
    } catch (error) {
      throw new Error(parseError(error));
    }
  },

  async notifyEmergencyContact(payload) {
    try {
      return await requestWithFallback('post', '/api/emergency/notify-contact', {
        data: payload,
      });
    } catch (error) {
      throw new Error(parseError(error));
    }
  },

  async transcribeVoice({ audioUri, language = 'en', prompt = '' }) {
    void audioUri;
    void language;
    void prompt;

    throw new Error('Cloud transcription is disabled. Voice help now works only with on-device speech recognition.');
  },

  async getDoctorTimeSlots(doctorId) {
    try {
      return await requestWithFallback('get', `/api/simple/doctors/${doctorId}/timeslots`);
    } catch (error) {
      throw new Error(parseError(error));
    }
  },

  async updateDoctorTimeSlots(doctorId, payload) {
    try {
      return await requestWithFallback('put', `/api/simple/doctors/${doctorId}/timeslots`, { data: payload });
    } catch (error) {
      throw new Error(parseError(error));
    }
  },

  async getDoctorSymptomCoverage() {
    try {
      return await requestWithFallback('get', '/api/simple/doctors/coverage/symptoms');
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
};

export default simpleApiService;
