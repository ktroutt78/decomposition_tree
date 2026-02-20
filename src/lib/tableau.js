/**
 * Tableau Extensions API wrapper for viz extensions.
 * All Tableau API calls are contained here — no other file touches `tableau.*`.
 */

import { encodingMap } from '../stores/encodings.js';
import { summaryRows, statusMessage, treeRoot } from '../stores/treeState.js';
import { loadConfig } from '../stores/config.js';

let worksheet = null;
let _onDataReady = null;
let _isMockMode = false;


export async function initTableau(onDataReady) {
  _onDataReady = onDataReady;

  // The Tableau Extensions API script must be loaded via <script> in index.html.
  // If the tableau global or extensions API is unavailable, fall back to mock data
  // (this happens when opening the page directly in a browser outside Tableau Desktop).
  if (typeof tableau === 'undefined' || typeof tableau.extensions === 'undefined') {
    _isMockMode = true;
    console.warn('[DecompTree] Tableau API not found — using mock data');
    statusMessage.set('Dev mode: using mock data');
    const mockEncMap = getMockEncodingMap();
    const mockRows = getMockRows();
    encodingMap.set(mockEncMap);
    summaryRows.set(mockRows);
    if (onDataReady) onDataReady(mockEncMap, mockRows);
    return;
  }

  try {
    await tableau.extensions.initializeAsync();

    worksheet = tableau.extensions.worksheetContent.worksheet;
    console.log('[DecompTree] Connected to worksheet:', worksheet.name);
    statusMessage.set(`Connected: ${worksheet.name}`);
    loadConfig();

    worksheet.addEventListener(
      tableau.TableauEventType.SummaryDataChanged,
      () => {
        console.log('[DecompTree] SummaryDataChanged — refreshing');
        statusMessage.set('Data updated, refreshing...');
        // Don't wipe the tree — let onDataReady preserve expansion
        fetchAndNotify(false);
      }
    );

    // Render immediately on load — if encoding shelves have fields, show the tree.
    // If they are empty, buildRootNode returns null and the empty state is shown.
    await fetchAndNotify();

  } catch (err) {
    console.error('[DecompTree] Init error:', err);
    // initializeAsync can fail when the page is loaded outside Tableau Desktop.
    // Fall back to mock data so dev mode still works.
    _isMockMode = true;
    statusMessage.set('Dev mode: using mock data');
    const mockEncMap = getMockEncodingMap();
    const mockRows = getMockRows();
    encodingMap.set(mockEncMap);
    summaryRows.set(mockRows);
    if (_onDataReady) _onDataReady(mockEncMap, mockRows);
  }
}

/**
 * Re-fetch data from Tableau and rebuild the tree from scratch.
 * Called by the Reload button in the header.
 */
export async function reloadData() {
  if (_isMockMode) {
    const mockEncMap = getMockEncodingMap();
    const mockRows = getMockRows();
    encodingMap.set(mockEncMap);
    summaryRows.set(mockRows);
    treeRoot.set(null);
    if (_onDataReady) _onDataReady(mockEncMap, mockRows, { forceReset: true });
    return;
  }
  if (!worksheet) return;
  statusMessage.set('Reloading...');
  treeRoot.set(null);
  await fetchAndNotify(true);
}

async function fetchAndNotify(forceReset = true) {
  try {
    const [encMap, rows] = await Promise.all([
      fetchEncodingMap(),
      fetchSummaryData()
    ]);

    encodingMap.set(encMap);
    summaryRows.set(rows);

    if (_onDataReady) _onDataReady(encMap, rows, { forceReset });
  } catch (err) {
    statusMessage.set(`Data error: ${err.message}`);
    console.error('[DecompTree] Fetch error:', err);
  }
}

async function fetchEncodingMap() {
  try {
    const visualSpec = await worksheet.getVisualSpecificationAsync();
    const marksSpec = visualSpec.marksSpecifications[visualSpec.activeMarksSpecificationIndex];
    const map = {};
    for (const enc of (marksSpec.encodings || [])) {
      if (!map[enc.id]) map[enc.id] = [];
      // Normalize to always have a consistent .name property for data lookups
      const f = enc.field;
      const name = f?.name || f?.fieldName || f?.caption || String(f ?? '');
      map[enc.id].push({ name, fieldName: f?.fieldName || name });
    }
    console.log('[DecompTree] Encoding map:', JSON.stringify(map));
    return map;
  } catch (e) {
    console.warn('[DecompTree] getVisualSpecificationAsync failed:', e);
    return {};
  }
}

async function fetchSummaryData() {
  try {
    // Preferred: paginated reader (API 1.9+)
    const reader = await worksheet.getSummaryDataReaderAsync(
      undefined,
      { ignoreSelection: true }
    );
    let rows = [];
    for (let page = 0; page < reader.pageCount; page++) {
      const tablePage = await reader.getPageAsync(page);
      if (page === 0) {
        console.log('[DecompTree] Data columns:', tablePage.columns.map(c => c.fieldName));
      }
      rows = rows.concat(namedRows(tablePage));
    }
    await reader.releaseAsync();
    console.log(`[DecompTree] Loaded ${rows.length} rows`);
    return rows;
  } catch (e) {
    // Fallback: single call (API 1.0+)
    console.warn('[DecompTree] getSummaryDataReaderAsync failed, trying getSummaryDataAsync:', e);
    const dataTable = await worksheet.getSummaryDataAsync({ ignoreSelection: true });
    return namedRows(dataTable);
  }
}

function namedRows(dataTableOrPage) {
  const columns = dataTableOrPage.columns;
  const data = dataTableOrPage.data;
  return data.map(row => {
    const obj = {};
    for (const col of columns) {
      obj[col.fieldName] = row[col.index];
    }
    return obj;
  });
}

// --- Mock data for development outside Tableau ---

function getMockEncodingMap() {
  return {
    value: [{ name: 'SUM(Sales)', fieldName: 'SUM(Sales)' }],
    breakdown: [
      { name: 'Region',       fieldName: 'Region' },
      { name: 'Category',     fieldName: 'Category' },
      { name: 'Sub-Category', fieldName: 'Sub-Category' },
      { name: 'Segment',      fieldName: 'Segment' }
    ],
    tooltip: [{ name: 'SUM(Profit)', fieldName: 'SUM(Profit)' }],
    color: []
  };
}

function getMockRows() {
  const regions    = ['West', 'East', 'Central', 'South'];
  const categories = ['Technology', 'Furniture', 'Office Supplies'];
  const subCats    = ['Phones', 'Chairs', 'Binders', 'Paper', 'Storage', 'Tables', 'Art'];
  const segments   = ['Consumer', 'Corporate', 'Home Office'];

  const rows = [];
  for (let i = 0; i < 400; i++) {
    const region   = regions[i % regions.length];
    const category = categories[i % categories.length];
    const subCat   = subCats[i % subCats.length];
    const segment  = segments[i % segments.length];
    const sales    = Math.round(500 + Math.random() * 9500);
    const profit   = Math.round(sales * (0.05 + Math.random() * 0.35));
    rows.push({
      'SUM(Sales)':  { value: sales,  formattedValue: `$${sales.toLocaleString()}` },
      'SUM(Profit)': { value: profit, formattedValue: `$${profit.toLocaleString()}` },
      Region:        { value: region,   formattedValue: region },
      Category:      { value: category, formattedValue: category },
      'Sub-Category':{ value: subCat,   formattedValue: subCat },
      Segment:       { value: segment,  formattedValue: segment }
    });
  }
  return rows;
}
