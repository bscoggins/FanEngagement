import type { Locator, Page } from '@playwright/test';

/**
 * Helper to wait for an element to be visible with an extended timeout so we tolerate
 * network-bound UI renders without sprinkling arbitrary sleeps in each test.
 */
export const waitForVisible = async (locator: Locator, timeout = 10000) => {
  await locator.waitFor({ state: 'visible', timeout });
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

/**
 * Helper to get the organization ID for an existing organization by name.
 * This requires the user to already be logged in as an admin.
 */
export const getExistingOrgId = async (
  page: Page,
  orgName: string,
): Promise<string> => {
  await page.goto('/admin/organizations');
  const orgRow = page.locator('tbody tr', { hasText: orgName }).first();
  await waitForVisible(orgRow);
  const proposalsLink = orgRow.getByRole('link', { name: 'Proposals' });
  const href = await proposalsLink.getAttribute('href');
  if (!href) {
    throw new Error(`Unable to locate proposals link for ${orgName}`);
  }
  const segments = href.split('/');
  return segments[3];
};
