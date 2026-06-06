import { state, dom } from './state.js';
import { getColor } from './helpers.js';
import { mergePerson } from './actions.js';
import { hidePanel } from './sidePanel.js';

export function startMergePickMode(fromId) {
  const from = state.nodes.find(n => n.id === fromId);
  if (!from) return;
  state.mergePickMode  = fromId;
  state.selectedNodeId = fromId;

  dom.svgEl.classList.add('merge-pick-active');

  dom.spView.innerHTML = `
    <div class="tt-name" style="color:${getColor(from.type)}">${from.name}</div>
    <div class="tt-row" style="margin-top:8px;">Click a node to merge into <strong>${from.name}</strong>.<br>
    <span style="opacity:.6;font-size:12px;">The selected node will be absorbed — its links move to ${from.name}.</span></div>
    <div class="tt-actions">
      <button class="btn-tt btn-tt-neutral" onclick="cancelMergePickMode()">✕ Cancel</button>
    </div>`;
  dom.spEdit.style.display = 'none';
  dom.spView.style.display = 'block';
  dom.spEl.classList.add('visible');
}

export function cancelMergePickMode() {
  state.mergePickMode = null;
  dom.svgEl.classList.remove('merge-pick-active');
  hidePanel();
}

export function handleMergePickClick(targetId) {
  const primaryId = state.mergePickMode;
  if (targetId === 'me') {
    // "me" can never be absorbed
    return;
  }
  state.mergePickMode = null;
  dom.svgEl.classList.remove('merge-pick-active');
  mergePerson(primaryId, targetId);
}
