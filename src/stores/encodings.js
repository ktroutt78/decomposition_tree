import { writable, derived } from 'svelte/store';

// Raw encoding map from getVisualSpecificationAsync:
// { value: [field], breakdown: [field, ...], tooltip: [...], color: [...] }
export const encodingMap = writable({});

// True when at least one measure is on the Value shelf
export const isReadyToRender = derived(encodingMap, ($map) => {
  return Array.isArray($map.value) && $map.value.length > 0;
});

// Names of available breakdown dimensions
export const breakdownFieldNames = derived(encodingMap, ($map) => {
  return ($map.breakdown || []).map(f => f.name);
});

// Names of tooltip fields
export const tooltipFieldNames = derived(encodingMap, ($map) => {
  return ($map.tooltip || []).map(f => f.name);
});

// Color field name (first only)
export const colorFieldName = derived(encodingMap, ($map) => {
  return ($map.color && $map.color.length > 0) ? $map.color[0].name : null;
});

// Raw tooltip narrative template from Tableau's marksSpec.
// null = not available (Tableau API did not expose it).
// string = the template text, possibly containing <FieldName> placeholders.
export const tooltipTemplate = writable(null);
