import { expect, test, type Page } from '@playwright/test';
import { clearAuthState, loginThroughUi, waitForVisible } from './utils';

const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'Admin123!';
const MEMBER_EMAIL = 'alice@example.com';
const MEMBER_PASSWORD = 'UserDemo1!';
const EXISTING_ORG_NAME = 'Tech Innovators';

async function clickWithConfirm(page: Page, buttonName: string | RegExp) {
  page.once('dialog', d => d.accept());
  await page.getByRole('button', { name: buttonName }).click();
}

async function ensureButton(page: Page, name: string | RegExp) {
  await waitForVisible(page.getByRole('button', { name }));
}

test.describe.serial('Admin and member governance flows', () => {
  let newOrgId: string;
  let newOrgName: string;
  let shareTypeName: string;
  let proposalTitle: string;
  let existingOrgId: string;
  let proposalId: string;

  test.beforeAll(async ({ browser }) => {
    const uniqueSuffix = Date.now() % 100000;
    newOrgName = `E2E Org ${uniqueSuffix}`;
    shareTypeName = `Vote${uniqueSuffix}`;
    proposalTitle = `UI Proposal ${uniqueSuffix}`;

    const context = await browser.newContext();
    const page = await context.newPage();
    await loginThroughUi(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto('/admin/organizations');
    const orgRow = page.locator('tbody tr', { hasText: EXISTING_ORG_NAME }).first();
    await waitForVisible(orgRow);
    const proposalsLink = orgRow.getByRole('link', { name: 'Proposals' });
    const href = await proposalsLink.getAttribute('href');
    if (!href) {
      throw new Error('Unable to locate proposals link for Tech Innovators');
    }
    const parts = href.split('/');
    existingOrgId = parts[3];
    await context.close();
  });

  test.beforeEach(async ({ page }) => {
    await clearAuthState(page);
  });

  test('admin creates organization and configures branding', async ({ page }) => {

    // Admin login
    await loginThroughUi(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    // Navigate directly to admin organizations page
    await page.goto('/admin/organizations');
    await page.getByRole('button', { name: '+ Create Organization' }).click();
    await page.getByLabel('Name *').fill(newOrgName);
    await page.getByLabel('Description').fill('E2E-created organization for governance flows');
    await page.getByRole('button', { name: 'Create Organization' }).click();

    await expect(page).toHaveURL(/\/admin\/organizations\/.+\/edit/);
    newOrgId = page.url().split('/').slice(-2)[0];

    // Configure branding settings
    await page.getByLabel('Logo URL').fill('https://placehold.co/200x80');
    await page.getByLabel('Primary Color').fill('#0055aa');
    await page.getByLabel('Secondary Color').fill('#8899aa');
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.getByText('Organization updated successfully!')).toBeVisible();

  });

  test('admin can see users list', async ({ page }) => {
    await loginThroughUi(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    // Navigate directly to Admin Users page
    await page.goto('/admin/users');
    await waitForVisible(page.getByTestId('users-heading'));
    const usersTable = page.getByRole('table');
    await expect(usersTable.getByRole('cell', { name: 'admin@example.com' })).toBeVisible();
    await expect(usersTable.getByRole('cell', { name: 'root_admin@platform.local' })).toBeVisible();
    await expect(usersTable.getByRole('cell', { name: 'platform_admin@fanengagement.dev' })).toBeVisible();
    await expect(usersTable.getByRole('cell', { name: 'alice@example.com' })).toBeVisible();

  });

  test('admin creates a share type', async ({ page }) => {
    await loginThroughUi(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto(`/admin/organizations/${newOrgId}/edit`);
    await page.goto(`/admin/organizations/${newOrgId}/share-types`);
    await page.getByRole('button', { name: 'Create Share Type' }).click();
    await page.getByLabel('Name *').fill(shareTypeName);
    await page.getByLabel('Symbol *').fill(`E2E${newOrgName.split(' ').pop()}`);
    await page.getByLabel('Description').fill('E2E voting share with weight 1');
    await page.getByLabel('Voting Weight').fill('1');
    const createShareTypeResponse = page.waitForResponse(
      (resp) => resp.url().includes(`/organizations/${newOrgId}/share-types`) && resp.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Create Share Type' }).click();
    await createShareTypeResponse;

    // Form should close and table should show the new share type
    const shareTypesTable = page.getByTestId('share-types-table');
    await waitForVisible(shareTypesTable);
    await waitForVisible(shareTypesTable.getByTestId('share-type-name').filter({ hasText: shareTypeName }).first());

  });

  test('admin adds a member via UI', async ({ page }) => {
    await loginThroughUi(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto(`/admin/organizations/${newOrgId}/memberships`);
    await page.waitForLoadState('networkidle');
    await waitForVisible(page.getByRole('heading', { name: /Memberships/i }));
    await page.getByRole('button', { name: 'Add Member' }).click();
    const userSelect = page.getByTestId('membership-user-select');
    await waitForVisible(userSelect);
    await page.waitForFunction(
      (email) => Boolean(document.querySelector(`[data-testid="membership-option-${email}"]`)),
      MEMBER_EMAIL,
    );
    await userSelect.selectOption({ label: 'Alice Johnson (alice@example.com)' });
    await page.getByRole('button', { name: 'Add Member' }).click();
    await expect(page.getByText(/Membership added successfully/i)).toBeVisible();

  });

  test('admin creates and opens a proposal for an existing organization via UI', async ({ page }) => {
    await loginThroughUi(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto(`/admin/organizations/${existingOrgId}/proposals`);
    await page.getByRole('button', { name: 'Create New Proposal' }).click();
    await page.getByLabel('Title *').fill(proposalTitle);
    await page.getByLabel('Description').fill('UI-driven governance validation');
    const createProposalResponse = page.waitForResponse(
      (resp) => resp.url().includes(`/organizations/${existingOrgId}/proposals`) && resp.request().method() === 'POST' && resp.status() === 201,
    );
    await page.getByRole('button', { name: 'Create Proposal' }).click();
    const createdProposal = await createProposalResponse.then((resp) => resp.json());
    proposalId = createdProposal.id;

    await page.goto(`/admin/organizations/${existingOrgId}/proposals/${proposalId}`);
    await waitForVisible(page.getByRole('heading', { name: proposalTitle }));

    const addOption = async (label: string) => {
      const optionResponse = page.waitForResponse(
        (resp) => resp.url().includes(`/proposals/${proposalId}/options`) && resp.request().method() === 'POST',
      );
      await page.getByRole('button', { name: /^Add Option$/i }).click();
      await page.getByLabel(/Option Text/i).fill(label);
      await page.getByRole('button', { name: /^Add Option$/i }).click();
      await optionResponse;
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    };

    await addOption('Yes');
    await addOption('No');

    await ensureButton(page, 'Open Proposal');
    await Promise.all([
      page.waitForResponse((resp) => resp.url().includes(`/proposals/${proposalId}/open`) && resp.request().method() === 'POST'),
      clickWithConfirm(page, 'Open Proposal'),
    ]);
    await waitForVisible(page.getByText('Open', { exact: true }));
  });

  test('member can view and vote on open proposal', async ({ page }) => {
    await loginThroughUi(page, MEMBER_EMAIL, MEMBER_PASSWORD);
    await page.goto(`/me/proposals/${proposalId}`);
    await waitForVisible(page.getByText('Open', { exact: true }));
    await page.waitForFunction(() => document.querySelectorAll('input[type=radio][name="option"]').length === 2);
    await page.getByLabel('Yes').check();
    await page.getByRole('button', { name: 'Cast Vote' }).click();
    await expect(page.getByText('You have already voted!')).toBeVisible();
  });

  test('admin can close and finalize proposal; webhook events listed', async ({ page }) => {
    await loginThroughUi(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto(`/admin/organizations/${existingOrgId}/proposals/${proposalId}`);
    await ensureButton(page, 'Close Proposal');
    await Promise.all([
      page.waitForResponse(r => r.url().includes(`/proposals/${proposalId}/close`) && r.request().method() === 'POST'),
      clickWithConfirm(page, 'Close Proposal'),
    ]);
    await waitForVisible(page.getByText('Closed', { exact: true }));
    await ensureButton(page, 'Finalize');
    await Promise.all([
      page.waitForResponse(r => r.url().includes(`/proposals/${proposalId}/finalize`) && r.request().method() === 'POST'),
      clickWithConfirm(page, 'Finalize'),
    ]);
    await waitForVisible(page.getByText('Finalized', { exact: true }));
    await page.goto(`/admin/organizations/${existingOrgId}/webhook-events`);
    await expect(page.getByRole('heading', { name: 'Webhook Events' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'ProposalClosed' })).toBeVisible();
  });
});
