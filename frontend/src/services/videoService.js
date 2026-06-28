// Video Service - Frontend API calls for video management
import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

let cachedWorkingBaseUrl = null;

const normalizeBaseUrl = (url) => {
  if (!url) return null;
  return String(url).replace(/\/$/, '');
};

const getExpoHostBackendUrl = () => {
  const hostUri = Constants?.expoConfig?.hostUri || Constants?.manifest2?.extra?.expoClient?.hostUri;
  if (!hostUri) return null;

  const host = hostUri.split(':')[0];
  return host ? `http://${host}:5000` : null;
};

const getBackendCandidates = () => {
  const configuredBackend = normalizeBaseUrl(process.env.EXPO_PUBLIC_BACKEND_URL);
  const expoHostBackend = normalizeBaseUrl(getExpoHostBackendUrl());
  const platformCandidates = Platform.OS === 'android'
    ? ['http://10.0.2.2:5000', 'http://localhost:5000']
    : ['http://localhost:5000'];

  const candidates = [configuredBackend, expoHostBackend, ...platformCandidates].filter(Boolean);
  const uniqueCandidates = [...new Set(candidates)];

  if (cachedWorkingBaseUrl && uniqueCandidates.includes(cachedWorkingBaseUrl)) {
    return [cachedWorkingBaseUrl, ...uniqueCandidates.filter((url) => url !== cachedWorkingBaseUrl)];
  }

  return uniqueCandidates;
};

const requestWithFallback = async (method, path, { data, params, headers, timeout = 12000 } = {}) => {
  const baseUrls = getBackendCandidates();
  let lastError;

  for (const baseURL of baseUrls) {
    try {
      const response = await axios({
        method,
        url: `${baseURL}/api${path}`,
        data,
        params,
        headers,
        timeout,
      });
      cachedWorkingBaseUrl = baseURL;
      return response.data;
    } catch (error) {
      lastError = error;
      if (error.response && ![502, 503, 504].includes(error.response.status)) {
        throw error;
      }
    }
  }

  throw lastError;
};

class VideoService {
  /**
   * Search videos by query
   */
  static async searchVideos(query) {
    try {
      return await requestWithFallback('get', '/videos/search', {
        params: { query },
      });
    } catch (error) {
      console.log('Video search unavailable:', error.message);
      // Return empty array instead of throwing
      return { count: 0, videos: [] };
    }
  }

  /**
   * Get all active videos
   */
  static async getAllVideos() {
    try {
      return await requestWithFallback('get', '/videos');
    } catch (error) {
      console.log('Backend videos unavailable:', error.message);
      // Return empty object to prevent crashes
      return { count: 0, videos: [] };
    }
  }

  /**
   * Get video by ID
   */
  static async getVideoById(videoId) {
    try {
      return await requestWithFallback('get', `/videos/${videoId}`);
    } catch (error) {
      console.log('Video details unavailable:', error.message);
      // Return null to indicate video not found
      return null;
    }
  }

  /**
   * Search videos by symptoms
   */
  static async getVideosBySymptoms(symptoms) {
    try {
      return await requestWithFallback('post', '/videos/search-by-symptoms', {
        data: { symptoms },
      });
    } catch (error) {
      console.log('Symptom video search unavailable:', error.message);
      // Return empty array instead of throwing
      return { count: 0, videos: [] };
    }
  }

  /**
   * ADMIN: Upload new video
   */
  static async uploadVideo(videoData, token) {
    try {
      return await requestWithFallback('post', '/videos/upload', {
        data: videoData,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }

  /**
   * ADMIN: Update video metadata
   */
  static async updateVideoMetadata(videoId, updates, token) {
    try {
      return await requestWithFallback('put', `/videos/${videoId}/metadata`, {
        data: updates,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.error('Update error:', error);
      throw error;
    }
  }

  /**
   * ADMIN: Approve video
   */
  static async approveVideo(videoId, approvalNotes, token) {
    try {
      return await requestWithFallback('post', `/videos/${videoId}/approve`, {
        data: { approvalNotes },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.error('Approval error:', error);
      throw error;
    }
  }

  /**
   * ADMIN: Reject video
   */
  static async rejectVideo(videoId, rejectionReason, token) {
    try {
      return await requestWithFallback('post', `/videos/${videoId}/reject`, {
        data: { rejectionReason },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.error('Rejection error:', error);
      throw error;
    }
  }

  /**
   * ADMIN: Delete video
   */
  static async deleteVideo(videoId, token) {
    try {
      return await requestWithFallback('delete', `/videos/${videoId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.error('Delete error:', error);
      throw error;
    }
  }

  /**
   * ADMIN: Get pending videos
   */
  static async getPendingVideos(token) {
    try {
      return await requestWithFallback('get', '/videos/admin/pending', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.log('Pending videos unavailable:', error.message);
      // Return safe default
      return { count: 0, videos: [] };
    }
  }

  /**
   * ADMIN: Get analytics
   */
  static async getAnalytics(token) {
    try {
      return await requestWithFallback('get', '/videos/admin/analytics', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.log('Video analytics unavailable:', error.message);
      // Return safe default with empty analytics
      return {
        statistics: { totalVideos: 0, activeVideos: 0, pendingApproval: 0, totalSearches: 0, successfulSearches: 0, failedSearches: 0 },
        searchGaps: [],
        topSearches: [],
      };
    }
  }

  /**
   * ADMIN: Get search analytics
   */
  static async getSearchAnalytics(token) {
    try {
      return await requestWithFallback('get', '/videos/admin/search-analytics', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.log('Search analytics unavailable:', error.message);
      // Return safe default
      return { searchGaps: [], topSearches: [] };
    }
  }

  /**
   * Track search query for analytics
   */
  static async trackSearchQuery(query, resultCount) {
    try {
      return await requestWithFallback('post', '/videos/track-search', {
        data: {
          query: String(query).trim(),
          resultCount: Number(resultCount) || 0,
          found: resultCount > 0,
        },
      });
    } catch (error) {
      // Non-critical error - log but don't throw
      console.log('Search tracking unavailable');
      return null;
    }
  }
}

export default VideoService;
