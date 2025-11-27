import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate first so storage APIs are available on our origin
    await page.goto('/login');
    // Clear any persisted auth state to avoid redirects between tests
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.context().clearCookies();
    await page.reload();
  });

  test('should display login form', async ({ page }) => {
    // Verify login page elements are visible
    await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Log In' })).toBeVisible();
  });

  test('should successfully login with admin credentials', async ({ page }) => {
    // Fill in the login form
    await page.getByLabel('Email').fill('admin@example.com');
    await page.getByLabel('Password').fill('Admin123!');

    // Submit the form
    await page.getByRole('button', { name: 'Log In' }).click();

    // Wait for navigation to complete (admins now go to /admin dashboard)
    await page.waitForURL('/admin');

    // Verify we're logged in by checking for user info in header
    await expect(page.getByText('Logged in as admin@example.com')).toBeVisible();
    
    // Verify we're on the admin dashboard
    await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible();
    
    // Verify logout button is present
    await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
  });

  test('should show error message for invalid credentials', async ({ page }) => {
    // Fill in the login form with invalid credentials
    await page.getByLabel('Email').fill('wrong@example.com');
    await page.getByLabel('Password').fill('WrongPassword123!');

    // Submit the form
    await page.getByRole('button', { name: 'Log In' }).click();

    // Wait for error message to appear (handled by expect below)

    // Verify error message is displayed (inline alert or toast)
    await expect(page.getByTestId('login-error')).toHaveText(/invalid email or password/i);
    
    // Verify we're still on the login page
    expect(page.url()).toContain('/login');
  });

  test('should show loading state while logging in', async ({ page }) => {
    // Fill in the login form
    await page.getByLabel('Email').fill('admin@example.com');
    await page.getByLabel('Password').fill('Admin123!');

    // Click the login button
    const loginButton = page.getByRole('button', { name: 'Log In' });
    await loginButton.click();

    // Check for loading state (button should show "Logging in...")
    await expect(page.getByText(/logging in/i)).toBeVisible();
  });

  test('should redirect to admin dashboard if already authenticated', async ({ page }) => {
    // First, login
    await page.getByLabel('Email').fill('admin@example.com');
    await page.getByLabel('Password').fill('Admin123!');
    await page.getByRole('button', { name: 'Log In' }).click();
    await page.waitForURL('/admin');

    // Now try to visit login page again
    await page.goto('/login');

    // Should be redirected back to admin dashboard
    await page.waitForURL('/admin');
    await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible();
  });

  test('should be able to logout after login', async ({ page }) => {
    // First, login
    await page.getByLabel('Email').fill('admin@example.com');
    await page.getByLabel('Password').fill('Admin123!');
    await page.getByRole('button', { name: 'Log In' }).click();
    await page.waitForURL('/admin');

    // Click logout button
    await page.getByRole('button', { name: 'Logout' }).click();

    // Should be redirected to login page
    await page.waitForURL('/login');
    await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
  });
});
