const mongoose = require('mongoose');

const dailyReportSchema = new mongoose.Schema(
  {
    reportId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true
    },
    employee: { // ✅ Must be "employee" not "employeeId"
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true
    },
    date: {
      type: Date,
      required: true,
      default: Date.now
    },
    totalHoursWorked: {
      type: Number,
      required: true,
      min: 0,
      max: 24
    },
    achievements: {
      type: String,
      required: true,
      trim: true
    },
    challenges: {
      type: String,
      trim: true,
      default: ''
    },
    blockers: {
      type: String,
      trim: true,
      default: ''
    },
    suggestions: {
      type: String,
      trim: true,
      default: ''
    },
    tasksCompleted: [{
      description: String,
      hoursSpent: Number
    }],
    tasksInProgress: [{
      description: String,
      estimatedCompletion: Date
    }],
    plannedForTomorrow: [{
      description: String
    }],
    productivityRating: {
      type: Number,
      min: 1,
      max: 5
    },
    mood: {
      type: String,
      enum: ['Excellent', 'Good', 'Neutral', 'Low', 'Stressed']
    },
    status: {
      type: String,
      enum: ['Submitted', 'Reviewed', 'Approved'],
      default: 'Submitted'
    },
    submittedAt: {
      type: Date,
      default: Date.now
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: Date,
    adminNotes: String
  },
  {
    timestamps: true
  }
);

// ✅ CRITICAL: Compound index with correct field name
dailyReportSchema.index({ employee: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailyReport', dailyReportSchema);