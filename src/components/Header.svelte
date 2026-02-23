<script>
  import { treeRoot, statusMessage, configPanelOpen } from '../stores/treeState.js';
  import { reloadData } from '../lib/tableau.js';
  import { getDeepestExpandedNode } from '../lib/treeEngine.js';

  async function reload() {
    await reloadData();
  }

  $: breadcrumb = (() => {
    const root = $treeRoot;
    if (!root?.children?.length) return null;
    const deepest = getDeepestExpandedNode(root);
    const segments = (deepest.dimensionPath || []).map(
      ({ field, value }) => `by ${field}: ${value}`
    );
    const lastDim = deepest.children?.[0]?._drillDimension;
    if (lastDim) segments.push(`by ${lastDim}`);
    return segments.length ? segments.join(' > ') : null;
  })();
</script>

<header class="app-header">
  <div class="header-left">
    <div class="logo-mark">
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="3" cy="9" r="2.5" fill="currentColor" opacity="0.9"/>
        <circle cx="9" cy="4" r="2.5" fill="currentColor" opacity="0.75"/>
        <circle cx="9" cy="14" r="2.5" fill="currentColor" opacity="0.75"/>
        <circle cx="15" cy="2" r="1.8" fill="currentColor" opacity="0.6"/>
        <circle cx="15" cy="9" r="1.8" fill="currentColor" opacity="0.6"/>
        <circle cx="15" cy="16" r="1.8" fill="currentColor" opacity="0.6"/>
        <line x1="5.4" y1="7.6" x2="7" y2="5.4" stroke="currentColor" stroke-width="1.2" stroke-opacity="0.5"/>
        <line x1="5.4" y1="10.4" x2="7" y2="12.6" stroke="currentColor" stroke-width="1.2" stroke-opacity="0.5"/>
        <line x1="11.4" y1="4.2" x2="13.3" y2="2.9" stroke="currentColor" stroke-width="1.2" stroke-opacity="0.4"/>
        <line x1="11.4" y1="9" x2="13.3" y2="9" stroke="currentColor" stroke-width="1.2" stroke-opacity="0.4"/>
        <line x1="11.4" y1="13.8" x2="13.3" y2="15.1" stroke="currentColor" stroke-width="1.2" stroke-opacity="0.4"/>
      </svg>
    </div>
    <span class="app-title">Decomposition Tree</span>
    <span class="header-divider">|</span>
    <span class="status-text" title={breadcrumb || $statusMessage}>{breadcrumb ?? $statusMessage}</span>
  </div>

  <div class="header-right">
    {#if $treeRoot}
      <button class="btn-ghost" on:click={reload} title="Reload data from Tableau">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 7C2 4.24 4.24 2 7 2c1.66 0 3.13.82 4.04 2.07" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <path d="M12 7c0 2.76-2.24 5-5 5a4.99 4.99 0 01-4.04-2.07" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <path d="M10.5 1.5l1 2.5-2.5.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Reload
      </button>
    {/if}

    <button
      class="btn-icon-round"
      on:click={() => configPanelOpen.set(true)}
      title="Settings"
      aria-label="Open settings"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="2.5" stroke="currentColor" stroke-width="1.5"/>
        <path d="M8 1v1.5M8 13.5V15M15 8h-1.5M2.5 8H1M12.36 3.64l-1.06 1.06M4.7 11.3l-1.06 1.06M12.36 12.36l-1.06-1.06M4.7 4.7L3.64 3.64"
          stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    </button>
  </div>
</header>

<style>
  .app-header {
    height: 46px;
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 var(--space-4);
    flex-shrink: 0;
    z-index: var(--z-header);
    box-shadow: var(--shadow-sm);
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
  }

  .logo-mark {
    color: var(--color-accent);
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }

  .app-title {
    font-size: var(--text-md);
    font-weight: var(--font-semibold);
    color: var(--color-text-primary);
    white-space: nowrap;
  }

  .header-divider {
    color: var(--color-border);
    font-weight: var(--font-normal);
    flex-shrink: 0;
  }

  .status-text {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex-shrink: 0;
  }

  .btn-ghost {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    padding: 5px var(--space-3);
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    color: var(--color-text-secondary);
    background: transparent;
    border: 1px solid var(--color-border);
    transition: all var(--transition-fast);
  }

  .btn-ghost:hover {
    background: var(--color-bg);
    color: var(--color-text-primary);
    border-color: #c0c4cc;
  }

  .btn-icon-round {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-text-secondary);
    background: transparent;
    border: 1px solid var(--color-border);
    transition: all var(--transition-fast);
  }

  .btn-icon-round:hover {
    background: var(--color-bg);
    color: var(--color-accent);
    border-color: var(--color-accent);
  }
</style>
