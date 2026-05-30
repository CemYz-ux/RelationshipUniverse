// ── Constants ─────────────────────────────────────────────────────────────────

const TYPE_COLORS = {
  partner: '#c9b8ff',
  friend:  '#ff9eb5',
  dating:  '#7dd4b8',
  crush:   '#ff5c8a',
  fling:   '#f4a868',
  ex:      '#9999bb',
  other:   '#aaaaaa',
  me:      '#ffffff'
};

const TYPE_EMOJIS = {
  partner: '♡',
  friend:  '✦',
  dating:  '◎',
  crush:   '♥',
  fling:   '~',
  ex:      '◇',
  other:   '·',
  me:      '✿'
};

const TYPE_SIZES = {
  partner: 44,
  friend:  40,
  dating:  38,
  crush:   36,
  fling:   34,
  ex:      34,
  other:   32,
  me:      56
};

// ── State ─────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'ru-graph';

let nodes = [
  { id: 'me', name: 'You', type: 'me', location: null, note: '' }
];

let links      = [];
let extraLinks = []; // all connections: [{ source: id, target: id }]

let connectMode          = null;
let linkPickMode         = null;
let selectedNodeId       = null;
let editingNodeId        = null;
let pendingNetworkNodeId = null;

// ── DOM refs ──────────────────────────────────────────────────────────────────

const spEl      = document.getElementById('side-panel');
const spView    = document.getElementById('sp-view');
const spEdit    = document.getElementById('sp-edit');
const svgEl     = document.getElementById('svg');
const container = document.getElementById('graph-container');
const svg       = d3.select('#svg');

let width  = container.offsetWidth;
let height = container.offsetHeight;
svgEl.setAttribute('viewBox', `0 0 ${width} ${height}`);

// ── D3 setup ──────────────────────────────────────────────────────────────────

const defs = svg.append('defs');
const rg = defs.append('radialGradient').attr('id', 'grad-me');
rg.append('stop').attr('offset', '0%').attr('stop-color', '#fff').attr('stop-opacity', 0.18);
rg.append('stop').attr('offset', '100%').attr('stop-color', '#fff').attr('stop-opacity', 0.03);

const g = svg.append('g');
const zoom = d3.zoom()
  .scaleExtent([0.3, 3])
  .on('zoom', e => g.attr('transform', e.transform));
svg.call(zoom);

const bubble   = document.getElementById('node-bubble');
const nbAdd    = document.getElementById('nb-add');
const nbLink   = document.getElementById('nb-link');
const nbInfo   = document.getElementById('nb-info');

let bubbleNodeId = null;

let linkSel, nodeSel, simulation;

// ── Helpers ───────────────────────────────────────────────────────────────────

const getColor   = t => TYPE_COLORS[t] || '#888';
const getSize    = t => TYPE_SIZES[t]  || 34;
const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1);
const nodeKey    = n => (n.name || '').toLowerCase() + '|' + (n.location || '').toLowerCase();

function linkExists(a, b) {
  return extraLinks.some(l =>
    (l.source === a && l.target === b) || (l.source === b && l.target === a)
  );
}

function parseNodeArray(arr) {
  const result = arr.map(n => ({
    id:       n.id       || ('node_' + Date.now() + Math.random()),
    name:     n.name     || 'Unknown',
    type:     n.id === 'me' ? 'me' : (n.type || 'other'),
    location: n.location || null,
    note:     n.note     || ''
  }));
  if (!result.find(n => n.id === 'me')) {
    result.unshift({ id: 'me', name: 'You', type: 'me', location: null, note: '' });
  }
  return result;
}

// Convert old parentId-based save data into extraLinks entries
function extraLinksFromLegacyNodes(rawNodes) {
  const out = [];
  rawNodes.forEach(n => {
    if (n.id === 'me') return;
    const parent = n.parentId || 'me';
    const exists = out.some(l =>
      (l.source === parent && l.target === n.id) ||
      (l.source === n.id   && l.target === parent)
    );
    if (!exists) out.push({ source: parent, target: n.id });
  });
  return out;
}

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    nodes: nodes.map(({ id, name, type, location, note }) =>
      ({ id, name, type, location: location || null, note: note || '' })
    ),
    extraLinks
  }));
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);

    if (Array.isArray(saved)) {
      // Very old format: plain node array with parentId fields
      if (saved.length) {
        nodes      = parseNodeArray(saved);
        extraLinks = extraLinksFromLegacyNodes(saved);
      }
    } else if (saved && saved.nodes) {
      if (saved.nodes.length) nodes = parseNodeArray(saved.nodes);
      if (Array.isArray(saved.extraLinks) && saved.extraLinks.length) {
        extraLinks = saved.extraLinks;
      } else {
        // v2 save that still had parentId but no extraLinks
        extraLinks = extraLinksFromLegacyNodes(saved.nodes);
      }
    }
  } catch (_) {}
}

function rebuildLinks() {
  const nodeIds = new Set(nodes.map(n => n.id));
  links = extraLinks
    .filter(l => nodeIds.has(l.source) && nodeIds.has(l.target))
    .map(l => ({ source: l.source, target: l.target }));
}

// ── Graph ─────────────────────────────────────────────────────────────────────

function buildGraph() {
  g.selectAll('.link').remove();
  g.selectAll('.node-group').remove();

  linkSel = g.selectAll('.link')
    .data(links)
    .join('line')
    .attr('class', 'link link-extra')
    .style('stroke', d => {
      const sid = d.source.id || d.source;
      const sn  = nodes.find(n => n.id === sid);
      return sn ? getColor(sn.type) + '55' : 'rgba(255,255,255,0.2)';
    });

  nodeSel = g.selectAll('.node-group')
    .data(nodes, d => d.id)
    .join('g')
    .attr('class', 'node-group')
    .call(d3.drag()
      .on('start', dragStart)
      .on('drag',  dragged)
      .on('end',   dragEnd))
    .on('click', (e, d) => {
      e.stopPropagation();
      if (linkPickMode) {
        if (d.id !== linkPickMode) createExtraLink(linkPickMode, d.id);
        return;
      }
      showBubble(e, d);
    });

  nodeSel.each(function(d) {
    const sel = d3.select(this);
    const r   = getSize(d.type);
    const col = getColor(d.type);

    sel.append('circle')
      .attr('class', 'node-ring')
      .attr('r', r + 9)
      .style('stroke', col)
      .style('stroke-dasharray', '3 5')
      .style('opacity', 0.35);

    sel.append('circle')
      .attr('class', 'node-bg')
      .attr('r', r)
      .style('fill', d.type === 'me' ? 'url(#grad-me)' : col + '18')
      .style('stroke', col)
      .style('stroke-width', d.type === 'me' ? 2 : 1.5);

    sel.append('text')
      .attr('class', 'node-emoji')
      .attr('y', d.type === 'me' ? -14 : -7)
      .text(TYPE_EMOJIS[d.type] || '·')
      .style('fill', col)
      .style('font-size', d.type === 'me' ? '17px' : '13px');

    sel.append('text')
      .attr('class', 'node-label')
      .attr('y', 6)
      .text(d.name)
      .style('fill', col)
      .style('font-size', '11px');

    if (d.location) {
      sel.append('text')
        .attr('class', 'node-sublabel')
        .attr('y', 17)
        .text(d.location);
    }
  });

  if (simulation) simulation.stop();

  simulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id(d => d.id).distance(180).strength(0.4))
    .force('charge', d3.forceManyBody().strength(-300))
    .force('collision', d3.forceCollide().radius(d => getSize(d.type) + 20))
    .on('tick', ticked);

  const me = nodes.find(n => n.id === 'me');
  if (me) { me.fx = width / 2; me.fy = height / 2; }
}

function ticked() {
  linkSel
    .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
    .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
  nodeSel.attr('transform', d => `translate(${d.x},${d.y})`);
}

// ── Drag ──────────────────────────────────────────────────────────────────────

function dragStart(e, d) {
  hideBubble();
  if (!e.active) simulation.alphaTarget(0.3).restart();
  if (d.id !== 'me') { d.fx = d.x; d.fy = d.y; }
}
function dragged(e, d) {
  if (d.id !== 'me') { d.fx = e.x; d.fy = e.y; }
}
function dragEnd(e, d) {
  if (!e.active) simulation.alphaTarget(0);
  if (d.id !== 'me') { d.fx = null; d.fy = null; }
}

// ── Side panel: VIEW ──────────────────────────────────────────────────────────

function showPanel(e, d) {
  if (linkPickMode) return;
  if (selectedNodeId === d.id && spEl.classList.contains('visible')) {
    hidePanel(); return;
  }
  selectedNodeId = d.id;
  editingNodeId  = null;
  spEdit.style.display = 'none';
  spView.style.display = 'block';

  const col   = getColor(d.type);
  const peers = extraLinks
    .filter(l => l.source === d.id || l.target === d.id)
    .map(l => nodes.find(n => n.id === (l.source === d.id ? l.target : l.source)))
    .filter(Boolean);

  let connHTML = '';
  if (peers.length) {
    connHTML = `<div class="tt-divider"></div>
      <div class="tt-section-label">Connections</div>
      <div class="tt-connections">`;
    peers.forEach(p => {
      connHTML += `<span class="tt-conn-chip tt-conn-peer" style="border-color:${getColor(p.type)}44;color:${getColor(p.type)}cc;">⇌ ${p.name}<button class="tt-conn-remove" onclick="removeExtraLink('${d.id}','${p.id}')">✕</button></span>`;
    });
    connHTML += `</div>`;
  }

  const isMe = d.id === 'me';
  spView.innerHTML = `
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
    </div>`;

  spEl.classList.add('visible');
}

function hidePanel() {
  selectedNodeId = null;
  editingNodeId  = null;
  spEl.classList.remove('visible');
}

svg.on('click', () => {
  if (linkPickMode) { cancelLinkPickMode(); return; }
  hideBubble();
  hidePanel();
});

// ── Node bubble ───────────────────────────────────────────────────────────────

function showBubble(e, d) {
  // If same node tapped again, toggle off
  if (bubbleNodeId === d.id && bubble.classList.contains('visible')) {
    hideBubble(); return;
  }
  bubbleNodeId = d.id;
  hidePanel();

  // Convert D3 graph coords → screen coords
  const transform = d3.zoomTransform(svgEl);
  const svgRect   = svgEl.getBoundingClientRect();
  const sx = svgRect.left + transform.applyX(d.x);
  const sy = svgRect.top  + transform.applyY(d.y) - getSize(d.type) - 9; // sit above the ring

  bubble.style.left = sx + 'px';
  bubble.style.top  = sy + 'px';

  // Tint the + button to the node color
  nbAdd.style.color       = getColor(d.type);
  nbAdd.style.borderColor = getColor(d.type) + '55';

  // Hide "add" for the You node if desired — keep it, it's useful
  bubble.classList.add('visible');
}

function hideBubble() {
  bubbleNodeId = null;
  bubble.classList.remove('visible');
}

nbAdd.addEventListener('click', e => {
  e.stopPropagation();
  const d = nodes.find(n => n.id === bubbleNodeId);
  if (!d) return;
  hideBubble();
  startConnectMode(d.id, d.name);
});

nbLink.addEventListener('click', e => {
  e.stopPropagation();
  const id = bubbleNodeId;
  hideBubble();
  startLinkPickMode(id);
});

nbInfo.addEventListener('click', e => {
  e.stopPropagation();
  const d = nodes.find(n => n.id === bubbleNodeId);
  if (!d) return;
  hideBubble();
  showPanel({ stopPropagation: () => {} }, d);
});

// ── Side panel: EDIT ──────────────────────────────────────────────────────────

function openEdit(id) {
  const d = nodes.find(n => n.id === id);
  if (!d) return;
  editingNodeId = id;

  document.getElementById('edit-title').textContent = `Editing ${d.name}`;
  document.getElementById('edit-name').value         = d.name;
  document.getElementById('edit-location').value     = d.location || '';
  document.getElementById('edit-note').value         = d.note     || '';

  selectEditType(d.type || 'other');
  document.getElementById('edit-type-dropdown').style.opacity       = id === 'me' ? '0.4' : '1';
  document.getElementById('edit-type-dropdown').style.pointerEvents = id === 'me' ? 'none' : '';

  spView.style.display = 'none';
  spEdit.style.display = 'block';
}

function cancelEdit() {
  spEdit.style.display = 'none';
  spView.style.display = 'block';
  editingNodeId = null;
  const d = nodes.find(n => n.id === selectedNodeId);
  if (d) showPanel({ stopPropagation: () => {} }, d);
}

function saveEdit() {
  const d = nodes.find(n => n.id === editingNodeId);
  if (!d) return;

  d.name     = document.getElementById('edit-name').value.trim()     || d.name;
  if (d.id !== 'me') d.type = document.getElementById('edit-type').value || d.type;
  d.location = document.getElementById('edit-location').value.trim() || null;
  d.note     = document.getElementById('edit-note').value.trim()     || '';

  spEdit.style.display = 'none';
  spView.style.display = 'block';
  editingNodeId = null;

  rebuildLinks();
  buildGraph();
  simulation.alpha(0.3).restart();
  saveToStorage();

  const updated = nodes.find(n => n.id === d.id);
  if (updated) showPanel({ stopPropagation: () => {} }, updated);
}

document.getElementById('edit-note').addEventListener('keydown', e => {
  if (e.key === 'Enter') saveEdit();
});

// ── Connect mode (add new node linked to existing) ────────────────────────────

function startConnectMode(nodeId, nodeName) {
  connectMode = nodeId;
  hidePanel();
  document.getElementById('connect-to-label').textContent   = `→ ${nodeName}:`;
  document.getElementById('connect-to-label').style.display = 'block';
  document.getElementById('connect-cancel').style.display   = 'block';
  document.getElementById('name-input').focus();
}

function cancelConnectMode() {
  connectMode = null;
  document.getElementById('connect-to-label').style.display = 'none';
  document.getElementById('connect-cancel').style.display   = 'none';
  document.getElementById('name-input').value               = '';
  document.getElementById('location-input').value           = '';
}

// ── Link pick mode (connect two existing nodes) ───────────────────────────────

function startLinkPickMode(fromId) {
  const from = nodes.find(n => n.id === fromId);
  if (!from) return;
  linkPickMode   = fromId;
  selectedNodeId = fromId;

  svgEl.classList.add('link-pick-active');

  spView.innerHTML = `
    <div class="tt-name" style="color:${getColor(from.type)}">${from.name}</div>
    <div class="tt-row" style="margin-top:8px;">Click any other node to link it to <strong>${from.name}</strong>.</div>
    <div class="tt-actions">
      <button class="btn-tt btn-tt-neutral" onclick="cancelLinkPickMode()">✕ Cancel</button>
    </div>`;
  spEdit.style.display = 'none';
  spView.style.display = 'block';
  spEl.classList.add('visible');
}

function cancelLinkPickMode() {
  linkPickMode = null;
  svgEl.classList.remove('link-pick-active');
  hidePanel();
}

function createExtraLink(sourceId, targetId) {
  if (!linkExists(sourceId, targetId)) {
    extraLinks.push({ source: sourceId, target: targetId });
    rebuildLinks();
    buildGraph();
    simulation.alpha(0.2).restart();
    saveToStorage();
  }
  linkPickMode = null;
  svgEl.classList.remove('link-pick-active');
  const src = nodes.find(n => n.id === sourceId);
  if (src) showPanel({ stopPropagation: () => {} }, src);
}

function removeExtraLink(idA, idB) {
  extraLinks = extraLinks.filter(l =>
    !((l.source === idA && l.target === idB) || (l.source === idB && l.target === idA))
  );
  rebuildLinks();
  buildGraph();
  simulation.alpha(0.2).restart();
  saveToStorage();
  const d = nodes.find(n => n.id === idA);
  if (d) showPanel({ stopPropagation: () => {} }, d);
}

// ── Add / Remove ──────────────────────────────────────────────────────────────

function addPerson() {
  const name     = document.getElementById('name-input').value.trim();
  const type     = document.getElementById('type-select').value;
  const location = document.getElementById('location-input').value.trim();
  if (!name) return;

  const fromId     = connectMode || 'me';
  const fromNode   = nodes.find(n => n.id === fromId);
  const id         = name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
  const angle      = Math.random() * 2 * Math.PI;
  const dist       = 200 + Math.random() * 60;
  const px         = (fromNode && fromNode.x) ? fromNode.x : width  / 2;
  const py         = (fromNode && fromNode.y) ? fromNode.y : height / 2;

  nodes.push({
    id, name, type,
    location: location || null,
    note: '',
    x: px + Math.cos(angle) * dist,
    y: py + Math.sin(angle) * dist
  });

  extraLinks.push({ source: fromId, target: id });

  document.getElementById('name-input').value     = '';
  document.getElementById('location-input').value = '';
  cancelConnectMode();
  rebuildLinks();
  buildGraph();
  simulation.alpha(0.4).restart();
  saveToStorage();
}

function removePerson(id) {
  nodes      = nodes.filter(n => n.id !== id);
  extraLinks = extraLinks.filter(l => l.source !== id && l.target !== id);
  hidePanel();
  rebuildLinks();
  buildGraph();
  simulation.alpha(0.5).restart();
  saveToStorage();
}

function clearAll() {
  if (!confirm('Clear all relationships? This cannot be undone.')) return;
  nodes      = [{ id: 'me', name: 'You', type: 'me', location: null, note: '' }];
  extraLinks = [];
  hidePanel();
  rebuildLinks();
  buildGraph();
  simulation.alpha(0.3).restart();
  saveToStorage();
}

// ── Export ────────────────────────────────────────────────────────────────────

function exportJSON() {
  const data = {
    version:  3,
    exported: new Date().toISOString(),
    nodes: nodes.map(n => ({
      id:       n.id,
      name:     n.name,
      type:     n.type,
      location: n.location || null,
      note:     n.note     || ''
    })),
    extraLinks
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = 'relationship-graph.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

// ── Import (replace) ──────────────────────────────────────────────────────────

function importJSON(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.nodes || !Array.isArray(data.nodes)) throw new Error('Invalid format');

      nodes = parseNodeArray(data.nodes);
      extraLinks = Array.isArray(data.extraLinks) && data.extraLinks.length
        ? data.extraLinks
        : extraLinksFromLegacyNodes(data.nodes);

      hidePanel();
      rebuildLinks();
      buildGraph();
      simulation.alpha(0.8).restart();
      saveToStorage();

      showFeedback('✓ Imported!');
    } catch (err) {
      alert('Could not import: ' + err.message);
    }
    event.target.value = '';
  };
  reader.readAsText(file);
}

// ── Import network (merge) ────────────────────────────────────────────────────

function triggerNetworkImport(nodeId) {
  pendingNetworkNodeId = nodeId;
  hidePanel();
  document.getElementById('import-network-input').click();
}

function importNetworkJSON(event) {
  const file = event.target.files[0];
  if (!file || !pendingNetworkNodeId) return;

  const anchorId   = pendingNetworkNodeId;
  const anchorNode = nodes.find(n => n.id === anchorId);
  if (!anchorNode) return;

  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.nodes || !Array.isArray(data.nodes)) throw new Error('Invalid format');

      const prefix    = anchorId + '_net_' + Date.now() + '_';
      const theirMe   = data.nodes.find(n => n.id === 'me' || n.type === 'me');
      const theirMeId = theirMe ? theirMe.id : null;
      const mapId     = id => (id === theirMeId) ? anchorId : prefix + id;

      const existingKeys = new Set(nodes.map(nodeKey));

      const newNodes = data.nodes
        .filter(n => n.id !== theirMeId)
        .map(n => {
          if (existingKeys.has(nodeKey(n))) return null;
          return {
            id:       mapId(n.id),
            name:     n.name     || 'Unknown',
            type:     n.type     || 'other',
            location: n.location || null,
            note:     n.note     || ''
          };
        })
        .filter(Boolean);

      if (newNodes.length === 0) {
        alert('No new nodes to import (all may already exist).');
        event.target.value = '';
        return;
      }

      // Build links from the imported data
      const theirLinks = Array.isArray(data.extraLinks) && data.extraLinks.length
        ? data.extraLinks
        : extraLinksFromLegacyNodes(data.nodes);

      const addedIds  = new Set(newNodes.map(n => n.id));
      const allIds    = new Set(nodes.map(n => n.id));
      newNodes.forEach(n => allIds.add(n.id));

      const newLinks = theirLinks
        .map(l => ({ source: mapId(l.source), target: mapId(l.target) }))
        .filter(l => allIds.has(l.source) && allIds.has(l.target))
        .filter(l => !linkExists(l.source, l.target));

      // Always link anchor → imported node if not already connected
      newNodes.forEach(n => {
        if (!linkExists(anchorId, n.id) && !newLinks.some(l =>
          (l.source === anchorId && l.target === n.id) ||
          (l.source === n.id && l.target === anchorId)
        )) {
          newLinks.push({ source: anchorId, target: n.id });
        }
      });

      newNodes.forEach(n => {
        const angle = Math.random() * 2 * Math.PI;
        const dist  = 130 + Math.random() * 80;
        n.x = (anchorNode.x || width  / 2) + Math.cos(angle) * dist;
        n.y = (anchorNode.y || height / 2) + Math.sin(angle) * dist;
      });

      nodes      = nodes.concat(newNodes);
      extraLinks = extraLinks.concat(newLinks);
      rebuildLinks();
      buildGraph();
      simulation.alpha(0.6).restart();
      saveToStorage();

      showFeedback(`✓ ${newNodes.length} node${newNodes.length > 1 ? 's' : ''} imported from ${anchorNode.name}'s network`);
    } catch (err) {
      alert('Could not import network: ' + err.message);
    }
    event.target.value       = '';
    pendingNetworkNodeId = null;
  };
  reader.readAsText(file);
}

// ── Feedback toast ────────────────────────────────────────────────────────────

function showFeedback(msg) {
  const fb = document.getElementById('import-feedback');
  fb.textContent   = msg;
  fb.style.display = 'block';
  setTimeout(() => {
    fb.style.display = 'none';
    fb.textContent   = '✓ Imported!';
  }, 3000);
}

// ── Type dropdown (add panel) ─────────────────────────────────────────────────

let typeDropdownOpen = false;

function toggleTypeDropdown(e) {
  e.stopPropagation();
  typeDropdownOpen = !typeDropdownOpen;
  document.getElementById('type-menu').classList.toggle('open', typeDropdownOpen);
}

function selectType(value) {
  document.getElementById('type-select').value             = value;
  document.getElementById('type-dot').style.background     = getColor(value);
  document.getElementById('type-label').textContent        = capitalize(value);
  document.querySelectorAll('#type-menu .td-option').forEach(o =>
    o.classList.toggle('selected', o.dataset.value === value)
  );
  document.getElementById('type-menu').classList.remove('open');
  typeDropdownOpen = false;
}

// ── Type dropdown (edit panel) ────────────────────────────────────────────────

let editTypeDropdownOpen = false;

function toggleEditTypeDropdown(e) {
  e.stopPropagation();
  editTypeDropdownOpen = !editTypeDropdownOpen;
  const menu = document.getElementById('edit-type-menu');
  menu.classList.toggle('open', editTypeDropdownOpen);
  if (editTypeDropdownOpen) {
    const rect = e.currentTarget.getBoundingClientRect();
    menu.style.top  = (rect.bottom + 6) + 'px';
    menu.style.left = rect.left + 'px';
  }
}

function selectEditType(value) {
  document.getElementById('edit-type').value                    = value;
  document.getElementById('edit-type-dot').style.background     = getColor(value);
  document.getElementById('edit-type-label').textContent        = capitalize(value);
  document.querySelectorAll('#edit-type-menu .td-option').forEach(o =>
    o.classList.toggle('selected', o.dataset.value === value)
  );
  document.getElementById('edit-type-menu').classList.remove('open');
  editTypeDropdownOpen = false;
}

document.addEventListener('click', () => {
  if (typeDropdownOpen) {
    typeDropdownOpen = false;
    document.getElementById('type-menu').classList.remove('open');
  }
  if (editTypeDropdownOpen) {
    editTypeDropdownOpen = false;
    document.getElementById('edit-type-menu').classList.remove('open');
  }
});

// ── Event listeners ───────────────────────────────────────────────────────────

['name-input', 'location-input'].forEach(id => {
  document.getElementById(id).addEventListener('keydown', e => {
    if (e.key === 'Enter') addPerson();
  });
});

window.addEventListener('resize', () => {
  width  = container.offsetWidth;
  height = container.offsetHeight;
  svgEl.setAttribute('viewBox', `0 0 ${width} ${height}`);
  const me = nodes.find(n => n.id === 'me');
  if (me) { me.fx = width / 2; me.fy = height / 2; }
  if (simulation) simulation.alpha(0.3).restart();
});

// ── Init ──────────────────────────────────────────────────────────────────────

loadFromStorage();
rebuildLinks();
buildGraph();
