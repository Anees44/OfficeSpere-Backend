// controllers/meetingController.js
// ✅ COMPLETE PROPER FIX - Handles both User IDs and Employee records

const Meeting = require('../models/Meeting');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Employee = require('../models/Employee');
const { getIO } = require('../config/socket');

// ============================================
// HELPER - Get User ID from Employee or User
// ============================================
const getUserIdFromParticipant = async (participantId) => {
  try {
    // First check if it's a valid User ID
    const user = await User.findById(participantId);
    if (user) {
      console.log(`✅ Found User directly: ${user.name}`);
      return user._id;
    }

    // If not, check if it's an Employee ID and get their userId
    const employee = await Employee.findById(participantId).populate('userId');
    if (employee && employee.userId) {
      console.log(`✅ Found Employee, using their userId: ${employee.name}`);
      return employee.userId._id || employee.userId;
    }

    console.warn(`⚠️ No User or Employee found for ID: ${participantId}`);
    return null;
  } catch (error) {
    console.error(`❌ Error resolving participant ${participantId}:`, error);
    return null;
  }
};

// ============================================
// HELPER FUNCTION - Create Notifications
// ============================================
// ============================================
// HELPER FUNCTION - Create Notifications
// ============================================
const createMeetingNotifications = async (meeting, notificationType = 'scheduled') => {
  try {
    console.log('====================================');
    console.log('📬 Creating Meeting Notifications');
    console.log('====================================');
    console.log('Meeting ID:', meeting._id);
    console.log('Meeting Title:', meeting.title);
    console.log('Notification Type:', notificationType);
    console.log('Organizer:', meeting.organizer);
    console.log('Participants:', meeting.participants?.length || 0);

    const usersToNotify = new Set();

    // Add organizer
    const organizerId = meeting.organizer?._id || meeting.organizer;
    const organizerIdString = organizerId.toString();
    usersToNotify.add(organizerIdString);
    console.log('✅ Added organizer ID to notify list:', organizerIdString);

    // Add participants
    if (meeting.participants && meeting.participants.length > 0) {
      for (const participant of meeting.participants) {
        const userId = participant.user?._id || participant.user;
        
        if (userId) {
          const userIdString = userId.toString();
          usersToNotify.add(userIdString);
          console.log('✅ Added participant user ID:', userIdString);
        } else {
          console.warn('⚠️ Participant has no user field:', participant);
        }
      }
      console.log('✅ Processed participants:', meeting.participants.length);
    }

    // ✅✅✅ ADD THIS: If meeting is organized by client, notify all admins
    const organizer = await User.findById(meeting.organizer).select('role');
    if (organizer && organizer.role === 'client') {
      console.log('🔔 Client meeting detected - Adding all admins to notification list');
      
      const admins = await User.find({ role: 'admin', isActive: true }).select('_id');
      admins.forEach(admin => {
        usersToNotify.add(admin._id.toString());
        console.log('✅ Added admin to notify list:', admin._id);
      });
      
      console.log(`✅ Added ${admins.length} admins to notification list`);
    }

    console.log('📤 Total users to notify:', usersToNotify.size);
    console.log('📤 User IDs:', Array.from(usersToNotify));

    if (usersToNotify.size === 0) {
      console.log('⚠️ No users to notify');
      return;
    }

    // Get organizer info for message
    const organizerInfo = await User.findById(meeting.organizer).select('name email');
    const organizerName = organizerInfo?.name || 'Admin';

    // Determine notification message based on type
    let titlePrefix = '';
    let messageAction = '';

    switch (notificationType) {
      case 'scheduled':
        titlePrefix = '📅 New Meeting Scheduled';
        messageAction = 'scheduled';
        break;
      case 'updated':
        titlePrefix = '📝 Meeting Updated';
        messageAction = 'updated';
        break;
      case 'cancelled':
        titlePrefix = '❌ Meeting Cancelled';
        messageAction = 'cancelled';
        break;
      case 'deleted':
        titlePrefix = '🗑️ Meeting Deleted';
        messageAction = 'deleted';
        break;
      default:
        titlePrefix = '📅 Meeting Notification';
        messageAction = 'updated';
    }

    // Format meeting time
    const meetingDate = new Date(meeting.startTime).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    const meetingTime = new Date(meeting.startTime).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    // Get Socket.IO instance
    const io = getIO();

    // Create notifications for ALL users
    const notificationPromises = Array.from(usersToNotify).map(async (userId) => {
      try {
        console.log('📤 Processing user ID:', userId);

        const user = await User.findById(userId).select('name email role');

        if (!user) {
          console.warn('⚠️ User not found for ID:', userId);
          return null;
        }

        console.log(`📤 Creating notification for: ${user.name} (${user.role})`);

        const notification = await Notification.create({
          title: titlePrefix,
          message: `${organizerName} has ${messageAction} a meeting "${meeting.title}" on ${meetingDate} at ${meetingTime}`,
          type: 'meeting',
          role: user.role,
          metadata: {
            meetingId: meeting._id,
            meetingTitle: meeting.title,
            organizerName: organizerName,
            startTime: meeting.startTime,
            location: meeting.location,
            meetingLink: meeting.meetingLink
          },
          isRead: false
        });

        console.log(`✅ Notification created for ${user.name} (${user.role}):`, notification._id);

        // Emit real-time notification via Socket.IO
        if (io) {
          const socketRoom = `${user.role}-${userId}`;

          console.log('====================================');
          console.log('📡 SOCKET EMISSION');
          console.log('====================================');
          console.log('User ID:', userId);
          console.log('User Role:', user.role);
          console.log('Socket Room:', socketRoom);
          console.log('====================================');

          io.to(socketRoom).emit('new-notification', {
            _id: notification._id,
            title: notification.title,
            message: notification.message,
            type: notification.type,
            role: notification.role,
            metadata: notification.metadata,
            isRead: notification.isRead,
            createdAt: notification.createdAt
          });

          console.log(`✅ Socket notification sent to ${socketRoom}`);
        }

        return notification;

      } catch (error) {
        console.error('❌ Error creating notification for user:', userId, error);
        return null;
      }
    });

    const notifications = await Promise.all(notificationPromises);
    const successfulNotifications = notifications.filter(n => n !== null);

    console.log(`✅ Created ${successfulNotifications.length} notifications`);
    console.log('====================================');

    return successfulNotifications;

  } catch (error) {
    console.error('❌ Error in createMeetingNotifications:', error);
  }
};

// ============================================
// ADMIN - Get All Meetings
// ============================================
exports.getAllMeetings = async (req, res) => {
  try {
    console.log('🔍 Fetching all meetings for admin');

    const meetings = await Meeting.find()
      .populate('organizer', 'name email')
      .populate('participants.user', 'name email role')
      .populate('project', 'name')
      .sort({ startTime: -1 });

    console.log(`✅ Found ${meetings.length} meetings`);

    res.status(200).json({
      success: true,
      count: meetings.length,
      meetings
    });

  } catch (error) {
    console.error('❌ Error fetching meetings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch meetings',
      error: error.message
    });
  }
};

// ============================================
// ADMIN - Schedule Meeting
// ============================================
exports.scheduleMeeting = async (req, res) => {
  try {
    console.log('====================================');
    console.log('📅 ADMIN SCHEDULE MEETING REQUEST');
    console.log('====================================');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('User (Admin):', {
      id: req.user._id,
      email: req.user.email,
      role: req.user.role
    });

    const {
      title,
      description,
      type,
      startTime,
      endTime,
      duration,
      location,
      meetingLink,
      participants,
      project,
      agenda
    } = req.body;

    // Validate required fields
    if (!title || !startTime || !endTime || !type) {
      return res.status(400).json({
        success: false,
        message: 'Please provide title, start time, end time, and meeting type'
      });
    }

    if (!participants || participants.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please select at least one participant'
      });
    }

    // ✅✅✅ CRITICAL FIX: Resolve participant IDs to actual User IDs
    console.log('====================================');
    console.log('🔍 RESOLVING PARTICIPANTS');
    console.log('====================================');
    console.log('Participant IDs received:', participants);

    const resolvedUserIds = [];
    const failedParticipants = [];

    for (const participantId of participants) {
      const userId = await getUserIdFromParticipant(participantId);
      if (userId) {
        resolvedUserIds.push(userId);
      } else {
        failedParticipants.push(participantId);
      }
    }

    console.log('✅ Resolved User IDs:', resolvedUserIds);

    if (failedParticipants.length > 0) {
      console.error('❌ Failed to resolve participants:', failedParticipants);
      return res.status(400).json({
        success: false,
        message: `Invalid participant IDs: ${failedParticipants.join(', ')}. These users do not exist.`
      });
    }

    if (resolvedUserIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid participants found'
      });
    }

    console.log('✅ All participants resolved successfully');
    console.log('====================================');

    // Generate meeting ID
    const meetingCount = await Meeting.countDocuments();
    const meetingId = `MTG${String(meetingCount + 1).padStart(4, '0')}`;

    // Format participants array
    const participantsList = resolvedUserIds.map(userId => ({
      user: userId,
      status: 'Invited'
    }));

    console.log('📤 Participants list:', participantsList);

    // Create meeting
    const meeting = await Meeting.create({
      meetingId,
      title,
      description: description || '',
      type,
      organizer: req.user._id,
      participants: participantsList,
      project: project || null,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      duration: duration || 60,
      location: location || 'Office',
      meetingLink: meetingLink || '',
      agenda: agenda || '',
      status: 'Scheduled'
    });

    console.log('✅ Meeting created:', meeting._id);

    // Populate meeting data
    const populatedMeeting = await Meeting.findById(meeting._id)
      .populate('organizer', 'name email')
      .populate('participants.user', 'name email role')
      .populate('project', 'name');

    console.log('✅ Meeting populated');

    // Create notifications
    await createMeetingNotifications(populatedMeeting, 'scheduled');

    console.log('====================================');
    console.log('✅ MEETING SCHEDULED SUCCESSFULLY');
    console.log('Meeting ID:', meeting.meetingId);
    console.log('====================================');

    res.status(201).json({
      success: true,
      message: 'Meeting scheduled successfully',
      meeting: populatedMeeting
    });

  } catch (error) {
    console.error('====================================');
    console.error('❌ ADMIN SCHEDULE MEETING ERROR');
    console.error('====================================');
    console.error('Error:', error);
    console.error('Stack:', error.stack);

    res.status(500).json({
      success: false,
      message: 'Failed to schedule meeting',
      error: error.message
    });
  }
};

// ============================================
// ADMIN - Get Single Meeting
// ============================================
exports.getMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id)
      .populate('organizer', 'name email')
      .populate('participants.user', 'name email role')
      .populate('project', 'name');

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    res.status(200).json({
      success: true,
      meeting
    });

  } catch (error) {
    console.error('❌ Error fetching meeting:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch meeting',
      error: error.message
    });
  }
};

// ============================================
// ADMIN - Update Meeting
// ============================================
exports.updateMeeting = async (req, res) => {
  try {
    console.log('📝 Updating meeting:', req.params.id);
    console.log('Update data:', req.body);

    let meeting = await Meeting.findById(req.params.id);

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    // Update meeting
    meeting = await Meeting.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('organizer', 'name email')
      .populate('participants.user', 'name email role')
      .populate('project', 'name');

    // Create notifications for updated meeting
    await createMeetingNotifications(meeting, 'updated');

    console.log('✅ Meeting updated successfully');

    res.status(200).json({
      success: true,
      message: 'Meeting updated successfully',
      meeting
    });

  } catch (error) {
    console.error('❌ Error updating meeting:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update meeting',
      error: error.message
    });
  }
};

// ============================================
// ADMIN - Delete Meeting
// ============================================
exports.deleteMeeting = async (req, res) => {
  try {
    console.log('====================================');
    console.log('🗑️ ADMIN DELETE MEETING REQUEST');
    console.log('====================================');
    console.log('Meeting ID:', req.params.id);

    const meeting = await Meeting.findById(req.params.id)
      .populate('organizer', 'name email role')
      .populate('participants.user', 'name email role');

    if (!meeting) {
      console.log('❌ Meeting not found');
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    console.log('📋 Meeting found:', meeting.title);

    // Create deletion notifications BEFORE deleting
    await createMeetingNotifications(meeting, 'deleted');

    // Delete the meeting
    await Meeting.findByIdAndDelete(req.params.id);

    console.log('✅ Meeting deleted successfully');
    console.log('====================================');

    res.status(200).json({
      success: true,
      message: 'Meeting deleted successfully'
    });

  } catch (error) {
    console.error('====================================');
    console.error('❌ DELETE MEETING ERROR');
    console.error('====================================');
    console.error('Error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to delete meeting',
      error: error.message
    });
  }
};

// ============================================
// ADMIN - Add Meeting Minutes
// ============================================
exports.addMeetingMinutes = async (req, res) => {
  try {
    const { discussion, decisions, actionItems } = req.body;

    const meeting = await Meeting.findByIdAndUpdate(
      req.params.id,
      {
        minutes: {
          discussion,
          decisions,
          actionItems,
          recordedBy: req.user._id,
          recordedAt: new Date()
        }
      },
      { new: true }
    )
      .populate('organizer', 'name email')
      .populate('participants.user', 'name email role')
      .populate('project', 'name');

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Meeting minutes added successfully',
      meeting
    });

  } catch (error) {
    console.error('❌ Error adding meeting minutes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add meeting minutes',
      error: error.message
    });
  }
};

// ============================================
// EMPLOYEE/CLIENT - Get My Meetings
// ============================================
exports.getMyMeetings = async (req, res) => {
  try {
    console.log(`🔍 Fetching meetings for ${req.user.role}:`, req.user.email);

    const meetings = await Meeting.find({
      'participants.user': req.user._id
    })
      .populate('organizer', 'name email')
      .populate('participants.user', 'name email role')
      .populate('project', 'name')
      .sort({ startTime: -1 });

    console.log(`✅ Found ${meetings.length} meetings for user`);

    res.status(200).json({
      success: true,
      count: meetings.length,
      meetings
    });

  } catch (error) {
    console.error('❌ Error fetching my meetings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch meetings',
      error: error.message
    });
  }
};

// ============================================
// EMPLOYEE/CLIENT - Update Participant Status
// ============================================
exports.updateParticipantStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const meeting = await Meeting.findById(req.params.id);

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    // Find participant
    const participantIndex = meeting.participants.findIndex(
      p => p.user.toString() === req.user._id.toString()
    );

    if (participantIndex === -1) {
      return res.status(403).json({
        success: false,
        message: 'You are not a participant in this meeting'
      });
    }

    // Update status
    meeting.participants[participantIndex].status = status;
    await meeting.save();

    const updatedMeeting = await Meeting.findById(meeting._id)
      .populate('organizer', 'name email')
      .populate('participants.user', 'name email role')
      .populate('project', 'name');

    res.status(200).json({
      success: true,
      message: 'Meeting status updated',
      meeting: updatedMeeting
    });

  } catch (error) {
    console.error('❌ Error updating participant status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update status',
      error: error.message
    });
  }
};

// ============================================
// CLIENT - Schedule Meeting
// ============================================
// meetingController.js - clientScheduleMeeting function

exports.clientScheduleMeeting = async (req, res) => {
  try {
    console.log('====================================');
    console.log('📅 CLIENT SCHEDULE MEETING REQUEST');
    console.log('====================================');

    const {
      title,
      description,
      type,
      startTime,
      endTime,
      duration,
      location,
      meetingLink,
      participants,
      agenda
    } = req.body;

    if (!title || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Please provide title, start time, and end time'
      });
    }

    // ✅✅✅ Automatically get all admins
    const admins = await User.find({ role: 'admin', isActive: true }).select('_id');
    console.log(`🔔 Found ${admins.length} admins to add as participants`);

    const meetingCount = await Meeting.countDocuments();
    const meetingId = `MTG${String(meetingCount + 1).padStart(4, '0')}`;

    // ✅✅✅ Build participants list with client + admins + any additional participants
    const participantsList = [
      { user: req.user._id, status: 'Accepted' }, // Client (organizer)
      ...admins.map(admin => ({ 
        user: admin._id, 
        status: 'Invited' 
      })), // All admins
      ...(participants || []).map(userId => ({
        user: userId,
        status: 'Invited'
      })) // Any additional participants from frontend
    ];

    console.log(`👥 Total participants: ${participantsList.length}`);

    const meeting = await Meeting.create({
      meetingId,
      title,
      description: description || '',
      type: type || 'Client',
      organizer: req.user._id,
      participants: participantsList, // ✅ Now includes admins
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      duration: duration || 60,
      location: location || 'Online',
      meetingLink: meetingLink || '',
      agenda: agenda || '',
      status: 'Scheduled'
    });

    const populatedMeeting = await Meeting.findById(meeting._id)
      .populate('organizer', 'name email')
      .populate('participants.user', 'name email role')
      .populate('project', 'name');

    // Notifications will now go to admins too (already handled by createMeetingNotifications)
    await createMeetingNotifications(populatedMeeting, 'scheduled');

    console.log('✅ CLIENT MEETING SCHEDULED SUCCESSFULLY');

    res.status(201).json({
      success: true,
      message: 'Meeting scheduled successfully',
      meeting: populatedMeeting
    });

  } catch (error) {
    console.error('❌ CLIENT SCHEDULE MEETING ERROR:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to schedule meeting',
      error: error.message
    });
  }
};

// ============================================
// CLIENT - Cancel Meeting
// ============================================
exports.clientCancelMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id)
      .populate('organizer', 'name email role')
      .populate('participants.user', 'name email role');

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    if (meeting.organizer._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the organizer can cancel this meeting'
      });
    }

    await createMeetingNotifications(meeting, 'cancelled');
    await Meeting.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Meeting cancelled successfully'
    });

  } catch (error) {
    console.error('❌ Error cancelling meeting:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel meeting',
      error: error.message
    });
  }
};

module.exports = exports;