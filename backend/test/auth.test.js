const request = require('supertest');
const db = require('../database/config');
const initDatabase = require('../scripts/initDatabase');

// Import app after database setup
let app;
let server;

describe('Authentication Endpoints', () => {
    beforeAll(async () => {
        await db.connect();
        
        // Clear existing tables and recreate
        try {
            await db.run('DROP TABLE IF EXISTS users');
            await db.run('DROP TABLE IF EXISTS puzzles');
        } catch (err) {
            // Tables might not exist, that's ok
        }
        
        await initDatabase();
        
        // Import app after database is ready
        app = require('../server');
        
        // If server is exported as a server instance, store it
        if (app && app.listening) {
            server = app;
        }
    });

    afterAll(async () => {
        // Close server first
        if (server && server.close) {
            await new Promise((resolve) => {
                server.close(resolve);
            });
        }
        
        // Close database connection
        if (db.db) {
            await new Promise((resolve) => {
                db.close(() => {
                    resolve();
                });
            });
        }
        
        // Give a small delay to ensure all connections are closed
        await new Promise(resolve => setTimeout(resolve, 100));
    });

    describe('POST /auth/register', () => {
        test('Should register a new user successfully', async () => {
            const userData = {
                username: 'testuser1',
                password: 'password123'
            };

            const response = await request(app)
                .post('/auth/register')
                .send(userData)
                .expect(201);

            expect(response.body).toHaveProperty('message', 'User registered successfully');
            expect(response.body).toHaveProperty('accessToken');
            expect(response.body.user).toHaveProperty('username', 'testuser1');
            expect(response.body.user).toHaveProperty('role', 'user');
        });

        test('Should fail with duplicate username', async () => {
            const userData = {
                username: 'testuser1',
                password: 'password123'
            };

            const response = await request(app)
                .post('/auth/register')
                .send(userData)
                .expect(409);

            expect(response.body).toHaveProperty('code', 'USERNAME_EXISTS');
        });

        test('Should fail with invalid data', async () => {
            const userData = {
                username: 'ab', // Too short
                password: '123'  // Too short
            };

            const response = await request(app)
                .post('/auth/register')
                .send(userData)
                .expect(400);

            expect(response.body).toHaveProperty('error', 'Validation failed');
        });
    });

    describe('POST /auth/login', () => {
        test('Should login successfully', async () => {
            const credentials = {
                username: 'testuser1',
                password: 'password123'
            };

            const response = await request(app)
                .post('/auth/login')
                .send(credentials)
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Login successful');
            expect(response.body).toHaveProperty('accessToken');
            expect(response.body.user).toHaveProperty('username', 'testuser1');
        });

        test('Should fail with wrong credentials', async () => {
            const credentials = {
                username: 'testuser1',
                password: 'wrongpassword'
            };

            const response = await request(app)
                .post('/auth/login')
                .send(credentials)
                .expect(401);

            expect(response.body).toHaveProperty('code', 'INVALID_CREDENTIALS');
        });
    });

    describe('GET /auth/me', () => {
        let authToken;

        beforeAll(async () => {
            const loginResponse = await request(app)
                .post('/auth/login')
                .send({
                    username: 'testuser1',
                    password: 'password123'
                });
            
            authToken = loginResponse.body.accessToken;
        });

        test('Should get user info with valid token', async () => {
            const response = await request(app)
                .get('/auth/me')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.user).toHaveProperty('username', 'testuser1');
            expect(response.body.user).toHaveProperty('role', 'user');
        });

        test('Should fail without token', async () => {
            const response = await request(app)
                .get('/auth/me')
                .expect(401);
                
            expect(response.body).toHaveProperty('code', 'TOKEN_REQUIRED');
        });
    });

    describe('POST /auth/token/verify', () => {
        let authToken;

        beforeAll(async () => {
            const loginResponse = await request(app)
                .post('/auth/login')
                .send({
                    username: 'testuser1',
                    password: 'password123'
                });
            
            authToken = loginResponse.body.accessToken;
        });

        test('Should verify valid token', async () => {
            const response = await request(app)
                .post('/auth/token/verify')
                .send({ token: authToken })
                .expect(200);

            expect(response.body).toHaveProperty('valid', true);
            expect(response.body.decoded).toHaveProperty('username', 'testuser1');
        });

        test('Should fail with invalid token', async () => {
            const response = await request(app)
                .post('/auth/token/verify')
                .send({ token: 'invalid-token' })
                .expect(401);

            expect(response.body).toHaveProperty('valid', false);
        });
    });
});