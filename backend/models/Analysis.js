// ============================================================
// Unit 4: MongoDB Schema — Analysis History Model
// Covers: Mongoose schema, model, validators, indexes
// ============================================================

const mongoose = require('mongoose');

// Sub-schema for per-column statistics
const ColumnStatSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  type:     { type: String, enum: ['number', 'string', 'date'], required: true },
  count:    Number,
  missing:  Number,
  unique:   Number,
  // Numeric fields
  mean:     Number,
  median:   Number,
  stddev:   Number,
  min:      Number,
  max:      Number,
  q1:       Number,
  q3:       Number,
  iqr:      Number,
  skewness: Number,
  outlierCount: Number,
  // Categorical fields
  topValues: [{ value: String, count: Number }]
}, { _id: false });

// Sub-schema for correlation pairs
const CorrPairSchema = new mongoose.Schema({
  colA: String,
  colB: String,
  r:    Number
}, { _id: false });

// Main Analysis schema
const AnalysisSchema = new mongoose.Schema({
  sessionId:   { type: String, required: true, index: true },
  fileName:    { type: String, required: true },
  fileSize:    Number,
  rowCount:    { type: Number, required: true },
  colCount:    { type: Number, required: true },
  headers:     [String],
  columnStats: [ColumnStatSchema],
  topCorrelations: [CorrPairSchema],
  insights:    [{ type: String, title: String, body: String, meta: String }],
  createdAt:   { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Index for fast history queries (newest first)
AnalysisSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Analysis', AnalysisSchema);
