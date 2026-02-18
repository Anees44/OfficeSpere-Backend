// ✅ UPDATED Attendance Model with Half-Day, Leave, Remote, Holiday Support
// Replace your existing attendanceSchema with this:

const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    
    // ✅ NEW: Attendance Type
    type: {
      type: String,
      enum: ["full-day", "half-day", "leave", "remote"],
      default: "full-day"
    },
    
    // ✅ NEW: Request Status (for half-day and leave)
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "present", "absent", "late", "leave", "half-day", "work-from-home"],
      default: "present",
    },
    
    // ✅ NEW: Reason for leave/half-day
    reason: {
      type: String,
      trim: true
    },
    
    // ✅ NEW: Approved by admin
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    
    approvedAt: {
      type: Date
    },
    
    checkInTime: {
      type: Date,
    },
    checkInLocation: {
      type: String,
      default: "Remote",
    },
    checkInLocationDetails: {
      shortName: { type: String },
      fullAddress: { type: String },
      city: { type: String },
      state: { type: String },
      country: { type: String },
      area: { type: String },
      postalCode: { type: String }
    },
    checkInCoordinates: {
      latitude: Number,
      longitude: Number,
      accuracy: Number,
    },
    checkInIpAddress: String,
    checkInDeviceInfo: String,
    checkInMethod: {
      type: String,
      enum: ["auto", "manual", "remote", "qr-code", "wifi", "bluetooth"],
      default: "manual",
    },
    
    checkOutTime: {
      type: Date,
    },
    checkOutLocation: {
      type: String,
    },
    checkOutLocationDetails: {
      shortName: { type: String },
      fullAddress: { type: String },
      city: { type: String },
      state: { type: String },
      country: { type: String },
      area: { type: String },
      postalCode: { type: String }
    },
    checkOutCoordinates: {
      latitude: Number,
      longitude: Number,
      accuracy: Number,
    },
    checkOutIpAddress: String,
    checkOutDeviceInfo: String,
    checkOutMethod: {
      type: String,
      enum: ["auto", "manual", "remote", "qr-code", "wifi", "bluetooth"],
    },
    
    workHours: {
      type: Number,
      default: 0,
    },
    breaks: [
      {
        startTime: Date,
        endTime: Date,
        duration: Number,
        type: {
          type: String,
          enum: ["Lunch", "Tea", "Other"],
          default: "Other",
        },
      },
    ],
    totalBreakTime: {
      type: Number,
      default: 0,
    },
    productiveHours: {
      type: Number,
      default: 0,
    },
    isLate: {
      type: Boolean,
      default: false,
    },
    lateBy: {
      type: Number,
      default: 0,
    },
    earlyLeave: {
      type: Boolean,
      default: false,
    },
    earlyBy: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      trim: true,
    },
    
    // Correction Request
    correctionRequest: {
      requestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      reason: String,
      correctCheckInTime: Date,
      correctCheckOutTime: Date,
      status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
      },
      approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      approvedAt: Date,
      requestedAt: Date,
      adminNotes: String,
    },
    
    // Leave Request (kept for backwards compatibility)
    leaveRequest: {
      leaveType: {
        type: String,
        enum: ["sick", "casual", "vacation", "emergency", "unpaid"],
      },
      reason: String,
      status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
      },
      approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      approvedAt: Date,
      requestedAt: Date,
      adminNotes: String,
    },
    
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1 });
attendanceSchema.index({ status: 1 });
attendanceSchema.index({ type: 1 });

// Calculate working hours on save
attendanceSchema.pre("save", function (next) {
  if (this.checkInTime && this.checkOutTime) {
    const diffMs = this.checkOutTime - this.checkInTime;
    const hours = diffMs / (1000 * 60 * 60);
    this.workHours = Math.round(hours * 100) / 100;
    this.productiveHours = this.workHours - (this.totalBreakTime / 60);
  }
  next();
});

module.exports = mongoose.model("Attendance", attendanceSchema);