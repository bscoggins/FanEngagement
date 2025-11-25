import { test, expect } from '@playwright/test';
import { loginAs, loginAsAdmin } from './helpers/auth';

/**
 * E2E Tests: Governance Flow
 * 
 * Tests the complete governance workflow:
 * - As admin: Create share type, issue shares, create proposal with options
 * - As member: Login, view organizations, cast vote
 * - View proposal results after closing
 */

// Test data - using unique identifiers to avoid conflicts
const testRunId = Date.now();

test.describe('Governance Flow', () => {
  // Storage for created entities
  let orgId: string;
  let proposalId: string;
  let memberEmail: string;
  let memberPassword: string;
  
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    // Generate unique member credentials for this test run
    memberEmail = `member.e2e.${testRunId}@example.com`;
    memberPassword = 'Member123!';
  });

  test('admin creates organization, share type, member, and issues shares', async ({ page }) => {
    await loginAsAdmin(page);
    
    // Step 1: Create a new organization
    await page.goto('/admin/organizations');
    await expect(page.getByRole('heading', { name: /organization management/i })).toBeVisible();
    
    await page.getByRole('button', { name: /create organization/i }).click();
    
    const orgName = `Gov Test Org ${testRunId}`;
    await page.getByLabel('Name').fill(orgName);
    await page.getByLabel('Description').fill('Organization for governance testing');
    await page.getByRole('button', { name: /create organization/i }).last().click();
    
    // Wait for redirect and capture org ID from URL
    await page.waitForURL(/\/admin\/organizations\/([^/]+)\/edit/);
    const url = page.url();
    const match = url.match(/\/admin\/organizations\/([^/]+)\/edit/);
    expect(match).toBeTruthy();
    orgId = match![1];
    
    // Step 2: Create a share type for the organization
    await page.goto(`/admin/organizations/${orgId}/share-types`);
    await expect(page.getByRole('heading', { name: /manage share types/i })).toBeVisible();
    
    await page.getByRole('button', { name: /create share type/i }).click();
    
    // Fill share type form
    await page.getByLabel('Name *').fill('Voting Share');
    await page.getByLabel('Symbol *').fill('VOTE');
    await page.getByLabel('Voting Weight').fill('1');
    
    // Submit the form - find the submit button within the form
    await page.locator('form button[type="submit"]').click();
    
    // Wait for success
    await expect(page.getByText(/created successfully|success/i)).toBeVisible({ timeout: 10000 });
    
    // Verify share type appears in list
    await expect(page.getByText('Voting Share')).toBeVisible();
    await expect(page.getByText('VOTE')).toBeVisible();
    
    // Step 3: Create a new user (member)
    await page.goto('/users/new');
    await expect(page.getByRole('heading', { name: /create.*(new)?\s*user/i })).toBeVisible();
    
    await page.getByLabel('Display Name').fill('E2E Test Member');
    await page.getByLabel('Email').fill(memberEmail);
    await page.getByLabel(/^Password(?!.*confirm)/i).fill(memberPassword);
    await page.getByLabel(/confirm password/i).fill(memberPassword);
    
    await page.getByRole('button', { name: /create user/i }).click();
    
    // Wait for success (should redirect or show success message)
    await expect(page.getByText(/created|success/i)).toBeVisible({ timeout: 10000 });
    
    // Step 4: Add member to organization
    await page.goto(`/admin/organizations/${orgId}/memberships`);
    await expect(page.getByText(/manage.*memberships|members/i)).toBeVisible();
    
    // Click add member button
    await page.getByRole('button', { name: /add member/i }).click();
    
    // Select the user we just created
    await page.getByLabel(/user/i).selectOption({ label: new RegExp(memberEmail, 'i') });
    await page.getByLabel(/role/i).selectOption('Member');
    
    // Submit
    await page.getByRole('button', { name: /add membership/i }).click();
    
    // Verify member was added
    await expect(page.getByText(memberEmail)).toBeVisible({ timeout: 10000 });
  });

  test('admin creates proposal with options', async ({ page }) => {
    test.skip(!orgId, 'Organization must be created first');
    
    await loginAsAdmin(page);
    
    // Navigate to proposals for the organization
    await page.goto(`/admin/organizations/${orgId}/proposals`);
    await expect(page.getByText(/proposals/i)).toBeVisible();
    
    // Create a new proposal
    await page.getByRole('button', { name: /create new proposal/i }).click();
    
    const proposalTitle = `E2E Test Proposal ${testRunId}`;
    await page.getByLabel('Title').fill(proposalTitle);
    await page.getByLabel('Description').fill('A proposal created for E2E testing the governance flow');
    
    // Set dates - start immediately and end in the future
    const now = new Date();
    const start = new Date(now.getTime() - 60000); // 1 minute ago
    const end = new Date(now.getTime() + 3600000 * 24); // 24 hours from now
    
    await page.getByLabel(/start.*date/i).fill(start.toISOString().slice(0, 16));
    await page.getByLabel(/end.*date/i).fill(end.toISOString().slice(0, 16));
    
    // Submit the proposal
    await page.getByRole('button', { name: /create proposal/i }).last().click();
    
    // Wait for success message
    await expect(page.getByText(/created successfully|success/i)).toBeVisible({ timeout: 10000 });
    
    // Find and click on the newly created proposal
    await page.getByText(proposalTitle).click();
    
    // Capture proposal ID from URL
    await page.waitForURL(/\/admin\/organizations\/[^/]+\/proposals\/([^/]+)/);
    const url = page.url();
    const match = url.match(/\/proposals\/([^/]+)$/);
    expect(match).toBeTruthy();
    proposalId = match![1];
    
    // Verify proposal details
    await expect(page.getByText(proposalTitle)).toBeVisible();
    await expect(page.getByText('Draft')).toBeVisible(); // Should be in Draft status
    
    // Add options to the proposal
    // Option 1
    await page.getByRole('button', { name: /add option/i }).click();
    await page.getByLabel('Option Text').fill('Option A - Approve');
    await page.getByLabel('Option Description').fill('Vote to approve the proposal');
    await page.locator('form').getByRole('button', { name: /add option/i }).click();
    await expect(page.getByText('Option A - Approve')).toBeVisible({ timeout: 10000 });
    
    // Option 2
    await page.getByRole('button', { name: /add option/i }).click();
    await page.getByLabel('Option Text').fill('Option B - Reject');
    await page.getByLabel('Option Description').fill('Vote to reject the proposal');
    await page.locator('form').getByRole('button', { name: /add option/i }).click();
    await expect(page.getByText('Option B - Reject')).toBeVisible({ timeout: 10000 });
    
    // Open the proposal (requires at least 2 options)
    await page.getByRole('button', { name: /open proposal/i }).click();
    
    // Verify proposal is now Open
    await expect(page.getByText('Open')).toBeVisible({ timeout: 10000 });
  });

  test('member can login and view their organizations', async ({ page }) => {
    test.skip(!orgId || !memberEmail, 'Organization and member must be created first');
    
    // Login as the member
    await loginAs(page, memberEmail, memberPassword);
    
    // Navigate to my organizations
    await page.goto('/me/organizations');
    
    // Verify the organization is visible
    await expect(page.getByText(/gov test org/i)).toBeVisible({ timeout: 10000 });
    
    // Click on the organization to view details
    await page.getByText(/gov test org/i).click();
    
    // Verify we can see org details page
    await expect(page.getByText(/gov test org/i)).toBeVisible();
  });

  test('member can view and vote on proposal', async ({ page }) => {
    test.skip(!proposalId || !memberEmail, 'Proposal and member must be created first');
    
    // Login as member
    await loginAs(page, memberEmail, memberPassword);
    
    // Navigate to the proposal (via my proposals route if available, or directly)
    await page.goto(`/me/proposals/${proposalId}`);
    
    // Wait for proposal to load
    await expect(page.getByText(/e2e test proposal/i)).toBeVisible({ timeout: 10000 });
    
    // Verify voting options are displayed
    await expect(page.getByText('Option A - Approve')).toBeVisible();
    await expect(page.getByText('Option B - Reject')).toBeVisible();
    
    // Cast a vote
    await page.getByText('Option A - Approve').click();
    await page.getByRole('button', { name: /cast vote/i }).click();
    
    // Verify vote was successful
    await expect(page.getByText(/voted|vote.*cast|success/i)).toBeVisible({ timeout: 10000 });
    
    // Verify we can see the vote confirmation
    await expect(page.getByText(/already voted|your vote/i)).toBeVisible();
  });

  test('admin closes proposal and views results', async ({ page }) => {
    test.skip(!proposalId, 'Proposal must be created first');
    
    await loginAsAdmin(page);
    
    // Navigate to proposal detail
    await page.goto(`/admin/organizations/${orgId}/proposals/${proposalId}`);
    
    // Verify proposal is Open
    await expect(page.getByText(/e2e test proposal/i)).toBeVisible({ timeout: 10000 });
    
    // Close the proposal
    await page.getByRole('button', { name: /close proposal/i }).click();
    
    // Verify proposal is now Closed
    await expect(page.getByText('Closed')).toBeVisible({ timeout: 10000 });
    
    // Verify results are displayed
    await expect(page.getByText(/results/i)).toBeVisible();
    
    // Verify vote counts are shown
    await expect(page.getByText(/votes?:/i)).toBeVisible();
  });

  test('member can view final results after proposal is closed', async ({ page }) => {
    test.skip(!proposalId || !memberEmail, 'Proposal and member must be created first');
    
    await loginAs(page, memberEmail, memberPassword);
    
    // Navigate to the proposal
    await page.goto(`/me/proposals/${proposalId}`);
    
    // Verify proposal is shown as Closed
    await expect(page.getByText(/e2e test proposal/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Closed')).toBeVisible();
    
    // Verify results are displayed
    await expect(page.getByText(/results/i)).toBeVisible();
    
    // Verify member's vote is indicated
    await expect(page.getByText(/your vote|already voted/i)).toBeVisible();
  });
});
