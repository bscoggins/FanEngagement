import { test, expect } from '@playwright/test';
import { clearAuthState, loginThroughUi, waitForVisible } from './utils';

const MEMBER_EMAIL = 'alice@example.com';
const MEMBER_PASSWORD = 'UserDemo1!';
const MOBILE_VIEWPORT = { width: 390, height: 844 };
const SMALL_PHONE_VIEWPORT = { width: 320, height: 568 };
const TABLET_VIEWPORT = { width: 769, height: 1024 };

test.describe('Mobile navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await clearAuthState(page);
    await loginThroughUi(page, MEMBER_EMAIL, MEMBER_PASSWORD);
    await page.goto('/me/home');
  });

  test('hamburger menu opens mobile navigation drawer', async ({ page }) => {
    // On mobile, desktop sidebar should be hidden
    const desktopSidebar = page.getByTestId('unified-sidebar');
    await expect(desktopSidebar).not.toBeVisible();
    
    // Hamburger menu should be visible
    const hamburgerButton = page.getByRole('button', { name: /navigation menu/i });
    await waitForVisible(hamburgerButton);
    
    // Click hamburger to open drawer
    await hamburgerButton.click();
    
    // Drawer should be visible
    const drawer = page.getByRole('navigation', { name: 'Mobile navigation' });
    await waitForVisible(drawer);
    
    // Verify drawer title
    await expect(drawer.getByRole('heading', { name: 'Menu' })).toBeVisible();
  });

  test('mobile drawer shows navigation items', async ({ page }) => {
    const hamburgerButton = page.getByRole('button', { name: /navigation menu/i });
    await hamburgerButton.click();
    
    const drawer = page.getByRole('navigation', { name: 'Mobile navigation' });
    await waitForVisible(drawer);
    
    // Should see navigation links
    await expect(drawer.getByRole('link', { name: 'Home' })).toBeVisible();
    const primaryMyAccountLink = drawer.getByRole('link', { name: 'My Account' }).first();
    await expect(primaryMyAccountLink).toBeVisible();
  });

  test('mobile drawer closes when backdrop is clicked', async ({ page }) => {
    const hamburgerButton = page.getByRole('button', { name: /navigation menu/i });
    await hamburgerButton.click();
    
    const drawer = page.getByRole('navigation', { name: 'Mobile navigation' });
    await waitForVisible(drawer);
    
    // Click backdrop
    const backdrop = page.locator('.mobile-nav-backdrop');
    await backdrop.click({ position: { x: 10, y: 10 }, force: true });
    
    // Drawer should disappear
    await expect(drawer).not.toBeVisible();
  });

  test('mobile drawer closes when close button is clicked', async ({ page }) => {
    const hamburgerButton = page.getByRole('button', { name: /navigation menu/i });
    await hamburgerButton.click();
    
    const drawer = page.getByRole('navigation', { name: 'Mobile navigation' });
    await waitForVisible(drawer);
    
    // Click close button
    const closeButton = page.getByRole('button', { name: 'Close navigation' });
    await closeButton.click();
    
    // Drawer should disappear
    await expect(drawer).not.toBeVisible();
  });

  test('mobile drawer closes when Escape key is pressed', async ({ page }) => {
    const hamburgerButton = page.getByRole('button', { name: /navigation menu/i });
    await hamburgerButton.click();
    
    const drawer = page.getByRole('navigation', { name: 'Mobile navigation' });
    await waitForVisible(drawer);
    
    // Press Escape
    await page.keyboard.press('Escape');
    
    // Drawer should disappear
    await expect(drawer).not.toBeVisible();
  });

  test('mobile drawer closes when navigation link is clicked', async ({ page }) => {
    const hamburgerButton = page.getByRole('button', { name: /navigation menu/i });
    await hamburgerButton.click();
    
    const drawer = page.getByRole('navigation', { name: 'Mobile navigation' });
    await waitForVisible(drawer);
    
    // Click the first My Account link (user scope) to avoid strict-mode clashes with the admin link
    await drawer.getByRole('link', { name: 'My Account' }).first().click();
    
    // Drawer should disappear
    await expect(drawer).not.toBeVisible();
    
    // Should navigate to the clicked page
    await expect(page).toHaveURL(/\/me$/);
  });

  test('mobile drawer shows organization switcher for users with multiple orgs', async ({ page }) => {
    // alice@example.com has multiple org memberships
    const hamburgerButton = page.getByRole('button', { name: /navigation menu/i });
    await hamburgerButton.click();
    
    const drawer = page.getByRole('navigation', { name: 'Mobile navigation' });
    await waitForVisible(drawer);
    
    // Should see organization section
    await expect(drawer.locator('.mobile-nav-org-label')).toBeVisible();
    
    // Should see organization buttons
    await expect(drawer.getByText('Tech Innovators')).toBeVisible();
    await expect(drawer.getByText('Green Energy United')).toBeVisible();
  });

  test('mobile drawer org switcher shows role badges', async ({ page }) => {
    const hamburgerButton = page.getByRole('button', { name: /navigation menu/i });
    await hamburgerButton.click();
    
    const drawer = page.getByRole('navigation', { name: 'Mobile navigation' });
    await waitForVisible(drawer);
    
    // Look for role badges - alice is Admin of Tech Innovators and Member of Green Energy
    const adminBadges = drawer.locator('.mobile-nav-org-badge.admin');
    const memberBadges = drawer.locator('.mobile-nav-org-badge.member');
    
    expect(await adminBadges.count()).toBeGreaterThanOrEqual(1);
    expect(await memberBadges.count()).toBeGreaterThanOrEqual(1);
  });

  test('tapping organization in mobile drawer switches org and closes drawer', async ({ page }) => {
    const hamburgerButton = page.getByRole('button', { name: /navigation menu/i });
    await hamburgerButton.click();
    
    const drawer = page.getByRole('navigation', { name: 'Mobile navigation' });
    await waitForVisible(drawer);
    
    // Switch to Green Energy United (where user is Member)
    const greenEnergyButton = drawer.getByRole('button').filter({ hasText: 'Green Energy United' });
    await greenEnergyButton.click();
    
    // Drawer should close
    await expect(drawer).not.toBeVisible();
    
    // Should navigate to appropriate page based on role
    await page.waitForLoadState('networkidle');
  });

  test('mobile org buttons meet 44px minimum tap target', async ({ page }) => {
    const hamburgerButton = page.getByRole('button', { name: /navigation menu/i });
    await hamburgerButton.click();
    
    const drawer = page.getByRole('navigation', { name: 'Mobile navigation' });
    await waitForVisible(drawer);
    
    // Get an org button
    const orgButton = drawer.getByRole('button').filter({ hasText: 'Tech Innovators' });
    const box = await orgButton.boundingBox();
    
    // Verify minimum height (CSS sets min-height: 44px)
    expect(box?.height).toBeGreaterThanOrEqual(44);
  });

  test('mobile nav links meet 44px minimum tap target', async ({ page }) => {
    const hamburgerButton = page.getByRole('button', { name: /navigation menu/i });
    await hamburgerButton.click();
    
    const drawer = page.getByRole('navigation', { name: 'Mobile navigation' });
    await waitForVisible(drawer);
    
    // Get a nav link
    const homeLink = drawer.getByRole('link', { name: 'Home' });
    await waitForVisible(homeLink);
    const box = await homeLink.boundingBox();
    
    // Verify minimum height (CSS sets min-height: 44px)
    expect(box?.height).toBeGreaterThanOrEqual(44);
  });
});

test.describe('Mobile navigation on small phone', () => {

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(SMALL_PHONE_VIEWPORT);
    await clearAuthState(page);
    await loginThroughUi(page, MEMBER_EMAIL, MEMBER_PASSWORD);
    await page.goto('/me/home');
  });

  test('works on 320px viewport (smallest common mobile)', async ({ page }) => {
    const hamburgerButton = page.getByRole('button', { name: /navigation menu/i });
    await waitForVisible(hamburgerButton);
    
    await hamburgerButton.click();
    
    const drawer = page.getByRole('navigation', { name: 'Mobile navigation' });
    await waitForVisible(drawer);
    
    // Drawer should not overflow screen
    const box = await drawer.boundingBox();
    expect(box?.width).toBeLessThanOrEqual(320);
    
    // Should still show content properly
    await expect(drawer.getByRole('heading', { name: 'Menu' })).toBeVisible();
    await expect(drawer.getByRole('link', { name: 'Home' })).toBeVisible();
  });
});
test.describe('Mobile navigation on tablet', () => {

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(TABLET_VIEWPORT);
    await clearAuthState(page);
    await loginThroughUi(page, MEMBER_EMAIL, MEMBER_PASSWORD);
    await page.goto('/me/home');
  });

  test('above 768px breakpoint, shows desktop sidebar instead of mobile hamburger', async ({ page }) => {
    // At 769px (above max-width: 768px), mobile nav should be hidden, desktop should be visible
    const desktopSidebar = page.getByTestId('unified-sidebar');
    const hamburgerButton = page.getByRole('button', { name: /navigation menu/i });
    
    await waitForVisible(desktopSidebar);
    await expect(hamburgerButton).not.toBeVisible();
  });
});
