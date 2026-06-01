import { describe, it, expect } from 'vitest';
import { TYPE_COLORS, TYPE_EMOJIS, TYPE_SIZES } from '../../js/constants.js';

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
