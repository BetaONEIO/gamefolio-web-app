const { test, expect } = require('@playwright/test');

test.describe('CORS Configuration Tests', () => {
  test('should allow requests from replit.app domains', async ({ request }) => {
    const response = await request.get('/api/health', {
      headers: {
        'Origin': 'https://example.replit.app'
      }
    });
    
    expect(response.headers()['access-control-allow-origin']).toBe('https://example.replit.app');
    expect(response.headers()['access-control-allow-credentials']).toBe('true');
  });

  test('should allow requests from localhost', async ({ request }) => {
    const response = await request.get('/api/health', {
      headers: {
        'Origin': 'http://localhost:3000'
      }
    });
    
    expect(response.headers()['access-control-allow-origin']).toBe('http://localhost:3000');
  });

  test('should reject requests from unauthorized origins', async ({ request }) => {
    const response = await request.get('/api/health', {
      headers: {
        'Origin': 'https://malicious-site.com'
      }
    });
    
    expect(response.headers()['access-control-allow-origin']).toBeUndefined();
  });

  test('should handle preflight OPTIONS requests', async ({ request }) => {
    const response = await request.fetch('/api/clips', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://example.replit.app',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });
    
    expect(response.status()).toBe(200);
    expect(response.headers()['access-control-allow-methods']).toContain('POST');
    expect(response.headers()['access-control-allow-headers']).toContain('Content-Type');
  });

  test('should expose TUS upload headers', async ({ request }) => {
    const response = await request.get('/api/health', {
      headers: {
        'Origin': 'https://example.replit.app'
      }
    });
    
    const exposedHeaders = response.headers()['access-control-expose-headers'];
    expect(exposedHeaders).toContain('Upload-Offset');
    expect(exposedHeaders).toContain('Upload-Length');
    expect(exposedHeaders).toContain('Tus-Resumable');
  });

  test('should support credential-included requests', async ({ request }) => {
    const response = await request.get('/api/auth/me', {
      headers: {
        'Origin': 'https://example.replit.app',
        'Cookie': 'session=test-session'
      }
    });
    
    expect(response.headers()['access-control-allow-credentials']).toBe('true');
  });

  test('should handle upload-specific CORS headers', async ({ request }) => {
    const response = await request.fetch('/api/clips/upload', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://example.replit.app',
        'Access-Control-Request-Headers': 'Upload-Type, Upload-Length, Upload-Metadata'
      }
    });
    
    const allowedHeaders = response.headers()['access-control-allow-headers'];
    expect(allowedHeaders).toContain('Upload-Type');
    expect(allowedHeaders).toContain('Upload-Length');
    expect(allowedHeaders).toContain('Upload-Metadata');
  });
});