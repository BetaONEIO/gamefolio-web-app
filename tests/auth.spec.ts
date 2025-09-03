
import { test, expect } from './fixtures/auth';

test.describe('Authentication', () => {
  test('should display login and register forms', async ({ page }) => {
    await page.goto('/auth');
    
    // Check login form is visible
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
    await expect(page.locator('[data-testid="username-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
    
    // Switch to register form
    await page.click('[data-testid="register-tab"]');
    await expect(page.locator('[data-testid="register-form"]')).toBeVisible();
    await expect(page.locator('[data-testid="register-username-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="register-email-input"]')).toBeVisible();
  });

  test('should login with demo user', async ({ page, demoUser }) => {
    await page.goto('/auth');
    
    await page.fill('[data-testid="username-input"]', demoUser.username);
    await page.fill('[data-testid="password-input"]', demoUser.password);
    await page.click('[data-testid="login-button"]');
    
    // Should redirect to home page
    await expect(page).toHaveURL('/');
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('should register new user', async ({ page, testUser }) => {
    await page.goto('/auth');
    
    // Switch to register tab
    await page.click('[data-testid="register-tab"]');
    
    // Fill registration form
    await page.fill('[data-testid="register-username-input"]', testUser.username);
    await page.fill('[data-testid="register-email-input"]', testUser.email);
    await page.fill('[data-testid="register-password-input"]', testUser.password);
    await page.fill('[data-testid="register-confirm-password-input"]', testUser.password);
    await page.fill('[data-testid="register-display-name-input"]', testUser.displayName);
    
    await page.click('[data-testid="register-button"]');
    
    // Should redirect to onboarding or home
    await expect(page).not.toHaveURL('/auth');
  });

  test('should handle login errors', async ({ page }) => {
    await page.goto('/auth');
    
    await page.fill('[data-testid="username-input"]', 'nonexistent');
    await page.fill('[data-testid="password-input"]', 'wrongpassword');
    await page.click('[data-testid="login-button"]');
    
    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
  });

  test('should logout successfully', async ({ authenticatedPage }) => {
    // Click user menu
    await authenticatedPage.click('[data-testid="user-menu"]');
    
    // Click logout
    await authenticatedPage.click('[data-testid="logout-button"]');
    
    // Should redirect to auth page
    await expect(authenticatedPage).toHaveURL('/auth');
  });
});
