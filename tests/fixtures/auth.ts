
import { test as base, expect } from '@playwright/test';

type TestFixtures = {
  authenticatedPage: any;
  demoUser: any;
  testUser: any;
};

export const test = base.extend<TestFixtures>({
  demoUser: async ({ page }, use) => {
    const user = {
      username: 'demo',
      password: 'demo',
      email: 'demo@example.com'
    };
    await use(user);
  },

  testUser: async ({ page }, use) => {
    const timestamp = Date.now();
    const user = {
      username: `testuser_${timestamp}`,
      email: `test_${timestamp}@example.com`,
      password: 'TestPassword123!',
      displayName: `Test User ${timestamp}`
    };
    await use(user);
  },

  authenticatedPage: async ({ page, demoUser }, use) => {
    // Navigate to login page
    await page.goto('/auth');
    
    // Login with demo user
    await page.fill('[data-testid="username-input"]', demoUser.username);
    await page.fill('[data-testid="password-input"]', demoUser.password);
    await page.click('[data-testid="login-button"]');
    
    // Wait for successful login
    await expect(page).toHaveURL('/');
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    
    await use(page);
  },
});

export { expect } from '@playwright/test';
