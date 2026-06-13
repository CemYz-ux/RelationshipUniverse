import { state, dom } from './state.js';
import { getColor, getSize, getStdStatus } from './helpers.js';
import { TYPE_EMOJIS } from './constants.js';
import { buildAdjacency, buildSpanningTree, orderSiblings, computeRadialLayout } from './layout.js';

// ── Force-simulation tuning ───────────────────────────────────────────────────

const LINK_DISTANCE   = 180;   // resting length of each connection
const LINK_STRENGTH   = 0.4;   // how strongly links pull connected nodes together
const CHARGE_STRENGTH = -300;  // node-to-node repulsion (negative = repel)
const COLLISION_PAD   = 20;    // extra space around a node's radius for collision
const UNTANGLE_HOLD_MS = 800;  // how long untangle pins nodes before releasing them

// ── Dimensions ────────────────────────────────────────────────────────────────

export let width  = dom.container.offsetWidth;
export let height = dom.container.offsetHeight;
dom.svgEl.setAttribute('viewBox', `0 0 ${width} ${height}`);

export function updateDimensions() {
  width  = dom.container.offsetWidth;
  height = dom.container.offsetHeight;
  dom.svgEl.setAttribute('viewBox', `0 0 ${width} ${height}`);
}

// ── D3 setup ──────────────────────────────────────────────────────────────────

export const svg = d3.select('#svg');

const defs = svg.append('defs');
const rg   = defs.append('radialGradient').attr('id', 'grad-me');
rg.append('stop').attr('offset', '0%').attr('stop-color', '#fff').attr('stop-opacity', 0.18);
rg.append('stop').attr('offset', '100%').attr('stop-color', '#fff').attr('stop-opacity', 0.03);

export const g    = svg.append('g').attr('class', 'graph-root');
export const zoom = d3.zoom()
  .scaleExtent([0.3, 3])
  .on('zoom', e => { g.attr('transform', e.transform); _onZoom(e); });
svg.call(zoom);

// ── Simulation ────────────────────────────────────────────────────────────────

let simulation = null;
export const getSimulation = () => simulation;

let linkSel, nodeSel;

// ── Callbacks registered from main.js ────────────────────────────────────────

let _onNodeClick  = () => {};
let _onDragStart  = () => {};
let _onZoom       = () => {};

export function setNodeClickHandler(fn) { _onNodeClick = fn; }
export function setDragStartCallback(fn) { _onDragStart = fn; }
export function setZoomCallback(fn) { _onZoom = fn; }

// ── Rebuild links array from extraLinks ───────────────────────────────────────

export function rebuildLinks() {
  const nodeIds = new Set(state.nodes.map(n => n.id));
  state._links  = state.extraLinks
    .filter(l => nodeIds.has(l.source) && nodeIds.has(l.target))
    .map(l => ({ source: l.source, target: l.target }));
}

// ── Build / rebuild the D3 graph ──────────────────────────────────────────────

export function buildGraph() {
  g.selectAll('.link').remove();
  g.selectAll('.node-group').remove();

  linkSel = g.selectAll('.link')
    .data(state._links || [])
    .join('line')
    .attr('class', 'link link-extra')
    .style('stroke', d => {
      const sid = d.source.id || d.source;
      const sn  = state.nodes.find(n => n.id === sid);
      return sn ? getColor(sn.type) + '55' : 'rgba(255,255,255,0.2)';
    });

  nodeSel = g.selectAll('.node-group')
    .data(state.nodes, d => d.id)
    .join('g')
    .attr('class', 'node-group')
    .attr('data-node-id', d => d.id)
    .call(d3.drag()
      .on('start', dragStart)
      .on('drag',  dragged)
      .on('end',   dragEnd))
    .on('click', (e, d) => { e.stopPropagation(); _onNodeClick(e, d); });

  nodeSel.each(function(d) {
    const sel = d3.select(this);
    const r   = getSize(d.type);
    const col = getColor(d.type);

    sel.append('circle').attr('class', 'node-ring').attr('r', r + 9)
      .style('stroke', col).style('stroke-dasharray', '3 5').style('opacity', 0.35);

    const std = getStdStatus(d.stdTestedDate);
    if (std.color) {
      sel.append('circle').attr('class', 'node-std-ring').attr('r', r + 4)
        .style('fill', 'none')
        .style('stroke', std.color)
        .style('stroke-width', 2.5)
        .style('opacity', 0.85);
    }

    sel.append('circle').attr('class', 'node-bg').attr('r', r)
      .style('fill', d.type === 'me' ? 'url(#grad-me)' : col + '18')
      .style('stroke', col)
      .style('stroke-width', d.type === 'me' ? 2 : 1.5);

    sel.append('text').attr('class', 'node-emoji')
      .attr('y', d.type === 'me' ? -14 : -7)
      .text(TYPE_EMOJIS[d.type] || '·')
      .style('fill', col)
      .style('font-size', d.type === 'me' ? '17px' : '13px');

    sel.append('text').attr('class', 'node-label').attr('y', 6)
      .text(d.name).style('fill', col).style('font-size', '11px');

    if (d.location) {
      sel.append('text').attr('class', 'node-sublabel').attr('y', 17).text(d.location);
    }
  });

  if (simulation) simulation.stop();

  simulation = d3.forceSimulation(state.nodes)
    .force('link', d3.forceLink(state._links || []).id(d => d.id).distance(LINK_DISTANCE).strength(LINK_STRENGTH))
    .force('charge', d3.forceManyBody().strength(CHARGE_STRENGTH))
    .force('collision', d3.forceCollide().radius(d => getSize(d.type) + COLLISION_PAD))
    .on('tick', ticked);

  // In map mode the simulation must not run — node positions are managed by
  // mapView.js and any ticks would strip the counter-scale transform off nodes.
  if (state.mapViewActive) simulation.stop();

  const me = state.nodes.find(n => n.id === 'me');
  if (me) { me.fx = width / 2; me.fy = height / 2; }
}

function ticked() {
  if (linkSel) linkSel
    .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
    .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
  if (nodeSel) nodeSel.attr('transform', d => `translate(${d.x},${d.y})`);
}

// ── Drag ──────────────────────────────────────────────────────────────────────

function dragStart(e, d) {
  if (state.mapViewActive) return;   // nodes are pinned to map coords — don't touch the sim
  _onDragStart();
  if (!e.active) simulation.alphaTarget(0.3).restart();
  if (d.id !== 'me') { d.fx = d.x; d.fy = d.y; }
}
function dragged(e, d) {
  if (state.mapViewActive) return;
  if (d.id !== 'me') { d.fx = e.x; d.fy = e.y; }
}
function dragEnd(e, d) {
  if (state.mapViewActive) return;
  if (!e.active) simulation.alphaTarget(0);
  if (d.id !== 'me') { d.fx = null; d.fy = null; }
}

// ── Untangle: radial tree layout (connected siblings placed adjacent) ──────────

export function untangleNodes() {
  if (!simulation || state.nodes.length === 0) return;

  const cx = width / 2;
  const cy = height / 2;
  const positions = computeRadialLayout(state.nodes, state._links || [], cx, cy);

  state.nodes.forEach(n => {
    const pos = positions.get(n.id);
    if (!pos) return;
    n.fx = pos.x; n.fy = pos.y; n.x = pos.x; n.y = pos.y;
  });

  simulation.alpha(0.3).restart();
  setTimeout(() => {
    state.nodes.forEach(n => { if (n.id !== 'me') { n.fx = null; n.fy = null; } });
    simulation.alpha(0.1).restart();
  }, UNTANGLE_HOLD_MS);
}

