
import { test, expect } from './fixtures/auth';
import path from 'path';

test.describe('Content Upload', () => {
  test('should open upload modal', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/');
    
    // Click upload button
    await authenticatedPage.click('[data-testid="upload-button"]');
    
    // Should show upload options
    await expect(authenticatedPage.locator('[data-testid="upload-modal"]')).toBeVisible();
    await expect(authenticatedPage.locator('[data-testid="upload-clip-option"]')).toBeVisible();
    await expect(authenticatedPage.locator('[data-testid="upload-screenshot-option"]')).toBeVisible();
  });

  test('should navigate to clip upload page', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/');
    
    // Click upload button
    await authenticatedPage.click('[data-testid="upload-button"]');
    
    // Click upload clip option
    await authenticatedPage.click('[data-testid="upload-clip-option"]');
    
    // Should navigate to upload page
    await expect(authenticatedPage).toHaveURL('/upload');
    await expect(authenticatedPage.locator('[data-testid="file-upload-zone"]')).toBeVisible();
  });

  test('should navigate to screenshot upload page', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/');
    
    // Click upload button
    await authenticatedPage.click('[data-testid="upload-button"]');
    
    // Click upload screenshot option
    await authenticatedPage.click('[data-testid="upload-screenshot-option"]');
    
    // Should navigate to screenshot upload page
    await expect(authenticatedPage).toHaveURL('/upload/screenshot');
    await expect(authenticatedPage.locator('[data-testid="screenshot-upload-zone"]')).toBeVisible();
  });

  test('should show game selection', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/upload');
    
    // Click game selector
    await authenticatedPage.click('[data-testid="game-selector"]');
    
    // Should show game search
    await expect(authenticatedPage.locator('[data-testid="game-search"]')).toBeVisible();
    
    // Search for a game
    await authenticatedPage.fill('[data-testid="game-search-input"]', 'Fortnite');
    
    // Should show search results
    await expect(authenticatedPage.locator('[data-testid="game-search-results"]')).toBeVisible();
  });
});
