/**
 * Shared helpers for Playwright E2E tests.
 * All functions accept a `page` object as the first argument.
 */

/** Clear saved state and load a fresh graph. */
export async function freshPage(page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.removeItem('ru-graph'));
  await page.reload();
  await page.waitForSelector('.node-group');
  // Give the D3 simulation a tick to place nodes
  await page.waitForTimeout(300);
}

/**
 * Click a graph node by its display name.
 *
 * D3 nodes are SVG <g class="node-group"> elements positioned via
 * transform:translate(x,y). Playwright's coordinate-based click can't
 * reliably target them, so we dispatch a synthetic MouseEvent directly on
 * the node group (where D3 attached the click handler).
 */
export async function clickNode(page, name) {
  // Wait for the label to exist in the DOM first
  await page.locator('text.node-label').filter({ hasText: new RegExp(`^${name}$`) })
            .waitFor({ state: 'attached' });

  const found = await page.evaluate((nodeName) => {
    const labels = document.querySelectorAll('text.node-label');
    for (const el of labels) {
      if (el.textContent.trim() === nodeName) {
        // Dispatch directly on the node group so D3's handler receives __data__
        const group = el.closest('g.node-group');
        const target = group ?? el;
        target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        return true;
      }
    }
    return false;
  }, name);

  if (!found) throw new Error(`Node not found in graph: "${name}"`);
}

/**
 * Simulate clicking the SVG background (cancel connect/link mode, close panel).
 *
 * The app's SVG background click handler (in main.js) is a D3 event listener.
 * Synthetic DOM events can be blocked by the D3 zoom layer, so we call the
 * exposed window functions directly for reliability.
 */
export async function clickBackground(page) {
  await page.evaluate(() => {
    // Cancel whichever mode is currently active
    if (window.cancelLinkPickMode) window.cancelLinkPickMode();
    window.cancelConnectMode?.();
    // Also dispatch the DOM event so any other listeners fire
    document.getElementById('svg').dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true })
    );
  });
}

/**
 * Create a link between two nodes via the link-pick UI, then reopen the source
 * node's side panel so subsequent assertions about connections are reliable.
 *
 * After createExtraLink() the app calls showPanel(src) but the panel is already
 * open on src (from startLinkPickMode), so the toggle logic closes it. Callers
 * that need to inspect the side panel after linking should use this helper.
 */
export async function linkNodes(page, sourceName, targetName) {
  await clickNode(page, sourceName);
  await page.locator('#node-bubble').waitFor({ state: 'visible' });
  await page.locator('#nb-link').click();
  await clickNode(page, targetName);
  // Reopen the source panel so connection chips are visible
  await openSidePanel(page, sourceName);
}

/**
 * Open the side-panel for a node:
 *   click node → bubble appears → click ✎ → side panel in view mode.
 */
export async function openSidePanel(page, name) {
  await clickNode(page, name);
  await page.locator('#node-bubble').waitFor({ state: 'visible' });
  await page.locator('#nb-info').click();
  await page.locator('#side-panel').waitFor({ state: 'visible' });
}

/**
 * Open the edit form for a node.
 * Assumes the side panel is already open in view mode.
 */
export async function openEditForm(page, name) {
  const editBtn = page.locator('#sp-view .btn-tt').filter({ hasText: /Edit/ });
  await editBtn.click();
  await page.locator('#sp-edit').waitFor({ state: 'visible' });
}

/**
 * Full shortcut: open side panel then immediately open edit form.
 */
export async function openEditFor(page, name) {
  await openSidePanel(page, name);
  await openEditForm(page, name);
}

/** Fill the add-person panel and submit. */
export async function addPerson(page, { name, type = 'partner', location = '' } = {}) {
  await page.locator('#name-input').fill(name);
  if (location) await page.locator('#location-input').fill(location);
  if (type !== 'partner') {
    await page.locator('#type-dropdown .type-dropdown-btn').click();
    await page.locator(`#type-menu .td-option[data-value="${type}"]`).click();
  }
  await page.locator('#btn-add-main').click();
  // Wait for the new node to appear in the SVG
  await page.locator('text.node-label').filter({ hasText: new RegExp(`^${name}$`) }).waitFor({ state: 'attached' });
}

/** Return the text content of the connect-to label (e.g. "→ You:"). */
export async function connectToLabel(page) {
  return page.locator('#connect-to-label').textContent();
}

/** Count how many link lines currently exist in the SVG. */
export async function linkCount(page) {
  return page.locator('line.link').count();
}
