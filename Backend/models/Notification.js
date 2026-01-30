const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  title: String,
  message: String,
  type: String,
  role: String, // 'admin' | 'employee' | 'client'
  isRead: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
