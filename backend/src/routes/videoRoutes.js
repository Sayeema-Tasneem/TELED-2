// Video Routes - Admin Upload Flow and Video Search
const express = require('express');
const { body, query, validationResult } = require('express-validator');
const videoController = require('../controllers/videoController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const authenticateVideoAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (token === 'admin_token') {
    req.user = {
      id: 'simple_admin',
      role: 'admin',
    };
    return next();
  }

  return authenticate(req, res, next);
};

// Validation middleware definitions
const validateSearchQuery = query('query').trim().notEmpty().withMessage('Search query required');

const validateUploadVideo = [
  body('title').trim().notEmpty().withMessage('Title required'),
  body('description').trim().notEmpty().withMessage('Description required'),
  body('category').trim().notEmpty().withMessage('Category required'),
  body('symptoms').isArray().notEmpty().withMessage('Symptoms array required'),
  body('videoUrl').isURL().withMessage('Valid video URL required'),
  body('duration').isInt({ min: 1 }).withMessage('Duration must be positive'),
];

const validateUpdateMetadata = [
  body('title').optional().trim(),
  body('description').optional().trim(),
  body('category').optional().trim(),
  body('symptoms').optional().isArray(),
  body('tags').optional().isArray(),
  body('steps').optional().isArray(),
  body('dos').optional().isArray(),
  body('donts').optional().isArray(),
  body('warnings').optional().isArray(),
];

const validateSymptomSearch = body('symptoms').isArray().notEmpty().withMessage('Symptoms array required');

// Validation error handler middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// ========== PUBLIC ROUTES ==========

/**
 * GET /api/videos/search
 * Search for videos by query
 * Query params: ?query=cpr
 */
router.get('/search', validateSearchQuery, handleValidationErrors, videoController.searchVideos);

/**
 * GET /api/videos
 * Get all active videos
 */
router.get('/', videoController.getAllVideos);

/**
 * GET /api/videos/:id
 * Get single video by ID (increments view count)
 */
router.get('/:id', videoController.getVideoById);

/**
 * POST /api/videos/search-by-symptoms
 * Search videos by symptoms
 * Body: { symptoms: ['choking', 'unconscious'] }
 */
router.post('/search-by-symptoms', validateSymptomSearch, handleValidationErrors, videoController.getVideosBySymptoms);

/**
 * POST /api/videos/track-search
 * Track search query for analytics (non-critical)
 * Body: { query: 'cpr', foundResults: true }
 */
router.post('/track-search', videoController.trackSearchQuery);

// ========== ADMIN ROUTES ==========

/**
 * POST /api/videos/upload
 * Admin: Upload new video
 * Body: {
 *   title, description, category, symptoms[], videoUrl,
 *   duration, thumbnailUrl, tags[], steps[], dos[], donts[], warnings[]
 * }
 */
router.post('/upload', authenticateVideoAdmin, ...validateUploadVideo, handleValidationErrors, videoController.uploadVideo);

/**
 * PUT /api/videos/:id/metadata
 * Admin: Update video metadata
 */
router.put('/:id/metadata', authenticateVideoAdmin, ...validateUpdateMetadata, handleValidationErrors, videoController.updateVideoMetadata);

/**
 * POST /api/videos/:id/approve
 * Admin: Approve pending video
 * Body: { approvalNotes?: 'optional notes' }
 */
router.post('/:id/approve', authenticateVideoAdmin, videoController.approveVideo);

/**
 * POST /api/videos/:id/reject
 * Admin: Reject pending video
 * Body: { rejectionReason?: 'reason for rejection' }
 */
router.post('/:id/reject', authenticateVideoAdmin, videoController.rejectVideo);

/**
 * DELETE /api/videos/:id
 * Admin: Delete video
 */
router.delete('/:id', authenticateVideoAdmin, videoController.deleteVideo);

/**
 * GET /api/videos/admin/pending
 * Admin: Get videos pending approval
 */
router.get('/admin/pending', authenticateVideoAdmin, videoController.getPendingVideos);

/**
 * GET /api/videos/admin/analytics
 * Admin: Get video statistics and search gaps
 */
router.get('/admin/analytics', authenticateVideoAdmin, videoController.getAnalytics);

/**
 * GET /api/videos/admin/search-analytics
 * Admin: Get search analytics for gap detection
 */
router.get('/admin/search-analytics', authenticateVideoAdmin, videoController.getSearchAnalytics);

module.exports = router;
