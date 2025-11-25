import { Page, expect } from '@playwright/test';

/**
 * Login as a user with given credentials
 */
export async function loginAs(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Log In' }).click();
  // Wait for login to complete - should redirect away from login page
  await expect(page).not.toHaveURL(/\/login$/);
}

/**
 * Login as admin user (admin@example.com with Admin123!)
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  await loginAs(page, 'admin@example.com', 'Admin123!');
}

/**
 * Logout the current user
 */
export async function logout(page: Page): Promise<void> {
  const logoutButton = page.getByRole('button', { name: 'Logout' });
  if (await logoutButton.isVisible()) {
    await logoutButton.click();
    await page.waitForURL('/login');
  }
}

/**
 * Check if user is logged in by looking for logout button
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  return await page.getByRole('button', { name: 'Logout' }).isVisible();
}
