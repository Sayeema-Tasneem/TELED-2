// Video model for pre-recorded treatment videos
// Tracks video metadata, symptoms, and upload status

let videosDatabase = [
  {
    id: 'vid_001',
    title: 'CPR - Cardiopulmonary Resuscitation',
    description: 'Step-by-step guide for performing CPR on adults',
    category: 'Emergency',
    symptoms: ['chest pain', 'unconscious', 'no pulse', 'not breathing'],
    videoUrl: 'https://example.com/videos/cpr.mp4',
    duration: 180,
    thumbnailUrl: 'https://example.com/thumbnails/cpr.jpg',
    uploadedBy: 'admin_001',
    uploadedAt: new Date('2024-03-01'),
    status: 'active', // active, pending, archived, rejected
    viewCount: 1250,
    tags: ['first-aid', 'emergency', 'cardiac', 'life-saving'],
    steps: [
      'Check responsiveness and breathing',
      'Call emergency services (108)',
      'Start chest compressions',
      'Open airway',
      'Give rescue breaths',
      'Continue CPR until help arrives',
    ],
    dos: ['Compress at 100-120 beats per minute', 'Push hard and fast'],
    donts: ['Pause compressions', 'Give up if tired'],
    warnings: ['Only perform if trained', 'Call emergency first'],
    lastModified: new Date('2024-03-01'),
    approvedBy: 'admin_001',
    approvalNotes: 'Approved - high quality content',
  },
  {
    id: 'vid_002',
    title: 'Heimlich Maneuver - Choking Relief',
    description: 'Emergency technique to remove airway obstruction',
    category: 'Emergency',
    symptoms: ['choking', 'cannot breathe', 'difficulty swallowing'],
    videoUrl: 'https://example.com/videos/heimlich.mp4',
    duration: 120,
    thumbnailUrl: 'https://example.com/thumbnails/heimlich.jpg',
    uploadedBy: 'admin_001',
    uploadedAt: new Date('2024-03-02'),
    status: 'active',
    viewCount: 890,
    tags: ['first-aid', 'emergency', 'choking'],
    steps: [
      'Stand behind the person',
      'Make a fist above navel',
      'Place hands below chest',
      'Quick upward thrusts',
      'Repeat until object dislodges',
    ],
    dos: ['Act quickly', 'Be firm with compressions'],
    donts: ['Perform on conscious choking person', 'Back slaps on infants'],
    warnings: ['For adults only', 'Get medical help after'],
    lastModified: new Date('2024-03-02'),
    approvedBy: 'admin_001',
    approvalNotes: 'High priority emergency video',
  },
];

// In-memory storage for search analytics
let searchAnalytics = [];

module.exports = {
  // Get all videos
  getAllVideos: () => videosDatabase,

  // Get video by ID
  getVideoById: (id) => videosDatabase.find((v) => v.id === id),

  // Get videos by symptoms
  getVideosBySymptoms: (symptoms) => {
    return videosDatabase.filter((video) =>
      symptoms.some((symptom) =>
        video.symptoms.some(
          (vs) =>
            vs.toLowerCase().includes(symptom.toLowerCase()) ||
            symptom.toLowerCase().includes(vs.toLowerCase())
        )
      )
    );
  },

  // Get videos by category
  getVideosByCategory: (category) =>
    videosDatabase.filter((v) => v.category.toLowerCase() === category.toLowerCase()),

  // Search videos
  searchVideos: (query) => {
    const lowerQuery = query.toLowerCase();
    return videosDatabase.filter(
      (v) =>
        v.title.toLowerCase().includes(lowerQuery) ||
        v.description.toLowerCase().includes(lowerQuery) ||
        v.symptoms.some((s) => s.toLowerCase().includes(lowerQuery)) ||
        v.tags.some((t) => t.toLowerCase().includes(lowerQuery))
    );
  },

  // Track search query for analytics
  trackSearchQuery: (query, foundVideos, userId) => {
    const analytics = {
      id: `search_${Date.now()}_${Math.random()}`,
      query,
      timestamp: new Date(),
      userId,
      videosFound: foundVideos.length,
      videoIds: foundVideos.map((v) => v.id),
      status: foundVideos.length > 0 ? 'found' : 'not_found',
    };
    searchAnalytics.push(analytics);
    return analytics;
  },

  // Record search analytics from frontend
  recordSearchAnalytics: (analyticsRecord) => {
    searchAnalytics.push(analyticsRecord);
    return analyticsRecord;
  },

  // Add new video (admin upload)
  addVideo: (videoData) => {
    const newVideo = {
      id: `vid_${Date.now()}`,
      ...videoData,
      uploadedAt: new Date(),
      status: 'pending', // Requires admin approval
      viewCount: 0,
      lastModified: new Date(),
    };
    videosDatabase.push(newVideo);
    return newVideo;
  },

  // Update video (admin)
  updateVideo: (id, updates) => {
    const videoIndex = videosDatabase.findIndex((v) => v.id === id);
    if (videoIndex !== -1) {
      videosDatabase[videoIndex] = {
        ...videosDatabase[videoIndex],
        ...updates,
        lastModified: new Date(),
      };
      return videosDatabase[videoIndex];
    }
    return null;
  },

  // Approve video
  approveVideo: (id, approvedBy, approvalNotes = '') => {
    return module.exports.updateVideo(id, {
      status: 'active',
      approvedBy,
      approvalNotes,
    });
  },

  // Reject video
  rejectVideo: (id, rejectionReason = '') => {
    return module.exports.updateVideo(id, {
      status: 'rejected',
      approvalNotes: rejectionReason,
    });
  },

  // Delete video
  deleteVideo: (id) => {
    const videoIndex = videosDatabase.findIndex((v) => v.id === id);
    if (videoIndex !== -1) {
      videosDatabase.splice(videoIndex, 1);
      return true;
    }
    return false;
  },

  // Get pending videos (for admin approval)
  getPendingVideos: () => videosDatabase.filter((v) => v.status === 'pending'),

  // Get analytics for search gaps
  getSearchGaps: () => {
    const notFoundSearches = searchAnalytics.filter((s) => s.status === 'not_found');

    // Group by query
    const gaps = {};
    notFoundSearches.forEach((search) => {
      const query = search.query.toLowerCase();
      gaps[query] = (gaps[query] || 0) + 1;
    });

    // Sort by frequency
    return Object.entries(gaps)
      .map(([query, count]) => ({
        query,
        count,
        priority: count > 5 ? 'high' : count > 2 ? 'medium' : 'low',
      }))
      .sort((a, b) => b.count - a.count);
  },

  // Get video stats
  getVideoStats: () => {
    return {
      totalVideos: videosDatabase.length,
      activeVideos: videosDatabase.filter((v) => v.status === 'active').length,
      pendingApproval: videosDatabase.filter((v) => v.status === 'pending').length,
      totalSearches: searchAnalytics.length,
      successfulSearches: searchAnalytics.filter((s) => s.status === 'found').length,
      failedSearches: searchAnalytics.filter((s) => s.status === 'not_found').length,
      topSearches: getTopSearches(),
      searchGaps: module.exports.getSearchGaps(),
    };
  },

  // Get analytics database
  getSearchAnalytics: () => searchAnalytics,

  // Clear old analytics (for cleanup)
  clearOldAnalytics: (daysOld = 30) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    searchAnalytics = searchAnalytics.filter((a) => a.timestamp > cutoffDate);
  },
};

// Helper function to get top searches
function getTopSearches() {
  const searches = {};
  searchAnalytics.forEach((s) => {
    const query = s.query.toLowerCase();
    searches[query] = (searches[query] || 0) + 1;
  });

  return Object.entries(searches)
    .map(([query, count]) => ({ query, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}
