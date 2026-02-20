<script>
  import { config, defaultConfig, saveConfig } from '../stores/config.js';
  import { configPanelOpen } from '../stores/treeState.js';

  // Work on a local draft — only commit on "Apply"
  let draft = { ...$config };

  const colorThemes = [
    { id: 'blue',   label: 'Ocean',    start: '#5b8dee', end: '#1e3fa8' },
    { id: 'green',  label: 'Forest',   start: '#34c98e', end: '#0b7a4e' },
    { id: 'purple', label: 'Amethyst', start: '#9b6dff', end: '#4a1aa8' },
    { id: 'orange', label: 'Sunset',   start: '#ff8c4b', end: '#c44e00' },
    { id: 'teal',   label: 'Teal',     start: '#2eccc4', end: '#0d7a75' },
    { id: 'custom', label: 'Custom',   start: null,       end: null }
  ];

  async function apply() {
    await saveConfig(draft);
    configPanelOpen.set(false);
  }

  function cancel() {
    configPanelOpen.set(false);
  }

  function resetToDefaults() {
    draft = { ...defaultConfig };
  }

  function handleKey(e) {
    if (e.key === 'Escape') cancel();
  }
</script>

<svelte:window on:keydown={handleKey} />

<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
<div class="drawer-backdrop" on:click={cancel}></div>

<div class="config-drawer" role="dialog" aria-modal="true" aria-label="Visualization Settings">
  <!-- Header -->
  <div class="drawer-header">
    <div class="drawer-header-left">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" class="settings-icon">
        <circle cx="8" cy="8" r="2.5" stroke="currentColor" stroke-width="1.5"/>
        <path d="M8 1v1.5M8 13.5V15M15 8h-1.5M2.5 8H1M12.36 3.64l-1.06 1.06M4.7 11.3l-1.06 1.06M12.36 12.36l-1.06-1.06M4.7 4.7L3.64 3.64"
          stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      <h2>Settings</h2>
    </div>
    <button class="drawer-close" on:click={cancel} aria-label="Close settings">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
    </button>
  </div>

  <!-- Scrollable body -->
  <div class="drawer-body">

    <!-- ── Color Theme ──────────────────────────────────── -->
    <section class="config-section">
      <h3 class="section-title">Color Theme</h3>
      <div class="theme-grid">
        {#each colorThemes as theme}
          <button
            class="theme-swatch"
            class:active={draft.colorTheme === theme.id}
            title={theme.label}
            on:click={() => draft.colorTheme = theme.id}
            style={theme.id !== 'custom'
              ? `background: linear-gradient(135deg, ${theme.start}, ${theme.end})`
              : `background: conic-gradient(#f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)`}
          >
            {#if draft.colorTheme === theme.id}
              <svg width="12" height="12" viewBox="0 0 12 12">
                <path d="M2 6l3 3 5-5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
              </svg>
            {/if}
            <span class="swatch-label">{theme.label}</span>
          </button>
        {/each}
      </div>

      {#if draft.colorTheme === 'custom'}
        <div class="custom-colors">
          <label class="color-picker-label">
            <span>Start color</span>
            <div class="color-pick-row">
              <input type="color" bind:value={draft.customColorStart} class="color-input" />
              <span class="color-hex">{draft.customColorStart}</span>
            </div>
          </label>
          <label class="color-picker-label">
            <span>End color</span>
            <div class="color-pick-row">
              <input type="color" bind:value={draft.customColorEnd} class="color-input" />
              <span class="color-hex">{draft.customColorEnd}</span>
            </div>
          </label>
        </div>
      {/if}

      <label class="toggle-row" style="margin-top: var(--space-3)">
        <span class="toggle-label">Apply gradient to bars</span>
        <button
          class="toggle-btn"
          class:on={draft.useGradient}
          on:click={() => draft.useGradient = !draft.useGradient}
          role="switch"
          aria-label="Apply gradient to bars"
          aria-checked={draft.useGradient}
        >
          <span class="toggle-thumb"></span>
        </button>
      </label>

      <label class="color-picker-label" style="margin-top: var(--space-3)">
        <span class="field-label" style="margin-bottom:0">Negative value color</span>
        <div class="color-pick-row">
          <input type="color" bind:value={draft.negativeColor} class="color-input" />
          <span class="color-hex">{draft.negativeColor}</span>
        </div>
      </label>
    </section>

    <!-- ── Layout ───────────────────────────────────────── -->
    <section class="config-section">
      <h3 class="section-title">Layout</h3>

      <div class="field-group">
        <span class="field-label">Orientation</span>
        <div class="seg-control" role="group" aria-label="Orientation">
          <button
            class="seg-btn"
            class:active={draft.orientation === 'LR'}
            on:click={() => draft.orientation = 'LR'}
          >
            <svg width="22" height="14" viewBox="0 0 22 14" fill="none">
              <rect x="1" y="4" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.7"/>
              <rect x="10" y="1" width="5" height="5" rx="1.5" fill="currentColor" opacity="0.7"/>
              <rect x="10" y="8" width="5" height="5" rx="1.5" fill="currentColor" opacity="0.7"/>
              <rect x="17.5" y="0" width="3.5" height="3.5" rx="1" fill="currentColor" opacity="0.5"/>
              <rect x="17.5" y="5" width="3.5" height="3.5" rx="1" fill="currentColor" opacity="0.5"/>
              <rect x="17.5" y="10" width="3.5" height="3.5" rx="1" fill="currentColor" opacity="0.5"/>
              <line x1="7" y1="7" x2="10" y2="3.5" stroke="currentColor" stroke-width="1" opacity="0.5"/>
              <line x1="7" y1="7" x2="10" y2="10.5" stroke="currentColor" stroke-width="1" opacity="0.5"/>
            </svg>
            Left → Right
          </button>
          <button
            class="seg-btn"
            class:active={draft.orientation === 'TB'}
            on:click={() => draft.orientation = 'TB'}
          >
            <svg width="14" height="18" viewBox="0 0 14 18" fill="none">
              <rect x="4" y="1" width="6" height="5" rx="1.5" fill="currentColor" opacity="0.7"/>
              <rect x="1" y="9" width="5" height="4" rx="1.5" fill="currentColor" opacity="0.7"/>
              <rect x="8" y="9" width="5" height="4" rx="1.5" fill="currentColor" opacity="0.7"/>
              <line x1="7" y1="6" x2="3.5" y2="9" stroke="currentColor" stroke-width="1" opacity="0.5"/>
              <line x1="7" y1="6" x2="10.5" y2="9" stroke="currentColor" stroke-width="1" opacity="0.5"/>
            </svg>
            Top → Bottom
          </button>
        </div>
      </div>

      {#if draft.orientation === 'LR'}
        <div class="field-group">
          <span class="field-label">Alignment</span>
          <div class="seg-control" role="group" aria-label="Alignment">
            {#each [['top-left','Top'],['center','Centered']] as [val, label]}
              <button
                class="seg-btn seg-btn-sm"
                class:active={draft.initialAlignment === val}
                on:click={() => draft.initialAlignment = val}
              >{label}</button>
            {/each}
          </div>
        </div>
      {/if}

      <div class="field-group">
        <span class="field-label">Link Style</span>
        <div class="seg-control" role="group" aria-label="Link Style">
          {#each [['curved','Curved'],['step','Step'],['straight','Straight']] as [val, label]}
            <button
              class="seg-btn seg-btn-sm"
              class:active={draft.linkStyle === val}
              on:click={() => draft.linkStyle = val}
            >{label}</button>
          {/each}
        </div>
      </div>

      <div class="field-group">
        <div class="range-header">
          <label class="field-label" for="levelSpacing">Level spacing</label>
          <span class="range-val">{draft.levelSpacing}px</span>
        </div>
        <input id="levelSpacing" type="range" min="160" max="480" step="20" bind:value={draft.levelSpacing} class="range-input"/>
      </div>

      <div class="field-group">
        <div class="range-header">
          <label class="field-label" for="maxChildren">Max children shown</label>
          <input
            type="number"
            min="1"
            max="100"
            bind:value={draft.maxChildrenShown}
            class="num-input-sm"
            aria-label="Max children shown"
          />
        </div>
        <input id="maxChildren" type="range" min="5" max="50" step="5" bind:value={draft.maxChildrenShown} class="range-input"/>
      </div>

      <div class="field-group">
        <div class="range-header">
          <label class="field-label" for="cornerRadius">Node corner radius</label>
          <input
            id="cornerRadius"
            type="number"
            min="0"
            max="24"
            bind:value={draft.cornerRadius}
            class="num-input-sm"
            aria-label="Node corner radius"
          />
        </div>
      </div>

      <div class="field-group">
        <div class="range-header">
          <label class="field-label" for="barRadius">Bar corner radius</label>
          <input
            id="barRadius"
            type="number"
            min="0"
            max="24"
            bind:value={draft.barRadius}
            class="num-input-sm"
            aria-label="Bar corner radius"
          />
        </div>
      </div>

      <div class="field-group">
        <div class="range-header">
          <label class="field-label" for="barHeight">Bar thickness</label>
          <span class="range-val">{draft.barHeight}px</span>
        </div>
        <input id="barHeight" type="range" min="8" max="48" step="2" bind:value={draft.barHeight} class="range-input"/>
      </div>

      <div class="field-group">
        <span class="field-label">Bar scale</span>
        <div class="seg-control" role="group" aria-label="Bar scale">
          {#each [['parent','Parent'],['top','Top Node'],['level','Level Max']] as [val, label]}
            <button
              class="seg-btn seg-btn-sm"
              class:active={draft.barScaleMode === val}
              on:click={() => draft.barScaleMode = val}
            >{label}</button>
          {/each}
        </div>
      </div>
    </section>

    <!-- ── Display ──────────────────────────────────────── -->
    <section class="config-section">
      <h3 class="section-title">Display</h3>

      <label class="color-picker-label" style="margin-bottom: var(--space-3)">
        <span class="field-label" style="margin-bottom:0">Background color</span>
        <div class="color-pick-row">
          <input type="color" bind:value={draft.bgColor} class="color-input" />
          <span class="color-hex">{draft.bgColor}</span>
        </div>
      </label>

      <label class="toggle-row">
        <span class="toggle-label">Show group count</span>
        <button
          class="toggle-btn"
          class:on={draft.showGroupCount}
          on:click={() => draft.showGroupCount = !draft.showGroupCount}
          role="switch"
          aria-label="Show group count"
          aria-checked={draft.showGroupCount}
        >
          <span class="toggle-thumb"></span>
        </button>
      </label>

      <label class="toggle-row">
        <span class="toggle-label">Exclude null values</span>
        <button
          class="toggle-btn"
          class:on={draft.excludeNulls}
          on:click={() => draft.excludeNulls = !draft.excludeNulls}
          role="switch"
          aria-label="Exclude null values"
          aria-checked={draft.excludeNulls}
        >
          <span class="toggle-thumb"></span>
        </button>
      </label>

      <div class="field-group" style="margin-top: var(--space-3)">
        <label class="field-label" for="valueFormat">Value format</label>
        <select id="valueFormat" bind:value={draft.valueFormat} class="select-input">
          <option value="auto">Auto (1.2K, 3.4M…)</option>
          <option value="number">Number (1,234)</option>
          <option value="currency">Currency ($1.2K)</option>
          <option value="percent">Percent (12.3%)</option>
        </select>
      </div>

      {#if draft.valueFormat === 'currency'}
        <div class="field-group">
          <label class="field-label" for="currencySymbol">Currency symbol</label>
          <input
            id="currencySymbol"
            type="text"
            maxlength="3"
            bind:value={draft.currencySymbol}
            class="text-input"
            style="width: 72px"
          />
        </div>
      {/if}

      <div class="field-group">
        <label class="field-label" for="measureAlias">Measure display name</label>
        <input
          id="measureAlias"
          type="text"
          placeholder="e.g. Profit (leave blank to use field name)"
          bind:value={draft.measureAlias}
          class="text-input"
        />
      </div>
    </section>

    <!-- ── Labels ───────────────────────────────────────── -->
    <section class="config-section">
      <h3 class="section-title">Labels</h3>

      <div class="field-group">
        <div class="range-header">
          <label class="field-label" for="fontSize">Heading font size</label>
          <input
            id="fontSize"
            type="number"
            min="10"
            max="22"
            bind:value={draft.fontSize}
            class="num-input-sm"
            aria-label="Heading font size"
          />
        </div>
      </div>

      <label class="color-picker-label" style="margin-bottom: var(--space-3)">
        <span class="field-label" style="margin-bottom:0">Heading color</span>
        <div class="color-pick-row">
          <input type="color" bind:value={draft.headingColor} class="color-input" />
          <span class="color-hex">{draft.headingColor}</span>
        </div>
      </label>

      <div class="field-group">
        <div class="range-header">
          <label class="field-label" for="subFontSize">Subheading font size</label>
          <input
            id="subFontSize"
            type="number"
            min="9"
            max="22"
            bind:value={draft.subFontSize}
            class="num-input-sm"
            aria-label="Subheading font size"
          />
        </div>
      </div>

      <label class="color-picker-label" style="margin-bottom: var(--space-3)">
        <span class="field-label" style="margin-bottom:0">Subheading color</span>
        <div class="color-pick-row">
          <input type="color" bind:value={draft.subheadingColor} class="color-input" />
          <span class="color-hex">{draft.subheadingColor}</span>
        </div>
      </label>

      <div class="field-group">
        <span class="field-label">Font family</span>
        <div class="seg-control" role="group" aria-label="Font family">
          {#each [['system','System'],['serif','Serif'],['mono','Mono']] as [val, label]}
            <button
              class="seg-btn seg-btn-sm"
              class:active={draft.fontFamily === val}
              on:click={() => draft.fontFamily = val}
            >{label}</button>
          {/each}
        </div>
      </div>

      <label class="toggle-row">
        <span class="toggle-label">Show measure name</span>
        <button
          class="toggle-btn"
          class:on={draft.showMeasureName}
          on:click={() => draft.showMeasureName = !draft.showMeasureName}
          role="switch"
          aria-label="Show measure name"
          aria-checked={draft.showMeasureName}
        >
          <span class="toggle-thumb"></span>
        </button>
      </label>

      <div class="field-group" style="margin-top: var(--space-3)">
        <span class="field-label">Show</span>
        <div class="seg-control" role="group" aria-label="Show">
          {#each [['both','Value & %'],['value','Value only'],['percent','% only']] as [val, label]}
            <button
              class="seg-btn seg-btn-sm"
              class:active={draft.labelMode === val}
              on:click={() => draft.labelMode = val}
            >{label}</button>
          {/each}
        </div>
      </div>
    </section>

    <!-- ── Column Headers ───────────────────────────────── -->
    <section class="config-section">
      <h3 class="section-title">Column Headers</h3>

      <div class="field-group">
        <div class="range-header">
          <label class="field-label" for="headerFontSize">Font size</label>
          <input
            id="headerFontSize"
            type="number"
            min="9"
            max="20"
            bind:value={draft.headerFontSize}
            class="num-input-sm"
            aria-label="Column header font size"
          />
        </div>
      </div>

      <label class="color-picker-label">
        <span class="field-label" style="margin-bottom:0">Color</span>
        <div class="color-pick-row">
          <input type="color" bind:value={draft.headerColor} class="color-input" />
          <span class="color-hex">{draft.headerColor}</span>
        </div>
      </label>
    </section>

    <!-- ── Tooltip ──────────────────────────────────────── -->
    <section class="config-section">
      <h3 class="section-title">Tooltip</h3>
      <div class="field-group">
        <label class="field-label" for="tooltipNarrative">Narrative template</label>
        <textarea
          id="tooltipNarrative"
          bind:value={draft.tooltipNarrative}
          class="text-input narrative-input"
          placeholder="e.g. <Region> drives key results.&#10;Profit: <SUM(Profit)>"
          rows="4"
        ></textarea>
        <p class="field-hint">
          Replaces the default tooltip rows when filled in. Built-in: &lt;value&gt;, &lt;pct&gt;, &lt;count&gt;. Also supports dimension names and tooltip shelf fields, e.g. &lt;Region&gt;, &lt;SUM(Profit)&gt;.
        </p>
      </div>
    </section>

    <!-- ── Animation ────────────────────────────────────── -->
    <section class="config-section">
      <h3 class="section-title">Animation</h3>
      <div class="field-group">
        <div class="range-header">
          <label class="field-label" for="animDur">Transition speed</label>
          <span class="range-val">{draft.animationDuration}ms</span>
        </div>
        <input id="animDur" type="range" min="0" max="800" step="50" bind:value={draft.animationDuration} class="range-input"/>
      </div>
    </section>


  </div>

  <!-- Footer -->
  <div class="drawer-footer">
    <button class="btn-ghost-sm" on:click={resetToDefaults}>Reset defaults</button>
    <div class="footer-actions">
      <button class="btn-secondary-sm" on:click={cancel}>Cancel</button>
      <button class="btn-primary-sm" on:click={apply}>Apply & Save</button>
    </div>
  </div>
</div>

<style>
  .drawer-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(10, 12, 20, 0.3);
    backdrop-filter: blur(2px);
    z-index: calc(var(--z-drawer) - 1);
    animation: fade-in 0.2s ease;
  }

  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .config-drawer {
    position: fixed;
    top: 0;
    right: 0;
    width: 340px;
    height: 100vh;
    background: var(--color-surface);
    border-left: 1px solid var(--color-border);
    box-shadow: -8px 0 40px rgba(0, 0, 0, 0.12);
    z-index: var(--z-drawer);
    display: flex;
    flex-direction: column;
    animation: slide-in 0.22s cubic-bezier(0.22, 1, 0.36, 1);
  }

  @keyframes slide-in {
    from { transform: translateX(100%); opacity: 0; }
    to   { transform: translateX(0);    opacity: 1; }
  }

  /* Header */
  .drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4) var(--space-5);
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .drawer-header-left {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .settings-icon {
    color: var(--color-accent);
  }

  .drawer-header h2 {
    font-size: var(--text-lg);
    font-weight: var(--font-semibold);
    color: var(--color-text-primary);
  }

  .drawer-close {
    width: 28px;
    height: 28px;
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-text-muted);
    transition: all var(--transition-fast);
  }

  .drawer-close:hover {
    background: var(--color-bg);
    color: var(--color-text-primary);
  }

  /* Body */
  .drawer-body {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-4) var(--space-5);
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .drawer-body::-webkit-scrollbar { width: 5px; }
  .drawer-body::-webkit-scrollbar-track { background: transparent; }
  .drawer-body::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 10px; }

  .config-section {
    padding: var(--space-3) 0 var(--space-4);
    border-bottom: 1px solid var(--color-border-subtle);
  }

  .config-section:last-child {
    border-bottom: none;
  }

  .section-title {
    font-size: var(--text-sm);
    font-weight: var(--font-semibold);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.07em;
    margin-bottom: var(--space-3);
  }

  /* Theme swatches */
  .theme-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-2);
    margin-bottom: var(--space-2);
  }

  .theme-swatch {
    height: 52px;
    border-radius: var(--radius-md);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    border: 2px solid transparent;
    cursor: pointer;
    transition: all var(--transition-fast);
    position: relative;
    overflow: hidden;
  }

  .theme-swatch:hover {
    transform: scale(1.04);
    box-shadow: var(--shadow-md);
  }

  .theme-swatch.active {
    border-color: white;
    box-shadow: 0 0 0 2px var(--color-accent), var(--shadow-md);
  }

  .swatch-label {
    font-size: var(--text-xs);
    font-weight: var(--font-medium);
    color: rgba(255,255,255,0.9);
    text-shadow: 0 1px 2px rgba(0,0,0,0.3);
  }

  .custom-colors {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-3);
    background: var(--color-bg);
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border);
    margin-top: var(--space-2);
  }

  .color-picker-label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
  }

  .color-pick-row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .color-input {
    width: 36px;
    height: 28px;
    padding: 2px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    cursor: pointer;
    background: none;
  }

  .color-hex {
    font-size: var(--text-xs);
    font-family: var(--font-mono);
    color: var(--color-text-muted);
  }

  /* Segmented control */
  .field-group {
    margin-bottom: var(--space-3);
  }

  .field-label {
    display: block;
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    color: var(--color-text-secondary);
    margin-bottom: var(--space-2);
  }

  .seg-control {
    display: flex;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: 3px;
    gap: 2px;
  }

  .seg-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-1);
    padding: 6px var(--space-2);
    border-radius: var(--radius-sm);
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    color: var(--color-text-secondary);
    background: transparent;
    transition: all var(--transition-fast);
    white-space: nowrap;
  }

  .seg-btn.active {
    background: var(--color-surface);
    color: var(--color-text-primary);
    box-shadow: var(--shadow-sm);
  }

  .seg-btn-sm {
    padding: 5px var(--space-2);
    font-size: var(--text-xs);
  }

  /* Range inputs */
  .range-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-2);
  }

  .range-val {
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    color: var(--color-accent);
    font-family: var(--font-mono);
  }

  .range-input {
    width: 100%;
    height: 4px;
    accent-color: var(--color-accent);
    cursor: pointer;
  }

  /* Toggle switch */
  .toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-2) 0;
    cursor: pointer;
  }

  .toggle-label {
    font-size: var(--text-base);
    color: var(--color-text-primary);
  }

  .toggle-btn {
    width: 40px;
    height: 22px;
    border-radius: var(--radius-full);
    background: var(--color-border);
    padding: 2px;
    display: flex;
    align-items: center;
    transition: background var(--transition-base);
    flex-shrink: 0;
  }

  .toggle-btn.on {
    background: var(--color-accent);
  }

  .toggle-thumb {
    width: 18px;
    height: 18px;
    background: white;
    border-radius: var(--radius-full);
    box-shadow: var(--shadow-sm);
    transition: transform var(--transition-base);
    pointer-events: none;
  }

  .toggle-btn.on .toggle-thumb {
    transform: translateX(18px);
  }

  /* Select + text inputs */
  .num-input-sm {
    width: 56px;
    padding: 3px 6px;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    color: var(--color-accent);
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    font-family: var(--font-mono);
    text-align: center;
    outline: none;
  }

  .num-input-sm:focus {
    border-color: var(--color-accent);
  }

  .narrative-input {
    resize: vertical;
    min-height: 80px;
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    line-height: 1.5;
  }

  .field-hint {
    margin-top: var(--space-1);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    line-height: 1.4;
  }

  .select-input,
  .text-input {
    width: 100%;
    padding: 7px var(--space-3);
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    color: var(--color-text-primary);
    font-size: var(--text-base);
    outline: none;
    transition: border-color var(--transition-fast);
  }

  .select-input:focus,
  .text-input:focus {
    border-color: var(--color-accent);
    background: white;
  }

  /* Footer */
  .drawer-footer {
    padding: var(--space-4) var(--space-5);
    border-top: 1px solid var(--color-border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
    background: var(--color-surface);
  }

  .footer-actions {
    display: flex;
    gap: var(--space-2);
  }

  .btn-ghost-sm {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    padding: 6px var(--space-2);
    border-radius: var(--radius-md);
    transition: all var(--transition-fast);
  }

  .btn-ghost-sm:hover {
    color: var(--color-text-secondary);
    background: var(--color-bg);
  }

  .btn-secondary-sm {
    padding: 8px var(--space-4);
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    color: var(--color-text-secondary);
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    transition: all var(--transition-fast);
  }

  .btn-secondary-sm:hover {
    background: var(--color-border-subtle);
    border-color: #c0c4cc;
  }

  .btn-primary-sm {
    padding: 8px var(--space-4);
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    color: white;
    background: var(--color-accent);
    border-radius: var(--radius-md);
    transition: all var(--transition-fast);
  }

  .btn-primary-sm:hover {
    background: var(--color-accent-hover);
    box-shadow: 0 2px 8px rgba(74, 108, 247, 0.35);
  }
</style>
