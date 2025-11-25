import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration
 * 
 * Running E2E tests requires the backend API to be running.
 * 
 * Local Development:
 * 1. Start the backend and frontend with docker-compose:
 *    docker compose up --build
 * 2. Run E2E tests:
 *    cd frontend && npm run e2e
 * 
 * Or with bare dotnet:
 * 1. Start postgres and backend:
 *    dotnet run --project backend/FanEngagement.Api/FanEngagement.Api.csproj --launch-profile http
 * 2. Start frontend dev server:
 *    cd frontend && npm run dev
 * 3. Run E2E tests:
 *    npm run e2e
 * 
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e',
  // Run tests in parallel within each file, but serially between files
  // This helps with tests that have dependencies (like governance-flow.spec.ts)
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html'], ['list']],
  
  // Shared settings for all tests
  use: {
    // Base URL for the frontend - use Docker Compose URL by default
    // Override with E2E_BASE_URL environment variable for different setups
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    
    // Collect trace on first retry for debugging
    trace: 'on-first-retry',
    
    // Take screenshots only on failure
    screenshot: 'only-on-failure',
    
    // Record video on first retry for debugging
    video: 'on-first-retry',
    
    // Timeout for each action (click, fill, etc.)
    actionTimeout: 10000,
    
    // Timeout for navigation
    navigationTimeout: 30000,
  },

  // Test timeout (per test)
  timeout: 60000,

  // Expect timeout (per assertion)
  expect: {
    timeout: 10000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Web server configuration
  // When running locally with npm run dev, Playwright will start the dev server
  // When using Docker Compose, the server is already running
  webServer: process.env.E2E_NO_SERVER ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120000,
  },
});

