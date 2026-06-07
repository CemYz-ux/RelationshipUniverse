import { state, dom } from './state.js';
import { svg, g, zoom, getSimulation, buildGraph, rebuildLinks, setZoomCallback } from './graph.js';

// ── Projection ────────────────────────────────────────────────────────────────

// Unit-scale Mercator — the whole world maps to roughly [-0.5, 0.5]²
const mercator = d3.geoMercator()
  .scale(1 / (2 * Math.PI))
  .translate([0, 0]);

// ── Constants ─────────────────────────────────────────────────────────────────

// screen_radius = svg_radius × MAP_NODE_SCALE  (constant at every zoom level)
const MAP_NODE_SCALE = 0.5;

// ── Module state ──────────────────────────────────────────────────────────────

let landLayer = null;           // <g> inside g.graph-root for continent shapes
let worldCache = null;          // cached TopoJSON blob
const savedPos = new Map();
let savedZoom  = null;

// ── Land rendering ────────────────────────────────────────────────────────────

async function fetchWorld() {
  if (worldCache) return worldCache;
  worldCache = await d3.json(
    'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'
  );
  return worldCache;
}

async function renderLand() {
  if (!landLayer) return;
  const topojson = await import('https://cdn.jsdelivr.net/npm/topojson-client@3/+esm');
  const world    = await fetchWorld();
  const pathGen  = d3.geoPath(mercator);

  // 1. Country fills — very subtle so the dark bg still dominates
  landLayer.append('path')
    .datum(topojson.feature(world, world.objects.countries))
    .attr('class', 'land-fill')
    .attr('d', pathGen);

  // 2. Internal country borders (a ≠ b means shared edge between two countries)
  landLayer.append('path')
    .datum(topojson.mesh(world, world.objects.countries, (a, b) => a !== b))
    .attr('class', 'land-borders')
    .attr('d', pathGen);

  // 3. Coastlines / outer edge (a === b means boundary with the "exterior")
  landLayer.append('path')
    .datum(topojson.mesh(world, world.objects.countries, (a, b) => a === b))
    .attr('class', 'land-coast')
    .attr('d', pathGen);
}

// ── Node & link positioning ───────────────────────────────────────────────────

function positionNodesOnMap(transform, animate = true) {
  const dur = animate ? 700 : 0;
  const k   = transform.k;
  const noLocation = [];
  const onMap = new Set();

  // Project every located node to unit Mercator space
  state.nodes.forEach(node => {
    if (!node.lat || !node.lng) return;
    const [ux, uy] = mercator([node.lng, node.lat]);
    node.x = ux;
    node.y = uy;
    onMap.add(node.id);
  });


  // Position nodes — counter-scale so visual size stays constant on screen
  const nodeScale = MAP_NODE_SCALE / k;
  state.nodes.forEach(node => {
    const sel = g.selectAll('.node-group').filter(d => d.id === node.id);
    if (!sel.size()) return;

    if (!onMap.has(node.id)) {
      noLocation.push(node.name);
      sel.style('pointer-events', 'none')
         .transition().duration(dur / 2).style('opacity', 0);
      return;
    }

    sel.style('pointer-events', null)
       .transition().duration(dur).ease(d3.easeCubicInOut)
       .attr('transform', `translate(${node.x},${node.y}) scale(${nodeScale})`)
       .style('opacity', 1);
  });

  // Links — non-scaling stroke so they stay 1.5 px regardless of zoom
  g.selectAll('.link').each(function(d) {
    const src = d.source, tgt = d.target;
    const srcId = src.id ?? src, tgtId = tgt.id ?? tgt;
    if (onMap.has(srcId) && onMap.has(tgtId)) {
      d3.select(this)
        .style('vector-effect', 'non-scaling-stroke')
        .style('stroke-width', '1.5px')
        .transition().duration(dur).ease(d3.easeCubicInOut)
        .style('opacity', 0.5)
        .attr('x1', src.x).attr('y1', src.y)
        .attr('x2', tgt.x).attr('y2', tgt.y);
    } else {
      d3.select(this).transition().duration(dur / 2).style('opacity', 0);
    }
  });

  updateNoLocationList(noLocation);
}

// Called on every zoom/pan tick to keep nodes at a fixed screen size
function updateNodesOnZoom(transform) {
  const nodeScale = MAP_NODE_SCALE / transform.k;
  g.selectAll('.node-group').each(function(d) {
    if (d.x != null && d.y != null) {
      d3.select(this).attr('transform',
        `translate(${d.x},${d.y}) scale(${nodeScale})`);
    }
  });
}

// ── Fit initial zoom transform to the node bounding box ───────────────────────

function fitTransform(nodes) {
  const w = dom.container.offsetWidth;
  const h = dom.container.offsetHeight;

  if (!nodes.length) {
    return d3.zoomIdentity.translate(w / 2, h / 2).scale(1 << 9);
  }

  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  nodes.forEach(n => {
    const [ux, uy] = mercator([n.lng, n.lat]);
    if (ux < x0) x0 = ux; if (ux > x1) x1 = ux;
    if (uy < y0) y0 = uy; if (uy > y1) y1 = uy;
  });

  const spread = Math.max(x1 - x0, y1 - y0);
  const pad    = Math.max(0.004, spread * 0.4);
  x0 -= pad; x1 += pad; y0 -= pad; y1 += pad;

  const k  = Math.min(1 << 18, 0.85 * Math.min(w / (x1 - x0), h / (y1 - y0)));
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;

  return d3.zoomIdentity
    .translate(w / 2 - k * cx, h / 2 - k * cy)
    .scale(k);
}

// ── No-location notice ────────────────────────────────────────────────────────

function updateNoLocationList(names) {
  const el   = document.getElementById('map-no-location');
  const list = document.getElementById('map-nl-list');
  if (!el || !list) return;
  if (names.length) {
    el.style.display = 'block';
    list.textContent = names.join(', ');
  } else {
    el.style.display = 'none';
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function showMapView() {
  state.mapViewActive = true;
  document.getElementById('map-switch')?.classList.add('active');

  // Persist current simulation positions so we can restore them on exit
  savedPos.clear();
  state.nodes.forEach(n => { if (n.x != null) savedPos.set(n.id, { x: n.x, y: n.y }); });
  savedZoom = d3.zoomTransform(svg.node());

  getSimulation()?.stop();

  // Land layer lives as the first child of g.graph-root so it inherits the
  // zoom transform automatically and renders behind links and nodes.
  landLayer = g.insert('g', ':first-child').attr('class', 'land-layer');

  // Wide zoom range so users can zoom from world view to city level
  zoom.scaleExtent([1 << 8, 1 << 22]);

  // On every pan/zoom: rescale nodes to keep constant screen size
  setZoomCallback(e => {
    if (!state.mapViewActive) return;
    updateNodesOnZoom(e.transform);
  });

  const onMapNodes = state.nodes.filter(n => n.lat && n.lng);
  const t0 = fitTransform(onMapNodes);

  positionNodesOnMap(t0, false);

  // Animate zoom, then load land shapes (non-blocking)
  svg.transition().duration(800).ease(d3.easeCubicInOut)
    .call(zoom.transform, t0);

  renderLand(); // async, fires in background — land appears once fetched
}

export function hideMapView() {
  state.mapViewActive = false;
  document.getElementById('map-switch')?.classList.remove('active');

  setZoomCallback(() => {});
  zoom.scaleExtent([0.3, 3]);

  // Tear down land layer
  landLayer?.remove();
  landLayer = null;

  // Restore pre-map node positions
  state.nodes.forEach(n => {
    const p = savedPos.get(n.id);
    if (p) { n.x = p.x; n.y = p.y; }
  });
  savedPos.clear();

  // Reset all inline styles that map mode applied
  g.selectAll('.node-group').style('opacity', null).style('pointer-events', null);
  g.selectAll('.link')
    .style('opacity', null)
    .style('stroke-width', null)
    .style('vector-effect', null);

  // Restore graph-view zoom transform, then rebuild
  svg.call(zoom.transform, savedZoom || d3.zoomIdentity);
  savedZoom = null;

  rebuildLinks();
  buildGraph();
  getSimulation()?.alpha(0.2).restart();

  updateNoLocationList([]);
}

export function toggleMapView() {
  if (state.mapViewActive) hideMapView();
  else showMapView();
}

// Called after addPerson / saveEdit while map is active
export function refreshMapIfActive() {
  if (!state.mapViewActive) return;
  getSimulation()?.stop();
  const transform = d3.zoomTransform(svg.node());
  positionNodesOnMap(transform, false);
}
