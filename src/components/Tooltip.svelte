<script>
  export let x = 0;
  export let y = 0;
  export let data = null;

  import { tooltipFieldNames } from '../stores/encodings.js';
  import { config } from '../stores/config.js';
  import { formatValue } from '../lib/formatters.js';

  $: adjustedX = x + 248 > (window?.innerWidth ?? 9999) ? x - 260 : x;
  $: adjustedY = y + 200 > (window?.innerHeight ?? 9999) ? y - 212 : y;

  // Substitute <FieldName> placeholders in the user-authored narrative template
  // with actual values from the hovered node. Returns null if no template is set.
  function renderNarrative(template, node) {
    if (!template || !node) return null;
    const vals = {};
    // Dimension path values: { field → value }
    for (const { field, value } of node.dimensionPath || []) {
      vals[field] = value;
    }
    // Tooltip shelf field values
    for (const [k, v] of Object.entries(node._tooltipData || {})) {
      vals[k] = typeof v === 'number' ? formatValue(v, $config) : String(v);
    }
    return template.replace(/<([^>]+)>/g, (match, ref) => vals[ref] ?? match);
  }

  $: narrative = renderNarrative($config.tooltipNarrative, data);
</script>

{#if data}
  <div
    class="tooltip-card"
    style="left: {adjustedX}px; top: {adjustedY}px"
    role="tooltip"
  >
    <div class="tooltip-header">
      <span class="tooltip-label">{data.label}</span>
      {#if data.depth === 0}
        <span class="tooltip-badge root">Root</span>
      {/if}
    </div>

    <div class="tooltip-divider"></div>

    <div class="tooltip-row">
      <span class="tooltip-key">Value</span>
      <span class="tooltip-val">{formatValue(data.value, $config)}</span>
    </div>

    {#if data.depth > 0}
      <div class="tooltip-row">
        <span class="tooltip-key">% of Parent</span>
        <span class="tooltip-val">{data.percentOfParent?.toFixed(1)}%</span>
      </div>
    {/if}

    <div class="tooltip-row">
      <span class="tooltip-key">Records</span>
      <span class="tooltip-val">{data.count?.toLocaleString()}</span>
    </div>

    {#each $tooltipFieldNames as fieldName}
      {#if data._tooltipData?.[fieldName] !== undefined}
        <div class="tooltip-row">
          <span class="tooltip-key">{fieldName}</span>
          <span class="tooltip-val">
            {typeof data._tooltipData[fieldName] === 'number'
              ? formatValue(data._tooltipData[fieldName], $config)
              : data._tooltipData[fieldName]}
          </span>
        </div>
      {/if}
    {/each}

    {#if narrative}
      <div class="tooltip-divider"></div>
      <div class="tooltip-narrative">{narrative}</div>
    {/if}

    <div class="tooltip-hint">
      {#if data.children && !data._collapsed}
        Click to collapse
      {:else if data._collapsed}
        Click to expand
      {:else}
        Click to drill down
      {/if}
    </div>
  </div>
{/if}

<style>
  .tooltip-card {
    position: fixed;
    background: var(--color-surface);
    border-radius: var(--radius-lg);
    padding: var(--space-3) var(--space-4);
    box-shadow: var(--shadow-xl);
    border: 1px solid var(--color-border-subtle);
    min-width: 220px;
    max-width: 300px;
    pointer-events: none;
    z-index: var(--z-tooltip);
    font-size: var(--text-base);
    animation: tooltip-in 0.1s ease;
  }

  @keyframes tooltip-in {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }

  .tooltip-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    margin-bottom: var(--space-2);
  }

  .tooltip-label {
    font-weight: var(--font-semibold);
    font-size: var(--text-md);
    color: var(--color-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .tooltip-badge {
    font-size: var(--text-xs);
    font-weight: var(--font-medium);
    padding: 2px 6px;
    border-radius: var(--radius-full);
    background: var(--color-accent-subtle);
    color: var(--color-accent);
    flex-shrink: 0;
  }

  .tooltip-divider {
    height: 1px;
    background: var(--color-border-subtle);
    margin-bottom: var(--space-2);
  }

  .tooltip-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-4);
    padding: 2px 0;
  }

  .tooltip-key {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    white-space: nowrap;
  }

  .tooltip-val {
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    color: var(--color-text-primary);
    text-align: right;
  }

  .tooltip-narrative {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    line-height: 1.5;
    white-space: pre-wrap;
    padding: var(--space-1) 0;
  }

  .tooltip-hint {
    margin-top: var(--space-2);
    padding-top: var(--space-2);
    border-top: 1px solid var(--color-border-subtle);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    font-style: italic;
  }
</style>
