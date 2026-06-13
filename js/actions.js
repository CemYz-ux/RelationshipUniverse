import { state } from './state.js';
import { buildGraph, rebuildLinks } from './graph.js';
import { saveToStorage } from './storage.js';
import { hidePanel, showPanel } from './sidePanel.js';
import { restartOrRefresh } from './sim.js';

export function removePerson(id) {
  state.nodes      = state.nodes.filter(n => n.id !== id);
  state.extraLinks = state.extraLinks.filter(l => l.source !== id && l.target !== id);
  hidePanel();
  rebuildLinks();
  buildGraph();
  restartOrRefresh(0.5);
  saveToStorage();
}

export function clearAll() {
  if (!confirm('Clear all relationships? This cannot be undone.')) return;
  state.nodes      = [{ id: 'me', name: 'You', type: 'me', location: null, note: '' }];
  state.extraLinks = [];
  hidePanel();
  rebuildLinks();
  buildGraph();
  restartOrRefresh(0.3);
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
    restartOrRefresh(0.2);
    saveToStorage();
  }
  const src = state.nodes.find(n => n.id === sourceId);
  if (src) showPanel({ stopPropagation: () => {} }, src);
}

export function mergePerson(primaryId, secondaryId) {
  // Redirect all links that reference secondary → primary
  state.extraLinks = state.extraLinks.map(l => ({
    source: l.source === secondaryId ? primaryId : l.source,
    target: l.target === secondaryId ? primaryId : l.target,
  }));
  // Remove self-links and duplicates introduced by the redirect
  const seen = new Set();
  state.extraLinks = state.extraLinks.filter(l => {
    if (l.source === l.target) return false;
    const key = [l.source, l.target].sort().join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  state.nodes = state.nodes.filter(n => n.id !== secondaryId);
  hidePanel();
  rebuildLinks();
  buildGraph();
  restartOrRefresh(0.5);
  saveToStorage();
}

export function removeExtraLink(idA, idB) {
  state.extraLinks = state.extraLinks.filter(l =>
    !((l.source === idA && l.target === idB) || (l.source === idB && l.target === idA))
  );
  rebuildLinks();
  buildGraph();
  restartOrRefresh(0.2);
  saveToStorage();
  const d = state.nodes.find(n => n.id === idA);
  if (d) showPanel({ stopPropagation: () => {} }, d);
}
