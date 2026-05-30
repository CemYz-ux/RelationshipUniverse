# User Flows — Relationship Universe

Each flow describes the steps a user takes and the expected outcome.

---

## 1. First-time setup

**Goal:** Personalise the "You" node before adding anyone.

**Steps:**
1. Open the app — the graph shows a single "You" node in the centre.
2. Click the **You** node → bubble appears → click **✎**.
3. In the side panel, edit name and location (e.g. "Alex", "Hamburg").
4. Click **Save**.

**Expected outcome:**
- The You node label updates to the new name.
- Name and location are used as the unique identity for deduplication during imports.

---

## 2. Add a person connected to You

**Goal:** Add a new node directly connected to the You node.

**Steps:**
1. The add panel at the bottom shows `→ You:` (or your name) by default.
2. Type a name in the Name field.
3. Select a relationship type from the dropdown.
4. Optionally type a location.
5. Click **+ Add** or press Enter.

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
- A new node appears connected to Max, not to You.
- Clicking the background resets the add panel back to `→ You:`.

---

## 4. Link two existing nodes

**Goal:** Draw a connection between two people who already exist in the graph.

**Steps:**
1. Click a node (e.g. "Linda") → bubble appears → click **⇌**.
2. The side panel shows "Click any other node to link it to Linda."
3. Click another node (e.g. "Carl").

**Expected outcome:**
- A dashed connection line appears between Linda and Carl.
- The side panel reopens on Linda showing Carl listed under Connections.
- Clicking the background instead of a node cancels the operation.

---

## 5. Remove a connection

**Goal:** Delete a connection between two nodes without removing either node.

**Steps:**
1. Click either connected node → **✎** → side panel opens.
2. In the Connections section, find the connection chip.
3. Click the **✕** next to the connection name.

**Expected outcome:**
- The connection line disappears from the graph.
- Both nodes remain in the graph.
- The connection no longer appears in either node's side panel.

---

## 6. Edit a node

**Goal:** Update a person's name, type, location, or note.

**Steps:**
1. Click a node → **✎** → side panel opens.
2. Click **✎ Edit [Name]**.
3. Update any fields. The type dropdown uses the same styled picker as the add panel.
4. Click **Save**.

**Expected outcome:**
- The node label and colour update immediately in the graph.
- Changes are saved to localStorage.
- The side panel returns to the view mode showing updated information.

---

## 7. Remove a node

**Goal:** Delete a person and all their connections from the graph.

**Steps:**
1. Click a node → **✎** → side panel opens.
2. Click **Remove [Name]**.

**Expected outcome:**
- The node and all its connection lines are removed from the graph.
- No other nodes are affected.
- Data is saved to localStorage.

---

## 8. Drag and zoom

**Goal:** Rearrange the graph layout manually.

**Steps:**
- **Drag** any non-You node to reposition it.
- **Scroll** (or pinch on mobile) to zoom in and out.
- **Drag** the background to pan.

**Expected outcome:**
- Nodes stay where dropped; the force simulation does not override manual positions.
- You node stays fixed at the centre.
- Zoom and pan persist until the page is reloaded.

---

## 9. Export graph as JSON

**Goal:** Save the graph to a file for backup or sharing.

**Steps:**
1. Click **↓ Export JSON** in the top bar.

**Expected outcome:**
- A JSON file downloads, named `<Name>-<Location>-Network.json` (e.g. `Alex-Hamburg-Network.json`).
- Falls back to `<Name>-Network.json` if no location is set.
- The file contains all nodes and connections and can be re-imported later.

---

## 10. Import graph from JSON (replace)

**Goal:** Load a previously exported graph, replacing the current one.

**Steps:**
1. Click **↑ Import JSON** in the top bar.
2. Select a `.json` file exported from this app.

**Expected outcome:**
- The current graph is fully replaced with the imported one.
- A green confirmation notification appears below the top bar.
- Data is saved to localStorage.

---

## 11. Share graph via URL

**Goal:** Share the entire graph as a link without needing a file.

**Steps:**
1. Click **⤴ Share Link** in the top bar.

**Expected outcome:**
- The graph is compressed and encoded into a URL (`#share=...`).
- The URL is copied to the clipboard.
- A confirmation notification appears.
- Pasting and opening the URL in any browser prompts the recipient to import it.

> **Limitation:** Very large graphs (100+ nodes) produce long URLs that may be truncated by WhatsApp, SMS, or other messaging apps. Use Export JSON for large graphs.

---

## 12. Import graph from share URL (replace)

**Goal:** Open someone's shared graph link and load it.

**Steps:**
1. Open the share URL in a browser (e.g. `https://cemyz-ux.github.io/RelationshipUniverse/#share=...`).

**Expected outcome:**
- A dialog asks: "A shared network was found. Import it?" (or "Replace your current network?" if one exists).
- Confirming loads the shared graph and saves it to localStorage.
- The hash is removed from the URL so refreshing does not re-trigger the prompt.
- Cancelling leaves the existing graph untouched.

---

## 13. Import a person's network (merge via JSON)

**Goal:** Merge another person's exported graph into your own, anchored to their node.

**Pre-condition:** The other person's node already exists in your graph (e.g. "Max").

**Steps:**
1. Click Max's node → **✎** → side panel opens.
2. Click **↑ Import Max's network**.
3. Select Max's exported `.json` file.

**Expected outcome:**
- Nodes from Max's file that don't exist in your graph are added.
- Nodes that already exist (matched by name + location) are not duplicated — their connections are wired to the existing nodes instead.
- Your own node (matched by your name + location) is also deduplicated — you won't appear twice.
- All new connections from Max's network are added.
- A notification shows how many nodes and connections were imported.

---

## 14. Import a person's network (merge via URL)

**Goal:** Same as flow 13 but using a share URL instead of a JSON file.

**Pre-condition:** Max's node exists in your graph and you have Max's share link.

**Steps:**
1. Click Max's node → **✎** → side panel opens.
2. Paste Max's share URL into the **"Paste share URL to import…"** field at the bottom of the panel.
3. Click **↑ Import**.

**Expected outcome:**
- Same deduplication and merge behaviour as flow 13.
- No file download or upload required.

---

## 15. Persist across sessions

**Goal:** Verify that the graph survives a page reload.

**Steps:**
1. Add several nodes and connections.
2. Close or reload the page.

**Expected outcome:**
- All nodes, connections, and layout are restored exactly as they were.
- Data is stored in `localStorage` under the key `ru-graph`.

---

## Edge cases

| Scenario | Expected behaviour |
|----------|--------------------|
| Add a node with no name | Nothing happens; the add panel stays open |
| Link a node to itself | Ignored; no self-loop is created |
| Import a network where all nodes already exist | Alert: "Nothing new to import" |
| Open a malformed or expired share URL | Silent failure; existing graph is untouched |
| Clear all | Confirm dialog appears; on confirm, all nodes except You are removed and localStorage is cleared |
