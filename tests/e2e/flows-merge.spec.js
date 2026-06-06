import { test, expect } from '@playwright/test';
import { freshPage, clickNode, clickBackground, addPerson, linkNodes, openSidePanel } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await freshPage(page);
  await addPerson(page, { name: 'Alice', type: 'partner' });
  await addPerson(page, { name: 'Bob', type: 'friend' });
  await clickBackground(page);
  await page.waitForTimeout(200);
});

// ── Bubble button ─────────────────────────────────────────────────────────────

test('Flow 5 — Merge button is visible in bubble for non-me nodes', async ({ page }) => {
  await clickNode(page, 'Alice');
  await page.locator('#node-bubble').waitFor({ state: 'visible' });
  await expect(page.locator('#nb-merge')).toBeVisible();
});

test('Flow 5 — Merge button is visible in bubble for the You node', async ({ page }) => {
  await clickNode(page, 'You');
  await page.locator('#node-bubble').waitFor({ state: 'visible' });
  await expect(page.locator('#nb-merge')).toBeVisible();
});

// ── Merge pick mode ───────────────────────────────────────────────────────────

test('Flow 5 — Clicking merge shows pick-mode instruction in side panel', async ({ page }) => {
  await clickNode(page, 'Alice');
  await page.locator('#node-bubble').waitFor({ state: 'visible' });
  await page.locator('#nb-merge').click();

  await expect(page.locator('#sp-view')).toContainText('Click a node to merge into Alice');
});

test('Flow 5 — Clicking background in merge mode cancels without removing nodes', async ({ page }) => {
  await clickNode(page, 'Alice');
  await page.locator('#node-bubble').waitFor({ state: 'visible' });
  await page.locator('#nb-merge').click();
  await clickBackground(page);

  await expect(page.locator('#side-panel')).not.toHaveClass(/\bvisible\b/);
  await expect(page.locator('text.node-label').filter({ hasText: /^Alice$/ })).toBeAttached();
  await expect(page.locator('text.node-label').filter({ hasText: /^Bob$/ })).toBeAttached();
});

// ── Merge outcome ─────────────────────────────────────────────────────────────

test('Flow 5 — Merging removes the secondary node', async ({ page }) => {
  await clickNode(page, 'Alice');
  await page.locator('#node-bubble').waitFor({ state: 'visible' });
  await page.locator('#nb-merge').click();
  await clickNode(page, 'Bob');
  await page.waitForTimeout(300);

  await expect(page.locator('text.node-label').filter({ hasText: /^Bob$/ })).toHaveCount(0);
});

test('Flow 5 — Merging keeps the primary node', async ({ page }) => {
  await clickNode(page, 'Alice');
  await page.locator('#node-bubble').waitFor({ state: 'visible' });
  await page.locator('#nb-merge').click();
  await clickNode(page, 'Bob');
  await page.waitForTimeout(300);

  await expect(page.locator('text.node-label').filter({ hasText: /^Alice$/ })).toBeAttached();
});

test('Flow 5 — Merging migrates secondary links to primary', async ({ page }) => {
  // Add a third node and link it to Bob only
  await addPerson(page, { name: 'Carl', type: 'friend' });
  await clickBackground(page);
  await linkNodes(page, 'Bob', 'Carl');
  await clickBackground(page);
  await page.waitForTimeout(200);

  // Merge Bob into Alice — Carl's link should transfer to Alice
  await clickNode(page, 'Alice');
  await page.locator('#node-bubble').waitFor({ state: 'visible' });
  await page.locator('#nb-merge').click();
  await clickNode(page, 'Bob');
  await page.waitForTimeout(300);

  // Open Alice's panel and verify Carl is listed as a connection
  await openSidePanel(page, 'Alice');
  await expect(page.locator('#sp-view .tt-conn-chip').filter({ hasText: 'Carl' })).toHaveCount(1);
});

test('Flow 5 — Merging drops duplicate links (primary and secondary both linked to same node)', async ({ page }) => {
  // Add Carl and link both Alice and Bob to him
  await addPerson(page, { name: 'Carl', type: 'friend' });
  await clickBackground(page);
  await linkNodes(page, 'Alice', 'Carl');
  await clickBackground(page);
  await page.waitForTimeout(100);
  await linkNodes(page, 'Bob', 'Carl');
  await clickBackground(page);
  await page.waitForTimeout(200);

  const before = await page.locator('line.link').count();

  // Merge Bob into Alice — Carl link should not be duplicated
  await clickNode(page, 'Alice');
  await page.locator('#node-bubble').waitFor({ state: 'visible' });
  await page.locator('#nb-merge').click();
  await clickNode(page, 'Bob');
  await page.waitForTimeout(300);

  // Net change: Bob's node removed (-1 link for Bob→You or Bob→Carl at minimum),
  // Carl link deduplicated. Just verify Carl chip appears exactly once.
  await openSidePanel(page, 'Alice');
  await expect(page.locator('#sp-view .tt-conn-chip').filter({ hasText: 'Carl' })).toHaveCount(1);
});

// ── "You" node constraints ────────────────────────────────────────────────────

test('Flow 5 — You can initiate merge and absorb another node', async ({ page }) => {
  await clickNode(page, 'You');
  await page.locator('#node-bubble').waitFor({ state: 'visible' });
  await page.locator('#nb-merge').click();
  await clickNode(page, 'Alice');
  await page.waitForTimeout(300);

  await expect(page.locator('text.node-label').filter({ hasText: /^Alice$/ })).toHaveCount(0);
  await expect(page.locator('text.node-label').filter({ hasText: /^You$/ })).toBeAttached();
});

test('Flow 5 — You cannot be absorbed (clicking You as merge target is ignored)', async ({ page }) => {
  await clickNode(page, 'Alice');
  await page.locator('#node-bubble').waitFor({ state: 'visible' });
  await page.locator('#nb-merge').click();

  // Try to pick You as the secondary — should be ignored
  await clickNode(page, 'You');
  await page.waitForTimeout(300);

  // Both nodes should still exist
  await expect(page.locator('text.node-label').filter({ hasText: /^Alice$/ })).toBeAttached();
  await expect(page.locator('text.node-label').filter({ hasText: /^You$/ })).toBeAttached();
  // Merge pick mode should still be active (instruction still in panel)
  await expect(page.locator('#sp-view')).toContainText('Click a node to merge into Alice');
});

// ── Persistence ───────────────────────────────────────────────────────────────

test('Flow 5 — Merge result persists after page reload', async ({ page }) => {
  await clickNode(page, 'Alice');
  await page.locator('#node-bubble').waitFor({ state: 'visible' });
  await page.locator('#nb-merge').click();
  await clickNode(page, 'Bob');
  await page.waitForTimeout(300);

  await page.reload();
  await page.waitForSelector('.node-group');
  await page.waitForTimeout(300);

  await expect(page.locator('text.node-label').filter({ hasText: /^Alice$/ })).toBeAttached();
  await expect(page.locator('text.node-label').filter({ hasText: /^Bob$/ })).toHaveCount(0);
});
