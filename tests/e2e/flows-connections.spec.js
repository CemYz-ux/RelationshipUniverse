import { test, expect } from '@playwright/test';
import { freshPage, clickNode, clickBackground, openSidePanel, addPerson, linkNodes } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await freshPage(page);
  await addPerson(page, { name: 'Linda', type: 'friend' });
  await addPerson(page, { name: 'Carl', type: 'partner' });
  await clickBackground(page);
  await page.waitForTimeout(200);
});

// ── Flow 4: Link two existing nodes ──────────────────────────────────────────

test('Flow 4 — Link mode shows instruction in side panel', async ({ page }) => {
  await clickNode(page, 'Linda');
  await page.locator('#node-bubble').waitFor({ state: 'visible' });
  await page.locator('#nb-link').click();

  await expect(page.locator('#sp-view')).toContainText('Click any other node to link it to Linda');
});

test('Flow 4 — Linking two nodes creates a new connection', async ({ page }) => {
  const before = await page.locator('line.link').count();

  await clickNode(page, 'Linda');
  await page.locator('#node-bubble').waitFor({ state: 'visible' });
  await page.locator('#nb-link').click();
  await clickNode(page, 'Carl');

  const after = await page.locator('line.link').count();
  expect(after).toBe(before + 1);
});

test('Flow 4 — Carl appears as a connection chip in Linda\'s side panel', async ({ page }) => {
  await linkNodes(page, 'Linda', 'Carl');
  // There may be multiple chips (e.g. "You" and "Carl") — filter to Carl's chip
  await expect(page.locator('#sp-view .tt-conn-chip').filter({ hasText: 'Carl' })).toHaveCount(1);
});

test('Flow 4 — Clicking background in link mode cancels the operation', async ({ page }) => {
  const before = await page.locator('line.link').count();

  await clickNode(page, 'Linda');
  await page.locator('#node-bubble').waitFor({ state: 'visible' });
  await page.locator('#nb-link').click();
  await clickBackground(page);

  const after = await page.locator('line.link').count();
  expect(after).toBe(before);
  // The panel hides via opacity:0 (no display:none), so check the class instead
  await expect(page.locator('#side-panel')).not.toHaveClass(/\bvisible\b/);
});

// ── Flow 5: Remove a connection ───────────────────────────────────────────────

test('Flow 5 — Removing a connection decreases link count', async ({ page }) => {
  await linkNodes(page, 'Linda', 'Carl');
  const before = await page.locator('line.link').count();

  await page.locator('#sp-view .tt-conn-chip').filter({ hasText: 'Carl' })
            .locator('.tt-conn-remove').click();

  const after = await page.locator('line.link').count();
  expect(after).toBe(before - 1);
});

test('Flow 5 — Both nodes remain after a connection is removed', async ({ page }) => {
  await linkNodes(page, 'Linda', 'Carl');

  await page.locator('#sp-view .tt-conn-chip').filter({ hasText: 'Carl' })
            .locator('.tt-conn-remove').click();

  await expect(page.locator('text.node-label').filter({ hasText: /^Linda$/ })).toBeVisible();
  await expect(page.locator('text.node-label').filter({ hasText: /^Carl$/ })).toBeVisible();
});

test('Flow 5 — Carl chip is absent when Linda\'s panel is reopened after removing connection', async ({ page }) => {
  await linkNodes(page, 'Linda', 'Carl');

  await page.locator('#sp-view .tt-conn-chip').filter({ hasText: 'Carl' })
            .locator('.tt-conn-remove').click();

  // Reopen Linda's side panel and verify Carl no longer appears in connections
  await openSidePanel(page, 'Linda');
  await expect(page.locator('#sp-view .tt-conn-chip').filter({ hasText: 'Carl' })).toHaveCount(0);
});
