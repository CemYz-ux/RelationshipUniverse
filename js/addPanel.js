import { state } from './state.js';
import { buildGraph, rebuildLinks, getSimulation, width, height } from './graph.js';
import { saveToStorage } from './storage.js';
import { createTypeDropdown } from './typeDropdown.js';
import { nodeKey, linkExists } from './helpers.js';

export const addDropdown = createTypeDropdown({
  menuId:  'type-menu',
  dotId:   'type-dot',
  labelId: 'type-label',
  inputId: 'type-select',
  fixed:   false
});

export function addPerson() {
  const name     = document.getElementById('name-input').value.trim();
  const type     = addDropdown.getValue();
  const location = document.getElementById('location-input').value.trim();
  if (!name) return;

  const fromId   = state.connectMode || 'me';
  const fromNode = state.nodes.find(n => n.id === fromId);

  // If a node with the same name+location already exists, link to it instead
  // of creating a duplicate. Uses nodeKey (name|location) for matching.
  const key      = nodeKey({ name, location: location || null });
  const existing = state.nodes.find(n => n.id !== fromId && nodeKey(n) === key);
  if (existing) {
    if (!linkExists(state.extraLinks, fromId, existing.id)) {
      state.extraLinks.push({ source: fromId, target: existing.id });
      rebuildLinks();
      buildGraph();
      getSimulation().alpha(0.3).restart();
      saveToStorage();
    }
    clearAddPanel();
    cancelConnectMode();
    return;
  }

  const id    = name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
  const angle = Math.random() * 2 * Math.PI;
  const dist  = 200 + Math.random() * 60;
  const px    = (fromNode && fromNode.x) ? fromNode.x : width  / 2;
  const py    = (fromNode && fromNode.y) ? fromNode.y : height / 2;

  state.nodes.push({
    id, name, type,
    location: location || null,
    note: '',
    x: px + Math.cos(angle) * dist,
    y: py + Math.sin(angle) * dist
  });
  state.extraLinks.push({ source: fromId, target: id });

  clearAddPanel();
  cancelConnectMode();
  rebuildLinks();
  buildGraph();
  getSimulation().alpha(0.4).restart();
  saveToStorage();
}

export function startConnectMode(nodeId, nodeName) {
  state.connectMode = nodeId;
  document.getElementById('connect-to-label').textContent = `→ ${nodeName}:`;
  // Only auto-focus on pointer devices — on touch/mobile this opens the keyboard
  // immediately, which pushes the graph and disorients the user.
  if (window.matchMedia('(pointer: fine)').matches) {
    document.getElementById('name-input').focus();
  }
}

export function cancelConnectMode() {
  state.connectMode = null;
  document.getElementById('connect-to-label').textContent = '→ You:';
}

export function clearAddPanel() {
  document.getElementById('name-input').value     = '';
  document.getElementById('location-input').value = '';
  addDropdown.select('partner');
}

// Enter key on inputs
['name-input', 'location-input'].forEach(id => {
  document.getElementById(id).addEventListener('keydown', e => {
    if (e.key === 'Enter') addPerson();
  });
});
