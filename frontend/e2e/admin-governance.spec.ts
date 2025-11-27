import { expect, test, type Page } from '@playwright/test';
import { API_BASE_URL, getUserByEmail, issueShares, loginViaApi, seedDevData } from './utils';

const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'Admin123!';
const MEMBER_EMAIL = 'alice@example.com';
const MEMBER_PASSWORD = 'Password123!';

async function loginThroughUi(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Log In' }).click();
  // Wait for redirect to complete (admins go to /admin, members go to /me/home)
  await page.waitForURL(/\/(admin|me\/home)/);
}

async function clickWithConfirm(page: Page, buttonName: string | RegExp) {
  page.once('dialog', d => d.accept());
  await page.getByRole('button', { name: buttonName }).click();
}

async function ensureButton(page: Page, name: string | RegExp, timeout = 15000) {
  await expect(page.getByRole('button', { name })).toBeVisible({ timeout });
}

function captureNetwork(page: Page, proposalId: string) {
  const events: { url: string; status: number; method: string }[] = [];
  page.on('response', resp => {
    const url = resp.url();
    if (url.includes(`/proposals/${proposalId}`)) {
      events.push({ url, status: resp.status(), method: resp.request().method() });
    }
  });
  return events;
}

test.describe.serial('Admin and member governance flows', () => {
  let adminToken: string;
  let orgId: string;
  let organizationName: string;
  let shareTypeId: string;
  let shareTypeName: string;
  let proposalId: string;
  let proposalTitle: string;

  test.beforeAll(async ({ request }) => {
    const loginResult = await loginViaApi(request, ADMIN_EMAIL, ADMIN_PASSWORD);
    adminToken = loginResult.token;
    await seedDevData(request, adminToken);
    const uniqueSuffix = Date.now() % 10000; // Keep it short for validation
    organizationName = `E2E Org ${uniqueSuffix}`;
    shareTypeName = `Vote${uniqueSuffix}`;
    proposalTitle = `Proposal ${uniqueSuffix}`;
  });

  test('admin creates organization and configures branding', async ({ page }) => {

    // Admin login
    await loginThroughUi(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    // Navigate directly to admin organizations page
    await page.goto('/admin/organizations');
    await page.getByRole('button', { name: '+ Create Organization' }).click();
    await page.getByLabel('Name *').fill(organizationName);
    await page.getByLabel('Description').fill('E2E-created organization for governance flows');
    await page.getByRole('button', { name: 'Create Organization' }).click();

    await expect(page).toHaveURL(/\/admin\/organizations\/.+\/edit/);
    orgId = page.url().split('/').slice(-2)[0];

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
    await expect(page.getByTestId('users-heading')).toBeVisible();
    const usersTable = page.getByRole('table');
    await expect(usersTable.getByRole('cell', { name: 'admin@example.com' })).toBeVisible();
    await expect(usersTable.getByRole('cell', { name: 'alice@example.com' })).toBeVisible();

  });

  test('admin creates a share type', async ({ page }) => {
    await loginThroughUi(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto(`/admin/organizations/${orgId}/edit`);
    await page.goto(`/admin/organizations/${orgId}/share-types`);
    await page.getByRole('button', { name: 'Create Share Type' }).click();
    await page.getByLabel('Name *').fill(shareTypeName);
    await page.getByLabel('Symbol *').fill(`E2E${organizationName.split(' ').pop()}`);
    await page.getByLabel('Description').fill('E2E voting share with weight 1');
    await page.getByLabel('Voting Weight').fill('1');
    const createShareTypeResponse = page.waitForResponse(
      (resp) => resp.url().includes(`/organizations/${orgId}/share-types`) && resp.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Create Share Type' }).click();
    await createShareTypeResponse;

    // Form should close and table should show the new share type
    await page.waitForTimeout(1000); // Brief wait for form to close and table to render
    const shareTypesTable = page.getByTestId('share-types-table');
    await expect(shareTypesTable).toBeVisible({ timeout: 15000 });
    await expect(shareTypesTable.getByTestId('share-type-name').filter({ hasText: shareTypeName }).first()).toBeVisible({ timeout: 15000 });

  });

  test('admin adds a member via UI', async ({ page, request }) => {
    await loginThroughUi(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    const alice = await getUserByEmail(request, adminToken, MEMBER_EMAIL);
    if (!alice) throw new Error('Seeded member alice@example.com not found');
    await page.goto(`/admin/organizations/${orgId}/memberships`);
    await expect(page.getByRole('heading', { name: /Manage Memberships/i })).toBeVisible();
    await page.getByRole('button', { name: 'Add Member' }).click();
    const userSelect = page.getByTestId('membership-user-select');
    await expect(userSelect).toBeVisible();
    // Wait for options to load by checking the select has the alice option
    await expect(userSelect.locator(`option[data-testid="membership-option-${MEMBER_EMAIL}"]`)).toHaveCount(1, { timeout: 15000 });
    await userSelect.selectOption({ value: alice.id });
    await page.getByRole('button', { name: 'Add Member' }).click();
    await expect(page.getByText(/Membership added successfully/i)).toBeVisible();

  });

  test('admin issues shares via API', async ({ page, request }) => {
    await loginThroughUi(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    let id: string | null = null;
    for (let attempt = 0; attempt < 10 && !id; attempt++) {
      const resp = await request.get(`${API_BASE_URL}/organizations/${orgId}/share-types`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (resp.ok()) {
        const shareTypes = await resp.json();
        const match = shareTypes.find((s: { name: string; id: string }) => s.name === shareTypeName);
        if (match) id = match.id;
      }
      if (!id) await page.waitForTimeout(500);
    }
    if (!id) throw new Error(`Share type ${shareTypeName} not found after retries`);
    shareTypeId = id;
    const alice = await getUserByEmail(request, adminToken, MEMBER_EMAIL);
    if (!alice) throw new Error('Seeded member alice@example.com not found');
    await issueShares(request, adminToken, orgId, shareTypeId, alice.id, 100);

    // Create a proposal
    await page.goto(`/admin/organizations/${orgId}/proposals`);
    await page.getByRole('button', { name: 'Create New Proposal' }).click();
    await page.getByLabel('Title *').fill(proposalTitle);
    await page.getByLabel('Description').fill('E2E governance proposal description');
    const createProposalResponse = page.waitForResponse(
      (resp) => resp.url().includes(`/organizations/${orgId}/proposals`) && resp.request().method() === 'POST' && resp.status() === 201
    );
    await page.getByRole('button', { name: 'Create Proposal' }).click();
    const proposalResponse = await createProposalResponse;
    const proposalData = await proposalResponse.json();
    proposalId = proposalData.id;
    
    // Navigate to the proposal detail page
    await page.goto(`/admin/organizations/${orgId}/proposals/${proposalId}`);
    await expect(page.getByRole('heading', { name: proposalTitle })).toBeVisible({ timeout: 10000 });

    // Add proposal options
    // First option (await network response)
    const addOptionResponse1 = page.waitForResponse(
      (resp) => resp.url().includes(`/proposals/${proposalId}/options`) && resp.request().method() === 'POST'
    );
    await page.getByRole('button', { name: /^Add Option$/i }).click(); // open form
    await page.getByLabel(/Option Text/i).fill('Yes');
    await page.getByRole('button', { name: /^Add Option$/i }).click(); // submit form
    await addOptionResponse1;
    await expect(page.getByText('Option added successfully')).toBeVisible();
    await expect(page.getByText('Yes')).toBeVisible({ timeout: 10000 });

    // Second option
    const addOptionResponse2 = page.waitForResponse(
      (resp) => resp.url().includes(`/proposals/${proposalId}/options`) && resp.request().method() === 'POST'
    );
    await page.getByRole('button', { name: /^Add Option$/i }).click(); // reopen form
    await page.getByLabel(/Option Text/i).fill('No');
    await page.getByRole('button', { name: /^Add Option$/i }).click(); // submit form
    await addOptionResponse2;
    await expect(page.getByText('Option added successfully')).toBeVisible();
    await expect(page.getByText('No')).toBeVisible({ timeout: 10000 });

    // Open the proposal for voting (await backend transition)
    // Instrument network responses for debugging
      const networkLog = captureNetwork(page, proposalId);

    // Open the proposal
    await ensureButton(page, 'Open Proposal');
    await Promise.all([
      page.waitForResponse(r => r.url().includes(`/proposals/${proposalId}/open`) && r.request().method() === 'POST'),
      clickWithConfirm(page, 'Open Proposal'),
    ]);
    await expect(page.getByText('Open', { exact: true })).toBeVisible({ timeout: 15000 });
    await ensureButton(page, 'Close Proposal');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((globalThis as any).process?.env?.E2E_DEBUG === '1' && networkLog.length) {
      console.log('Proposal network events', networkLog);
    }

  });

  test('member can view and vote on open proposal', async ({ page }) => {
    await loginThroughUi(page, MEMBER_EMAIL, MEMBER_PASSWORD);
    await page.goto(`/me/proposals/${proposalId}`);
    await expect(page.getByText('Open', { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[type=radio][name="option"]')).toHaveCount(2, { timeout: 10000 });
    await page.getByLabel('Yes').check();
    await page.getByRole('button', { name: 'Cast Vote' }).click();
    await expect(page.getByText('You have already voted!')).toBeVisible();
  });

  test('admin can close and finalize proposal; webhook events listed', async ({ page }) => {
    await loginThroughUi(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto(`/admin/organizations/${orgId}/proposals/${proposalId}`);
    await ensureButton(page, 'Close Proposal');
    await Promise.all([
      page.waitForResponse(r => r.url().includes(`/proposals/${proposalId}/close`) && r.request().method() === 'POST'),
      clickWithConfirm(page, 'Close Proposal'),
    ]);
    await expect(page.getByText('Closed', { exact: true })).toBeVisible({ timeout: 15000 });
    await ensureButton(page, 'Finalize');
    await Promise.all([
      page.waitForResponse(r => r.url().includes(`/proposals/${proposalId}/finalize`) && r.request().method() === 'POST'),
      clickWithConfirm(page, 'Finalize'),
    ]);
    await expect(page.getByText('Finalized', { exact: true })).toBeVisible({ timeout: 15000 });
    await page.goto(`/admin/organizations/${orgId}/webhook-events`);
    await expect(page.getByRole('heading', { name: 'Webhook Events' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'ProposalClosed' })).toBeVisible();
  });
});
