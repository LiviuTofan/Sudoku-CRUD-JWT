// Global test setup
process.env.NODE_ENV = 'test';

// Handle unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
    console.log('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Set default test timeout
jest.setTimeout(10000);