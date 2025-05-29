/**
 * Global error handling middleware
 */
const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);
  
    // Default error
    let error = {
      message: err.message || 'Internal Server Error',
      status: err.status || 500
    };
  
    // Mongoose/Database errors
    if (err.name === 'ValidationError') {
      error.message = Object.values(err.errors).map(val => val.message).join(', ');
      error.status = 400;
    }
  
    // JWT errors
    if (err.name === 'JsonWebTokenError') {
      error.message = 'Invalid token';
      error.status = 401;
    }
  
    if (err.name === 'TokenExpiredError') {
      error.message = 'Token expired';
      error.status = 401;
    }
  
    // Duplicate key error
    if (err.code === 11000) {
      error.message = 'Duplicate field value entered';
      error.status = 400;
    }
  
    // Cast error
    if (err.name === 'CastError') {
      error.message = 'Resource not found';
      error.status = 404;
    }
  
    res.status(error.status).json({
      success: false,
      error: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  };
  
  export default errorHandler;