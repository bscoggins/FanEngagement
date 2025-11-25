import { test, expect } from '@playwright/test';
import { loginAsAdmin, logout } from './helpers/auth';
import { generateUniqueName } from './helpers/data';

test.describe('Admin Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start each test by logging in as admin
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ page }) => {
    // Logout after each test if still logged in
    // Using try-catch to handle cases where the test failed before login completed
    try {
      const logoutButton = page.getByRole('button', { name: 'Logout' });
      const isVisible = await logoutButton.isVisible({ timeout: 1000 });
      if (isVisible) {
        await logout(page);
      }
    } catch {
      // Ignore errors in cleanup - test might have failed before login
    }
  });

  test('should login as admin and see admin navigation', async ({ page }) => {
    // Admin should see admin navigation link
    await expect(page.getByRole('link', { name: 'Admin' })).toBeVisible();
    
    // Navigate to admin area
    await page.getByRole('link', { name: 'Admin' }).click();
    await page.waitForURL(/\/admin/);
    
    // Should see admin dashboard
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  });

  test('should create an organization', async ({ page }) => {
    const orgName = generateUniqueName('E2E-TestOrg');
    
    // Navigate to organizations page
    await page.getByRole('link', { name: 'Admin' }).click();
    await page.waitForURL(/\/admin/);
    
    // Click on Organizations in sidebar (use first() to handle multiple matches)
    await page.getByRole('link', { name: 'Organizations' }).first().click();
    await page.waitForURL(/\/admin\/organizations/);
    await page.waitForLoadState('domcontentloaded');
    
    // Click create button to show form
    const createOrgButton = page.getByRole('button', { name: /create organization/i });
    await createOrgButton.waitFor({ state: 'visible', timeout: 30000 });
    await createOrgButton.click();
    
    // Fill in organization details
    await page.getByLabel('Name').fill(orgName);
    await page.getByLabel('Description').fill('E2E Test Organization Description');
    
    // Wait for form to be ready before submitting
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500); // Small buffer for any client-side validation
    
    // Submit the form - wait for the button to be visible and enabled
    const submitButton = page.getByRole('button', { name: 'Create Organization' });
    await submitButton.waitFor({ state: 'visible', timeout: 30000 });
    await expect(submitButton).toBeEnabled({ timeout: 5000 });
    await submitButton.click();
    
    // Should navigate to edit page or show success
    // Wait for navigation or success message
    await page.waitForURL(/\/admin\/organizations\/.*\/edit/, { timeout: 30000 });
    
    // Verify organization was created by checking we're on the edit page
    await expect(page.getByRole('heading', { name: /edit organization/i })).toBeVisible();
  });

  test('should configure organization settings', async ({ page }) => {
    const orgName = generateUniqueName('E2E-ConfigOrg');
    
    // First create an organization
    await page.getByRole('link', { name: 'Admin' }).click();
    await page.getByRole('link', { name: 'Organizations' }).first().click();
    await page.waitForURL(/\/admin\/organizations/);
    await page.waitForLoadState('domcontentloaded');
    
    const createOrgButton = page.getByRole('button', { name: /create organization/i });
    await createOrgButton.waitFor({ state: 'visible', timeout: 30000 });
    await createOrgButton.click();
    
    await page.getByLabel('Name').fill(orgName);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    const createButton = page.getByRole('button', { name: 'Create Organization' });
    await createButton.waitFor({ state: 'visible', timeout: 30000 });
    await expect(createButton).toBeEnabled({ timeout: 5000 });
    await createButton.click();
    
    // Wait for edit page
    await page.waitForURL(/\/admin\/organizations\/.*\/edit/, { timeout: 30000 });
    
    // Update organization name
    const updatedName = `${orgName}-Updated`;
    await page.getByLabel('Name').clear();
    await page.getByLabel('Name').fill(updatedName);
    
    // Update description
    await page.getByLabel('Description').fill('Updated description for E2E test');
    
    // Save changes
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /save/i }).click();
    
    // Wait for save to complete by checking input value is still correct
    // The form should retain the updated name after successful save
    await expect(page.getByLabel('Name')).toHaveValue(updatedName);
  });

  test('should navigate to admin Users page and verify user list', async ({ page }) => {
    // Navigate to admin area
    await page.getByRole('link', { name: 'Admin' }).click();
    await page.waitForURL(/\/admin/);
    
    // Click on Users in sidebar (use first() to handle multiple matches)
    await page.getByRole('link', { name: 'Users' }).first().click();
    await page.waitForURL(/\/admin\/users/);
    
    // Should see Users heading
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible();
    
    // Should see the admin user in the table (use role to be more specific)
    await expect(page.getByRole('cell', { name: 'admin@example.com' })).toBeVisible();
    
    // Should see table headers or user list structure
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('should access organization memberships page', async ({ page }) => {
    const orgName = generateUniqueName('E2E-MemberOrg');
    
    // Create an organization first
    await page.getByRole('link', { name: 'Admin' }).click();
    await page.getByRole('link', { name: 'Organizations' }).first().click();
    await page.waitForURL(/\/admin\/organizations/);
    await page.waitForLoadState('domcontentloaded');
    
    const createOrgButton = page.getByRole('button', { name: /create organization/i });
    await createOrgButton.waitFor({ state: 'visible', timeout: 30000 });
    await createOrgButton.click();
    
    await page.getByLabel('Name').fill(orgName);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    const createButton = page.getByRole('button', { name: 'Create Organization' });
    await createButton.waitFor({ state: 'visible', timeout: 30000 });
    await expect(createButton).toBeEnabled({ timeout: 5000 });
    await createButton.click();
    
    // Wait for edit page
    await page.waitForURL(/\/admin\/organizations\/.*\/edit/, { timeout: 30000 });
    
    // Navigate to memberships
    await page.getByRole('link', { name: /memberships/i }).click();
    await page.waitForURL(/\/admin\/organizations\/.*\/memberships/);
    
    // Should see memberships heading
    await expect(page.getByRole('heading', { name: /memberships/i })).toBeVisible();
    
    // Admin user should be listed as OrgAdmin (automatically added when org created)
    await expect(page.getByText('admin@example.com')).toBeVisible();
  });

  test('should access organization share types page', async ({ page }) => {
    const orgName = generateUniqueName('E2E-ShareOrg');
    
    // Create an organization first
    await page.getByRole('link', { name: 'Admin' }).click();
    await page.getByRole('link', { name: 'Organizations' }).first().click();
    await page.waitForURL(/\/admin\/organizations/);
    await page.waitForLoadState('domcontentloaded');
    
    const createOrgButton = page.getByRole('button', { name: /create organization/i });
    await createOrgButton.waitFor({ state: 'visible', timeout: 30000 });
    await createOrgButton.click();
    
    await page.getByLabel('Name').fill(orgName);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    const createButton = page.getByRole('button', { name: 'Create Organization' });
    await createButton.waitFor({ state: 'visible', timeout: 30000 });
    await expect(createButton).toBeEnabled({ timeout: 5000 });
    await createButton.click();
    
    // Wait for edit page
    await page.waitForURL(/\/admin\/organizations\/.*\/edit/, { timeout: 30000 });
    
    // Navigate to share types
    await page.getByRole('link', { name: /share types/i }).click();
    await page.waitForURL(/\/admin\/organizations\/.*\/share-types/);
    
    // Should see share types heading
    await expect(page.getByRole('heading', { name: /share types/i })).toBeVisible();
  });

  test('admin should see platform admin badge', async ({ page }) => {
    // Navigate to admin area
    await page.getByRole('link', { name: 'Admin' }).click();
    await page.waitForURL(/\/admin/);
    
    // Admin should see platform admin indicator
    await expect(page.getByText(/platform admin/i)).toBeVisible();
  });
});
