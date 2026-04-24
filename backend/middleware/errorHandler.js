// ============================================================
// Unit 4: Error Handling Middleware
// Covers: 4-arg middleware signature, HTTP status codes
// ============================================================

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error(`[ERROR] ${err.message}`);

  // Multer file size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: 'File too large',
      message: 'Maximum file size is 50MB',
      statusCode: 413   // Unit 1: HTTP Status Codes
    });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: err.message,
      statusCode: 400
    });
  }

  // Default 500
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'Something went wrong',
    statusCode: 500
  });
}

module.exports = errorHandler;
