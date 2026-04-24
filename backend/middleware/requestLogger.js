// ============================================================
// Unit 4: Custom Express Middleware — Request Logger
// Covers: middleware signature (req, res, next), HTTP info
// ============================================================

function requestLogger(req, res, next) {
  const start = Date.now();

  // Hook into response finish to log duration
  res.on('finish', () => {
    const ms = Date.now() - start;
    const status = res.statusCode;
    const color = status >= 500 ? '\x1b[31m' : status >= 400 ? '\x1b[33m' : '\x1b[32m';
    const reset = '\x1b[0m';
    console.log(
      `${color}[${new Date().toISOString()}] ${req.method} ${req.url} → ${status} (${ms}ms)${reset}`
    );
  });

  next(); // Unit 4: always call next() in middleware
}

module.exports = requestLogger;
