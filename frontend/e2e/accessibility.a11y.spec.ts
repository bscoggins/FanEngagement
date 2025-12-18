import type { AxeResults } from 'axe-core';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { clearAuthState, loginThroughUi, waitForVisible } from './utils';

// Store raw axe-core results alongside Playwright artifacts for CI uploads
const ACCESSIBILITY_REPORTS_DIR = path.join(process.cwd(), 'test-results', 'a11y');
const BLOCKING_IMPACTS = ['critical', 'serious'] as const;

type AxeViolation = AxeResults['violations'][number];

const writeA11yReport = async (name: string, results: AxeResults) => {
  await fs.mkdir(ACCESSIBILITY_REPORTS_DIR, { recursive: true });
  const filePath = path.join(ACCESSIBILITY_REPORTS_DIR, `${name}.json`);
  await fs.writeFile(filePath, JSON.stringify(results, null, 2));
};

const formatViolations = (violations: AxeViolation[]) =>
  violations
    .map(
      (violation) =>
        `${violation.id} (${violation.impact}) - ${violation.help}\n` +
        violation.nodes.map((node) => `  Targets: ${node.target.join(' ')}`).join('\n'),
    )
    .join('\n\n');

const isBlockingImpact = (impact: string | null): impact is (typeof BLOCKING_IMPACTS)[number] =>
  BLOCKING_IMPACTS.some((level) => level === impact);

const runAxeScan = async (name: string, page: Page) => {
  await page.waitForLoadState('networkidle');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();

  await writeA11yReport(name, results);

  const blockingViolations = results.violations.filter((violation) =>
    isBlockingImpact(violation.impact),
  );

  expect(blockingViolations, formatViolations(blockingViolations)).toEqual([]);
};

test.describe('Accessibility sweeps', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page);
  });

  test('login page has no critical violations', async ({ page }) => {
    await page.goto('/login');
    await runAxeScan('login', page);
  });

  test('platform admin dashboard has no critical violations', async ({ page }) => {
    await loginThroughUi(page, 'admin@example.com', 'Admin123!');
    const heading = page.getByRole('heading', { name: /Admin Dashboard/i });
    await waitForVisible(heading);

    await runAxeScan('platform-admin-dashboard', page);
  });

  test('organizations list has no critical violations', async ({ page }) => {
    await loginThroughUi(page, 'admin@example.com', 'Admin123!');
    await page.goto('/admin/organizations');
    await waitForVisible(page.getByRole('heading', { name: /Organizations/i }));

    await runAxeScan('admin-organizations', page);
  });
});
