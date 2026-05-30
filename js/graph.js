import { state, dom } from './state.js';
import { getColor, getSize } from './helpers.js';
import { TYPE_EMOJIS } from './constants.js';

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

export const g    = svg.append('g');
export const zoom = d3.zoom()
  .scaleExtent([0.3, 3])
  .on('zoom', e => g.attr('transform', e.transform));
svg.call(zoom);

// ── Simulation ────────────────────────────────────────────────────────────────

let simulation = null;
export const getSimulation = () => simulation;

let linkSel, nodeSel;

// ── Callbacks registered from main.js ────────────────────────────────────────

let _onNodeClick  = () => {};
let _onDragStart  = () => {};

export function setNodeClickHandler(fn) { _onNodeClick = fn; }
export function setDragStartCallback(fn) { _onDragStart = fn; }

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
    .force('link', d3.forceLink(state._links || []).id(d => d.id).distance(180).strength(0.4))
    .force('charge', d3.forceManyBody().strength(-300))
    .force('collision', d3.forceCollide().radius(d => getSize(d.type) + 20))
    .on('tick', ticked);

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
  _onDragStart();
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
