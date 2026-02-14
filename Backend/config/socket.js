// // config/socket.js
// const socketIO = require('socket.io');

// let io;

// const initializeSocket = (server) => {
//   io = socketIO(server, {
//     cors: {
//       origin: process.env.FRONTEND_URL || 'http://localhost:5173',
//       methods: ['GET', 'POST', 'PUT', 'DELETE'],
//       credentials: true
//     },
//     transports: ['websocket', 'polling'] // Important for compatibility
//   });

//   io.on('connection', (socket) => {
//     console.log('✅ Socket connected:', socket.id);

//     // User joins their specific room
//     socket.on('join-room', ({ role, userId }) => {
//       const roomName = `${role}-${userId}`;
//       socket.join(roomName);
//       socket.join(role); // Also join general role room
      
//       console.log(`👤 User ${userId} joined rooms: ${roomName}, ${role}`);
      
//       // Send confirmation
//       socket.emit('room-joined', { 
//         room: roomName, 
//         role,
//         message: 'Successfully joined room' 
//       });
//     });

//     // Leave room
//     socket.on('leave-room', ({ role, userId }) => {
//       const roomName = `${role}-${userId}`;
//       socket.leave(roomName);
//       socket.leave(role);
//       console.log(`👋 User ${userId} left room: ${roomName}`);
//     });

//     // Handle ping/pong for connection health
//     socket.on('ping', () => {
//       socket.emit('pong');
//     });

//     // Disconnect
//     socket.on('disconnect', (reason) => {
//       console.log(`❌ Socket disconnected: ${socket.id}, Reason: ${reason}`);
//     });

//     // Error handling
//     socket.on('error', (error) => {
//       console.error('❌ Socket error:', error);
//     });
//   });

//   // Log successful initialization
//   console.log('✅ Socket.IO initialized successfully');

//   return io;
// };

// const getIO = () => {
//   if (!io) {
//     throw new Error('Socket.io not initialized! Call initializeSocket first.');
//   }
//   return io;
// };

// module.exports = { initializeSocket, getIO };



// config/socket.js
const socketIO = require('socket.io');
let io;

const initializeSocket = (server) => {
  try {
    io = socketIO(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true
      },
      transports: ['polling', 'websocket']
    });

    io.on('connection', (socket) => {
      console.log('Socket connected:', socket.id);

      socket.on('join-room', ({ role, userId }) => {
        const roomName = `${role}-${userId}`;
        socket.join(roomName);
        socket.join(role);
      });

      socket.on('leave-room', ({ role, userId }) => {
        const roomName = `${role}-${userId}`;
        socket.leave(roomName);
        socket.leave(role);
      });

      socket.on('ping', () => {
        socket.emit('pong');
      });

      socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
      });
    });

    console.log('✅ Socket.IO initialized successfully');
  } catch (error) {
    console.log('⚠️ Socket.IO initialization failed:', error.message);
  }
};

const getIO = () => io;

module.exports = { initializeSocket, getIO };