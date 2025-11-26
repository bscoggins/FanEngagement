import { expect, test, type Page } from '@playwright/test';
import { getShareTypeIdByName, getUserByEmail, issueShares, loginViaApi, seedDevData } from './utils';

const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'Admin123!';
const MEMBER_EMAIL = 'alice@example.com';
const MEMBER_PASSWORD = 'Password123!';

async function loginThroughUi(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Log In' }).click();
}

test.describe.serial('Admin and member governance flows', () => {
  let adminToken: string;

  test.beforeAll(async ({ request }) => {
    const loginResult = await loginViaApi(request, ADMIN_EMAIL, ADMIN_PASSWORD);
    adminToken = loginResult.token;
    await seedDevData(request, adminToken);
  });

  test('admin can configure organization and members can vote end-to-end', async ({ page, request }) => {
    const uniqueSuffix = Date.now();
    const organizationName = `E2E Org ${uniqueSuffix}`;
    const shareTypeName = `Voting Shares ${uniqueSuffix}`;
    const proposalTitle = `Proposal ${uniqueSuffix}`;

    // Admin login
    await loginThroughUi(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await expect(page.getByText(`Logged in as ${ADMIN_EMAIL}`)).toBeVisible();

    // Navigate to admin organizations and create a new org
    await page.getByRole('link', { name: 'Admin' }).click();
    await page.getByRole('link', { name: 'Organizations' }).click();
    await page.getByRole('button', { name: '+ Create Organization' }).click();
    await page.getByLabel('Name *').fill(organizationName);
    await page.getByLabel('Description').fill('E2E-created organization for governance flows');
    await page.getByRole('button', { name: 'Create Organization' }).click();

    await expect(page).toHaveURL(/\/admin\/organizations\/.+\/edit/);
    const orgId = page.url().split('/').slice(-2)[0];

    // Configure branding settings
    await page.getByLabel('Logo URL').fill('https://placehold.co/200x80');
    await page.getByLabel('Primary Color').fill('#0055aa');
    await page.getByLabel('Secondary Color').fill('#8899aa');
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.getByText('Organization updated successfully!')).toBeVisible();

    // Verify Users page shows admin and seeded member
    await page.getByRole('link', { name: 'Users' }).click();
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible();
    await expect(page.getByText('admin@example.com')).toBeVisible();
    await expect(page.getByText('alice@example.com')).toBeVisible();

    // Return to the new organization's edit page via Organizations list
    await page.getByRole('link', { name: 'Organizations' }).click();
    const orgRow = page.getByRole('row', { name: organizationName });
    await orgRow.getByRole('link', { name: 'Edit' }).click();

    // Create a share type
    await page.getByRole('link', { name: 'Share Types' }).click();
    await page.getByRole('button', { name: 'Create Share Type' }).click();
    await page.getByLabel('Name *').fill(shareTypeName);
    await page.getByLabel('Symbol *').fill(`E2E${uniqueSuffix}`);
    await page.getByLabel('Description').fill('E2E voting share with weight 1');
    await page.getByLabel('Voting Weight').fill('1');
    await page.getByRole('button', { name: 'Create Share Type' }).click();
    await expect(page.getByText(shareTypeName)).toBeVisible();

    // Add Alice as a member
    await page.goto(`/admin/organizations/${orgId}/memberships`);
    await page.getByRole('button', { name: 'Add Member' }).click();
    await page.getByLabel('Select User *').selectOption({ label: /alice@example.com/i });
    await page.getByRole('button', { name: 'Add Member' }).click();
    await expect(page.getByText('Membership added successfully!')).toBeVisible();

    // Issue shares to Alice via API so she has voting power
    const alice = await getUserByEmail(request, adminToken, MEMBER_EMAIL);
    if (!alice) {
      throw new Error('Seeded member alice@example.com not found');
    }

    const shareTypeId = await getShareTypeIdByName(request, adminToken, orgId, shareTypeName);
    await issueShares(request, adminToken, orgId, shareTypeId, alice.id, 100);

    // Create a proposal
    await page.goto(`/admin/organizations/${orgId}/proposals`);
    await page.getByRole('button', { name: 'Create New Proposal' }).click();
    await page.getByLabel('Title *').fill(proposalTitle);
    await page.getByLabel('Description').fill('E2E governance proposal description');
    await page.getByRole('button', { name: 'Create Proposal' }).click();
    await expect(page.getByText('Proposal created successfully')).toBeVisible();
    await page.getByRole('link', { name: proposalTitle }).click();
    const proposalId = page.url().split('/').pop() as string;

    // Add proposal options
    await page.getByLabel('Option Text').fill('Yes');
    await page.getByRole('button', { name: 'Add Option' }).click();
    await page.getByLabel('Option Text').fill('No');
    await page.getByRole('button', { name: 'Add Option' }).click();
    await expect(page.getByText('Yes')).toBeVisible();
    await expect(page.getByText('No')).toBeVisible();

    // Open the proposal for voting
    await page.getByRole('button', { name: 'Open Proposal' }).click();
    await expect(page.getByText('Open')).toBeVisible();

    // Member logs in and votes
    await page.getByRole('button', { name: 'Logout' }).click();
    await loginThroughUi(page, MEMBER_EMAIL, MEMBER_PASSWORD);
    await page.goto('/me/organizations');
    await expect(page.getByRole('heading', { name: organizationName })).toBeVisible();
    await page.goto(`/me/proposals/${proposalId}`);
    await page.getByLabel('Yes').check();
    await page.getByRole('button', { name: 'Cast Vote' }).click();
    await expect(page.getByText('You have already voted!')).toBeVisible();

    // Admin closes and finalizes
    await page.getByRole('button', { name: 'Logout' }).click();
    await loginThroughUi(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto(`/admin/organizations/${orgId}/proposals/${proposalId}`);
    await page.getByRole('button', { name: 'Close Proposal' }).click();
    await page.getByRole('button', { name: 'Finalize' }).click();
    await expect(page.getByText('Finalized')).toBeVisible();
    await expect(page.getByText('Results')).toBeVisible();
    await expect(page.getByText('Yes')).toBeVisible();

    // Webhook events visible to admin
    await page.goto(`/admin/organizations/${orgId}/webhook-events`);
    await expect(page.getByRole('heading', { name: 'Webhook Events' })).toBeVisible();
    await expect(page.getByText('ProposalClosed')).toBeVisible();
  });
});
