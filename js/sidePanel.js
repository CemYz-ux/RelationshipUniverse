import { state, dom } from './state.js';
import { getColor, capitalize } from './helpers.js';

export function showPanel(e, d) {
  if (state.linkPickMode) return;
  if (state.selectedNodeId === d.id && dom.spEl.classList.contains('visible')) {
    hidePanel(); return;
  }
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
        <button class="tt-conn-remove" onclick="removeExtraLink('${d.id}','${p.id}')">✕</button>
      </span>`;
    });
    connHTML += `</div>`;
  }

  const isMe = d.id === 'me';
  dom.spView.innerHTML = `
    <div class="tt-name" style="color:${col}">${d.name}</div>
    <div class="tt-row">Type: <span>${capitalize(d.type)}</span></div>
    ${d.location ? `<div class="tt-row">Location: <span>${d.location}</span></div>` : ''}
    ${d.note     ? `<div class="tt-row">Note: <span>${d.note}</span></div>`         : ''}
    ${connHTML}
    <div class="tt-actions">
      <button class="btn-tt btn-tt-neutral" onclick="openEdit('${d.id}')">✎ Edit ${isMe ? 'your info' : d.name}</button>
      <button class="btn-tt btn-tt-neutral" onclick="startLinkPickMode('${d.id}')">⇌ Link to existing node</button>
      <button class="btn-tt btn-tt-primary" onclick="startConnectMode('${d.id}','${d.name}')">+ Add connection to ${isMe ? 'you' : d.name}</button>
      <button class="btn-tt btn-tt-import" onclick="triggerNetworkImport('${d.id}')">↑ Import ${isMe ? 'your' : d.name + "'s"} network</button>
      ${!isMe ? `<button class="btn-tt btn-tt-danger" onclick="removePerson('${d.id}')">Remove ${d.name}</button>` : ''}
    </div>
    <div class="tt-divider"></div>
    <div class="tt-url-import">
      <input class="tt-url-input" type="text" placeholder="Paste share URL to import…" id="sp-url-input" />
      <button class="btn-tt btn-tt-import" onclick="importFromURL('${d.id}')">↑ Import</button>
    </div>`;

  dom.spEl.classList.add('visible');
}

export function hidePanel() {
  state.selectedNodeId = null;
  state.editingNodeId  = null;
  dom.spEl.classList.remove('visible');
}
