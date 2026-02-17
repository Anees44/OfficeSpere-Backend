// Routes/adminRoutes.js
// ✅ FIXED VERSION - Proper route ordering to prevent conflicts

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.js');

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
  getDailyAttendance,
  approveClient,
  updateProgress,
  deliverProject,
  respondToFeedback,
  getAllFeedback
} = require('../controllers/adminController.js');

const {
  getAdminNotifications,
  markAsRead,
  markAsUnread,
  markAllRead,
  deleteNotification,
  deleteMany
} = require('../controllers/notificationController.js');

const {
  getProject,
  createProject,
  updateProject,
  deleteProject,
  assignTeam
} = require('../controllers/projectController.js');

const {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask
} = require('../controllers/taskController.js');

// ============================================
// PROTECT ALL ADMIN Routes
// ============================================
router.use(protect);
router.use(authorize('admin'));

// ============================================
// DASHBOARD Routes
// ============================================
router.get('/dashboard', getDashboard);

// ============================================
// NOTIFICATION Routes (Specific Routes first)
// ============================================
router.patch('/notifications/mark-all-read', markAllRead);
router.post('/notifications/delete-many', deleteMany);
router.get('/notifications', getAdminNotifications);
router.patch('/notifications/:id/read', markAsRead);
router.patch('/notifications/:id/unread', markAsUnread);
router.delete('/notifications/:id', deleteNotification);

// ============================================
// ATTENDANCE ROUTE
// ============================================
router.get('/attendance', getDailyAttendance);

// ============================================
// SETTINGS Routes
// ============================================
router.route('/settings')
  .get(getSettings)
  .put(updateSettings);

// ============================================
// EMPLOYEE Routes
// ============================================
router.route('/employees')
  .get(getEmployees)
  .post(addEmployee);

router.route('/employees/:id')
  .get(getEmployee)
  .put(updateEmployee)
  .delete(deleteEmployee);

// ============================================
// CLIENT Routes
// ============================================
router.route('/clients')
  .get(getClients)
  .post(addClient);

// ✅ CRITICAL: Specific routes BEFORE parameterized :id routes
router.put('/clients/:id/approve', approveClient);  // ✅ Approve/Reject client

router.route('/clients/:id')
  .get(getClient)
  .put(updateClient)
  .delete(deleteClient);

// ============================================
// PROJECT Routes
// ============================================
router.get('/projects/feedback/all', getAllFeedback); // ✅ Specific before :id

router.route('/projects')
  .get(getProjects)
  .post(createProject);

router.route('/projects/:id')
  .get(getProject)
  .put(updateProject)
  .delete(deleteProject);

router.post('/projects/:id/assign', assignTeam);
router.put('/projects/:id/progress', updateProgress);
router.post('/projects/:id/deliver', deliverProject);
router.put('/projects/:id/feedback/:feedbackId', respondToFeedback);

// ============================================
// TASK Routes
// ============================================
router.route('/tasks')
  .get(getTasks)
  .post(createTask);

router.route('/tasks/:id')
  .get(getTask)
  .put(updateTask)
  .delete(deleteTask);

console.log('✅ Admin Routes registered successfully');

module.exports = router;