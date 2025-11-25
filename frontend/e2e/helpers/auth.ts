import { Page, expect } from '@playwright/test';

/**
 * Admin credentials for E2E tests
 * These are the default dev seed credentials
 */
export const ADMIN_CREDENTIALS = {
  email: 'admin@example.com',
  password: 'Admin123!',
};

/**
 * Login as admin user
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(ADMIN_CREDENTIALS.email);
  await page.getByLabel('Password').fill(ADMIN_CREDENTIALS.password);
  await page.getByRole('button', { name: 'Log In' }).click();
  
  // Wait for navigation to complete
  await page.waitForURL(/\/(admin|users|me)/);
  
  // Verify we're logged in
  await expect(page.getByText(`Logged in as ${ADMIN_CREDENTIALS.email}`)).toBeVisible();
}

/**
 * Login with custom credentials
 */
export async function loginAs(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Log In' }).click();
  
  // Wait for navigation
  await page.waitForURL(/\/(admin|users|me)/);
}

/**
 * Logout current user
 */
export async function logout(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Logout' }).click();
  await page.waitForURL('/login');
  await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
}

/**
 * Check if user is logged in
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  try {
    await page.getByRole('button', { name: 'Logout' }).waitFor({ timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Navigate to admin area
 */
export async function navigateToAdmin(page: Page): Promise<void> {
  await page.getByRole('link', { name: 'Admin' }).click();
  await page.waitForURL(/\/admin/);
}

/**
 * Navigate to user self-service area
 */
export async function navigateToMyAccount(page: Page): Promise<void> {
  await page.getByRole('link', { name: 'My Account' }).click();
  await page.waitForURL('/me');
}
