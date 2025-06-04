const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
require('dotenv').config();

const db = require('./database/config');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const puzzleRoutes = require('./routes/puzzles');
const app = express();
const PORT = process.env.PORT || 3000;

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again later.'
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Swagger configuration
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Sudoku Game API',
            version: '1.0.0',
            description: 'A comprehensive Sudoku game API with authentication and puzzle management',
        },
        servers: [
            {
                url: `http://localhost:${PORT}`,
                description: 'Development server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
    },
    apis: ['./routes/*.js', './server.js'],
};

const specs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     responses:
 *       200:
 *         description: Server is healthy
 */
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/puzzles', puzzleRoutes);

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Welcome to Sudoku Game API',
        version: '1.0.0',
        documentation: '/api-docs',
        endpoints: {
            health: '/health',
            auth: '/api/auth',
            puzzles: '/api/puzzles',
        }
    });
});

app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        path: req.originalUrl,
        method: req.method
    });
});

// Initialize database and start server
async function startServer() {
    try {
        await db.connect();
        const initDatabase = require('./scripts/initDatabase');
        await initDatabase();
        
        console.log('Database connected and initialized successfully');
        
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
            console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

process.on('SIGINT', () => {
    console.log('\n Shutting down server...');
    db.close();
    process.exit(0);
});

startServer();

module.exports = app;