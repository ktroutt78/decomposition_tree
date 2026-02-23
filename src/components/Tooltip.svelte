<script>
  export let x = 0;
  export let y = 0;
  export let data = null;

  import { tooltipFieldNames, encodingMap } from '../stores/encodings.js';
  import { config } from '../stores/config.js';
  import { formatValue } from '../lib/formatters.js';

  $: adjustedX = x + 248 > (window?.innerWidth ?? 9999) ? x - 260 : x;
  $: adjustedY = y + 200 > (window?.innerHeight ?? 9999) ? y - 212 : y;

  // Substitute <FieldName> placeholders with actual node values.
  // Built-in: <value>, <pct>, <count>. Plus any dimension path or tooltip shelf field.
  // When the template is non-empty it replaces the default structured rows entirely.
  function renderTemplate(template, node) {
    if (!template?.trim() || !node) return null;
    const vals = {};
    // Built-in placeholders
    vals['value']   = formatValue(node.value, $config);
    vals['pct']     = node.depth > 0 ? `${node.percentOfParent?.toFixed(1)}%` : '100%';
    vals['count']   = node.count?.toLocaleString() ?? '';
    vals['measure'] = $config.measureAlias?.trim() || $encodingMap.value?.[0]?.name || 'Value';
    // Dimension path values
    for (const { field, value } of node.dimensionPath || []) {
      vals[field] = value;
    }
    // Tooltip shelf field values
    for (const [k, v] of Object.entries(node._tooltipData || {})) {
      vals[k] = typeof v === 'number' ? formatValue(v, $config) : String(v);
    }
    return template.replace(/<([^>]+)>/g, (match, ref) => vals[ref] ?? match);
  }

  $: customBody = renderTemplate($config.tooltipNarrative, data);
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

    {#if customBody}
      <div class="tooltip-body">{customBody}</div>
    {:else}
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
    {/if}

    <div class="tooltip-hint">
      {#if data.children && !data._collapsed}
        Click − to collapse
      {:else if data._collapsed}
        Click + to expand
      {:else}
        Click + to drill into an attribute
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
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-2);
    margin-bottom: var(--space-2);
  }

  .tooltip-label {
    font-weight: var(--font-semibold);
    font-size: var(--text-md);
    color: var(--color-text-primary);
    word-break: break-word;
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

  .tooltip-body {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    line-height: 1.6;
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
