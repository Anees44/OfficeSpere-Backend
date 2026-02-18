// ✅ NEW: Holiday Model
// Create this file: models/Holiday.js

const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide holiday name'],
    trim: true
  },
  date: {
    type: Date,
    required: [true, 'Please provide holiday date'],
  },
  description: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['national', 'religious', 'company', 'optional'],
    default: 'company'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  declaredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  year: {
    type: Number,
    required: true
  }
}, {
  timestamps: true
});

// Index for faster queries
holidaySchema.index({ date: 1 });
holidaySchema.index({ year: 1 });
holidaySchema.index({ isActive: 1 });

// Compound index for unique holidays per date
holidaySchema.index({ date: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Holiday', holidaySchema);