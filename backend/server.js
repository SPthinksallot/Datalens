// ============================================================
// Unit 4: Node.js + Express — Main Server Entry Point
// Covers: Express setup, middleware, routing, HTTP methods,
//         built-in modules (path, os, events), nodemon
// ============================================================

const express    = require('express');
const cors       = require('cors');
const path       = require('path');          // Unit 4: built-in path module
const os         = require('os');            // Unit 4: built-in os module
const { EventEmitter } = require('events'); // Unit 4: Node.js EventEmitter

const app  = express();
const PORT = process.env.PORT || 5000;

// Export early to resolve circular dependencies in routes
module.exports = app;

// ─── Unit 4: Node.js EventEmitter ────────────────────────────
const appEvents = new EventEmitter();
appEvents.on('file:uploaded', (info) => {
  console.log(`[EVENT] File uploaded: ${info.filename} (${info.size} bytes)`);
});
appEvents.on('analysis:done', (info) => {
  console.log(`[EVENT] Analysis complete for session: ${info.sessionId}`);
});
module.exports.appEvents = appEvents;       // shared across routes

const analyzeRouter  = require('./routes/analyze').router;
const historyRouter  = require('./routes/history');
const uploadRouter   = require('./routes/upload');
const chatRouter     = require('./routes/chat');
const errorHandler   = require('./middleware/errorHandler');
const requestLogger  = require('./middleware/requestLogger');
const connectDB      = require('./models/db');

// ─── Unit 4: Middleware stack ─────────────────────────────────
app.use(cors({ origin: '*' }));             // allow frontend dev server
app.use(express.json());                    // parse JSON bodies
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);                     // custom middleware (see middleware/)

// ─── Unit 1+4: Serve static frontend files ───────────────────
app.use(express.static(path.join(__dirname, '../frontend/public')));

// ─── Unit 4: Routes ───────────────────────────────────────────
// HTTP Methods: POST (upload/analyze), GET (history), DELETE (history)
app.use('/api/upload',   uploadRouter);
app.use('/api/analyze',  analyzeRouter);
app.use('/api/history',  historyRouter);
app.use('/api/chat',     chatRouter);

// Health check endpoint — GET /api/health
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime:  Math.floor(process.uptime()),
    memory:  os.freemem(),          // Unit 4: os module
    platform: os.platform(),
    nodeVersion: process.version,
    timestamp: new Date().toISOString()
  });
});

// ─── Unit 1+4: Catch-all — serve index.html for SPA routing ──
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});

// ─── Unit 4: Custom error handling middleware ─────────────────
app.use(errorHandler);

// ─── Start server + connect DB ────────────────────────────────
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🔬 DataLens backend running on http://localhost:${PORT}`);
    console.log(`   Platform : ${os.platform()} | CPUs: ${os.cpus().length}`);
    console.log(`   Node     : ${process.version}`);
    console.log(`   Env      : ${process.env.NODE_ENV || 'development'}\n`);
  });
});

// module.exports = app; // previously exported here, now exported early
