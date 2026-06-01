import { describe, it, expect } from 'vitest';
import { toCompact, fromCompact, normaliseShareData } from '../../js/compress.js';

const nodes = [
  { id: 'me',      name: 'You',   type: 'me',      location: null,     note: '' },
  { id: 'alice_1', name: 'Alice', type: 'partner', location: 'London', note: '' },
  { id: 'bob_2',   name: 'Bob',   type: 'friend',  location: null,     note: 'old friend' },
];

const extraLinks = [
  { source: 'me',      target: 'alice_1' },
  { source: 'me',      target: 'bob_2'   },
  { source: 'alice_1', target: 'bob_2'   },
];

// ── toCompact ─────────────────────────────────────────────────────────────────

describe('toCompact', () => {
  it('produces v4 format', () => {
    const result = toCompact(nodes, extraLinks);
    expect(result.v).toBe(4);
  });

  it('encodes all nodes', () => {
    const result = toCompact(nodes, extraLinks);
    expect(result.n).toHaveLength(3);
  });

  it('encodes all links as index pairs', () => {
    const result = toCompact(nodes, extraLinks);
    expect(result.l).toHaveLength(3);
    expect(result.l).toContainEqual([0, 1]);
    expect(result.l).toContainEqual([0, 2]);
    expect(result.l).toContainEqual([1, 2]);
  });

  it('omits null location', () => {
    const result = toCompact(nodes, extraLinks);
    expect(result.n[0].l).toBeUndefined(); // me has no location
    expect(result.n[2].l).toBeUndefined(); // bob has no location
  });

  it('keeps a non-null location', () => {
    const result = toCompact(nodes, extraLinks);
    expect(result.n[1].l).toBe('London');
  });

  it('omits an empty note', () => {
    const result = toCompact(nodes, extraLinks);
    expect(result.n[0].o).toBeUndefined();
    expect(result.n[1].o).toBeUndefined();
  });

  it('keeps a non-empty note', () => {
    const result = toCompact(nodes, extraLinks);
    expect(result.n[2].o).toBe('old friend');
  });

  it('filters out links referencing unknown node ids', () => {
    const badLinks = [{ source: 'me', target: 'ghost' }];
    const result = toCompact(nodes, badLinks);
    expect(result.l).toHaveLength(0);
  });

  it('handles an empty graph (me only)', () => {
    const result = toCompact([nodes[0]], []);
    expect(result.n).toHaveLength(1);
    expect(result.l).toHaveLength(0);
  });
});

// ── fromCompact ───────────────────────────────────────────────────────────────

describe('fromCompact', () => {
  it('reconstructs the correct number of nodes', () => {
    const { nodes: out } = fromCompact(toCompact(nodes, extraLinks));
    expect(out).toHaveLength(3);
  });

  it('assigns id "me" to the first node', () => {
    const { nodes: out } = fromCompact(toCompact(nodes, extraLinks));
    expect(out[0].id).toBe('me');
  });

  it('assigns unique ids to other nodes', () => {
    const { nodes: out } = fromCompact(toCompact(nodes, extraLinks));
    const ids = out.map(n => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('preserves names, types, locations, notes', () => {
    const { nodes: out } = fromCompact(toCompact(nodes, extraLinks));
    expect(out[1].name).toBe('Alice');
    expect(out[1].type).toBe('partner');
    expect(out[1].location).toBe('London');
    expect(out[2].note).toBe('old friend');
  });

  it('restores null for missing location', () => {
    const { nodes: out } = fromCompact(toCompact(nodes, extraLinks));
    expect(out[0].location).toBeNull();
    expect(out[2].location).toBeNull();
  });

  it('restores empty string for missing note', () => {
    const { nodes: out } = fromCompact(toCompact(nodes, extraLinks));
    expect(out[0].note).toBe('');
  });

  it('reconstructs the correct number of links', () => {
    const { extraLinks: out } = fromCompact(toCompact(nodes, extraLinks));
    expect(out).toHaveLength(3);
  });

  it('handles missing l array gracefully', () => {
    const { extraLinks: out } = fromCompact({ v: 4, n: [{ n: 'You', t: 'me' }] });
    expect(out).toHaveLength(0);
  });
});

// ── round-trip ────────────────────────────────────────────────────────────────

describe('round-trip: toCompact → fromCompact', () => {
  it('preserves node count', () => {
    const { nodes: out } = fromCompact(toCompact(nodes, extraLinks));
    expect(out).toHaveLength(nodes.length);
  });

  it('preserves link count', () => {
    const { extraLinks: out } = fromCompact(toCompact(nodes, extraLinks));
    expect(out).toHaveLength(extraLinks.length);
  });

  it('all link sources and targets exist in the node list', () => {
    const { nodes: outNodes, extraLinks: outLinks } = fromCompact(toCompact(nodes, extraLinks));
    const ids = new Set(outNodes.map(n => n.id));
    outLinks.forEach(l => {
      expect(ids.has(l.source)).toBe(true);
      expect(ids.has(l.target)).toBe(true);
    });
  });
});

// ── normaliseShareData ────────────────────────────────────────────────────────

describe('normaliseShareData', () => {
  it('routes v4 payload through fromCompact', () => {
    const compact = toCompact(nodes, extraLinks);
    const { nodes: out, extraLinks: outLinks } = normaliseShareData(compact);
    expect(out).toHaveLength(3);
    expect(outLinks).toHaveLength(3);
  });

  it('passes legacy v3 nodes through unchanged', () => {
    const legacy = { version: 3, nodes, extraLinks };
    const result = normaliseShareData(legacy);
    expect(result.nodes).toBe(nodes);
    expect(result.extraLinks).toBe(extraLinks);
  });

  it('returns empty arrays for a bare legacy payload', () => {
    const result = normaliseShareData({ version: 3 });
    expect(result.nodes).toEqual([]);
    expect(result.extraLinks).toEqual([]);
  });
});
