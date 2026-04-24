// ============================================================
// Unit 4: MongoDB Schema — Chat History Model
// Covers: Mongoose schema, sub-documents, timestamps, indexes
// ============================================================

const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  role:      { type: String, enum: ['user', 'assistant', 'system'], required: true },
  content:   { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const ChatLogSchema = new mongoose.Schema({
  chatId:    { type: String, required: true, unique: true, index: true },
  sessionId: { type: String, index: true },    // links to Analysis record
  messages:  [MessageSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

ChatLogSchema.index({ updatedAt: -1 });

module.exports = mongoose.model('ChatLog', ChatLogSchema);
