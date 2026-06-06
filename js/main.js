import { state, dom } from './state.js';
import { loadFromStorage, saveToStorage, exportJSON, importJSON, importNetworkJSON, triggerNetworkImport, shareAsURL, checkShareURL, importNetworkFromURL } from './storage.js';
import { showQRCode, hideQRCode, showImportModal, hideImportModal, importFromURLInput } from './qr.js';
import { buildGraph, rebuildLinks, getSimulation, svg, updateDimensions, setNodeClickHandler, setDragStartCallback } from './graph.js';
import { showPanel, hidePanel } from './sidePanel.js';
import { openEdit, cancelEdit, saveEdit, editDropdown } from './editPanel.js';
import { addPerson, startConnectMode, cancelConnectMode, addDropdown } from './addPanel.js';
import { removePerson, clearAll, createExtraLink, removeExtraLink } from './actions.js';
import { startLinkPickMode, cancelLinkPickMode, handleLinkPickClick } from './linkMode.js';
import { startMergePickMode, cancelMergePickMode, handleMergePickClick } from './mergeMode.js';
import { showBubble, hideBubble } from './bubble.js';
import './tutorial.js';

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

// ── Expose globals for inline onclick handlers ────────────────────────────────

Object.assign(window, {
  openEdit, cancelEdit, saveEdit,
  addPerson, cancelConnectMode,
  startConnectMode, startLinkPickMode, cancelLinkPickMode,
  removePerson, clearAll,
  cancelMergePickMode,
  removeExtraLink, createExtraLink,
  exportJSON, triggerNetworkImport, shareAsURL,
  showQRCode, hideQRCode,
  showImportModal, hideImportModal, importFromURLInput,
  importFromURL: (nodeId) => {
    const url = document.getElementById('sp-url-input')?.value?.trim();
    if (url) importNetworkFromURL(nodeId, url);
  },
  toggleTypeDropdown:     e => addDropdown.toggle(e),
  selectType:             v => addDropdown.select(v),
  toggleEditTypeDropdown: e => editDropdown.toggle(e),
  selectEditType:         v => editDropdown.select(v),
});

// ── Overflow menu ─────────────────────────────────────────────────────────────

function toggleOverflowMenu(e) {
  e.stopPropagation();
  document.getElementById('io-overflow-menu').classList.toggle('open');
}

function closeOverflowMenu() {
  document.getElementById('io-overflow-menu').classList.remove('open');
}

function togglePanelOverflow(e) {
  e.stopPropagation();
  e.currentTarget.closest('.tt-overflow').querySelector('.tt-overflow-menu').classList.toggle('open');
}

function closePanelOverflow() {
  document.querySelectorAll('.tt-overflow-menu.open').forEach(m => m.classList.remove('open'));
}

Object.assign(window, { toggleOverflowMenu, closeOverflowMenu, togglePanelOverflow, closePanelOverflow });

// ── Close dropdowns and menus on outside click ────────────────────────────────

document.addEventListener('click', () => {
  if (addDropdown.isOpen())  addDropdown.close();
  if (editDropdown.isOpen()) editDropdown.close();
  closeOverflowMenu();
  closePanelOverflow();
});

// ── File input wiring ─────────────────────────────────────────────────────────

document.getElementById('import-input').addEventListener('change', importJSON);
document.getElementById('import-network-input').addEventListener('change', importNetworkJSON);

// ── Init ──────────────────────────────────────────────────────────────────────

loadFromStorage();
rebuildLinks();
buildGraph();
checkShareURL();
