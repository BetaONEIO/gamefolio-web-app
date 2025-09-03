
import { test, expect } from './fixtures/auth';

test.describe('Admin Features', () => {
  test('should access admin panel with admin user', async ({ page }) => {
    // Login as admin user (mod_tom)
    await page.goto('/auth');
    await page.fill('[data-testid="username-input"]', 'mod_tom');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // Should redirect to home
    await expect(page).toHaveURL('/');
    
    // Navigate to admin panel
    await page.goto('/admin');
    
    // Should show admin dashboard
    await expect(page.locator('[data-testid="admin-dashboard"]')).toBeVisible();
  });

  test('should view user management', async ({ page }) => {
    // Login as admin
    await page.goto('/auth');
    await page.fill('[data-testid="username-input"]', 'mod_tom');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    await page.goto('/admin');
    
    // Click user management tab
    await page.click('[data-testid="user-management-tab"]');
    
    // Should show users list
    await expect(page.locator('[data-testid="users-table"]')).toBeVisible();
  });

  test('should view content reports', async ({ page }) => {
    // Login as admin
    await page.goto('/auth');
    await page.fill('[data-testid="username-input"]', 'mod_tom');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    await page.goto('/admin');
    
    // Click reports tab
    await page.click('[data-testid="reports-tab"]');
    
    // Should show reports list
    await expect(page.locator('[data-testid="reports-table"]')).toBeVisible();
  });
});
