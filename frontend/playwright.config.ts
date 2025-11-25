import { defineConfig, devices } from '@playwright/test';

/**
 * E2E Test Configuration for FanEngagement
 * 
 * Supports two modes:
 * 1. Development mode (default): Tests against Vite dev server at localhost:5173
 *    - Run: npm run test:e2e (starts Vite dev server automatically)
 *    - Requires backend running separately
 * 
 * 2. Docker Compose mode: Tests against Docker Compose stack at localhost:3000
 *    - Run: npm run e2e (no webServer, expects docker-compose up already running)
 *    - Set E2E_BASE_URL=http://localhost:3000 to use this mode
 * 
 * See https://playwright.dev/docs/test-configuration.
 */

// Determine base URL based on environment
// E2E_BASE_URL=http://localhost:3000 for Docker Compose
// Default to localhost:5173 for Vite dev server
const baseURL = process.env.E2E_BASE_URL || 'http://localhost:5173';
const isDockerCompose = baseURL.includes(':3000');

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'html',
  timeout: 60000, // 60 seconds for E2E tests
  expect: {
    timeout: 10000, // 10 seconds for assertions
  },
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Only start webServer when NOT using Docker Compose mode
  // In Docker Compose mode, we expect the stack to be already running
  ...(isDockerCompose
    ? {}
    : {
        webServer: {
          command: 'npm run dev',
          url: 'http://localhost:5173',
          reuseExistingServer: true,
          timeout: 120000,
        },
      }),
});
