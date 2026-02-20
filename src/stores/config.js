import { writable } from 'svelte/store';

export const defaultConfig = {
  orientation: 'LR',
  nodeWidth: 200,
  nodeHeight: 86,
  levelSpacing: 280,
  siblingSpacing: 20,
  maxChildrenShown: 10,
  cornerRadius: 10,
  colorTheme: 'blue',
  customColorStart: '#4A90E2',
  customColorEnd: '#1a4e8a',
  linkStyle: 'curved',
  bgColor: '#ffffff',
  useGradient: true,
  negativeColor: '#f472b6',
  barRadius: 4,
  barHeight: 20,
  tableauDetectedFormat: null,
  measureAlias: '',
  showPercentage: true,
  showGroupCount: true,
  excludeNulls: false,
  valueFormat: 'auto',
  currencySymbol: '$',
  fontSize: 13,
  subFontSize: 11,
  fontFamily: 'system',
  headingColor: '#1e293b',
  subheadingColor: '#64748b',
  showMeasureName: true,
  labelMode: 'both',
  barScaleMode: 'parent',
  linkColorActive: '#5b8dee',
  linkColorInactive: '#cbd5e1',
  linkColorNegative: '#f472b6',
  linkOpacity: 0.9,
  headerFontSize: 12,
  headerColor: '#334155',
  animationDuration: 300,
  initialAlignment: 'top-left',
  tooltipNarrative: '<measure>: <value>\n% of Parent: <pct>\nRecords: <count>'
};

export const config = writable({ ...defaultConfig });

export async function saveConfig(newConfig) {
  config.set(newConfig);
  try {
    if (typeof tableau !== 'undefined') {
      tableau.extensions.settings.set('config_v2', JSON.stringify(newConfig));
      await tableau.extensions.settings.saveAsync();
    }
  } catch (e) {
    console.warn('[DecompTree] Could not save config:', e);
  }
}

export function loadConfig() {
  try {
    if (typeof tableau !== 'undefined') {
      const saved = tableau.extensions.settings.get('config_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        config.set({ ...defaultConfig, ...parsed });
      }
    }
  } catch (e) {
    console.warn('[DecompTree] Could not load config:', e);
  }
}
