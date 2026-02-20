<script>
  import { isReadyToRender } from '../stores/encodings.js';
  import { statusMessage } from '../stores/treeState.js';
</script>

<div class="empty-state">
  <div class="empty-illustration">
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
      <!-- Root node -->
      <rect x="4" y="30" width="22" height="20" rx="5" fill="#e8ebf5" stroke="#c5cbdc" stroke-width="1.5"/>
      <!-- Middle nodes -->
      <rect x="36" y="14" width="20" height="18" rx="4" fill="#e8ebf5" stroke="#c5cbdc" stroke-width="1.5" stroke-dasharray="3 2"/>
      <rect x="36" y="48" width="20" height="18" rx="4" fill="#e8ebf5" stroke="#c5cbdc" stroke-width="1.5" stroke-dasharray="3 2"/>
      <!-- Leaf nodes -->
      <rect x="62" y="8" width="16" height="12" rx="3" fill="#e8ebf5" stroke="#c5cbdc" stroke-width="1" stroke-dasharray="3 2"/>
      <rect x="62" y="25" width="16" height="12" rx="3" fill="#e8ebf5" stroke="#c5cbdc" stroke-width="1" stroke-dasharray="3 2"/>
      <rect x="62" y="44" width="16" height="12" rx="3" fill="#e8ebf5" stroke="#c5cbdc" stroke-width="1" stroke-dasharray="3 2"/>
      <rect x="62" y="61" width="16" height="12" rx="3" fill="#e8ebf5" stroke="#c5cbdc" stroke-width="1" stroke-dasharray="3 2"/>
      <!-- Links -->
      <path d="M26 40 Q31 40 36 23" stroke="#c5cbdc" stroke-width="1.5" fill="none"/>
      <path d="M26 40 Q31 40 36 57" stroke="#c5cbdc" stroke-width="1.5" fill="none"/>
      <path d="M56 23 Q59 23 62 14" stroke="#c5cbdc" stroke-width="1" fill="none"/>
      <path d="M56 23 Q59 23 62 31" stroke="#c5cbdc" stroke-width="1" fill="none"/>
      <path d="M56 57 Q59 57 62 50" stroke="#c5cbdc" stroke-width="1" fill="none"/>
      <path d="M56 57 Q59 57 62 67" stroke="#c5cbdc" stroke-width="1" fill="none"/>
      <!-- Plus icon overlay -->
      <circle cx="40" cy="40" r="11" fill="white" stroke="#c5cbdc" stroke-width="1.5"/>
      <path d="M40 35v10M35 40h10" stroke="#9ca3af" stroke-width="2" stroke-linecap="round"/>
    </svg>
  </div>

  <div class="empty-content">
    <h2>Set up your Decomposition Tree</h2>
    <p>Use the Marks card shelves to configure the visualization.</p>
  </div>

  <div class="steps">
    <div class="step">
      <div class="step-num">1</div>
      <div class="step-body">
        <strong>Value shelf</strong>
        <span>Drop a measure (e.g. Sales, Revenue)</span>
      </div>
    </div>
    <div class="step">
      <div class="step-num">2</div>
      <div class="step-body">
        <strong>Breakdown shelf</strong>
        <span>Drop one or more dimensions to drill into</span>
      </div>
    </div>
    <div class="step">
      <div class="step-num">3</div>
      <div class="step-body">
        <strong>Tooltip shelf</strong>
        <span>Optionally add extra fields for node tooltips</span>
      </div>
    </div>
  </div>
</div>

<style>
  .empty-state {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-6);
    padding: var(--space-8);
    text-align: center;
  }

  .empty-illustration {
    opacity: 0.85;
  }

  .empty-content h2 {
    font-size: var(--text-xl);
    font-weight: var(--font-semibold);
    color: var(--color-text-primary);
    margin-bottom: var(--space-2);
  }

  .empty-content p {
    font-size: var(--text-md);
    color: var(--color-text-secondary);
  }

  .steps {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    width: 100%;
    max-width: 360px;
  }

  .step {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-3) var(--space-4);
    text-align: left;
    box-shadow: var(--shadow-sm);
  }

  .step-num {
    width: 22px;
    height: 22px;
    border-radius: var(--radius-full);
    background: var(--color-accent);
    color: white;
    font-size: var(--text-xs);
    font-weight: var(--font-bold);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 1px;
  }

  .step-body {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .step-body strong {
    font-size: var(--text-base);
    font-weight: var(--font-semibold);
    color: var(--color-text-primary);
  }

  .step-body span {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
  }
</style>
