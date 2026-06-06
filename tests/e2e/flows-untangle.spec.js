import { test, expect } from '@playwright/test';
import { freshPage, addPerson, linkNodes, clickBackground } from './helpers.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Return {x, y} of a node from its SVG transform:translate(x,y). */
async function nodePos(page, nodeId) {
  return page.evaluate((id) => {
    const g = document.querySelector(`.node-group[data-node-id="${id}"]`);
    if (!g) return null;
    const m = g.getAttribute('transform')?.match(/translate\(([^,]+),([^)]+)\)/);
    if (!m) return null;
    return { x: parseFloat(m[1]), y: parseFloat(m[2]) };
  }, nodeId);
}

/** Return the nodeId of a named node. */
async function nodeId(page, name) {
  return page.evaluate((n) => {
    const labels = document.querySelectorAll('text.node-label');
    for (const el of labels) {
      if (el.textContent.trim() === n) {
        return el.closest('g.node-group')?.getAttribute('data-node-id') ?? null;
      }
    }
    return null;
  }, name);
}

/** Click the Untangle button and wait for the animation to settle. */
async function clickUntangle(page) {
  await page.locator('button[onclick="untangleNodes()"]').click();
  await page.waitForTimeout(1000); // wait for positions + simulation cooldown
}

/** Euclidean distance between two {x,y} points. */
function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe('Untangle button', () => {
  test.beforeEach(async ({ page }) => {
    await freshPage(page);
  });

  test('Untangle button is visible in the toolbar', async ({ page }) => {
    await expect(page.locator('button[onclick="untangleNodes()"]')).toBeVisible();
  });

  test('Untangle button has the correct label', async ({ page }) => {
    await expect(page.locator('button[onclick="untangleNodes()"]')).toContainText('Untangle');
  });

  test('Untangle button has a descriptive title attribute', async ({ page }) => {
    const title = await page.locator('button[onclick="untangleNodes()"]').getAttribute('title');
    expect(title).toBeTruthy();
  });

  test('Clicking Untangle with only the You node does not crash', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await clickUntangle(page);
    expect(errors).toHaveLength(0);
  });
});

test.describe('Untangle — layout behaviour', () => {
  test.beforeEach(async ({ page }) => {
    await freshPage(page);
    await addPerson(page, { name: 'Alice', type: 'friend' });
    await addPerson(page, { name: 'Bob', type: 'partner' });
    await addPerson(page, { name: 'Carol', type: 'friend' });
    await clickBackground(page);
    await page.waitForTimeout(300);
  });

  test('You node stays at the canvas centre after untangle', async ({ page }) => {
    const cx = await page.evaluate(() => document.getElementById('graph-container').offsetWidth / 2);
    const cy = await page.evaluate(() => document.getElementById('graph-container').offsetHeight / 2);

    await clickUntangle(page);

    const meId = await nodeId(page, 'You');
    const pos  = await nodePos(page, meId);
    expect(pos).not.toBeNull();
    // Allow a small tolerance for the simulation settling
    expect(Math.abs(pos.x - cx)).toBeLessThan(5);
    expect(Math.abs(pos.y - cy)).toBeLessThan(5);
  });

  test('All nodes get a position after untangle', async ({ page }) => {
    await clickUntangle(page);
    const allNull = await page.evaluate(() => {
      const groups = document.querySelectorAll('.node-group');
      return [...groups].some(g => !g.getAttribute('transform')?.includes('translate'));
    });
    expect(allNull).toBe(false);
  });

  test('Direct neighbours are placed one ringGap from centre', async ({ page }) => {
    await clickUntangle(page);

    const cx = await page.evaluate(() => document.getElementById('graph-container').offsetWidth / 2);
    const cy = await page.evaluate(() => document.getElementById('graph-container').offsetHeight / 2);

    for (const name of ['Alice', 'Bob', 'Carol']) {
      const id  = await nodeId(page, name);
      const pos = await nodePos(page, id);
      const d   = Math.hypot(pos.x - cx, pos.y - cy);
      // ringGap is 200; allow ±15 px for simulation drift after fx/fy release
      expect(d).toBeGreaterThan(185);
      expect(d).toBeLessThan(215);
    }
  });

  test('Direct neighbours are evenly spread (no two overlap)', async ({ page }) => {
    await clickUntangle(page);

    const ids = await Promise.all(['Alice', 'Bob', 'Carol'].map(n => nodeId(page, n)));
    const positions = await Promise.all(ids.map(id => nodePos(page, id)));

    // Every pair should be at least 80 px apart (nodes are ~40 px radius each)
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        expect(dist(positions[i], positions[j])).toBeGreaterThan(80);
      }
    }
  });

  test('Clicking Untangle multiple times is stable (no crash)', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await clickUntangle(page);
    await clickUntangle(page);
    await clickUntangle(page);
    expect(errors).toHaveLength(0);
  });
});

test.describe('Untangle — connected nodes placed adjacent', () => {
  test('Connected siblings end up closer together than unconnected ones', async ({ page }) => {
    await freshPage(page);

    // Alice and Bob get an extra link between them; Carol is isolated
    await addPerson(page, { name: 'Alice', type: 'friend' });
    await addPerson(page, { name: 'Bob',   type: 'partner' });
    await addPerson(page, { name: 'Carol', type: 'friend' });
    await linkNodes(page, 'Alice', 'Bob');
    await clickBackground(page);
    await page.waitForTimeout(300);

    await clickUntangle(page);

    const cx = await page.evaluate(() => document.getElementById('graph-container').offsetWidth / 2);
    const cy = await page.evaluate(() => document.getElementById('graph-container').offsetHeight / 2);

    const aliceId = await nodeId(page, 'Alice');
    const bobId   = await nodeId(page, 'Bob');
    const carolId = await nodeId(page, 'Carol');

    const aPos = await nodePos(page, aliceId);
    const bPos = await nodePos(page, bobId);
    const cPos = await nodePos(page, carolId);

    // Convert to angles relative to centre
    const angle = p => Math.atan2(p.y - cy, p.x - cx);
    const circularDist = (p, q) => {
      const d = Math.abs(angle(p) - angle(q));
      return Math.min(d, 2 * Math.PI - d);
    };

    const abDist = circularDist(aPos, bPos);   // connected — should be one step
    const acDist = circularDist(aPos, cPos);   // not connected
    const bcDist = circularDist(bPos, cPos);   // not connected

    // Alice and Bob (connected) must be angularly adjacent:
    // their circular distance should be strictly less than the maximum
    // distance to the unconnected Carol.
    expect(abDist).toBeLessThan(Math.max(acDist, bcDist));
  });

  test('Second-degree nodes are placed further from centre than first-degree', async ({ page }) => {
    await freshPage(page);
    await addPerson(page, { name: 'Alice', type: 'friend' });
    await addPerson(page, { name: 'Bob',   type: 'partner' });
    // Bob is added as a child of Alice (connected to Alice, not directly to You)
    await linkNodes(page, 'Alice', 'Bob');
    // Remove the You—Bob link so Bob is only reachable via Alice
    await page.evaluate(() => {
      const data  = JSON.parse(localStorage.getItem('ru-graph'));
      data.extraLinks = data.extraLinks.filter(
        l => !(l.source === 'me' && l.target.startsWith('bob')) &&
             !(l.target === 'me' && l.source.startsWith('bob'))
      );
      localStorage.setItem('ru-graph', JSON.stringify(data));
    });
    await page.reload();
    await page.waitForSelector('.node-group');
    await page.waitForTimeout(300);

    await clickUntangle(page);

    const cx = await page.evaluate(() => document.getElementById('graph-container').offsetWidth / 2);
    const cy = await page.evaluate(() => document.getElementById('graph-container').offsetHeight / 2);

    const aliceId = await nodeId(page, 'Alice');
    const bobId   = await nodeId(page, 'Bob');

    const aPos = await nodePos(page, aliceId);
    const bPos = await nodePos(page, bobId);

    const aDist = Math.hypot(aPos.x - cx, aPos.y - cy);
    const bDist = Math.hypot(bPos.x - cx, bPos.y - cy);

    // Bob (depth 2) should be further from centre than Alice (depth 1)
    expect(bDist).toBeGreaterThan(aDist);
  });
});
