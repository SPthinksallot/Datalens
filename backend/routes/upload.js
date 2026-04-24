// ============================================================
// Unit 4: Express Route — POST /api/upload
// Covers: multer middleware, fs module, EventEmitter usage
// ============================================================

const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');          // Unit 4: built-in fs module
const { v4: uuidv4 } = require('uuid');
const { appEvents } = require('../server');

const router = express.Router();

// Unit 4: multer — configure disk storage
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename:    (req, file, cb) => {
    const unique = `${uuidv4()}-${file.originalname}`;
    cb(null, unique);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.csv', '.tsv', '.json', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error(`File type not supported. Allowed: ${allowed.join(', ')}`));
  }
});

// POST /api/upload
// Unit 4: route handler, HTTP status codes, JSON response
router.post('/', upload.single('file'), (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' }); // 400 Bad Request
    }

    const sessionId = uuidv4();

    // Unit 4: fs module — read file stats
    const stats = fs.statSync(req.file.path);

    // Unit 4: EventEmitter — emit upload event
    appEvents.emit('file:uploaded', {
      filename: req.file.originalname,
      size:     stats.size,
      sessionId
    });

    // Unit 1: HTTP 201 Created
    res.status(201).json({
      sessionId,
      originalName: req.file.originalname,
      storedName:   req.file.filename,
      size:         stats.size,
      path:         req.file.path,
      uploadedAt:   new Date().toISOString()
    });
  } catch (err) {
    next(err); // pass to error middleware
  }
});

// DELETE /api/upload/:filename — clean up temp file
router.delete('/:filename', (req, res) => {
  const filePath = path.join(uploadDir, req.params.filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    res.json({ deleted: true });
  } else {
    res.status(404).json({ error: 'File not found' }); // 404 Not Found
  }
});

module.exports = router;
