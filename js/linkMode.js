import { state, dom } from './state.js';
import { getColor } from './helpers.js';
import { createExtraLink } from './actions.js';
import { showPanel, hidePanel } from './sidePanel.js';

export function startLinkPickMode(fromId) {
  const from = state.nodes.find(n => n.id === fromId);
  if (!from) return;
  state.linkPickMode   = fromId;
  state.selectedNodeId = fromId;

  dom.svgEl.classList.add('link-pick-active');

  dom.spView.innerHTML = `
    <div class="tt-name" style="color:${getColor(from.type)}">${from.name}</div>
    <div class="tt-row" style="margin-top:8px;">Click any other node to link it to <strong>${from.name}</strong>.</div>
    <div class="tt-actions">
      <button class="btn-tt btn-tt-neutral" data-action="cancelLinkPickMode">✕ Cancel</button>
    </div>`;
  dom.spEdit.style.display = 'none';
  dom.spView.style.display = 'block';
  dom.spEl.classList.add('visible');
}

export function cancelLinkPickMode() {
  state.linkPickMode = null;
  dom.svgEl.classList.remove('link-pick-active');
  hidePanel();
}

export function handleLinkPickClick(targetId) {
  const sourceId = state.linkPickMode;
  state.linkPickMode = null;
  dom.svgEl.classList.remove('link-pick-active');
  createExtraLink(sourceId, targetId);
}
