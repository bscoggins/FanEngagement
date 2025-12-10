import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { clearAuthState, loginThroughUi, waitForVisible } from './utils';

const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'Admin123!';

// Poll for the theme class to avoid timing flakes while React updates the body element.
const expectBodyTheme = async (page: Page, isDark: boolean) => {
  await expect.poll(async () => {
    return page.evaluate(() => document.body.classList.contains('theme-dark'));
  }).toBe(isDark);
};

test.describe('Theme preference persistence', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page);
    await loginThroughUi(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto('/me');
    await waitForVisible(page.getByRole('heading', { name: 'My Account' }));
  });

  test('toggling dark mode updates body class and survives reload', async ({ page }) => {
    const darkButton = page.getByTestId('theme-dark-button');
    const lightButton = page.getByTestId('theme-light-button');
    const ensureLightMode = async () => {
      if ((await darkButton.getAttribute('aria-pressed')) === 'true') {
        await lightButton.click();
        await expect(lightButton).toHaveAttribute('aria-pressed', 'true');
        await expectBodyTheme(page, false);
      }
    };

    await ensureLightMode();

    await darkButton.click();
    await expect(darkButton).toHaveAttribute('aria-pressed', 'true');
    await expect(lightButton).toHaveAttribute('aria-pressed', 'false');
    await expectBodyTheme(page, true);

    await page.reload();
    await waitForVisible(page.getByRole('heading', { name: 'My Account' }));
    await expect(darkButton).toHaveAttribute('aria-pressed', 'true');
    await expect(lightButton).toHaveAttribute('aria-pressed', 'false');
    await expectBodyTheme(page, true);

    await lightButton.click();
    await expect(lightButton).toHaveAttribute('aria-pressed', 'true');
    await expectBodyTheme(page, false);
  });
});
