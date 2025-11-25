import { test, expect } from '@playwright/test';
import { loginAsAdmin, logout } from './helpers/auth';
import { generateUniqueName } from './helpers/data';

test.describe('Admin Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start each test by logging in as admin
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ page }) => {
    // Logout after each test
    if (await page.getByRole('button', { name: 'Logout' }).isVisible({ timeout: 1000 }).catch(() => false)) {
      await logout(page);
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
    
    // Click on Organizations in sidebar
    await page.getByRole('link', { name: 'Organizations' }).click();
    await page.waitForURL(/\/admin\/organizations/);
    
    // Click create button to show form
    await page.getByRole('button', { name: /create organization/i }).click();
    
    // Fill in organization details
    await page.getByLabel('Name').fill(orgName);
    await page.getByLabel('Description').fill('E2E Test Organization Description');
    
    // Submit the form
    await page.getByRole('button', { name: /create$/i }).click();
    
    // Should navigate to edit page or show success
    // Wait for navigation or success message
    await page.waitForURL(/\/admin\/organizations\/.*\/edit/, { timeout: 10000 });
    
    // Verify organization was created by checking we're on the edit page
    await expect(page.getByRole('heading', { name: /edit organization/i })).toBeVisible();
  });

  test('should configure organization settings', async ({ page }) => {
    const orgName = generateUniqueName('E2E-ConfigOrg');
    
    // First create an organization
    await page.getByRole('link', { name: 'Admin' }).click();
    await page.getByRole('link', { name: 'Organizations' }).click();
    await page.waitForURL(/\/admin\/organizations/);
    
    await page.getByRole('button', { name: /create organization/i }).click();
    await page.getByLabel('Name').fill(orgName);
    await page.getByRole('button', { name: /create$/i }).click();
    
    // Wait for edit page
    await page.waitForURL(/\/admin\/organizations\/.*\/edit/, { timeout: 10000 });
    
    // Update organization name
    const updatedName = `${orgName}-Updated`;
    await page.getByLabel('Name').clear();
    await page.getByLabel('Name').fill(updatedName);
    
    // Update description
    await page.getByLabel('Description').fill('Updated description for E2E test');
    
    // Save changes
    await page.getByRole('button', { name: /save/i }).click();
    
    // Wait for success indication (could be notification or page reload)
    // Check that the changes were saved by verifying the name is still there
    await page.waitForTimeout(1000); // Brief wait for save
    await expect(page.getByLabel('Name')).toHaveValue(updatedName);
  });

  test('should navigate to admin Users page and verify user list', async ({ page }) => {
    // Navigate to admin area
    await page.getByRole('link', { name: 'Admin' }).click();
    await page.waitForURL(/\/admin/);
    
    // Click on Users in sidebar
    await page.getByRole('link', { name: 'Users' }).click();
    await page.waitForURL(/\/admin\/users/);
    
    // Should see Users heading
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible();
    
    // Should see the admin user in the list
    await expect(page.getByText('admin@example.com')).toBeVisible();
    
    // Should see table headers or user list structure
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('should access organization memberships page', async ({ page }) => {
    const orgName = generateUniqueName('E2E-MemberOrg');
    
    // Create an organization first
    await page.getByRole('link', { name: 'Admin' }).click();
    await page.getByRole('link', { name: 'Organizations' }).click();
    await page.waitForURL(/\/admin\/organizations/);
    
    await page.getByRole('button', { name: /create organization/i }).click();
    await page.getByLabel('Name').fill(orgName);
    await page.getByRole('button', { name: /create$/i }).click();
    
    // Wait for edit page
    await page.waitForURL(/\/admin\/organizations\/.*\/edit/, { timeout: 10000 });
    
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
    await page.getByRole('link', { name: 'Organizations' }).click();
    await page.waitForURL(/\/admin\/organizations/);
    
    await page.getByRole('button', { name: /create organization/i }).click();
    await page.getByLabel('Name').fill(orgName);
    await page.getByRole('button', { name: /create$/i }).click();
    
    // Wait for edit page
    await page.waitForURL(/\/admin\/organizations\/.*\/edit/, { timeout: 10000 });
    
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
