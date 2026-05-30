import { TYPE_COLORS, TYPE_SIZES } from './constants.js';

export const getColor   = t => TYPE_COLORS[t] || '#888';
export const getSize    = t => TYPE_SIZES[t]  || 34;
export const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1);
export const nodeKey    = n => `${(n.name || '').toLowerCase()}|${(n.location || '').toLowerCase()}`;

export function linkExists(extraLinks, a, b) {
  return extraLinks.some(l =>
    (l.source === a && l.target === b) || (l.source === b && l.target === a)
  );
}

export function parseNodeArray(arr) {
  const result = arr.map(n => ({
    id:       n.id       || ('node_' + Date.now() + Math.random()),
    name:     n.name     || 'Unknown',
    type:     n.id === 'me' ? 'me' : (n.type || 'other'),
    location: n.location || null,
    note:     n.note     || ''
  }));
  if (!result.find(n => n.id === 'me')) {
    result.unshift({ id: 'me', name: 'You', type: 'me', location: null, note: '' });
  }
  return result;
}

// Convert old parentId-based save data into extraLinks entries
export function extraLinksFromLegacyNodes(rawNodes) {
  const out = [];
  rawNodes.forEach(n => {
    if (n.id === 'me') return;
    const parent = n.parentId || 'me';
    const exists = out.some(l =>
      (l.source === parent && l.target === n.id) ||
      (l.source === n.id   && l.target === parent)
    );
    if (!exists) out.push({ source: parent, target: n.id });
  });
  return out;
}
