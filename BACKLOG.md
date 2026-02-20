# Decomposition Tree V2 — Enhancement Backlog

Enhancement IDs use the format **EBL-XXX**. Reference the ID when requesting an item to work on.

**Effort sizing:** S = a few hours · M = half to one day · L = one to two days · XL = multiple days / significant design work

---

## Backlog

| ID | Size | Description | Notes |
|---|---|---|---|
| EBL-003 | **XL** | **View underlying data from tooltip** |
| EBL-009 | **S** | **Onboarding hint on first load** | When the extension loads and only the root node is visible (no drilling has occurred), display a small stylized callout below the root node's expand button with a curved arrow pointing up at the + symbol and short instructional text (e.g. "Click + to drill into an attribute"). The hint auto-dismisses the first time the user clicks the + button or the bar, and does not reappear for that session. No persistent storage needed — hint only shows on initial load before any interaction. | Add a button inside the tooltip to open a detail drawer showing all rows that make up the selected node — displaying dimension attributes from the Marks card. Requires a new modal/table component, row pagination for large datasets, and formatting logic. |
| EBL-008 | **L** | **Preserve deep expansion pattern when switching level-1 siblings** | When a multi-level drill is open (e.g. Cip6 Name → Soc 2 Name Year 1 → Is High Demand) and the user clicks a different level-1 sibling (e.g. switches from "Computer Science" to "Psychology, General"), the full expansion pattern should be replayed on the new branch — not just the first level. Currently the one-at-a-time collapse wipes out all expansion below depth 2. Requires: (1) extracting a drill-path template (ordered list of dimension + sort order at each depth) from the currently active branch before collapsing it, (2) recursively applying that template to the newly selected node's children at each depth level using the existing `drillDown` function. Related to the filter/measure replay mechanism (C-031/C-032). Edge cases: new branch may have fewer children or a different node structure at deeper levels — replay should apply as many levels as possible and stop gracefully when no matching expansion exists. |

---

## Completed

### v2.0 — Core rewrite (Svelte + D3)

| ID | Description |
|---|---|
| C-001 | Initial v2 rewrite: Svelte + D3 tree with drill-down, collapse/expand, encoding map |
| C-002 | Animated bar fill transitions (width for LR, height for TB) |
| C-003 | Tooltip with value, %, and custom tooltip fields |
| C-004 | Empty state shown before a measure is added |
| C-005 | Zoom controls (zoom in, fit to view, zoom out) with pan support |
| C-006 | Settings panel (ConfigPanel) with save/load via Tableau extension settings |
| C-007 | Node width, level spacing, sibling spacing, bar height controls |
| C-008 | Link style setting: Curved, Step, Straight |
| C-009 | Background color picker |
| C-010 | Negative value color picker |
| C-011 | Bar corner radius control |
| C-012 | Color theme presets (Ocean, Forest, Amethyst, Sunset, Teal) + Custom gradient |
| C-013 | Gradient on/off toggle — solid color when off, gradient by value rank when on |
| C-014 | Gradient direction: default themes darkest = largest; Custom: first color = largest |
| C-015 | Font size controls for heading and subheading (number inputs) |
| C-016 | Font family selector: System, Serif, Monospace |
| C-017 | Heading and subheading color pickers |
| C-018 | Label mode: Value & %, Value only, % only |
| C-019 | Show measure name toggle (prefix value line with measure name) |
| C-020 | Show group count (replaces meaningless record count) |
| C-021 | Exclude nulls toggle — hides null/empty dimension members when drilling |
| C-022 | Value format: Auto (Tableau native), Number, Currency, Percentage |
| C-023 | Measure alias / custom display name — auto-strips aggregation prefix on load |
| C-024 | Sibling auto-drill — clicking undrilled sibling reuses the same dimension |
| C-025 | One-at-a-time expansion — drilling a sibling collapses previously expanded sibling |
| C-026 | (Other) grouping — excess children aggregated into a single overflow node |
| C-027 | Max children shown control with live re-drill on change |
| C-028 | Alignment control (Top / Centered) for LR orientation |
| C-029 | Top-left alignment with `topAlignHier` post-processing |
| C-030 | GitHub Pages deployment from `docs/` folder |

### v2.2 — Dashboard interaction & tooltip

| ID | Description |
|---|---|
| EBL-001 | Dashboard Actions — bar click selects marks in Tableau, triggering native "Use as Filter" to propagate selection to other sheets on the dashboard; click again or click background to clear |
| EBL-002 | Dim unselected nodes on click — sibling nodes fade to 30% opacity when a node is selected; clears on deselect or background click |
| EBL-004 | Tooltip narrative template — config-driven textarea replaces default tooltip rows; supports `<measure>`, `<value>`, `<pct>`, `<count>`, dimension path, and tooltip shelf field placeholders; pre-filled with default layout as a starting point |
| EBL-005 | Connector color settings — active path, inactive, and negative color pickers plus opacity slider in a Connectors section; inactive always grey, negative color only applied on the active path |
| EBL-006 | Bar scale mode — three-way control in Layout settings: Parent (default, relative to parent value), Top Node (relative to root total), Level Max (relative to largest value at same depth) |
| EBL-007 | Column header formatting — font size and color controls for dimension column headers ("▸ by Region") in Settings under a dedicated Column Headers section |

### v2.1 — Interaction & layout refinements

| ID | Description |
|---|---|
| C-031 | Preserve expansion on filter changes — replay drill path on fresh data |
| C-032 | Preserve expansion on measure changes |
| C-033 | Max children change immediately re-groups (Other) without collapse/expand |
| C-034 | Sort order selection in Drill Into picker (Ascending / Descending) |
| C-035 | Sort stored per node (`_sortOrder`) and replayed on data refresh |
| C-036 | Sort arrows in column headers — clickable ↑/↓ to toggle sort inline |
| C-037 | Column header display bug fix — header no longer disappears after first collapse |
| C-038 | Sort toggle collapse bug fix — toggling sort no longer expands collapsed siblings |
| C-039 | Expand/collapse button moved outside node card (right of bar in LR, below bar in TB) |
| C-040 | Link source adjusted to exit after expand button in LR mode |
| C-041 | Top-Bottom orientation: vertical column bars, labels to the right, button below bar |
| C-042 | TB label text wrapping — labels wrap to fit available width using tspan elements |
| C-043 | Value text y-position shifts dynamically based on number of wrapped label lines |
| C-044 | Percentage sign fix — % always matches the sign of the child value |
| C-045 | Alignment control renamed from "Initial Alignment" to "Alignment"; Top option listed first |
