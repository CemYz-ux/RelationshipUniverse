import { state, dom } from './state.js';
import { buildGraph, rebuildLinks } from './graph.js';
import { saveToStorage } from './storage.js';
import { showPanel } from './sidePanel.js';
import { createTypeDropdown } from './typeDropdown.js';
import { attachCitySearch, searchCities } from './geocode.js';
import { restartOrRefresh } from './sim.js';

let editGeocode = null;

const editLocInput    = document.getElementById('edit-location');
const editLocDropdown = document.getElementById('edit-location-dropdown');
attachCitySearch(editLocInput, editLocDropdown, result => { editGeocode = result; });

const editDropdown = createTypeDropdown({
  btnId:   'edit-type-dropdown-btn',
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
  document.getElementById('edit-std-date-text').value = d.stdTestedDate || '';
  document.getElementById('edit-std-date').value      = d.stdTestedDate || '';

  // Restore stored coordinates so saving without re-selecting preserves them.
  editGeocode = (d.lat && d.lng) ? { lat: d.lat, lng: d.lng } : null;

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
  const id = state.selectedNodeId;
  state.editingNodeId  = null;
  state.selectedNodeId = null; // clear so showPanel's toggle doesn't close the panel
  const d = state.nodes.find(n => n.id === id);
  if (d) showPanel({ stopPropagation: () => {} }, d);
}

export async function saveEdit() {
  const d = state.nodes.find(n => n.id === state.editingNodeId);
  if (!d) return;

  d.name     = document.getElementById('edit-name').value.trim()     || d.name;
  if (d.id !== 'me') d.type = editDropdown.getValue() || d.type;
  const newLoc = document.getElementById('edit-location').value.trim() || null;
  if (!newLoc) {
    d.lat = null; d.lng = null;
  } else if (editGeocode) {
    d.lat = editGeocode.lat; d.lng = editGeocode.lng;
  } else {
    // User typed a location without picking from the dropdown — auto-geocode the first result.
    const results = await searchCities(newLoc);
    if (results.length) { d.lat = results[0].lat; d.lng = results[0].lng; }
  }
  d.location = newLoc;
  d.note     = document.getElementById('edit-note').value.trim()     || '';
  d.stdTestedDate = document.getElementById('edit-std-date-text').value.trim() || null;

  dom.spEdit.style.display = 'none';
  dom.spView.style.display = 'block';
  state.editingNodeId = null;

  rebuildLinks();
  buildGraph();
  restartOrRefresh(0.3);
  saveToStorage();

  const id = d.id;
  state.selectedNodeId = null; // clear so showPanel's toggle doesn't close the panel
  const updated = state.nodes.find(n => n.id === id);
  if (updated) showPanel({ stopPropagation: () => {} }, updated);
}

// Calendar icon opens the native date picker; selection syncs to the text input
document.getElementById('std-date-icon').addEventListener('click', () => {
  document.getElementById('edit-std-date').showPicker();
});
document.getElementById('edit-std-date').addEventListener('change', e => {
  document.getElementById('edit-std-date-text').value = e.target.value;
});

// Ctrl+Enter on note field saves; plain Enter inserts newline
document.getElementById('edit-note').addEventListener('keydown', e => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) saveEdit();
});
