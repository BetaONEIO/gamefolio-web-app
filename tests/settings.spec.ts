
import { test, expect } from './fixtures/auth';

test.describe('Settings', () => {
  test('should access account settings', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/');
    
    // Click user menu
    await authenticatedPage.click('[data-testid="user-menu"]');
    
    // Click settings
    await authenticatedPage.click('[data-testid="settings-link"]');
    
    // Should navigate to settings page
    await expect(authenticatedPage).toHaveURL('/settings');
    await expect(authenticatedPage.locator('[data-testid="settings-tabs"]')).toBeVisible();
  });

  test('should update privacy settings', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/settings');
    
    // Click privacy tab
    await authenticatedPage.click('[data-testid="privacy-tab"]');
    
    // Toggle private profile
    await authenticatedPage.click('[data-testid="private-profile-toggle"]');
    
    // Should show confirmation or update
    await expect(authenticatedPage.locator('[data-testid="settings-saved"]')).toBeVisible();
  });

  test('should update messaging preferences', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/settings');
    
    // Click messaging tab if exists
    await authenticatedPage.click('[data-testid="messaging-tab"]');
    
    // Toggle messaging
    await authenticatedPage.click('[data-testid="messaging-enabled-toggle"]');
    
    // Should save settings
    await expect(authenticatedPage.locator('[data-testid="settings-saved"]')).toBeVisible();
  });

  test('should view blocked users', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/settings');
    
    // Click privacy or blocking tab
    await authenticatedPage.click('[data-testid="privacy-tab"]');
    
    // Should show blocked users section
    await expect(authenticatedPage.locator('[data-testid="blocked-users-section"]')).toBeVisible();
  });
});
