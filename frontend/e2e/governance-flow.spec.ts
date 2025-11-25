import { test, expect } from '@playwright/test';
import { loginAsAdmin, loginAs, logout, ADMIN_CREDENTIALS } from './helpers/auth';
import {
  generateUniqueName,
  getAuthToken,
  createOrganization,
  createUser,
  addMembership,
  createShareType,
  issueShares,
  createProposal,
  openProposal,
  getProposal,
  closeProposal,
} from './helpers/data';

test.describe('Governance Flow', () => {
  // Shared test data that will be set up in beforeAll
  let adminToken: string;
  let organizationId: string;
  let organizationName: string;
  let memberEmail: string;
  let memberPassword: string;
  let memberId: string;
  let shareTypeId: string;
  let proposalId: string;
  let proposalTitle: string;

  test.beforeAll(async ({ request }) => {
    // Get admin token
    adminToken = await getAuthToken(
      request,
      ADMIN_CREDENTIALS.email,
      ADMIN_CREDENTIALS.password
    );

    // Create a unique organization
    organizationName = generateUniqueName('E2E-GovOrg');
    const org = await createOrganization(request, adminToken, organizationName);
    organizationId = org.id;

    // Create a test member user
    memberEmail = `member-${Date.now()}@example.com`;
    memberPassword = 'Member123!';
    const member = await createUser(
      request,
      adminToken,
      memberEmail,
      memberPassword,
      'E2E Test Member'
    );
    memberId = member.id;

    // Add member to organization
    await addMembership(request, adminToken, organizationId, memberId, 'Member');

    // Create share type
    const shareType = await createShareType(
      request,
      adminToken,
      organizationId,
      'Voting Shares',
      1
    );
    shareTypeId = shareType.id;

    // Issue shares to admin (who is OrgAdmin)
    // Need to get admin user ID first
    const adminUserResponse = await request.get('/api/users', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const users = await adminUserResponse.json();
    const adminUser = users.find((u: { email: string }) => u.email === ADMIN_CREDENTIALS.email);
    
    if (adminUser) {
      await issueShares(request, adminToken, organizationId, adminUser.id, shareTypeId, 100);
    }

    // Issue shares to member
    await issueShares(request, adminToken, organizationId, memberId, shareTypeId, 50);

    // Create proposal with options
    proposalTitle = generateUniqueName('E2E-Proposal');
    const proposal = await createProposal(
      request,
      adminToken,
      organizationId,
      adminUser?.id || memberId,
      proposalTitle,
      ['Option A', 'Option B', 'Option C']
    );
    proposalId = proposal.id;

    // Open the proposal for voting
    await openProposal(request, adminToken, proposalId);
  });

  test.describe('Admin creates share types and issues shares', () => {
    test('admin can create share type via UI', async ({ page }) => {
      await loginAsAdmin(page);
      
      // Navigate to organizations
      await page.getByRole('link', { name: 'Admin' }).click();
      await page.getByRole('link', { name: 'Organizations' }).click();
      
      // Find and click on our test organization
      await page.getByRole('link', { name: organizationName }).click();
      await page.waitForURL(/\/admin\/organizations\/.*\/edit/);
      
      // Navigate to share types
      await page.getByRole('link', { name: /share types/i }).click();
      await page.waitForURL(/\/admin\/organizations\/.*\/share-types/);
      
      // Create a new share type
      const newShareTypeName = generateUniqueName('E2E-ShareType');
      
      // Look for create button
      await page.getByRole('button', { name: /create share type/i }).click();
      
      // Fill in share type details
      await page.getByLabel('Name').fill(newShareTypeName);
      await page.getByLabel('Voting Weight').fill('2');
      
      // Submit
      await page.getByRole('button', { name: /create$/i }).click();
      
      // Verify share type appears in list
      await expect(page.getByText(newShareTypeName)).toBeVisible({ timeout: 5000 });
      
      await logout(page);
    });

    test('admin can view organization with share types', async ({ page }) => {
      await loginAsAdmin(page);
      
      // Navigate to organizations
      await page.getByRole('link', { name: 'Admin' }).click();
      await page.getByRole('link', { name: 'Organizations' }).click();
      
      // Find and click on our test organization
      await page.getByRole('link', { name: organizationName }).click();
      await page.waitForURL(/\/admin\/organizations\/.*\/edit/);
      
      // Navigate to share types
      await page.getByRole('link', { name: /share types/i }).click();
      await page.waitForURL(/\/admin\/organizations\/.*\/share-types/);
      
      // Should see the "Voting Shares" share type we created in beforeAll
      await expect(page.getByText('Voting Shares')).toBeVisible();
      
      await logout(page);
    });
  });

  test.describe('Admin creates proposal with options', () => {
    test('admin can view proposals page', async ({ page }) => {
      await loginAsAdmin(page);
      
      // Navigate to organizations
      await page.getByRole('link', { name: 'Admin' }).click();
      await page.getByRole('link', { name: 'Organizations' }).click();
      
      // Find and click on our test organization
      await page.getByRole('link', { name: organizationName }).click();
      await page.waitForURL(/\/admin\/organizations\/.*\/edit/);
      
      // Navigate to proposals
      await page.getByRole('link', { name: /proposals/i }).click();
      await page.waitForURL(/\/admin\/organizations\/.*\/proposals/);
      
      // Should see the proposal we created
      await expect(page.getByText(proposalTitle)).toBeVisible();
      
      // Proposal should be in Open status
      await expect(page.getByText(/open/i)).toBeVisible();
      
      await logout(page);
    });

    test('admin can view proposal detail', async ({ page }) => {
      await loginAsAdmin(page);
      
      // Navigate directly to proposal detail
      await page.goto(`/admin/organizations/${organizationId}/proposals/${proposalId}`);
      
      // Should see proposal title
      await expect(page.getByRole('heading', { name: proposalTitle })).toBeVisible();
      
      // Should see options
      await expect(page.getByText('Option A')).toBeVisible();
      await expect(page.getByText('Option B')).toBeVisible();
      await expect(page.getByText('Option C')).toBeVisible();
      
      // Should see Open status badge
      await expect(page.getByText(/open/i)).toBeVisible();
      
      await logout(page);
    });
  });

  test.describe('Member votes on proposal', () => {
    test('member can view their organizations', async ({ page }) => {
      await loginAs(page, memberEmail, memberPassword);
      
      // Navigate to my organizations
      await page.getByRole('link', { name: 'My Organizations' }).click();
      await page.waitForURL(/\/me\/organizations/);
      
      // Should see the organization they're a member of
      await expect(page.getByText(organizationName)).toBeVisible();
      
      await logout(page);
    });

    test('member can view organization details and proposals', async ({ page }) => {
      await loginAs(page, memberEmail, memberPassword);
      
      // Navigate to my organizations
      await page.getByRole('link', { name: 'My Organizations' }).click();
      await page.waitForURL(/\/me\/organizations/);
      
      // Click on the organization
      await page.getByRole('link', { name: organizationName }).click();
      await page.waitForURL(/\/me\/organizations\//);
      
      // Should see organization name
      await expect(page.getByRole('heading', { name: organizationName })).toBeVisible();
      
      // Should see proposals section with our proposal
      await expect(page.getByText(proposalTitle)).toBeVisible();
      
      await logout(page);
    });

    test('member can cast a vote on proposal', async ({ page, request }) => {
      await loginAs(page, memberEmail, memberPassword);
      
      // Navigate directly to the proposal page
      await page.goto(`/me/proposals/${proposalId}`);
      
      // Should see proposal title
      await expect(page.getByRole('heading', { name: proposalTitle })).toBeVisible();
      
      // Should see voting options (radio buttons or similar)
      await expect(page.getByText('Option A')).toBeVisible();
      await expect(page.getByText('Option B')).toBeVisible();
      await expect(page.getByText('Option C')).toBeVisible();
      
      // Select an option (click on Option A)
      await page.getByRole('radio', { name: /option a/i }).check();
      
      // Cast vote
      await page.getByRole('button', { name: /cast vote/i }).click();
      
      // Should see confirmation or vote recorded
      // The UI might show "You have voted" or similar
      await expect(page.getByText(/voted|vote recorded|your vote/i)).toBeVisible({ timeout: 5000 });
      
      await logout(page);
    });
  });

  test.describe('View proposal results', () => {
    test('admin can close proposal and view results', async ({ page, request }) => {
      // First close the proposal via API
      await closeProposal(request, adminToken, proposalId);
      
      await loginAsAdmin(page);
      
      // Navigate to proposal detail
      await page.goto(`/admin/organizations/${organizationId}/proposals/${proposalId}`);
      
      // Should see Closed status
      await expect(page.getByText(/closed/i)).toBeVisible();
      
      // Should see results section
      await expect(page.getByText(/results/i)).toBeVisible();
      
      // Results should show vote counts
      await expect(page.getByText(/voting power/i)).toBeVisible();
      
      await logout(page);
    });

    test('member can view proposal results after closing', async ({ page }) => {
      await loginAs(page, memberEmail, memberPassword);
      
      // Navigate to the proposal
      await page.goto(`/me/proposals/${proposalId}`);
      
      // Should see proposal is closed
      await expect(page.getByText(/closed/i)).toBeVisible();
      
      // Should see results
      await expect(page.getByText(/results/i)).toBeVisible();
      
      // Should see their vote was recorded
      await expect(page.getByText(/voted|your vote/i)).toBeVisible();
      
      await logout(page);
    });
  });
});

test.describe('Governance Flow - Create New Proposal via UI', () => {
  test('admin can create proposal with options via UI', async ({ page }) => {
    await loginAsAdmin(page);
    
    // First create an organization
    const orgName = generateUniqueName('E2E-ProposalOrg');
    
    await page.getByRole('link', { name: 'Admin' }).click();
    await page.getByRole('link', { name: 'Organizations' }).click();
    await page.waitForURL(/\/admin\/organizations/);
    
    // Create organization
    await page.getByRole('button', { name: /create organization/i }).click();
    await page.getByLabel('Name').fill(orgName);
    await page.getByRole('button', { name: /create$/i }).click();
    await page.waitForURL(/\/admin\/organizations\/.*\/edit/, { timeout: 10000 });
    
    // Navigate to proposals
    await page.getByRole('link', { name: /proposals/i }).click();
    await page.waitForURL(/\/admin\/organizations\/.*\/proposals/);
    
    // Create a new proposal
    const newProposalTitle = generateUniqueName('E2E-UIProposal');
    
    await page.getByRole('button', { name: /create proposal/i }).click();
    await page.getByLabel('Title').fill(newProposalTitle);
    await page.getByLabel('Description').fill('E2E Test Proposal Description');
    
    // Submit proposal
    await page.getByRole('button', { name: /create$/i }).click();
    
    // Should see the proposal in the list or navigate to detail
    await expect(page.getByText(newProposalTitle)).toBeVisible({ timeout: 5000 });
    
    await logout(page);
  });
});
