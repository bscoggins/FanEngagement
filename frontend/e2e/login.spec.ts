import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page before each test
    await page.goto('/login');
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

    // Wait for navigation to complete
    await page.waitForURL('/users');

    // Verify we're logged in by checking for user info in header
    await expect(page.getByText('Logged in as admin@example.com')).toBeVisible();
    
    // Verify we're on the users page
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible();
    
    // Verify the admin user is listed in the table
    await expect(page.getByRole('cell', { name: 'Admin User' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'admin@example.com' })).toBeVisible();
    
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

    // Verify error message is displayed
    await expect(page.getByText(/invalid email or password/i)).toBeVisible();
    
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

  test('should redirect to users page if already authenticated', async ({ page }) => {
    // First, login
    await page.getByLabel('Email').fill('admin@example.com');
    await page.getByLabel('Password').fill('Admin123!');
    await page.getByRole('button', { name: 'Log In' }).click();
    await page.waitForURL('/users');

    // Now try to visit login page again
    await page.goto('/login');

    // Should be redirected back to users page
    await page.waitForURL('/users');
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible();
  });

  test('should be able to logout after login', async ({ page }) => {
    // First, login
    await page.getByLabel('Email').fill('admin@example.com');
    await page.getByLabel('Password').fill('Admin123!');
    await page.getByRole('button', { name: 'Log In' }).click();
    await page.waitForURL('/users');

    // Click logout button
    await page.getByRole('button', { name: 'Logout' }).click();

    // Should be redirected to login page
    await page.waitForURL('/login');
    await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
  });
});
