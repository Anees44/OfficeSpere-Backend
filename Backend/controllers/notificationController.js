// controllers/notificationController.js - COMPLETE VERSION WITH EMPLOYEE SUPPORT
// ============================================
// NOTIFICATION CONTROLLER
// Handles notifications for Admin, Employee, and Client
// ============================================

const Notification = require('../models/Notification');

// ==================== ADMIN NOTIFICATIONS ====================

// @desc    Get all admin notifications
// @route   GET /api/admin/notifications
// @access  Private/Admin
exports.getAdminNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ role: 'admin' })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: notifications
    });
  } catch (error) {
    console.error('Error fetching admin notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications'
    });
  }
};

// ==================== EMPLOYEE NOTIFICATIONS ====================

// @desc    Get all employee notifications
// @route   GET /api/employee/notifications
// @access  Private/Employee
exports.getEmployeeNotifications = async (req, res) => {
  try {
    console.log('📬 Fetching employee notifications');
    
    const notifications = await Notification.find({ role: 'employee' })
      .sort({ createdAt: -1 });

    console.log(`✅ Found ${notifications.length} employee notifications`);

    res.status(200).json({
      success: true,
      count: notifications.length,
      data: notifications,
      notifications: notifications // For compatibility
    });
  } catch (error) {
    console.error('❌ Error fetching employee notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message
    });
  }
};

// ==================== CLIENT NOTIFICATIONS ====================

// @desc    Get all client notifications
// @route   GET /api/client/notifications
// @access  Private/Client
exports.getClientNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ role: 'client' })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: notifications
    });
  } catch (error) {
    console.error('Error fetching client notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications'
    });
  }
};

// ==================== SHARED FUNCTIONS ====================

// @desc    Mark notification as read
// @route   PATCH /api/:role/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id, 
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    
    res.json({ 
      success: true,
      message: 'Marked as read',
      data: notification
    });
  } catch (error) {
    console.error('Error marking as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark as read',
      error: error.message
    });
  }
};

// @desc    Mark notification as unread
// @route   PATCH /api/:role/notifications/:id/unread
// @access  Private
exports.markAsUnread = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id, 
      { isRead: false },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    
    res.json({ 
      success: true,
      message: 'Marked as unread',
      data: notification
    });
  } catch (error) {
    console.error('Error marking as unread:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark as unread',
      error: error.message
    });
  }
};

// @desc    Mark all notifications as read
// @route   PATCH /api/:role/notifications/mark-all-read
// @access  Private
exports.markAllRead = async (req, res) => {
  try {
    // Determine role from the route or user
    let role = 'admin'; // default
    
    if (req.baseUrl.includes('/employee')) {
      role = 'employee';
    } else if (req.baseUrl.includes('/client')) {
      role = 'client';
    } else if (req.baseUrl.includes('/admin')) {
      role = 'admin';
    }

    console.log(`📬 Marking all ${role} notifications as read`);
    
    const result = await Notification.updateMany(
      { role, isRead: false }, 
      { isRead: true }
    );

    console.log(`✅ Marked ${result.modifiedCount} notifications as read`);
    
    res.json({ 
      success: true,
      message: 'All marked as read',
      count: result.modifiedCount
    });
  } catch (error) {
    console.error('❌ Error marking all as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all as read',
      error: error.message
    });
  }
};

// @desc    Delete a notification
// @route   DELETE /api/:role/notifications/:id
// @access  Private
exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    
    res.json({ 
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification',
      error: error.message
    });
  }
};

// @desc    Delete multiple notifications
// @route   POST /api/:role/notifications/delete-many
// @access  Private
exports.deleteMany = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide notification IDs to delete'
      });
    }

    const result = await Notification.deleteMany({ 
      _id: { $in: ids } 
    });
    
    res.json({ 
      success: true,
      message: `Deleted ${result.deletedCount} notification(s)`,
      count: result.deletedCount
    });
  } catch (error) {
    console.error('Error deleting notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notifications',
      error: error.message
    });
  }
};

// ==================== HELPER FUNCTIONS ====================

// @desc    Create a notification (internal use)
// @access  Internal
exports.createNotification = async (data) => {
  try {
    const notification = await Notification.create(data);
    console.log(`📬 Notification created for ${data.role}:`, data.title);
    return notification;
  } catch (error) {
    console.error('❌ Error creating notification:', error);
    return null;
  }
};

// @desc    Get unread count for a role
// @route   GET /api/:role/notifications/unread-count
// @access  Private
exports.getUnreadCount = async (req, res) => {
  try {
    let role = 'admin';
    
    if (req.baseUrl.includes('/employee')) {
      role = 'employee';
    } else if (req.baseUrl.includes('/client')) {
      role = 'client';
    }

    const count = await Notification.countDocuments({ 
      role, 
      isRead: false 
    });

    res.json({
      success: true,
      count
    });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get unread count',
      error: error.message
    });
  }
};

module.exports = exports;