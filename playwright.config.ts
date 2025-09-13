import { defineConfig, devices } from '@playwright/test';

/**
 * ENTERPRISE-GRADE TEST CONFIGURATION
 * Production-ready testing with comprehensive coverage and CI integration
 */
export default defineConfig({
  testDir: './tests',
  
  // CRITICAL: Run tests in parallel for CI efficiency
  fullyParallel: true,
  
  // Forbid test.only on CI - prevents incomplete test runs
  forbidOnly: !!process.env.CI,
  
  // PRODUCTION SAFETY: Retry failed tests in CI to handle flaky tests
  retries: process.env.CI ? 2 : 0,
  
  // CI Performance: Use fewer workers in CI to avoid resource contention  
  workers: process.env.CI ? 1 : undefined,
  
  // ENTERPRISE REPORTING: Multiple reporters for different use cases
  reporter: [
    ['html'], // Visual report for local development
    ['json', { outputFile: 'test-results/results.json' }], // CI integration
    ['junit', { outputFile: 'test-results/junit.xml' }], // CI systems
    ['line'] // Console output
  ],
  
  // Global test configuration
  use: {
    // SECURITY: Base URL for testing
    baseURL: 'http://127.0.0.1:5000',
    
    // DEBUGGING: Capture traces on failure for troubleshooting
    trace: 'on-first-retry',
    
    // DEBUGGING: Screenshots on failure
    screenshot: 'only-on-failure',
    
    // DEBUGGING: Video recording on failure  
    video: 'retain-on-failure',
    
    // PERFORMANCE: Reduce timeouts for faster feedback
    actionTimeout: 30000,
    navigationTimeout: 30000,
  },

  // TEST CATEGORIZATION for different environments
  projects: [
    {
      name: 'unit',
      grep: /@unit/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'integration',
      grep: /@integration/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'e2e',
      grep: /@e2e/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'security',
      grep: /@security/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'auth',
      grep: /@auth/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // ENTERPRISE SETUP: Start dev server for testing
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:5000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000, // 2 minutes for server startup
  },

  // Output directories
  outputDir: 'test-results/',
});
