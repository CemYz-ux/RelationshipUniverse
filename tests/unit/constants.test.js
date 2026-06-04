import { describe, it, expect } from 'vitest';
import { TYPE_COLORS, TYPE_EMOJIS, TYPE_SIZES, STD_STATUS } from '../../js/constants.js';

const EXPECTED_TYPES = ['partner', 'friend', 'dating', 'crush', 'fling', 'ex', 'other', 'me'];

describe('TYPE_COLORS', () => {
  it('contains all expected relationship types', () => {
    for (const t of EXPECTED_TYPES) {
      expect(TYPE_COLORS).toHaveProperty(t);
    }
  });

  it('has no unexpected extra types', () => {
    expect(Object.keys(TYPE_COLORS).sort()).toEqual([...EXPECTED_TYPES].sort());
  });

  it('all values are valid CSS colour strings', () => {
    for (const [type, colour] of Object.entries(TYPE_COLORS)) {
      expect(colour, `TYPE_COLORS.${type}`).toMatch(/^#[0-9a-fA-F]{3,6}$/);
    }
  });

  it('"me" is white', () => {
    expect(TYPE_COLORS.me).toBe('#ffffff');
  });
});

describe('TYPE_EMOJIS', () => {
  it('contains exactly the same keys as TYPE_COLORS', () => {
    expect(Object.keys(TYPE_EMOJIS).sort()).toEqual(Object.keys(TYPE_COLORS).sort());
  });

  it('all values are non-empty strings', () => {
    for (const [type, emoji] of Object.entries(TYPE_EMOJIS)) {
      expect(typeof emoji, `TYPE_EMOJIS.${type}`).toBe('string');
      expect(emoji.length, `TYPE_EMOJIS.${type}`).toBeGreaterThan(0);
    }
  });
});

describe('TYPE_SIZES', () => {
  it('contains exactly the same keys as TYPE_COLORS', () => {
    expect(Object.keys(TYPE_SIZES).sort()).toEqual(Object.keys(TYPE_COLORS).sort());
  });

  it('all values are positive numbers', () => {
    for (const [type, size] of Object.entries(TYPE_SIZES)) {
      expect(typeof size, `TYPE_SIZES.${type}`).toBe('number');
      expect(size, `TYPE_SIZES.${type}`).toBeGreaterThan(0);
    }
  });

  it('"me" is the largest node', () => {
    const maxSize = Math.max(...Object.values(TYPE_SIZES));
    expect(TYPE_SIZES.me).toBe(maxSize);
  });
});

describe('cross-map consistency', () => {
  it('all three maps have identical key sets', () => {
    const colorKeys = Object.keys(TYPE_COLORS).sort();
    expect(Object.keys(TYPE_EMOJIS).sort()).toEqual(colorKeys);
    expect(Object.keys(TYPE_SIZES).sort()).toEqual(colorKeys);
  });
});

// ── STD_STATUS ────────────────────────────────────────────────────────────────

describe('STD_STATUS', () => {
  const EXPECTED_KEYS = ['recent', 'fair', 'old', 'unknown'];

  it('contains exactly the four expected status keys', () => {
    expect(Object.keys(STD_STATUS).sort()).toEqual([...EXPECTED_KEYS].sort());
  });

  it('each entry has a label string', () => {
    for (const [key, entry] of Object.entries(STD_STATUS)) {
      expect(typeof entry.label, `STD_STATUS.${key}.label`).toBe('string');
      expect(entry.label.length, `STD_STATUS.${key}.label`).toBeGreaterThan(0);
    }
  });

  it('recent, fair, old have valid hex color strings', () => {
    for (const key of ['recent', 'fair', 'old']) {
      expect(STD_STATUS[key].color, `STD_STATUS.${key}.color`).toMatch(/^#[0-9a-fA-F]{3,6}$/);
    }
  });

  it('unknown has a null color', () => {
    expect(STD_STATUS.unknown.color).toBeNull();
  });

  it('all colors are distinct', () => {
    const colors = ['recent', 'fair', 'old'].map(k => STD_STATUS[k].color);
    expect(new Set(colors).size).toBe(3);
  });
});
