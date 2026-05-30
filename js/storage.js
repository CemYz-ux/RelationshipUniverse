import { STORAGE_KEY } from './constants.js';
import { state } from './state.js';
import { parseNodeArray, extraLinksFromLegacyNodes, nodeKey, linkExists } from './helpers.js';
import { buildGraph, rebuildLinks, getSimulation } from './graph.js';
import { hidePanel } from './sidePanel.js';

// ── Persist ───────────────────────────────────────────────────────────────────

export function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    nodes: state.nodes.map(({ id, name, type, location, note }) =>
      ({ id, name, type, location: location || null, note: note || '' })
    ),
    extraLinks: state.extraLinks
  }));
}

export function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);

    if (Array.isArray(saved)) {
      // Very old format: plain node array with parentId fields
      if (saved.length) {
        state.nodes      = parseNodeArray(saved);
        state.extraLinks = extraLinksFromLegacyNodes(saved);
      }
    } else if (saved && saved.nodes) {
      if (saved.nodes.length) state.nodes = parseNodeArray(saved.nodes);
      state.extraLinks = (Array.isArray(saved.extraLinks) && saved.extraLinks.length)
        ? saved.extraLinks
        : extraLinksFromLegacyNodes(saved.nodes);
    }
  } catch (_) {}
}

// ── Export JSON ───────────────────────────────────────────────────────────────

export function exportJSON() {
  const data = {
    version:  3,
    exported: new Date().toISOString(),
    nodes: state.nodes.map(n => ({
      id:       n.id,
      name:     n.name,
      type:     n.type,
      location: n.location || null,
      note:     n.note     || ''
    })),
    extraLinks: state.extraLinks
  };
  const me       = state.nodes.find(n => n.id === 'me');
  const namePart = (me?.name     || 'You').replace(/\s+/g, '-');
  const locPart  = (me?.location || '').replace(/\s+/g, '-');
  const filename = locPart ? `${namePart}-${locPart}-Network.json` : `${namePart}-Network.json`;

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ── Import JSON (replace) ─────────────────────────────────────────────────────

export function importJSON(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.nodes || !Array.isArray(data.nodes)) throw new Error('Invalid format');

      state.nodes      = parseNodeArray(data.nodes);
      state.extraLinks = (Array.isArray(data.extraLinks) && data.extraLinks.length)
        ? data.extraLinks
        : extraLinksFromLegacyNodes(data.nodes);

      hidePanel();
      rebuildLinks();
      buildGraph();
      getSimulation().alpha(0.8).restart();
      saveToStorage();
      showFeedback('✓ Imported!');
    } catch (err) {
      alert('Could not import: ' + err.message);
    }
    event.target.value = '';
  };
  reader.readAsText(file);
}

// ── Import network JSON (merge) ───────────────────────────────────────────────

export function triggerNetworkImport(nodeId) {
  state.pendingNetworkNodeId = nodeId;
  hidePanel();
  document.getElementById('import-network-input').click();
}

export function importNetworkJSON(event) {
  const file = event.target.files[0];
  if (!file || !state.pendingNetworkNodeId) return;

  const anchorId   = state.pendingNetworkNodeId;
  const anchorNode = state.nodes.find(n => n.id === anchorId);
  if (!anchorNode) return;

  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.nodes || !Array.isArray(data.nodes)) throw new Error('Invalid format');

      const prefix    = anchorId + '_net_' + Date.now() + '_';
      const theirMe   = data.nodes.find(n => n.id === 'me' || n.type === 'me');
      const theirMeId = theirMe ? theirMe.id : null;

      // Build a full ID map: imported ID → our ID
      // Nodes that already exist (matched by name+location) map to the existing node's ID
      // New nodes get a fresh prefixed ID
      const idMap = new Map();
      if (theirMeId) idMap.set(theirMeId, anchorId);

      const newNodes = [];

      data.nodes
        .filter(n => n.id !== theirMeId)
        .forEach(n => {
          const key      = nodeKey(n);
          const existing = state.nodes.find(x => x.id !== 'me' && nodeKey(x) === key);
          if (existing) {
            // Duplicate — map to existing node, no new node created
            idMap.set(n.id, existing.id);
          } else {
            const newId = prefix + n.id;
            idMap.set(n.id, newId);
            newNodes.push({
              id:       newId,
              name:     n.name     || 'Unknown',
              type:     n.type     || 'other',
              location: n.location || null,
              note:     n.note     || ''
            });
          }
        });

      const mapId  = id => idMap.get(id) ?? prefix + id;
      const allIds = new Set([...state.nodes.map(n => n.id), ...newNodes.map(n => n.id)]);

      // Map imported links through idMap so connections involving existing nodes
      // wire up to the correct nodes (e.g. Linda in two networks = same Linda)
      const theirLinks = (Array.isArray(data.extraLinks) && data.extraLinks.length)
        ? data.extraLinks
        : extraLinksFromLegacyNodes(data.nodes);

      const newLinks = theirLinks
        .map(l => ({ source: mapId(l.source), target: mapId(l.target) }))
        .filter(l => l.source !== l.target)
        .filter(l => allIds.has(l.source) && allIds.has(l.target))
        .filter(l => !linkExists(state.extraLinks, l.source, l.target));

      // Ensure each truly new node has at least one connection to the anchor
      newNodes.forEach(n => {
        const angle = Math.random() * 2 * Math.PI;
        const dist  = 130 + Math.random() * 80;
        n.x = (anchorNode.x || 0) + Math.cos(angle) * dist;
        n.y = (anchorNode.y || 0) + Math.sin(angle) * dist;

        if (!linkExists(state.extraLinks, anchorId, n.id) &&
            !newLinks.some(l => (l.source === anchorId && l.target === n.id) ||
                                (l.source === n.id && l.target === anchorId))) {
          newLinks.push({ source: anchorId, target: n.id });
        }
      });

      if (newNodes.length === 0 && newLinks.length === 0) {
        alert('Nothing new to import — all nodes and connections already exist.');
        event.target.value = '';
        return;
      }

      state.nodes      = state.nodes.concat(newNodes);
      state.extraLinks = state.extraLinks.concat(newLinks);
      rebuildLinks();
      buildGraph();
      getSimulation().alpha(0.6).restart();
      saveToStorage();

      const parts = [
        newNodes.length ? `${newNodes.length} new node${newNodes.length > 1 ? 's' : ''}` : '',
        newLinks.length ? `${newLinks.length} new connection${newLinks.length > 1 ? 's' : ''}` : ''
      ].filter(Boolean);
      showFeedback(`✓ Imported ${parts.join(' and ')} from ${anchorNode.name}'s network`);
    } catch (err) {
      alert('Could not import network: ' + err.message);
    }
    event.target.value         = '';
    state.pendingNetworkNodeId = null;
  };
  reader.readAsText(file);
}

// ── Feedback toast ────────────────────────────────────────────────────────────

export function showFeedback(msg) {
  const fb = document.getElementById('import-feedback');
  fb.textContent   = msg;
  fb.style.display = 'block';
  setTimeout(() => { fb.style.display = 'none'; fb.textContent = '✓ Imported!'; }, 3000);
}

