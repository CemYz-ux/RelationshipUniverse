# My Relationship Universe

An interactive force-graph for mapping the people in your life. Built with D3.js — no framework, no build step, no backend.

## Quick start

### 1. Set yourself up

Click the **You** node → **✎** → edit your name and location. This is your identity — it's used to deduplicate you when someone imports your network.

### 2. Add someone

The add panel at the bottom always shows the current target (`→ You:` by default). Type a name, pick a relationship type, optionally add a location, then hit **+ Add** or press Enter.

### 3. Select a node

**Click any node** to select it as the active add target. The add panel updates to `→ NodeName:` — your next add connects directly to that person. A small bubble also appears with two actions:

- **⇌** — link this node to another existing node
- **✎** — open the details panel

Clicking the background deselects and returns to `→ You:`.

### 4. Connect existing nodes

Click a node → **⇌** in the bubble → click any other node. All connections are equal and removable via **✕** in the details panel.

### 5. Details panel (✎)

Click a node → **✎** to open the side panel:

- **✎ Edit** — update name, type, location, note
- **Remove** — delete the node and all its connections
- **⋯ More** → Import this person's network from a JSON file
- **Paste share URL** field at the bottom — import a shared network anchored to this node

### 6. Top bar

| Button | Action |
|--------|--------|
| **⤴ Share** | Compress & encode the graph into a URL, copy to clipboard |
| **✕ Clear** | Remove all nodes and connections (with confirmation) |
| **⋯** | Backup (export JSON) · Restore (import JSON) |

### 7. Share & import

**Sharing:**
Click **⤴ Share** → URL copied to clipboard → send to anyone. When they open it, they're prompted to import it.

**Importing another person's network:**
Click their node → **✎** → paste their share URL in the field at the bottom → **↑ Import**. Their people merge into your graph, anchored to their node, with full deduplication by name + location.

> **Note:** Share URLs work well for small-to-medium graphs. Very large graphs produce long URLs that some messaging apps may truncate. Use **⋯ → Backup JSON** for large graphs or permanent backups.

### 8. Rearrange

Drag nodes to reposition. Scroll or pinch to zoom. Everything saves automatically in `localStorage`.

---

## Features

- **Click-to-select** — clicking a node sets it as the add target
- **Node bubble** — quick **⇌** (link existing) and **✎** (details) actions
- **Peer connections** — link any two nodes; symmetric and removable
- **Share via URL** — compressed base64 share links, no backend needed
- **Smart merge** — imports deduplicate by name + location (including yourself)
- **Export filename** — `<Name>-<Location>-Network.json`
- **Consolidated UI** — Share and Clear prominent; JSON backup/restore behind ⋯
- **Mobile-friendly** — responsive, safe-area aware (home bar / nav bar)
- **Persisted locally** — auto-saved in `localStorage` on every change

## Relationship types

| Type | Colour |
|------|--------|
| Partner | Lavender |
| Friend | Pink |
| Dating | Teal |
| Crush | Hot pink |
| Fling | Orange |
| Ex | Muted purple |
| Other | Gray |

## Running locally

ES modules require HTTP — opening `index.html` via `file://` won't work.

```bash
# Node.js
npm start          # npx serve . --listen 3000

# Python
python -m http.server 3000

# VS Code
# Right-click index.html → Open with Live Server
```

Then open **http://localhost:3000**.

## GitHub Pages

Push to a public repo → **Settings → Pages** → source: root of `main` branch. Works out of the box.

## Stack

- [D3.js v7](https://d3js.org/) — force simulation & SVG rendering
- Plain HTML / CSS / JS — zero dependencies beyond D3
- ES modules — `js/` (13 modules) and `css/` (6 files)
