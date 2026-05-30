import { state, dom } from './state.js';
import { loadFromStorage, saveToStorage, exportJSON, importJSON, importNetworkJSON, triggerNetworkImport } from './storage.js';
import { buildGraph, rebuildLinks, getSimulation, svg, updateDimensions, setNodeClickHandler, setDragStartCallback } from './graph.js';
import { showPanel, hidePanel } from './sidePanel.js';
import { openEdit, cancelEdit, saveEdit, editDropdown } from './editPanel.js';
import { addPerson, startConnectMode, cancelConnectMode, addDropdown } from './addPanel.js';
import { removePerson, clearAll, createExtraLink, removeExtraLink } from './actions.js';
import { startLinkPickMode, cancelLinkPickMode, handleLinkPickClick } from './linkMode.js';
import { showBubble, hideBubble } from './bubble.js';

setNodeClickHandler((e, d) => {
  if (state.linkPickMode) {
    if (d.id !== state.linkPickMode) handleLinkPickClick(d.id);
    return;
  }
  showBubble(e, d);
});

setDragStartCallback(() => hideBubble());

// ── SVG background click ──────────────────────────────────────────────────────

svg.on('click', () => {
  if (state.linkPickMode) { cancelLinkPickMode(); return; }
  hideBubble();
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
  // Edit panel
  openEdit, cancelEdit, saveEdit,
  // Add panel
  addPerson, cancelConnectMode,
  // Side panel actions
  startConnectMode, startLinkPickMode, cancelLinkPickMode,
  removePerson, clearAll,
  removeExtraLink, createExtraLink,
  // Storage
  exportJSON, triggerNetworkImport,
  // Type dropdowns (called via onclick in HTML)
  toggleTypeDropdown:     e => addDropdown.toggle(e),
  selectType:             v => addDropdown.select(v),
  toggleEditTypeDropdown: e => editDropdown.toggle(e),
  selectEditType:         v => editDropdown.select(v),
});

// ── Close dropdowns on outside click ─────────────────────────────────────────

document.addEventListener('click', () => {
  if (addDropdown.isOpen())  addDropdown.close();
  if (editDropdown.isOpen()) editDropdown.close();
});

// ── File input wiring ─────────────────────────────────────────────────────────

document.getElementById('import-input').addEventListener('change', importJSON);
document.getElementById('import-network-input').addEventListener('change', importNetworkJSON);

// ── Init ──────────────────────────────────────────────────────────────────────

loadFromStorage();
rebuildLinks();
buildGraph();
