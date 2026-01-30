const Notification = require('../models/Notification');

// GET all notifications
exports.getAdminNotifications = async (req, res) => {
  const notifications = await Notification.find({ role: 'admin' })
    .sort({ createdAt: -1 });

  res.status(200).json(notifications);
};

// MARK as read
exports.markAsRead = async (req, res) => {
  await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
  res.json({ message: 'Marked as read' });
};

// MARK as unread
exports.markAsUnread = async (req, res) => {
  await Notification.findByIdAndUpdate(req.params.id, { isRead: false });
  res.json({ message: 'Marked as unread' });
};

// MARK ALL as read
exports.markAllRead = async (req, res) => {
  await Notification.updateMany({ role: 'admin' }, { isRead: true });
  res.json({ message: 'All marked as read' });
};

// DELETE one
exports.deleteNotification = async (req, res) => {
  await Notification.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
};

// DELETE many
exports.deleteMany = async (req, res) => {
  await Notification.deleteMany({ _id: { $in: req.body.ids } });
  res.json({ message: 'Deleted selected notifications' });
};
