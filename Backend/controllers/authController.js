const User = require("../models/User");
const Employee = require("../models/Employee");
const Client = require("../models/Client");
const Admin = require("../models/Admin");
const { generateToken } = require("../utils/generateToken");

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  let createdUser = null;

  // ✅ FIX: Ek jagah destructure karo, bahar nahi andar
  const {
    name, email, password, role, phone,
    department, designation,
    company, companyName, industry, website,
    projectDetails  // ✅ Project details for client registration
  } = req.body;

  try {
    // Validation
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields (name, email, password, role)",
      });
    }

    // Check existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    // Validate role
    const validRoles = ["admin", "employee", "client"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role. Must be admin, employee, or client",
      });
    }

    // Client signup ko inactive rakho
    const userData = {
      name,
      email,
      password,
      role,
      phone,
      isActive: role === 'client' ? false : true,
    };

    if (role === "employee") {
      if (!department || !designation) {
        return res.status(400).json({
          success: false,
          message: "For employee registration, department and designation are required",
        });
      }
      userData.department = department;
      userData.designation = designation;
    }

    if (role === "client" && company) {
      userData.company = company;
    }

    // 1. Create User
    const user = await User.create(userData);
    createdUser = user;

    // 2. Create Role-specific Profile
    let roleProfile = null;
    let profileResponse = null;

    try {
      if (role === "employee") {
        const employeeCount = await Employee.countDocuments();
        const employeeId = `EMP${(employeeCount + 1).toString().padStart(4, "0")}`;

        roleProfile = await Employee.create({
          userId: user._id,
          employeeId: employeeId,
          name: name,
          email: email,
          phone: phone || "",
          position: designation,
          designation: designation,
          department: department,
          joiningDate: new Date(),
          joinDate: new Date(),
          salary: 0,
          isActive: true,
          status: "active",
        });

        profileResponse = {
          employeeId: roleProfile.employeeId,
          designation: roleProfile.designation,
          department: roleProfile.department,
          joiningDate: roleProfile.joiningDate,
        };

      } else if (role === "client") {
        // ✅ CLIENT REGISTRATION
        const clientCount = await Client.countDocuments();
        const clientId = `CL${(clientCount + 1).toString().padStart(4, "0")}`;

        roleProfile = await Client.create({
          userId: user._id,
          clientId: clientId,
          companyName: companyName || company || `${name}'s Company`,
          companyEmail: email,
          industry: industry || 'Other',
          companyWebsite: website || '',
          contactPerson: {
            name: name,
            email: email,
            phone: phone || "",
          },
          address: {
            street: "", city: "", state: "", country: "", zipCode: "",
          },
          taxInfo: {
            taxId: "", gstNumber: "", panNumber: "",
          },
          isActive: false, // ✅ Inactive until admin approves
        });

        // ✅ Project details aaye to project bhi banao
        let createdProject = null;
        if (projectDetails && projectDetails.name && projectDetails.description) {
          try {
            const Project = require('../models/Project');

            // Generate unique project ID
            const generateProjId = async () => {
              const randomNum = Math.floor(100000 + Math.random() * 900000);
              const projId = `PROJ-${randomNum}`;
              const exists = await Project.findOne({ projectId: projId });
              if (exists) return generateProjId();
              return projId;
            };

            const projectId = await generateProjId();

            createdProject = await Project.create({
              projectId,
              name: projectDetails.name,
              description: projectDetails.description,
              client: roleProfile._id,
              startDate: projectDetails.startDate || new Date(),
              endDate: projectDetails.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              budget: projectDetails.budget || 0,
              status: 'Planning',
              priority: 'Medium',
              progress: 0,
              spent: 0,
              isActive: true,
              adminRequests: [{
                requestType: 'Review',
                urgency: 'Normal',
                message: projectDetails.requirements || 'New project request submitted during registration',
                requestedBy: { name: name, email: email },
                requestedAt: new Date(),
                status: 'Pending'
              }]
            });

            console.log('✅ Project created with registration:', createdProject.projectId);
          } catch (projError) {
            console.error('⚠️ Project creation failed (non-critical):', projError.message);
          }
        }

        profileResponse = {
          clientId: roleProfile.clientId,
          companyName: roleProfile.companyName,
          companyEmail: roleProfile.companyEmail,
          status: 'pending_approval',
          projectCreated: createdProject ? {
            projectId: createdProject.projectId,
            name: createdProject.name,
          } : null,
        };

        // ✅ ADMIN KO NOTIFICATION + EMAIL BHEJO
        try {
          const { notifyClientRegistered } = require('../utils/Notificationhelper');
          await notifyClientRegistered({
            clientId: roleProfile.clientId,
            companyName: roleProfile.companyName,
            contactPerson: name,
            email: email
          });
          console.log('✅ Admin notification created');
        } catch (notifError) {
          console.error('⚠️ Notification error:', notifError.message);
        }

        // ✅ Admin ko email bhejo
        try {
          const adminUsers = await Admin.find().populate('userId', 'email name');
          const { sendEmail } = require('../utils/sendEmail');

          for (const admin of adminUsers) {
            if (admin.userId?.email) {
              await sendEmail({
                to: admin.userId.email,
                subject: '🔔 New Client Registration - Approval Required',
                html: `
                  <!DOCTYPE html>
                  <html>
                  <head>
                    <style>
                      body { font-family: Arial, sans-serif; background: #f4f6f9; margin: 0; padding: 20px; }
                      .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
                      .header { background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 30px; text-align: center; }
                      .header h1 { color: white; margin: 0; font-size: 22px; }
                      .body { padding: 30px; }
                      .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0; }
                      .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
                      .row:last-child { border-bottom: none; }
                      .label { color: #64748b; }
                      .value { color: #0f172a; font-weight: 600; }
                      .proj-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 16px 0; }
                      .proj-title { color: #166534; font-weight: 700; margin-bottom: 10px; font-size: 14px; }
                      .btn { display: inline-block; background: #2563eb; color: white; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; }
                      .badge { background: #fef3c7; color: #92400e; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
                      .footer { background: #f8fafc; padding: 16px; text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0; }
                    </style>
                  </head>
                  <body>
                    <div class="container">
                      <div class="header">
                        <h1>🔔 New Client Registration</h1>
                      </div>
                      <div class="body">
                        <p style="color:#374151; font-size:15px;">Hello <strong>${admin.userId.name || 'Admin'}</strong>,</p>
                        <p style="color:#6b7280; font-size:14px;">A new client has registered and needs your approval:</p>
                        
                        <div class="info-box">
                          <div class="row"><span class="label">Client ID</span><span class="value">${roleProfile.clientId}</span></div>
                          <div class="row"><span class="label">Company</span><span class="value">${roleProfile.companyName}</span></div>
                          <div class="row"><span class="label">Contact Person</span><span class="value">${name}</span></div>
                          <div class="row"><span class="label">Email</span><span class="value">${email}</span></div>
                          <div class="row"><span class="label">Phone</span><span class="value">${phone || 'Not provided'}</span></div>
                          <div class="row"><span class="label">Industry</span><span class="value">${industry || 'Other'}</span></div>
                          <div class="row"><span class="label">Status</span><span class="value"><span class="badge">⏳ Pending Approval</span></span></div>
                        </div>

                        ${projectDetails && projectDetails.name ? `
                        <div class="proj-box">
                          <div class="proj-title">📁 Project Request Included</div>
                          <div class="row"><span class="label">Project Name</span><span class="value">${projectDetails.name}</span></div>
                          <div class="row"><span class="label">Description</span><span class="value">${projectDetails.description}</span></div>
                          ${projectDetails.budget ? `<div class="row"><span class="label">Budget</span><span class="value">$${projectDetails.budget}</span></div>` : ''}
                          ${projectDetails.startDate ? `<div class="row"><span class="label">Timeline</span><span class="value">${projectDetails.startDate} → ${projectDetails.endDate || 'TBD'}</span></div>` : ''}
                          ${projectDetails.requirements ? `<div class="row"><span class="label">Requirements</span><span class="value">${projectDetails.requirements}</span></div>` : ''}
                        </div>
                        ` : ''}

                        <center style="margin-top:20px;">
                          <a href="${process.env.FRONTEND_URL}/admin/clients" class="btn">Review & Approve →</a>
                        </center>
                      </div>
                      <div class="footer">OfficeSphere - Admin Notification</div>
                    </div>
                  </body>
                  </html>
                `
              });
              console.log('📧 Admin email sent to:', admin.userId.email);
            }
          }
        } catch (emailError) {
          console.error('⚠️ Admin email error:', emailError.message);
        }

      } else if (role === "admin") {
        roleProfile = await Admin.create({
          userId: user._id,
          designation: "System Administrator",
          permissions: {
            manageEmployees: true,
            manageClients: true,
            manageProjects: true,
            manageTasks: true,
            manageAttendance: true,
            manageMeetings: true,
            viewReports: true,
            manageSettings: true,
          },
        });

        profileResponse = {
          designation: roleProfile.designation,
          permissions: roleProfile.permissions,
        };
      }

    } catch (profileError) {
      console.error('Profile creation failed:', profileError);

      if (createdUser) {
        await User.findByIdAndDelete(createdUser._id);
        console.log(`Cleaned up user ${createdUser.email} after ${role} profile creation failure`);
      }

      return res.status(400).json({
        success: false,
        message: `Failed to create ${role} profile. Please check all required fields.`,
        error: profileError.message
      });
    }

    // 3. Generate JWT token
    const token = generateToken(user._id);

    // 4. Prepare response
    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      department: user.department,
      designation: user.designation,
      isActive: user.isActive,
      createdAt: user.createdAt,
      profile: profileResponse,
    };

    const message = role === 'client'
      ? 'Registration successful! Your account is pending admin approval. You will receive an email once approved.'
      : `${role.charAt(0).toUpperCase() + role.slice(1)} registered successfully`;

    res.status(201).json({
      success: true,
      message: message,
      token,
      user: userResponse,
      pendingApproval: role === 'client',
    });

  } catch (error) {
    console.error("Register error:", error);

    if (createdUser) {
      try {
        await User.findByIdAndDelete(createdUser._id);
      } catch (cleanupError) {
        console.error('Error during user cleanup:', cleanupError);
      }
    }

    if (error.message && error.message.includes("E11000")) {
      return res.status(400).json({
        success: false,
        message: "Duplicate entry detected. Please try with different details.",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error during registration",
      error: error.message,
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "Please provide email, password, and role",
      });
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Your account has been deactivated. Please contact admin.",
      });
    }

    if (user.role !== role) {
      return res.status(401).json({
        success: false,
        message: `Invalid credentials for ${role} login`,
      });
    }

    const isPasswordMatch = await user.comparePassword(password);
    if (!isPasswordMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    user.lastLogin = Date.now();
    await user.save();

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        department: user.department,
        designation: user.designation,
        avatar: user.avatar,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: "Server error during login", error: error.message });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
  try {
    res.status(200).json({ success: true, message: "Logout successful" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error during logout", error: error.message });
  }
};

// @desc    Verify JWT token
// @route   GET /api/auth/verify
// @access  Private
exports.verifyToken = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: "Account deactivated" });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        department: user.department,
        designation: user.designation,
        avatar: user.avatar,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error during token verification", error: error.message });
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: "Please provide email address" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found with this email" });
    }

    const resetToken = generateToken(user._id, "1h");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpire = Date.now() + 3600000;
    await user.save();

    res.status(200).json({ success: true, message: "Password reset email sent", resetToken });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error sending password reset email", error: error.message });
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ success: false, message: "Please provide token and new password" });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid or expired reset token" });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    const newToken = generateToken(user._id);
    res.status(200).json({ success: true, message: "Password reset successful", token: newToken });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error resetting password", error: error.message });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// @desc    Update user password
// @route   PUT /api/auth/update-password
// @access  Private
exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Please provide current and new password" });
    }

    const user = await User.findById(req.user.id).select("+password");
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Current password is incorrect" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "New password must be at least 6 characters" });
    }

    user.password = newPassword;
    await user.save();

    const token = generateToken(user._id);
    res.status(200).json({ success: true, message: "Password updated successfully", token });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating password", error: error.message });
  }
};