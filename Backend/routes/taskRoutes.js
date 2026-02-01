// ============================================
// Task Routes
// All routes for task operations
// ============================================

const express = require('express');
const router = express.Router();
const {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  assignTask,
  getTaskStats,
  bulkUpdateTasks,
  getTasksByProject,
  getTasksByEmployee,
  // Employee-specific functions
  getMyTasks,
  updateTaskStatus,
  startTaskTimer,
  stopTaskTimer
} = require('../controllers/taskController');
const { protect, authorize } = require('../middleware/auth');

// ============================================
// EMPLOYEE TASK ROUTES (No admin authorization)
// ============================================
router.get('/employee/my-tasks', protect, authorize('employee'), getMyTasks);
router.patch('/employee/:id/status', protect, authorize('employee'), updateTaskStatus);
router.post('/employee/:id/timer/start', protect, authorize('employee'), startTaskTimer);
router.post('/employee/:id/timer/stop', protect, authorize('employee'), stopTaskTimer);

// ============================================
// ADMIN TASK ROUTES
// ============================================
// Protect all remaining routes with admin authorization
router.use(protect);
router.use(authorize('admin'));

// TASK CRUD ROUTES
router.route('/')
  .get(getTasks)
  .post(createTask);

router.route('/:id')
  .get(getTask)
  .put(updateTask)
  .delete(deleteTask);

// TASK SPECIFIC ROUTES
router.post('/:id/assign', assignTask);
router.get('/stats', getTaskStats);
router.put('/bulk', bulkUpdateTasks);
router.get('/project/:projectId', getTasksByProject);
router.get('/employee/:employeeId', getTasksByEmployee);

module.exports = router;