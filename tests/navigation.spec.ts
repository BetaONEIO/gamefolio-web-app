
import { test, expect } from './fixtures/auth';

test.describe('Navigation', () => {
  test('should navigate through main pages', async ({ page }) => {
    await page.goto('/');
    
    // Check homepage elements
    await expect(page.locator('[data-testid="trending-section"]')).toBeVisible();
    
    // Navigate to explore page
    await page.click('[data-testid="explore-link"]');
    await expect(page).toHaveURL('/explore');
    
    // Navigate to trending page
    await page.click('[data-testid="trending-link"]');
    await expect(page).toHaveURL('/trending');
    
    // Navigate to leaderboard
    await page.click('[data-testid="leaderboard-link"]');
    await expect(page).toHaveURL('/leaderboard');
  });

  test('should show mobile menu on small screens', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Mobile menu button should be visible
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
    
    // Click to open menu
    await page.click('[data-testid="mobile-menu-button"]');
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
  });

  test('should search for content', async ({ page }) => {
    await page.goto('/');
    
    // Open search
    await page.click('[data-testid="search-button"]');
    await expect(page.locator('[data-testid="search-input"]')).toBeVisible();
    
    // Search for clips
    await page.fill('[data-testid="search-input"]', 'gaming');
    await page.press('[data-testid="search-input"]', 'Enter');
    
    // Should show search results
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
  });
});
