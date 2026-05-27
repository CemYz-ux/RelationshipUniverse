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
  { id: 'me', name: 'You', type: 'me', location: null, note: '', parentId: null }
];

let links = [];

let connectMode    = null;
let selectedNodeId = null;
let editingNodeId  = null;
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

let linkSel, nodeSel, simulation;

// ── Helpers ───────────────────────────────────────────────────────────────────

const getColor   = t => TYPE_COLORS[t] || '#888';
const getSize    = t => TYPE_SIZES[t]  || 34;
const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1);

function parseNodeArray(arr) {
  const result = arr.map(n => ({
    id:       n.id       || ('node_' + Date.now() + Math.random()),
    name:     n.name     || 'Unknown',
    type:     n.id === 'me' ? 'me' : (n.type || 'other'),
    location: n.location || null,
    note:     n.note     || '',
    parentId: n.parentId || null
  }));
  if (!result.find(n => n.id === 'me')) {
    result.unshift({ id: 'me', name: 'You', type: 'me', location: null, note: '', parentId: null });
  }
  return result;
}

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(
    nodes.map(({ id, name, type, location, note, parentId }) =>
      ({ id, name, type, location: location || null, note: note || '', parentId: parentId || null })
    )
  ));
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (Array.isArray(saved) && saved.length) nodes = parseNodeArray(saved);
  } catch (_) {}
}

function rebuildLinks() {
  links = [];
  nodes.forEach(n => {
    if (n.id === 'me') return;
    const parent = n.parentId || 'me';
    if (nodes.find(x => x.id === parent)) {
      links.push({ source: parent, target: n.id, secondary: parent !== 'me' });
    }
  });
}

// ── Graph ─────────────────────────────────────────────────────────────────────

function buildGraph() {
  g.selectAll('.link').remove();
  g.selectAll('.node-group').remove();

  linkSel = g.selectAll('.link')
    .data(links)
    .join('line')
    .attr('class', d => 'link ' + (d.secondary ? 'link-secondary' : 'link-to-me'))
    .style('stroke', d => {
      const tid  = d.target.id || d.target;
      const tn   = nodes.find(n => n.id === tid);
      return tn ? getColor(tn.type) + (d.secondary ? '22' : '30') : 'rgba(255,255,255,0.06)';
    });

  nodeSel = g.selectAll('.node-group')
    .data(nodes, d => d.id)
    .join('g')
    .attr('class', 'node-group')
    .call(d3.drag()
      .on('start', dragStart)
      .on('drag',  dragged)
      .on('end',   dragEnd))
    .on('click', (e, d) => { e.stopPropagation(); showPanel(e, d); });

  nodeSel.each(function(d) {
    const sel = d3.select(this);
    const r   = getSize(d.type);
    const col = getColor(d.type);
    const sec = d.parentId && d.parentId !== 'me';

    sel.append('circle')
      .attr('class', 'node-ring')
      .attr('r', r + 9)
      .style('stroke', col)
      .style('stroke-dasharray', '3 5')
      .style('opacity', sec ? 0.2 : 0.35);

    sel.append('circle')
      .attr('class', 'node-bg')
      .attr('r', r)
      .style('fill', d.type === 'me' ? 'url(#grad-me)' : col + (sec ? '10' : '18'))
      .style('stroke', col)
      .style('stroke-width', d.type === 'me' ? 2 : (sec ? 1 : 1.5))
      .style('stroke-opacity', sec ? 0.5 : 1);

    sel.append('text')
      .attr('class', 'node-emoji')
      .attr('y', d.type === 'me' ? -14 : -7)
      .text(TYPE_EMOJIS[d.type] || '·')
      .style('fill', col)
      .style('font-size', d.type === 'me' ? '17px' : (sec ? '11px' : '13px'))
      .style('opacity', sec ? 0.6 : 1);

    sel.append('text')
      .attr('class', 'node-label')
      .attr('y', 6)
      .text(d.name)
      .style('fill', col)
      .style('opacity', sec ? 0.7 : 1)
      .style('font-size', sec ? '10px' : '11px');

    if (d.location) {
      sel.append('text')
        .attr('class', 'node-sublabel')
        .attr('y', 17)
        .text(d.location)
        .style('opacity', sec ? 0.5 : 1);
    }

  });

  if (simulation) simulation.stop();

  simulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id(d => d.id)
      .distance(d => d.secondary ? 110 : 165)
      .strength(d  => d.secondary ? 0.7  : 0.5))
    .force('charge', d3.forceManyBody()
      .strength(d => d.parentId && d.parentId !== 'me' ? -180 : -300))
    .force('center', d3.forceCenter(width / 2, height / 2))
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
  if (selectedNodeId === d.id && spEl.classList.contains('visible')) {
    hidePanel(); return;
  }
  selectedNodeId = d.id;
  editingNodeId  = null;
  spEdit.style.display = 'none';
  spView.style.display = 'block';

  const col      = getColor(d.type);
  const children = nodes.filter(n => n.parentId === d.id);
  const parentN  = d.parentId ? nodes.find(n => n.id === d.parentId) : null;

  let connHTML = '';
  if (parentN || children.length) {
    connHTML = `<div class="tt-divider"></div>
      <div class="tt-section-label">Connections</div>
      <div class="tt-connections">`;
    if (parentN) {
      connHTML += `<span class="tt-conn-chip" style="border-color:${getColor(parentN.type)}44;color:${getColor(parentN.type)}cc;">↑ ${parentN.name}</span>`;
    }
    children.forEach(c => {
      connHTML += `<span class="tt-conn-chip" style="border-color:${getColor(c.type)}44;color:${getColor(c.type)}cc;">↳ ${c.name}</span>`;
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

svg.on('click', hidePanel);

// ── Side panel: EDIT ──────────────────────────────────────────────────────────

function openEdit(id) {
  const d = nodes.find(n => n.id === id);
  if (!d) return;
  editingNodeId = id;

  document.getElementById('edit-title').textContent    = `Editing ${d.name}`;
  document.getElementById('edit-name').value           = d.name;
  document.getElementById('edit-type').value           = d.type;
  document.getElementById('edit-location').value       = d.location || '';
  document.getElementById('edit-note').value           = d.note     || '';
  document.getElementById('edit-type').disabled        = (id === 'me');

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
  if (d.id !== 'me') d.type = document.getElementById('edit-type').value;
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

// ── Connect mode ──────────────────────────────────────────────────────────────

function startConnectMode(nodeId, nodeName) {
  connectMode = nodeId;
  hidePanel();
  document.getElementById('connect-to-label').textContent  = `→ ${nodeName}:`;
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

// ── Add / Remove ──────────────────────────────────────────────────────────────

function addPerson() {
  const name     = document.getElementById('name-input').value.trim();
  const type     = document.getElementById('type-select').value;
  const location = document.getElementById('location-input').value.trim();
  if (!name) return;

  const parentId   = connectMode || null;
  const id         = name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
  const parentNode = nodes.find(n => n.id === (parentId || 'me'));
  const angle      = Math.random() * 2 * Math.PI;
  const dist       = 120 + Math.random() * 60;
  const px         = (parentNode && parentNode.x) ? parentNode.x : width  / 2;
  const py         = (parentNode && parentNode.y) ? parentNode.y : height / 2;

  nodes.push({
    id, name, type,
    location: location || null,
    note: '',
    parentId,
    x: px + Math.cos(angle) * dist,
    y: py + Math.sin(angle) * dist
  });

  document.getElementById('name-input').value     = '';
  document.getElementById('location-input').value = '';
  cancelConnectMode();
  rebuildLinks();
  buildGraph();
  simulation.alpha(0.4).restart();
  saveToStorage();
}

function removePerson(id) {
  function descendants(nid) {
    const kids = nodes.filter(n => n.parentId === nid).map(n => n.id);
    return kids.reduce((a, k) => a.concat(k, descendants(k)), []);
  }
  const gone = new Set([id, ...descendants(id)]);
  nodes = nodes.filter(n => !gone.has(n.id));
  hidePanel();
  rebuildLinks();
  buildGraph();
  simulation.alpha(0.5).restart();
  saveToStorage();
}

function clearAll() {
  if (!confirm('Clear all relationships? This cannot be undone.')) return;
  nodes = [{ id: 'me', name: 'You', type: 'me', location: null, note: '', parentId: null }];
  hidePanel();
  rebuildLinks();
  buildGraph();
  simulation.alpha(0.3).restart();
  saveToStorage();
}

// ── Export ────────────────────────────────────────────────────────────────────

function exportJSON() {
  const data = {
    version:  1,
    exported: new Date().toISOString(),
    nodes: nodes.map(n => ({
      id:       n.id,
      name:     n.name,
      type:     n.type,
      location: n.location || null,
      note:     n.note     || '',
      parentId: n.parentId || null
    }))
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

      const mapId = id => (id === theirMeId) ? anchorId : prefix + id;

      const newNodes = data.nodes
        .filter(n => n.id !== theirMeId)
        .map(n => {
          const exists = nodes.find(x =>
            x.name.toLowerCase() === (n.name || '').toLowerCase() && x.id !== 'me'
          );
          if (exists) return null;
          const rawParent = n.parentId || theirMeId;
          return {
            id:       mapId(n.id),
            name:     n.name     || 'Unknown',
            type:     n.type     || 'other',
            location: n.location || null,
            note:     n.note     || '',
            parentId: mapId(rawParent)
          };
        })
        .filter(Boolean);

      if (newNodes.length === 0) {
        alert('No new nodes to import (all may already exist).');
        event.target.value = '';
        return;
      }

      newNodes.forEach(n => {
        const angle = Math.random() * 2 * Math.PI;
        const dist  = 130 + Math.random() * 80;
        n.x = (anchorNode.x || width  / 2) + Math.cos(angle) * dist;
        n.y = (anchorNode.y || height / 2) + Math.sin(angle) * dist;
      });

      nodes = nodes.concat(newNodes);
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
  fb.textContent  = msg;
  fb.style.display = 'block';
  setTimeout(() => {
    fb.style.display = 'none';
    fb.textContent   = '✓ Imported!';
  }, 3000);
}

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
  if (simulation) {
    simulation.force('center', d3.forceCenter(width / 2, height / 2)).alpha(0.3).restart();
  }
});

// ── Init ──────────────────────────────────────────────────────────────────────

loadFromStorage();
rebuildLinks();
buildGraph();
