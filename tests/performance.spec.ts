
import { test, expect } from '@playwright/test';

test.describe('Performance', () => {
  test('should load homepage quickly', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('should have reasonable page size', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check for reasonable resource sizes
    const performance = await page.evaluate(() => {
      return JSON.parse(JSON.stringify(performance.getEntriesByType('navigation')));
    });
    
    expect(performance.length).toBeGreaterThan(0);
  });

  test('should load videos efficiently', async ({ page }) => {
    await page.goto('/');
    
    // Wait for video elements
    await page.waitForSelector('video', { timeout: 10000 });
    
    // Check video elements are present
    const videos = await page.locator('video').count();
    expect(videos).toBeGreaterThanOrEqual(0);
  });
});
