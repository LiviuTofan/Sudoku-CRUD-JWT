const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

class JWTUtils {
    static sign(payload) {
        try {
            return jwt.sign(payload, JWT_SECRET, { 
                expiresIn: JWT_EXPIRES_IN,
                issuer: 'sudoku-app'
            });
        } catch (error) {
            throw new Error('Token signing failed');
        }
    }

    static verify(token) {
        try {
            return jwt.verify(token, JWT_SECRET);
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                throw new Error('Token expired');
            } else if (error.name === 'JsonWebTokenError') {
                throw new Error('Invalid token');
            }
            throw new Error('Token verification failed');
        }
    }

    static decode(token) {
        try {
            return jwt.decode(token);
        } catch (error) {
            throw new Error('Token decode failed');
        }
    }

    static generateTokens(user) {
        const payload = {
            id: user.id,
            username: user.username,
            role: user.role
        };

        const accessToken = this.sign(payload);
        
        return {
            accessToken,
            tokenType: 'Bearer',
            expiresIn: JWT_EXPIRES_IN
        };
    }
}

module.exports = JWTUtils;