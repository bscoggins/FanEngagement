import { expect, test } from '@playwright/test';
import { clearAuthState, getExistingOrgId, loginThroughUi, waitForVisible } from './utils';

const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'Admin123!';
const MEMBER_EMAIL = 'alice@example.com';
const MEMBER_PASSWORD = 'UserDemo1!';
const POLYGON_ORG_NAME = 'Polygon Demo Org';

test.describe.serial('Polygon governance flows (fixture-backed)', () => {
  let polygonOrgId: string;
  let proposalId: string;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginThroughUi(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    polygonOrgId = await getExistingOrgId(page, POLYGON_ORG_NAME);
    await context.close();
  });

  test.beforeEach(async ({ page }) => {
    await clearAuthState(page);
  });

  test('issues shares for polygon org', async ({ page }) => {
    await loginThroughUi(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto(`/admin/organizations/${polygonOrgId}/share-issuance`);
    await waitForVisible(page.getByRole('heading', { name: /Share Issuance/i }));

    await page.getByRole('button', { name: 'Issue Shares' }).click();
    await page.getByRole('combobox', { name: /Member/i }).selectOption({ label: 'Alice Johnson (alice@example.com)' });
    await page.getByRole('combobox', { name: /Share Type/i }).selectOption({ index: 1 });
    await page.getByLabel('Quantity').fill('5');
    await page.getByLabel('Reason').fill('Polygon fixture grant');

    const issuanceResponse = page.waitForResponse(
      (resp) =>
        resp.url().includes(`/organizations/${polygonOrgId}/share-issuances`) &&
        resp.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Issue Shares' }).click();
    await issuanceResponse;
    await expect(page.getByText(/Shares issued successfully/i)).toBeVisible();
  });

  test('creates and opens polygon proposal', async ({ page }) => {
    await loginThroughUi(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto(`/admin/organizations/${polygonOrgId}/proposals`);

    await page.getByRole('button', { name: 'Create Proposal' }).click();
    const title = `Polygon Proposal ${Date.now()}`;
    await page.getByLabel('Title').fill(title);
    await page.getByLabel('Description').fill('Polygon proposal fixture');

    const createResponse = page.waitForResponse(
      (resp) =>
        resp.url().includes(`/organizations/${polygonOrgId}/proposals`) &&
        resp.request().method() === 'POST' &&
        resp.status() === 201,
    );
    await page.getByRole('button', { name: 'Create Proposal' }).click();
    const createdProposal = await createResponse.then((resp) => resp.json());
    proposalId = createdProposal.id;

    await page.goto(`/admin/organizations/${polygonOrgId}/proposals/${proposalId}`);
    await waitForVisible(page.getByRole('heading', { name: title }));

    const addOption = async (label: string) => {
      const addResp = page.waitForResponse(
        (resp) => resp.url().includes(`/proposals/${proposalId}/options`) && resp.request().method() === 'POST',
      );
      await page.getByRole('button', { name: /^Add Option$/i }).click();
      await page.getByLabel(/Option Text/i).fill(label);
      await page.getByRole('button', { name: /^Add Option$/i }).click();
      await addResp;
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    };

    await addOption('Approve');
    await addOption('Reject');

    page.once('dialog', (dialog) => dialog.accept());
    await Promise.all([
      page.waitForResponse(
        (resp) => resp.url().includes(`/proposals/${proposalId}/open`) && resp.request().method() === 'POST',
      ),
      page.getByRole('button', { name: 'Open Proposal' }).click(),
    ]);

    await waitForVisible(page.getByText('Open', { exact: true }));
  });

  test('member casts polygon vote', async ({ page }) => {
    await loginThroughUi(page, MEMBER_EMAIL, MEMBER_PASSWORD);
    await page.goto(`/me/proposals/${proposalId}`);
    await waitForVisible(page.getByText('Open', { exact: true }));
    await page.waitForFunction(
      () => document.querySelectorAll('input[type=radio][name="option"]').length >= 2,
    );

    await page.getByLabel(/Approve/).check();
    await Promise.all([
      page.waitForResponse(
        (resp) => resp.url().includes(`/proposals/${proposalId}/votes`) && resp.request().method() === 'POST',
      ),
      page.getByRole('button', { name: 'Cast Vote' }).click(),
    ]);

    await expect(page.getByTestId('vote-success-message')).toHaveText(
      /Your vote has been cast successfully!/i,
    );
  });
});
