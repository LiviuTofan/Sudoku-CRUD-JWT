import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'sudoku_secret_key_2024';

/**
 * Middleware to verify JWT token
 */
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      error: 'Access token required',
      message: 'Please provide a valid JWT token in Authorization header'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          error: 'Token expired',
          message: 'Your session has expired. Please get a new token.'
        });
      }
      return res.status(403).json({ 
        error: 'Invalid token',
        message: 'The provided token is invalid.'
      });
    }

    req.user = decoded;
    next();
  });
};

/**
 * Middleware to check specific permissions
 */
export const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Please authenticate first'
      });
    }

    const userPermissions = req.user.permissions || [];
    
    if (!userPermissions.includes(permission)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        message: `This operation requires '${permission}' permission`,
        required: permission,
        current: userPermissions
      });
    }

    next();
  };
};

/**
 * Middleware to check specific role
 */
export const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Please authenticate first'
      });
    }

    if (req.user.role !== role) {
      return res.status(403).json({ 
        error: 'Insufficient role',
        message: `This operation requires '${role}' role`,
        required: role,
        current: req.user.role
      });
    }

    next();
  };
};