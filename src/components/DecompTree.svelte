<script>
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import * as d3 from 'd3';
  import { treeRoot, pendingDrillNode, statusMessage, selectedNodeInfo } from '../stores/treeState.js';
  import { selectMarksForFilter, clearMarkSelection } from '../lib/tableau.js';
  import { config } from '../stores/config.js';
  import { encodingMap } from '../stores/encodings.js';
  import { drillDown, toggleCollapse, updateNodeInTree, findParent, toggleSortAtDimension } from '../lib/treeEngine.js';
  import { formatValue, truncate } from '../lib/formatters.js';
  import Tooltip from './Tooltip.svelte';
  import DimensionPicker from './DimensionPicker.svelte';

  let containerEl;
  let svgEl;
  let containerWidth = 800;
  let containerHeight = 600;

  let tooltipVisible = false;
  let tooltipX = 0;
  let tooltipY = 0;
  let tooltipData = null;

  let mainGroup;
  let zoomBehavior;

  // ── Bar chart node geometry ────────────────────────────────────────────────
  // BAR_H comes from config.barHeight (default 20); the rest are derived.
  const TEXT_GAP = 8;    // gap from bar bottom to first text baseline
  const LINE_H   = 18;   // line height between text rows
  const BOT_PAD  = 6;    // padding below last text line
  const EXPAND_R = 10;   // expand button circle radius

  // Compute layout geometry from a given bar height
  function nodeGeometry(barH) {
    const nodeH  = barH + TEXT_GAP + LINE_H * 2 + BOT_PAD;
    const barTopY = -nodeH / 2;
    return {
      nodeH,
      barTopY,
      barCY:  barTopY + barH / 2,
      text1Y: barTopY + barH + TEXT_GAP + 13,
      text2Y: barTopY + barH + TEXT_GAP + 13 + LINE_H,
    };
  }

  // Stable defaults used for doFitToView when called outside renderTree
  let _lastNodeH = 70;

  // Set to the ID of the node that was just drilled into so doFitToView can
  // smart-zoom to that parent + its new children. Reset to null after consuming.
  let _lastDrilledNodeId = null;

  // HTML column headers (driven from D3 layout, updated each render)
  let colHeaders = []; // [{ dimName, dataX }]

  // Expand-button position in tree coordinates — used to anchor the drill hint overlay
  let hintAnchor = null; // { tx, ty }

  // Current D3 zoom transform — tracked to position column headers correctly
  let currentZoom = { x: 0, y: 0, k: 1 };

  // ── Top-left layout helpers ────────────────────────────────────────────────
  // Shift an entire subtree's vertical axis (x in LR, y in TB) by delta.
  function shiftVertical(node, delta, isLR) {
    if (isLR) node.x += delta; else node.y += delta;
    if (node.children) node.children.forEach(c => shiftVertical(c, delta, isLR));
  }

  // Post-process a D3 hierarchy so that each sibling group starts AT the
  // parent's vertical position and extends downward, instead of centering.
  function topAlignHier(node, isLR) {
    if (!node.children || node.children.length === 0) return;
    const parentV     = isLR ? node.x     : node.y;
    const firstChildV = isLR ? node.children[0].x : node.children[0].y;
    const shift       = parentV - firstChildV;
    node.children.forEach(c => shiftVertical(c, shift, isLR));
    node.children.forEach(c => topAlignHier(c, isLR));
  }

  // Color palette — start and end for per-sibling gradient interpolation
  const COLOR_THEMES = {
    blue:   { start: '#5b8dee', end: '#1e3fa8' },
    green:  { start: '#34c98e', end: '#0b7a4e' },
    purple: { start: '#9b6dff', end: '#4a1aa8' },
    orange: { start: '#ff8c4b', end: '#c44e00' },
    teal:   { start: '#2eccc4', end: '#0d7a75' },
  };
  const BAR_BG_COLOR = '#e2e8f0'; // gray track

  onMount(() => {
    const svgSel = d3.select(svgEl);
    mainGroup = svgSel.append('g').attr('class', 'tree-root-group');

    zoomBehavior = d3.zoom()
      .scaleExtent([0.04, 4])
      .on('zoom', (event) => {
        mainGroup.attr('transform', event.transform);
        currentZoom = { x: event.transform.x, y: event.transform.y, k: event.transform.k };
        tooltipVisible = false;
      });
    svgSel.call(zoomBehavior).on('dblclick.zoom', null);

    // Clicking the SVG background deselects the current node and clears mark selection
    svgSel.on('click', async () => {
      const info = get(selectedNodeInfo);
      if (info) {
        selectedNodeInfo.set(null);
        statusMessage.set('Selection cleared');
        await clearMarkSelection();
      }
    });

    // Store subscription fires immediately with current value, then on every change.
    // This avoids the Svelte 5 legacy-mode race where $: blocks fire before onMount.
    const redraw = () => {
      const root = get(treeRoot);
      if (!root || !mainGroup) return;
      const cfg = get(config);
      const rawName = get(encodingMap).value?.[0]?.name ?? 'Value';
      const vName = cfg.measureAlias?.trim() || rawName;
      renderTree(root, cfg, vName);
      doFitToView(root, cfg);
    };

    const unsubRoot     = treeRoot.subscribe(redraw);
    const unsubConfig   = config.subscribe(redraw);
    const unsubSelected = selectedNodeInfo.subscribe(() => {
      if (!svgEl) return;
      const sel = get(selectedNodeInfo);
      const cfg = get(config);
      d3.select(svgEl).selectAll('.tree-node')
        .transition().duration(200)
        .style('opacity', d => {
          if (!sel) return 1;
          if (d.data.id === sel.id) return 1;
          return d.parent?.children?.some(c => c.data.id === sel.id) ? 0.3 : 1;
        });
      d3.select(svgEl).selectAll('.tree-link')
        .transition().duration(200)
        .attr('stroke', d => resolveLinkColor(d, sel, cfg));
    });

    return () => { unsubRoot(); unsubConfig(); unsubSelected(); };
  });

  // Split `text` into lines that fit within `maxWidth` pixels (approximate char-width method).
  // Returns up to maxLines strings; truncates the last line with "…" if needed.
  function computeWrappedLines(text, maxWidth, fontSize, maxLines = 2) {
    const charW  = fontSize * 0.58;
    const maxCh  = Math.max(6, Math.floor(maxWidth / charW));
    const words  = String(text ?? '').split(/\s+/).filter(Boolean);
    if (!words.length) return [''];
    const lines  = [];
    let cur      = '';
    for (const word of words) {
      if (lines.length === maxLines - 1) {
        // On the last allowed line — keep appending (will truncate below)
        cur = cur ? `${cur} ${word}` : word;
      } else if (!cur) {
        cur = word;
      } else if ((cur + ' ' + word).length <= maxCh) {
        cur += ' ' + word;
      } else {
        lines.push(cur);
        cur = word;
      }
    }
    if (cur) lines.push(cur.length > maxCh + 3 ? `${cur.slice(0, maxCh)}…` : cur);
    return lines.slice(0, maxLines);
  }

  function renderTree(rootData, cfg, valueName) {
    if (!mainGroup || !rootData) return;

    const isLR     = cfg.orientation === 'LR';
    const dur      = cfg.animationDuration;
    const nw       = cfg.nodeWidth;
    const BAR_H    = cfg.barHeight ?? 20;
    const { nodeH: nh, barTopY, barCY, text1Y, text2Y } = nodeGeometry(BAR_H);

    // TB (top-bottom) vertical bar geometry — used only when !isLR
    const TB_BAR_W     = 36;                      // vertical bar column width
    const TB_BAR_MAX_H = 100;                     // bar background height (100% fill)
    const TB_LABEL_X   = TB_BAR_W / 2 + 8;       // text x: right of bar
    const TB_BAR_TOP   = -TB_BAR_MAX_H / 2;       // bar top y (relative to node center)
    const TB_BAR_BOT   =  TB_BAR_MAX_H / 2;       // bar bottom y
    const TB_EXPAND_CY = TB_BAR_BOT + EXPAND_R + 6; // expand button center y (below bar)
    const TB_NH        = TB_BAR_MAX_H + EXPAND_R * 2 + 14; // effective node height for layout

    _lastNodeH = isLR ? nh : TB_NH;

    // Compute the final wrapped line array for a TB label node (including pct% suffix).
    // Shared between bar-label rendering and bar-value-text y-position calculation.
    function tbLabelContent(d) {
      const rawLabel   = d.depth === 0 ? valueName : d.data.label;
      const availWidth = nw - TB_BAR_W / 2 - 8;
      const lines      = computeWrappedLines(rawLabel, availWidth, fontSize);
      if (d.depth > 0 && labelMode !== 'value') {
        const pct    = (d.data.percentOfParent ?? 100).toFixed(0);
        const pctStr = ` (${pct}%)`;
        const maxCh  = Math.floor(availWidth / (fontSize * 0.58));
        const last   = lines[lines.length - 1];
        if (last.length + pctStr.length <= maxCh) {
          lines[lines.length - 1] += pctStr; // fits on same line
        } else {
          lines.push(`(${pct}%)`);           // overflow to new line
        }
      }
      return lines;
    }

    const BAR_R    = cfg.barRadius ?? 4;
    const negColor = cfg.negativeColor || '#f472b6';
    const theme     = COLOR_THEMES[cfg.colorTheme] || COLOR_THEMES.blue;
    const startColor = cfg.colorTheme === 'custom' ? (cfg.customColorStart || '#5b8dee') : theme.start;
    const endColor   = cfg.colorTheme === 'custom' ? (cfg.customColorEnd   || startColor) : theme.end;
    const colorInterp = d3.interpolateRgb(startColor, endColor);

    // Returns a color for a node based on its position among siblings.
    // When useGradient is off, all positive bars share the start color.
    // Default themes: largest (idx=0) → darkest; Custom: largest → first color chosen.
    const isCustom = cfg.colorTheme === 'custom';
    function posColor(d) {
      if (!cfg.useGradient) return colorInterp(isCustom ? 0 : 1);
      if (!d.parent || !d.parent.children || d.parent.children.length <= 1) {
        return colorInterp(isCustom ? 0 : 1);
      }
      const siblings = d.parent.children;
      const t = siblings.indexOf(d) / (siblings.length - 1);
      return colorInterp(isCustom ? t : 1 - t);
    }

    const fontSize      = cfg.fontSize    || 13;
    const subFontSize   = cfg.subFontSize || 11;
    const headingColor  = cfg.headingColor    || '#1e293b';
    const subheadColor  = cfg.subheadingColor || '#64748b';
    const fontFamilyMap = {
      system: 'system-ui, sans-serif',
      serif:  'Georgia, serif',
      mono:   'ui-monospace, monospace'
    };
    const fontFamily    = fontFamilyMap[cfg.fontFamily] || fontFamilyMap.system;
    const labelMode     = cfg.labelMode || 'both';
    const showMeasName  = cfg.showMeasureName !== false;

    const totalBreakdownDims = ($encodingMap.breakdown || []).length;

    function visibleChildren(d) {
      if (d._collapsed || !d.children) return null;
      return d.children.slice(0, cfg.maxChildrenShown + 1); // +1 to always include (Other)
    }
    const hier = d3.hierarchy(rootData, visibleChildren);
    d3.tree().nodeSize(
      isLR ? [nh + cfg.siblingSpacing, nw + cfg.levelSpacing]
           : [nw + cfg.siblingSpacing, TB_NH + cfg.levelSpacing]
    )(hier);
    if (cfg.initialAlignment === 'top-left' && isLR) topAlignHier(hier, isLR);

    const nodes = hier.descendants();
    const links = hier.links();

    // Per-depth max absolute value — used only for 'level' bar scale mode
    const maxByDepth = {};
    for (const d of nodes) {
      if (d.depth === 0) continue;
      const abs = Math.abs(d.data.value ?? 0);
      if (abs > (maxByDepth[d.depth] ?? 0)) maxByDepth[d.depth] = abs;
    }

    // Returns the bar fill percentage (0–100) for a node based on barScaleMode.
    // The percentage label shown on the node always uses percentOfParent regardless of mode.
    function barPct(d) {
      if (d.depth === 0) return 100;
      const mode = cfg.barScaleMode || 'parent';
      if (mode === 'top') {
        const rootAbs = Math.abs(rootData.value ?? 1) || 1;
        return Math.max(0, Math.min(100, Math.abs(d.data.value ?? 0) / rootAbs * 100));
      }
      if (mode === 'level') {
        const levelMax = maxByDepth[d.depth] || 1;
        return Math.max(0, Math.min(100, Math.abs(d.data.value ?? 0) / levelMax * 100));
      }
      // 'parent' (default) — use pre-computed percentOfParent
      return Math.max(0, Math.min(100, Math.abs(d.data.percentOfParent ?? 100)));
    }

    const posX  = isLR ? d => d.y : d => d.x;
    const posY  = isLR ? d => d.x : d => d.y;
    const xform = d => `translate(${posX(d)},${posY(d)})`;

    // Named transitions prevent cross-interruption
    const tLayout = d3.transition('layout').duration(dur).ease(d3.easeCubicOut);
    const tFill   = d3.transition('fill').duration(dur).ease(d3.easeCubicOut);

    // ── Links ─────────────────────────────────────────────────────────────
    const linkGen = buildLinkGen(cfg, nw, nh, barCY);

    const linkSel = mainGroup.selectAll('.tree-link')
      .data(links, d => d.target.data.id);

    const linkOpacity = cfg.linkOpacity ?? 0.9;
    const sel = get(selectedNodeInfo);

    linkSel.exit().transition(tLayout).style('opacity', 0).remove();

    linkSel.enter().append('path')
      .attr('class', 'tree-link')
      .attr('d', linkGen)
      .attr('stroke', d => resolveLinkColor(d, sel, cfg))
      .attr('stroke-opacity', 0)
      .transition(tLayout).attr('stroke-opacity', linkOpacity);

    mainGroup.selectAll('.tree-link')
      .transition(tLayout)
      .attr('d', linkGen)
      .attr('stroke', d => resolveLinkColor(d, sel, cfg))
      .attr('stroke-opacity', linkOpacity);

    // ── Nodes ─────────────────────────────────────────────────────────────
    const nodeSel = mainGroup.selectAll('.tree-node')
      .data(nodes, d => d.data.id);

    nodeSel.exit().transition(tLayout).style('opacity', 0).remove();

    const nodeEnter = nodeSel.enter().append('g')
      .attr('class', 'tree-node')
      .attr('transform', xform)
      .style('opacity', 0)
      .on('mousemove', handleMouseMove)
      .on('mouseleave', () => { tooltipVisible = false; });

    // Bar background (gray track, full width)
    nodeEnter.append('rect').attr('class', 'bar-bg')
      .attr('x', -nw / 2).attr('y', barTopY)
      .attr('width', nw).attr('height', BAR_H)
      .attr('rx', BAR_R).attr('fill', BAR_BG_COLOR);

    // Bar fill: LR animates width from left; TB animates height growing upward from bottom
    const fillEnter = nodeEnter.append('rect').attr('class', 'bar-fill').attr('rx', BAR_R);
    if (isLR) {
      fillEnter.attr('x', -nw / 2).attr('y', barTopY).attr('height', BAR_H).attr('width', 0);
    } else {
      fillEnter.attr('x', -TB_BAR_W / 2).attr('y', TB_BAR_BOT).attr('width', TB_BAR_W).attr('height', 0);
    }

    // Line 1: "Label (pct%)"
    nodeEnter.append('text').attr('class', 'bar-label')
      .attr('text-anchor', 'start');

    // Line 2: "MeasureName: value"
    nodeEnter.append('text').attr('class', 'bar-value-text')
      .attr('text-anchor', 'start');

    // Expand button circle — just to the right of the node card, at bar height
    nodeEnter.append('circle').attr('class', 'expand-circle')
      .attr('cy', barCY).attr('r', EXPAND_R)
      .attr('stroke', 'white').attr('stroke-width', 1.5);

    // Expand icon text (+/−)
    nodeEnter.append('text').attr('class', 'expand-icon')
      .attr('text-anchor', 'middle');


    // ── UPDATE (enter + existing) ──────────────────────────────────────────
    const nodeUpdate = nodeEnter.merge(nodeSel);

    nodeUpdate.transition(tLayout).attr('transform', xform);

    // Bar background: update position, size, and corner radius
    nodeUpdate.select('.bar-bg')
      .attr('x',      isLR ? -nw / 2       : -TB_BAR_W / 2)
      .attr('y',      isLR ? barTopY        : TB_BAR_TOP)
      .attr('width',  isLR ? nw             : TB_BAR_W)
      .attr('height', isLR ? BAR_H          : TB_BAR_MAX_H)
      .attr('rx', BAR_R)
      .attr('fill', BAR_BG_COLOR);

    // Bar fill: LR animates width; TB animates height+y (grows upward from bar bottom)
    nodeUpdate.select('.bar-fill')
      .attr('x',  isLR ? -nw / 2 : -TB_BAR_W / 2)
      .attr('rx', BAR_R)
      .transition(tFill)
      .attr('width', d => {
        const pct = barPct(d);
        return isLR ? nw * pct / 100 : TB_BAR_W;
      })
      .attr('height', d => {
        const pct = barPct(d);
        return isLR ? BAR_H : TB_BAR_MAX_H * pct / 100;
      })
      .attr('y', d => {
        const pct = barPct(d);
        return isLR ? barTopY : TB_BAR_BOT - TB_BAR_MAX_H * pct / 100;
      })
      .attr('fill', d => d.data.value >= 0 ? posColor(d) : negColor);

    // Label line 1:
    //   root  → measure name/alias only (% is always 100%, never shown)
    //   child → label + optional (pct%) based on labelMode
    nodeUpdate.select('.bar-label')
      .attr('x', isLR ? -nw / 2 + 6 : TB_LABEL_X)
      .attr('y', isLR ? text1Y : TB_BAR_TOP + 13)
      .style('font-size', `${fontSize}px`)
      .style('font-family', fontFamily)
      .style('fill', headingColor)
      .each(function(d) {
        const el = d3.select(this);
        if (isLR) {
          // LR: single-line text — D3's .text() clears any existing tspans automatically
          if (d.depth === 0) { el.text(valueName); return; }
          const label = truncate(d.data.label, 24);
          if (labelMode === 'value') { el.text(label); return; }
          const pct = (d.data.percentOfParent ?? 100).toFixed(0);
          el.text(`${label} (${pct}%)`);
        } else {
          // TB: wrap label into tspan elements so text doesn't overflow into adjacent bar
          el.text(''); // clears existing text/tspans
          const lines = tbLabelContent(d);
          lines.forEach((line, i) => {
            el.append('tspan')
              .attr('x', TB_LABEL_X)
              .attr('dy', i === 0 ? 0 : LINE_H)
              .text(line);
          });
        }
      });

    // Value line 2:
    //   root        → formatted value only (measure name is already on line 1)
    //   labelMode 'percent' → empty (value hidden; % is shown on line 1)
    //   otherwise   → value, optionally prefixed with measure name
    nodeUpdate.select('.bar-value-text')
      .attr('x', isLR ? -nw / 2 + 6 : TB_LABEL_X)
      .attr('y', d => isLR ? text2Y : TB_BAR_TOP + 13 + LINE_H * tbLabelContent(d).length)
      .style('font-size', `${subFontSize}px`)
      .style('font-family', fontFamily)
      .style('fill', subheadColor)
      .text(d => {
        // Group count suffix: "• N groups" when enabled and node has been drilled
        const gc = (cfg.showGroupCount && d.data.children?.length)
          ? ` • ${d.data.children.length} groups`
          : '';

        if (d.depth === 0) return `${formatValue(d.data.value, cfg)}${gc}`;
        if (labelMode === 'percent') return gc.trimStart() || '';
        const val = formatValue(d.data.value, cfg);
        const line = showMeasName ? `${valueName}: ${val}` : val;
        return `${line}${gc}`;
      });

    // Expand button: color, position, and visibility
    const isExpanded = d => !!(d.data.children && !d.data._collapsed);
    // Hide + when node has used all available breakdown dimensions
    const showExpand = d => {
      if (isExpanded(d)) return true; // always show − to collapse
      const dimsUsed = d.data.dimensionPath?.length ?? 0;
      return dimsUsed < totalBreakdownDims;
    };

    nodeUpdate.select('.expand-circle')
      .attr('cx', isLR ? nw / 2 + EXPAND_R + 2 : 0)
      .attr('cy', isLR ? barCY : TB_EXPAND_CY)
      .attr('visibility', d => showExpand(d) ? 'visible' : 'hidden')
      .transition(tFill)
      .attr('fill', d => isExpanded(d) ? '#94a3b8' : posColor(d));

    nodeUpdate.select('.expand-icon')
      .attr('x', isLR ? nw / 2 + EXPAND_R + 2 : 0)
      .attr('y', isLR ? barCY + 5 : TB_EXPAND_CY + 5)
      .attr('visibility', d => showExpand(d) ? 'visible' : 'hidden')
      .text(d => isExpanded(d) ? '−' : '+');

    // Dim sibling nodes when a selection is active
    nodeUpdate.transition(tFill)
      .style('opacity', d => {
        const sel = get(selectedNodeInfo);
        if (!sel) return 1;
        if (d.data.id === sel.id) return 1;
        return d.parent?.children?.some(c => c.data.id === sel.id) ? 0.3 : 1;
      });

    // Bar area click → select/filter; expand button click → drill/collapse
    nodeUpdate.on('click', (event, d) => handleBarClick(event, d));
    nodeUpdate.select('.expand-circle').on('click', (event, d) => handleExpandClick(event, d));
    nodeUpdate.select('.expand-icon').on('click', (event, d) => handleExpandClick(event, d));

    // ── Drill hint anchor — centered on expand button X, below node card Y ─
    // ty points to the bottom of the node (text included) so the bubble never
    // overlaps the label or subheading. A small fixed screen-pixel gap is added
    // in the template on top of this.
    hintAnchor = {
      tx: posX(hier) + (isLR ? nw / 2 + EXPAND_R + 2 : 0),
      ty: posY(hier) + (isLR ? nh / 2 : TB_EXPAND_CY + EXPAND_R + 4),
    };

    // ── Collect column header data for HTML overlay ────────────────────────
    // LR: one header per unique column (posX = horizontal); rendered at top.
    // TB: one header per unique depth row (posY = vertical); rendered at left.
    const headerMap = new Map(); // key: dataMain → { dim, dataMain, isLR, sortOrder }
    for (const d of nodes) {
      if (!d.parent || !d.data._drillDimension) continue;
      // No first-child-only restriction: if the first sibling was reset its
      // _drillDimension is null, so let any sibling register the header.
      // headerMap deduplicates by position — first match wins.
      const dataMain = isLR ? posX(d) : posY(d);
      if (!headerMap.has(dataMain)) {
        headerMap.set(dataMain, {
          dim: d.data._drillDimension,
          dataMain,
          isLR,
          sortOrder: d.data._sortOrder || 'desc'
        });
      }
    }
    colHeaders = Array.from(headerMap.values());
  }

  // Returns the stroke color for a link based on selection state and node value.
  // Priority: active path > negative node > inactive.
  // A link target is "active" when the selected node is that node or a descendant of it
  // (i.e. the selected node's ID starts with the target's ID followed by '|').
  function resolveLinkColor(link, sel, cfg) {
    if (sel) {
      const tid = link.target.data.id;
      const isActive = sel.id === tid || sel.id.startsWith(tid + '|');
      if (isActive) {
        return link.target.data.value < 0
          ? cfg.linkColorNegative || '#f472b6'
          : cfg.linkColorActive   || '#5b8dee';
      }
    }
    return cfg.linkColorInactive || '#cbd5e1';
  }

  // Build a link generator that respects cfg.linkStyle: 'step' | 'curved' | 'straight'
  function buildLinkGen(cfg, nw, nh, barCY) {
    const isLR  = cfg.orientation === 'LR';
    const style = cfg.linkStyle || 'step';

    if (isLR) {
      // LR: source exits after the expand button (card edge + button diameter + gap)
      const srcX = nw / 2 + EXPAND_R * 2 + 6;
      if (style === 'curved') {
        return d3.linkHorizontal()
          .x(d => d.barX)
          .y(d => d.barY)
          .source(d => ({ barX: d.source.y + srcX, barY: d.source.x + barCY }))
          .target(d => ({ barX: d.target.y - nw / 2, barY: d.target.x + barCY }));
      }
      if (style === 'straight') {
        return d => {
          const sx = d.source.y + srcX, sy = d.source.x + barCY;
          const tx = d.target.y - nw / 2, ty = d.target.x + barCY;
          return `M${sx},${sy}L${tx},${ty}`;
        };
      }
      // step (default)
      return d => {
        const sx = d.source.y + srcX, sy = d.source.x + barCY;
        const tx = d.target.y - nw / 2, ty = d.target.x + barCY;
        const mx = (sx + tx) / 2;
        return `M${sx},${sy}H${mx}V${ty}H${tx}`;
      };
    } else {
      // TB vertical bar: source exits below expand button; target enters bar top
      const TB_BAR_MAX_H = 100;
      const TB_EXPAND_CY = TB_BAR_MAX_H / 2 + EXPAND_R + 6;
      const srcYOff = TB_EXPAND_CY + EXPAND_R + 2; // just below expand button
      const tgtYOff = -TB_BAR_MAX_H / 2;           // top of child bar bg

      if (style === 'curved') {
        return d3.linkVertical()
          .x(d => d.barX)
          .y(d => d.barY)
          .source(d => ({ barX: d.source.x, barY: d.source.y + srcYOff }))
          .target(d => ({ barX: d.target.x, barY: d.target.y + tgtYOff }));
      }
      if (style === 'straight') {
        return d => {
          const sx = d.source.x, sy = d.source.y + srcYOff;
          const tx = d.target.x, ty = d.target.y + tgtYOff;
          return `M${sx},${sy}L${tx},${ty}`;
        };
      }
      // step (default)
      return d => {
        const sx = d.source.x, sy = d.source.y + srcYOff;
        const tx = d.target.x, ty = d.target.y + tgtYOff;
        const my = (sy + ty) / 2;
        return `M${sx},${sy}V${my}H${tx}V${ty}`;
      };
    }
  }

  function doFitToView(rootData, cfg) {
    if (!mainGroup || !svgEl || !rootData) return;
    const isLR = cfg.orientation === 'LR';
    const nw = cfg.nodeWidth;
    const nh = _lastNodeH;

    function visibleChildren(d) {
      if (d._collapsed || !d.children) return null;
      return d.children.slice(0, cfg.maxChildrenShown + 1); // +1 to always include (Other)
    }
    const hier = d3.hierarchy(rootData, visibleChildren);
    d3.tree().nodeSize(
      isLR ? [nh + cfg.siblingSpacing, nw + cfg.levelSpacing]
           : [nw + cfg.siblingSpacing, nh + cfg.levelSpacing]
    )(hier);
    if (cfg.initialAlignment === 'top-left' && isLR) topAlignHier(hier, isLR);

    const allNodes = hier.descendants();

    // Smart zoom: when a drill just happened, restrict the bounding box to the
    // drilled parent + its new children so the new level is framed in the viewport.
    let focusNodes = allNodes;
    let usedSmartZoom = false;
    if (cfg.smartZoom && _lastDrilledNodeId) {
      const drilled = allNodes.find(n => n.data.id === _lastDrilledNodeId);
      if (drilled?.children?.length) {
        focusNodes = [drilled, ...drilled.children];
        usedSmartZoom = true;
      }
      _lastDrilledNodeId = null; // consume regardless — avoids stale state
    }

    const xs = focusNodes.map(n => isLR ? n.y : n.x);
    const ys = focusNodes.map(n => isLR ? n.x : n.y);
    const x0 = Math.min(...xs) - nw / 2 - 50;
    const y0 = Math.min(...ys) - nh / 2 - 50;
    const x1 = Math.max(...xs) + nw / 2 + 50;
    const y1 = Math.max(...ys) + nh / 2 + 50;
    const tw = x1 - x0;
    const th = y1 - y0;

    const w = containerWidth  || 800;
    const h = containerHeight || 600;
    // Cap at 1.2 for focused drills to prevent over-zooming on a small set of nodes
    const maxScale = usedSmartZoom ? 1.2 : 0.92;
    const scale = Math.min(maxScale, Math.min(w / tw, h / th));

    // Smart zoom always centers the focused region; full fit respects alignment setting
    let tx, ty;
    if (!usedSmartZoom && cfg.initialAlignment === 'top-left' && isLR) {
      tx = 40 - x0 * scale;
      ty = 40 - y0 * scale;
    } else {
      tx = (w - tw * scale) / 2 - x0 * scale;
      ty = (h - th * scale) / 2 - y0 * scale;
    }

    d3.select(svgEl)
      .transition('fit').duration(350)
      .call(zoomBehavior.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
  }

  // Called when the expand/collapse button is clicked
  function handleExpandClick(event, d) {
    event.stopPropagation();
    doDrillAction(d);
  }

  // Called when the bar area (node group background) is clicked.
  // Selects marks on this worksheet; Tableau's native "Use as Filter" action
  // propagates the selection to other sheets on the dashboard automatically.
  // Also auto-drills the node when a sibling is already expanded at this level
  // (preserves the original one-click expand-to-same-dimension behavior).
  async function handleBarClick(event, d) {
    event.stopPropagation();
    tooltipVisible = false;
    const node = d.data;
    const info = get(selectedNodeInfo);
    const isSameNode = info?.id === node.id;

    if (isSameNode) {
      selectedNodeInfo.set(null);
      statusMessage.set('Selection cleared');
      await clearMarkSelection();
    } else {
      selectedNodeInfo.set({ id: node.id, dimensionPath: node.dimensionPath });
      const label = node.dimensionPath.map(p => p.value).join(' › ');
      try {
        await selectMarksForFilter(node.dimensionPath);
        statusMessage.set(`Filtering: ${label}`);
      } catch (e) {
        console.error('[DecompTree] handleBarClick filter error:', e);
        statusMessage.set(`Filter error — check browser console (F12)`);
      }
    }

    const siblings = d.parent?.data?.children || [];

    if (node._collapsed) {
      // Previously drilled but collapsed by one-at-a-time logic — re-expand it
      // and collapse whichever sibling is currently expanded.
      treeRoot.update(root => {
        let r = updateNodeInTree(root, node.id, n => ({ ...n, _collapsed: false }));
        for (const sib of siblings) {
          if (sib.id !== node.id && sib.children && !sib._collapsed) {
            r = updateNodeInTree(r, sib.id, n => ({ ...n, _collapsed: true }));
          }
        }
        return r;
      });
    } else if (!node.children) {
      // Un-drilled node: if a sibling is already drilled, auto-drill this node
      // using the same dimension so the user doesn't have to click +.
      const drilledSibling = siblings.find(s => s.id !== node.id && s.children?.length > 0);
      const siblingDim = drilledSibling?.children?.[0]?._drillDimension ?? null;
      if (siblingDim) {
        const siblingSort = drilledSibling?.children?.[0]?._sortOrder || 'desc';
        const cfg = get(config);
        const updated = drillDown(node, siblingDim, get(encodingMap), cfg.maxChildrenShown, cfg.excludeNulls, siblingSort);
        _lastDrilledNodeId = node.id; // signal doFitToView to smart-zoom this node
        treeRoot.update(root => {
          let r = updateNodeInTree(root, node.id, () => updated);
          for (const sib of siblings) {
            if (sib.id !== node.id && sib.children && !sib._collapsed) {
              r = updateNodeInTree(r, sib.id, n => ({ ...n, _collapsed: true }));
            }
          }
          return r;
        });
        statusMessage.set(`Drilled into: ${siblingDim}`);
      }
    }
  }

  function doDrillAction(d) {
    tooltipVisible = false;
    const node = d.data;

    // Helper: collapse expanded siblings (preserves drill state; user can re-expand fast)
    function collapseExpandedSiblings(r, sibs, skipId) {
      for (const sib of sibs) {
        if (sib.id !== skipId && sib.children && !sib._collapsed) {
          r = updateNodeInTree(r, sib.id, n => ({ ...n, _collapsed: true }));
        }
      }
      return r;
    }

    const siblings = d.parent?.data?.children || [];

    if (node.children && !node._collapsed) {
      // Collapse = full reset: clears children and dimension so the user can choose
      // a different dimension next expansion. _rows is preserved for fast re-drill.
      treeRoot.update(root => updateNodeInTree(root, node.id,
        n => ({ ...n, children: null, _drillDimension: null, _collapsed: false })));

    } else if (node._collapsed) {
      // Re-expand; auto-collapse any currently-expanded siblings for one-at-a-time view
      treeRoot.update(root => {
        let r = updateNodeInTree(root, node.id, n => ({ ...n, _collapsed: false }));
        return collapseExpandedSiblings(r, siblings, node.id);
      });

    } else {
      // Un-drilled node: always show the DimensionPicker so the user can choose
      // any dimension. Auto-drill by sibling dimension only happens on bar click.
      pendingDrillNode.set(node);
    }
  }

  function handleMouseMove(event, d) {
    const rect = containerEl.getBoundingClientRect();
    tooltipData = d.data;
    tooltipX    = event.clientX - rect.left + 14;
    tooltipY    = event.clientY - rect.top  - 14;
    tooltipVisible = true;
  }

  function zoomIn() {
    d3.select(svgEl).transition().duration(250).call(zoomBehavior.scaleBy, 1.5);
  }

  function zoomOut() {
    d3.select(svgEl).transition().duration(250).call(zoomBehavior.scaleBy, 1 / 1.5);
  }

  function fitView() {
    const root = get(treeRoot);
    const cfg  = get(config);
    if (root) doFitToView(root, cfg);
  }

  function handleSortToggle(dim) {
    const cfg = get(config);
    treeRoot.update(root =>
      toggleSortAtDimension(root, dim, $encodingMap, cfg.maxChildrenShown, cfg.excludeNulls)
    );
  }

  // Show the onboarding hint when the root has never been drilled (no children).
  // Automatically disappears when the root is expanded and reappears on collapse/reload.
  $: showDrillHint = !!$treeRoot && !$treeRoot.children?.length;

  function handleDrillSelect(dimName, sortOrder = 'desc') {
    if (!$pendingDrillNode) return;
    const pendingNode = $pendingDrillNode;
    const updated = drillDown(pendingNode, dimName, $encodingMap, $config.maxChildrenShown, $config.excludeNulls, sortOrder);
    _lastDrilledNodeId = pendingNode.id; // signal doFitToView to smart-zoom this node
    treeRoot.update(root => {
      const parent = findParent(root, pendingNode.id);
      const siblings = parent?.children || [];
      let r = updateNodeInTree(root, pendingNode.id, () => updated);
      for (const sib of siblings) {
        if (sib.id !== pendingNode.id && sib.children && !sib._collapsed) {
          r = updateNodeInTree(r, sib.id, n => ({ ...n, _collapsed: true }));
        }
      }
      return r;
    });
    pendingDrillNode.set(null);
    statusMessage.set(`Drilled into: ${dimName}`);
  }
</script>

<div
  class="tree-container"
  bind:this={containerEl}
  bind:clientWidth={containerWidth}
  bind:clientHeight={containerHeight}
  style="background: {$config.bgColor}"
>
  <svg bind:this={svgEl} class="tree-svg"></svg>

  <!-- HTML column headers — follow pan/zoom; top for LR, left for TB -->
  {#each colHeaders as h (h.dim + h.dataMain)}
    {@const sc = h.dataMain * currentZoom.k + (h.isLR ? currentZoom.x : currentZoom.y)}
    {@const style = h.isLR
      ? `left:${sc}px; top:8px; transform:translateX(-50%)`
      : `left:8px; top:${sc}px; transform:translateY(-50%)`}
    <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
    <div class="col-header-overlay" style={style} on:click={() => handleSortToggle(h.dim)}>
      <div class="col-header-title" style="font-size:{$config.headerFontSize ?? 12}px; color:{$config.headerColor ?? '#334155'}">
        ▸ by {h.dim}
        <span class="sort-arrow">{h.sortOrder === 'asc' ? '↑' : '↓'}</span>
      </div>
    </div>
  {/each}

  <!-- Drill hint — shown when root node has never been expanded -->
  {#if showDrillHint && hintAnchor}
    {@const sx = hintAnchor.tx * currentZoom.k + currentZoom.x}
    {@const sy = hintAnchor.ty * currentZoom.k + currentZoom.y}
    <div class="drill-hint" style="left:{sx}px; top:{sy + 14}px">
      <span>Click</span>
      <svg width="20" height="20" viewBox="0 0 20 20" style="flex-shrink:0; vertical-align:middle">
        <circle cx="10" cy="10" r="10" fill="#5b8dee"/>
        <text x="10" y="15" text-anchor="middle" fill="white" font-size="16" font-weight="700" font-family="system-ui, sans-serif">+</text>
      </svg>
      <span>to drill into an attribute</span>
    </div>
  {/if}

  <!-- Zoom controls -->
  <div class="zoom-controls">
    <button class="zoom-btn" on:click={zoomIn}  title="Zoom in"     aria-label="Zoom in">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1.4"/>
        <path d="M6 3.5v5M3.5 6h5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
        <path d="M10 10l2.5 2.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      </svg>
    </button>
    <button class="zoom-btn zoom-btn-fit" on:click={fitView} title="Fit to view" aria-label="Fit to view">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M1 4V1h3M10 1h3v3M13 10v3h-3M4 13H1v-3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
    <button class="zoom-btn" on:click={zoomOut} title="Zoom out"    aria-label="Zoom out">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1.4"/>
        <path d="M3.5 6h5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
        <path d="M10 10l2.5 2.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      </svg>
    </button>
  </div>

  {#if tooltipVisible && tooltipData}
    <Tooltip x={tooltipX} y={tooltipY} data={tooltipData} />
  {/if}
</div>

{#if $pendingDrillNode}
  <DimensionPicker
    node={$pendingDrillNode}
    onSelect={handleDrillSelect}
    onClose={() => pendingDrillNode.set(null)}
  />
{/if}

<style>
  .tree-container {
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
    background: var(--color-bg-viz);
  }
  .tree-svg {
    display: block;
    width: 100%;
    height: 100%;
  }

  .zoom-controls {
    position: absolute;
    bottom: 16px;
    right: 16px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    background: var(--color-surface, #fff);
    border: 1px solid var(--color-border, #e2e8f0);
    border-radius: 8px;
    padding: 3px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.10);
    z-index: 10;
  }

  .zoom-btn {
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 5px;
    color: var(--color-text-secondary, #64748b);
    background: transparent;
    transition: background 0.12s, color 0.12s;
    cursor: pointer;
  }

  .zoom-btn:hover {
    background: var(--color-accent-subtle, #eff3ff);
    color: var(--color-accent, #4a6cf7);
  }

  .zoom-btn-fit {
    border-top: 1px solid var(--color-border-subtle, #f1f5f9);
    border-bottom: 1px solid var(--color-border-subtle, #f1f5f9);
    border-radius: 0;
  }

  /* Column headers — HTML overlay; position/transform set inline per orientation */
  .col-header-overlay {
    position: absolute;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    z-index: 5;
    cursor: pointer;
  }

  .col-header-title {
    display: flex;
    align-items: center;
    gap: 5px;
    font-weight: 600;
    background: rgba(255, 255, 255, 0.92);
    padding: 3px 9px;
    border-radius: 5px;
    white-space: nowrap;
    border: 1px solid #e2e8f0;
    backdrop-filter: blur(4px);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.07);
    transition: background 0.15s, border-color 0.15s;
    user-select: none;
  }

  .col-header-overlay:hover .col-header-title {
    background: rgba(255, 255, 255, 1);
    border-color: #94a3b8;
  }

  .sort-arrow {
    font-size: 11px;
    color: #64748b;
    font-weight: 700;
  }

  /* Drill hint callout */
  .drill-hint {
    position: absolute;
    display: flex;
    align-items: center;
    gap: 8px;
    background: white;
    color: #1e293b;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 11px 18px;
    font-size: 14px;
    font-weight: 500;
    white-space: nowrap;
    pointer-events: none;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
    transform: translateX(-50%);
    z-index: 8;
    animation: hint-pop 0.35s cubic-bezier(0.22, 1, 0.36, 1);
  }

  /* Bordered upward-pointing triangle: ::before = border layer, ::after = fill layer */
  .drill-hint::before {
    content: '';
    position: absolute;
    top: -10px;
    left: 50%;
    transform: translateX(-50%);
    border-width: 0 10px 10px 10px;
    border-style: solid;
    border-color: transparent transparent #e2e8f0 transparent;
  }

  .drill-hint::after {
    content: '';
    position: absolute;
    top: -8px;
    left: 50%;
    transform: translateX(-50%);
    border-width: 0 9px 9px 9px;
    border-style: solid;
    border-color: transparent transparent white transparent;
  }

  @keyframes hint-pop {
    from { opacity: 0; transform: translateX(-50%) translateY(6px); }
    to   { opacity: 1; transform: translateX(-50%) translateY(0);   }
  }

</style>
