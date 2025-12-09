import { test, expect } from '@playwright/test';
import { clearAuthState, loginThroughUi, waitForVisible } from './utils';

const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'Admin123!';
const MEMBER_EMAIL = 'alice@example.com';
const MEMBER_PASSWORD = 'UserDemo1!';

test.describe('Top navigation visibility by role', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page);
  });

  test('Platform Admin lands on platform admin dashboard with full access', async ({ page }) => {
    await loginThroughUi(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    // Verify platform admin dashboard displayed
    await waitForVisible(page.getByRole('heading', { name: 'Platform Overview' }));
    
    // Direct navigation to Users page should be accessible for platform admin
    await page.goto('/admin/users');
    await waitForVisible(page.getByTestId('users-heading'));
    
    // Platform admin should also be able to access organizations
    await page.goto('/admin/organizations');
    await waitForVisible(page.getByRole('heading', { name: 'Organization Management' }));
  });

  test('Regular Member does not see Admin or Users links in header', async ({ page }) => {
    await loginThroughUi(page, MEMBER_EMAIL, MEMBER_PASSWORD);

    // Member lands on landing page; ensure forbidden links are hidden (header links may be removed)
    const nav = page.locator('header .nav');
    await expect(nav.getByRole('link', { name: 'Admin' })).toHaveCount(0);
    await expect(nav.getByRole('link', { name: 'Users' })).toHaveCount(0);
    
    // Attempting to access admin Users should be disallowed for regular members
    await page.goto('/admin/users');
    await expect(page).not.toHaveURL('/admin/users');
  });

  test('OrgAdmin (non-platform) can access /admin but not Platform Admin Dashboard', async ({ page }) => {
    // alice@example.com is seeded as OrgAdmin for Tech Innovators
    await loginThroughUi(page, MEMBER_EMAIL, MEMBER_PASSWORD);
    
    // OrgAdmins land on /admin and should see the admin dashboard
    await expect(page).toHaveURL(/\/admin/);
    await waitForVisible(page.getByRole('heading', { name: 'Admin Dashboard' }));
    
    // Platform admin dashboard should be forbidden; ensure navigation fails or redirects
    await page.goto('/platform-admin/dashboard');
    await expect(page).not.toHaveURL('/platform-admin/dashboard');
  });

  test('Platform Admin does not see organization dropdown in header', async ({ page }) => {
    await loginThroughUi(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    
    // Wait for page to be fully loaded
    await waitForVisible(page.getByRole('heading', { name: 'FanEngagement Platform Admin' }));
    
    // Platform admin should not see organization selector in header
    await expect(page.getByTestId('admin-header-org-selector')).not.toBeVisible();
    await expect(page.getByTestId('unified-header-org-selector')).not.toBeVisible();
  });

  test('OrgAdmin sees organization dropdown in header', async ({ page }) => {
    await loginThroughUi(page, MEMBER_EMAIL, MEMBER_PASSWORD);
    
    // Wait for admin dashboard to load
    await waitForVisible(page.getByRole('heading', { name: 'Admin Dashboard' }));
    
    // OrgAdmin should see organization selector in header (not sidebar)
    await waitForVisible(page.getByTestId('admin-header-org-selector'));
    
    // OrgAdmin should see "Org Admin" badge in header
    await waitForVisible(page.getByTestId('org-admin-badge'));
    await expect(page.getByTestId('org-admin-badge')).toHaveText('Org Admin');
  });

  test('User with organization access sees dropdown in unified layout', async ({ page }) => {
    await loginThroughUi(page, MEMBER_EMAIL, MEMBER_PASSWORD);
    
    // Navigate to member home to see unified layout
    await page.goto('/me/home');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // User should see organization selector in unified header
    await waitForVisible(page.getByTestId('unified-header-org-selector'));
    
    // OrgAdmin should see "Org Admin" badge in unified header
    await waitForVisible(page.getByTestId('org-admin-badge'));
    await expect(page.getByTestId('org-admin-badge')).toHaveText('Org Admin');
  });

  test('OrgAdmin switching to member org hides Administration section and redirects to member view', async ({ page }) => {
    // alice@example.com is OrgAdmin of "Tech Innovators" and Member of "Green Energy United"
    await loginThroughUi(page, MEMBER_EMAIL, MEMBER_PASSWORD);
    
    // Should land on admin dashboard (alice is OrgAdmin for Tech Innovators by default)
    await expect(page).toHaveURL(/\/admin/);
    await waitForVisible(page.getByRole('heading', { name: 'Admin Dashboard' }));
    
    // Should see Administration section in sidebar
    await expect(page.getByText('Administration', { exact: true })).toBeVisible();
    
    // Switch to Green Energy United (where alice is a Member)
    const dropdownButton = page.getByTestId('admin-header-org-selector-button');
    await dropdownButton.click();
    const memberOption = page.getByRole('menuitemradio', { name: /Green Energy United/i });
    const memberOrgPattern = /\/me\/organizations\/[^/]+$/;
    await Promise.all([
      page.waitForURL(memberOrgPattern),
      memberOption.click(),
    ]);
    await page.waitForLoadState('networkidle');
    const memberOrgUrl = await page.url();
    
    // Administration section should NOT be visible in the unified layout sidebar
    await expect(page.getByText('Administration', { exact: true })).not.toBeVisible();
    
    // Verify we're on the member organization view
    await waitForVisible(page.getByRole('heading', { name: 'Green Energy United' }));
    
    // Navigate to admin path - should redirect to member dashboard
    await page.goto('/admin');
    
    // Should be redirected back to the member org view rather than member home
    await page.waitForURL(memberOrgUrl);
    await waitForVisible(page.getByRole('heading', { name: 'Green Energy United' }));
    
    // Administration section should still NOT be visible (we're viewing Green Energy United as Member)
    await expect(page.getByText('Administration', { exact: true })).not.toBeVisible();
  });
});
