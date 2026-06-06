import { describe, it, expect } from 'vitest';
import { buildAdjacency, buildSpanningTree, orderSiblings, computeRadialLayout } from '../../js/layout.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function node(id, parentId) {
  return parentId ? { id, parentId } : { id };
}

function link(source, target) {
  return { source, target };
}

function adj(nodes, links) {
  return buildAdjacency(nodes, links);
}

// Returns the index of id in the ordered array
function indexOf(ordered, id) {
  return ordered.indexOf(id);
}

// Returns true if a and b are adjacent (differ by exactly 1) in the ordered array
function areAdjacent(ordered, a, b) {
  return Math.abs(indexOf(ordered, a) - indexOf(ordered, b)) === 1;
}

// ── buildAdjacency ────────────────────────────────────────────────────────────

describe('buildAdjacency', () => {
  it('creates an entry for every node', () => {
    const a = buildAdjacency([node('me'), node('alice'), node('bob')], []);
    expect(a.has('me')).toBe(true);
    expect(a.has('alice')).toBe(true);
    expect(a.has('bob')).toBe(true);
  });

  it('records bidirectional edges from links', () => {
    const a = buildAdjacency([node('me'), node('alice')], [link('me', 'alice')]);
    expect(a.get('me').has('alice')).toBe(true);
    expect(a.get('alice').has('me')).toBe(true);
  });

  it('resolves D3-resolved link objects (source/target as objects with .id)', () => {
    const a = buildAdjacency(
      [node('me'), node('alice')],
      [{ source: { id: 'me' }, target: { id: 'alice' } }],
    );
    expect(a.get('me').has('alice')).toBe(true);
    expect(a.get('alice').has('me')).toBe(true);
  });

  it('adds parentId edges', () => {
    const a = buildAdjacency([node('me'), node('alice', 'me')], []);
    expect(a.get('me').has('alice')).toBe(true);
    expect(a.get('alice').has('me')).toBe(true);
  });

  it('ignores a parentId that does not exist in the node list', () => {
    const a = buildAdjacency([node('me'), node('alice', 'ghost')], []);
    expect(a.get('alice').has('ghost')).toBe(false);
  });

  it('returns empty sets for isolated nodes', () => {
    const a = buildAdjacency([node('me'), node('alice')], []);
    expect(a.get('alice').size).toBe(0);
  });
});

// ── buildSpanningTree ─────────────────────────────────────────────────────────

describe('buildSpanningTree', () => {
  it('marks all reachable nodes as visited', () => {
    const nodes = [node('me'), node('alice'), node('bob')];
    const a = adj(nodes, [link('me', 'alice'), link('alice', 'bob')]);
    const { visited } = buildSpanningTree(nodes, a);
    expect(visited.has('me')).toBe(true);
    expect(visited.has('alice')).toBe(true);
    expect(visited.has('bob')).toBe(true);
  });

  it('does not mark disconnected nodes as visited', () => {
    const nodes = [node('me'), node('alice'), node('orphan')];
    const a = adj(nodes, [link('me', 'alice')]);
    const { visited } = buildSpanningTree(nodes, a);
    expect(visited.has('orphan')).toBe(false);
  });

  it('assigns direct neighbours of me as children of me', () => {
    const nodes = [node('me'), node('alice'), node('bob')];
    const a = adj(nodes, [link('me', 'alice'), link('me', 'bob')]);
    const { children } = buildSpanningTree(nodes, a);
    expect(children.get('me')).toContain('alice');
    expect(children.get('me')).toContain('bob');
  });

  it('assigns second-degree nodes as children of their BFS parent, not me', () => {
    const nodes = [node('me'), node('alice'), node('bob')];
    const a = adj(nodes, [link('me', 'alice'), link('alice', 'bob')]);
    const { children } = buildSpanningTree(nodes, a);
    expect(children.get('alice')).toContain('bob');
    expect(children.get('me')).not.toContain('bob');
  });

  it('each node appears in exactly one children list', () => {
    const nodes = [node('me'), node('a'), node('b'), node('c')];
    const a = adj(nodes, [link('me', 'a'), link('me', 'b'), link('a', 'c')]);
    const { children } = buildSpanningTree(nodes, a);
    const allChildren = [...children.values()].flat();
    const unique = new Set(allChildren);
    expect(unique.size).toBe(allChildren.length);
  });
});

// ── orderSiblings ─────────────────────────────────────────────────────────────

describe('orderSiblings', () => {
  it('returns singletons and pairs unchanged', () => {
    const a = buildAdjacency([node('me'), node('a'), node('b')], []);
    expect(orderSiblings(['a'], a)).toEqual(['a']);
    expect(orderSiblings(['a', 'b'], a)).toEqual(['a', 'b']);
  });

  it('places two connected siblings adjacent to each other', () => {
    const nodes = [node('me'), node('a'), node('b'), node('c')];
    const a = adj(nodes, [link('me', 'a'), link('me', 'b'), link('me', 'c'), link('b', 'c')]);
    const ordered = orderSiblings(['a', 'b', 'c'], a);
    expect(areAdjacent(ordered, 'b', 'c')).toBe(true);
  });

  it('places all nodes in a connected chain adjacently', () => {
    // chain: a — b — c
    const nodes = [node('me'), node('a'), node('b'), node('c')];
    const a = adj(nodes, [link('a', 'b'), link('b', 'c')]);
    const ordered = orderSiblings(['a', 'b', 'c'], a);
    expect(areAdjacent(ordered, 'a', 'b')).toBe(true);
    expect(areAdjacent(ordered, 'b', 'c')).toBe(true);
  });

  it('keeps an isolated sibling from being inserted between two connected ones', () => {
    // isolated: d has no sibling connections; b—c are connected
    const nodes = [node('me'), node('b'), node('c'), node('d')];
    const a = adj(nodes, [link('b', 'c')]);
    const ordered = orderSiblings(['b', 'c', 'd'], a);
    expect(areAdjacent(ordered, 'b', 'c')).toBe(true);
  });

  it('contains every input sibling exactly once', () => {
    const nodes = [node('me'), node('a'), node('b'), node('c'), node('d')];
    const a = adj(nodes, [link('a', 'b'), link('c', 'd')]);
    const ordered = orderSiblings(['a', 'b', 'c', 'd'], a);
    expect(ordered.sort()).toEqual(['a', 'b', 'c', 'd'].sort());
  });

  it('handles fully disconnected siblings (no sibling edges)', () => {
    const nodes = [node('me'), node('a'), node('b'), node('c')];
    const a = adj(nodes, []);
    const ordered = orderSiblings(['a', 'b', 'c'], a);
    expect(ordered).toHaveLength(3);
    expect(new Set(ordered).size).toBe(3);
  });
});

// ── computeRadialLayout ───────────────────────────────────────────────────────

describe('computeRadialLayout', () => {
  const CX = 500, CY = 400, GAP = 200;

  it('places "me" exactly at the center', () => {
    const nodes = [node('me'), node('alice')];
    const pos = computeRadialLayout(nodes, [link('me', 'alice')], CX, CY, GAP);
    expect(pos.get('me')).toEqual({ x: CX, y: CY });
  });

  it('assigns a position to every node', () => {
    const nodes = [node('me'), node('alice'), node('bob'), node('carl')];
    const links = [link('me', 'alice'), link('me', 'bob'), link('me', 'carl')];
    const pos = computeRadialLayout(nodes, links, CX, CY, GAP);
    nodes.forEach(n => expect(pos.has(n.id)).toBe(true));
  });

  it('places direct neighbours at exactly one ringGap from center', () => {
    const nodes = [node('me'), node('alice'), node('bob')];
    const links = [link('me', 'alice'), link('me', 'bob')];
    const pos = computeRadialLayout(nodes, links, CX, CY, GAP);
    ['alice', 'bob'].forEach(id => {
      const p = pos.get(id);
      const dist = Math.hypot(p.x - CX, p.y - CY);
      expect(dist).toBeCloseTo(GAP, 5);
    });
  });

  it('places second-degree nodes at two ringGaps from center', () => {
    const nodes = [node('me'), node('alice'), node('bob')];
    const links = [link('me', 'alice'), link('alice', 'bob')];
    const pos = computeRadialLayout(nodes, links, CX, CY, GAP);
    const p = pos.get('bob');
    const dist = Math.hypot(p.x - CX, p.y - CY);
    expect(dist).toBeCloseTo(GAP * 2, 5);
  });

  it('places disconnected nodes at three ringGaps from center', () => {
    const nodes = [node('me'), node('alice'), node('orphan')];
    const links = [link('me', 'alice')];
    const pos = computeRadialLayout(nodes, links, CX, CY, GAP);
    const p = pos.get('orphan');
    const dist = Math.hypot(p.x - CX, p.y - CY);
    expect(dist).toBeCloseTo(GAP * 3, 5);
  });

  it('connected siblings are angularly adjacent (exactly one step apart)', () => {
    // a—b connected; c and d are isolated siblings
    // With 4 equal slices (step = 90°), adjacency means exactly one step apart.
    // A non-adjacent pair would be 2 steps (180°) apart.
    const nodes = [node('me'), node('a'), node('b'), node('c'), node('d')];
    const links = [link('me', 'a'), link('me', 'b'), link('me', 'c'), link('me', 'd'), link('a', 'b')];
    const pos = computeRadialLayout(nodes, links, CX, CY, GAP);

    const angle = id => Math.atan2(pos.get(id).y - CY, pos.get(id).x - CX);
    const circularDist = (x, y) => {
      const d = Math.abs(angle(x) - angle(y));
      return Math.min(d, 2 * Math.PI - d);
    };
    const oneStep = (2 * Math.PI) / 4; // 4 siblings → 90° per step

    expect(circularDist('a', 'b')).toBeCloseTo(oneStep, 4);
  });

  it('works with a single node (just "me")', () => {
    const pos = computeRadialLayout([node('me')], [], CX, CY, GAP);
    expect(pos.get('me')).toEqual({ x: CX, y: CY });
    expect(pos.size).toBe(1);
  });

  it('no two nodes share the same position', () => {
    const nodes = [node('me'), node('a'), node('b'), node('c'), node('d')];
    const links = [link('me', 'a'), link('me', 'b'), link('me', 'c'), link('me', 'd')];
    const pos = computeRadialLayout(nodes, links, CX, CY, GAP);
    const coords = [...pos.values()].map(p => `${p.x.toFixed(4)},${p.y.toFixed(4)}`);
    expect(new Set(coords).size).toBe(coords.length);
  });
});
