
import { test, expect } from './fixtures/auth';

test.describe('End-to-End User Workflows', () => {
  test('complete user journey: register, upload, interact', async ({ page, testUser }) => {
    // 1. Register new user
    await page.goto('/auth');
    await page.click('[data-testid="register-tab"]');
    
    await page.fill('[data-testid="register-username-input"]', testUser.username);
    await page.fill('[data-testid="register-email-input"]', testUser.email);
    await page.fill('[data-testid="register-password-input"]', testUser.password);
    await page.fill('[data-testid="register-confirm-password-input"]', testUser.password);
    await page.fill('[data-testid="register-display-name-input"]', testUser.displayName);
    
    await page.click('[data-testid="register-button"]');
    
    // 2. Complete onboarding if needed
    // (This would depend on your onboarding flow)
    
    // 3. Browse content
    await page.goto('/');
    await expect(page.locator('[data-testid="trending-section"]')).toBeVisible();
    
    // 4. Interact with content
    await page.waitForSelector('[data-testid="video-clip-card"]');
    await page.click('[data-testid="video-clip-card"]');
    await expect(page.locator('[data-testid="clip-dialog"]')).toBeVisible();
    
    // 5. Like content
    await page.click('[data-testid="like-button"]');
    await expect(page.locator('[data-testid="like-button"][data-liked="true"]')).toBeVisible();
    
    // 6. Navigate to profile
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="profile-link"]');
    await expect(page).toHaveURL(`/profile/${testUser.username}`);
  });

  test('demo user content exploration', async ({ page, demoUser }) => {
    // Login as demo user
    await page.goto('/auth');
    await page.fill('[data-testid="username-input"]', demoUser.username);
    await page.fill('[data-testid="password-input"]', demoUser.password);
    await page.click('[data-testid="login-button"]');
    
    // Explore different sections
    await page.goto('/');
    await expect(page.locator('[data-testid="trending-section"]')).toBeVisible();
    
    // Go to explore page
    await page.click('[data-testid="explore-link"]');
    await expect(page).toHaveURL('/explore');
    
    // Search for content
    await page.click('[data-testid="search-button"]');
    await page.fill('[data-testid="search-input"]', 'gaming');
    await page.press('[data-testid="search-input"]', 'Enter');
    
    // View trending
    await page.click('[data-testid="trending-link"]');
    await expect(page).toHaveURL('/trending');
    
    // Check leaderboard
    await page.click('[data-testid="leaderboard-link"]');
    await expect(page).toHaveURL('/leaderboard');
  });

  test('social interaction workflow', async ({ authenticatedPage }) => {
    // 1. Find another user's profile
    await authenticatedPage.goto('/profile/mod_tom');
    
    // 2. Follow the user
    await authenticatedPage.click('[data-testid="follow-button"]');
    await expect(authenticatedPage.locator('[data-testid="follow-button"][data-following="true"]')).toBeVisible();
    
    // 3. View their content
    await authenticatedPage.click('[data-testid="clips-tab"]');
    await expect(authenticatedPage.locator('[data-testid="user-clips"]')).toBeVisible();
    
    // 4. Interact with their content
    if (await authenticatedPage.locator('[data-testid="video-clip-card"]').count() > 0) {
      await authenticatedPage.click('[data-testid="video-clip-card"]');
      await expect(authenticatedPage.locator('[data-testid="clip-dialog"]')).toBeVisible();
      
      // Like and comment
      await authenticatedPage.click('[data-testid="like-button"]');
      await authenticatedPage.fill('[data-testid="comment-input"]', 'Great content!');
      await authenticatedPage.click('[data-testid="comment-submit"]');
    }
    
    // 5. Check messages (if messaging is enabled)
    await authenticatedPage.goto('/messages');
    await expect(authenticatedPage.locator('[data-testid="conversations-list"]')).toBeVisible();
  });
});
