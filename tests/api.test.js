const request = require('supertest');
const app = require('../src/server');

describe('ZOT-DGA API', () => {
  describe('Health Check', () => {
    test('GET /health should return 200', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('API Documentation', () => {
    test('GET /api/docs should return API documentation', async () => {
      const response = await request(app)
        .get('/api/docs')
        .expect(200);

      expect(response.body).toHaveProperty('name', 'ZOT-DGA Image Library API');
      expect(response.body).toHaveProperty('endpoints');
    });
  });

  describe('Root Endpoint', () => {
    test('GET / should return welcome message', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Welcome to ZOT-DGA Image Library API');
    });
  });

  describe('404 Handler', () => {
    test('GET /nonexistent should return 404', async () => {
      const response = await request(app)
        .get('/nonexistent')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Endpoint not found');
    });
  });
});

describe('Authentication', () => {
  describe('POST /api/auth/register', () => {
    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation error');
    });

    test('should validate email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'password123',
          name: 'Test User'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation error');
    });

    test('should validate password length', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: '123',
          name: 'Test User'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation error');
    });
  });

  describe('POST /api/auth/login', () => {
    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation error');
    });
  });
});

describe('Protected Routes', () => {
  describe('File Upload', () => {
    test('POST /api/upload/image should require API key', async () => {
      const response = await request(app)
        .post('/api/upload/image')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'API key required');
    });
  });

  describe('File Management', () => {
    test('GET /api/files should require API key', async () => {
      const response = await request(app)
        .get('/api/files')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'API key required');
    });
  });

  describe('Folder Management', () => {
    test('GET /api/folders should require API key', async () => {
      const response = await request(app)
        .get('/api/folders')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'API key required');
    });
  });

  describe('Image Processing', () => {
    test('GET /api/process/info/1 should require API key', async () => {
      const response = await request(app)
        .get('/api/process/info/1')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'API key required');
    });
  });
});
