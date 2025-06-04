const request = require('supertest');
const db = require('../database/config');
const initDatabase = require('../scripts/initDatabase');

let app;
let server;

describe('Authentication Endpoints', () => {
    beforeAll(async () => {
        jest.setTimeout(10000);
        await db.connect();

        try {
            await db.run('DROP TABLE IF EXISTS users');
            await db.run('DROP TABLE IF EXISTS puzzles');
        } catch (err) {
            console.log('Tables did not exist, continuing...');
        }
        
        await initDatabase();

        app = require('../server');
        
        if (app && typeof app.listen === 'function') {
            server = app;
        } else if (app && app.server) {
            server = app.server;
        }
    }, 15000);

    afterAll(async () => {
        if (server) {
            try {
                if (typeof server.close === 'function') {
                    await new Promise((resolve, reject) => {
                        const timeout = setTimeout(() => {
                            reject(new Error('Server close timeout'));
                        }, 3000);
                        
                        server.close((err) => {
                            clearTimeout(timeout);
                            if (err) reject(err);
                            else resolve();
                        });
                    });
                }
            } catch (error) {
                console.log('Error closing server:', error.message);
            }
        }
        
        if (db && db.db) {
            try {
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        resolve();
                    }, 2000);
                    
                    db.close((err) => {
                        clearTimeout(timeout);
                        if (err) {
                            console.log('Database close error:', err);
                        }
                        resolve();
                    });
                });
            } catch (error) {
                console.log('Error closing database:', error.message);
            }
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
    }, 10000);

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
                username: 'ab',
                password: '123'
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