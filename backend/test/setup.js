process.env.NODE_ENV = 'test';

process.on('unhandledRejection', (reason, promise) => {
    console.log('Unhandled Rejection at:', promise, 'reason:', reason);
});

jest.setTimeout(10000);