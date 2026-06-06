// Pure layout functions for the untangle feature.
// No DOM or D3 dependencies — fully unit-testable.

export function buildAdjacency(nodes, links) {
  const adj = new Map(nodes.map(n => [n.id, new Set()]));
  links.forEach(l => {
    const sid = l.source?.id ?? l.source;
    const tid = l.target?.id ?? l.target;
    adj.get(sid)?.add(tid);
    adj.get(tid)?.add(sid);
  });
  nodes.forEach(n => {
    if (n.parentId && adj.has(n.parentId) && adj.has(n.id)) {
      adj.get(n.parentId).add(n.id);
      adj.get(n.id).add(n.parentId);
    }
  });
  return adj;
}

export function buildSpanningTree(nodes, adj) {
  const children = new Map(nodes.map(n => [n.id, []]));
  const visited = new Set(['me']);
  const queue = ['me'];
  while (queue.length > 0) {
    const id = queue.shift();
    (adj.get(id) || []).forEach(nid => {
      if (!visited.has(nid)) {
        visited.add(nid);
        children.get(id).push(nid);
        queue.push(nid);
      }
    });
  }
  return { children, visited };
}

// Orders siblings so mutually-connected ones end up adjacent.
// Uses a greedy chain: starts from the node with the fewest sibling
// connections (a chain endpoint) and always extends to a connected neighbour.
export function orderSiblings(siblings, adj) {
  if (siblings.length <= 2) return siblings;
  const sibAdj = new Map(siblings.map(id => [
    id,
    siblings.filter(s => s !== id && adj.get(id)?.has(s)),
  ]));

  const start = siblings.reduce((best, id) =>
    sibAdj.get(id).length < sibAdj.get(best).length ? id : best, siblings[0]);

  const ordered = [start];
  const remaining = new Set(siblings);
  remaining.delete(start);

  while (remaining.size > 0) {
    const last = ordered[ordered.length - 1];
    const connected = sibAdj.get(last).filter(id => remaining.has(id));
    if (connected.length > 0) {
      const next = connected.reduce((best, id) =>
        sibAdj.get(id).filter(x => remaining.has(x)).length <
        sibAdj.get(best).filter(x => remaining.has(x)).length ? id : best);
      ordered.push(next);
      remaining.delete(next);
    } else {
      const next = [...remaining][0];
      ordered.push(next);
      remaining.delete(next);
    }
  }
  return ordered;
}

// Returns a Map<nodeId, {x, y}> with radial positions.
// Each sibling group gets equal angular slices so large subtrees don't
// push connected siblings to the opposite side of the circle.
export function computeRadialLayout(nodes, links, cx, cy, ringGap = 200) {
  const adj      = buildAdjacency(nodes, links);
  const { children, visited } = buildSpanningTree(nodes, adj);
  const positions = new Map();
  positions.set('me', { x: cx, y: cy });

  function place(id, depth, angleStart, angleEnd) {
    const kids = orderSiblings(children.get(id) || [], adj);
    if (kids.length === 0) return;
    const r    = depth * ringGap;
    const step = (angleEnd - angleStart) / kids.length;
    kids.forEach((kid, i) => {
      const midAngle = angleStart + (i + 0.5) * step;
      positions.set(kid, { x: cx + Math.cos(midAngle) * r, y: cy + Math.sin(midAngle) * r });
      place(kid, depth + 1, angleStart + i * step, angleStart + (i + 1) * step);
    });
  }

  place('me', 1, -Math.PI / 2, 3 * Math.PI / 2);

  const outerR    = ringGap * 3;
  const unreached = nodes.filter(n => !visited.has(n.id));
  unreached.forEach((n, i) => {
    const angle = (2 * Math.PI * i) / unreached.length - Math.PI / 2;
    positions.set(n.id, { x: cx + Math.cos(angle) * outerR, y: cy + Math.sin(angle) * outerR });
  });

  return positions;
}
