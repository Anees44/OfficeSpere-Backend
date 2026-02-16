// const mongoose = require('mongoose');

// const connectDB = async () => {
//   try {
//     const options = {
//       maxPoolSize: 10,
//       serverSelectionTimeoutMS: 5000,
//       socketTimeoutMS: 45000,
//     };

//     const conn = await mongoose.connect(process.env.MONGO_URI, options);

//     console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
//     console.log(`📊 Database Name: ${conn.connection.name}`);

//     mongoose.connection.on('connected', () => {
//       console.log('📡 Mongoose connected to MongoDB');
//     });

//     mongoose.connection.on('error', (err) => {
//       console.error(`❌ Mongoose connection error: ${err.message}`);
//     });

//     mongoose.connection.on('disconnected', () => {
//       console.log('⚠️ Mongoose disconnected from MongoDB');
//     });

//     process.on('SIGINT', async () => {
//       await mongoose.connection.close();
//       console.log('🔌 Mongoose connection closed due to app termination');
//       process.exit(0);
//     });

//   } catch (error) {
//     console.error(`❌ MongoDB Connection Error: ${error.message}`);
//     console.error('💡 Make sure MongoDB is running and MONGO_URI is correct in .env');
//     process.exit(1);
//   }
// };

// module.exports = connectDB;

const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  // If already connected, return
  if (isConnected && mongoose.connection.readyState === 1) {
    console.log('📊 MongoDB: Using existing connection');
    return;
  }

  try {
    // Vercel serverless functions need these options
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4 // Use IPv4, skip trying IPv6
    };

    const conn = await mongoose.connect(process.env.MONGO_URI, options);

    isConnected = true;
    
    console.log(`📊 MongoDB Connected: ${conn.connection.host}`);
    console.log(`📦 Database: ${conn.connection.name}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️  MongoDB disconnected');
      isConnected = false;
    });

    return conn;
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    isConnected = false;
    
    // Don't exit process in Vercel
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
    
    throw error;
  }
};

module.exports = connectDB;