import { describe, it, expect } from 'vitest';
import {
  nodeKey,
  linkExists,
  parseNodeArray,
  extraLinksFromLegacyNodes,
  getColor,
  getSize,
  capitalize,
} from '../../js/helpers.js';

// ── nodeKey ───────────────────────────────────────────────────────────────────

describe('nodeKey', () => {
  it('combines lowercased name and location', () => {
    expect(nodeKey({ name: 'Alice', location: 'London' })).toBe('alice|london');
  });
  it('lowercases both fields', () => {
    expect(nodeKey({ name: 'ALICE', location: 'LONDON' })).toBe('alice|london');
  });
  it('handles null location', () => {
    expect(nodeKey({ name: 'Alice', location: null })).toBe('alice|');
  });
  it('handles undefined location', () => {
    expect(nodeKey({ name: 'Alice' })).toBe('alice|');
  });
  it('handles empty strings', () => {
    expect(nodeKey({ name: '', location: '' })).toBe('|');
  });
});

// ── linkExists ────────────────────────────────────────────────────────────────

describe('linkExists', () => {
  const links = [
    { source: 'a', target: 'b' },
    { source: 'c', target: 'd' },
  ];

  it('finds a forward link', () => {
    expect(linkExists(links, 'a', 'b')).toBe(true);
  });
  it('finds a reverse link', () => {
    expect(linkExists(links, 'b', 'a')).toBe(true);
  });
  it('returns false for a non-existent link', () => {
    expect(linkExists(links, 'a', 'c')).toBe(false);
  });
  it('returns false for an empty array', () => {
    expect(linkExists([], 'a', 'b')).toBe(false);
  });
  it('does not match a self-link', () => {
    expect(linkExists([{ source: 'a', target: 'a' }], 'a', 'b')).toBe(false);
  });
});

// ── parseNodeArray ────────────────────────────────────────────────────────────

describe('parseNodeArray', () => {
  it('preserves valid nodes', () => {
    const result = parseNodeArray([
      { id: 'me', name: 'You', type: 'me' },
      { id: 'alice_1', name: 'Alice', type: 'partner', location: 'London', note: 'hi' },
    ]);
    expect(result).toHaveLength(2);
    expect(result[1].name).toBe('Alice');
    expect(result[1].location).toBe('London');
    expect(result[1].note).toBe('hi');
  });

  it('forces type to "me" when id is "me" regardless of stored type', () => {
    const result = parseNodeArray([{ id: 'me', name: 'You', type: 'partner' }]);
    expect(result[0].type).toBe('me');
  });

  it('injects a "me" node at the front when missing', () => {
    const result = parseNodeArray([{ id: 'alice_1', name: 'Alice', type: 'friend' }]);
    expect(result[0].id).toBe('me');
    expect(result).toHaveLength(2);
  });

  it('fills in defaults for missing fields', () => {
    const result = parseNodeArray([{ id: 'me' }, { id: 'x' }]);
    const x = result.find(n => n.id === 'x');
    expect(x.name).toBe('Unknown');
    expect(x.type).toBe('other');
    expect(x.location).toBeNull();
    expect(x.note).toBe('');
  });

  it('generates an id when none is provided', () => {
    const result = parseNodeArray([{ id: 'me' }, { name: 'Bob' }]);
    const bob = result.find(n => n.name === 'Bob');
    expect(bob).toBeDefined();
    expect(typeof bob.id).toBe('string');
    expect(bob.id.length).toBeGreaterThan(0);
  });
});

// ── extraLinksFromLegacyNodes ─────────────────────────────────────────────────

describe('extraLinksFromLegacyNodes', () => {
  it('creates links from explicit parentId', () => {
    const nodes = [{ id: 'me' }, { id: 'a', parentId: 'me' }, { id: 'b', parentId: 'a' }];
    const links = extraLinksFromLegacyNodes(nodes);
    expect(links).toContainEqual({ source: 'me', target: 'a' });
    expect(links).toContainEqual({ source: 'a', target: 'b' });
  });

  it('defaults parentId to "me" when missing', () => {
    const nodes = [{ id: 'me' }, { id: 'a' }];
    const links = extraLinksFromLegacyNodes(nodes);
    expect(links).toContainEqual({ source: 'me', target: 'a' });
  });

  it('does not create duplicate links', () => {
    const nodes = [{ id: 'me' }, { id: 'a' }, { id: 'b', parentId: 'a' }];
    const links = extraLinksFromLegacyNodes(nodes);
    const dupes = links.filter(l => l.source === 'a' && l.target === 'b');
    expect(dupes).toHaveLength(1);
  });

  it('skips the "me" node itself', () => {
    const nodes = [{ id: 'me' }];
    const links = extraLinksFromLegacyNodes(nodes);
    expect(links).toHaveLength(0);
  });

  it('returns an empty array for an empty input', () => {
    expect(extraLinksFromLegacyNodes([])).toEqual([]);
  });
});

// ── getColor / getSize ────────────────────────────────────────────────────────

describe('getColor', () => {
  it('returns the correct colour for known types', () => {
    expect(getColor('partner')).toBe('#c9b8ff');
    expect(getColor('friend')).toBe('#ff9eb5');
    expect(getColor('me')).toBe('#ffffff');
  });
  it('falls back to #888 for unknown types', () => {
    expect(getColor('unknown')).toBe('#888');
    expect(getColor(undefined)).toBe('#888');
  });
});

describe('getSize', () => {
  it('returns the correct size for known types', () => {
    expect(getSize('me')).toBe(56);
    expect(getSize('partner')).toBe(44);
    expect(getSize('other')).toBe(32);
  });
  it('falls back to 34 for unknown types', () => {
    expect(getSize('unknown')).toBe(34);
    expect(getSize(undefined)).toBe(34);
  });
});

// ── capitalize ────────────────────────────────────────────────────────────────

describe('capitalize', () => {
  it('uppercases the first letter', () => {
    expect(capitalize('partner')).toBe('Partner');
    expect(capitalize('fling')).toBe('Fling');
  });
  it('leaves the rest unchanged', () => {
    expect(capitalize('hello world')).toBe('Hello world');
  });
});
