process.env.NODE_ENV = 'test';
process.env.PORT = '3000';
process.env.JWT_SECRET = 'test-jwt-secret-key-at-least-32-chars-long';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/cevicheria_test';
process.env.JWT_EXPIRES_IN = '8h';
process.env.CORS_ORIGIN = 'http://localhost:5173';
