const { test, expect } = require('@playwright/test');

test.describe('Desktop Upload Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Login as test user for upload testing
    await page.fill('[data-testid="input-username"]', 'testuser');
    await page.fill('[data-testid="input-password"]', 'testpass');
    await page.click('[data-testid="button-login"]');
    await page.waitForLoadState('networkidle');
  });

  test('should validate file types on desktop upload', async ({ page }) => {
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.click('[data-testid="button-upload"]')
    ]);

    // Test invalid file type
    await fileChooser.setFiles([{
      name: 'invalid.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('not a video file')
    }]);

    await expect(page.locator('[data-testid="error-message"]')).toContainText('Please select a valid video file');
  });

  test('should validate file size limits', async ({ page }) => {
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.click('[data-testid="button-upload"]')
    ]);

    // Create large file buffer (100MB)
    const largeBuffer = Buffer.alloc(100 * 1024 * 1024);
    
    await fileChooser.setFiles([{
      name: 'large.mp4',
      mimeType: 'video/mp4',
      buffer: largeBuffer
    }]);

    await expect(page.locator('[data-testid="error-message"]')).toContainText('File size must be less than');
  });

  test('should handle upload progress and completion', async ({ page }) => {
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.click('[data-testid="button-upload"]')
    ]);

    // Small valid video file
    const smallBuffer = Buffer.alloc(1024);
    
    await fileChooser.setFiles([{
      name: 'test.mp4',
      mimeType: 'video/mp4',
      buffer: smallBuffer
    }]);

    // Check progress indicator appears
    await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible();
    
    // Wait for completion
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({ timeout: 10000 });
  });

  test('should handle network errors during upload', async ({ page }) => {
    // Intercept upload request and force failure
    await page.route('/api/clips/upload', route => route.abort());

    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.click('[data-testid="button-upload"]')
    ]);

    const smallBuffer = Buffer.alloc(1024);
    await fileChooser.setFiles([{
      name: 'test.mp4',
      mimeType: 'video/mp4',
      buffer: smallBuffer
    }]);

    await expect(page.locator('[data-testid="error-network"]')).toContainText('Upload failed');
  });

  test('should validate video metadata requirements', async ({ page }) => {
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.click('[data-testid="button-upload"]')
    ]);

    // Mock corrupted video file
    await fileChooser.setFiles([{
      name: 'corrupted.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.from('corrupted video data')
    }]);

    await expect(page.locator('[data-testid="error-metadata"]')).toContainText('Invalid video format');
  });

  test('should support drag and drop upload', async ({ page }) => {
    const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
    
    await page.locator('[data-testid="drop-zone"]').dispatchEvent('dragover', { dataTransfer });
    await expect(page.locator('[data-testid="drop-zone"]')).toHaveClass(/drag-over/);
    
    await page.locator('[data-testid="drop-zone"]').dispatchEvent('drop', { dataTransfer });
    await expect(page.locator('[data-testid="upload-dialog"]')).toBeVisible();
  });
});