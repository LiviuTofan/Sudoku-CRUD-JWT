const JWTUtils = require('../utils/jwt');
const { PermissionManager, PERMISSIONS } = require('../config/permissions');
const User = require('../models/User');

// JWT Authentication Middleware
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ 
            error: 'Access token required',
            code: 'TOKEN_REQUIRED'
        });
    }

    try {
        const decoded = JWTUtils.verify(token);
        
        // Optionally verify user still exists in database
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ 
                error: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }

        req.user = {
            id: decoded.id,
            username: decoded.username,
            role: decoded.role
        };
        
        next();
    } catch (error) {
        return res.status(403).json({ 
            error: error.message,
            code: 'TOKEN_INVALID'
        });
    }
};

// Optional Authentication (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        req.user = { role: 'visitor' }; // Set as visitor if no token
        return next();
    }

    try {
        const decoded = JWTUtils.verify(token);
        const user = await User.findById(decoded.id);
        
        req.user = user ? {
            id: decoded.id,
            username: decoded.username,
            role: decoded.role
        } : { role: 'visitor' };
        
    } catch (error) {
        req.user = { role: 'visitor' }; // Set as visitor if invalid token
    }
    
    next();
};

// Permission checking middleware
const requirePermission = (permission, resource = null) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                error: 'Authentication required',
                code: 'AUTH_REQUIRED'
            });
        }

        const hasPermission = PermissionManager.hasPermission(
            req.user.role, 
            permission, 
            resource
        );

        if (!hasPermission) {
            return res.status(403).json({ 
                error: 'Insufficient permissions',
                code: 'INSUFFICIENT_PERMISSIONS',
                required: permission,
                userRole: req.user.role
            });
        }

        next();
    };
};

// Role checking middleware
const requireRole = (roles) => {
    const roleArray = Array.isArray(roles) ? roles : [roles];
    
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                error: 'Authentication required',
                code: 'AUTH_REQUIRED'
            });
        }

        if (!roleArray.includes(req.user.role)) {
            return res.status(403).json({ 
                error: 'Insufficient role permissions',
                code: 'INSUFFICIENT_ROLE',
                required: roleArray,
                userRole: req.user.role
            });
        }

        next();
    };
};

// Admin only middleware
const requireAdmin = requireRole('admin');

// User or Admin middleware
const requireUserOrAdmin = requireRole(['user', 'admin']);

module.exports = {
    authenticateToken,
    optionalAuth,
    requirePermission,
    requireRole,
    requireAdmin,
    requireUserOrAdmin
};