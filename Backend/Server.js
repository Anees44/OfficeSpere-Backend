const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const { errorHandler } = require('./middleware/errorHandler');
const path = require('path');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==========================================
// CORS CONFIGURATION - VERCEL FIX
// ==========================================
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://office-sphere-frontend.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    console.log('🔍 Origin:', origin);
    
    // Allow requests with no origin (mobile apps, Postman, server-to-server)
    if (!origin) return callback(null, true);
    
    // Check if origin is allowed
    if (allowedOrigins.includes(origin)) {
      console.log('✅ Origin allowed:', origin);
      return callback(null, true);
    }
    
    console.log('❌ Origin blocked:', origin);
    return callback(new Error('CORS not allowed: ' + origin));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400 // 24 hours
}));

// Handle preflight requests for all routes
app.options('*', cors());

// Serve static files (uploaded files)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// ==========================================
// MONGODB CONNECTION
// ==========================================
let isConnected = false;

const ensureDbConnection = async () => {
  if (isConnected) {
    console.log('✅ Using existing database connection');
    return;
  }
  
  try {
    await connectDB();
    isConnected = true;
    console.log('✅ New database connection established');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    throw error;
  }
};

// Middleware to ensure DB connection before each request
app.use(async (req, res, next) => {
  try {
    await ensureDbConnection();
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// ==========================================
// ROUTES
// ==========================================

// Import routes
const adminRoutes = require('./Routes/adminRoutes');
const attendanceRoutes = require('./Routes/attendanceRoutes');
const authRoutes = require('./Routes/authRoutes');
const clientRoutes = require('./Routes/clientRoutes');
const employeeRoutes = require('./Routes/employeeRoutes');
const meetingRoutes = require('./Routes/meetingRoutes');
const reportRoutes = require('./Routes/reportRoutes');
const taskRoutes = require('./Routes/taskRoutes');

// Check if uploadRoutes exists
let uploadRoutes;
try {
  uploadRoutes = require('./Routes/uploadRoutes');
} catch (err) {
  console.log('⚠️  uploadRoutes not found, skipping...');
}

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'OfficeSphere API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: isConnected ? 'Connected' : 'Disconnected'
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to OfficeSphere API',
    version: '1.0.0',
    status: 'online',
    endpoints: {
      auth: '/api/auth',
      admin: '/api/admin',
      employee: '/api/employee',
      client: '/api/client',
      attendance: '/api/attendance',
      meetings: '/api/meetings',
      reports: '/api/reports',
      tasks: '/api/tasks',
      upload: '/api/upload',
      health: '/api/health'
    }
  });
});

// ==========================================
// MOUNT ROUTES
// ==========================================
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/employee', employeeRoutes);
app.use('/api/client', clientRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/tasks', taskRoutes);

// Only mount upload routes if file exists
if (uploadRoutes) {
  app.use('/api/upload', uploadRoutes);
}

// ==========================================
// ERROR HANDLING
// ==========================================

// 404 handler - Route not found
app.use((req, res) => {
  console.log('❌ 404 - Route not found:', req.method, req.originalUrl);
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    availableRoutes: [
      '/api/auth/*',
      '/api/admin/*',
      '/api/employee/*',
      '/api/client/*',
      '/api/attendance/*',
      '/api/meetings/*',
      '/api/reports/*',
      '/api/tasks/*'
    ]
  });
});

// Global error handler (must be last)
app.use(errorHandler);

// ==========================================
// LOCAL DEVELOPMENT SERVER
// ==========================================
if (process.env.NODE_ENV !== 'production') {
  const http = require('http');
  const { initializeSocket } = require('./config/socket');
  
  const server = http.createServer(app);
  initializeSocket(server);
  
  const PORT = process.env.PORT || 5000;
  
  server.listen(PORT, async () => {
    await ensureDbConnection();
    console.log('==================================================');
    console.log(`🚀 OfficeSphere Backend Server`);
    console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 Server running on port ${PORT}`);
    console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
    console.log(`📁 Static files: http://localhost:${PORT}/uploads`);
    console.log(`📊 MongoDB: Connected`);
    console.log(`🔌 Socket.IO: Initialized & Ready`);
    console.log('==================================================');
  });
  
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (err, promise) => {
    console.log(`❌ Unhandled Rejection: ${err.message}`);
    server.close(() => process.exit(1));
  });
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (err) => {
    console.log(`❌ Uncaught Exception: ${err.message}`);
    process.exit(1);
  });
  
  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('👋 SIGTERM received. Shutting down gracefully...');
    server.close(() => {
      console.log('✅ Process terminated');
    });
  });
}

// Export for Vercel
module.exports = app;