# Decomposition Tree V2 — Enhancement Backlog

Enhancement IDs use the format **EBL-XXX**. Reference the ID when requesting an item to work on.

**Effort sizing:** S = a few hours · M = half to one day · L = one to two days · XL = multiple days / significant design work

---

## Backlog

| ID | Size | Description | Notes |
|---|---|---|---|
| EBL-001 | **L** | **Dashboard Actions — pass selected value as filter** | When user clicks a child node (e.g. "Technology" under Category), pass that dimension + value as a filter action to other sheets on the Tableau dashboard. Uses the Tableau Extensions `dashboard.extensions.dashboardContent.dashboard.applyFilterAsync` API. Requires click-state management and a settings option to enable/disable. |
| EBL-002 | **S** | **Dim unselected nodes on click** | When a child node is clicked/selected, visually dim all sibling nodes not in focus (D3 opacity change). Toggle off when clicking elsewhere or the same node again. Works well alongside EBL-001. |
| EBL-003 | **XL** | **View underlying data from tooltip** | Add a button inside the tooltip to open a detail drawer showing all rows that make up the selected node — displaying dimension attributes from the Marks card. Requires a new modal/table component, row pagination for large datasets, and formatting logic. |
| EBL-004 | **M** | **Display custom tooltip text from Tableau** | If the user types custom text in Tableau's Tooltip editor on the Marks card, display it in the extension's hover tooltip. Requires reading the tooltip spec string from the Tableau viz encoding and rendering it alongside the existing tooltip fields. |
| EBL-005 | **M** | **Connector color settings** | Add connector color controls to Settings. Three states: Active (node in the selected bar's ancestor path — defaults to current color scheme), Inactive (unselected connectors — defaults to grey), and Negative (connector to a negative-value node — defaults to current negative color). Connector opacity should default to ~90%. Tracing the active path requires walking from the selected node up through parent nodes in the D3 hierarchy. |
| EBL-006 | **M** | **Bar scale mode setting** | Add a "Bar scale" selector in Settings with three options: **Parent Node** (bar width/height is relative to the parent's value — current behavior, remains default), **Top Node** (all bars scaled relative to the root total), **Level Maximum** (each bar scaled relative to the largest value at the same depth level). Level Maximum requires a tree traversal pass to compute per-depth maximums before rendering. |
| EBL-007 | **S** | **Column header formatting** | Add a "Header" section in Settings with text size and color controls for the dimension column headers (the labels that appear above each drilled column, e.g. "Region", "Category"). Separate from the node heading/subheading font settings. |

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
