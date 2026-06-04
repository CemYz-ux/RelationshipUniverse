import { test, expect } from '@playwright/test';
import { freshPage, addPerson, openSidePanel, openEditFor } from './helpers.js';

// Dispatch a click on a selector via JS — bypasses SVG pointer-event intercept.
async function clickViaJS(page, selector) {
  await page.evaluate((sel) => document.querySelector(sel)?.click(), selector);
}

// Opens the side panel then dispatches a JS click on the Edit button — avoids
// the SVG pointer-event intercept that affects repeated panel opens in the same test.
async function openEditViaJS(page, name) {
  await openSidePanel(page, name);
  await page.evaluate((n) => {
    for (const btn of document.querySelectorAll('#sp-view button')) {
      if (btn.textContent.includes(`Edit ${n}`)) { btn.click(); return; }
    }
  }, name);
  await page.locator('#sp-edit').waitFor({ state: 'visible' });
}

// Helper: inject a node with a pre-set stdTestedDate directly into localStorage,
// then reload so the graph renders it with the correct ring colour.
async function addPersonWithDate(page, name, stdTestedDate) {
  await addPerson(page, { name, type: 'partner' });
  await page.evaluate(({ name, stdTestedDate }) => {
    const raw  = JSON.parse(localStorage.getItem('ru-graph'));
    const node = raw.nodes.find(n => n.name === name);
    if (node) node.stdTestedDate = stdTestedDate;
    localStorage.setItem('ru-graph', JSON.stringify(raw));
  }, { name, stdTestedDate });
  await page.reload();
  await page.waitForSelector('.node-group');
  await page.waitForTimeout(300);
}

// Helper: get the computed stroke colour of the node-std-ring for a named node.
async function getStdRingColor(page, name) {
  return page.evaluate((name) => {
    const labels = document.querySelectorAll('text.node-label');
    for (const el of labels) {
      if (el.textContent.trim() === name) {
        const ring = el.closest('g.node-group')?.querySelector('.node-std-ring');
        return ring ? getComputedStyle(ring).stroke : null;
      }
    }
    return null;
  }, name);
}

test.beforeEach(async ({ page }) => {
  await freshPage(page);
});

// ── Flow 17: Record a test date via the edit form ─────────────────────────────

test('Flow 17 — Last STD tested field is present in edit form (non-You node)', async ({ page }) => {
  await addPerson(page, { name: 'Alice', type: 'partner' });
  await openEditFor(page, 'Alice');
  await expect(page.locator('#edit-std-field')).toBeVisible();
  await expect(page.locator('#edit-std-date-text')).toBeVisible();
});

test('Flow 17 — Last STD tested field is visible when editing the You node', async ({ page }) => {
  await openEditFor(page, 'You');
  await expect(page.locator('#edit-std-field')).toBeVisible();
});

test('Flow 17 — Typing a date and saving shows status in the side panel', async ({ page }) => {
  await addPerson(page, { name: 'Bob', type: 'partner' });
  await openEditFor(page, 'Bob');
  await page.locator('#edit-std-date-text').fill('2026-05-01');
  await page.locator('.btn-save').click();

  // Side panel should display the STD tested row
  await expect(page.locator('#sp-view')).toContainText('STD tested');
  await expect(page.locator('#sp-view')).toContainText('2026-05-01');
});

test('Flow 17 — Saved date persists after a page reload', async ({ page }) => {
  await addPerson(page, { name: 'Carol', type: 'friend' });
  await openEditFor(page, 'Carol');
  await page.locator('#edit-std-date-text').fill('2026-04-10');
  await page.locator('.btn-save').click();

  await page.reload();
  await page.waitForSelector('.node-group');
  await page.waitForTimeout(300);

  await openSidePanel(page, 'Carol');
  await expect(page.locator('#sp-view')).toContainText('2026-04-10');
});

test('Flow 17 — Edit form pre-fills existing STD date when reopened', async ({ page }) => {
  await addPerson(page, { name: 'Dan', type: 'dating' });
  await openEditFor(page, 'Dan');
  await page.locator('#edit-std-date-text').fill('2026-03-15');
  await page.locator('.btn-save').click();

  // Re-open edit form (JS dispatch avoids SVG intercept on repeated opens)
  await openEditViaJS(page, 'Dan');
  await expect(page.locator('#edit-std-date-text')).toHaveValue('2026-03-15');
});

// ── Flow 18: Clear a test date ────────────────────────────────────────────────

test('Flow 18 — Clearing the date removes it from the side panel', async ({ page }) => {
  await addPerson(page, { name: 'Eve', type: 'partner' });
  await openEditFor(page, 'Eve');
  await page.locator('#edit-std-date-text').fill('2026-01-01');
  await page.locator('.btn-save').click();

  // Confirm it's showing
  await expect(page.locator('#sp-view')).toContainText('STD tested');

  // Clear it (JS dispatch avoids SVG intercept on repeated opens)
  await openEditViaJS(page, 'Eve');
  await page.locator('#edit-std-date-text').fill('');
  await clickViaJS(page, '.btn-save');

  // STD row should be gone
  await expect(page.locator('#sp-view')).not.toContainText('STD tested');
});

test('Flow 18 — Clearing the date removes the ring from the node', async ({ page }) => {
  await addPersonWithDate(page, 'Fay', '2026-05-01');

  // Ring should exist
  const ringBefore = await getStdRingColor(page, 'Fay');
  expect(ringBefore).not.toBeNull();

  await openEditViaJS(page, 'Fay');
  await page.locator('#edit-std-date-text').fill('');
  await page.locator('.btn-save').click();

  const ringAfter = await getStdRingColor(page, 'Fay');
  expect(ringAfter).toBeNull();
});

// ── Flow 19: STD ring colour on the graph ─────────────────────────────────────

test('Flow 19 — No ring when STD date is unknown', async ({ page }) => {
  await addPerson(page, { name: 'Greg', type: 'friend' });
  const ring = await getStdRingColor(page, 'Greg');
  expect(ring).toBeNull();
});

test('Flow 19 — Green ring for a date within the last 3 months', async ({ page }) => {
  // Use a date 1 month ago relative to the system clock
  const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 10);
  await addPersonWithDate(page, 'Hana', oneMonthAgo);

  const color = await getStdRingColor(page, 'Hana');
  // #4ade80 → rgb(74, 222, 128)
  expect(color).toBe('rgb(74, 222, 128)');
});

test('Flow 19 — Amber ring for a date 3–6 months ago', async ({ page }) => {
  // 4 months ago
  const fourMonthsAgo = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 10);
  await addPersonWithDate(page, 'Ivan', fourMonthsAgo);

  const color = await getStdRingColor(page, 'Ivan');
  // #fbbf24 → rgb(251, 191, 36)
  expect(color).toBe('rgb(251, 191, 36)');
});

test('Flow 19 — Red ring for a date more than 6 months ago', async ({ page }) => {
  // 8 months ago
  const eightMonthsAgo = new Date(Date.now() - 240 * 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 10);
  await addPersonWithDate(page, 'Jade', eightMonthsAgo);

  const color = await getStdRingColor(page, 'Jade');
  // #f87171 → rgb(248, 113, 113)
  expect(color).toBe('rgb(248, 113, 113)');
});

test('Flow 19 — You node has no ring when no date is set', async ({ page }) => {
  const ring = await getStdRingColor(page, 'You');
  expect(ring).toBeNull();
});

// ── Edge cases ────────────────────────────────────────────────────────────────

test('Edge — Editing other fields does not erase an existing STD date', async ({ page }) => {
  await addPersonWithDate(page, 'Kim', '2026-05-15');

  await openEditFor(page, 'Kim');
  await page.locator('#edit-note').fill('updated note only');
  await page.locator('.btn-save').click();

  await expect(page.locator('#sp-view')).toContainText('2026-05-15');
});

test('Edge — STD date field shows empty placeholder for a new node', async ({ page }) => {
  await addPerson(page, { name: 'Leo', type: 'other' });
  await openEditFor(page, 'Leo');
  await expect(page.locator('#edit-std-date-text')).toHaveValue('');
});
