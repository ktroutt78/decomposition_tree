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
- **Click any node** to drill into it. If multiple breakdown dimensions are available, a picker dialog will appear — choose which dimension to split by
- **Sibling auto-drill:** Once one node in a group has been drilled (e.g. "West" drilled by Category), clicking an undrilled sibling (e.g. "East") automatically applies the same dimension — no picker needed
- **One expansion at a time:** Drilling a sibling automatically collapses the previously expanded sibling, keeping the view focused

### Collapsing & Re-expanding
- Click an expanded node to **collapse** it
- Click a collapsed node to **re-expand** it instantly (no picker, uses the same dimension)
- Click the **↺ icon** on a collapsed node to **reset** it and pick a different breakdown dimension

### Other / Overflow
- When a drilled node has more members than **Max Children**, the top N are shown and remaining members are grouped into a single **(Other)** child at the bottom
- Drilling into **(Other)** is supported

### Toolbar
- **Reload** (↺): Fetches fresh data from Tableau and resets the tree to its initial state
- **Settings** (⚙): Opens the configuration panel

---

## Settings Reference

Open the settings panel with the ⚙ gear icon in the top-right corner. Settings are saved per-workbook inside Tableau's extension settings store.

### Layout
| Setting | Description | Default |
|---|---|---|
| Orientation | Left→Right or Top→Bottom tree layout | Left→Right |
| Initial alignment | Where the root node is positioned on first render | Center |
| Node width | Width of each bar node (px) | 200 |
| Node height | Height of each bar node (px) | 86 |
| Level spacing | Horizontal gap between depth levels (px) | 280 |
| Sibling spacing | Vertical gap between sibling nodes (px) | 20 |
| Bar height | Thickness of the filled bar inside each node (px) | 20 |
| Node corner radius | Roundness of the node card corners (0–24) | 10 |
| Bar corner radius | Roundness of the filled bar ends (0–24) | 4 |
| Max children shown | Maximum named children per drill; excess grouped into (Other) | 10 |

### Color Theme
| Setting | Description | Default |
|---|---|---|
| Theme | Preset color palettes (Ocean, Forest, Amethyst, Sunset, Teal, Custom) | Ocean |
| Custom start / end | Start and end colors when Theme is set to Custom | — |
| Apply gradient to bars | When on, bar colors are distributed across the theme gradient based on value rank. When off, all positive bars share a single solid color | On |
| Negative value color | Fill color for bars with a negative value | Pink |
| Background color | Visualization area background | White |

**Gradient color behavior:**
- **Preset themes** — the largest value bar gets the darkest shade; bars graduate to the lightest shade as values decrease
- **Custom gradient** — the largest value bar gets the first color chosen; the smallest gets the second color chosen
- When the gradient toggle is off, all positive bars render in the primary theme color regardless of value rank

### Display
| Setting | Description | Default |
|---|---|---|
| Measure display name | Override the measure label (e.g. "Revenue" instead of "SUM(Sales)"). Auto-populated from the field name on load | Auto |
| Value format | Auto (reads Tableau formatting), Number, Currency, Percentage | Auto |
| Currency symbol | Used when Value format is set to Currency | $ |
| Show percentage | Show % of parent on each node | On |
| Show group count | Show how many child groups a drilled node has | On |
| Exclude nulls | Hide null/empty dimension members when drilling | Off |

### Labels
| Setting | Description | Default |
|---|---|---|
| Heading font size | Font size for the node label and value (px) | 13 |
| Heading color | Color of the heading text | Dark slate |
| Subheading font size | Font size for the percentage and group count lines (px) | 11 |
| Subheading color | Color of the subheading text | Muted grey |
| Font family | System, Serif, or Monospace | System |
| Show measure name | Prefix the value line with the measure name | On |
| Show | Value & %, Value only, or % only | Value & % |

### Connection
| Setting | Description |
|---|---|
| Link style | Curved, Step, or Straight connectors between nodes |
| Animation duration | Transition speed in milliseconds |

---

## Filter & Data Interaction

- **Tableau filters applied to the sheet** update the tree values and structure automatically — the expansion state (which nodes are drilled and which are collapsed) is **preserved** across filter changes
- **Measure changes** also preserve expansion state — the same drill path is replayed on the new measure's data
- **Marks card changes** (adding/removing dimensions from the Dimension shelf) trigger a data refresh without resetting expansion
- The **Reload** button performs a full reset if you need to start from scratch

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
