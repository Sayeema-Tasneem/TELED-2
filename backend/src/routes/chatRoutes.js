/**
 * Chat Routes - API endpoints for chat management
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const chatController = require('../controllers/chatController');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const { sessionId } = req.body;
    const uploadDir = path.join(__dirname, '../../uploads/chat', sessionId);
    
    // Create directory if it doesn't exist
    const fs = require('fs');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  // Accept images and PDFs only
  const allowedMimes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
});

// Chat session routes
router.post('/sessions', chatController.createOrGetSession);
router.get('/sessions/:sessionId', chatController.getSession);
router.get('/user/:userId/sessions', chatController.getUserSessions);
router.put('/sessions/:sessionId/close', chatController.closeSession);

// Message routes
router.post('/sessions/:sessionId/messages', chatController.sendMessage);
router.get('/sessions/:sessionId/messages', chatController.getMessages);
router.put('/messages/:messageId/read', chatController.markMessageAsRead);
router.put('/sessions/:sessionId/read-all', chatController.markAllAsRead);
router.delete('/messages/:messageId', chatController.deleteMessage);

// Typing status
router.put('/sessions/:sessionId/typing', chatController.updateTypingStatus);

// Search and statistics
router.get('/sessions/:sessionId/search', chatController.searchMessages);
router.get('/sessions/:sessionId/statistics', chatController.getSessionStatistics);

// File upload
router.post('/upload', upload.single('file'), chatController.uploadFile);

// Unread count
router.get('/user/:userId/unread', chatController.getUnreadCount);

module.exports = router;
