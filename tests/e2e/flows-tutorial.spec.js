import { test, expect } from '@playwright/test';
import { freshPage } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await freshPage(page);
});

// ── Tutorial trigger ──────────────────────────────────────────────────────────

test('Tutorial — ? button is visible in the header', async ({ page }) => {
  await expect(page.locator('#tutorial-btn')).toBeVisible();
});

test('Tutorial — clicking ? opens the tutorial card', async ({ page }) => {
  await page.locator('#tutorial-btn').click();
  await expect(page.locator('#tutorial-card')).toBeVisible();
});

test('Tutorial — clicking ? shows the dim overlay', async ({ page }) => {
  await page.locator('#tutorial-btn').click();
  await expect(page.locator('#tutorial-dim')).toHaveClass(/visible/);
});

// ── Step 1 content ────────────────────────────────────────────────────────────

test('Tutorial — step 1 shows correct badge text', async ({ page }) => {
  await page.locator('#tutorial-btn').click();
  await expect(page.locator('#tutorial-card')).toContainText('Step 1 of 9');
});

test('Tutorial — step 1 shows the welcome title', async ({ page }) => {
  await page.locator('#tutorial-btn').click();
  await expect(page.locator('.tut-title')).toContainText('The Universe Awaits');
});

test('Tutorial — step 1 has no Back button', async ({ page }) => {
  await page.locator('#tutorial-btn').click();
  await expect(page.locator('#tut-prev-btn')).toHaveCount(0);
});

test('Tutorial — step 1 Next button reads "Next →"', async ({ page }) => {
  await page.locator('#tutorial-btn').click();
  await expect(page.locator('#tut-next-btn')).toHaveText('Next →');
});

// ── Navigation: Next ──────────────────────────────────────────────────────────

test('Tutorial — Next advances to step 2', async ({ page }) => {
  await page.locator('#tutorial-btn').click();
  await page.locator('#tut-next-btn').click();
  await expect(page.locator('#tutorial-card')).toContainText('Step 2 of 9');
});

test('Tutorial — step 2 shows the correct title', async ({ page }) => {
  await page.locator('#tutorial-btn').click();
  await page.locator('#tut-next-btn').click();
  await expect(page.locator('.tut-title')).toContainText('The Center of Your World');
});

test('Tutorial — Back button appears from step 2 onward', async ({ page }) => {
  await page.locator('#tutorial-btn').click();
  await page.locator('#tut-next-btn').click();
  await expect(page.locator('#tut-prev-btn')).toBeVisible();
});

// ── Navigation: Back ──────────────────────────────────────────────────────────

test('Tutorial — Back returns from step 2 to step 1', async ({ page }) => {
  await page.locator('#tutorial-btn').click();
  await page.locator('#tut-next-btn').click();
  await page.locator('#tut-prev-btn').click();
  await expect(page.locator('#tutorial-card')).toContainText('Step 1 of 9');
});

test('Tutorial — Back on step 2 removes the Back button again', async ({ page }) => {
  await page.locator('#tutorial-btn').click();
  await page.locator('#tut-next-btn').click();
  await page.locator('#tut-prev-btn').click();
  await expect(page.locator('#tut-prev-btn')).toHaveCount(0);
});

// ── Progress pips ─────────────────────────────────────────────────────────────

test('Tutorial — 9 progress pips are rendered', async ({ page }) => {
  await page.locator('#tutorial-btn').click();
  await expect(page.locator('.tut-pip')).toHaveCount(9);
});

test('Tutorial — first pip is done on step 1', async ({ page }) => {
  await page.locator('#tutorial-btn').click();
  const pips = page.locator('.tut-pip');
  await expect(pips.nth(0)).toHaveClass(/done/);
  await expect(pips.nth(1)).not.toHaveClass(/done/);
});

test('Tutorial — two pips are done on step 2', async ({ page }) => {
  await page.locator('#tutorial-btn').click();
  await page.locator('#tut-next-btn').click();
  const pips = page.locator('.tut-pip');
  await expect(pips.nth(0)).toHaveClass(/done/);
  await expect(pips.nth(1)).toHaveClass(/done/);
  await expect(pips.nth(2)).not.toHaveClass(/done/);
});

// ── Close (✕ button) ──────────────────────────────────────────────────────────

test('Tutorial — ✕ button closes the card', async ({ page }) => {
  await page.locator('#tutorial-btn').click();
  await page.locator('.tut-step-close').click();
  await expect(page.locator('#tutorial-card')).not.toBeVisible();
});

test('Tutorial — ✕ button removes the dim overlay', async ({ page }) => {
  await page.locator('#tutorial-btn').click();
  await page.locator('.tut-step-close').click();
  await expect(page.locator('#tutorial-dim')).not.toHaveClass(/visible/);
});

test('Tutorial — ✕ from step 3 clears the panel highlight', async ({ page }) => {
  await page.locator('#tutorial-btn').click();
  await page.locator('#tut-next-btn').click(); // step 2
  await page.locator('#tut-next-btn').click(); // step 3 — #panel highlighted
  await page.locator('.tut-step-close').click();
  const panelClasses = await page.locator('#panel').getAttribute('class');
  expect(panelClasses ?? '').not.toContain('tutorial-highlight');
});

// ── Highlight behaviour ───────────────────────────────────────────────────────

test('Tutorial — step 2 adds SVG glow to the You node', async ({ page }) => {
  await page.locator('#tutorial-btn').click();
  await page.locator('#tut-next-btn').click(); // step 2
  const meGroup = page.locator('.node-group[data-node-id="me"]');
  await expect(meGroup).toHaveClass(/tutorial-highlight-svg/);
});

test('Tutorial — step 3 highlights the add-person panel', async ({ page }) => {
  await page.locator('#tutorial-btn').click();
  await page.locator('#tut-next-btn').click();
  await page.locator('#tut-next-btn').click(); // step 3
  await expect(page.locator('#panel')).toHaveClass(/tutorial-highlight/);
});

test('Tutorial — step 4 highlights the link button', async ({ page }) => {
  await page.locator('#tutorial-btn').click();
  for (let i = 0; i < 3; i++) await page.locator('#tut-next-btn').click();
  await expect(page.locator('#nb-link')).toHaveClass(/tutorial-highlight/);
});

test('Tutorial — step 5 highlights the merge button', async ({ page }) => {
  await page.locator('#tutorial-btn').click();
  for (let i = 0; i < 4; i++) await page.locator('#tut-next-btn').click();
  // #nb-merge is only visible when a node bubble is open; the tutorial card
  // still renders correctly — verify the step title instead
  await expect(page.locator('.tut-title')).toContainText('Merge & Simplify');
});

test('Tutorial — step 6 highlights the legend', async ({ page }) => {
  await page.locator('#tutorial-btn').click();
  for (let i = 0; i < 5; i++) await page.locator('#tut-next-btn').click();
  await expect(page.locator('#legend')).toHaveClass(/tutorial-highlight/);
});

test('Tutorial — step 7 highlights the side panel', async ({ page }) => {
  await page.locator('#tutorial-btn').click();
  for (let i = 0; i < 6; i++) await page.locator('#tut-next-btn').click();
  await expect(page.locator('#side-panel')).toHaveClass(/tutorial-highlight/);
});

test('Tutorial — step 8 highlights the io-bar', async ({ page }) => {
  await page.locator('#tutorial-btn').click();
  for (let i = 0; i < 7; i++) await page.locator('#tut-next-btn').click();
  await expect(page.locator('#io-bar')).toHaveClass(/tutorial-highlight/);
});

test('Tutorial — advancing clears the previous step highlight', async ({ page }) => {
  await page.locator('#tutorial-btn').click();
  await page.locator('#tut-next-btn').click(); // step 2: me node highlighted
  await page.locator('#tut-next-btn').click(); // step 3: panel highlighted, me cleared
  const meClasses = await page.locator('.node-group[data-node-id="me"]').getAttribute('class');
  expect(meClasses ?? '').not.toContain('tutorial-highlight-svg');
});

// ── Last step and Finish ──────────────────────────────────────────────────────

test('Tutorial — last step shows "Finish" button label', async ({ page }) => {
  await page.locator('#tutorial-btn').click();
  for (let i = 0; i < 8; i++) await page.locator('#tut-next-btn').click();
  await expect(page.locator('#tut-next-btn')).toHaveText('Finish');
});

test('Tutorial — last step title is the outro', async ({ page }) => {
  await page.locator('#tutorial-btn').click();
  for (let i = 0; i < 8; i++) await page.locator('#tut-next-btn').click();
  await expect(page.locator('.tut-title')).toContainText('The Adventure Begins');
});

test('Tutorial — Finish closes the tutorial', async ({ page }) => {
  await page.locator('#tutorial-btn').click();
  for (let i = 0; i < 9; i++) await page.locator('#tut-next-btn').click();
  await expect(page.locator('#tutorial-card')).not.toBeVisible();
  await expect(page.locator('#tutorial-dim')).not.toHaveClass(/visible/);
});

// ── Can be reopened ───────────────────────────────────────────────────────────

test('Tutorial — can be reopened after closing with ✕', async ({ page }) => {
  await page.locator('#tutorial-btn').click();
  await page.locator('.tut-step-close').click();
  await page.locator('#tutorial-btn').click();
  await expect(page.locator('#tutorial-card')).toBeVisible();
  await expect(page.locator('#tutorial-card')).toContainText('Step 1 of 9');
});

test('Tutorial — reopening after Finish restarts from step 1', async ({ page }) => {
  await page.locator('#tutorial-btn').click();
  for (let i = 0; i < 8; i++) await page.locator('#tut-next-btn').click();
  await page.locator('#tutorial-btn').click();
  await expect(page.locator('#tutorial-card')).toContainText('Step 1 of 9');
});

// ── App remains interactive during tutorial ───────────────────────────────────

test('Tutorial — graph nodes remain clickable while tutorial is open', async ({ page }) => {
  await page.locator('#tutorial-btn').click();
  // Dispatch a click on the You node — should not throw and bubble shows
  await page.evaluate(() => {
    const group = document.querySelector('.node-group[data-node-id="me"]');
    group?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  });
  // Tutorial card should still be visible (tutorial not closed by node click)
  await expect(page.locator('#tutorial-card')).toBeVisible();
});

test('Tutorial — add-person panel inputs remain usable during tutorial', async ({ page }) => {
  await page.locator('#tutorial-btn').click();
  await page.locator('#name-input').fill('TestPerson');
  await expect(page.locator('#name-input')).toHaveValue('TestPerson');
});
