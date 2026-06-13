import { state, dom } from './state.js';
import { loadFromStorage, exportJSON, importJSON, importNetworkJSON, triggerNetworkImport, shareAsURL, checkShareURL } from './storage.js';
import { showQRCode, hideQRCode, showImportModal, hideImportModal, importFromURLInput } from './qr.js';
import { buildGraph, rebuildLinks, getSimulation, svg, updateDimensions, setNodeClickHandler, setDragStartCallback, setZoomCallback, untangleNodes } from './graph.js';
import { hidePanel } from './sidePanel.js';
import { openEdit, cancelEdit, saveEdit, editDropdown } from './editPanel.js';
import { addPerson, startConnectMode, cancelConnectMode, addDropdown } from './addPanel.js';
import { removePerson, clearAll, removeExtraLink } from './actions.js';
import { cancelLinkPickMode, handleLinkPickClick } from './linkMode.js';
import { cancelMergePickMode, handleMergePickClick } from './mergeMode.js';
import { showBubble, hideBubble } from './bubble.js';
import { toggleMapView } from './mapView.js';
import { startTutorial } from './tutorial.js';
import { RELATIONSHIP_TYPES } from './constants.js';
import { getColor, capitalize } from './helpers.js';

// ── Node click handler ────────────────────────────────────────────────────────

setNodeClickHandler((e, d) => {
  if (state.linkPickMode) {
    if (d.id !== state.linkPickMode) handleLinkPickClick(d.id);
    return;
  }
  if (state.mergePickMode) {
    if (d.id !== state.mergePickMode) handleMergePickClick(d.id);
    return;
  }
  // Show bubble for edit/link/info AND activate connect mode for this node
  showBubble(e, d);
  startConnectMode(d.id, d.name);
});

setDragStartCallback(() => {
  hideBubble();
  cancelConnectMode();
});

setZoomCallback(e => {
  // Only hide on genuine user gestures (scroll/pinch/pan), not programmatic zooms
  // triggered by viewport resize (e.g. mobile keyboard opening).
  if (e.sourceEvent) hideBubble();
});

// ── SVG background click ──────────────────────────────────────────────────────

svg.on('click', () => {
  if (state.linkPickMode)  { cancelLinkPickMode();  return; }
  if (state.mergePickMode) { cancelMergePickMode(); return; }
  hideBubble();
  cancelConnectMode();
  hidePanel();
});

// ── Resize ────────────────────────────────────────────────────────────────────

window.addEventListener('resize', () => {
  updateDimensions();
  const me = state.nodes.find(n => n.id === 'me');
  if (me) { me.fx = dom.container.offsetWidth / 2; me.fy = dom.container.offsetHeight / 2; }
  getSimulation()?.alpha(0.3).restart();
});

// ── Overflow menus ────────────────────────────────────────────────────────────

function toggleOverflowMenu() {
  document.getElementById('io-overflow-menu').classList.toggle('open');
}

function closeOverflowMenu() {
  document.getElementById('io-overflow-menu').classList.remove('open');
}

function togglePanelOverflow(el) {
  el.closest('.tt-overflow').querySelector('.tt-overflow-menu').classList.toggle('open');
}

function closePanelOverflow() {
  document.querySelectorAll('.tt-overflow-menu.open').forEach(m => m.classList.remove('open'));
}

// ── Declarative click actions ─────────────────────────────────────────────────
// Elements opt in with data-action="name" (plus data-* arguments). A single
// delegated listener dispatches to the matching handler, so the markup carries no
// inline JS and dynamically-rendered HTML works without per-render wiring.
// Handlers receive (element, event).

const ACTIONS = {
  startTutorial,
  untangleNodes,
  shareAsURL,
  showQRCode,
  clearAll,
  exportJSON,
  restoreJSON:    () => document.getElementById('import-input').click(),
  toggleOverflowMenu,
  toggleMapView,
  addPerson,
  cancelEdit,
  saveEdit,
  cancelLinkPickMode,
  cancelMergePickMode,
  importFromURLInput,

  // Arguments are read from data-* attributes on the clicked element.
  openEdit:             el => openEdit(el.dataset.id),
  removePerson:         el => removePerson(el.dataset.id),
  showImportModal:      el => showImportModal(el.dataset.id),
  triggerNetworkImport: el => triggerNetworkImport(el.dataset.id),
  removeExtraLink:      el => removeExtraLink(el.dataset.idA, el.dataset.idB),
  togglePanelOverflow:  el => togglePanelOverflow(el),

  // Backdrop / close: only fire when the click lands on the element itself, so a
  // click inside the modal card is ignored (replaces the old stopPropagation).
  hideQRCode:      (el, e) => { if (e.target === el) hideQRCode(); },
  hideImportModal: (el, e) => { if (e.target === el) hideImportModal(); },
};

document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const handler = ACTIONS[el.dataset.action];
  if (handler) handler(el, e);
});

// ── Close dropdowns and menus on outside click ────────────────────────────────
// A menu stays open only while its own trigger button is clicked; any other click
// closes it.

document.addEventListener('click', e => {
  if (addDropdown.isOpen())  addDropdown.close();
  if (editDropdown.isOpen()) editDropdown.close();
  if (!e.target.closest('#io-overflow-btn')) closeOverflowMenu();
  if (!e.target.closest('.tt-overflow-btn')) closePanelOverflow();
});

// ── Test hooks ────────────────────────────────────────────────────────────────
// The e2e suite cancels interaction modes directly because synthetic SVG clicks
// can be swallowed by the D3 zoom layer. These are the only globals we expose.
Object.assign(window, { cancelConnectMode, cancelLinkPickMode });

// ── File input wiring ─────────────────────────────────────────────────────────

document.getElementById('import-input').addEventListener('change', importJSON);
document.getElementById('import-network-input').addEventListener('change', importNetworkJSON);

// ── Legend (generated from the relationship-type constants) ──────────────────

function renderLegend() {
  document.getElementById('legend').innerHTML = RELATIONSHIP_TYPES.map(t =>
    `<div class="legend-item"><div class="legend-dot" style="background:${getColor(t)}"></div>${capitalize(t)}</div>`
  ).join('');
}

// ── Init ──────────────────────────────────────────────────────────────────────

renderLegend();
loadFromStorage();
rebuildLinks();
buildGraph();
checkShareURL();
