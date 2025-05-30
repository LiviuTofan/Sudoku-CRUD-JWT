const errorHandler = (err, req, res, next) => {
  console.error('Error Stack:', err.stack);
  
  // Default error
  let error = {
      message: err.message || 'Internal Server Error',
      status: err.status || 500
  };

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
      error = {
          message: 'Invalid token',
          status: 401
      };
  }

  if (err.name === 'TokenExpiredError') {
      error = {
          message: 'Token expired',
          status: 401
      };
  }

  // Validation errors
  if (err.name === 'ValidationError') {
      error = {
          message: 'Validation Error',
          status: 400,
          details: err.details
      };
  }

  // SQLite errors
  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      error = {
          message: 'Resource already exists',
          status: 409
      };
  }

  // Rate limit errors
  if (err.status === 429) {
      error = {
          message: 'Too many requests',
          status: 429
      };
  }

  // Send error response
  res.status(error.status).json({
      error: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
      ...(error.details && { details: error.details })
  });
};

module.exports = errorHandler;