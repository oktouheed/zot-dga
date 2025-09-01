const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Multer errors (file upload)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      error: 'File too large',
      message: `File size exceeds limit of ${process.env.MAX_FILE_SIZE || '50MB'}`
    });
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      error: 'Too many files',
      message: 'Maximum number of files exceeded'
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      error: 'Unexpected file field',
      message: 'Unexpected file field in upload'
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token',
      message: 'The provided token is invalid'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expired',
      message: 'The provided token has expired'
    });
  }

  // Validation errors (Joi)
  if (err.isJoi) {
    return res.status(400).json({
      error: 'Validation error',
      message: err.details[0].message
    });
  }

  // Database errors
  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return res.status(400).json({
      error: 'Duplicate entry',
      message: 'A record with this information already exists'
    });
  }

  // File system errors
  if (err.code === 'ENOENT') {
    return res.status(404).json({
      error: 'File not found',
      message: 'The requested file could not be found'
    });
  }

  if (err.code === 'EACCES') {
    return res.status(500).json({
      error: 'Permission denied',
      message: 'Unable to access file due to permissions'
    });
  }

  // Image processing errors (Sharp)
  if (err.message && err.message.includes('Input file is missing')) {
    return res.status(404).json({
      error: 'File not found',
      message: 'The image file could not be found'
    });
  }

  if (err.message && err.message.includes('Input file contains unsupported image format')) {
    return res.status(400).json({
      error: 'Unsupported format',
      message: 'The image format is not supported'
    });
  }

  // Default error
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    error: statusCode >= 500 ? 'Internal server error' : message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
