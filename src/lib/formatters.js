/**
 * Detect Tableau's native value format by sampling formattedValue strings from
 * the first non-trivial row. Returns { type, symbol, decimals } or null.
 */
export function detectValueFormat(rows, valueField) {
  if (!valueField || !rows?.length) return null;

  for (const row of rows.slice(0, 30)) {
    const dv = row[valueField.name] ?? row[valueField.fieldName];
    if (!dv || typeof dv !== 'object') continue;
    const { value: rawVal, formattedValue: fmtStr } = dv;
    if (rawVal === null || rawVal === undefined || !fmtStr) continue;

    const s = String(fmtStr).trim();
    if (!s) continue;

    // Skip Tableau K/M/B abbreviated values — decimal count is unreliable
    if (/[\d][KMBTkmbt]$/.test(s.replace(/[^0-9KMBTkmbt]/g, ''))) continue;

    // Percentage
    if (s.endsWith('%')) {
      const match = s.match(/\.(\d+)%$/);
      return { type: 'percent', symbol: null, decimals: match ? match[1].length : 0 };
    }

    // Currency: one or more non-numeric chars before the first digit (or minus sign)
    const prefixMatch = s.match(/^([^0-9\-(]+)/);
    const prefix = prefixMatch?.[1]?.trim();
    if (prefix) {
      const decMatch = s.match(/\.(\d+)$/);
      return { type: 'currency', symbol: prefix, decimals: decMatch ? decMatch[1].length : 0 };
    }

    // Plain number
    const decMatch = s.match(/\.(\d+)$/);
    return { type: 'number', symbol: null, decimals: decMatch ? decMatch[1].length : 0 };
  }
  return null;
}

/**
 * Format a numeric value according to config settings.
 * When valueFormat is 'auto' and cfg.tableauDetectedFormat is set, uses
 * the format detected from Tableau's native formattedValue strings.
 */
export function formatValue(value, cfg) {
  if (value === null || value === undefined || isNaN(value)) return '—';

  const num = Number(value);

  // Use Tableau's detected format when the user hasn't chosen an explicit format
  if (cfg.valueFormat === 'auto' && cfg.tableauDetectedFormat) {
    const { type, symbol, decimals } = cfg.tableauDetectedFormat;
    const locOpts = { minimumFractionDigits: decimals, maximumFractionDigits: decimals };
    if (type === 'currency') {
      const sym = symbol || cfg.currencySymbol || '$';
      return `${sym}${num.toLocaleString(undefined, locOpts)}`;
    }
    if (type === 'percent') {
      // Raw value may be a fraction (0.123) or already a percent (12.3) — detect by magnitude
      const pctNum = Math.abs(num) <= 1 ? num * 100 : num;
      return `${pctNum.toFixed(decimals)}%`;
    }
    return num.toLocaleString(undefined, locOpts);
  }

  switch (cfg.valueFormat) {
    case 'currency': {
      const sym = cfg.currencySymbol || '$';
      if (Math.abs(num) >= 1e9) return `${sym}${(num / 1e9).toFixed(1)}B`;
      if (Math.abs(num) >= 1e6) return `${sym}${(num / 1e6).toFixed(1)}M`;
      if (Math.abs(num) >= 1e3) return `${sym}${(num / 1e3).toFixed(1)}K`;
      return `${sym}${num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    }
    case 'percent':
      return `${(num * 100).toFixed(1)}%`;
    case 'number':
      return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
    case 'auto':
    default:
      if (Math.abs(num) >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
      if (Math.abs(num) >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
      if (Math.abs(num) >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
      return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
}

export function truncate(text, max = 22) {
  if (!text) return '';
  const str = String(text);
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}
