import { writable } from 'svelte/store';

export const treeRoot = writable(null);
export const pendingDrillNode = writable(null);
export const statusMessage = writable('Connecting to Tableau...');
export const configPanelOpen = writable(false);
export const summaryRows = writable([]);
