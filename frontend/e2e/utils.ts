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
 * 
 * Note: The fallback method (clicking Proposals button) will navigate away from the current page.
 * Use the primary method (data-row-key attribute) when possible to avoid navigation side effects.
 */
export const getExistingOrgId = async (
  page: Page,
  orgName: string,
): Promise<string> => {
  await page.goto('/admin/organizations');
  const orgRow = page.locator('tbody tr', { hasText: orgName }).first();
  await waitForVisible(orgRow);
  
  // Primary method: Use the stable row key that the shared Table component sets on each <tr>
  const rowKey = await orgRow.getAttribute('data-row-key');
  if (rowKey) {
    return rowKey;
  }

  // Fallback: click the proposals action button to navigate and parse the URL
  // WARNING: This will navigate away from the current page
  const proposalsButton = orgRow.getByRole('button', { name: 'Proposals' });
  const buttonCount = await proposalsButton.count();
  
  if (buttonCount === 0) {
    throw new Error(
      `Unable to determine organization id for "${orgName}": ` +
      `data-row-key attribute missing and Proposals button not found`
    );
  }

  try {
    await Promise.all([
      page.waitForURL(/\/admin\/organizations\/[^/]+\/proposals/, { timeout: 5000 }),
      proposalsButton.click(),
    ]);
  } catch (error) {
    throw new Error(
      `Unable to determine organization id for "${orgName}": ` +
      `navigation to proposals page failed - ${error instanceof Error ? error.message : 'unknown error'}`
    );
  }

  const urlSegments = page.url().split('/');
  const orgIndex = urlSegments.findIndex((segment) => segment === 'organizations');
  
  if (orgIndex === -1 || !urlSegments[orgIndex + 1]) {
    throw new Error(
      `Unable to determine organization id for "${orgName}": ` +
      `failed to parse organization ID from URL: ${page.url()}`
    );
  }

  return urlSegments[orgIndex + 1];
};
