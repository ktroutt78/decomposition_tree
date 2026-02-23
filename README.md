# Decomposition Tree V2 — Tableau Viz Extension

An interactive hierarchical decomposition tree built with Svelte and D3. Drop a measure onto the **Measure** shelf and dimensions onto the **Dimension** shelf, then drill down interactively to explore what's driving your numbers.

**Live URL:** `https://ktroutt78.github.io/decomposition_tree/index.html`
**Manifest:** `https://ktroutt78.github.io/decomposition_tree/DecompositionTreeV2.trex`

---

## Adding the Extension to Tableau

### Requirements
- Tableau Desktop 2021.4+ or Tableau Server / Tableau Cloud
- The workbook must be connected to a data source

### Steps

1. Open a Tableau workbook and navigate to a **new sheet**
2. In the **Marks** card, open the mark type dropdown and select **Extension** (or drag **Extension** from the Objects panel onto the sheet)
3. When prompted, click **"My Extensions"** and browse to `DecompositionTreeV2.trex`
   — or use **"Access Local Extensions"** and paste the hosted URL directly
4. Click **OK** to grant the extension full data access
5. Drag a **measure** (e.g. SUM(Sales)) onto the **Measure** shelf in the Marks card
6. Drag one or more **dimensions** (e.g. Region, Category, Sub-Category) onto the **Dimension** shelf

> **Tableau Server / Cloud users:** Use the hosted `.trex` file. The extension is served over HTTPS from GitHub Pages, which satisfies Tableau Server's security requirements. You may need an administrator to add `ktroutt78.github.io` to the Extension allowlist in Tableau Server settings.

---

## Using the Extension

### Drilling Down
- **Click any node** to open the **Drill Into** picker. Choose which dimension to split by and the initial **sort order** (Descending or Ascending)
- **Sibling auto-drill:** Once one node in a group has been drilled, clicking an undrilled sibling automatically applies the same dimension and sort order — no picker shown
- **One expansion at a time:** Drilling a sibling automatically collapses any other expanded sibling in the group, keeping the view focused

### Collapsing & Re-expanding
- Click the **− button** on an expanded node to collapse it (drill state is preserved)
- Click the **+ button** on a collapsed node to re-expand it instantly (same dimension, no picker)
- Click an already-expanded node's **+ button** again to fully **reset** it and pick a different dimension next time

### Expand / Collapse Button Position
- **Left→Right mode:** The +/− button sits just to the **right** of the bar, outside the node card
- **Top→Bottom mode:** The +/− button sits just **below** the bar, centered — clicking expands children downward

### Sorting
- **Initial sort:** Set ascending or descending in the Drill Into picker before drilling
- **Inline sort toggle:** After drilling, a clickable **↑ / ↓ arrow** appears in the column header label. Click it to reverse the sort order for that entire column without collapsing the view

### Other / Overflow
- When a drilled node has more members than **Max Children**, the top N are shown and the remaining members are grouped into a single **(Other)** child
- Drilling into **(Other)** is supported

### Zoom Controls (bottom-right panel)
- **Zoom in / Zoom out:** Magnify or shrink the tree
- **Fit to view** (corners icon): Reset zoom so all visible nodes fit the viewport
- **Smart zoom** (crosshair icon): When on, auto-zooms to the most recently drilled level after each expansion; when off, the view stays where it is. Toggling from off to on immediately zooms to the current drill level
- **More / Fewer children** (↑ / ↓ arrows): Increase or decrease the max children shown per node by 1. The current value is shown between the arrows

When the tree content extends beyond the viewport at the current zoom level, thin scrollbars appear at the bottom and right edges. Drag a scrollbar thumb to pan — or use the trackpad or mouse directly. Scrollbars disappear automatically when all nodes fit within the viewport.

### Toolbar
- **Reload** (↺): Fetches fresh data from Tableau and resets the tree to its initial state
- **Settings** (⚙): Opens the configuration panel

---

## Settings Reference

Open the settings panel with the ⚙ gear icon in the top-right corner. Settings are saved per-workbook inside Tableau's extension settings store.

### Color Theme
| Setting | Description | Default |
|---|---|---|
| Theme | Preset color palettes: Ocean, Forest, Amethyst, Sunset, Teal, Custom | Ocean |
| Custom start / end | Start and end colors when Theme is set to Custom | — |
| Apply gradient to bars | When on, bar colors are distributed across the theme gradient based on value rank. When off, all positive bars share a single solid color | On |
| Negative value color | Fill color for bars with a negative value | Pink |

**Gradient color behavior:**
- **Preset themes** — the largest value bar gets the darkest shade; bars graduate to the lightest shade as values decrease
- **Custom gradient** — the largest value bar gets the first color chosen; the smallest gets the second color chosen
- When the gradient toggle is off, all positive bars render in the primary theme color regardless of value rank

### Layout
| Setting | Description | Default |
|---|---|---|
| Orientation | **Left→Right:** horizontal bars expanding left to right. **Top→Bottom:** vertical column bars — each bar grows upward; labels sit to the right; children expand downward | Left→Right |
| Alignment | (Left→Right only) **Top:** root anchored at the top-left. **Centered:** root centered vertically | Top |
| Link style | **Curved**, **Step**, or **Straight** connectors between nodes | Curved |
| Level spacing | Gap between depth levels (px) | 160 |
| Max children shown | Maximum named children per drill; excess members grouped into (Other) | 5 |
| Node corner radius | Roundness of the node card corners (0–24) | 10 |
| Bar corner radius | Roundness of the filled bar ends (0–24) | 4 |
| Bar thickness | Bar height in Left→Right mode; maximum bar column height in Top→Bottom mode (px) | 20 |
| Bar scale | How bar lengths are calculated: **Parent** (% of parent node's value), **Top Node** (% of root value), **Level Max** (% of the largest value at the same depth) | Parent |

### Connectors
| Setting | Description | Default |
|---|---|---|
| Inactive color | Stroke color for links not on the active selection or expansion path | Gray |
| Negative node color | Stroke color for links leading to nodes with a negative value | Pink |
| Opacity | Overall link opacity | 90% |

### Display
| Setting | Description | Default |
|---|---|---|
| Background color | Visualization area background color | White |
| Show group count | Show how many child groups a drilled node has (e.g. "• 4 groups") | On |
| Exclude null values | Hide null/empty dimension members when drilling | Off |
| Value format | **Auto** (reads Tableau's native format), **Number** (1,234), **Currency** ($1.2K), **Percent** (12.3%) | Auto |
| Currency symbol | Prefix used when Value format is set to Currency | $ |
| Measure display name | Override the measure label shown on nodes (e.g. "Revenue" instead of "SUM(Sales)"). Leave blank to use the field name, auto-stripped of aggregation prefix | Auto |

### Labels
| Setting | Description | Default |
|---|---|---|
| Heading font size | Font size for the node label line (px) | 13 |
| Heading color | Color of the node label text | Dark slate |
| Subheading font size | Font size for the value / percentage line (px) | 11 |
| Subheading color | Color of the subheading text | Muted grey |
| Font family | System, Serif, or Mono | System |
| Show measure name | Prefix the value line with the measure display name | On |
| Show | **Value & %** — show both value and % of parent. **Value only** — hide percentage. **% only** — hide value | Value & % |

### Column Headers
Column headers appear above each drilled level (Left→Right) or to the left of each row (Top→Bottom), showing the dimension name and current sort order.

| Setting | Description | Default |
|---|---|---|
| Font size | Column header label font size (px) | 12 |
| Color | Column header text color | Dark slate |

### Tooltip
| Setting | Description | Default |
|---|---|---|
| Narrative template | Custom template shown in the hover tooltip. Replaces the default rows. Pre-filled with the default layout as a starting point — edit or clear as needed | `<measure>: <value>` / `% of Parent: <pct>` / `Records: <count>` |

**Available placeholders:**
- `<measure>` — the measure display name (alias if set, otherwise auto-stripped field name, e.g. "Profit")
- `<value>` — the node's formatted measure value
- `<pct>` — percentage of parent
- `<count>` — record count
- `<DimensionName>` — value of any dimension in the drill path, e.g. `<Region>`, `<Category>`
- `<FieldName>` — value of any field on the Tooltip shelf, e.g. `<SUM(Profit)>`

Newlines in the template are preserved in the tooltip. Example:
```
Sales: <value>  (<pct> of parent)
Profit: <SUM(Profit)>
Records: <count>

<Region> — review quarterly performance targets.
```

### Animation
| Setting | Description | Default |
|---|---|---|
| Transition speed | Duration of layout and fill animations (ms) | 300 |

---

## Filter & Data Interaction

- **Tableau filters applied to the sheet** update the tree values and structure automatically — the expansion state (which nodes are drilled and which are collapsed) is **preserved** across filter changes
- **Measure changes** also preserve expansion state — the same drill path is replayed on the new measure's data, and the measure alias is auto-updated to match the new field name
- **Marks card changes** (adding/removing dimensions from the Dimension shelf) trigger a data refresh without resetting expansion
- **Max Children changes** in Settings immediately re-apply the (Other) grouping without requiring a collapse/expand cycle
- The **Reload** button performs a full reset if you need to start from scratch

---

## Data Privacy & Security

**Your data never leaves your machine.**

This extension is a static JavaScript application. Here is exactly what happens to your data:

### How data flows

1. **Extension code loads once from GitHub Pages** — Tableau Desktop downloads the HTML, JavaScript, and CSS bundle from `ktroutt78.github.io` when the extension is first opened. This is the only network request the extension ever makes.
2. **All data stays inside Tableau Desktop** — Once loaded, the extension communicates with Tableau via the local [Tableau Extensions API](https://tableau.github.io/extensions-api/). Data is read from your worksheet using in-process API calls (`getSummaryDataAsync`, `getVisualSpecificationAsync`). These calls happen entirely within Tableau Desktop's embedded browser — no data is transmitted over the network.
3. **All computation is local** — The tree layout, aggregation, and rendering are performed by D3.js and Svelte running in Tableau's embedded Chromium process. Nothing is sent to an external server.
4. **Settings are stored by Tableau** — Configuration is saved to the workbook via Tableau's own extension settings API (`tableau.extensions.settings`), not to any external service.

### What GitHub Pages does and does not see

| | GitHub Pages |
|---|---|
| Serves the JS/CSS/HTML bundle on first load | ✓ |
| Receives any worksheet data | ✗ |
| Receives any dimension or measure values | ✗ |
| Tracks usage or analytics | ✗ |
| Stores any user data | ✗ |

### Self-hosting

If your organization's policy requires that even the extension code not be fetched from a public URL, you can self-host:

1. Clone the repository and run `npm run build`
2. Serve the `docs/` folder from any internal web server (IIS, nginx, etc.) over HTTPS
3. Update the `<source-location>` URL in `DecompositionTreeV2.trex` to point to your internal server
4. Load the modified `.trex` file in Tableau Desktop

All behavior is identical — the extension code simply loads from your own server instead of GitHub Pages.

---

## Development Setup

### Prerequisites
- Node.js 18+
- npm

### Local Development

```bash
# Install dependencies
npm install

# Start local dev server (with HTTPS if certs/cert.pem and certs/key.pem exist)
npm run dev
```

The dev server runs at `https://localhost:8000` (or `http://localhost:8000` without certs).

To load in Tableau Desktop during development, point the `.trex` file at `https://localhost:8000/index.html`.

### Building for Production

```bash
npm run build
```

Outputs built files to `docs/` with the correct GitHub Pages base path (`/decomposition_tree/`).

### Deploying Updates

```bash
npm run build
git add docs/
git commit -m "Deploy: <description of change>"
git push
```

GitHub Pages automatically picks up the updated `docs/` folder within ~60 seconds of the push.

---

## Project Structure

```
decomp_tree_v2/
├── src/
│   ├── App.svelte              # Root component, data-ready handler
│   ├── components/
│   │   ├── DecompTree.svelte   # D3 rendering, all interaction logic
│   │   ├── ConfigPanel.svelte  # Settings drawer
│   │   ├── DimensionPicker.svelte  # Drill-down modal
│   │   ├── Header.svelte       # Toolbar (Reload, Settings)
│   │   ├── Tooltip.svelte      # Hover tooltip
│   │   └── EmptyState.svelte   # Shown before a measure is added
│   ├── lib/
│   │   ├── treeEngine.js       # Pure data logic (build, drill, collapse, replay)
│   │   ├── tableau.js          # Tableau Extensions API wrapper
│   │   └── formatters.js       # Number/currency formatting
│   ├── stores/
│   │   ├── config.js           # Config store + save/load to Tableau settings
│   │   ├── encodings.js        # Encoding map store
│   │   └── treeState.js        # Tree root, status message, UI state
│   └── styles/
│       ├── tokens.css          # Design tokens (colors, spacing, typography)
│       └── global.css          # Base styles
├── public/
│   ├── DecompositionTreeV2.trex    # Tableau extension manifest
│   ├── tableau-extensions-api.js   # Tableau Extensions API script
│   └── debug.html              # Standalone debug page
├── docs/                       # Built output — served by GitHub Pages
├── vite.config.js
└── package.json
```

---

## Tech Stack

| Technology | Version | Role |
|---|---|---|
| [Svelte](https://svelte.dev) | 5.x | UI framework |
| [D3.js](https://d3js.org) | 7.x | Tree layout and SVG rendering |
| [Vite](https://vitejs.dev) | 6.x | Build tool and dev server |
| Tableau Extensions API | 1.11+ | Tableau integration |
