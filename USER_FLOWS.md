# User Flows — Relationship Universe

Each flow describes the steps a user takes and the expected outcome.

---

## 1. First-time setup

**Goal:** Personalise the "You" node before adding anyone.

**Steps:**
1. Open the app — the graph shows a single "You" node in the centre.
2. Click the **You** node → bubble appears → click **✎**.
3. In the side panel, click **✎ Edit your info**.
4. Update name and location (e.g. "Alex", "Hamburg").
5. Click **Save**.

**Expected outcome:**
- The You node label updates to the new name.
- Name and location are used as the unique identity for deduplication during imports.

---

## 2. Add a person connected to You

**Goal:** Add a new node directly connected to the You node.

**Steps:**
1. The add panel shows `→ You:` (or your name) by default.
2. Type a name, select a relationship type, optionally add a location.
3. Click **+ Add** or press Enter.

**Expected outcome:**
- A new node appears in the graph connected to You.
- The add panel resets, ready for the next entry.
- Data is saved to localStorage automatically.

---

## 3. Add a person connected to an existing node

**Goal:** Add a new node connected to someone other than You.

**Steps:**
1. Click an existing node (e.g. "Max") → the add panel updates to `→ Max:`.
2. Type a name, select a type, optionally add a location.
3. Click **+ Add** or press Enter.

**Expected outcome:**
- A new node appears connected to Max.
- Clicking the background resets the add panel back to `→ You:`.

---

## 4. Link two existing nodes

**Goal:** Draw a connection between two people who already exist in the graph.

**Steps:**
1. Click a node (e.g. "Linda") → bubble appears → click **⇌**.
2. The side panel shows "Click any other node to link it to Linda."
3. Click another node (e.g. "Carl").

**Expected outcome:**
- A dashed connection appears between Linda and Carl.
- The side panel reopens on Linda showing Carl in Connections.
- Clicking the background instead of a node cancels the operation.

---

## 5. Remove a connection

**Goal:** Delete a connection between two nodes without removing either node.

**Steps:**
1. Click either connected node → **✎** → side panel opens.
2. In the Connections section, click **✕** next to the connection name.

**Expected outcome:**
- The connection line disappears.
- Both nodes remain in the graph.

---

## 6. Edit a node

**Goal:** Update a person's name, type, location, or note.

**Steps:**
1. Click a node → **✎** → side panel opens.
2. Click **✎ Edit [Name]**.
3. Update any fields. The type uses the same styled dropdown as the add panel.
4. Click **Save**.

**Expected outcome:**
- Node label and colour update immediately.
- Changes saved to localStorage.
- Side panel returns to view mode with updated info.

---

## 7. Remove a node

**Goal:** Delete a person and all their connections.

**Steps:**
1. Click a node → **✎** → side panel opens.
2. Click **Remove [Name]**.

**Expected outcome:**
- The node and all its connections are removed.
- No other nodes are affected.

---

## 8. Drag and zoom

**Goal:** Rearrange the graph layout manually.

**Steps:**
- **Drag** any non-You node to reposition it.
- **Scroll** (or pinch on mobile) to zoom in/out.
- **Drag** the background to pan.

**Expected outcome:**
- Nodes stay where dropped.
- You node stays fixed at the centre.

---

## 9. Backup graph as JSON

**Goal:** Save the graph to a file for archiving or large-graph sharing.

**Steps:**
1. Click **⋯** in the top bar → **↓ Backup JSON**.

**Expected outcome:**
- A JSON file downloads named `<Name>-<Location>-Network.json`.
- Falls back to `<Name>-Network.json` if no location is set.

---

## 10. Restore graph from JSON

**Goal:** Load a previously backed-up graph, replacing the current one.

**Steps:**
1. Click **⋯** in the top bar → **↑ Restore JSON**.
2. Select a `.json` file exported from this app.

**Expected outcome:**
- The current graph is fully replaced.
- A green confirmation notification appears below the top bar.

---

## 11. Share graph via URL

**Goal:** Share the entire graph as a link without a file.

**Steps:**
1. Click **⤴ Share** in the top bar.

**Expected outcome:**
- The graph is compressed and encoded into a URL (`#share=...`).
- The URL is copied to the clipboard.
- A confirmation notification appears below the top bar.

> **Limitation:** Very large graphs (100+ nodes) produce long URLs that some messaging apps may truncate. Use Backup JSON for large graphs.

---

## 12. Import graph from share URL (replace)

**Goal:** Open someone's shared graph link and load it.

**Steps:**
1. Open the share URL in a browser.

**Expected outcome:**
- A dialog asks to import (or replace if an existing graph is present).
- Confirming loads the shared graph and saves to localStorage.
- The hash is removed from the URL so refreshing doesn't re-trigger the prompt.
- Cancelling leaves the existing graph untouched.

---

## 13. Import a person's network — merge via JSON

**Goal:** Merge another person's graph into your own, anchored to their node.

**Pre-condition:** The person's node already exists in your graph (e.g. "Max").

**Steps:**
1. Click Max's node → **✎** → side panel opens.
2. Click **⋯ More** → **↑ Import Max's network (JSON)**.
3. Select Max's exported `.json` file.

**Expected outcome:**
- New nodes from Max's file are added to the graph.
- Nodes already existing (matched by name + location) are not duplicated — their connections are wired to the existing nodes.
- Your own node (matched by your name + location) is also deduplicated.
- A notification shows how many nodes and connections were imported.

---

## 14. Import a person's network — merge via URL

**Goal:** Same as flow 13 but using a share URL instead of a file.

**Pre-condition:** Max's node exists in your graph and you have Max's share link.

**Steps:**
1. Click Max's node → **✎** → side panel opens.
2. Paste Max's share URL into the **"Paste share URL to import…"** field at the bottom.
3. Click **↑ Import**.

**Expected outcome:**
- Same deduplication and merge behaviour as flow 13.
- No file required.

---

## 15. Persist across sessions

**Goal:** Verify the graph survives a page reload.

**Steps:**
1. Add several nodes and connections.
2. Close or reload the page.

**Expected outcome:**
- All nodes and connections are restored exactly as left.
- Data stored in `localStorage` under the key `ru-graph`.

---

## Edge cases

| Scenario | Expected behaviour |
|----------|--------------------|
| Add a node with no name | Nothing happens; add panel stays open |
| Link a node to itself | Ignored; no self-loop created |
| Import a network where all nodes already exist | Alert: "Nothing new to import" |
| Open a malformed or expired share URL | Silent failure; existing graph untouched |
| Clear all | Confirm dialog; on confirm all nodes except You are removed |
| Share URL too long for messaging app | URL still works in browser; advise Backup JSON for large graphs |
