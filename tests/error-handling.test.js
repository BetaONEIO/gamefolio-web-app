const { test, expect } = require('@playwright/test');

test.describe('Error Handling and Edge Cases', () => {
  test('should handle database connection failures gracefully', async ({ page }) => {
    // Mock database error
    await page.route('/api/**', route => {
      if (route.request().method() !== 'GET') {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Database connection failed' })
        });
      } else {
        route.continue();
      }
    });

    await page.goto('/');
    await expect(page.locator('[data-testid="error-database"]')).toContainText('Unable to connect');
  });

  test('should validate input sanitization', async ({ page }) => {
    await page.goto('/auth');
    
    // Test XSS prevention
    await page.fill('[data-testid="input-username"]', '<script>alert("xss")</script>');
    await page.fill('[data-testid="input-password"]', 'password');
    await page.click('[data-testid="button-register"]');
    
    // Should not execute script, should show validation error
    await expect(page.locator('[data-testid="error-validation"]')).toBeVisible();
    
    // Check that script was not executed
    const alerts = [];
    page.on('dialog', dialog => {
      alerts.push(dialog.message());
      dialog.dismiss();
    });
    
    expect(alerts).toHaveLength(0);
  });

  test('should handle malformed API responses', async ({ page }) => {
    await page.route('/api/clips/trending', route => {
      route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json {'
      });
    });

    await page.goto('/');
    await expect(page.locator('[data-testid="error-parse"]')).toContainText('Unable to load content');
  });

  test('should handle rate limiting', async ({ page }) => {
    await page.route('/api/**', route => {
      route.fulfill({
        status: 429,
        headers: { 'Retry-After': '60' },
        body: JSON.stringify({ error: 'Rate limit exceeded' })
      });
    });

    await page.goto('/');
    await expect(page.locator('[data-testid="error-rate-limit"]')).toContainText('Too many requests');
  });

  test('should validate session expiration handling', async ({ page }) => {
    // Login first
    await page.goto('/auth');
    await page.fill('[data-testid="input-username"]', 'testuser');
    await page.fill('[data-testid="input-password"]', 'testpass');
    await page.click('[data-testid="button-login"]');
    await page.waitForURL('/');

    // Mock session expiration
    await page.route('/api/auth/me', route => {
      route.fulfill({
        status: 401,
        body: JSON.stringify({ error: 'Session expired' })
      });
    });

    await page.reload();
    await expect(page).toHaveURL('/auth');
    await expect(page.locator('[data-testid="message-session-expired"]')).toBeVisible();
  });

  test('should handle concurrent upload attempts', async ({ page }) => {
    await page.goto('/');
    
    // Simulate multiple concurrent uploads
    const uploadPromises = [];
    for (let i = 0; i < 3; i++) {
      uploadPromises.push(
        page.locator('[data-testid="button-upload"]').click()
      );
    }
    
    await Promise.all(uploadPromises);
    
    // Should show only one upload dialog or queue message
    const uploadDialogs = page.locator('[data-testid="upload-dialog"]');
    await expect(uploadDialogs).toHaveCount(1);
  });

  test('should validate memory leak prevention', async ({ page }) => {
    await page.goto('/');
    
    // Navigate through multiple pages rapidly
    for (let i = 0; i < 10; i++) {
      await page.click('[data-testid="link-explore"]');
      await page.waitForLoadState('networkidle');
      await page.click('[data-testid="link-home"]');
      await page.waitForLoadState('networkidle');
    }
    
    // Check that page is still responsive
    await expect(page.locator('[data-testid="text-trending"]')).toBeVisible();
  });

  test('should handle edge case pagination scenarios', async ({ page }) => {
    await page.goto('/');
    
    // Test empty results
    await page.route('/api/clips/trending**', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({ clips: [], pagination: { total: 0, page: 1 } })
      });
    });
    
    await page.reload();
    await expect(page.locator('[data-testid="message-no-content"]')).toBeVisible();
    
    // Test single item
    await page.route('/api/clips/trending**', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({ 
          clips: [{ id: 1, title: 'Single Clip' }], 
          pagination: { total: 1, page: 1 } 
        })
      });
    });
    
    await page.reload();
    await expect(page.locator('[data-testid="card-clip-1"]')).toBeVisible();
    await expect(page.locator('[data-testid="button-next-page"]')).not.toBeVisible();
  });
});