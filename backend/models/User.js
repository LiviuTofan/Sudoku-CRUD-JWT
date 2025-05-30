const express = require('express');
const User = require('../models/User');
const JWTUtils = require('../utils/jwt');
const { authenticateToken } = require('../middleware/auth');
const { validateRegister, validateLogin, handleValidation } = require('../middleware/validation');

const router = express.Router();

// Register
router.post('/register', validateRegister, handleValidation, async (req, res) => {
    try {
        const { username, password } = req.body;

        // Check if user exists
        const existingUser = await User.findByUsername(username);
        if (existingUser) {
            return res.status(409).json({ error: 'Username already exists' });
        }

        // Create user
        const userId = await User.create({ username, password, role: 'user' });
        const user = await User.findById(userId);

        // Generate token
        const tokens = JWTUtils.generateTokens(user);

        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: user.id,
                username: user.username,
                role: user.role
            },
            ...tokens
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login
router.post('/login', validateLogin, handleValidation, async (req, res) => {
    try {
        const { username, password } = req.body;

        // Find user
        const user = await User.findByUsername(username);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check password
        const isValidPassword = await User.validatePassword(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate token
        const tokens = JWTUtils.generateTokens(user);

        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                username: user.username,
                role: user.role
            },
            ...tokens
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Verify token
router.post('/token/verify', (req, res) => {
    try {
        const { token } = req.body;
        
        if (!token) {
            return res.status(400).json({ error: 'Token is required' });
        }

        const decoded = JWTUtils.verify(token);
        
        res.json({
            valid: true,
            decoded: {
                id: decoded.id,
                username: decoded.username,
                role: decoded.role
            }
        });

    } catch (error) {
        res.status(401).json({ 
            valid: false,
            error: 'Invalid token'
        });
    }
});

module.exports = router;