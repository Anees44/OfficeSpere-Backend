const User = require("../models/User");
const Employee = require("../models/Employee");
const Client = require("../models/Client");
const Project = require("../models/Project");
const Task = require("../models/Task");
const Attendance = require("../models/Attendance");
const Meeting = require("../models/Meeting");
const DailyReport = require("../models/DailyReport");
const Admin = require('../models/Admin');
const { getIO } = require('../config/socket');

// ============================================
// CLIENT APPROVAL
// ============================================

// @desc    Approve/Reject Client
// @route   PUT /api/admin/clients/:id/approve
// @access  Private/Admin
// ============================================
// SIRF YEH FUNCTION REPLACE KARO adminController.js mein
// approveClient function - FIXED & COMPLETE
// ============================================

const approveClient = async (req, res) => {
  try {
    const { id } = req.params;
    const { approve, reason } = req.body;

    console.log('🔍 Approve client request:', { id, approve, reason });

    // ✅ Client + User dono populate karo
    const client = await Client.findById(id).populate('userId', 'name email isActive');

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    console.log('👤 Client found:', client.clientId, '| User:', client.userId?.email);

    const { sendEmail } = require('../utils/sendEmail');

    if (approve === true || approve === 'true') {
      // ✅ APPROVE: Dono Client aur User ko active karo
      client.isActive = true;
      await client.save();

      await User.findByIdAndUpdate(client.userId._id, { isActive: true });

      console.log('✅ Client & User activated:', client.clientId);

      // ✅ Approval email - professional template
      try {
        await sendEmail({
          to: client.userId.email,
          subject: '🎉 Account Approved - Welcome to OfficeSphere!',
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <style>
                body { font-family: Arial, sans-serif; background: #f4f6f9; margin: 0; padding: 20px; }
                .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #10b981, #059669); padding: 40px 30px; text-align: center; }
                .header h1 { color: white; margin: 0; font-size: 28px; }
                .header p { color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 15px; }
                .body { padding: 35px 30px; }
                .greeting { font-size: 18px; color: #1f2937; font-weight: 600; margin-bottom: 15px; }
                .message { color: #4b5563; line-height: 1.7; font-size: 15px; margin-bottom: 20px; }
                .info-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 20px 0; }
                .info-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #dcfce7; }
                .info-row:last-child { border-bottom: none; }
                .info-label { color: #6b7280; font-size: 14px; }
                .info-value { color: #111827; font-weight: 600; font-size: 14px; }
                .btn { display: inline-block; background: #10b981; color: white; padding: 14px 35px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; margin: 20px 0; }
                .footer { background: #f9fafb; padding: 20px 30px; text-align: center; color: #9ca3af; font-size: 13px; border-top: 1px solid #e5e7eb; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>✅ Account Approved!</h1>
                  <p>Your OfficeSphere account is now active</p>
                </div>
                <div class="body">
                  <div class="greeting">Dear ${client.userId.name},</div>
                  <div class="message">
                    Great news! Your OfficeSphere account has been reviewed and <strong>approved</strong> by our admin team. 
                    You can now log in and start managing your projects.
                  </div>
                  <div class="info-box">
                    <div class="info-row">
                      <span class="info-label">Company</span>
                      <span class="info-value">${client.companyName}</span>
                    </div>
                    <div class="info-row">
                      <span class="info-label">Client ID</span>
                      <span class="info-value">${client.clientId}</span>
                    </div>
                    <div class="info-row">
                      <span class="info-label">Email</span>
                      <span class="info-value">${client.userId.email}</span>
                    </div>
                    <div class="info-row">
                      <span class="info-label">Status</span>
                      <span class="info-value" style="color: #10b981;">Active ✓</span>
                    </div>
                  </div>
                  <div class="message">
                    You can now:<br>
                    • View and track your projects<br>
                    • Submit new project requests<br>
                    • Attend meetings with our team<br>
                    • Access detailed reports
                  </div>
                  <center>
                    <a href="${process.env.FRONTEND_URL}/login" class="btn">
                      Login to Dashboard →
                    </a>
                  </center>
                </div>
                <div class="footer">
                  <p>Thank you for choosing OfficeSphere!</p>
                  <p>If you need help, contact us at support@officesphere.com</p>
                </div>
              </div>
            </body>
            </html>
          `
        });
        console.log('📧 Approval email sent to:', client.userId.email);
      } catch (emailError) {
        console.error('❌ Email send error:', emailError.message);
        // Email fail ho bhi to response success dena hai
      }

      // ✅ Socket notification
      try {
        const io = getIO();
        io.to(`client-${client._id}`).emit('account-approved', {
          message: 'Your account has been approved! You can now login.',
          clientId: client.clientId,
          companyName: client.companyName
        });
        // Admin room ko bhi update karo
        io.to('admin').emit('client-status-changed', {
          clientId: client._id,
          status: 'active'
        });
      } catch (socketError) {
        console.error('Socket error:', socketError.message);
      }

      return res.status(200).json({
        success: true,
        message: `Client "${client.companyName}" approved successfully. Email sent to ${client.userId.email}`,
        data: {
          _id: client._id,
          clientId: client.clientId,
          companyName: client.companyName,
          isActive: true,
          status: 'active'
        }
      });

    } else {
      // ❌ REJECT: Client inactive rakhna, par user account delete karna optional
      client.isActive = false;
      await client.save();

      // User bhi inactive rakho
      await User.findByIdAndUpdate(client.userId._id, { isActive: false });

      console.log('❌ Client rejected:', client.clientId);

      // Rejection email
      try {
        await sendEmail({
          to: client.userId.email,
          subject: 'OfficeSphere - Registration Update',
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <style>
                body { font-family: Arial, sans-serif; background: #f4f6f9; margin: 0; padding: 20px; }
                .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #6b7280, #4b5563); padding: 40px 30px; text-align: center; }
                .header h1 { color: white; margin: 0; font-size: 26px; }
                .body { padding: 35px 30px; }
                .greeting { font-size: 18px; color: #1f2937; font-weight: 600; margin-bottom: 15px; }
                .message { color: #4b5563; line-height: 1.7; font-size: 15px; margin-bottom: 20px; }
                .reason-box { background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 15px 20px; margin: 20px 0; color: #92400e; }
                .footer { background: #f9fafb; padding: 20px 30px; text-align: center; color: #9ca3af; font-size: 13px; border-top: 1px solid #e5e7eb; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Registration Update</h1>
                </div>
                <div class="body">
                  <div class="greeting">Dear ${client.userId.name},</div>
                  <div class="message">
                    Thank you for your interest in OfficeSphere. After reviewing your registration for 
                    <strong>${client.companyName}</strong>, we are unable to approve your account at this time.
                  </div>
                  ${reason ? `
                  <div class="reason-box">
                    <strong>Reason:</strong> ${reason}
                  </div>
                  ` : ''}
                  <div class="message">
                    If you believe this is a mistake or would like to provide additional information, 
                    please contact our support team.
                  </div>
                </div>
                <div class="footer">
                  <p>OfficeSphere Team</p>
                  <p>support@officesphere.com</p>
                </div>
              </div>
            </body>
            </html>
          `
        });
        console.log('📧 Rejection email sent to:', client.userId.email);
      } catch (emailError) {
        console.error('❌ Email send error:', emailError.message);
      }

      return res.status(200).json({
        success: true,
        message: `Client "${client.companyName}" registration declined.`,
        data: {
          _id: client._id,
          clientId: client.clientId,
          companyName: client.companyName,
          isActive: false,
          status: 'inactive'
        }
      });
    }

  } catch (error) {
    console.error('❌ Approve client error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing approval',
      error: error.message
    });
  }
};
// ============================================
// DASHBOARD
// ============================================

const getDashboard = async (req, res) => {
  try {
    // Get total employees
    const totalEmployees = await Employee.countDocuments({ isActive: true });

    // Get today's attendance
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayAttendance = await Attendance.find({
      date: { $gte: today, $lt: tomorrow }
    }).populate({
      path: 'employeeId',
      populate: {
        path: 'userId',
        select: 'name email'
      }
    });

    const presentToday = todayAttendance.filter(a =>
      a.status === 'present' || a.status === 'late'
    ).length;

    // Get active projects
    const activeProjects = await Project.countDocuments({
      status: { $in: ['active', 'in-progress', 'in_progress'] }
    });

    // Get pending tasks
    const pendingTasks = await Task.countDocuments({
      status: { $in: ['pending', 'in-progress', 'in_progress'] }
    });

    // Format attendance data for display
    const attendanceData = todayAttendance.map(record => ({
      employeeName: record.employeeId?.userId?.name || 'Unknown',
      email: record.employeeId?.userId?.email || '',
      checkInTime: record.checkInTime
        ? new Date(record.checkInTime).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        })
        : 'Not checked in',
      status: record.status || 'absent',
      isLate: record.isLate || false
    }));

    // Get recent activity
    const recentProjects = await Project.find()
      .sort({ createdAt: -1 })
      .limit(3)
      .populate('client', 'companyName')
      .select('name status createdAt');

    const recentTasks = await Task.find()
      .sort({ createdAt: -1 })
      .limit(2)
      .populate('assignedTo', 'name')
      .select('title status createdAt');

    const recentActivity = [
      ...recentProjects.map(proj => ({
        description: `New project "${proj.name}" created${proj.client ? ` for ${proj.client.companyName}` : ''}`,
        time: formatTimeAgo(proj.createdAt),
        type: 'project'
      })),
      ...recentTasks.map(task => ({
        description: `Task "${task.title}" assigned${task.assignedTo ? ` to ${task.assignedTo.name}` : ''}`,
        time: formatTimeAgo(task.createdAt),
        type: 'task'
      })),
      ...todayAttendance.slice(0, 3).map(att => ({
        description: `${att.employeeId?.userId?.name || 'Someone'} checked ${att.checkOutTime ? 'out' : 'in'}`,
        time: formatTimeAgo(att.checkInTime || att.createdAt),
        type: 'attendance'
      }))
    ].sort((a, b) => {
      const timeA = a.time.includes('ago') ? 0 : 1;
      const timeB = b.time.includes('ago') ? 0 : 1;
      return timeA - timeB;
    }).slice(0, 5);

    res.status(200).json({
      success: true,
      data: {
        totalEmployees,
        presentToday,
        activeProjects,
        pendingTasks,
        attendanceData: attendanceData.sort((a, b) => {
          if (!a.checkInTime) return 1;
          if (!b.checkInTime) return -1;
          return b.checkInTime.localeCompare(a.checkInTime);
        }),
        recentActivity
      }
    });

  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics',
      error: error.message
    });
  }
};

// Helper function to format time ago
function formatTimeAgo(date) {
  if (!date) return 'just now';

  const seconds = Math.floor((new Date() - new Date(date)) / 1000);

  if (seconds < 60) return 'just now';

  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";

  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";

  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";

  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";

  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";

  return Math.floor(seconds) + " seconds ago";
}

// ============================================
// EMPLOYEE MANAGEMENT
// ============================================

const getEmployees = async (req, res) => {
  try {
    console.log('====================================');
    console.log('📋 FETCHING ALL EMPLOYEES FOR ADMIN');
    console.log('====================================');

    const { search, department, status, page = 1, limit = 10 } = req.query;

    let query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { employeeId: { $regex: search, $options: "i" } },
      ];
    }

    if (department && department !== "all") {
      query.department = department;
    }

    if (status) {
      query.isActive = status === "active";
    }

    const skip = (page - 1) * limit;
    const total = await Employee.countDocuments(query);

    const employees = await Employee.find(query)
      .populate("userId", "name email phone avatar isActive createdAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    console.log(`✅ Found ${employees.length} employees from database`);

    const transformedEmployees = employees.map((employee) => {
      const userData = employee.userId || {};
      const userId = userData._id;

      if (!userId) {
        console.warn(`⚠️ Employee "${employee.name || employee.employeeId}" has no userId!`);
      }

      return {
        _id: employee._id,
        userId: userId,
        name: userData.name || "No Name",
        email: userData.email || employee.email || "No Email",
        phone: userData.phone || employee.phone || "",
        position: employee.designation || "Employee",
        department: employee.department || "General",
        employeeId: employee.employeeId || "N/A",
        designation: employee.designation || "Employee",
        status: employee.isActive ? "active" : "inactive",
        joinDate: employee.joiningDate || new Date(),
        salary: employee.salary || 0,
        avatar: userData.avatar,
        address: employee.address || {},
        rawEmployee: employee,
      };
    });

    console.log('====================================');
    console.log('✅ Sample transformed employee:');
    if (transformedEmployees.length > 0) {
      console.log(JSON.stringify({
        _id: transformedEmployees[0]._id,
        userId: transformedEmployees[0].userId,
        name: transformedEmployees[0].name,
        email: transformedEmployees[0].email,
        employeeId: transformedEmployees[0].employeeId
      }, null, 2));
    }
    console.log('====================================');

    res.status(200).json({
      success: true,
      count: transformedEmployees.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      employees: transformedEmployees,
    });
  } catch (error) {
    console.error('====================================');
    console.error('❌ GET EMPLOYEES ERROR');
    console.error('====================================');
    console.error("Get employees error:", error);
    console.error('====================================');

    res.status(500).json({
      success: false,
      message: "Error fetching employees",
      error: error.message,
    });
  }
};

const addEmployee = async (req, res) => {
  try {
    const {
      name, email, password, phone, position, department,
      salary, joinDate, status, address,
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    if (!position || !department) {
      return res.status(400).json({
        success: false,
        message: "Position and department are required",
      });
    }

    let formattedDepartment = department;
    if (formattedDepartment) {
      formattedDepartment =
        formattedDepartment.charAt(0).toUpperCase() +
        formattedDepartment.slice(1).toLowerCase();

      if (department.toLowerCase() === "hr") {
        formattedDepartment = "HR";
      }
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      phone: phone || "",
      role: "employee",
      isActive: true,
    });

    const employeeCount = await Employee.countDocuments();
    const employeeId = `EMP${String(employeeCount + 1).padStart(4, "0")}`;
    const isActive = status !== "inactive";

    const employeeData = {
      userId: user._id,
      employeeId: employeeId,
      name: name,
      email: email,
      phone: phone || "",
      position: position,
      designation: position,
      department: formattedDepartment,
      joiningDate: joinDate ? new Date(joinDate) : new Date(),
      salary: salary ? parseFloat(salary) : 0,
      isActive: isActive,
      skills: [],
      experience: 0,
      performance: {
        rating: 0,
        totalTasksCompleted: 0,
        onTimeCompletion: 0,
        averageTaskTime: 0,
      },
      attendance: {
        totalPresent: 0,
        totalAbsent: 0,
        totalLate: 0,
        totalLeaves: 0,
      },
    };

    if (address) {
      employeeData.address = { street: address };
    }

    const employee = await Employee.create(employeeData);
    const populatedEmployee = await Employee.findById(employee._id).populate(
      "userId",
      "name email phone",
    );

    const responseData = {
      _id: populatedEmployee._id,
      userId: populatedEmployee.userId?._id,
      name: populatedEmployee.userId?.name || name,
      email: populatedEmployee.userId?.email || email,
      phone: populatedEmployee.userId?.phone || phone,
      position: populatedEmployee.designation,
      department: populatedEmployee.department,
      employeeId: populatedEmployee.employeeId,
      status: populatedEmployee.isActive ? "active" : "inactive",
      joinDate: populatedEmployee.joiningDate,
      salary: populatedEmployee.salary,
    };

    res.status(201).json({
      success: true,
      message: "Employee added successfully",
      employee: responseData,
    });
  } catch (error) {
    console.error("Add employee error:", error);

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: messages,
        error: error.message,
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Duplicate entry detected",
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Error adding employee",
      error: error.message,
    });
  }
};

const getEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id).populate(
      "userId",
      "name email phone avatar isActive createdAt",
    );

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    const employeeData = {
      _id: employee._id,
      userId: employee.userId?._id,
      name: employee.userId?.name || "No Name",
      email: employee.userId?.email || "No Email",
      phone: employee.userId?.phone || "",
      position: employee.designation || "Employee",
      department: employee.department || "General",
      employeeId: employee.employeeId || "N/A",
      status: employee.isActive ? "active" : "inactive",
      joinDate: employee.joiningDate || new Date(),
      salary: employee.salary || 0,
      avatar: employee.userId?.avatar,
      address: employee.address || {},
      skills: employee.skills || [],
      experience: employee.experience || 0,
      user: employee.userId
        ? {
          email: employee.userId.email,
          role: employee.userId.role,
        }
        : null,
    };

    const projects = await Project.find({
      team: employee._id,
    }).select("name status startDate endDate");

    const tasks = await Task.find({
      assignedTo: employee._id,
    }).select("title status priority dueDate");

    res.status(200).json({
      success: true,
      data: {
        employee: employeeData,
        projects,
        tasks,
      },
    });
  } catch (error) {
    console.error("Get employee error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching employee",
      error: error.message,
    });
  }
};

const updateEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id).populate(
      "userId",
      "name email phone",
    );

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    const allowedFields = [
      "designation",
      "department",
      "salary",
      "isActive",
      "skills",
      "experience",
      "address",
      "emergencyContact",
      "bankDetails",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        employee[field] = req.body[field];
      }
    });

    if (req.body.position !== undefined) {
      employee.designation = req.body.position;
    }

    if (req.body.status !== undefined) {
      employee.isActive = req.body.status === "active";
    }

    await employee.save();

    if (employee.userId) {
      const userUpdate = {};
      if (req.body.name) userUpdate.name = req.body.name;
      if (req.body.email) userUpdate.email = req.body.email;
      if (req.body.phone) userUpdate.phone = req.body.phone;

      if (Object.keys(userUpdate).length > 0) {
        await User.findByIdAndUpdate(employee.userId._id, userUpdate);
      }
    }

    const updatedEmployee = await Employee.findById(employee._id).populate(
      "userId",
      "name email phone",
    );

    res.status(200).json({
      success: true,
      message: "Employee updated successfully",
      employee: {
        _id: updatedEmployee._id,
        userId: updatedEmployee.userId?._id,
        name: updatedEmployee.userId?.name,
        email: updatedEmployee.userId?.email,
        phone: updatedEmployee.userId?.phone,
        position: updatedEmployee.designation,
        department: updatedEmployee.department,
        employeeId: updatedEmployee.employeeId,
        status: updatedEmployee.isActive ? "active" : "inactive",
        joinDate: updatedEmployee.joiningDate,
        salary: updatedEmployee.salary,
      },
    });
  } catch (error) {
    console.error("Update employee error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating employee",
      error: error.message,
    });
  }
};

const deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    employee.isActive = false;
    await employee.save();

    await User.findByIdAndUpdate(employee.user, { isActive: false });

    res.status(200).json({
      success: true,
      message: "Employee deleted successfully",
    });
  } catch (error) {
    console.error("Delete employee error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting employee",
      error: error.message,
    });
  }
};

// ============================================
// CLIENT MANAGEMENT
// ============================================

// ============================================
// SIRF YEH FUNCTION REPLACE KARO adminController.js mein
// getClients function - FIXED pending detection
// ============================================

const getClients = async (req, res) => {
  try {
    console.log('====================================');
    console.log('📋 FETCHING ALL CLIENTS FOR ADMIN');
    console.log('====================================');

    const { search, status, page = 1, limit = 50 } = req.query;

    let query = {};

    if (search) {
      query.$or = [
        { companyName: { $regex: search, $options: "i" } },
        { 'contactPerson.name': { $regex: search, $options: "i" } },
        { 'contactPerson.email': { $regex: search, $options: "i" } },
        { clientId: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;
    const total = await Client.countDocuments(query);

    // ✅ CRITICAL FIX: userId ko isActive ke saath populate karo
    const clients = await Client.find(query)
      .populate("userId", "name email phone role isActive")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    console.log(`✅ Found ${clients.length} clients from database`);

    const transformedClients = clients.map(client => {
      const userData = client.userId || {};

      // ✅ FIXED: Pending detection
      // - Client isActive: false AND User isActive: false = PENDING (awaiting approval)
      // - Client isActive: true AND User isActive: true = ACTIVE
      // - Client isActive: false AND User isActive: true = INACTIVE (rejected/deactivated)
      let clientStatus;
      if (client.isActive && userData.isActive) {
        clientStatus = 'active';
      } else if (!client.isActive && !userData.isActive) {
        clientStatus = 'pending';  // ✅ Naya register hua, dono inactive
      } else {
        clientStatus = 'inactive';
      }

      return {
        _id: client._id,
        clientId: client.clientId,
        userId: userData._id,
        name: userData.name || client.contactPerson?.name || 'Unknown',
        email: userData.email || client.contactPerson?.email || client.companyEmail || '',
        phone: userData.phone || client.contactPerson?.phone || '',
        role: 'client',
        company: client.companyName || '',
        companyName: client.companyName || '',
        industry: client.industry || '',
        companySize: client.companySize || '',
        website: client.companyWebsite || '',
        isActive: client.isActive,
        userIsActive: userData.isActive,
        status: clientStatus,  // ✅ Correct status
        createdAt: client.createdAt,
        updatedAt: client.updatedAt,
        projects: client.projects || [],
        totalProjects: client.totalProjects || 0,
      };
    });

    // ✅ Filter by status AFTER transformation
    let filteredClients = transformedClients;
    if (status && status !== 'all') {
      filteredClients = transformedClients.filter(c => c.status === status);
    }

    console.log('📊 Status breakdown:', {
      total: transformedClients.length,
      active: transformedClients.filter(c => c.status === 'active').length,
      pending: transformedClients.filter(c => c.status === 'pending').length,
      inactive: transformedClients.filter(c => c.status === 'inactive').length,
    });

    res.status(200).json({
      success: true,
      count: filteredClients.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: filteredClients,      // ✅ 'data' key use karo (ClientList.jsx expects this)
      clients: filteredClients,   // ✅ backward compatibility
    });

  } catch (error) {
    console.error('❌ GET CLIENTS ERROR:', error);
    res.status(500).json({
      success: false,
      message: "Error fetching clients",
      error: error.message,
    });
  }
};

const getClient = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id).populate(
      "userId",
      "email role createdAt",
    );

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    const projects = await Project.find({
      client: client._id,
    }).select("name status startDate endDate budget");

    res.status(200).json({
      success: true,
      data: {
        client,
        projects,
      },
    });
  } catch (error) {
    console.error("Get client error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching client",
      error: error.message,
    });
  }
};
const getClientWithProjects = async (req, res) => {
  try {
    const { id } = req.params;

    const client = await Client.findById(id)
      .populate('userId', 'name email phone isActive createdAt');

    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    // Fetch all projects belonging to this client
    const projects = await Project.find({ client: client._id })
      .select('name description status priority budget spent startDate endDate progress milestones tags createdAt')
      .sort({ createdAt: -1 });

    const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0);
    const totalSpent  = projects.reduce((sum, p) => sum + (p.spent  || 0), 0);

    return res.status(200).json({
      success: true,
      data: {
        client: {
          _id: client._id,
          clientId: client.clientId,
          companyName: client.companyName,
          companyEmail: client.companyEmail,
          industry: client.industry,
          companySize: client.companySize,
          companyWebsite: client.companyWebsite,
          address: client.address,
          contactPerson: client.contactPerson,
          isActive: client.isActive,
          createdAt: client.createdAt,
          user: {
            name: client.userId?.name,
            email: client.userId?.email,
            phone: client.userId?.phone,
            isActive: client.userId?.isActive,
            createdAt: client.userId?.createdAt,
          },
        },
        projects,
        summary: {
          totalProjects: projects.length,
          totalBudget,
          totalSpent,
        },
      },
    });
  } catch (error) {
    console.error('❌ getClientWithProjects error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching client details',
      error: error.message,
    });
  }
};

const addClient = async (req, res) => {
  try {
    const {
      name, email, password, phone, address,
      company: companyName, industry, website, status
    } = req.body;

    if (!name || !email || !password || !companyName) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, password and company name are required'
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    let formattedIndustry = '';
    if (industry) {
      formattedIndustry = industry.charAt(0).toUpperCase() + industry.slice(1).toLowerCase();

      const validIndustries = [
        'Technology', 'Healthcare', 'Finance', 'Education',
        'Retail', 'Manufacturing', 'Real Estate', 'Other'
      ];

      if (!validIndustries.includes(formattedIndustry)) {
        return res.status(400).json({
          success: false,
          message: `Invalid industry. Must be one of: ${validIndustries.join(', ')}`,
          received: industry
        });
      }
    }

    const user = await User.create({
      name,
      email,
      password,
      phone: phone || '',
      role: 'client',
      isActive: true
    });

    const clientCount = await Client.countDocuments();
    const clientId = `CL${String(clientCount + 1).padStart(4, '0')}`;
    const isActive = status !== 'inactive';

    const clientData = {
      userId: user._id,
      clientId: clientId,
      companyName: companyName,
      companyEmail: email,
      contactPerson: {
        name: name,
        email: email,
        phone: phone || ''
      },
      industry: formattedIndustry || 'Other',
      companyWebsite: website || '',
      isActive: isActive,
      address: {
        street: address || ''
      }
    };

    const client = await Client.create(clientData);
    const populatedClient = await Client.findById(client._id)
      .populate('userId', 'name email phone');

    const responseData = {
      _id: populatedClient._id,
      userId: populatedClient.userId?._id,
      name: populatedClient.userId?.name || name,
      email: populatedClient.userId?.email || email,
      phone: populatedClient.userId?.phone || phone,
      company: populatedClient.companyName,
      companyName: populatedClient.companyName,
      industry: populatedClient.industry,
      website: populatedClient.companyWebsite,
      clientId: populatedClient.clientId,
      status: populatedClient.isActive ? 'active' : 'inactive',
      address: populatedClient.address?.street || address
    };

    res.status(201).json({
      success: true,
      message: 'Client added successfully',
      client: responseData
    });
  } catch (error) {
    console.error('Add client error:', error);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages,
        error: error.message
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate entry detected',
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error adding client',
      error: error.message
    });
  }
};

const updateClient = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    const allowedFields = [
      "name",
      "phone",
      "address",
      "companyName",
      "companyAddress",
      "industry",
      "isActive",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        client[field] = req.body[field];
      }
    });

    await client.save();

    res.status(200).json({
      success: true,
      message: "Client updated successfully",
      data: client,
    });
  } catch (error) {
    console.error("Update client error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating client",
      error: error.message,
    });
  }
};

const deleteClient = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    client.isActive = false;
    await client.save();

    await User.findByIdAndUpdate(client.user, { isActive: false });

    res.status(200).json({
      success: true,
      message: "Client deleted successfully",
    });
  } catch (error) {
    console.error("Delete client error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting client",
      error: error.message,
    });
  }
};

// ============================================
// SETTINGS MANAGEMENT
// ============================================

const getSettings = async (req, res) => {
  try {
    console.log('====================================');
    console.log('📥 GET Settings called');
    console.log('User ID:', req.user.id);
    console.log('====================================');

    let admin = await Admin.findOne({ userId: req.user.id });

    if (!admin) {
      console.log('⚠️ No admin document found, creating default...');

      admin = await Admin.create({
        userId: req.user.id,
        designation: 'System Administrator',
        department: 'Administration',
      });

      console.log('✅ Default admin created');
    }

    const settings = admin.getFormattedSettings();

    console.log('✅ Settings to send:', settings);
    console.log('====================================');

    res.status(200).json({
      success: true,
      data: settings,
      message: 'Settings fetched successfully'
    });

  } catch (error) {
    console.error('====================================');
    console.error('❌ Error fetching settings:', error);
    console.error('====================================');

    res.status(500).json({
      success: false,
      message: 'Failed to fetch settings',
      error: error.message
    });
  }
};

const updateSettings = async (req, res) => {
  try {
    console.log('====================================');
    console.log('📝 UPDATE Settings called');
    console.log('User ID:', req.user.id);
    console.log('Received data:', JSON.stringify(req.body, null, 2));
    console.log('====================================');

    const { company, work, attendance, email } = req.body;

    if (!company || !work || !attendance || !email) {
      console.log('❌ Missing required sections');
      return res.status(400).json({
        success: false,
        message: 'All settings sections are required'
      });
    }

    let admin = await Admin.findOne({ userId: req.user.id });

    if (!admin) {
      console.log('⚠️ Creating new admin document...');
      admin = new Admin({
        userId: req.user.id,
        designation: 'System Administrator',
        department: 'Administration',
      });
    }

    admin.companyInfo = {
      companyName: company.companyName,
      email: company.email,
      phone: company.phone,
      address: company.address,
      city: company.city,
      state: company.state,
      zipCode: company.zipCode,
      country: company.country,
      website: company.website,
      logo: company.logo || '',
    };

    admin.workSettings = {
      workingDays: work.workingDays,
      startTime: work.startTime,
      endTime: work.endTime,
      lunchBreak: work.lunchBreak,
      timezone: work.timezone,
      weekendDays: work.weekendDays,
    };

    admin.attendanceSettings = {
      autoCheckout: attendance.autoCheckout,
      lateThreshold: attendance.lateThreshold,
      halfDayHours: attendance.halfDayHours,
      fullDayHours: attendance.fullDayHours,
      overtimeRate: attendance.overtimeRate,
      allowManualCorrection: attendance.allowManualCorrection,
    };

    admin.emailSettings = {
      notifyNewEmployee: email.notifyNewEmployee,
      notifyTaskAssignment: email.notifyTaskAssignment,
      notifyMeetings: email.notifyMeetings,
      dailyReports: email.dailyReports,
      weeklyReports: email.weeklyReports,
      monthlyReports: email.monthlyReports,
    };

    await admin.save();

    console.log('✅ Settings saved to database successfully!');
    console.log('====================================');

    const updatedSettings = admin.getFormattedSettings();

    res.status(200).json({
      success: true,
      data: updatedSettings,
      message: 'Settings updated successfully'
    });

  } catch (error) {
    console.error('====================================');
    console.error('❌ Error updating settings:', error);
    console.error('Error message:', error.message);
    console.error('====================================');

    res.status(500).json({
      success: false,
      message: 'Failed to update settings',
      error: error.message
    });
  }
};

// ============================================
// PROJECTS
// ============================================

const getProjects = async (req, res) => {
  try {
    const { status, priority, page = 1, limit = 10 } = req.query;

    const query = { isActive: true };

    if (status && status !== 'all') {
      query.status = new RegExp(`^${status}$`, 'i');
    }

    if (priority && priority !== 'all') {
      query.priority = new RegExp(`^${priority}$`, 'i');
    }

    const skip = (page - 1) * limit;
    const total = await Project.countDocuments(query);

    const projects = await Project.find(query)
      .populate('client', 'companyName clientId email contactPerson phone')
      .populate('projectManager', 'name email designation')
      .populate('team', 'name email designation')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    res.status(200).json({
      success: true,
      total,
      count: projects.length,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      projects: projects,
      message: projects.length === 0 ? 'No projects found' : 'Projects fetched successfully'
    });

  } catch (error) {
    console.error('Admin get projects error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching projects',
      error: error.message
    });
  }
};

// ============================================
// ATTENDANCE
// ============================================

const getDailyAttendance = async (req, res) => {
  try {
    console.log('====================================');
    console.log('📥 GET DAILY ATTENDANCE CALLED');
    console.log('Query params:', req.query);
    console.log('====================================');

    const { date } = req.query;

    let queryDate;
    if (date) {
      const [year, month, day] = date.split('-').map(Number);
      queryDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    } else {
      const now = new Date();
      queryDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0));
    }

    const nextDay = new Date(queryDate);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);

    console.log('📅 Query date (UTC):', queryDate.toISOString());
    console.log('📅 Next day (UTC):', nextDay.toISOString());

    const allEmployees = await Employee.find({ isActive: true })
      .populate('userId', 'name email')
      .select('name email employeeId designation department');

    console.log('👥 Total active employees:', allEmployees.length);

    const attendanceRecords = await Attendance.find({
      date: { $gte: queryDate, $lt: nextDay }
    }).populate({
      path: 'employeeId',
      populate: {
        path: 'userId',
        select: 'name email'
      }
    });

    console.log('✅ Attendance records found:', attendanceRecords.length);

    const attendanceData = allEmployees.map(employee => {
      const record = attendanceRecords.find(
        r => r.employeeId && r.employeeId._id.toString() === employee._id.toString()
      );

      if (record) {
        const checkIn = record.checkInTime;
        const checkOut = record.checkOutTime;
        let workHours = 0;

        if (checkIn && checkOut) {
          const diff = new Date(checkOut) - new Date(checkIn);
          workHours = (diff / (1000 * 60 * 60)).toFixed(1);
        }

        const normalizedStatus = (record.status || 'present').toLowerCase();

        let finalStatus = normalizedStatus;
        if (checkIn && !checkOut) {
          finalStatus = 'present';
        } else if (!checkIn && !checkOut) {
          finalStatus = 'absent';
        }

        console.log('📍 Location data for', employee.userId?.name || employee.name, ':', {
          checkInLocation: record.checkInLocation,
          checkInLocationDetails: record.checkInLocationDetails,
          shortName: record.checkInLocationDetails?.shortName,
          fullAddress: record.checkInLocationDetails?.fullAddress
        });

        return {
          _id: record._id,
          employeeName: employee.userId?.name || employee.name || 'Unknown',
          email: employee.userId?.email || employee.email || '-',
          employeeId: employee.employeeId,
          designation: employee.designation,
          department: employee.department,
          checkIn: record.checkInTime,
          checkInTime: record.checkInTime,
          checkOut: record.checkOutTime,
          checkOutTime: record.checkOutTime,
          workHours: workHours,
          totalHours: workHours ? `${workHours}h` : '-',
          status: finalStatus,
          isLate: record.isLate || false,
          checkInLocation: record.checkInLocation,
          checkInLocationDetails: record.checkInLocationDetails || {
            shortName: record.checkInLocation || 'Unknown',
            fullAddress: '',
            city: '',
            state: '',
            country: '',
            area: '',
            postalCode: ''
          },
          checkInCoordinates: record.checkInCoordinates,
          location: record.checkInLocation || 'Unknown Location',
        };
      } else {
        return {
          _id: null,
          employeeName: employee.userId?.name || employee.name || 'Unknown',
          email: employee.userId?.email || employee.email || '-',
          employeeId: employee.employeeId,
          designation: employee.designation,
          department: employee.department,
          checkIn: null,
          checkInTime: null,
          checkOut: null,
          checkOutTime: null,
          workHours: 0,
          totalHours: '-',
          status: 'absent',
          isLate: false,
          checkInLocation: null,
          checkInLocationDetails: null,
          checkInCoordinates: null,
          location: null
        };
      }
    });

    const stats = {
      total: attendanceData.length,
      present: attendanceData.filter(a =>
        a.status && a.status.toLowerCase() === 'present'
      ).length,
      late: attendanceData.filter(a =>
        a.status && a.status.toLowerCase() === 'late'
      ).length,
      absent: attendanceData.filter(a =>
        a.status && a.status.toLowerCase() === 'absent'
      ).length
    };

    console.log('📊 Stats:', stats);

    const sortedData = attendanceData.sort((a, b) => {
      const statusOrder = { present: 0, late: 1, absent: 2 };
      const aOrder = statusOrder[a.status?.toLowerCase()] ?? 3;
      const bOrder = statusOrder[b.status?.toLowerCase()] ?? 3;

      if (aOrder !== bOrder) return aOrder - bOrder;

      if (!a.checkIn) return 1;
      if (!b.checkIn) return -1;
      return new Date(a.checkIn) - new Date(b.checkIn);
    });

    console.log('====================================');
    console.log('✅ Sending response with', sortedData.length, 'records');
    console.log('====================================');

    res.status(200).json({
      success: true,
      date: queryDate,
      stats: stats,
      attendance: sortedData,
      message: 'Attendance data fetched successfully'
    });

  } catch (error) {
    console.error('====================================');
    console.error('❌ GET DAILY ATTENDANCE ERROR');
    console.error('====================================');
    console.error('Error:', error);
    console.error('====================================');

    res.status(500).json({
      success: false,
      message: 'Error fetching attendance data',
      error: error.message
    });
  }
};

// ============================================
// PROJECT EXTRAS (progress, deliver, feedback)
// ============================================

const updateProgress = async (req, res) => {
  try {
    const { progress } = req.body;

    if (progress < 0 || progress > 100) {
      return res.status(400).json({
        success: false,
        message: 'Progress must be between 0 and 100'
      });
    }

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    project.progress = progress;

    if (progress === 100 && project.status !== 'Completed') {
      project.status = 'Completed';
      project.actualEndDate = new Date();
    } else if (progress > 0 && progress < 100 && project.status === 'Planning') {
      project.status = 'In Progress';
    }

    await project.save();

    await project.populate([
      { path: 'client', select: 'name companyName email' },
      { path: 'projectManager', select: 'name email' }
    ]);

    try {
      const io = getIO();
      io.to(`client-${project.client._id}`).emit('progress-updated', {
        projectId: project._id,
        projectName: project.name,
        progress: project.progress,
        status: project.status
      });
    } catch (socketError) {
      console.error('Socket emit error:', socketError);
    }

    res.status(200).json({
      success: true,
      message: 'Progress updated successfully',
      data: {
        progress: project.progress,
        status: project.status
      }
    });
  } catch (error) {
    console.error('Update progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating progress',
      error: error.message
    });
  }
};

const deliverProject = async (req, res) => {
  try {
    const { deliveryNotes, deliveryLinks } = req.body;

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    let deliveryFiles = [];
    if (req.files && req.files.length > 0) {
      deliveryFiles = req.files.map(file => ({
        name: file.originalname,
        url: `/uploads/projects/${file.filename}`,
        uploadedBy: req.user.id,
        uploadedAt: new Date(),
        isDelivery: true
      }));
      console.log('📦 Delivery files uploaded:', deliveryFiles.length);
    }

    project.files = [...project.files, ...deliveryFiles];

    const deliverable = {
      name: 'Final Delivery',
      description: deliveryNotes || 'Project completed and delivered',
      fileUrl: deliveryLinks || '',
      status: 'Submitted',
      submittedAt: new Date()
    };

    project.deliverables.push(deliverable);

    project.status = 'Completed';
    project.progress = 100;
    project.actualEndDate = new Date();

    await project.save();

    await project.populate([
      { path: 'client', select: 'name companyName email' },
      { path: 'files.uploadedBy', select: 'name email' }
    ]);

    try {
      const io = getIO();
      io.to(`client-${project.client._id}`).emit('project-delivered', {
        projectId: project._id,
        projectName: project.name,
        deliveryFiles: deliveryFiles,
        deliveryNotes: deliveryNotes
      });
    } catch (socketError) {
      console.error('Socket emit error:', socketError);
    }

    res.status(200).json({
      success: true,
      message: 'Project delivered successfully',
      data: {
        project: project,
        deliveryFiles: deliveryFiles
      }
    });
  } catch (error) {
    console.error('Deliver project error:', error);
    res.status(500).json({
      success: false,
      message: 'Error delivering project',
      error: error.message
    });
  }
};

const respondToFeedback = async (req, res) => {
  try {
    const { response } = req.body;

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const feedback = project.feedback.id(req.params.feedbackId);

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    feedback.adminResponse = response;
    feedback.respondedAt = new Date();
    feedback.respondedBy = req.user.id;
    feedback.status = 'Reviewed';

    await project.save();

    await project.populate('feedback.respondedBy', 'name email');

    try {
      const io = getIO();
      io.to(`client-${project.client}`).emit('feedback-responded', {
        projectId: project._id,
        feedbackId: feedback._id,
        response: response
      });
    } catch (socketError) {
      console.error('Socket emit error:', socketError);
    }

    res.status(200).json({
      success: true,
      message: 'Response submitted successfully',
      data: feedback
    });
  } catch (error) {
    console.error('Respond to feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Error responding to feedback',
      error: error.message
    });
  }
};

const getAllFeedback = async (req, res) => {
  try {
    const projects = await Project.find({ 'feedback.0': { $exists: true } })
      .populate('client', 'name companyName email')
      .populate('feedback.submittedBy', 'name email')
      .populate('feedback.respondedBy', 'name email')
      .select('name client feedback')
      .sort({ 'feedback.submittedAt': -1 });

    const allFeedback = [];
    projects.forEach(project => {
      project.feedback.forEach(fb => {
        allFeedback.push({
          ...fb.toObject(),
          projectName: project.name,
          projectId: project._id
        });
      });
    });

    res.status(200).json({
      success: true,
      count: allFeedback.length,
      data: allFeedback
    });
  } catch (error) {
    console.error('Get all feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching feedback',
      error: error.message
    });
  }
};

// ============================================
// EXPORTS
// ============================================
module.exports = {
  getDashboard,
  getEmployees,
  getEmployee,
  addEmployee,
  updateEmployee,
  deleteEmployee,
  getClients,
  getClientWithProjects,
  getClient,
  addClient,
  updateClient,
  deleteClient,
  getProjects,
  getSettings,
  updateSettings,
  getDailyAttendance,
  approveClient,
  updateProgress,
  deliverProject,
  respondToFeedback,
  getAllFeedback
};