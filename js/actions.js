import { state } from './state.js';
import { buildGraph, rebuildLinks, getSimulation } from './graph.js';
import { saveToStorage } from './storage.js';
import { hidePanel, showPanel } from './sidePanel.js';

export function removePerson(id) {
  state.nodes      = state.nodes.filter(n => n.id !== id);
  state.extraLinks = state.extraLinks.filter(l => l.source !== id && l.target !== id);
  hidePanel();
  rebuildLinks();
  buildGraph();
  getSimulation().alpha(0.5).restart();
  saveToStorage();
}

export function clearAll() {
  if (!confirm('Clear all relationships? This cannot be undone.')) return;
  state.nodes      = [{ id: 'me', name: 'You', type: 'me', location: null, note: '' }];
  state.extraLinks = [];
  hidePanel();
  rebuildLinks();
  buildGraph();
  getSimulation().alpha(0.3).restart();
  saveToStorage();
}

export function createExtraLink(sourceId, targetId) {
  const duplicate = state.extraLinks.some(l =>
    (l.source === sourceId && l.target === targetId) ||
    (l.source === targetId && l.target === sourceId)
  );
  if (!duplicate) {
    state.extraLinks.push({ source: sourceId, target: targetId });
    rebuildLinks();
    buildGraph();
    getSimulation().alpha(0.2).restart();
    saveToStorage();
  }
  const src = state.nodes.find(n => n.id === sourceId);
  if (src) showPanel({ stopPropagation: () => {} }, src);
}

export function removeExtraLink(idA, idB) {
  state.extraLinks = state.extraLinks.filter(l =>
    !((l.source === idA && l.target === idB) || (l.source === idB && l.target === idA))
  );
  rebuildLinks();
  buildGraph();
  getSimulation().alpha(0.2).restart();
  saveToStorage();
  const d = state.nodes.find(n => n.id === idA);
  if (d) showPanel({ stopPropagation: () => {} }, d);
}
