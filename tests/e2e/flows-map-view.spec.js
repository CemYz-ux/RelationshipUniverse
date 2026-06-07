import { test, expect } from '@playwright/test';
import { freshPage, addPerson, clickBackground } from './helpers.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Toggle the map/graph switch and wait for the animation to settle. */
async function toggleMap(page) {
  await page.locator('#map-switch').click();
  await page.waitForTimeout(900); // animation is 800 ms
}

/** True if the node with the given label is visible (opacity != 0) in the SVG. */
async function nodeIsVisible(page, name) {
  return page.evaluate((n) => {
    const labels = document.querySelectorAll('text.node-label');
    for (const el of labels) {
      if (el.textContent.trim() === n) {
        const group = el.closest('g.node-group');
        const opacity = group?.style?.opacity;
        return opacity !== '0';
      }
    }
    return false;
  }, name);
}

// ── Flow: Toggle on / off ─────────────────────────────────────────────────────

test.describe('Map view toggle', () => {
  test.beforeEach(async ({ page }) => {
    await freshPage(page);
  });

  test('Map switch gains "active" class when switched to map', async ({ page }) => {
    await toggleMap(page);
    await expect(page.locator('#map-switch')).toHaveClass(/\bactive\b/);
  });

  test('Map switch loses "active" class when switched back to graph', async ({ page }) => {
    await toggleMap(page);
    await toggleMap(page);
    await expect(page.locator('#map-switch')).not.toHaveClass(/\bactive\b/);
  });

  test('A .land-layer <g> is inserted into the SVG when map is active', async ({ page }) => {
    await toggleMap(page);
    await expect(page.locator('svg g.land-layer')).toBeAttached();
  });

  test('.land-layer is removed when switching back to graph view', async ({ page }) => {
    await toggleMap(page);
    await toggleMap(page);
    await expect(page.locator('svg g.land-layer')).toHaveCount(0);
  });

  test('The "Map" label is visible in the switch', async ({ page }) => {
    await expect(page.locator('#map-switch').getByText('Map')).toBeVisible();
  });

  test('The "Graph" label is visible in the switch', async ({ page }) => {
    await expect(page.locator('#map-switch').getByText('Graph')).toBeVisible();
  });

  test('Toggling does not throw a JS error', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await toggleMap(page);
    await toggleMap(page);
    expect(errors).toHaveLength(0);
  });
});

// ── Flow: Node visibility in map view ────────────────────────────────────────

test.describe('Map view — node visibility', () => {
  test.beforeEach(async ({ page }) => {
    await freshPage(page);
    // A node WITH a location → should appear on the map
    await addPerson(page, { name: 'Berlin Node', type: 'friend', location: 'Berlin' });
    // A node WITHOUT a location → should be hidden in map view
    await addPerson(page, { name: 'No Location', type: 'partner' });
    await clickBackground(page);
    await page.waitForTimeout(200);
  });

  test('Node with a location is visible before entering map view', async ({ page }) => {
    expect(await nodeIsVisible(page, 'Berlin Node')).toBe(true);
  });

  test('Node with a location is visible in map view', async ({ page }) => {
    await toggleMap(page);
    expect(await nodeIsVisible(page, 'Berlin Node')).toBe(true);
  });

  test('Node without a location is hidden in map view', async ({ page }) => {
    await toggleMap(page);
    expect(await nodeIsVisible(page, 'No Location')).toBe(false);
  });

  test('Hidden node reappears when returning to graph view', async ({ page }) => {
    await toggleMap(page);
    await toggleMap(page);
    expect(await nodeIsVisible(page, 'No Location')).toBe(true);
  });

  test('All nodes with locations are visible after multiple toggles', async ({ page }) => {
    await toggleMap(page);
    await toggleMap(page);
    await toggleMap(page);
    expect(await nodeIsVisible(page, 'Berlin Node')).toBe(true);
  });
});

// ── Flow: "Not on map" notice ─────────────────────────────────────────────────

test.describe('Map view — not-on-map notice', () => {
  test.beforeEach(async ({ page }) => {
    await freshPage(page);
  });

  test('"Not on map" notice is hidden in graph view', async ({ page }) => {
    await expect(page.locator('#map-no-location')).toBeHidden();
  });

  test('"Not on map" notice shows "You" because the me-node never has coordinates', async ({ page }) => {
    // The "You" (me) node has no lat/lng, so even with all other nodes located,
    // the notice always appears listing at least "You".
    await addPerson(page, { name: 'Paris Node', type: 'friend', location: 'Paris' });
    await toggleMap(page);
    await expect(page.locator('#map-no-location')).toBeVisible();
    await expect(page.locator('#map-nl-list')).toContainText('You');
  });

  test('"Not on map" notice appears when map has locationless non-you nodes', async ({ page }) => {
    await addPerson(page, { name: 'Phantom', type: 'other' }); // no location
    await toggleMap(page);
    await expect(page.locator('#map-no-location')).toBeVisible();
  });

  test('"Not on map" notice lists the name of a locationless node', async ({ page }) => {
    await addPerson(page, { name: 'Ghost', type: 'other' }); // no location
    await toggleMap(page);
    await expect(page.locator('#map-nl-list')).toContainText('Ghost');
  });

  test('"Not on map" notice lists multiple locationless nodes', async ({ page }) => {
    await addPerson(page, { name: 'NodeA', type: 'other' });
    await addPerson(page, { name: 'NodeB', type: 'friend' });
    await toggleMap(page);
    await expect(page.locator('#map-nl-list')).toContainText('NodeA');
    await expect(page.locator('#map-nl-list')).toContainText('NodeB');
  });

  test('"Not on map" notice disappears when returning to graph view', async ({ page }) => {
    await addPerson(page, { name: 'Wanderer', type: 'other' });
    await toggleMap(page);
    await expect(page.locator('#map-no-location')).toBeVisible();
    await toggleMap(page);
    await expect(page.locator('#map-no-location')).toBeHidden();
  });
});

// ── Flow: Node positions on the map ──────────────────────────────────────────

test.describe('Map view — node coordinates', () => {
  test.beforeEach(async ({ page }) => {
    await freshPage(page);
  });

  test('A node with a location gets a non-zero translate transform in map view', async ({ page }) => {
    await addPerson(page, { name: 'Tokyo Node', type: 'friend', location: 'Tokyo' });
    await toggleMap(page);

    const transform = await page.evaluate(() => {
      const labels = document.querySelectorAll('text.node-label');
      for (const el of labels) {
        if (el.textContent.trim() === 'Tokyo Node') {
          return el.closest('g.node-group')?.getAttribute('transform') ?? '';
        }
      }
      return '';
    });

    expect(transform).toMatch(/translate\(/);
    // The translate values should be non-zero (map projected coordinates)
    const m = transform.match(/translate\(([^,]+),([^)]+)\)/);
    expect(m).not.toBeNull();
    const x = parseFloat(m[1]);
    const y = parseFloat(m[2]);
    expect(Math.abs(x) + Math.abs(y)).toBeGreaterThan(0);
  });

  test('Two nodes at the same location stack at the same translate', async ({ page }) => {
    await addPerson(page, { name: 'Hamburg A', type: 'friend',  location: 'Hamburg' });
    await addPerson(page, { name: 'Hamburg B', type: 'partner', location: 'Hamburg' });
    await toggleMap(page);

    const positions = await page.evaluate(() => {
      const result = {};
      document.querySelectorAll('text.node-label').forEach(el => {
        const name = el.textContent.trim();
        if (name === 'Hamburg A' || name === 'Hamburg B') {
          const m = el.closest('g.node-group')?.getAttribute('transform')
            ?.match(/translate\(([^,]+),([^)]+)\)/);
          if (m) result[name] = { x: parseFloat(m[1]), y: parseFloat(m[2]) };
        }
      });
      return result;
    });

    expect(positions['Hamburg A']).toBeDefined();
    expect(positions['Hamburg B']).toBeDefined();
    // Both nodes share the exact same coordinates (no spread)
    expect(positions['Hamburg A'].x).toBeCloseTo(positions['Hamburg B'].x, 5);
    expect(positions['Hamburg A'].y).toBeCloseTo(positions['Hamburg B'].y, 5);
  });
});

// ── Flow: Map-view add panel ──────────────────────────────────────────────────

test.describe('Map view — add panel still works', () => {
  test.beforeEach(async ({ page }) => {
    await freshPage(page);
    await toggleMap(page);
  });

  test('Add panel is visible in map view', async ({ page }) => {
    await expect(page.locator('#panel')).toBeVisible();
  });

  test('Adding a node in map view adds it to the graph (visible after toggling back)', async ({ page }) => {
    await addPerson(page, { name: 'MapAdded', type: 'friend', location: 'Rome' });
    // Toggle back to graph to verify node exists
    await toggleMap(page);
    await expect(page.locator('text.node-label').filter({ hasText: /^MapAdded$/ })).toBeVisible();
  });
});

// ── Flow: Reload resets to graph view ────────────────────────────────────────

test.describe('Map view — not persisted across reload', () => {
  test('Reloading while in map view returns to graph view', async ({ page }) => {
    await freshPage(page);
    await toggleMap(page);
    await expect(page.locator('#map-switch')).toHaveClass(/\bactive\b/);

    await page.reload();
    await page.waitForSelector('.node-group');
    await page.waitForTimeout(300);

    // After reload the map switch should be inactive (graph view is default)
    await expect(page.locator('#map-switch')).not.toHaveClass(/\bactive\b/);
    await expect(page.locator('svg g.land-layer')).toHaveCount(0);
  });
});
