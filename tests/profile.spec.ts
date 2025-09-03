
import { test, expect } from './fixtures/auth';

test.describe('User Profile', () => {
  test('should view user profile', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/profile/demo');
    
    // Should show profile elements
    await expect(authenticatedPage.locator('[data-testid="profile-header"]')).toBeVisible();
    await expect(authenticatedPage.locator('[data-testid="profile-avatar"]')).toBeVisible();
    await expect(authenticatedPage.locator('[data-testid="profile-stats"]')).toBeVisible();
  });

  test('should edit own profile', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/profile/demo');
    
    // Click edit profile button
    await authenticatedPage.click('[data-testid="edit-profile-button"]');
    
    // Should open edit dialog
    await expect(authenticatedPage.locator('[data-testid="edit-profile-dialog"]')).toBeVisible();
    
    // Update display name
    const newDisplayName = 'Updated Demo User';
    await authenticatedPage.fill('[data-testid="display-name-input"]', newDisplayName);
    
    // Save changes
    await authenticatedPage.click('[data-testid="save-profile-button"]');
    
    // Should show updated name
    await expect(authenticatedPage.locator(`text=${newDisplayName}`)).toBeVisible();
  });

  test('should follow/unfollow user', async ({ authenticatedPage }) => {
    // Navigate to a different user's profile
    await authenticatedPage.goto('/profile/mod_tom');
    
    // Click follow button
    await authenticatedPage.click('[data-testid="follow-button"]');
    
    // Should show following state
    await expect(authenticatedPage.locator('[data-testid="follow-button"][data-following="true"]')).toBeVisible();
    
    // Click unfollow
    await authenticatedPage.click('[data-testid="follow-button"]');
    
    // Should show follow state again
    await expect(authenticatedPage.locator('[data-testid="follow-button"][data-following="false"]')).toBeVisible();
  });

  test('should view user clips', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/profile/demo');
    
    // Switch to clips tab
    await authenticatedPage.click('[data-testid="clips-tab"]');
    
    // Should show user clips
    await expect(authenticatedPage.locator('[data-testid="user-clips"]')).toBeVisible();
  });

  test('should view user favorite games', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/profile/demo');
    
    // Switch to games tab
    await authenticatedPage.click('[data-testid="games-tab"]');
    
    // Should show favorite games
    await expect(authenticatedPage.locator('[data-testid="favorite-games"]')).toBeVisible();
  });
});
