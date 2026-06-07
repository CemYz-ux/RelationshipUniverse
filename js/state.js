// ── Mutable app state ─────────────────────────────────────────────────────────

export const state = {
  nodes: [{ id: 'me', name: 'You', type: 'me', location: null, note: '' }],
  extraLinks: [],

  // UI modes
  connectMode:          null,  // nodeId we're adding a child to
  linkPickMode:         null,  // nodeId we're linking from
  mergePickMode:        null,  // nodeId we're merging FROM (primary — keeps info)
  selectedNodeId:       null,
  editingNodeId:        null,
  bubbleNodeId:         null,
  pendingNetworkNodeId: null,
  mapViewActive:        false,
};

// ── DOM refs ──────────────────────────────────────────────────────────────────

export const dom = {
  spEl:      document.getElementById('side-panel'),
  spView:    document.getElementById('sp-view'),
  spEdit:    document.getElementById('sp-edit'),
  svgEl:     document.getElementById('svg'),
  container: document.getElementById('graph-container'),
  bubble:    document.getElementById('node-bubble'),
  nbLink:    document.getElementById('nb-link'),
  nbMerge:   document.getElementById('nb-merge'),
  nbInfo:    document.getElementById('nb-info'),
};
