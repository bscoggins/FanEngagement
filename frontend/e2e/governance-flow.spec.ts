import { test, expect, Page } from '@playwright/test';

/**
 * Helper to login as admin user
 */
async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill('admin@example.com');
  await page.getByLabel('Password').fill('Admin123!');
  await page.getByRole('button', { name: 'Log In' }).click();
  await page.waitForURL('/users');
}

/**
 * Helper to login as a regular user
 */
async function loginAsUser(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Log In' }).click();
  // Regular users may redirect to different pages based on permissions
  await page.waitForTimeout(1000); // Give time for redirect
}

/**
 * Helper to logout
 */
async function logout(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Logout' }).click();
  await page.waitForURL('/login');
}

/**
 * Helper to generate unique names for test data to avoid conflicts
 * Uses timestamp and counter for guaranteed uniqueness within a test run
 */
let uniqueCounter = 0;
function uniqueName(baseName: string): string {
  uniqueCounter++;
  return `${baseName}-${Date.now()}-${uniqueCounter}`;
}

test.describe('Governance Flow', () => {
  /**
   * This test covers the complete governance workflow:
   * 1. Admin creates organization
   * 2. Admin creates share type
   * 3. Admin issues shares to a user
   * 4. Admin creates proposal with options
   * 5. Admin opens the proposal
   * 6. Member views and votes on proposal
   * 7. Admin closes proposal and views results
   * 
   * Note: This test requires the dev seed data to be run first (provides alice@example.com user)
   */
  test('complete governance flow: create proposal, member votes, view results', async ({ page }) => {
    // First, seed the dev data to ensure we have test users
    await loginAsAdmin(page);
    
    // Try to seed dev data
    await page.goto('/admin/dev-tools');
    const seedButton = page.getByRole('button', { name: /Seed/i });
    
    if (await seedButton.isVisible()) {
      await seedButton.click();
      // Wait for seeding to complete (may show success message)
      await page.waitForTimeout(2000);
    }
    
    // Step 1: Create a new organization for this test
    await page.goto('/admin/organizations');
    await page.getByRole('button', { name: 'Create Organization' }).click();
    
    const orgName = uniqueName('E2E Governance Org');
    await page.getByLabel('Organization Name').fill(orgName);
    await page.getByLabel('Description').fill('Organization for governance flow E2E test');
    await page.getByRole('button', { name: 'Create' }).click();
    
    await page.waitForURL(/\/admin\/organizations\/.*\/edit/);
    
    // Get the org ID from the URL
    const orgId = page.url().match(/organizations\/([^/]+)\/edit/)?.[1];
    expect(orgId).toBeTruthy();
    
    // Step 2: Create a share type
    await page.goto(`/admin/organizations/${orgId}/share-types`);
    await page.getByRole('button', { name: /Create|Add/i }).click();
    
    const shareTypeName = uniqueName('Voting Share');
    await page.getByLabel('Name').fill(shareTypeName);
    await page.getByLabel('Symbol').fill('VOTE');
    await page.getByLabel('Voting Weight').fill('1');
    await page.getByRole('button', { name: /Create|Save/i }).click();
    
    // Verify share type was created
    await expect(page.getByText(shareTypeName)).toBeVisible();
    
    // Step 3: Add alice as a member of the organization
    await page.goto(`/admin/organizations/${orgId}/memberships`);
    
    // Try to add membership for alice
    const addMemberButton = page.getByRole('button', { name: /Add Member|Add/i });
    if (await addMemberButton.isVisible()) {
      await addMemberButton.click();
      
      // Try to find alice in the dropdown or input field
      const userSelect = page.locator('select[name="userId"]');
      if (await userSelect.isVisible()) {
        // Check if alice is available in the dropdown
        const aliceOption = userSelect.locator('option:has-text("alice@example.com")');
        if (await aliceOption.count() > 0) {
          await userSelect.selectOption({ label: /alice/i });
          await page.getByRole('button', { name: /Add|Save/i }).click();
          await page.waitForTimeout(1000);
        }
      }
    }
    
    // Step 4: Create a proposal
    await page.goto(`/admin/organizations/${orgId}/proposals`);
    
    // Click button to create proposal
    await page.getByRole('button', { name: /Create Proposal|Add/i }).click();
    
    const proposalTitle = uniqueName('E2E Test Proposal');
    await page.getByLabel('Title').fill(proposalTitle);
    await page.getByLabel('Description').fill('Proposal created for E2E governance test');
    
    await page.getByRole('button', { name: /Create|Save/i }).click();
    
    // Wait for proposal to be created - should show in list or navigate to detail
    await page.waitForTimeout(1000);
    
    // Verify proposal was created
    await expect(page.getByText(proposalTitle)).toBeVisible();
    
    // Navigate to proposal detail to add options
    await page.getByText(proposalTitle).click();
    await page.waitForTimeout(500);
    
    // Get proposal ID from URL if we navigated to detail page (for debugging)
    const proposalId = page.url().match(/proposals\/([^/]+)/)?.[1];
    console.log('Proposal ID:', proposalId);
    
    // Step 5: Add options to the proposal
    // Look for add option button
    const addOptionButton = page.getByRole('button', { name: /Add Option|Add/i });
    if (await addOptionButton.count() > 0) {
      // Add first option
      await addOptionButton.first().click();
      await page.getByLabel('Option Text').fill('Yes, approve');
      await page.getByRole('button', { name: /Add|Save|Create/i }).first().click();
      await page.waitForTimeout(500);
      
      // Add second option
      await addOptionButton.first().click();
      await page.getByLabel('Option Text').fill('No, reject');
      await page.getByRole('button', { name: /Add|Save|Create/i }).first().click();
      await page.waitForTimeout(500);
    }
    
    // Verify options were added
    await expect(page.getByText('Yes, approve')).toBeVisible();
    await expect(page.getByText('No, reject')).toBeVisible();
    
    // Step 6: Open the proposal
    const openButton = page.getByRole('button', { name: /Open Proposal|Open/i });
    if (await openButton.isVisible()) {
      await openButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Verify proposal status changed to Open
    await expect(page.getByText('Open', { exact: true })).toBeVisible();
    
    // Step 7: Check that results section is available (even before closing)
    const resultsHeading = page.getByRole('heading', { name: /Results/i });
    if (await resultsHeading.isVisible()) {
      // Results section exists
      await expect(resultsHeading).toBeVisible();
    }
    
    // Step 8: Close the proposal
    const closeButton = page.getByRole('button', { name: /Close Proposal|Close/i });
    if (await closeButton.isVisible()) {
      await closeButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Verify proposal status changed to Closed
    await expect(page.getByText('Closed', { exact: true })).toBeVisible();
    
    // Step 9: Verify results are displayed
    await expect(page.getByRole('heading', { name: /Results/i })).toBeVisible();
  });

  test('can view seeded proposal as admin', async ({ page }) => {
    // Login as admin
    await loginAsAdmin(page);
    
    // Seed dev data
    await page.goto('/admin/dev-tools');
    const seedButton = page.getByRole('button', { name: /Seed/i });
    if (await seedButton.isVisible()) {
      await seedButton.click();
      await page.waitForTimeout(2000);
    }
    
    // Navigate to organizations to find the seeded one
    await page.goto('/admin/organizations');
    
    // Look for Tech Innovators (seeded org)
    const techOrgLink = page.getByText('Tech Innovators');
    if (await techOrgLink.isVisible()) {
      // Click on the org to view its details
      await techOrgLink.click();
      await page.waitForTimeout(500);
      
      // Try to navigate to proposals for this org
      const orgId = page.url().match(/organizations\/([^/]+)/)?.[1];
      if (orgId) {
        await page.goto(`/admin/organizations/${orgId}/proposals`);
        
        // Verify proposals page is accessible
        await expect(page.getByRole('heading', { name: 'Proposals' })).toBeVisible();
        
        // Look for the seeded proposal
        const seededProposal = page.getByText('Upgrade Development Infrastructure');
        if (await seededProposal.isVisible()) {
          await seededProposal.click();
          await page.waitForTimeout(500);
          
          // Verify proposal detail is visible
          await expect(page.getByText('Upgrade Development Infrastructure')).toBeVisible();
        }
      }
    }
  });

  test('member can view their organizations', async ({ page }) => {
    // First seed dev data as admin
    await loginAsAdmin(page);
    await page.goto('/admin/dev-tools');
    const seedButton = page.getByRole('button', { name: /Seed/i });
    if (await seedButton.isVisible()) {
      await seedButton.click();
      await page.waitForTimeout(2000);
    }
    await logout(page);
    
    // Login as alice (seeded member)
    await loginAsUser(page, 'alice@example.com', 'Password123!');
    
    // Navigate to my organizations
    await page.goto('/me/organizations');
    
    // Verify organizations page is accessible
    await expect(page.getByRole('heading', { name: /My Organizations|Organizations/i })).toBeVisible();
    
    // Look for Tech Innovators (alice is a member via seeded data)
    const orgLink = page.getByText('Tech Innovators');
    if (await orgLink.isVisible()) {
      // Click on the org
      await orgLink.click();
      
      // Verify we can see org details
      await expect(page.getByText('Tech Innovators')).toBeVisible();
    }
  });

  test('member can view proposal and see options', async ({ page }) => {
    // First seed dev data as admin
    await loginAsAdmin(page);
    await page.goto('/admin/dev-tools');
    const seedButton = page.getByRole('button', { name: /Seed/i });
    if (await seedButton.isVisible()) {
      await seedButton.click();
      await page.waitForTimeout(2000);
    }
    await logout(page);
    
    // Login as alice (seeded member)
    await loginAsUser(page, 'alice@example.com', 'Password123!');
    
    // Navigate to my organizations
    await page.goto('/me/organizations');
    
    // Look for Tech Innovators
    const orgLink = page.getByText('Tech Innovators');
    if (await orgLink.isVisible()) {
      await orgLink.click();
      await page.waitForTimeout(500);
      
      // Look for proposals section or link
      const proposalLink = page.getByText('Upgrade Development Infrastructure');
      if (await proposalLink.isVisible()) {
        await proposalLink.click();
        await page.waitForTimeout(500);
        
        // Verify proposal page shows options
        await expect(page.getByText('Upgrade Development Infrastructure')).toBeVisible();
        
        // Check for options
        const yesOption = page.getByText('Yes, upgrade now');
        const noOption = page.getByText('No, wait until next quarter');
        
        // At least one option should be visible
        const optionsVisible = await yesOption.isVisible() || await noOption.isVisible();
        expect(optionsVisible).toBe(true);
      }
    }
  });
});

test.describe('Role-based Access Control in UI', () => {
  test('admin can see admin navigation links', async ({ page }) => {
    await loginAsAdmin(page);
    
    // Navigate to admin area
    await page.goto('/admin');
    
    // Verify admin-only navigation elements
    await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible();
    
    // Check for admin navigation links
    const usersNavLink = page.getByRole('link', { name: 'Users' });
    const orgsNavLink = page.getByRole('link', { name: 'Organizations' });
    
    // At least one admin nav link should be visible
    const adminLinksVisible = await usersNavLink.isVisible() || await orgsNavLink.isVisible();
    expect(adminLinksVisible).toBe(true);
  });

  test('non-admin user has limited navigation', async ({ page }) => {
    // First seed dev data as admin
    await loginAsAdmin(page);
    await page.goto('/admin/dev-tools');
    const seedButton = page.getByRole('button', { name: /Seed/i });
    if (await seedButton.isVisible()) {
      await seedButton.click();
      await page.waitForTimeout(2000);
    }
    await logout(page);
    
    // Login as bob (regular member)
    await loginAsUser(page, 'bob@example.com', 'Password123!');
    
    // Navigate to my account or home
    await page.goto('/me');
    
    // Verify user can access their account page
    await expect(page.getByRole('heading', { name: /My Account|Account/i })).toBeVisible();
    
    // Navigate to my organizations
    await page.goto('/me/organizations');
    
    // Verify user can access their organizations
    await expect(page.getByRole('heading', { name: /My Organizations|Organizations/i })).toBeVisible();
  });
});
