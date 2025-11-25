import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/**
 * E2E Tests: Admin Flow
 * 
 * Tests the key admin user journeys:
 * - Log in as admin
 * - Create an organization
 * - Configure basic org settings
 * - Navigate to Users page and verify user list
 */
test.describe('Admin Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start with a fresh login for each test
    await loginAsAdmin(page);
  });

  test('admin can login and access admin dashboard', async ({ page }) => {
    // Navigate to admin dashboard
    await page.goto('/admin');
    
    // Verify we can see admin dashboard content
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
    
    // Verify admin badge is visible
    await expect(page.getByText('Platform Admin')).toBeVisible();
  });

  test('admin can create an organization', async ({ page }) => {
    // Navigate to organizations management
    await page.goto('/admin/organizations');
    
    // Wait for the page to load
    await expect(page.getByRole('heading', { name: /organization management/i })).toBeVisible();
    
    // Click create organization button
    await page.getByRole('button', { name: /create organization/i }).click();
    
    // Fill in organization details with unique name
    const uniqueOrgName = `E2E Test Org ${Date.now()}`;
    await page.getByLabel('Name').fill(uniqueOrgName);
    await page.getByLabel('Description').fill('An organization created by E2E tests');
    
    // Submit the form
    await page.getByRole('button', { name: /create organization/i }).last().click();
    
    // Should redirect to edit page for the new org
    await page.waitForURL(/\/admin\/organizations\/[^/]+\/edit/);
    
    // Verify we're on the edit page for the new org
    await expect(page.getByText(uniqueOrgName)).toBeVisible();
  });

  test('admin can configure organization settings', async ({ page }) => {
    // First, create an organization
    await page.goto('/admin/organizations');
    await expect(page.getByRole('heading', { name: /organization management/i })).toBeVisible();
    
    await page.getByRole('button', { name: /create organization/i }).click();
    
    const uniqueOrgName = `Config Test Org ${Date.now()}`;
    await page.getByLabel('Name').fill(uniqueOrgName);
    await page.getByLabel('Description').fill('Testing org configuration');
    await page.getByRole('button', { name: /create organization/i }).last().click();
    
    // Wait for redirect to edit page
    await page.waitForURL(/\/admin\/organizations\/[^/]+\/edit/);
    
    // Now update the organization settings
    const updatedName = `${uniqueOrgName} - Updated`;
    await page.getByLabel('Name').fill(updatedName);
    await page.getByLabel('Description').fill('Updated description via E2E test');
    
    // Save changes
    await page.getByRole('button', { name: /save changes/i }).click();
    
    // Verify success message appears
    await expect(page.getByText(/updated successfully|saved/i)).toBeVisible();
    
    // Navigate back to organizations list and verify updated name appears
    await page.goto('/admin/organizations');
    await expect(page.getByText(updatedName)).toBeVisible();
  });

  test('admin can navigate to Users page and view user list', async ({ page }) => {
    // Navigate to admin users page
    await page.goto('/admin/users');
    
    // Verify we're on the users page
    await expect(page.getByRole('heading', { name: /user management/i })).toBeVisible();
    
    // Verify the admin user is in the list
    await expect(page.getByRole('cell', { name: 'admin@example.com' })).toBeVisible();
    
    // Verify table headers are present
    await expect(page.getByRole('columnheader', { name: 'Name' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Email' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Role' })).toBeVisible();
    
    // Verify admin badge for admin user
    const adminRow = page.locator('tr', { has: page.getByText('admin@example.com') });
    await expect(adminRow.getByText('Admin')).toBeVisible();
  });

  test('admin can access all main admin sections via navigation', async ({ page }) => {
    await page.goto('/admin');
    
    // Navigate to Users via sidebar
    await page.getByRole('link', { name: 'Users' }).click();
    await expect(page.getByRole('heading', { name: /user management/i })).toBeVisible();
    
    // Navigate to Organizations via sidebar
    await page.getByRole('link', { name: 'Organizations' }).click();
    await expect(page.getByRole('heading', { name: /organization management/i })).toBeVisible();
    
    // Navigate to Dev Tools via sidebar
    await page.getByRole('link', { name: /dev tools/i }).click();
    await expect(page.getByRole('heading', { name: /developer tools/i })).toBeVisible();
  });

  test('admin can seed development data', async ({ page }) => {
    // Navigate to dev tools
    await page.goto('/admin/dev-tools');
    
    // Click seed button
    await page.getByRole('button', { name: /seed dev data/i }).click();
    
    // Wait for seeding to complete (may take a moment)
    await expect(page.getByText(/success/i)).toBeVisible({ timeout: 30000 });
    
    // Verify the result shows created data counts
    await expect(page.getByText(/organization\(s\) created/i)).toBeVisible();
    await expect(page.getByText(/user\(s\) created/i)).toBeVisible();
  });
});
