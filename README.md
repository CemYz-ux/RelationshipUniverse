# My Relationship Universe

An interactive force-graph for mapping the people in your life. Built with D3.js — no framework, no build step, no backend.

## Quick start

### 1. Set yourself up

Click the **You** node → **✎** → edit your name and location. This is your identity — it's used to deduplicate you when someone imports your network.

### 2. Add someone

Type a name, pick a relationship type, optionally add a location, then hit **+ Add**. The add panel always shows the currently selected node as the target (`→ You:` by default).

### 3. Select a node

**Click any node** to select it as the active add target. The add panel updates to `→ NodeName:` so your next add connects directly to that person. A small bubble appears above the node with two actions:

- **⇌** — link this node to another existing node
- **✎** — open the details / edit panel

Clicking the background deselects and returns to `→ You:`.

### 4. Connect existing nodes

Click a node → **⇌** → click any other node to draw a peer connection. All connections are equal and removable — click **✕** next to any connection in the details panel.

### 5. Inspect & edit

Click a node → **✎** to open the side panel:
- Edit name, type, location, note
- View and remove all connections
- Import another person's network (JSON file or share URL)
- Remove the node

### 6. Share your network

Click **⤴ Share Link** in the top bar. Your graph is compressed and encoded into a URL which is copied to your clipboard. Send it to anyone — when they open it, they'll be prompted to import it.

> **Note:** Share links work best for small-to-medium graphs. Very large graphs produce long URLs that some messaging apps (WhatsApp, SMS) may truncate. Use **↓ Export JSON** for large graphs or permanent backups.

### 7. Import a network

Three ways to import:

| Method | Where | What it does |
|--------|-------|--------------|
| **↑ Import JSON** | Top bar | Replaces your entire network with the file |
| **⤴ Open share link** | Browser address bar | Prompts to replace your network |
| **Paste share URL** | Side panel (bottom) | Merges the shared network anchored to the viewed node |

When merging, nodes are deduplicated by **name + location** — if a person already exists in your graph (including yourself), they won't be duplicated and their connections will be wired up correctly.

### 8. Rearrange

Drag nodes to reposition. Scroll or pinch to zoom. Everything is saved automatically in `localStorage`.

---

## Features

- **Click-to-select** — clicking a node sets it as the add target
- **Peer connections** — link any two existing nodes with **⇌**; symmetric and removable
- **Share via URL** — compressed, base64-encoded share links; no backend needed
- **Smart merge import** — deduplicates by name+location across all three import methods
- **Export filename** — exported JSON is named `<Name>-<Location>-Network.json`
- **Edit panel** — styled type dropdown, editable name / location / note
- **Mobile-friendly** — responsive layout, safe-area aware (home bar / nav bar)
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

Push to a public repo → **Settings → Pages** → source: root of `main` branch. Works out of the box — no build step needed.

## Stack

- [D3.js v7](https://d3js.org/) — force simulation & SVG rendering
- Plain HTML / CSS / JS — zero dependencies beyond D3
- ES modules — `js/` (13 modules) and `css/` (6 files)
