// utils/notificationHelper.js
// ============================================
// NOTIFICATION HELPER
// Creates and emits notifications for all system events
// ============================================

const Notification = require('../models/Notification');
const { getIO } = require('../config/socket');

// ============================================
// NOTIFICATION CREATOR
// ============================================

const createNotification = async ({ title, message, type, role, metadata = {} }) => {
  try {
    const notification = await Notification.create({
      title,
      message,
      type,
      role,
      metadata,
      isRead: false
    });

    console.log(`📬 Notification created for ${role}:`, title);

    // Emit socket event for real-time updates
    try {
      const io = getIO();
      io.to(role).emit('new-notification', notification);
    } catch (socketError) {
      console.error('Socket emit error:', socketError);
    }

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

// ============================================
// ATTENDANCE NOTIFICATIONS
// ============================================

const notifyCheckIn = async (employeeData) => {
  return createNotification({
    title: 'Employee Check-In',
    message: `${employeeData.employeeName} checked in at ${employeeData.checkInTime}${employeeData.isLate ? ' (Late)' : ''}`,
    type: 'attendance',
    role: 'admin',
    metadata: {
      employeeId: employeeData.employeeId,
      employeeName: employeeData.employeeName,
      checkInTime: employeeData.checkInTime,
      isLate: employeeData.isLate,
      action: 'check-in'
    }
  });
};

const notifyCheckOut = async (employeeData) => {
  return createNotification({
    title: 'Employee Check-Out',
    message: `${employeeData.employeeName} checked out at ${employeeData.checkOutTime}. Total hours: ${employeeData.totalHours}`,
    type: 'attendance',
    role: 'admin',
    metadata: {
      employeeId: employeeData.employeeId,
      employeeName: employeeData.employeeName,
      checkOutTime: employeeData.checkOutTime,
      totalHours: employeeData.totalHours,
      action: 'check-out'
    }
  });
};

const notifyAttendanceCorrection = async (data) => {
  return createNotification({
    title: 'Attendance Correction Request',
    message: `${data.employeeName} requested attendance correction for ${data.date}`,
    type: 'attendance',
    role: 'admin',
    metadata: {
      employeeId: data.employeeId,
      employeeName: data.employeeName,
      date: data.date,
      reason: data.reason,
      action: 'correction-request'
    }
  });
};

const notifyLeaveRequest = async (data) => {
  return createNotification({
    title: 'Leave Request',
    message: `${data.employeeName} requested ${data.leaveType} leave from ${data.startDate} to ${data.endDate}`,
    type: 'attendance',
    role: 'admin',
    metadata: {
      employeeId: data.employeeId,
      employeeName: data.employeeName,
      leaveType: data.leaveType,
      startDate: data.startDate,
      endDate: data.endDate,
      reason: data.reason,
      action: 'leave-request'
    }
  });
};

// ============================================
// TASK NOTIFICATIONS
// ============================================

const notifyTaskCreated = async (taskData) => {
  // Notify admin
  await createNotification({
    title: 'New Task Created',
    message: `Task "${taskData.title}" assigned to ${taskData.employeeName}`,
    type: 'task',
    role: 'admin',
    metadata: {
      taskId: taskData.taskId,
      taskTitle: taskData.title,
      employeeId: taskData.employeeId,
      employeeName: taskData.employeeName,
      priority: taskData.priority,
      dueDate: taskData.dueDate,
      action: 'task-created'
    }
  });

  // Notify employee
  return createNotification({
    title: 'New Task Assigned',
    message: `You have been assigned task: "${taskData.title}" (Priority: ${taskData.priority})`,
    type: 'task',
    role: 'employee',
    metadata: {
      taskId: taskData.taskId,
      taskTitle: taskData.title,
      priority: taskData.priority,
      dueDate: taskData.dueDate,
      action: 'task-assigned'
    }
  });
};

const notifyTaskStarted = async (taskData) => {
  return createNotification({
    title: 'Task Started',
    message: `${taskData.employeeName} started working on "${taskData.title}"`,
    type: 'task',
    role: 'admin',
    metadata: {
      taskId: taskData.taskId,
      taskTitle: taskData.title,
      employeeId: taskData.employeeId,
      employeeName: taskData.employeeName,
      startedAt: taskData.startedAt,
      action: 'task-started'
    }
  });
};

const notifyTaskCompleted = async (taskData) => {
  return createNotification({
    title: 'Task Completed',
    message: `${taskData.employeeName} completed "${taskData.title}" in ${taskData.actualHours}h${taskData.hasAttachments ? ' 📎 with files' : ''}`,
    type: 'task',
    role: 'admin',
    metadata: {
      taskId: taskData.taskId,
      taskTitle: taskData.title,
      employeeId: taskData.employeeId,
      employeeName: taskData.employeeName,
      actualHours: taskData.actualHours,
      completedAt: taskData.completedAt,
      hasAttachments: taskData.hasAttachments,
      action: 'task-completed'
    }
  });
};

const notifyTaskUpdated = async (taskData) => {
  return createNotification({
    title: 'Task Updated',
    message: `Task "${taskData.title}" was updated`,
    type: 'task',
    role: taskData.notifyRole || 'employee',
    metadata: {
      taskId: taskData.taskId,
      taskTitle: taskData.title,
      changes: taskData.changes,
      action: 'task-updated'
    }
  });
};

// ============================================
// PROJECT NOTIFICATIONS
// ============================================

const notifyProjectCreated = async (projectData) => {
  // Notify admin
  await createNotification({
    title: 'New Project Created',
    message: `Project "${projectData.name}" created for ${projectData.clientName}`,
    type: 'project',
    role: 'admin',
    metadata: {
      projectId: projectData.projectId,
      projectName: projectData.name,
      clientId: projectData.clientId,
      clientName: projectData.clientName,
      status: projectData.status,
      action: 'project-created'
    }
  });

  // Notify client if exists
  if (projectData.clientId) {
    return createNotification({
      title: 'New Project',
      message: `Project "${projectData.name}" has been created`,
      type: 'project',
      role: 'client',
      metadata: {
        projectId: projectData.projectId,
        projectName: projectData.name,
        status: projectData.status,
        startDate: projectData.startDate,
        action: 'project-created'
      }
    });
  }
};

const notifyProjectUpdated = async (projectData) => {
  // Notify admin
  await createNotification({
    title: 'Project Updated',
    message: `Project "${projectData.name}" status changed to ${projectData.status}`,
    type: 'project',
    role: 'admin',
    metadata: {
      projectId: projectData.projectId,
      projectName: projectData.name,
      status: projectData.status,
      changes: projectData.changes,
      action: 'project-updated'
    }
  });

  // Notify client
  if (projectData.clientId) {
    return createNotification({
      title: 'Project Update',
      message: `Project "${projectData.name}" has been updated`,
      type: 'project',
      role: 'client',
      metadata: {
        projectId: projectData.projectId,
        projectName: projectData.name,
        status: projectData.status,
        action: 'project-updated'
      }
    });
  }
};

const notifyProjectCompleted = async (projectData) => {
  // Notify admin
  await createNotification({
    title: 'Project Completed',
    message: `Project "${projectData.name}" has been completed`,
    type: 'project',
    role: 'admin',
    metadata: {
      projectId: projectData.projectId,
      projectName: projectData.name,
      completedAt: projectData.completedAt,
      action: 'project-completed'
    }
  });

  // Notify client
  if (projectData.clientId) {
    return createNotification({
      title: 'Project Completed',
      message: `Your project "${projectData.name}" has been completed!`,
      type: 'project',
      role: 'client',
      metadata: {
        projectId: projectData.projectId,
        projectName: projectData.name,
        completedAt: projectData.completedAt,
        action: 'project-completed'
      }
    });
  }
};

// ============================================
// MEETING NOTIFICATIONS
// ============================================

const notifyMeetingScheduled = async (meetingData) => {
  // Notify admin
  await createNotification({
    title: 'New Meeting Scheduled',
    message: `Meeting "${meetingData.title}" scheduled for ${meetingData.date} at ${meetingData.time}`,
    type: 'meeting',
    role: 'admin',
    metadata: {
      meetingId: meetingData.meetingId,
      title: meetingData.title,
      date: meetingData.date,
      time: meetingData.time,
      organizer: meetingData.organizer,
      action: 'meeting-scheduled'
    }
  });

  // Notify all participants (employees/clients)
  if (meetingData.participants) {
    meetingData.participants.forEach(async (participant) => {
      await createNotification({
        title: 'Meeting Invitation',
        message: `You're invited to "${meetingData.title}" on ${meetingData.date} at ${meetingData.time}`,
        type: 'meeting',
        role: participant.role,
        metadata: {
          meetingId: meetingData.meetingId,
          title: meetingData.title,
          date: meetingData.date,
          time: meetingData.time,
          action: 'meeting-invitation'
        }
      });
    });
  }
};

const notifyMeetingCancelled = async (meetingData) => {
  return createNotification({
    title: 'Meeting Cancelled',
    message: `Meeting "${meetingData.title}" scheduled for ${meetingData.date} has been cancelled`,
    type: 'meeting',
    role: 'admin',
    metadata: {
      meetingId: meetingData.meetingId,
      title: meetingData.title,
      date: meetingData.date,
      reason: meetingData.reason,
      action: 'meeting-cancelled'
    }
  });
};

const notifyMeetingReminder = async (meetingData) => {
  return createNotification({
    title: 'Meeting Reminder',
    message: `Meeting "${meetingData.title}" starts in ${meetingData.timeUntil}`,
    type: 'meeting',
    role: meetingData.role,
    metadata: {
      meetingId: meetingData.meetingId,
      title: meetingData.title,
      startTime: meetingData.startTime,
      action: 'meeting-reminder'
    }
  });
};

// ============================================
// REPORT NOTIFICATIONS
// ============================================

const notifyDailyReportSubmitted = async (reportData) => {
  return createNotification({
    title: 'Daily Report Submitted',
    message: `${reportData.employeeName} submitted daily report for ${reportData.date}`,
    type: 'report',
    role: 'admin',
    metadata: {
      reportId: reportData.reportId,
      employeeId: reportData.employeeId,
      employeeName: reportData.employeeName,
      date: reportData.date,
      action: 'report-submitted'
    }
  });
};

const notifyReportGenerated = async (reportData) => {
  return createNotification({
    title: 'Report Generated',
    message: `${reportData.reportType} report for ${reportData.period} is ready`,
    type: 'report',
    role: 'admin',
    metadata: {
      reportId: reportData.reportId,
      reportType: reportData.reportType,
      period: reportData.period,
      action: 'report-generated'
    }
  });
};

// ============================================
// CLIENT NOTIFICATIONS
// ============================================

const notifyClientRegistered = async (clientData) => {
  return createNotification({
    title: 'New Client Registered',
    message: `${clientData.companyName} (${clientData.contactPerson}) registered successfully`,
    type: 'client',
    role: 'admin',
    metadata: {
      clientId: clientData.clientId,
      companyName: clientData.companyName,
      contactPerson: clientData.contactPerson,
      email: clientData.email,
      action: 'client-registered'
    }
  });
};

const notifyClientFeedback = async (feedbackData) => {
  return createNotification({
    title: 'Client Feedback Received',
    message: `${feedbackData.clientName} submitted feedback for "${feedbackData.projectName}"`,
    type: 'client',
    role: 'admin',
    metadata: {
      clientId: feedbackData.clientId,
      clientName: feedbackData.clientName,
      projectId: feedbackData.projectId,
      projectName: feedbackData.projectName,
      rating: feedbackData.rating,
      action: 'feedback-received'
    }
  });
};

// ============================================
// EMPLOYEE NOTIFICATIONS
// ============================================

const notifyEmployeeRegistered = async (employeeData) => {
  return createNotification({
    title: 'New Employee Added',
    message: `${employeeData.name} joined as ${employeeData.position} in ${employeeData.department}`,
    type: 'employee',
    role: 'admin',
    metadata: {
      employeeId: employeeData.employeeId,
      name: employeeData.name,
      position: employeeData.position,
      department: employeeData.department,
      joinDate: employeeData.joinDate,
      action: 'employee-added'
    }
  });
};

// ============================================
// EXPORTS
// ============================================

module.exports = {
  // Core
  createNotification,
  
  // Attendance
  notifyCheckIn,
  notifyCheckOut,
  notifyAttendanceCorrection,
  notifyLeaveRequest,
  
  // Tasks
  notifyTaskCreated,
  notifyTaskStarted,
  notifyTaskCompleted,
  notifyTaskUpdated,
  
  // Projects
  notifyProjectCreated,
  notifyProjectUpdated,
  notifyProjectCompleted,
  
  // Meetings
  notifyMeetingScheduled,
  notifyMeetingCancelled,
  notifyMeetingReminder,
  
  // Reports
  notifyDailyReportSubmitted,
  notifyReportGenerated,
  
  // Clients
  notifyClientRegistered,
  notifyClientFeedback,
  
  // Employees
  notifyEmployeeRegistered
};