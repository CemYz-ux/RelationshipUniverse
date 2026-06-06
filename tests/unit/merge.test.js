import { describe, it, expect, vi } from 'vitest';

// ── Mock all DOM-touching and D3 modules ──────────────────────────────────────

// vi.hoisted runs before vi.mock hoisting, so state is available in the factory
const state = vi.hoisted(() => ({ nodes: [], extraLinks: [] }));

vi.mock('../../js/state.js', () => ({ state }));
vi.mock('../../js/graph.js', () => ({
  buildGraph:    vi.fn(),
  rebuildLinks:  vi.fn(),
  getSimulation: vi.fn(() => ({ alpha: vi.fn().mockReturnThis(), restart: vi.fn() })),
}));
vi.mock('../../js/storage.js', () => ({ saveToStorage: vi.fn() }));
vi.mock('../../js/sidePanel.js', () => ({ hidePanel: vi.fn(), showPanel: vi.fn() }));

import { mergePerson } from '../../js/actions.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function node(id, extra = {}) {
  return { id, name: id, type: 'friend', location: null, note: '', ...extra };
}

function link(source, target) {
  return { source, target };
}

function resetState(nodes, links) {
  state.nodes      = nodes;
  state.extraLinks = links;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('mergePerson — node removal', () => {
  it('removes the secondary node', () => {
    resetState([node('me'), node('alice'), node('bob')], []);
    mergePerson('alice', 'bob');
    expect(state.nodes.find(n => n.id === 'bob')).toBeUndefined();
  });

  it('keeps the primary node', () => {
    resetState([node('me'), node('alice'), node('bob')], []);
    mergePerson('alice', 'bob');
    expect(state.nodes.find(n => n.id === 'alice')).toBeDefined();
  });

  it('keeps all other nodes', () => {
    resetState([node('me'), node('alice'), node('bob'), node('carl')], []);
    mergePerson('alice', 'bob');
    expect(state.nodes.find(n => n.id === 'me')).toBeDefined();
    expect(state.nodes.find(n => n.id === 'carl')).toBeDefined();
  });

  it('does not change primary node data', () => {
    const alice = node('alice', { name: 'Alice', type: 'partner', location: 'Berlin', note: 'hi' });
    resetState([node('me'), alice, node('bob')], []);
    mergePerson('alice', 'bob');
    const kept = state.nodes.find(n => n.id === 'alice');
    expect(kept.name).toBe('Alice');
    expect(kept.type).toBe('partner');
    expect(kept.location).toBe('Berlin');
    expect(kept.note).toBe('hi');
  });
});

describe('mergePerson — link migration', () => {
  it('redirects a link from secondary to primary (source side)', () => {
    resetState(
      [node('me'), node('alice'), node('bob'), node('carl')],
      [link('bob', 'carl')],
    );
    mergePerson('alice', 'bob');
    expect(state.extraLinks).toContainEqual({ source: 'alice', target: 'carl' });
  });

  it('redirects a link from secondary to primary (target side)', () => {
    resetState(
      [node('me'), node('alice'), node('bob'), node('carl')],
      [link('carl', 'bob')],
    );
    mergePerson('alice', 'bob');
    expect(state.extraLinks).toContainEqual({ source: 'carl', target: 'alice' });
  });

  it('migrates multiple links from secondary', () => {
    resetState(
      [node('me'), node('alice'), node('bob'), node('carl'), node('dave')],
      [link('bob', 'carl'), link('bob', 'dave')],
    );
    mergePerson('alice', 'bob');
    expect(state.extraLinks).toContainEqual({ source: 'alice', target: 'carl' });
    expect(state.extraLinks).toContainEqual({ source: 'alice', target: 'dave' });
  });

  it('preserves links unrelated to the secondary', () => {
    resetState(
      [node('me'), node('alice'), node('bob'), node('carl'), node('dave')],
      [link('carl', 'dave'), link('bob', 'carl')],
    );
    mergePerson('alice', 'bob');
    expect(state.extraLinks).toContainEqual({ source: 'carl', target: 'dave' });
  });
});

describe('mergePerson — self-link removal', () => {
  it('drops a self-link created when secondary was already linked to primary', () => {
    resetState(
      [node('me'), node('alice'), node('bob')],
      [link('alice', 'bob')],
    );
    mergePerson('alice', 'bob');
    const selfLinks = state.extraLinks.filter(l => l.source === l.target);
    expect(selfLinks).toHaveLength(0);
  });

  it('drops reverse self-link (bob→alice redirected to alice→alice)', () => {
    resetState(
      [node('me'), node('alice'), node('bob')],
      [link('bob', 'alice')],
    );
    mergePerson('alice', 'bob');
    const selfLinks = state.extraLinks.filter(l => l.source === l.target);
    expect(selfLinks).toHaveLength(0);
  });
});

describe('mergePerson — duplicate link deduplication', () => {
  it('deduplicates when primary and secondary both had a link to the same node', () => {
    resetState(
      [node('me'), node('alice'), node('bob'), node('carl')],
      [link('alice', 'carl'), link('bob', 'carl')],
    );
    mergePerson('alice', 'bob');
    const toCarl = state.extraLinks.filter(
      l => (l.source === 'alice' && l.target === 'carl') ||
           (l.source === 'carl'  && l.target === 'alice'),
    );
    expect(toCarl).toHaveLength(1);
  });

  it('deduplicates regardless of link direction', () => {
    resetState(
      [node('me'), node('alice'), node('bob'), node('carl')],
      [link('carl', 'alice'), link('bob', 'carl')],
    );
    mergePerson('alice', 'bob');
    const toCarl = state.extraLinks.filter(
      l => (l.source === 'alice' && l.target === 'carl') ||
           (l.source === 'carl'  && l.target === 'alice'),
    );
    expect(toCarl).toHaveLength(1);
  });

  it('keeps the correct count after a complex merge', () => {
    // alice–carl, alice–dave, bob–carl (dup after merge), bob–eve
    resetState(
      [node('me'), node('alice'), node('bob'), node('carl'), node('dave'), node('eve')],
      [link('alice', 'carl'), link('alice', 'dave'), link('bob', 'carl'), link('bob', 'eve')],
    );
    mergePerson('alice', 'bob');
    // Expected: alice–carl, alice–dave, alice–eve (3 links, no dups, no self-links)
    expect(state.extraLinks).toHaveLength(3);
  });
});

describe('mergePerson — merging into "me"', () => {
  it('removes the absorbed node when primary is "me"', () => {
    resetState([node('me'), node('alice')], []);
    mergePerson('me', 'alice');
    expect(state.nodes.find(n => n.id === 'alice')).toBeUndefined();
    expect(state.nodes.find(n => n.id === 'me')).toBeDefined();
  });

  it('migrates links to "me" when primary is "me"', () => {
    resetState(
      [node('me'), node('alice'), node('bob')],
      [link('alice', 'bob')],
    );
    mergePerson('me', 'alice');
    expect(state.extraLinks).toContainEqual({ source: 'me', target: 'bob' });
  });
});
