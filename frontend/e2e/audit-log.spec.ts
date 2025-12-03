import { expect, test } from '@playwright/test';
import { clearAuthState, loginThroughUi, waitForVisible } from './utils';

const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'Admin123!';
const ORG_ADMIN_EMAIL = 'alice@example.com';
const ORG_ADMIN_PASSWORD = 'UserDemo1!';
const EXISTING_ORG_NAME = 'Tech Innovators';

test.describe('Audit Log UI flows', () => {
  let existingOrgId: string;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginThroughUi(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto('/admin/organizations');
    const orgRow = page.locator('tbody tr', { hasText: EXISTING_ORG_NAME }).first();
    await waitForVisible(orgRow);
    const auditLink = orgRow.getByRole('link', { name: 'Proposals' });
    const href = await auditLink.getAttribute('href');
    if (!href) {
      throw new Error('Unable to derive organization id for Tech Innovators');
    }
    const segments = href.split('/');
    existingOrgId = segments[3];
    await context.close();
  });

  test.beforeEach(async ({ page }) => {
    await clearAuthState(page);
  });

  test('Platform admin expands audit event details via UI', async ({ page }) => {
    await loginThroughUi(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto('/platform-admin/audit-log');
    await waitForVisible(page.getByTestId('platform-audit-log-heading'));
    const table = page.getByTestId('audit-log-table');
    await waitForVisible(table);

    const expandButton = table.getByRole('button', { name: 'Expand details' }).first();
    await expandButton.click();
    await expect(page.getByText('Correlation ID')).toBeVisible();
    await expect(page.getByText('Resource ID')).toBeVisible();
  });

  test('Platform admin sees empty state when filtering future date range', async ({ page }) => {
    await loginThroughUi(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto('/platform-admin/audit-log');
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    await page.getByTestId('audit-log-filter-date-from').fill(futureDate);
    await page.getByTestId('audit-log-filter-date-to').fill(futureDate);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('No audit events found matching your filters.')).toBeVisible();
  });

  test('Org admin paginates organization audit log using UI controls', async ({ page }) => {
    await loginThroughUi(page, ORG_ADMIN_EMAIL, ORG_ADMIN_PASSWORD);
    await page.goto(`/admin/organizations/${existingOrgId}/audit-log`);
    await waitForVisible(page.getByTestId('audit-log-heading'));
    const table = page.getByTestId('audit-log-table');
    await waitForVisible(table);

    const pageSizeSelect = page.locator('#pageSize');
    await pageSizeSelect.selectOption('10');
    await page.waitForLoadState('networkidle');
    await expect(pageSizeSelect).toHaveValue('10');

    const rows = await table.locator('tbody tr').count();
    expect(rows).toBeGreaterThan(0);
    expect(rows).toBeLessThanOrEqual(10);
  });

  test('Org admin filters audit log by resource type through the UI', async ({ page }) => {
    await loginThroughUi(page, ORG_ADMIN_EMAIL, ORG_ADMIN_PASSWORD);
    await page.goto(`/admin/organizations/${existingOrgId}/audit-log`);
    await waitForVisible(page.getByTestId('audit-log-heading'));
    const table = page.getByTestId('audit-log-table');
    await waitForVisible(table);

    const firstRow = table.locator('tbody tr').first();
    const resourceCell = firstRow.locator('td').nth(4);
    const resourceText = (await resourceCell.innerText()).split('\n')[0]?.trim();
    if (!resourceText) {
      throw new Error('Unable to read resource type from first audit row');
    }

    const resourceFilter = page.getByTestId('audit-log-filter-resource');
    await resourceFilter.getByText(resourceText, { exact: true }).click();
    await page.waitForLoadState('networkidle');

    const resourceCells = await table.locator('tbody tr td:nth-child(5) div:first-child').allInnerTexts();
    resourceCells.forEach((value) => {
      expect(value.trim()).toBe(resourceText);
    });
  });
});
