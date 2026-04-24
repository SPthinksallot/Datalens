// ============================================================
// Unit 4: Database Integration — Express with MongoDB
// Covers: Mongoose connection, async/await DB connect
// ============================================================

const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/datalens';

async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser:    true,
      useUnifiedTopology: true,
    });
    console.log(`✅ MongoDB connected: ${MONGO_URI}`);
  } catch (err) {
    console.warn(`⚠️  MongoDB not available (${err.message})`);
    console.warn('   Running in memory-only mode. History will not persist.\n');
    // App still runs without DB — history degrades gracefully
  }
}

module.exports = connectDB;
