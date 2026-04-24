// ============================================================
// Unit 4: Express Route — POST /api/analyze
// Covers: routing, middleware, async/await, HTTP status codes,
//         fs module (read uploaded file), EventEmitter
// ============================================================

const express  = require('express');
const path     = require('path');
const fs       = require('fs');
const { v4: uuidv4 } = require('uuid');
const Analysis = require('../models/Analysis');
const { CSVParser, DataAnalyzer } = require('../services/statsService');
const { appEvents } = require('../server');

const router = express.Router();
const uploadDir = path.join(__dirname, '../uploads');

// In-memory fallback store when MongoDB is unavailable
const memStore = new Map(); // Unit 2: ES6 Map

// ─── POST /api/analyze ─────────────────────────────────────────
// Body: { sessionId, storedName, originalName, fileSize }
router.post('/', async (req, res, next) => {
  try {
    // Unit 1: HTTP Request — reading request body
    const { sessionId, storedName, originalName, fileSize } = req.body;
    if (!storedName) {
      return res.status(400).json({ error: 'storedName is required' });
    }

    // Unit 4: fs module — read file
    const filePath = path.join(uploadDir, storedName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Uploaded file not found' });
    }

    const text = fs.readFileSync(filePath, 'utf-8');
    const ext  = path.extname(originalName).toLowerCase();

    // Parse the file — Unit 2: ES6 class usage
    let parsed;
    if (ext === '.json') {
      parsed = CSVParser.parseJSON(text);
    } else {
      const delim = ext === '.tsv' ? '\t' : CSVParser.detectDelimiter(text);
      parsed = CSVParser.parse(text, delim);
    }

    if (!parsed || !parsed.rows.length) {
      return res.status(422).json({ error: 'Could not parse file or file is empty' });
    }

    // Analyse — Unit 2: class instantiation
    const analyzer = new DataAnalyzer(parsed.headers, parsed.rows);
    const columnStats = Object.values(analyzer.stats).map(s => {
      if (s.type === 'number') {
        return { ...s, values: undefined }; // strip raw arrays before storing
      }
      return s;
    });

    const { topPairs } = analyzer.correlationMatrix();
    const insights     = analyzer.generateInsights();
    const sum          = analyzer.summary();

    const record = {
      sessionId: sessionId || uuidv4(),
      fileName:  originalName,
      fileSize:  fileSize || 0,
      rowCount:  parsed.rows.length,
      colCount:  parsed.headers.length,
      headers:   parsed.headers,
      columnStats,
      topCorrelations: topPairs,
      insights,
      createdAt: new Date()
    };

    // Unit 4: MongoDB save (with graceful fallback to in-memory)
    try {
      const doc = await Analysis.create(record);
      record._id = doc._id;
    } catch {
      // MongoDB not running — use Map as fallback
      memStore.set(record.sessionId, record);
    }

    // Unit 4: EventEmitter
    appEvents.emit('analysis:done', { sessionId: record.sessionId });

    // Clean up temp file
    fs.unlinkSync(filePath);

    // Unit 1: HTTP 201 Created — full analysis response
    res.status(201).json({
      sessionId:  record.sessionId,
      fileName:   originalName,
      rowCount:   sum.total,
      colCount:   parsed.headers.length,
      numCols:    sum.numCols,
      strCols:    sum.strCols,
      totalMissing: sum.totalMissing,
      duplicates: sum.dupes,
      headers:    parsed.headers,
      types:      analyzer.types,
      columnStats,
      correlationMatrix: analyzer.correlationMatrix().matrix,
      topCorrelations: topPairs,
      insights,
      // Return raw values per numeric column for client-side charting
      chartData: parsed.headers.reduce((acc, h) => {
        if (analyzer.types[h] === 'number') {
          acc[h] = parsed.rows.map(r => parseFloat(r[h])).filter(v => !isNaN(v));
        } else {
          acc[h] = parsed.rows.map(r => r[h]);
        }
        return acc;
      }, {})
    });
  } catch (err) {
    next(err);
  }
});

module.exports = { router, memStore };
