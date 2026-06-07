import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  nodeKey,
  linkExists,
  parseNodeArray,
  extraLinksFromLegacyNodes,
  getColor,
  getSize,
  capitalize,
  getStdStatus,
} from '../../js/helpers.js';
import { STD_STATUS } from '../../js/constants.js';

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
  it('handles a single character', () => {
    expect(capitalize('a')).toBe('A');
  });
  it('leaves an already-capitalised string unchanged', () => {
    expect(capitalize('Partner')).toBe('Partner');
  });
  it('handles an empty string without throwing', () => {
    expect(capitalize('')).toBe('');
  });
});

// ── nodeKey edge cases ────────────────────────────────────────────────────────

describe('nodeKey — additional edge cases', () => {
  it('trims nothing (preserves internal spaces lowercased)', () => {
    expect(nodeKey({ name: 'Mary Jane', location: 'New York' })).toBe('mary jane|new york');
  });
  it('handles numeric-looking names', () => {
    expect(nodeKey({ name: '42', location: '0' })).toBe('42|0');
  });
});

// ── parseNodeArray — additional edge cases ────────────────────────────────────

describe('parseNodeArray — additional edge cases', () => {
  it('handles an empty array (injects me)', () => {
    const result = parseNodeArray([]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('me');
  });

  it('does not inject a second me when one is already present', () => {
    const result = parseNodeArray([{ id: 'me', name: 'You', type: 'me' }]);
    const meNodes = result.filter(n => n.id === 'me');
    expect(meNodes).toHaveLength(1);
  });

  it('does not carry through fields outside the schema', () => {
    const result = parseNodeArray([{ id: 'me' }, { id: 'a', name: 'A', type: 'friend', x: 99 }]);
    const a = result.find(n => n.id === 'a');
    expect(Object.keys(a).sort()).toEqual(['id', 'lat', 'lng', 'location', 'name', 'note', 'stdTestedDate', 'type'].sort());
  });
});

// ── extraLinksFromLegacyNodes — additional edge cases ────────────────────────

describe('extraLinksFromLegacyNodes — additional edge cases', () => {
  it('handles nodes with unknown parentId values', () => {
    const nodes = [{ id: 'me' }, { id: 'a', parentId: 'ghost' }];
    const links = extraLinksFromLegacyNodes(nodes);
    expect(links).toContainEqual({ source: 'ghost', target: 'a' });
  });

  it('does not create a link from me to itself', () => {
    const nodes = [{ id: 'me', parentId: 'me' }];
    const links = extraLinksFromLegacyNodes(nodes);
    expect(links).toHaveLength(0);
  });
});

// ── linkExists — additional edge cases ────────────────────────────────────────

describe('linkExists — additional edge cases', () => {
  it('is order-independent (b→a matches a→b entry)', () => {
    const links = [{ source: 'x', target: 'y' }];
    expect(linkExists(links, 'y', 'x')).toBe(true);
  });

  it('does not match partially-matching pairs', () => {
    const links = [{ source: 'a', target: 'b' }];
    expect(linkExists(links, 'a', 'z')).toBe(false);
    expect(linkExists(links, 'z', 'b')).toBe(false);
  });
});

// ── getStdStatus ──────────────────────────────────────────────────────────────

describe('getStdStatus', () => {
  const NOW = new Date('2026-06-04T12:00:00Z');

  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
  afterEach(() => vi.useRealTimers());

  it('returns unknown for null', () => {
    expect(getStdStatus(null)).toBe(STD_STATUS.unknown);
  });

  it('returns unknown for undefined', () => {
    expect(getStdStatus(undefined)).toBe(STD_STATUS.unknown);
  });

  it('returns unknown for an empty string', () => {
    expect(getStdStatus('')).toBe(STD_STATUS.unknown);
  });

  it('returns unknown for an invalid date string', () => {
    expect(getStdStatus('not-a-date')).toBe(STD_STATUS.unknown);
  });

  it('returns recent for a date 1 month ago (< 3 months)', () => {
    expect(getStdStatus('2026-05-04')).toBe(STD_STATUS.recent);
  });

  it('returns recent for a date 2.5 months ago (well inside 3-month window)', () => {
    expect(getStdStatus('2026-03-18')).toBe(STD_STATUS.recent);
  });

  it('returns fair for a date ~4 months ago (between 3 and 6 months)', () => {
    expect(getStdStatus('2026-02-04')).toBe(STD_STATUS.fair);
  });

  it('returns fair for a date just under 6 months ago', () => {
    expect(getStdStatus('2025-12-15')).toBe(STD_STATUS.fair);
  });

  it('returns old for a date ~6.5 months ago (past 6-month cutoff)', () => {
    expect(getStdStatus('2025-11-19')).toBe(STD_STATUS.old);
  });

  it('returns old for a date 1 year ago', () => {
    expect(getStdStatus('2025-06-04')).toBe(STD_STATUS.old);
  });

  it('returns old for a date several years ago', () => {
    expect(getStdStatus('2020-01-01')).toBe(STD_STATUS.old);
  });

  it('returns recent for today', () => {
    expect(getStdStatus('2026-06-04')).toBe(STD_STATUS.recent);
  });

  it('returned object has the expected color and label shape', () => {
    const result = getStdStatus('2026-05-01');
    expect(result).toHaveProperty('color');
    expect(result).toHaveProperty('label');
    expect(typeof result.label).toBe('string');
  });
});
