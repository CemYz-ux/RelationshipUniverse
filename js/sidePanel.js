import { state, dom } from './state.js';
import { getColor, capitalize, getStdStatus } from './helpers.js';

export function showPanel(e, d) {
  if (state.linkPickMode) return;
  state.selectedNodeId = d.id;
  state.editingNodeId  = null;
  dom.spEdit.style.display = 'none';
  dom.spView.style.display = 'block';

  const col   = getColor(d.type);
  const peers = state.extraLinks
    .filter(l => l.source === d.id || l.target === d.id)
    .map(l => state.nodes.find(n => n.id === (l.source === d.id ? l.target : l.source)))
    .filter(Boolean);

  let connHTML = '';
  if (peers.length) {
    connHTML = `<div class="tt-divider"></div>
      <div class="tt-section-label">Connections</div>
      <div class="tt-connections">`;
    peers.forEach(p => {
      connHTML += `<span class="tt-conn-chip" style="border-color:${getColor(p.type)}44;color:${getColor(p.type)}cc;">
        ⇌ ${p.name}
        <button class="tt-conn-remove" data-action="removeExtraLink" data-id-a="${d.id}" data-id-b="${p.id}">✕</button>
      </span>`;
    });
    connHTML += `</div>`;
  }

  const isMe = d.id === 'me';
  const std     = getStdStatus(d.stdTestedDate);
  const stdHTML = (d.stdTestedDate && std.color) ? `<div class="tt-row">STD tested:
    <span style="color:${std.color}">${std.label}</span>
    <span style="color:#666;font-size:10px;margin-left:4px">${d.stdTestedDate}</span>
  </div>` : '';
  dom.spView.innerHTML = `
    <div class="tt-name" style="color:${col}">${d.name}</div>
    <div class="tt-row">Type: <span>${capitalize(d.type)}</span></div>
    ${d.location ? `<div class="tt-row">Location: <span>${d.location}</span></div>` : ''}
    ${d.note     ? `<div class="tt-row">Note: <span>${d.note}</span></div>`         : ''}
    ${stdHTML}
    ${connHTML}
    <div class="tt-actions">
      <button class="btn-tt btn-tt-neutral" data-action="openEdit" data-id="${d.id}">✎ Edit ${isMe ? 'your info' : d.name}</button>
      ${!isMe ? `<button class="btn-tt btn-tt-danger" data-action="removePerson" data-id="${d.id}">Remove ${d.name}</button>` : ''}
      <button class="btn-tt btn-tt-import" data-action="showImportModal" data-id="${d.id}">↑ Import via link or QR</button>
      <div class="tt-overflow">
        <button class="btn-tt btn-tt-neutral tt-overflow-btn" data-action="togglePanelOverflow">⋯ More</button>
        <div class="tt-overflow-menu">
          <button class="overflow-item" data-action="triggerNetworkImport" data-id="${d.id}">↑ Import ${isMe ? 'your' : d.name + "'s"} network (JSON)</button>
        </div>
      </div>
    </div>`;

  dom.spEl.classList.add('visible');
}

export function hidePanel() {
  state.selectedNodeId = null;
  state.editingNodeId  = null;
  dom.spEl.classList.remove('visible');
}
