import { TYPE_COLORS, TYPE_SIZES, STD_STATUS } from './constants.js';

export const getColor   = t => TYPE_COLORS[t] || '#888';
export const getSize    = t => TYPE_SIZES[t]  || 34;
export const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1);
export const nodeKey    = n => `${(n.name || '').toLowerCase()}|${(n.location || '').toLowerCase()}`;

export function getStdStatus(dateStr) {
  if (!dateStr) return STD_STATUS.unknown;
  const tested = new Date(dateStr);
  if (isNaN(tested)) return STD_STATUS.unknown;
  const msAgo = Date.now() - tested.getTime();
  const months = msAgo / (1000 * 60 * 60 * 24 * 30.44);
  if (months <= 3) return STD_STATUS.recent;
  if (months <= 6) return STD_STATUS.fair;
  return STD_STATUS.old;
}

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
    location:      n.location      || null,
    lat:           n.lat           || null,
    lng:           n.lng           || null,
    note:          n.note          || '',
    stdTestedDate: n.stdTestedDate || null
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
