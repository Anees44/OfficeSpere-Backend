// ============================================
// Client Routes - WITH FILE UPLOAD & FEEDBACK
// Routes/clientRoutes.js
// ============================================

const express = require('express');
const router = express.Router();
const {
  getMyProjects,
  getProject,
  createProject,
  uploadProjectFiles,
  submitFeedback,
  getProjectProgress,
  sendToAdmin,
  getDashboard,        // ✅ add karo
  getNotifications,    // ✅ add karo
  markNotificationRead,   // ✅ add karo
  markNotificationUnread, // ✅ add karo
  markAllNotificationsRead, // ✅ add karo
  deleteNotification,  // ✅ add karo
} = require('../controllers/clientController');
const { protect, authorize } = require('../middleware/auth');
const { uploadMultiple } = require('../config/multer');

// Protect all client Routes
router.use(protect);
router.use(authorize('client'));

// ============================================
// PROJECT Routes
// ============================================

router.get('/dashboard', getDashboard);

router.get('/notifications', getNotifications); // ✅
router.patch('/notifications/mark-all-read', markAllNotificationsRead); // ✅
router.patch('/notifications/:id/read', markNotificationRead); // ✅
router.patch('/notifications/:id/unread', markNotificationUnread); // ✅
router.delete('/notifications/:id', deleteNotification); // ✅

// GET all client projects, POST create project with files
router.route('/projects')
  .get(getMyProjects)
  .post(uploadMultiple('files', 10), createProject); // ✅ Allow up to 10 files

// GET single project
router.get('/projects/:id', getProject);

// Upload additional files to project
router.post('/projects/:id/upload', uploadMultiple('files', 10), uploadProjectFiles);

// ============================================
// FEEDBACK Routes
// ============================================

// Submit feedback for project
router.post('/projects/:id/feedback', submitFeedback);

// ============================================
// PROGRESS & ADMIN Routes
// ============================================

// Get project progress
router.get('/projects/:id/progress', getProjectProgress);

// Send project/request to admin
router.post('/projects/:id/send-to-admin', sendToAdmin);

module.exports = router;