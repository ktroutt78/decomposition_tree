<script>
  export let node = null;
  export let onSelect = () => {};
  export let onClose = () => {};

  import { breakdownFieldNames } from '../stores/encodings.js';

  // Build the set of dimension names already used in the path to this node
  $: usedDims = new Set((node?.dimensionPath || []).map(p => p.field));
  $: filtered = $breakdownFieldNames.filter(name => !usedDims.has(name));

  function handleKey(e) {
    if (e.key === 'Escape') onClose();
    if (e.key === 'Enter' && filtered.length === 1) onSelect(filtered[0]);
  }
</script>

<svelte:window on:keydown={handleKey} />

<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
<div class="modal-backdrop" on:click={onClose}></div>

<div class="picker-modal" role="dialog" aria-modal="true" aria-label="Choose dimension to drill into">
  <div class="picker-header">
    <div class="picker-title-group">
      <h3 class="picker-title">Drill Into</h3>
      {#if node}
        <span class="picker-context">{node.label}</span>
      {/if}
    </div>
    <button class="close-btn" on:click={onClose} aria-label="Close">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
    </button>
  </div>

  <ul class="dim-list" role="listbox">
    {#each filtered as name}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <li class="dim-item" role="option" aria-selected="false" on:click={() => onSelect(name)}>
        <svg class="dim-icon" width="12" height="12" viewBox="0 0 12 12" fill="none">
          <rect x="1" y="1" width="10" height="10" rx="2" stroke="currentColor" stroke-width="1.3"/>
          <path d="M3.5 6h5M6 3.5v5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
        </svg>
        <span>{name}</span>
      </li>
    {:else}
      <li class="dim-empty">No dimensions match</li>
    {/each}
  </ul>

  {#if $breakdownFieldNames.length === 0}
    <div class="dim-hint">
      Add dimensions to the <strong>Breakdown</strong> shelf in the Marks card.
    </div>
  {/if}
</div>

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(10, 12, 20, 0.35);
    backdrop-filter: blur(2px);
    z-index: calc(var(--z-modal) - 1);
    animation: fade-in 0.15s ease;
  }

  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .picker-modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 320px;
    max-height: 420px;
    background: var(--color-surface);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-xl);
    border: 1px solid var(--color-border);
    z-index: var(--z-modal);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: modal-in 0.15s ease;
  }

  @keyframes modal-in {
    from { opacity: 0; transform: translate(-50%, -52%) scale(0.96); }
    to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  }

  .picker-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: var(--space-4) var(--space-4) var(--space-3);
    border-bottom: 1px solid var(--color-border-subtle);
  }

  .picker-title-group {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .picker-title {
    font-size: var(--text-md);
    font-weight: var(--font-semibold);
    color: var(--color-text-primary);
  }

  .picker-context {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
  }

  .close-btn {
    width: 26px;
    height: 26px;
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-text-muted);
    flex-shrink: 0;
    transition: all var(--transition-fast);
  }

  .close-btn:hover {
    background: var(--color-bg);
    color: var(--color-text-primary);
  }

  .dim-list {
    list-style: none;
    overflow-y: auto;
    flex: 1;
    padding: var(--space-2) var(--space-2);
  }

  .dim-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: 9px var(--space-3);
    border-radius: var(--radius-md);
    font-size: var(--text-base);
    color: var(--color-text-primary);
    cursor: pointer;
    transition: background var(--transition-fast);
  }

  .dim-item:hover {
    background: var(--color-accent-subtle);
    color: var(--color-accent);
  }

  .dim-icon {
    color: var(--color-text-muted);
    flex-shrink: 0;
    transition: color var(--transition-fast);
  }

  .dim-item:hover .dim-icon {
    color: var(--color-accent);
  }

  .dim-empty {
    padding: var(--space-4) var(--space-3);
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    text-align: center;
    font-style: italic;
  }

  .dim-hint {
    padding: var(--space-3) var(--space-4);
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    background: var(--color-bg);
    border-top: 1px solid var(--color-border-subtle);
    text-align: center;
  }
</style>
