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

test.describe('Admin Flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('can navigate to admin area and see dashboard', async ({ page }) => {
    // Navigate to admin dashboard
    await page.goto('/admin');
    
    // Verify admin dashboard elements
    await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible();
  });

  test('can navigate to admin users page and verify user list', async ({ page }) => {
    // Navigate to admin users page
    await page.goto('/admin/users');
    
    // Verify users page elements
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible();
    
    // Verify admin user is visible in the list
    await expect(page.getByText('admin@example.com')).toBeVisible();
  });

  test('can navigate to admin organizations page', async ({ page }) => {
    // Navigate to admin organizations page
    await page.goto('/admin/organizations');
    
    // Verify organizations page elements
    await expect(page.getByRole('heading', { name: 'Organizations' })).toBeVisible();
  });

  test('can create a new organization', async ({ page }) => {
    // Navigate to admin organizations page
    await page.goto('/admin/organizations');
    
    // Click create organization button
    await page.getByRole('button', { name: 'Create Organization' }).click();
    
    // Fill in organization form
    const orgName = uniqueName('E2E Test Org');
    await page.getByLabel('Organization Name').fill(orgName);
    await page.getByLabel('Description').fill('Organization created by E2E test');
    
    // Submit the form
    await page.getByRole('button', { name: 'Create' }).click();
    
    // Wait for navigation to edit page (indicates successful creation)
    await page.waitForURL(/\/admin\/organizations\/.*\/edit/);
    
    // Verify we're on the edit page for the new org
    await expect(page.getByText(orgName)).toBeVisible();
  });

  test('can navigate to organization edit page and configure settings', async ({ page }) => {
    // First create an organization
    await page.goto('/admin/organizations');
    await page.getByRole('button', { name: 'Create Organization' }).click();
    
    const orgName = uniqueName('E2E Settings Test Org');
    await page.getByLabel('Organization Name').fill(orgName);
    await page.getByLabel('Description').fill('Org for settings test');
    await page.getByRole('button', { name: 'Create' }).click();
    
    // Wait for navigation to edit page
    await page.waitForURL(/\/admin\/organizations\/.*\/edit/);
    
    // Verify organization edit page elements
    await expect(page.getByText(orgName)).toBeVisible();
    
    // Verify key sections are visible (the page shows organization settings)
    await expect(page.getByLabel('Name')).toBeVisible();
    await expect(page.getByLabel('Description')).toBeVisible();
    
    // Update the organization description
    await page.getByLabel('Description').fill('Updated description via E2E test');
    await page.getByRole('button', { name: 'Save Changes' }).click();
    
    // Verify success (page should still show the org and changes persisted)
    await expect(page.getByLabel('Description')).toHaveValue('Updated description via E2E test');
  });

  test('can view dev tools page', async ({ page }) => {
    // Navigate to dev tools page
    await page.goto('/admin/dev-tools');
    
    // Verify dev tools page elements
    await expect(page.getByRole('heading', { name: 'Development Tools' })).toBeVisible();
    
    // Verify seed data button is visible
    await expect(page.getByRole('button', { name: /Seed/i })).toBeVisible();
  });

  test('full admin workflow: create org, add share types, view users', async ({ page }) => {
    // Step 1: Create an organization
    await page.goto('/admin/organizations');
    await page.getByRole('button', { name: 'Create Organization' }).click();
    
    const orgName = uniqueName('E2E Full Admin Workflow');
    await page.getByLabel('Organization Name').fill(orgName);
    await page.getByLabel('Description').fill('Full admin workflow test');
    await page.getByRole('button', { name: 'Create' }).click();
    
    await page.waitForURL(/\/admin\/organizations\/.*\/edit/);
    
    // Get the org ID from the URL
    const orgId = page.url().match(/organizations\/([^/]+)\/edit/)?.[1];
    expect(orgId).toBeTruthy();
    
    // Step 2: Navigate to share types page
    await page.goto(`/admin/organizations/${orgId}/share-types`);
    
    // Verify share types page
    await expect(page.getByRole('heading', { name: 'Share Types' })).toBeVisible();
    
    // Try to create a share type
    await page.getByRole('button', { name: /Create|Add/i }).click();
    
    // Fill in share type form
    const shareTypeName = uniqueName('E2E Share');
    await page.getByLabel('Name').fill(shareTypeName);
    await page.getByLabel('Symbol').fill('E2E');
    await page.getByLabel('Voting Weight').fill('1');
    
    // Submit the form
    await page.getByRole('button', { name: /Create|Save/i }).click();
    
    // Verify share type was created
    await expect(page.getByText(shareTypeName)).toBeVisible();
    
    // Step 3: Navigate back to admin users
    await page.goto('/admin/users');
    
    // Verify users page is accessible
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible();
    await expect(page.getByText('admin@example.com')).toBeVisible();
  });
});
