<script>
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import * as d3 from 'd3';
  import { treeRoot, pendingDrillNode, statusMessage } from '../stores/treeState.js';
  import { config } from '../stores/config.js';
  import { encodingMap } from '../stores/encodings.js';
  import { drillDown, toggleCollapse, updateNodeInTree, findParent } from '../lib/treeEngine.js';
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

  // HTML column headers (driven from D3 layout, updated each render)
  let colHeaders = []; // [{ dimName, dataX }]

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

    const unsubRoot   = treeRoot.subscribe(redraw);
    const unsubConfig = config.subscribe(redraw);

    return () => { unsubRoot(); unsubConfig(); };
  });

  function renderTree(rootData, cfg, valueName) {
    if (!mainGroup || !rootData) return;

    const isLR     = cfg.orientation === 'LR';
    const dur      = cfg.animationDuration;
    const nw       = cfg.nodeWidth;
    const BAR_H    = cfg.barHeight ?? 20;
    const { nodeH: nh, barTopY, barCY, text1Y, text2Y } = nodeGeometry(BAR_H);
    _lastNodeH = nh;
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
           : [nw + cfg.siblingSpacing, nh + cfg.levelSpacing]
    )(hier);
    if (cfg.initialAlignment === 'top-left' && isLR) topAlignHier(hier, isLR);

    const nodes = hier.descendants();
    const links = hier.links();

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

    linkSel.exit().transition(tLayout).style('opacity', 0).remove();

    linkSel.enter().append('path')
      .attr('class', 'tree-link')
      .attr('d', linkGen)
      .style('opacity', 0)
      .transition(tLayout).style('opacity', 1);

    mainGroup.selectAll('.tree-link')
      .transition(tLayout).attr('d', linkGen);

    // ── Nodes ─────────────────────────────────────────────────────────────
    const nodeSel = mainGroup.selectAll('.tree-node')
      .data(nodes, d => d.data.id);

    nodeSel.exit().transition(tLayout).style('opacity', 0).remove();

    const nodeEnter = nodeSel.enter().append('g')
      .attr('class', 'tree-node')
      .attr('transform', xform)
      .on('click', handleNodeClick)
      .on('mousemove', handleMouseMove)
      .on('mouseleave', () => { tooltipVisible = false; });

    // Bar background (gray track, full width)
    nodeEnter.append('rect').attr('class', 'bar-bg')
      .attr('x', -nw / 2).attr('y', barTopY)
      .attr('width', nw).attr('height', BAR_H)
      .attr('rx', BAR_R).attr('fill', BAR_BG_COLOR);

    // Bar fill (colored, animates to percentage width)
    nodeEnter.append('rect').attr('class', 'bar-fill')
      .attr('x', -nw / 2).attr('y', barTopY)
      .attr('height', BAR_H).attr('rx', BAR_R)
      .attr('width', 0);

    // Line 1: "Label (pct%)"
    nodeEnter.append('text').attr('class', 'bar-label')
      .attr('text-anchor', 'start');

    // Line 2: "MeasureName: value"
    nodeEnter.append('text').attr('class', 'bar-value-text')
      .attr('text-anchor', 'start');

    // Expand button circle (at right edge of bar)
    nodeEnter.append('circle').attr('class', 'expand-circle')
      .attr('cy', barCY).attr('r', EXPAND_R)
      .attr('stroke', 'white').attr('stroke-width', 1.5);

    // Expand icon text (+/−)
    nodeEnter.append('text').attr('class', 'expand-icon')
      .attr('text-anchor', 'middle');

    // ── UPDATE (enter + existing) ──────────────────────────────────────────
    const nodeUpdate = nodeEnter.merge(nodeSel);

    nodeUpdate.transition(tLayout).attr('transform', xform);

    // Bar background: update x, width, corner radius
    nodeUpdate.select('.bar-bg')
      .attr('x', -nw / 2).attr('width', nw).attr('rx', BAR_R);

    // Bar fill: animate width, color, and corner radius
    nodeUpdate.select('.bar-fill')
      .attr('x', -nw / 2).attr('rx', BAR_R)
      .transition(tFill)
      .attr('width', d => {
        const pct = Math.max(0, Math.min(100, Math.abs(d.data.percentOfParent ?? 100)));
        return nw * pct / 100;
      })
      .attr('fill', d => d.data.value >= 0 ? posColor(d) : negColor);

    // Label line 1:
    //   root  → measure name/alias only (% is always 100%, never shown)
    //   child → label + optional (pct%) based on labelMode
    nodeUpdate.select('.bar-label')
      .attr('x', -nw / 2 + 6)
      .attr('y', text1Y)
      .style('font-size', `${fontSize}px`)
      .style('font-family', fontFamily)
      .style('fill', headingColor)
      .text(d => {
        if (d.depth === 0) return valueName;
        const label = truncate(d.data.label, 24);
        if (labelMode === 'value') return label;
        const pct = (d.data.percentOfParent ?? 100).toFixed(0);
        return `${label} (${pct}%)`;
      });

    // Value line 2:
    //   root        → formatted value only (measure name is already on line 1)
    //   labelMode 'percent' → empty (value hidden; % is shown on line 1)
    //   otherwise   → value, optionally prefixed with measure name
    nodeUpdate.select('.bar-value-text')
      .attr('x', -nw / 2 + 6)
      .attr('y', text2Y)
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
      .attr('cx', nw / 2)
      .attr('visibility', d => showExpand(d) ? 'visible' : 'hidden')
      .transition(tFill)
      .attr('fill', d => isExpanded(d) ? '#94a3b8' : posColor(d));

    nodeUpdate.select('.expand-icon')
      .attr('x', nw / 2)
      .attr('y', barCY + 5)
      .attr('visibility', d => showExpand(d) ? 'visible' : 'hidden')
      .text(d => isExpanded(d) ? '−' : '+');

    // ── Collect column header data for HTML overlay ────────────────────────
    // LR: one header per unique column (posX = horizontal); rendered at top.
    // TB: one header per unique depth row (posY = vertical); rendered at left.
    const headerMap = new Map(); // key: dataMain → { dim, dataMain, isLR }
    for (const d of nodes) {
      if (!d.parent || !d.data._drillDimension) continue;
      if (d.parent.children[0] !== d) continue; // first child only
      const dataMain = isLR ? posX(d) : posY(d);
      if (!headerMap.has(dataMain)) {
        headerMap.set(dataMain, { dim: d.data._drillDimension, dataMain, isLR });
      }
    }
    colHeaders = Array.from(headerMap.values());
  }

  // Build a link generator that respects cfg.linkStyle: 'step' | 'curved' | 'straight'
  function buildLinkGen(cfg, nw, nh, barCY) {
    const isLR  = cfg.orientation === 'LR';
    const style = cfg.linkStyle || 'step';

    if (isLR) {
      // LR: source exits bar right-center; target enters bar left-center
      if (style === 'curved') {
        return d3.linkHorizontal()
          .x(d => d.barX)
          .y(d => d.barY)
          .source(d => ({ barX: d.source.y + nw / 2, barY: d.source.x + barCY }))
          .target(d => ({ barX: d.target.y - nw / 2, barY: d.target.x + barCY }));
      }
      if (style === 'straight') {
        return d => {
          const sx = d.source.y + nw / 2, sy = d.source.x + barCY;
          const tx = d.target.y - nw / 2, ty = d.target.x + barCY;
          return `M${sx},${sy}L${tx},${ty}`;
        };
      }
      // step (default)
      return d => {
        const sx = d.source.y + nw / 2, sy = d.source.x + barCY;
        const tx = d.target.y - nw / 2, ty = d.target.x + barCY;
        const mx = (sx + tx) / 2;
        return `M${sx},${sy}H${mx}V${ty}H${tx}`;
      };
    } else {
      // TB: source exits bar bottom-center; target enters bar top-center
      if (style === 'curved') {
        return d3.linkVertical()
          .x(d => d.barX)
          .y(d => d.barY)
          .source(d => ({ barX: d.source.x, barY: d.source.y + nh / 2 }))
          .target(d => ({ barX: d.target.x, barY: d.target.y - nh / 2 }));
      }
      if (style === 'straight') {
        return d => {
          const sx = d.source.x, sy = d.source.y + nh / 2;
          const tx = d.target.x, ty = d.target.y - nh / 2;
          return `M${sx},${sy}L${tx},${ty}`;
        };
      }
      // step (default)
      return d => {
        const sx = d.source.x, sy = d.source.y + nh / 2;
        const tx = d.target.x, ty = d.target.y - nh / 2;
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

    const nodes = hier.descendants();
    const xs = nodes.map(n => isLR ? n.y : n.x);
    const ys = nodes.map(n => isLR ? n.x : n.y);
    const x0 = Math.min(...xs) - nw / 2 - 50;
    const y0 = Math.min(...ys) - nh / 2 - 50;
    const x1 = Math.max(...xs) + nw / 2 + 50;
    const y1 = Math.max(...ys) + nh / 2 + 50;
    const tw = x1 - x0;
    const th = y1 - y0;

    const w = containerWidth  || 800;
    const h = containerHeight || 600;
    const scale = Math.min(0.92, Math.min(w / tw, h / th));
    let tx, ty;
    if (cfg.initialAlignment === 'top-left' && isLR) {
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

  function handleNodeClick(event, d) {
    event.stopPropagation();
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
      // Un-drilled node: check if any sibling has already been expanded further
      // (i.e. has children). If so, the dimension used for those children is the
      // level lock — auto-drill by that dimension, no picker needed.
      // NOTE: s._drillDimension is the dimension that CREATED s, not what s was
      // drilled by. The "next level" dimension lives on s.children[0]._drillDimension.
      const drilledSibling = siblings.find(s => s.id !== node.id && s.children?.length > 0);
      const siblingDim = drilledSibling?.children?.[0]?._drillDimension ?? null;
      if (siblingDim) {
        const updated = drillDown(node, siblingDim, $encodingMap, $config.maxChildrenShown, $config.excludeNulls);
        treeRoot.update(root => {
          let r = updateNodeInTree(root, node.id, () => updated);
          return collapseExpandedSiblings(r, siblings, node.id);
        });
        statusMessage.set(`Drilled into: ${siblingDim}`);
      } else {
        pendingDrillNode.set(node);
      }
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

  function handleDrillSelect(dimName) {
    if (!$pendingDrillNode) return;
    const pendingNode = $pendingDrillNode;
    const updated = drillDown(pendingNode, dimName, $encodingMap, $config.maxChildrenShown, $config.excludeNulls);
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
    <div class="col-header-overlay" style={style}>
      <div class="col-header-title">▸ by {h.dim}</div>
    </div>
  {/each}

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
    pointer-events: none;
    z-index: 5;
  }

  .col-header-title {
    font-size: 12px;
    font-weight: 600;
    color: #334155;
    background: rgba(255, 255, 255, 0.92);
    padding: 3px 9px;
    border-radius: 5px;
    white-space: nowrap;
    border: 1px solid #e2e8f0;
    backdrop-filter: blur(4px);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.07);
  }


</style>
