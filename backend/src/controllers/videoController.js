// Video Controller - Admin Upload and Video Management
const videoModel = require('../models/videos');
const { validationResult } = require('express-validator');

/**
 * Search for videos by query
 * Tracks analytics for search gaps
 */
exports.searchVideos = async (req, res) => {
  try {
    const { query } = req.query;
    const userId = req.user?.id || 'anonymous';

    if (!query) {
      return res.status(400).json({ error: 'Search query required' });
    }

    // Search videos
    const results = videoModel.searchVideos(query).filter((v) => v.status === 'active');

    // Track search for analytics
    videoModel.trackSearchQuery(query, results, userId);

    res.json({
      query,
      found: results.length > 0,
      count: results.length,
      videos: results,
      message: results.length === 0 ? 'No videos found for this search' : '',
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
};

/**
 * Get videos by symptoms
 */
exports.getVideosBySymptoms = async (req, res) => {
  try {
    const { symptoms } = req.body; // Array of symptoms

    if (!symptoms || !Array.isArray(symptoms)) {
      return res.status(400).json({ error: 'Symptoms array required' });
    }

    const videos = videoModel.getVideosBySymptoms(symptoms);

    res.json({
      symptoms,
      count: videos.length,
      videos,
    });
  } catch (error) {
    console.error('Error fetching videos by symptoms:', error);
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
};

/**
 * Get all videos (public)
 */
exports.getAllVideos = async (req, res) => {
  try {
    const videos = videoModel.getAllVideos().filter((v) => v.status === 'active');

    res.json({
      count: videos.length,
      videos,
    });
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
};

/**
 * Get single video by ID
 */
exports.getVideoById = async (req, res) => {
  try {
    const { id } = req.params;
    const video = videoModel.getVideoById(id);

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Increment view count
    const updatedVideo = videoModel.updateVideo(id, {
      viewCount: (video.viewCount || 0) + 1,
    });

    res.json(updatedVideo);
  } catch (error) {
    console.error('Error fetching video:', error);
    res.status(500).json({ error: 'Failed to fetch video' });
  }
};

/**
 * ADMIN: Upload/Create new video
 */
exports.uploadVideo = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      title,
      description,
      category,
      symptoms,
      videoUrl,
      duration,
      thumbnailUrl,
      tags,
      steps,
      dos,
      donts,
      warnings,
    } = req.body;

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Create new video
    const newVideo = videoModel.addVideo({
      title,
      description,
      category,
      symptoms: Array.isArray(symptoms) ? symptoms : symptoms.split(','),
      videoUrl,
      duration: parseInt(duration),
      thumbnailUrl,
      uploadedBy: userId,
      tags: Array.isArray(tags) ? tags : tags.split(','),
      steps: Array.isArray(steps) ? steps : [steps],
      dos: Array.isArray(dos) ? dos : [dos],
      donts: Array.isArray(donts) ? donts : [donts],
      warnings: Array.isArray(warnings) ? warnings : [warnings],
    });

    res.status(201).json({
      message: 'Video uploaded successfully. Pending admin approval.',
      video: newVideo,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
};

/**
 * ADMIN: Update video metadata
 */
exports.updateVideoMetadata = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { title, description, category, symptoms, tags, steps, dos, donts, warnings } =
      req.body;

    const updates = {};
    if (title) updates.title = title;
    if (description) updates.description = description;
    if (category) updates.category = category;
    if (symptoms) updates.symptoms = Array.isArray(symptoms) ? symptoms : symptoms.split(',');
    if (tags) updates.tags = Array.isArray(tags) ? tags : tags.split(',');
    if (steps) updates.steps = Array.isArray(steps) ? steps : [steps];
    if (dos) updates.dos = Array.isArray(dos) ? dos : [dos];
    if (donts) updates.donts = Array.isArray(donts) ? donts : [donts];
    if (warnings) updates.warnings = Array.isArray(warnings) ? warnings : [warnings];

    const updatedVideo = videoModel.updateVideo(id, updates);

    if (!updatedVideo) {
      return res.status(404).json({ error: 'Video not found' });
    }

    res.json({
      message: 'Video updated successfully',
      video: updatedVideo,
    });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ error: 'Update failed' });
  }
};

/**
 * ADMIN: Approve video
 */
exports.approveVideo = async (req, res) => {
  try {
    const { id } = req.params;
    const { approvalNotes } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const approvedVideo = videoModel.approveVideo(id, userId, approvalNotes || '');

    if (!approvedVideo) {
      return res.status(404).json({ error: 'Video not found' });
    }

    res.json({
      message: 'Video approved and published',
      video: approvedVideo,
    });
  } catch (error) {
    console.error('Approval error:', error);
    res.status(500).json({ error: 'Approval failed' });
  }
};

/**
 * ADMIN: Reject video
 */
exports.rejectVideo = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const rejectedVideo = videoModel.rejectVideo(id, rejectionReason || 'Admin rejected');

    if (!rejectedVideo) {
      return res.status(404).json({ error: 'Video not found' });
    }

    res.json({
      message: 'Video rejected',
      video: rejectedVideo,
    });
  } catch (error) {
    console.error('Rejection error:', error);
    res.status(500).json({ error: 'Rejection failed' });
  }
};

/**
 * ADMIN: Get pending videos for approval
 */
exports.getPendingVideos = async (req, res) => {
  try {
    const pendingVideos = videoModel.getPendingVideos();

    res.json({
      count: pendingVideos.length,
      videos: pendingVideos,
    });
  } catch (error) {
    console.error('Error fetching pending videos:', error);
    res.status(500).json({ error: 'Failed to fetch pending videos' });
  }
};

/**
 * ADMIN: Get video analytics and search gaps
 */
exports.getAnalytics = async (req, res) => {
  try {
    const stats = videoModel.getVideoStats();

    res.json({
      statistics: {
        totalVideos: stats.totalVideos,
        activeVideos: stats.activeVideos,
        pendingApproval: stats.pendingApproval,
        totalSearches: stats.totalSearches,
        successfulSearches: stats.successfulSearches,
        failedSearches: stats.failedSearches,
      },
      searchGaps: stats.searchGaps || [],
      topSearches: stats.topSearches || [],
      message:
        (stats.searchGaps && stats.searchGaps.length > 0)
          ? `Found ${stats.searchGaps.length} search gaps. Consider creating videos for high-priority gaps.`
          : 'No search gaps detected',
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
};

/**
 * ADMIN: Delete video
 */
exports.deleteVideo = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const deleted = videoModel.deleteVideo(id);

    if (!deleted) {
      return res.status(404).json({ error: 'Video not found' });
    }

    res.json({
      message: 'Video deleted successfully',
    });
  } catch (error) {
    console.error('Deletion error:', error);
    res.status(500).json({ error: 'Deletion failed' });
  }
};

/**
 * Get search analytics (admin view)
 */
exports.getSearchAnalytics = async (req, res) => {
  try {
    const analytics = videoModel.getSearchAnalytics();
    const gaps = videoModel.getSearchGaps();

    res.json({
      totalSearches: analytics.length,
      searchGaps: gaps,
      recentSearches: analytics.slice(-20).reverse(),
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
};

/**
 * Track search query for analytics (non-critical endpoint)
 */
exports.trackSearchQuery = async (req, res) => {
  try {
    const { query, resultCount, found } = req.body;
    const userId = req.user?.id || 'anonymous';

    if (!query) {
      // Still return success even if query is missing - non-critical endpoint
      return res.status(200).json({ success: true, message: 'Request processed' });
    }

    const isFound = found === true;

    // Create analytics record
    const analytics = {
      id: `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      query: String(query).toLowerCase().trim(),
      timestamp: new Date(),
      userId,
      resultCount: Number(resultCount) || 0,
      found: isFound,
      status: isFound ? 'found' : 'not_found',
    };

    // Track in model
    videoModel.recordSearchAnalytics(analytics);

    res.status(200).json({
      success: true,
      message: 'Search tracked',
    });
  } catch (error) {
    // Always return success - this is non-critical analytics
    console.log('Search tracking (non-critical):', error.message);
    res.status(200).json({ success: true, message: 'Request processed' });
  }
};
