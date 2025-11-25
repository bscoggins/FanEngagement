import { defineConfig, devices } from '@playwright/test';

/**
 * FanEngagement E2E Test Configuration
 * 
 * ## Running E2E Tests
 * 
 * Prerequisites:
 * 1. Start the backend API (e.g., `docker compose up -d db api` or `dotnet run`)
 * 2. Start the frontend dev server (`npm run dev`) OR let Playwright start it automatically
 * 
 * Commands:
 * - `npm run e2e` - Run E2E tests headless
 * - `npm run e2e:dev` - Run E2E tests in interactive UI mode
 * - `npm run test:e2e:headed` - Run tests in headed browser mode
 * 
 * See README.md or docs/architecture.md for detailed setup instructions.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  // Increase timeout for E2E tests that interact with real backend
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Allow more time for navigation as backend may have cold start
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    // Give the dev server time to start
    timeout: 120000,
  },
});
