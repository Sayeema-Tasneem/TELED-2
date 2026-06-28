/**
 * Health Records Service - API wrapper for health records
 * Handles prescriptions, consultations, and health timeline
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';
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
const ASSIGNED_VIDEOS_CACHE_KEY = 'healthRecords:assignedVideos';
const VIDEO_DOWNLOAD_DIRECTORY = `${FileSystem.documentDirectory}care-videos/`;

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

const getCachedAssignedVideos = async () => {
  const raw = await AsyncStorage.getItem(ASSIGNED_VIDEOS_CACHE_KEY);
  return safeParseJSON(raw, []);
};

const setCachedPrescriptions = async (prescriptions) => {
  await AsyncStorage.setItem(
    PRESCRIPTION_CACHE_KEY,
    JSON.stringify(Array.isArray(prescriptions) ? prescriptions : [])
  );
};

const setCachedAssignedVideos = async (assignments) => {
  await AsyncStorage.setItem(
    ASSIGNED_VIDEOS_CACHE_KEY,
    JSON.stringify(Array.isArray(assignments) ? assignments : [])
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

const ensureVideoDownloadDirectory = async () => {
  const info = await FileSystem.getInfoAsync(VIDEO_DOWNLOAD_DIRECTORY);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(VIDEO_DOWNLOAD_DIRECTORY, {
      intermediates: true,
    });
  }
  return VIDEO_DOWNLOAD_DIRECTORY;
};

const sanitizeFilename = (value) => String(value || 'care-video')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || 'care-video';

const buildVideoFilename = (assignment) => {
  const base = assignment?.id || assignment?.videoId || assignment?.title || 'care-video';
  return `${sanitizeFilename(base)}.mp4`;
};

const resolveVideoDownloadUrl = (assignment) => {
  const candidates = [
    assignment?.downloadUrl,
    assignment?.videoUrl,
    assignment?.youtubeEmbedUrl,
  ].filter(Boolean);

  const directUrl = candidates.find(
    (url) => !String(url).includes('youtube.com') && !String(url).includes('youtu.be')
  );

  return directUrl || null;
};

const getLocalVideoPath = async (assignment) => {
  await ensureVideoDownloadDirectory();
  return `${VIDEO_DOWNLOAD_DIRECTORY}${buildVideoFilename(assignment)}`;
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

  /**
   * Video Library APIs
   */
  static async getVideoLibrary(filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.category) params.append('category', filters.category);
      if (filters.tag) params.append('tag', filters.tag);
      if (filters.condition) params.append('condition', filters.condition);
      if (filters.q) params.append('q', filters.q);

      const queryString = params.toString();
      const endpoint = `${BASE_URL}/videos/library${queryString ? `?${queryString}` : ''}`;
      const response = await fetch(endpoint);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to load video library');
      return data.videos || [];
    } catch (error) {
      console.error('Error getting video library:', error);
      throw error;
    }
  }

  static async addVideoToLibrary(videoData) {
    try {
      const response = await fetch(`${BASE_URL}/videos/library`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(videoData),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to add video to library');
      return data.video;
    } catch (error) {
      console.error('Error adding video to library:', error);
      throw error;
    }
  }

  static async updateVideoInLibrary(videoId, updateData) {
    try {
      const response = await fetch(`${BASE_URL}/videos/library/${videoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update video in library');
      return data.video;
    } catch (error) {
      console.error('Error updating video in library:', error);
      throw error;
    }
  }

  static async deleteVideoFromLibrary(videoId) {
    try {
      const response = await fetch(`${BASE_URL}/videos/library/${videoId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to delete video from library');
      return data.video;
    } catch (error) {
      console.error('Error deleting video from library:', error);
      throw error;
    }
  }

  /**
   * Doctor assigns videos; patient consumes in My Videos
   */
  static async assignVideoToPatient(assignmentData) {
    try {
      const response = await fetch(`${BASE_URL}/videos/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assignmentData),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to assign video to patient');
      return data.assignment;
    } catch (error) {
      console.error('Error assigning video to patient:', error);
      throw error;
    }
  }

  static async getUserAssignedVideos(userId, { status } = {}) {
    try {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      const queryString = params.toString();

      const response = await fetch(
        `${BASE_URL}/user/${userId}/videos${queryString ? `?${queryString}` : ''}`
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to get assigned videos');

      const assignments = data.assignments || [];
      await setCachedAssignedVideos(assignments);
      return assignments;
    } catch (error) {
      console.error('Error getting user assigned videos:', error);

      const cached = await getCachedAssignedVideos();
      if (cached.length > 0) {
        return cached;
      }

      throw error;
    }
  }

  static async updateAssignedVideoProgress(assignmentId, progressData) {
    try {
      const response = await fetch(`${BASE_URL}/videos/assignments/${assignmentId}/progress`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(progressData),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update video progress');

      const updated = data.assignment;
      const cached = await getCachedAssignedVideos();
      const next = cached.map((item) => (item.id === updated.id ? updated : item));
      await setCachedAssignedVideos(next);

      return updated;
    } catch (error) {
      console.error('Error updating assigned video progress:', error);
      throw error;
    }
  }

  static async getDoctorAssignedVideos(doctorId, filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.status) params.append('status', filters.status);

      const queryString = params.toString();
      const response = await fetch(
        `${BASE_URL}/doctor/${doctorId}/videos${queryString ? `?${queryString}` : ''}`
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to get doctor video dashboard');

      return {
        assignments: data.assignments || [],
        summary: data.summary || { completedCount: 0, averageWatchPercentage: 0 },
      };
    } catch (error) {
      console.error('Error getting doctor assigned videos:', error);
      throw error;
    }
  }

  /**
   * Offline download helpers (for self-hosted direct video URLs)
   */
  static async getLocalAssignedVideos() {
    try {
      return await getCachedAssignedVideos();
    } catch (error) {
      console.error('Error getting local assigned videos:', error);
      return [];
    }
  }

  static async saveLocalAssignedVideos(assignments = []) {
    try {
      await setCachedAssignedVideos(assignments);
      return true;
    } catch (error) {
      console.error('Error saving local assigned videos:', error);
      return false;
    }
  }

  static async downloadAssignedVideo(assignment) {
    try {
      const directUrl = resolveVideoDownloadUrl(assignment);
      if (!directUrl) {
        throw new Error('Offline download not available for this video source');
      }

      const destination = await getLocalVideoPath(assignment);
      const info = await FileSystem.getInfoAsync(destination);
      if (info.exists) {
        return destination;
      }

      const result = await FileSystem.downloadAsync(directUrl, destination);
      return result.uri;
    } catch (error) {
      console.error('Error downloading assigned video:', error);
      throw error;
    }
  }

  static async resolveAssignedVideoPlaybackUri(assignment) {
    try {
      const localPath = await getLocalVideoPath(assignment);
      const info = await FileSystem.getInfoAsync(localPath);
      if (info.exists) {
        return localPath;
      }
    } catch (error) {
      console.warn('Error checking local assigned video path:', error?.message || error);
    }

    return assignment?.youtubeEmbedUrl || assignment?.videoUrl || null;
  }
}

export default HealthRecordsService;
