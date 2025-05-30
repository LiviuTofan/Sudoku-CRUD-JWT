const JWTUtils = require('../utils/jwt');
const User = require('../models/User');

// Simple token authentication
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ 
            error: 'Access token required'
        });
    }

    try {
        const decoded = JWTUtils.verify(token);
        
        // Check if user still exists
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ 
                error: 'User not found'
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
            error: 'Invalid token'
        });
    }
};

// Simple admin check
const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }

    next();
};

module.exports = {
    authenticateToken,
    requireAdmin
};
