// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');

// ✅ Import from adminController
const {
  getDashboard,
  getEmployees,
  getEmployee,
  addEmployee,
  updateEmployee,
  deleteEmployee,
  getClients,
  getClient,
  addClient,
  updateClient,
  deleteClient,
  getProjects,
  getSettings,
  updateSettings,
  getDailyAttendance  // ✅ MUST BE HERE
} = require('../controllers/adminController');
const {
  getAdminNotifications,
  markAsRead,
  markAsUnread,
  markAllRead,
  deleteNotification,
  deleteMany
} = require('../controllers/notificationController.js');

// ✅ Import from projectController
const {
  getProject,
  createProject,
  updateProject,
  deleteProject,
  assignTeam
} = require('../controllers/projectController');

// ✅ Import from taskController
const {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask
} = require('../controllers/taskController');

// ============================================
// PROTECT ALL ADMIN ROUTES
// ============================================
router.use(protect);
router.use(authorize('admin'));

// ============================================
// DASHBOARD ROUTES
// ============================================
router.get('/dashboard', getDashboard);

// ============================================
// 🔔 NOTIFICATION ROUTES
// ============================================
router.get('/notifications', getAdminNotifications);
router.patch('/notifications/:id/read', markAsRead);
router.patch('/notifications/:id/unread', markAsUnread);
router.patch('/notifications/mark-all-read', markAllRead);
router.delete('/notifications/:id', deleteNotification);
router.post('/notifications/delete-many', deleteMany);

// ============================================
// ATTENDANCE ROUTES - PLACE EARLY
// ============================================
router.get('/attendance', (req, res, next) => {
  console.log('🎯 ATTENDANCE ROUTE HIT!');
  console.log('URL:', req.originalUrl);
  console.log('Query:', req.query);
  next();
}, getDailyAttendance);

// ============================================
// EMPLOYEE ROUTES
// ============================================
router.route('/employees')
  .get(getEmployees)
  .post(addEmployee);

router.route('/employees/:id')
  .get(getEmployee)
  .put(updateEmployee)
  .delete(deleteEmployee);

// ============================================
// CLIENT ROUTES
// ============================================
router.route('/clients')
  .get(getClients)
  .post(addClient);

router.route('/clients/:id')
  .get(getClient)
  .put(updateClient)
  .delete(deleteClient);

// ============================================
// PROJECT ROUTES
// ============================================
router.route('/projects')
  .get(getProjects)
  .post(createProject);

router.route('/projects/:id')
  .get(getProject)
  .put(updateProject)
  .delete(deleteProject);

router.post('/projects/:id/assign', assignTeam);

// ============================================
// TASK ROUTES
// ============================================
router.route('/tasks')
  .get(getTasks)
  .post(createTask);

router.route('/tasks/:id')
  .get(getTask)
  .put(updateTask)
  .delete(deleteTask);

// ============================================
// SETTINGS ROUTES
// ============================================
router.route('/settings')
  .get(getSettings)
  .put(updateSettings);

module.exports = router;
