const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    projectId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: [true, 'Please provide project name'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Please provide project description'],
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
    },
    projectManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: false,
    },
    team: [
      {
        employee: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Employee',
        },
        role: {
          type: String,
          enum: ['Developer', 'Designer', 'Tester', 'Team Lead', 'Other'],
        },
        assignedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    status: {
      type: String,
      enum: ['Planning', 'In Progress', 'On Hold', 'Completed', 'Cancelled'],
      default: 'Planning',
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Urgent', 'Critical'],
      default: 'Medium',
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    actualEndDate: {
      type: Date,
    },
    budget: {
      type: Number,
      required: true,
      min: 0,
    },
    spent: {
      type: Number,
      default: 0,
      min: 0,
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    
    // ============================================
    // 📎 FILE ATTACHMENTS - Client can attach files
    // ============================================
    attachments: [
      {
        fileName: {
          type: String,
          required: true
        },
        fileUrl: {
          type: String,
          required: true
        },
        fileSize: Number, // in bytes
        fileType: String, // e.g., 'pdf', 'docx', 'jpg'
        uploadedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
        },
        uploadedByRole: {
          type: String,
          enum: ['client', 'admin', 'employee'],
          required: true
        },
        uploadedAt: {
          type: Date,
          default: Date.now
        },
        description: String,
        category: {
          type: String,
          enum: ['requirement', 'design', 'document', 'deliverable', 'other'],
          default: 'other'
        }
      }
    ],

    // ============================================
    // 📊 PROGRESS TRACKING
    // ============================================
    progressTracking: {
      totalTasks: { type: Number, default: 0 },
      completedTasks: { type: Number, default: 0 },
      tasksInProgress: { type: Number, default: 0 },
      pendingTasks: { type: Number, default: 0 },
      totalMilestones: { type: Number, default: 0 },
      completedMilestones: { type: Number, default: 0 },
      lastUpdated: { type: Date, default: Date.now }
    },

    // ============================================
    // 💬 FEEDBACK SYSTEM
    // ============================================
    feedback: [
      {
        rating: {
          type: Number,
          min: 1,
          max: 5,
          required: true
        },
        type: {
          type: String,
          enum: ['general', 'quality', 'communication', 'timeline', 'suggestion', 'complaint'],
          default: 'general'
        },
        subject: {
          type: String,
          required: true
        },
        message: {
          type: String,
          required: true
        },
        satisfactionLevel: {
          type: Number,
          min: 1,
          max: 10,
          default: 5
        },
        createdAt: {
          type: Date,
          default: Date.now
        },
        // Admin response to feedback
        response: {
          message: String,
          respondedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
          },
          respondedAt: Date
        },
        // Social media sharing
        shared: {
          isShared: { type: Boolean, default: false },
          platforms: [String], // ['website', 'facebook', 'twitter', etc.]
          sharedAt: Date,
          publicUrl: String // URL where feedback is publicly visible
        }
      }
    ],

    // ============================================
    // 🏆 MILESTONES
    // ============================================
    milestones: [
      {
        name: String,
        description: String,
        dueDate: Date,
        status: {
          type: String,
          enum: ['Pending', 'In Progress', 'Completed', 'Approved', 'Needs Changes'],
          default: 'Pending',
        },
        progress: {
          type: Number,
          min: 0,
          max: 100,
          default: 0
        },
        completedAt: Date,
        // Client approval
        approvedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Client',
        },
        approvedAt: Date,
        // If client requests changes
        changeRequest: {
          comment: String,
          requestedAt: Date
        },
        // Files attached to this milestone
        files: [
          {
            fileName: String,
            fileUrl: String,
            uploadedBy: {
              type: mongoose.Schema.Types.ObjectId,
              ref: 'User'
            },
            uploadedAt: {
              type: Date,
              default: Date.now
            }
          }
        ]
      },
    ],

    // ============================================
    // 📦 DELIVERABLES (Admin can send before completion)
    // ============================================
    deliverables: [
      {
        name: {
          type: String,
          required: true
        },
        description: String,
        fileUrl: {
          type: String,
          required: true
        },
        fileName: String,
        fileSize: Number,
        status: {
          type: String,
          enum: ['Pending', 'Submitted', 'Approved', 'Rejected', 'Revision Requested'],
          default: 'Submitted',
        },
        submittedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
        },
        submittedAt: {
          type: Date,
          default: Date.now
        },
        // Client feedback on deliverable
        clientFeedback: {
          status: {
            type: String,
            enum: ['approved', 'rejected', 'revision_requested']
          },
          comment: String,
          reviewedAt: Date
        },
        version: {
          type: Number,
          default: 1
        },
        previousVersions: [
          {
            fileUrl: String,
            version: Number,
            submittedAt: Date
          }
        ]
      },
    ],

    // ============================================
    // 📧 ADMIN REQUESTS FROM CLIENT
    // ============================================
    adminRequests: [
      {
        requestType: {
          type: String,
          enum: ['Review', 'Approval', 'Discussion', 'Update', 'Issue', 'Other'],
          default: 'Review'
        },
        urgency: {
          type: String,
          enum: ['Low', 'Normal', 'High', 'Urgent'],
          default: 'Normal'
        },
        message: String,
        attachments: [
          {
            fileName: String,
            fileUrl: String,
            uploadedAt: {
              type: Date,
              default: Date.now
            }
          }
        ],
        requestedBy: {
          name: String,
          email: String
        },
        requestedAt: {
          type: Date,
          default: Date.now
        },
        status: {
          type: String,
          enum: ['Pending', 'In Progress', 'Resolved', 'Rejected'],
          default: 'Pending'
        },
        adminResponse: String,
        respondedAt: Date,
        respondedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        }
      }
    ],})