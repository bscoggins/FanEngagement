import { test, expect, type Page } from '@playwright/test';
import { loginViaApi, seedDevData } from './utils';

const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'Admin123!';
const MEMBER_EMAIL = 'alice@example.com';
const MEMBER_PASSWORD = 'UserDemo1!';

async function loginThroughUi(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Log In' }).click();
  // Wait for redirect to complete (platform admins go to /platform-admin, org admins go to /admin, members go to /me/home)
  await page.waitForURL(/\/(platform-admin|admin|me\/home)/);
}

test.describe('Top navigation visibility by role', () => {
  test.beforeAll(async ({ request }) => {
    const { token } = await loginViaApi(request, ADMIN_EMAIL, ADMIN_PASSWORD);
    await seedDevData(request, token);
  });

  test.beforeEach(async ({ page }) => {
    // Ensure clean auth state
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.context().clearCookies();
    await page.reload();
  });

  test('Platform Admin lands on platform admin dashboard with full access', async ({ page }) => {
    await loginThroughUi(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    // Verify platform admin dashboard displayed
    await expect(page.getByRole('heading', { name: 'Platform Overview' })).toBeVisible();
    
    // Direct navigation to Users page should be accessible for platform admin
    await page.goto('/admin/users');
    await expect(page.getByTestId('users-heading')).toBeVisible();
    
    // Platform admin should also be able to access organizations
    await page.goto('/admin/organizations');
    await expect(page.getByRole('heading', { name: 'Organization Management' })).toBeVisible();
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
    await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible({ timeout: 10000 });
    
    // Platform admin dashboard should be forbidden; ensure navigation fails or redirects
    await page.goto('/platform-admin/dashboard');
    await expect(page).not.toHaveURL('/platform-admin/dashboard');
  });

  test('Platform Admin does not see organization dropdown in header', async ({ page }) => {
    await loginThroughUi(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    
    // Platform admin should not see organization selector in header
    await expect(page.getByTestId('admin-header-org-selector')).not.toBeVisible();
    await expect(page.getByTestId('unified-header-org-selector')).not.toBeVisible();
    
    // Should see platform admin badge
    await expect(page.getByText('Platform Admin')).toBeVisible();
  });

  test('OrgAdmin sees organization dropdown in header', async ({ page }) => {
    await loginThroughUi(page, MEMBER_EMAIL, MEMBER_PASSWORD);
    
    // OrgAdmin should see organization selector in header (not sidebar)
    await expect(page.getByTestId('admin-header-org-selector')).toBeVisible();
  });

  test('User with organization access sees dropdown in unified layout', async ({ page }) => {
    await loginThroughUi(page, MEMBER_EMAIL, MEMBER_PASSWORD);
    
    // Navigate to member home to see unified layout
    await page.goto('/me/home');
    
    // User should see organization selector in unified header
    await expect(page.getByTestId('unified-header-org-selector')).toBeVisible();
  });
});
