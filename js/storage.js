import { STORAGE_KEY } from './constants.js';
import { state } from './state.js';
import { parseNodeArray, extraLinksFromLegacyNodes, nodeKey, linkExists } from './helpers.js';
import { buildGraph, rebuildLinks, getSimulation } from './graph.js';
import { hidePanel } from './sidePanel.js';
import { toCompact, normaliseShareData } from './compress.js';

// ── Persist ───────────────────────────────────────────────────────────────────

export function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    nodes: state.nodes.map(({ id, name, type, location, lat, lng, note, stdTestedDate }) =>
      ({ id, name, type, location: location || null, lat: lat || null, lng: lng || null, note: note || '', stdTestedDate: stdTestedDate || null })
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
      id:            n.id,
      name:          n.name,
      type:          n.type,
      location:      n.location      || null,
      note:          n.note          || '',
      stdTestedDate: n.stdTestedDate || null
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
  const anchorId = state.pendingNetworkNodeId;

  const reader = new FileReader();
  reader.onload = e => {
    try {
      mergeNetworkInto(anchorId, JSON.parse(e.target.result));
    } catch (err) {
      alert('Could not import network: ' + err.message);
    }
    event.target.value         = '';
    state.pendingNetworkNodeId = null;
  };
  reader.readAsText(file);
}

// ── Shared merge algorithm ────────────────────────────────────────────────────
// Merges an imported { nodes, extraLinks } network into the current graph,
// anchored at anchorId (their "me" becomes our anchor node). Existing nodes are
// reused when name+location match; genuinely new nodes get a fresh prefixed ID
// and are placed near the anchor. Returns true if anything was added.
//
// Used by both the file importer (importNetworkJSON) and the URL/QR importer
// (importNetworkFromURL) so the de-duplication and wiring logic lives in one place.
function mergeNetworkInto(anchorId, data) {
  if (!data.nodes || !Array.isArray(data.nodes)) throw new Error('Invalid format');

  const anchorNode = state.nodes.find(n => n.id === anchorId);
  if (!anchorNode) return false;

  const prefix    = anchorId + '_net_' + Date.now() + '_';
  const theirMe   = data.nodes.find(n => n.id === 'me' || n.type === 'me');
  const theirMeId = theirMe ? theirMe.id : null;

  // Build a full ID map: imported ID → our ID.
  // Their "me" maps to the anchor. Nodes that already exist (matched by
  // name+location, including our own 'me') map to the existing node's ID.
  // Everything else gets a fresh prefixed ID.
  const idMap = new Map();
  if (theirMeId) idMap.set(theirMeId, anchorId);

  const newNodes = [];
  data.nodes
    .filter(n => n.id !== theirMeId)
    .forEach(n => {
      const existing = state.nodes.find(x => nodeKey(x) === nodeKey(n));
      if (existing) {
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
  // wire up correctly (e.g. Linda in two networks = same Linda).
  const theirLinks = (Array.isArray(data.extraLinks) && data.extraLinks.length)
    ? data.extraLinks
    : extraLinksFromLegacyNodes(data.nodes);

  const newLinks = theirLinks
    .map(l => ({ source: mapId(l.source), target: mapId(l.target) }))
    .filter(l => l.source !== l.target)
    .filter(l => allIds.has(l.source) && allIds.has(l.target))
    .filter(l => !linkExists(state.extraLinks, l.source, l.target));

  // Place new nodes around the anchor. Nodes with no connection of their own
  // fall back to a direct link to the anchor so nothing floats away
  // disconnected, while the imported network's internal structure is preserved.
  newNodes.forEach(n => {
    const angle = Math.random() * 2 * Math.PI;
    const dist  = 130 + Math.random() * 80;
    n.x = (anchorNode.x || 0) + Math.cos(angle) * dist;
    n.y = (anchorNode.y || 0) + Math.sin(angle) * dist;

    const hasAnyLink = newLinks.some(l => l.source === n.id || l.target === n.id);
    if (!hasAnyLink && !linkExists(state.extraLinks, anchorId, n.id)) {
      newLinks.push({ source: anchorId, target: n.id });
    }
  });

  if (newNodes.length === 0 && newLinks.length === 0) {
    alert('Nothing new to import — all nodes and connections already exist.');
    return false;
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
  return true;
}

// ── Share via URL ─────────────────────────────────────────────────────────────

async function compressToBase64(data) {
  const json   = JSON.stringify(data);
  const stream = new CompressionStream('deflate-raw');
  const writer = stream.writable.getWriter();
  writer.write(new TextEncoder().encode(json));
  writer.close();
  const buf = await new Response(stream.readable).arrayBuffer();
  // URL-safe base64 (no +, /, or padding =)
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function decompressFromBase64(encoded) {
  const b64   = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const stream = new DecompressionStream('deflate-raw');
  const writer = stream.writable.getWriter();
  writer.write(bytes);
  writer.close();
  const buf = await new Response(stream.readable).arrayBuffer();
  return JSON.parse(new TextDecoder().decode(buf));
}

export async function generateShareURL() {
  const encoded = await compressToBase64(toCompact(state.nodes, state.extraLinks));
  return `${location.origin}${location.pathname}#share=${encoded}`;
}

export async function shareAsURL() {
  try {
    const url   = await generateShareURL();
    const me    = state.nodes.find(n => n.id === 'me');
    const label = (me?.name && me.name !== 'You')
      ? `${me.name}'s Polymaps`
      : 'My Polymaps';

    // Copy as rich HTML link so it pastes as a hyperlink in email / docs / chat.
    // Falls back to plain text if ClipboardItem is not supported.
    try {
      await navigator.clipboard.write([new ClipboardItem({
        'text/html':  new Blob([`<a href="${url}">${label}</a>`], { type: 'text/html' }),
        'text/plain': new Blob([url], { type: 'text/plain' }),
      })]);
    } catch {
      await navigator.clipboard.writeText(url);
    }

    showFeedback(`✓ "${label}" link copied!`);
  } catch (err) {
    alert('Could not generate share link: ' + err.message);
  }
}

export async function importNetworkFromURL(nodeId, url) {
  const match = url.match(/#share=([A-Za-z0-9\-_]+)/);
  if (!match) { alert('No valid share link found in that URL.'); return; }

  try {
    const data = normaliseShareData(await decompressFromBase64(match[1]));
    mergeNetworkInto(nodeId, data);
  } catch (err) {
    alert('Could not import from URL: ' + err.message);
  }
}

export async function checkShareURL() {
  const hash = window.location.hash;
  if (!hash.startsWith('#share=')) return;

  // Remove hash from URL immediately so refreshing doesn't re-trigger
  history.replaceState(null, '', location.pathname);

  try {
    const data = normaliseShareData(await decompressFromBase64(hash.slice(7)));
    if (!Array.isArray(data.nodes) || !data.nodes.length) return;

    const hasExisting = state.nodes.length > 1 || state.extraLinks.length > 0;
    const msg = hasExisting
      ? 'A shared network was found.\n\nReplace your current network with it?'
      : 'A shared network was found. Import it?';

    if (!confirm(msg)) return;

    state.nodes      = parseNodeArray(data.nodes);
    state.extraLinks = data.extraLinks.length
      ? data.extraLinks
      : extraLinksFromLegacyNodes(data.nodes);

    hidePanel();
    rebuildLinks();
    buildGraph();
    getSimulation().alpha(0.8).restart();
    saveToStorage();
    showFeedback('✓ Shared network imported!');
  } catch (err) {
    console.warn('Could not import from share URL:', err);
  }
}

// ── Feedback toast ────────────────────────────────────────────────────────────

export function showFeedback(msg) {
  const fb = document.getElementById('import-feedback');
  fb.textContent   = msg;
  fb.style.display = 'block';
  setTimeout(() => { fb.style.display = 'none'; fb.textContent = '✓ Imported!'; }, 3000);
}

