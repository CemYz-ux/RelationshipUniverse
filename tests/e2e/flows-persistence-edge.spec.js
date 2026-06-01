import { test, expect } from '@playwright/test';
import { deflateRawSync } from 'zlib';
import { freshPage, clickNode, openSidePanel, addPerson } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await freshPage(page);
});

// ── Flow 16: Persist across sessions ─────────────────────────────────────────

test('Flow 16 — Nodes survive a page reload', async ({ page }) => {
  await addPerson(page, { name: 'Persistent', type: 'friend' });
  await page.reload();
  await page.waitForSelector('.node-group');
  await page.waitForTimeout(300);
  await expect(page.locator('text.node-label').filter({ hasText: /^Persistent$/ })).toBeVisible();
});

test('Flow 16 — Links survive a page reload', async ({ page }) => {
  await addPerson(page, { name: 'Anna', type: 'partner' });
  const before = await page.locator('line.link').count();
  await page.reload();
  await page.waitForSelector('.node-group');
  await page.waitForTimeout(300);
  const after = await page.locator('line.link').count();
  expect(after).toBe(before);
});

test('Flow 16 — Edited node name survives a reload', async ({ page }) => {
  await addPerson(page, { name: 'TempName', type: 'friend' });

  // Edit node
  await clickNode(page, 'TempName');
  await page.locator('#node-bubble').waitFor({ state: 'visible' });
  await page.locator('#nb-info').click();
  await page.locator('#sp-view .btn-tt').filter({ hasText: /Edit/ }).click();
  await page.locator('#edit-name').fill('SavedName');
  await page.locator('.btn-save').click();

  await page.reload();
  await page.waitForSelector('.node-group');
  await page.waitForTimeout(300);
  await expect(page.locator('text.node-label').filter({ hasText: /^SavedName$/ })).toBeVisible();
});

test('Flow 16 — Data is stored under the key "ru-graph"', async ({ page }) => {
  await addPerson(page, { name: 'KeyCheck', type: 'other' });
  const raw = await page.evaluate(() => localStorage.getItem('ru-graph'));
  expect(raw).not.toBeNull();
  const parsed = JSON.parse(raw);
  expect(parsed.nodes.some(n => n.name === 'KeyCheck')).toBe(true);
});

// ── Edge cases ────────────────────────────────────────────────────────────────

test('Edge — Adding a person with no name does nothing', async ({ page }) => {
  const before = await page.locator('.node-group').count();
  await page.locator('#btn-add-main').click();
  const after = await page.locator('.node-group').count();
  expect(after).toBe(before);
});

test('Edge — Self-link is ignored (linking a node to itself)', async ({ page }) => {
  await addPerson(page, { name: 'Solo', type: 'other' });
  const before = await page.locator('line.link').count();

  await clickNode(page, 'Solo');
  await page.locator('#node-bubble').waitFor({ state: 'visible' });
  await page.locator('#nb-link').click();
  // Click the same node again
  await clickNode(page, 'Solo');

  const after = await page.locator('line.link').count();
  expect(after).toBe(before);
});

test('Edge — Duplicate node (same name+location) links to existing instead of creating a new one', async ({ page }) => {
  await addPerson(page, { name: 'Dupe', type: 'friend', location: 'Paris' });
  const countAfterFirst = await page.locator('.node-group').count();

  // Add the same name+location again → should not create a new node
  await page.locator('#name-input').fill('Dupe');
  await page.locator('#location-input').fill('Paris');
  await page.locator('#btn-add-main').click();
  await page.waitForTimeout(300);

  const countAfterSecond = await page.locator('.node-group').count();
  expect(countAfterSecond).toBe(countAfterFirst);
});

test('Edge — Clear all resets graph to a single You node', async ({ page }) => {
  await addPerson(page, { name: 'X', type: 'other' });
  await addPerson(page, { name: 'Y', type: 'other' });

  // Accept the confirm dialog
  page.once('dialog', d => d.accept());
  await page.locator('.btn-io-danger').click();

  await page.waitForTimeout(300);
  await expect(page.locator('text.node-label').filter({ hasText: /^You$/ })).toBeVisible();
  await expect(page.locator('text.node-label').filter({ hasText: /^X$/ })).toHaveCount(0);
  await expect(page.locator('text.node-label').filter({ hasText: /^Y$/ })).toHaveCount(0);
  await expect(page.locator('line.link')).toHaveCount(0);
});

test('Edge — Dismissing Clear all confirm leaves graph intact', async ({ page }) => {
  await addPerson(page, { name: 'KeepMe', type: 'friend' });
  const before = await page.locator('.node-group').count();

  page.once('dialog', d => d.dismiss());
  await page.locator('.btn-io-danger').click();

  await page.waitForTimeout(300);
  const after = await page.locator('.node-group').count();
  expect(after).toBe(before);
  await expect(page.locator('text.node-label').filter({ hasText: /^KeepMe$/ })).toBeVisible();
});

// ── Flow 10 (partial): Import JSON replaces graph ────────────────────────────

test('Flow 10 — Restore JSON loads nodes from a file', async ({ page }) => {
  const json = JSON.stringify({
    version: 3,
    nodes: [
      { id: 'me',    name: 'Imported You', type: 'me',     location: null, note: '' },
      { id: 'node1', name: 'ImportedAlice', type: 'friend', location: null, note: '' },
    ],
    extraLinks: [{ source: 'me', target: 'node1' }],
  });

  // Open overflow menu → Restore JSON
  await page.locator('#io-overflow-btn').click();
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.locator('.overflow-item').filter({ hasText: /Restore JSON/ }).click(),
  ]);
  await fileChooser.setFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(json) });

  // Feedback toast appears
  await expect(page.locator('#import-feedback')).toBeVisible();
  // New nodes appear in the graph
  await expect(page.locator('text.node-label').filter({ hasText: /^ImportedAlice$/ })).toBeVisible();
});

// ── Flow 13 (partial): Import from share URL via hash ────────────────────────

test('Flow 13 — Opening a #share= URL prompts the user and imports on confirm', async ({ page }) => {
  // Build the compact v4 payload in Node.js and compress with zlib.deflateRawSync.
  // Node's deflate-raw is byte-compatible with the browser's DecompressionStream.
  const compact = {
    v: 4,
    n: [{ n: 'Shared You', t: 'me' }, { n: 'SharedBob', t: 'friend' }],
    l: [[0, 1]],
  };
  const compressed = deflateRawSync(Buffer.from(JSON.stringify(compact)));
  const encoded = compressed.toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  // Navigate via about:blank so the app origin gets a full page load
  // (a direct hash change from '/' → '/#share=...' is treated as same-page
  // navigation by the browser, so main.js would not re-run).
  page.once('dialog', d => d.accept());
  await page.goto('about:blank');
  await page.goto(`http://localhost:3000/#share=${encoded}`);
  await page.waitForSelector('.node-group');
  await page.waitForTimeout(800);

  await expect(page.locator('text.node-label').filter({ hasText: /^SharedBob$/ }))
    .toBeVisible({ timeout: 10_000 });
});
