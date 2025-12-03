import type { Locator, Page } from '@playwright/test';

/**
 * Helper to wait for an element to be visible with an extended timeout so we tolerate
 * network-bound UI renders without sprinkling arbitrary sleeps in each test.
 */
export const waitForVisible = async (locator: Locator) => {
  await locator.waitFor({ state: 'visible', timeout: 10000 });
};

export const clearAuthState = async (page: Page) => {
  await page.goto('/login');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.context().clearCookies();
  await page.reload();
};

export const loginThroughUi = async (
  page: Page,
  email: string,
  password: string,
  destinationPattern: RegExp = /\/(platform-admin|admin|me\/home)/,
) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Log In' }).click();
  await page.waitForURL(destinationPattern);
  await page.waitForLoadState('networkidle');
};
