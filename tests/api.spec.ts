
import { test, expect } from '@playwright/test';

test.describe('API Endpoints', () => {
  test('should return health check', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.status).toBe('healthy');
  });

  test('should get trending games', async ({ request }) => {
    const response = await request.get('/api/games/trending');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(Array.isArray(data)).toBeTruthy();
  });

  test('should get latest clips', async ({ request }) => {
    const response = await request.get('/api/clips');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(Array.isArray(data)).toBeTruthy();
  });

  test('should require authentication for protected routes', async ({ request }) => {
    const response = await request.get('/api/user');
    expect(response.status()).toBe(401);
    
    const data = await response.json();
    expect(data.message).toBe('Not authenticated');
  });

  test('should validate input on registration', async ({ request }) => {
    const response = await request.post('/api/register', {
      data: {
        username: '', // Invalid: empty
        email: 'invalid-email', // Invalid: format
        password: '123' // Invalid: too short
      }
    });
    
    expect(response.status()).toBe(400);
  });
});
