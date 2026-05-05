import { defineConfig, devices } from '@playwright/test';

/**
 * Live-smoke config: runs read-only checks against the deployed app at
 * https://app.gamefolio.com. No webServer; no auth; safe to run from any
 * machine without local DB / Replit secrets. Invoke with:
 *   npx playwright test --config=playwright.live.config.ts
 */
export default defineConfig({
  testDir: './tests-live',
  fullyParallel: true,
  retries: 1,
  workers: 4,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'test-results/live-html', open: 'never' }],
    ['json', { outputFile: 'test-results/live.json' }],
  ],
  use: {
    baseURL: 'https://app.gamefolio.com',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  outputDir: 'test-results/live',
});
