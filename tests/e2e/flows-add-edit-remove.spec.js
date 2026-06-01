import { test, expect } from '@playwright/test';
import { freshPage, clickNode, clickBackground, openSidePanel, openEditFor, addPerson, connectToLabel } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await freshPage(page);
});

// ── Flow 1: First-time setup ──────────────────────────────────────────────────

test('Flow 1 — You node is present on first load', async ({ page }) => {
  await expect(page.locator('text.node-label').filter({ hasText: /^You$/ })).toBeVisible();
});

test('Flow 1 — Edit the You node: name and location update in graph', async ({ page }) => {
  await openEditFor(page, 'You');

  await page.locator('#edit-name').fill('Alex');
  await page.locator('#edit-location').fill('Hamburg');
  await page.locator('.btn-save').click();

  // Label in SVG updates
  await expect(page.locator('text.node-label').filter({ hasText: /^Alex$/ })).toBeVisible();
  // Old label is gone
  await expect(page.locator('text.node-label').filter({ hasText: /^You$/ })).toHaveCount(0);
});

test('Flow 1 — Edited You info is shown in the side panel after save', async ({ page }) => {
  await openEditFor(page, 'You');
  await page.locator('#edit-name').fill('Sam');
  await page.locator('#edit-location').fill('Berlin');
  await page.locator('.btn-save').click();

  // Side panel view mode shows the updated values
  await expect(page.locator('#sp-view')).toContainText('Sam');
  await expect(page.locator('#sp-view')).toContainText('Berlin');
});

// ── Flow 2: Add a person connected to You ─────────────────────────────────────

test('Flow 2 — Add panel defaults to "→ You:"', async ({ page }) => {
  expect(await connectToLabel(page)).toBe('→ You:');
});

test('Flow 2 — Adding a person creates a new node in the graph', async ({ page }) => {
  await addPerson(page, { name: 'Alice', type: 'friend' });
  await expect(page.locator('text.node-label').filter({ hasText: /^Alice$/ })).toBeVisible();
});

test('Flow 2 — Adding a person creates a link from You', async ({ page }) => {
  const before = await page.locator('line.link').count();
  await addPerson(page, { name: 'Bob', type: 'partner' });
  const after = await page.locator('line.link').count();
  expect(after).toBe(before + 1);
});

test('Flow 2 — Add panel resets after adding a person', async ({ page }) => {
  await addPerson(page, { name: 'Clara', type: 'friend' });
  await expect(page.locator('#name-input')).toHaveValue('');
  await expect(page.locator('#location-input')).toHaveValue('');
});

test('Flow 2 — Multiple people can be added in sequence', async ({ page }) => {
  await addPerson(page, { name: 'Dave', type: 'friend' });
  await addPerson(page, { name: 'Eve', type: 'partner' });
  await expect(page.locator('text.node-label').filter({ hasText: /^Dave$/ })).toBeVisible();
  await expect(page.locator('text.node-label').filter({ hasText: /^Eve$/ })).toBeVisible();
});

// ── Flow 3: Add a person connected to an existing node ────────────────────────

test('Flow 3 — Clicking a node updates the connect-to label', async ({ page }) => {
  await addPerson(page, { name: 'Max', type: 'friend' });
  await clickNode(page, 'Max');
  await expect(page.locator('#connect-to-label')).toHaveText('→ Max:');
});

test('Flow 3 — Clicking background resets connect-to label to You', async ({ page }) => {
  await addPerson(page, { name: 'Max', type: 'friend' });
  await clickNode(page, 'Max');
  await expect(page.locator('#connect-to-label')).toHaveText('→ Max:');
  await clickBackground(page);
  await expect(page.locator('#connect-to-label')).toHaveText('→ You:');
});

// ── Flow 6: Edit a node ───────────────────────────────────────────────────────

test('Flow 6 — Edit name and type; side panel returns to view mode', async ({ page }) => {
  await addPerson(page, { name: 'Linda', type: 'friend' });

  await openEditFor(page, 'Linda');
  await page.locator('#edit-name').fill('Linda K');
  // Change type to "dating"
  await page.locator('#edit-type-dropdown .type-dropdown-btn').click();
  await page.locator('#edit-type-menu .td-option[data-value="dating"]').click();
  await page.locator('.btn-save').click();

  await expect(page.locator('text.node-label').filter({ hasText: /^Linda K$/ })).toBeVisible();
  await expect(page.locator('#sp-view')).toContainText('Dating');
});

test('Flow 6 — Edit note; note appears in side panel view', async ({ page }) => {
  await addPerson(page, { name: 'Carl', type: 'friend' });
  await openEditFor(page, 'Carl');
  await page.locator('#edit-note').fill('met at a conference');
  await page.locator('.btn-save').click();
  await expect(page.locator('#sp-view')).toContainText('met at a conference');
});

test('Flow 6 — Cancel edit returns to view mode without changes', async ({ page }) => {
  await addPerson(page, { name: 'Nina', type: 'friend' });
  await openEditFor(page, 'Nina');
  await page.locator('#edit-name').fill('Changed');
  await page.locator('.btn-cancel-edit').click();

  await expect(page.locator('#sp-view')).toBeVisible();
  // Original name still in the graph
  await expect(page.locator('text.node-label').filter({ hasText: /^Nina$/ })).toBeVisible();
});

test('Flow 6 — Ctrl+Enter in note field saves the edit', async ({ page }) => {
  await addPerson(page, { name: 'Petra', type: 'friend' });
  await openEditFor(page, 'Petra');
  await page.locator('#edit-note').fill('keyboard save');
  await page.locator('#edit-note').press('Control+Enter');
  await expect(page.locator('#sp-view')).toContainText('keyboard save');
});

// ── Flow 7: Remove a node ─────────────────────────────────────────────────────

test('Flow 7 — Removing a node deletes it from the graph', async ({ page }) => {
  await addPerson(page, { name: 'Tom', type: 'other' });
  await openSidePanel(page, 'Tom');
  await page.locator('#sp-view .btn-tt-danger').click();

  await expect(page.locator('text.node-label').filter({ hasText: /^Tom$/ })).toHaveCount(0);
});

test('Flow 7 — Removing a node also removes its connections', async ({ page }) => {
  await addPerson(page, { name: 'Zara', type: 'friend' });
  const before = await page.locator('line.link').count();

  await openSidePanel(page, 'Zara');
  await page.locator('#sp-view .btn-tt-danger').click();

  const after = await page.locator('line.link').count();
  expect(after).toBe(before - 1);
});
