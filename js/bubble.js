import { state, dom } from './state.js';
import { getColor, getSize } from './helpers.js';
import { showPanel } from './sidePanel.js';
import { startConnectMode } from './addPanel.js';
import { startLinkPickMode } from './linkMode.js';

export function showBubble(e, d) {
  // Toggle off if same node tapped again
  if (state.bubbleNodeId === d.id && dom.bubble.classList.contains('visible')) {
    hideBubble(); return;
  }
  state.bubbleNodeId = d.id;

  // Convert D3 graph coords → screen coords
  const transform = d3.zoomTransform(dom.svgEl);
  const svgRect   = dom.svgEl.getBoundingClientRect();
  const sx = svgRect.left + transform.applyX(d.x);
  const sy = svgRect.top  + transform.applyY(d.y) - getSize(d.type) - 9;

  dom.bubble.style.left = sx + 'px';
  dom.bubble.style.top  = sy + 'px';

  // Tint the + button to match the node colour
  dom.nbAdd.style.color       = getColor(d.type);
  dom.nbAdd.style.borderColor = getColor(d.type) + '55';

  dom.bubble.classList.add('visible');
}

export function hideBubble() {
  state.bubbleNodeId = null;
  dom.bubble.classList.remove('visible');
}

// ── Button wiring ─────────────────────────────────────────────────────────────

dom.nbAdd.addEventListener('click', e => {
  e.stopPropagation();
  const d = state.nodes.find(n => n.id === state.bubbleNodeId);
  if (!d) return;
  hideBubble();
  startConnectMode(d.id, d.name);
});

dom.nbLink.addEventListener('click', e => {
  e.stopPropagation();
  const id = state.bubbleNodeId;
  hideBubble();
  startLinkPickMode(id);
});

dom.nbInfo.addEventListener('click', e => {
  e.stopPropagation();
  const d = state.nodes.find(n => n.id === state.bubbleNodeId);
  if (!d) return;
  hideBubble();
  showPanel({ stopPropagation: () => {} }, d);
});
