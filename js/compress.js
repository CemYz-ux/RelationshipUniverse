// Pure compact-serialisation helpers.
// No imports, no side-effects — safe to unit-test without JSDOM or mocking.

// ── v4 compact format ─────────────────────────────────────────────────────────
// Nodes → [{n,t,l?,o?}] with index-based links [[srcIdx,tgtIdx]].
// Null/empty fields are omitted. Roughly 40-60% smaller than the v3 format
// before deflate compression is applied.

export function toCompact(nodes, extraLinks) {
  const idx = new Map(nodes.map((n, i) => [n.id, i]));
  return {
    v: 4,
    n: nodes.map(n => {
      const e = { n: n.name, t: n.type };
      if (n.location) e.l = n.location;
      if (n.note)     e.o = n.note;
      return e;
    }),
    l: extraLinks
      .map(e => [idx.get(e.source), idx.get(e.target)])
      .filter(([a, b]) => a !== undefined && b !== undefined)
  };
}

export function fromCompact(data) {
  const nodes = (data.n || []).map((e, i) => ({
    id:       i === 0 ? 'me' : e.n.toLowerCase().replace(/\s+/g, '_') + '_' + i,
    name:     e.n,
    type:     e.t,
    location: e.l || null,
    note:     e.o || ''
  }));
  const extraLinks = (data.l || [])
    .map(([a, b]) => ({ source: nodes[a]?.id, target: nodes[b]?.id }))
    .filter(l => l.source && l.target);
  return { nodes, extraLinks };
}

// Routes v4 (compact) or legacy v3 (full JSON) share payloads to a common
// { nodes, extraLinks } shape.
export function normaliseShareData(raw) {
  if (raw.v === 4) return fromCompact(raw);
  return {
    nodes:      raw.nodes      || [],
    extraLinks: raw.extraLinks || []
  };
}
