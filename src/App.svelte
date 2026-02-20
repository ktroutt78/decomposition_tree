<script>
  import { onMount } from 'svelte';
  import { initTableau } from './lib/tableau.js';
  import { isReadyToRender } from './stores/encodings.js';
  import { treeRoot, statusMessage, configPanelOpen, summaryRows } from './stores/treeState.js';
  import { encodingMap } from './stores/encodings.js';
  import { buildRootNode, reapplyExpansion } from './lib/treeEngine.js';
  import { detectValueFormat } from './lib/formatters.js';
  import { config } from './stores/config.js';
  import { get } from 'svelte/store';

  import Header from './components/Header.svelte';
  import DecompTree from './components/DecompTree.svelte';
  import ConfigPanel from './components/ConfigPanel.svelte';
  import EmptyState from './components/EmptyState.svelte';

  let _prevValueName = null;

  function onDataReady(encMap, rows, { forceReset = true } = {}) {
    const newValueName = encMap.value?.[0]?.name ?? null;
    const measureChanged = newValueName !== _prevValueName;

    // Auto-detect Tableau's native value format
    if (get(config).valueFormat === 'auto') {
      const detected = detectValueFormat(rows, encMap.value?.[0]);
      config.update(c => ({ ...c, tableauDetectedFormat: detected ?? null }));
    }

    // Always auto-strip aggregation prefix (e.g. "SUM(Sales)" → "Sales") when the
    // measure loads or changes. A saved alias may be stale (from a different measure),
    // so we always reset it to match the current field.
    if (measureChanged && newValueName) {
      const stripped = newValueName.replace(/^[A-Z_]+\((.+)\)$/, '$1');
      config.update(c => ({ ...c, measureAlias: stripped !== newValueName ? stripped : '' }));
    }

    _prevValueName = newValueName;

    const freshRoot = buildRootNode(rows, encMap);

    if (!forceReset) {
      // Preserve expansion: replay drill operations on the fresh data
      const existingRoot = get(treeRoot);
      if (existingRoot && freshRoot) {
        treeRoot.set(reapplyExpansion(existingRoot, freshRoot, encMap, get(config).maxChildrenShown, get(config).excludeNulls));
      } else {
        treeRoot.set(freshRoot);
      }
    } else {
      treeRoot.set(freshRoot);
    }

    const root = get(treeRoot);
    if (root) {
      const dims = (encMap.breakdown || []).length;
      const valName = newValueName ?? '(none)';
      statusMessage.set(`Ready — ${valName} | ${dims} breakdown dimension${dims !== 1 ? 's' : ''}`);
    } else {
      statusMessage.set('Drop a measure onto the Measure shelf to begin');
    }
  }

  onMount(() => {
    initTableau(onDataReady);

    // When maxChildrenShown changes (user saves Settings), re-drill the existing
    // tree so "(Other)" grouping updates immediately without requiring a collapse/expand.
    let _prevMax = null;
    const unsubConfig = config.subscribe(cfg => {
      if (_prevMax !== null && cfg.maxChildrenShown !== _prevMax) {
        const root = get(treeRoot);
        const encMap = get(encodingMap);
        if (root && root._rows) {
          const freshRoot = buildRootNode(root._rows, encMap);
          treeRoot.set(reapplyExpansion(root, freshRoot, encMap, cfg.maxChildrenShown, cfg.excludeNulls));
        }
      }
      _prevMax = cfg.maxChildrenShown;
    });

    return () => unsubConfig();
  });
</script>

<div class="app-shell">
  <Header />

  <main class="viz-area">
    {#if $isReadyToRender && $treeRoot}
      <DecompTree />
    {:else}
      <EmptyState />
    {/if}
  </main>

  {#if $configPanelOpen}
    <ConfigPanel />
  {/if}
</div>

<style>
  .app-shell {
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--color-bg);
  }

  .viz-area {
    flex: 1;
    position: relative;
    overflow: hidden;
    min-height: 0;
  }
</style>
