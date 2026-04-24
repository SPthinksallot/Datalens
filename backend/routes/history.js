// ============================================================
// Unit 4: Express Route — /api/history
// Covers: GET, DELETE HTTP methods, MongoDB queries,
//         URL parameters, query parameters
// ============================================================

const express  = require('express');
const Analysis = require('../models/Analysis');
const { memStore } = require('./analyze');

const router = express.Router();

// ─── GET /api/history — list all past analyses ───────────────
router.get('/', async (req, res, next) => {
  try {
    // Unit 1: URL query parameters (?limit=20&page=0)
    const limit = parseInt(req.query.limit) || 20;
    const page  = parseInt(req.query.page)  || 0;

    let items;
    try {
      // Unit 4: MongoDB query — sort, skip, limit, projection
      items = await Analysis
        .find({}, {
          sessionId: 1, fileName: 1, fileSize: 1,
          rowCount: 1, colCount: 1, createdAt: 1
        })
        .sort({ createdAt: -1 })
        .skip(page * limit)
        .limit(limit);
    } catch {
      // Fallback to in-memory store
      items = [...memStore.values()]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(page * limit, (page + 1) * limit)
        .map(({ sessionId, fileName, fileSize, rowCount, colCount, createdAt }) =>
          ({ sessionId, fileName, fileSize, rowCount, colCount, createdAt }));
    }

    res.json({ items, page, limit }); // 200 OK (default)
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/history/:sessionId — load a specific analysis ──
router.get('/:sessionId', async (req, res, next) => {
  try {
    // Unit 1: URL parameters
    const { sessionId } = req.params;
    let record;

    try {
      record = await Analysis.findOne({ sessionId });
    } catch {
      record = memStore.get(sessionId);
    }

    if (!record) {
      return res.status(404).json({ error: 'Analysis not found' }); // 404
    }

    res.json(record);
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/history/:sessionId ─────────────────────────
router.delete('/:sessionId', async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    let deleted = false;

    try {
      const result = await Analysis.deleteOne({ sessionId });
      deleted = result.deletedCount > 0;
    } catch {
      deleted = memStore.delete(sessionId);
    }

    if (!deleted) {
      return res.status(404).json({ error: 'Not found' });
    }

    res.json({ deleted: true, sessionId }); // 200 OK
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/history — clear all history ─────────────────
router.delete('/', async (req, res, next) => {
  try {
    try {
      await Analysis.deleteMany({});
    } catch {
      memStore.clear();
    }
    res.json({ deleted: true, message: 'All history cleared' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
