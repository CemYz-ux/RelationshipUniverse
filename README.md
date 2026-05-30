# My Relationship Universe

An interactive force-graph for mapping the people in your life. Built with D3.js — no framework, no build step, no backend.

## Quick start

### 1. Add someone

Type a name, pick a relationship type from the styled dropdown, optionally add a location, then hit **+ Add**. New nodes are always connected to whichever node is currently selected (defaults to **You**).

### 2. Select a node

**Click any node** to select it as the active target. The add panel immediately updates to `→ NodeName:` so your next add will connect directly to that person. A small bubble also appears above the node with two actions:

- **⇌** — link this node to another existing node
- **✎** — open the details / edit panel

Clicking the background deselects and returns the add panel to `→ You:`.

### 3. Connect existing nodes

Click a node → press **⇌** in the bubble → then click any other node to draw a peer connection between them. All connections are equal — any can be removed by clicking the **✕** next to it in the details panel.

### 4. Inspect & edit

Click a node → press **✎** in the bubble to open the side panel. From there you can:

- Edit name, type, location, note
- See and remove all connections
- Import their network (merge another exported graph)
- Remove the node entirely

### 5. Rearrange

Drag nodes to reposition them. Scroll (or pinch) to zoom. Your data is saved automatically in `localStorage`.

---

## Features

- **Click-to-select** — clicking a node sets it as the add target; type a name and hit **+ Add**
- **Peer connections** — link any two existing nodes with **⇌**; all connections are symmetric and removable
- **Node bubble** — quick **⇌** and **✎** actions appear above a selected node
- **Edit panel** — styled type dropdown (matching the add panel), editable name / location / note
- **Drag & rearrange** — reposition freely; scroll/pinch to zoom
- **Export & import** — save your graph as JSON and reload it later
- **Network import** — merge someone else's exported graph into yours, anchored to their node
- **Persisted locally** — auto-saved in `localStorage` on every change
- **Mobile-friendly** — responsive layout, safe-area aware (home bar / nav bar), works on Android & iOS

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

Because the app uses ES modules, it needs to be served over HTTP — opening `index.html` directly via `file://` will not work.

```bash
# Node.js (recommended)
npm start          # runs: npx serve . --listen 3000

# Python
python -m http.server 3000

# VS Code
# Install the "Live Server" extension, then right-click index.html → Open with Live Server
```

Then open **http://localhost:3000** in your browser.

## Deploying to GitHub Pages

Push to a public repo and enable Pages from **Settings → Pages** (source: root of `main` branch). ES modules work fine over HTTPS — no build step needed.

## Stack

- [D3.js v7](https://d3js.org/) — force simulation & SVG rendering
- Plain HTML / CSS / JS — zero dependencies beyond D3
- ES modules — code split across `js/` (13 modules) and `css/` (6 files)
