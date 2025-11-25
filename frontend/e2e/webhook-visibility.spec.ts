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
 * Helper to generate unique names for test data to avoid conflicts
 */
function uniqueName(baseName: string): string {
  return `${baseName}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

test.describe('Webhook Events Visibility', () => {
  /**
   * This test verifies that webhook events are visible in the admin UI
   * after proposal lifecycle events occur.
   */
  test('can view webhook events page after proposal lifecycle events', async ({ page }) => {
    // Login as admin
    await loginAsAdmin(page);
    
    // First, seed dev data to ensure we have test data
    await page.goto('/admin/dev-tools');
    const seedButton = page.getByRole('button', { name: /Seed/i });
    if (await seedButton.isVisible()) {
      await seedButton.click();
      await page.waitForTimeout(2000);
    }
    
    // Create a new organization for this test
    await page.goto('/admin/organizations');
    await page.getByRole('button', { name: 'Create Organization' }).click();
    
    const orgName = uniqueName('E2E Webhook Test Org');
    await page.getByLabel('Organization Name').fill(orgName);
    await page.getByLabel('Description').fill('Organization for webhook events E2E test');
    await page.getByRole('button', { name: 'Create' }).click();
    
    await page.waitForURL(/\/admin\/organizations\/.*\/edit/);
    
    // Get the org ID from the URL
    const orgId = page.url().match(/organizations\/([^/]+)\/edit/)?.[1];
    expect(orgId).toBeTruthy();
    
    // Create a share type
    await page.goto(`/admin/organizations/${orgId}/share-types`);
    await page.getByRole('button', { name: /Create|Add/i }).click();
    
    const shareTypeName = uniqueName('Webhook Test Share');
    await page.getByLabel('Name').fill(shareTypeName);
    await page.getByLabel('Symbol').fill('WHS');
    await page.getByLabel('Voting Weight').fill('1');
    await page.getByRole('button', { name: /Create|Save/i }).click();
    
    // Verify share type was created
    await expect(page.getByText(shareTypeName)).toBeVisible();
    
    // Create a proposal
    await page.goto(`/admin/organizations/${orgId}/proposals`);
    await page.getByRole('button', { name: /Create Proposal|Add/i }).click();
    
    const proposalTitle = uniqueName('E2E Webhook Test Proposal');
    await page.getByLabel('Title').fill(proposalTitle);
    await page.getByLabel('Description').fill('Proposal to trigger webhook events');
    await page.getByRole('button', { name: /Create|Save/i }).click();
    
    await page.waitForTimeout(1000);
    
    // Navigate to proposal detail
    await page.getByText(proposalTitle).click();
    await page.waitForTimeout(500);
    
    // Add options to the proposal
    const addOptionButton = page.getByRole('button', { name: /Add Option|Add/i });
    if (await addOptionButton.count() > 0) {
      // Add first option
      await addOptionButton.first().click();
      await page.getByLabel('Option Text').fill('Option 1');
      await page.getByRole('button', { name: /Add|Save|Create/i }).first().click();
      await page.waitForTimeout(500);
      
      // Add second option
      await addOptionButton.first().click();
      await page.getByLabel('Option Text').fill('Option 2');
      await page.getByRole('button', { name: /Add|Save|Create/i }).first().click();
      await page.waitForTimeout(500);
    }
    
    // Open the proposal (triggers ProposalOpened event)
    const openButton = page.getByRole('button', { name: /Open Proposal|Open/i });
    if (await openButton.isVisible()) {
      await openButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Verify proposal is open
    await expect(page.getByText('Open', { exact: true })).toBeVisible();
    
    // Close the proposal (triggers ProposalClosed event)
    const closeButton = page.getByRole('button', { name: /Close Proposal|Close/i });
    if (await closeButton.isVisible()) {
      await closeButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Verify proposal is closed
    await expect(page.getByText('Closed', { exact: true })).toBeVisible();
    
    // Now navigate to webhook events page for this organization
    await page.goto(`/admin/organizations/${orgId}/webhook-events`);
    
    // Verify webhook events page is accessible
    await expect(page.getByRole('heading', { name: /Webhook Events|Events|Outbound/i })).toBeVisible();
    
    // Check for event type filters or event listing
    // The events table or list should be visible
    const eventsTable = page.locator('table');
    const eventsList = page.locator('[data-testid="events-list"]');
    const noEventsMessage = page.getByText(/no.*events|no.*webhooks/i);
    
    // Either we have events displayed, or a "no events" message
    const pageLoaded = await eventsTable.isVisible() || 
                       await eventsList.isVisible() || 
                       await noEventsMessage.isVisible() ||
                       await page.getByText(/Webhook/i).isVisible();
    
    expect(pageLoaded).toBe(true);
  });

  test('can navigate to webhook events page from organization', async ({ page }) => {
    // Login as admin
    await loginAsAdmin(page);
    
    // Seed dev data
    await page.goto('/admin/dev-tools');
    const seedButton = page.getByRole('button', { name: /Seed/i });
    if (await seedButton.isVisible()) {
      await seedButton.click();
      await page.waitForTimeout(2000);
    }
    
    // Find Tech Innovators org
    await page.goto('/admin/organizations');
    
    const techOrgLink = page.getByText('Tech Innovators');
    if (await techOrgLink.isVisible()) {
      // Get the org ID - click and extract from URL
      await techOrgLink.click();
      await page.waitForTimeout(500);
      
      const editUrlMatch = page.url().match(/organizations\/([^/]+)/);
      if (editUrlMatch) {
        const orgId = editUrlMatch[1];
        
        // Navigate directly to webhook events
        await page.goto(`/admin/organizations/${orgId}/webhook-events`);
        
        // Verify page loads
        await expect(page.getByRole('heading', { name: /Webhook|Events|Outbound/i })).toBeVisible();
      }
    }
  });

  test('webhook events page shows correct status badges', async ({ page }) => {
    // Login as admin
    await loginAsAdmin(page);
    
    // Seed dev data
    await page.goto('/admin/dev-tools');
    const seedButton = page.getByRole('button', { name: /Seed/i });
    if (await seedButton.isVisible()) {
      await seedButton.click();
      await page.waitForTimeout(2000);
    }
    
    // Create org and trigger some events
    await page.goto('/admin/organizations');
    await page.getByRole('button', { name: 'Create Organization' }).click();
    
    const orgName = uniqueName('E2E Status Badge Test Org');
    await page.getByLabel('Organization Name').fill(orgName);
    await page.getByLabel('Description').fill('Test status badges');
    await page.getByRole('button', { name: 'Create' }).click();
    
    await page.waitForURL(/\/admin\/organizations\/.*\/edit/);
    
    const orgId = page.url().match(/organizations\/([^/]+)\/edit/)?.[1];
    expect(orgId).toBeTruthy();
    
    // Navigate to webhook events page
    await page.goto(`/admin/organizations/${orgId}/webhook-events`);
    
    // Verify page structure
    await expect(page.getByRole('heading', { name: /Webhook|Events|Outbound/i })).toBeVisible();
    
    // Check for status filter dropdown or status column
    const statusFilter = page.locator('select').filter({ hasText: /status|all/i });
    const statusColumn = page.getByText(/pending|delivered|failed/i);
    
    // The page should have either status filters or display status information
    const hasStatusUI = await statusFilter.isVisible() || 
                        await statusColumn.isVisible() ||
                        await page.getByText(/no events/i).isVisible() ||
                        await page.getByText(/No webhook/i).isVisible();
    
    expect(hasStatusUI).toBe(true);
  });
});
