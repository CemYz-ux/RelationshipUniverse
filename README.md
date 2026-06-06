# Polymaps

An interactive force-graph for mapping the people in your life. Built with D3.js — no framework, no build step, no backend.

## Quick start

### 1. Set yourself up

Click the **You** node → **✎** → **✎ Edit your info** → set your name and location. This is your identity — used to deduplicate you when someone imports your network.

### 2. Add someone

The add panel at the bottom always shows the current target (`→ You:` by default). Type a name, pick a relationship type, optionally add a location, then hit **+ Add** or press Enter.

### 3. Select a node

**Click any node** to select it as the add target. The add panel updates to `→ NodeName:`. A bubble appears with three actions:

- **⇌** — link this node to another existing node
- **⊕** — merge another node into this one
- **✎** — open the details panel

Clicking the background deselects and returns to `→ You:`.

### 4. Connect existing nodes

Click a node → **⇌** → click any other node. Connections are removable via **✕** in the details panel.

### 5. Merge nodes

Click a node → **⊕** → click the node to absorb into it. The first node keeps all its info; the second node is removed and all its connections are migrated to the first.

- You can merge any node into **You** (click **You** → **⊕** → click the other node)
- You cannot merge **You** into another node — **You** can never be removed

### 6. Details panel (✎)

| Button | Action |
|--------|--------|
| **✎ Edit** | Update name, type, location, note, and STD test date |
| **Remove** | Delete node and all its connections |
| **↑ Import via link or QR** | Open the import modal (see below) |
| **⋯ More** | Import this person's network from a JSON file |

### 7. Import modal

Opened via **↑ Import via link or QR** in the details panel. Two ways to import:

- **Paste a share URL** into the input field and press Enter or click ↑ Import
- **Scan a QR code** — the camera activates automatically and detects a share QR code

The imported network merges anchored to the node you opened the panel from, with full deduplication by name + location.

### 8. Top bar

| Button | Action |
|--------|--------|
| **⤴ Share** | Compress graph into a URL and copy to clipboard |
| **⊡ QR** | Show your graph as a scannable QR code |
| **✕ Clear** | Remove all nodes and connections (with confirmation) |
| **⋯** | Backup (export JSON) · Restore (import JSON) |

### 9. Tutorial

Click the **?** button in the top-right corner (next to the GitHub icon) to launch the interactive tutorial. It walks through all core features as an 8-step hero's journey — each step highlights the relevant UI element and explains what it does. You can navigate with **Next →** / **← Back**, or close at any time with **✕**.

### 10. Share & import flows

**Share your network:**
- **⤴ Share** → copies URL to clipboard → paste anywhere
- **⊡ QR** → shows a QR code → someone scans it with the import modal

**Import someone's network:**
- Click their node → **✎** → **↑ Import via link or QR**
- Paste their share URL, or scan their QR code with your camera

> **Note:** Share URLs work well for small-to-medium graphs. Very large graphs produce long URLs that may be truncated by some messaging apps. Use **⋯ → Backup JSON** for large graphs or permanent backups.

### 11. Rearrange

Drag nodes to reposition. Scroll or pinch to zoom. Everything saves automatically in `localStorage`.

---

## Features

- **Click-to-select** — clicking a node sets it as the add target
- **Node bubble** — **⇌** (link existing), **⊕** (merge), and **✎** (details) on tap
- **Peer connections** — link any two nodes; symmetric and removable
- **Node merge** — absorb one node into another, migrating all connections; **You** can never be absorbed
- **STD test tracking** — record each person's last tested date; a colour-coded ring on the node shows their status at a glance
- **Share via URL** — compressed base64 share links
- **QR code share** — show your graph as a QR code for in-person sharing
- **QR code scan** — camera-based import in the import modal
- **Smart merge** — deduplicates by name + location (including yourself)
- **Export filename** — `<Name>-<Location>-Network.json`
- **Interactive tutorial** — 8-step hero's journey triggered by **?** in the top-right; highlights each UI element in sequence, closable at any time
- **Mobile-friendly** — responsive, safe-area aware
- **Persisted locally** — auto-saved in `localStorage`

## STD test status

Each person's node displays a solid colour ring (between the fill circle and the dashed outer ring) indicating when they were last tested:

| Ring colour | Meaning | Threshold |
|-------------|---------|-----------|
| 🟢 Green | Tested recently | Within the last 3 months |
| 🟡 Amber | Tested fairly recently | 3 – 6 months ago |
| 🔴 Red | Overdue | More than 6 months ago |
| *(no ring)* | Unknown | No date recorded |

Thresholds follow sexual health guidelines for sexually active people with multiple partners (quarterly testing recommended). The **You** node never shows a ring.

The date is set in the edit panel under **Last STD tested** — type it manually (`YYYY-MM-DD`) or click the calendar icon to use the system date picker.

---

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
- [qrcodejs](https://github.com/davidshimjs/qrcodejs) — QR code generation
- [jsQR](https://github.com/cozmo/jsQR) — QR code scanning
- Plain HTML / CSS / JS — no framework, no build step
- ES modules — `js/` (16 modules) and `css/` (8 files)
- [Vitest](https://vitest.dev/) — unit tests (`tests/unit/`)
- [Playwright](https://playwright.dev/) — end-to-end tests (`tests/e2e/`)
