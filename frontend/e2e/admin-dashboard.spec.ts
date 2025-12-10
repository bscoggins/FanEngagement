import { expect, test, type Page } from '@playwright/test';
import { clearAuthState, loginThroughUi, waitForVisible } from './utils';

const ORG_ADMIN_EMAIL = 'alice@example.com';
const ORG_ADMIN_PASSWORD = 'UserDemo1!';
const GLOBAL_ADMIN_EMAIL = 'admin@example.com';
const GLOBAL_ADMIN_PASSWORD = 'Admin123!';
const ORG_ADMIN_DEFAULT_ORG = 'Tech Innovators';

const statTestIds = [
  'members-stat-card',
  'share-types-stat-card',
  'active-proposals-stat-card',
  'webhook-failures-stat-card',
];

const panelTestIds = [
  'recent-activity-card',
  'governance-card',
  'org-admin-contacts-card',
  'org-admin-access-card',
];

const expectStatCardToShowData = async (page: Page, testId: string) => {
  const card = page.getByTestId(testId);
  await waitForVisible(card);
  await expect(card).toContainText(/\d|\u2014/); // Wait until card renders server data
};

test.describe('Organization admin dashboard experience', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page);
  });

  test('Org admin sees stats, quick actions, and key panels', async ({ page }) => {
    await loginThroughUi(page, ORG_ADMIN_EMAIL, ORG_ADMIN_PASSWORD);
    const dashboard = page.getByTestId('org-admin-dashboard');
    await waitForVisible(dashboard);

    const overviewCard = page.getByTestId('organization-overview-card');
    await waitForVisible(overviewCard);
    await expect(overviewCard).toContainText(ORG_ADMIN_DEFAULT_ORG);

    for (const statId of statTestIds) {
      await expectStatCardToShowData(page, statId);
    }

    const quickActionGrid = page.getByTestId('quick-actions-grid');
    await waitForVisible(quickActionGrid);
    const manageMembersCard = page.getByTestId('manage-members-card');
    await waitForVisible(manageMembersCard);
    await manageMembersCard.click();
    await waitForVisible(page.getByRole('heading', { name: /Memberships/i }));

    await page.goto('/admin');
    await waitForVisible(dashboard);

    for (const panelId of panelTestIds) {
      await waitForVisible(page.getByTestId(panelId));
    }
  });

  test('Platform admin can jump back to platform dashboard from org admin view', async ({ page }) => {
    await loginThroughUi(page, GLOBAL_ADMIN_EMAIL, GLOBAL_ADMIN_PASSWORD);
    await page.goto('/admin');
    await waitForVisible(page.getByRole('heading', { name: 'Admin Dashboard' }));

    const shortcutLink = page.getByRole('link', { name: 'Platform Admin Dashboard' });
    await waitForVisible(shortcutLink);
    await shortcutLink.click();

    await waitForVisible(page.getByRole('heading', { name: 'Platform Overview' }));
  });
});
