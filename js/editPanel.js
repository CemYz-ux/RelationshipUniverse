import { state, dom } from './state.js';
import { buildGraph, rebuildLinks, getSimulation } from './graph.js';
import { saveToStorage } from './storage.js';
import { showPanel } from './sidePanel.js';
import { createTypeDropdown } from './typeDropdown.js';

const editDropdown = createTypeDropdown({
  menuId:  'edit-type-menu',
  dotId:   'edit-type-dot',
  labelId: 'edit-type-label',
  inputId: 'edit-type',
  fixed:   true
});

export { editDropdown };

export function openEdit(id) {
  const d = state.nodes.find(n => n.id === id);
  if (!d) return;
  state.editingNodeId = id;

  document.getElementById('edit-title').textContent = `Editing ${d.name}`;
  document.getElementById('edit-name').value         = d.name;
  document.getElementById('edit-location').value     = d.location || '';
  document.getElementById('edit-note').value         = d.note     || '';

  editDropdown.select(d.type || 'other');
  const dd = document.getElementById('edit-type-dropdown');
  dd.style.opacity       = id === 'me' ? '0.4' : '1';
  dd.style.pointerEvents = id === 'me' ? 'none' : '';

  dom.spView.style.display = 'none';
  dom.spEdit.style.display = 'block';
}

export function cancelEdit() {
  dom.spEdit.style.display = 'none';
  dom.spView.style.display = 'block';
  state.editingNodeId = null;
  const d = state.nodes.find(n => n.id === state.selectedNodeId);
  if (d) showPanel({ stopPropagation: () => {} }, d);
}

export function saveEdit() {
  const d = state.nodes.find(n => n.id === state.editingNodeId);
  if (!d) return;

  d.name     = document.getElementById('edit-name').value.trim()     || d.name;
  if (d.id !== 'me') d.type = editDropdown.getValue() || d.type;
  d.location = document.getElementById('edit-location').value.trim() || null;
  d.note     = document.getElementById('edit-note').value.trim()     || '';

  dom.spEdit.style.display = 'none';
  dom.spView.style.display = 'block';
  state.editingNodeId = null;

  rebuildLinks();
  buildGraph();
  getSimulation().alpha(0.3).restart();
  saveToStorage();

  const updated = state.nodes.find(n => n.id === d.id);
  if (updated) showPanel({ stopPropagation: () => {} }, updated);
}

// Ctrl+Enter on note field saves; plain Enter inserts newline
document.getElementById('edit-note').addEventListener('keydown', e => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) saveEdit();
});
