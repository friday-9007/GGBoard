/**
 * Global Error Handler Middleware
 * Catches unhandled errors and returns consistent JSON responses.
 */

function errorHandler(err, req, res, next) {
  console.error('❌ Error:', err.message);
  console.error(err.stack);

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: err.message
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required.'
    });
  }

  // Prisma known request errors
  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'Conflict', message: 'A record with this value already exists.' });
  }
  if (err.code === 'P2003') {
    return res.status(400).json({ error: 'Bad Request', message: 'Referenced record does not exist.' });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Not Found', message: 'Record not found.' });
  }

  // Default server error
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production'
      ? 'Something went wrong.'
      : err.message
  });
}

module.exports = errorHandler;
