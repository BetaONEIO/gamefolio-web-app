
import { test, expect } from './fixtures/auth';

test.describe('Content Interaction', () => {
  test('should view clip details', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/');
    
    // Wait for clips to load
    await authenticatedPage.waitForSelector('[data-testid="video-clip-card"]');
    
    // Click on first clip
    await authenticatedPage.click('[data-testid="video-clip-card"]');
    
    // Should open clip dialog
    await expect(authenticatedPage.locator('[data-testid="clip-dialog"]')).toBeVisible();
    await expect(authenticatedPage.locator('[data-testid="video-player"]')).toBeVisible();
  });

  test('should like a clip', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/');
    
    // Wait for clips to load
    await authenticatedPage.waitForSelector('[data-testid="video-clip-card"]');
    
    // Click on first clip
    await authenticatedPage.click('[data-testid="video-clip-card"]');
    
    // Wait for clip dialog
    await expect(authenticatedPage.locator('[data-testid="clip-dialog"]')).toBeVisible();
    
    // Click like button
    await authenticatedPage.click('[data-testid="like-button"]');
    
    // Should show liked state
    await expect(authenticatedPage.locator('[data-testid="like-button"][data-liked="true"]')).toBeVisible();
  });

  test('should add comment to clip', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/');
    
    // Wait for clips to load
    await authenticatedPage.waitForSelector('[data-testid="video-clip-card"]');
    
    // Click on first clip
    await authenticatedPage.click('[data-testid="video-clip-card"]');
    
    // Wait for clip dialog
    await expect(authenticatedPage.locator('[data-testid="clip-dialog"]')).toBeVisible();
    
    // Add comment
    const commentText = 'Great clip! Amazing gameplay.';
    await authenticatedPage.fill('[data-testid="comment-input"]', commentText);
    await authenticatedPage.click('[data-testid="comment-submit"]');
    
    // Should show the comment
    await expect(authenticatedPage.locator(`text=${commentText}`)).toBeVisible();
  });

  test('should share clip', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/');
    
    // Wait for clips to load
    await authenticatedPage.waitForSelector('[data-testid="video-clip-card"]');
    
    // Click on first clip
    await authenticatedPage.click('[data-testid="video-clip-card"]');
    
    // Wait for clip dialog
    await expect(authenticatedPage.locator('[data-testid="clip-dialog"]')).toBeVisible();
    
    // Click share button
    await authenticatedPage.click('[data-testid="share-button"]');
    
    // Should show share dialog
    await expect(authenticatedPage.locator('[data-testid="share-dialog"]')).toBeVisible();
    await expect(authenticatedPage.locator('[data-testid="qr-code"]')).toBeVisible();
  });

  test('should view trending games', async ({ page }) => {
    await page.goto('/');
    
    // Wait for trending games section
    await expect(page.locator('[data-testid="trending-games"]')).toBeVisible();
    
    // Click on first game
    await page.click('[data-testid="game-card"]');
    
    // Should navigate to game page
    await expect(page).toHaveURL(/\/games\/\d+/);
    await expect(page.locator('[data-testid="game-clips"]')).toBeVisible();
  });
});
