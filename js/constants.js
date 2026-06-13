export const STORAGE_KEY = 'ru-graph';

export const TYPE_COLORS = {
  partner: '#c9b8ff',
  friend:  '#ff9eb5',
  dating:  '#7dd4b8',
  crush:   '#ff5c8a',
  fling:   '#f4a868',
  ex:      '#9999bb',
  other:   '#aaaaaa',
  me:      '#ffffff'
};

export const TYPE_EMOJIS = {
  partner: '♡',
  friend:  '✦',
  dating:  '◎',
  crush:   '♥',
  fling:   '~',
  ex:      '◇',
  other:   '·',
  me:      '✿'
};

export const STD_STATUS = {
  recent:  { color: '#4ade80', label: 'Tested recently (< 3 months)' },
  fair:    { color: '#fbbf24', label: 'Tested fairly recently (3–6 months)' },
  old:     { color: '#f87171', label: 'Overdue (> 6 months)' },
  unknown: { color: null,      label: 'STD status unknown' }
};

export const TYPE_SIZES = {
  partner: 44,
  friend:  40,
  dating:  38,
  crush:   36,
  fling:   34,
  ex:      34,
  other:   32,
  me:      56
};

// Relationship types offered in the type dropdowns and the legend, in display
// order. 'me' is excluded — the You node's type is fixed and not user-selectable.
// Deriving this from TYPE_COLORS keeps colours and the type list in one place.
export const RELATIONSHIP_TYPES = Object.keys(TYPE_COLORS).filter(t => t !== 'me');
