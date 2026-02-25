import { describe, it, expect } from 'vitest';
import {
  buildRootNode,
  drillDown,
  serializeExpansion,
  replayExpansion,
  toggleCollapse,
  updateNodeInTree,
  findParent,
  getDeepestExpandedNode
} from './treeEngine.js';

const valueField = { name: 'Sales', fieldName: 'Sales' };
const regionField = { name: 'Region', fieldName: 'Region' };
const encMap = {
  value: [valueField],
  breakdown: [regionField, { name: 'Category', fieldName: 'Category' }],
  tooltip: [],
  color: []
};

function makeRows(entries) {
  return entries.map(([region, sales]) => ({ Region: region, Sales: sales }));
}

describe('buildRootNode', () => {
  it('returns null when encMap has no value field', () => {
    const rows = makeRows([['East', 10], ['West', 20]]);
    expect(buildRootNode(rows, {})).toBeNull();
    expect(buildRootNode(rows, { value: [] })).toBeNull();
  });

  it('builds root with total, count, and _rows from data', () => {
    const rows = makeRows([['East', 10], ['West', 20], ['East', 5]]);
    const root = buildRootNode(rows, encMap);
    expect(root).not.toBeNull();
    expect(root.id).toBe('root');
    expect(root.label).toBe('Sales');
    expect(root.value).toBe(35);
    expect(root.count).toBe(3);
    expect(root.percentOfParent).toBe(100);
    expect(root.depth).toBe(0);
    expect(root.dimensionPath).toEqual([]);
    expect(root.children).toBeNull();
    expect(root._rows).toBe(rows);
  });
});

describe('drillDown', () => {
  it('returns node unchanged when no value field', () => {
    const rows = makeRows([['East', 10], ['West', 20]]);
    const root = buildRootNode(rows, encMap);
    const result = drillDown(root, 'Region', {}, 20, false, 'desc');
    expect(result).toBe(root);
  });

  it('groups by dimension and sorts desc by default', () => {
    const rows = makeRows([['East', 10], ['West', 30], ['East', 5]]);
    const root = buildRootNode(rows, encMap);
    const drilled = drillDown(root, 'Region', encMap, 20, false, 'desc');
    expect(drilled.children).toHaveLength(2);
    const labels = drilled.children.map(c => c.label);
    expect(labels).toContain('East');
    expect(labels).toContain('West');
    expect(drilled.children[0].value).toBe(30);
    expect(drilled.children[1].value).toBe(15);
    expect(drilled.children[0]._drillDimension).toBe('Region');
    expect(drilled.children[0]._sortOrder).toBe('desc');
  });

  it('respects sortOrder asc', () => {
    const rows = makeRows([['East', 10], ['West', 30]]);
    const root = buildRootNode(rows, encMap);
    const drilled = drillDown(root, 'Region', encMap, 20, false, 'asc');
    expect(drilled.children[0].label).toBe('East');
    expect(drilled.children[0].value).toBe(10);
    expect(drilled.children[1].label).toBe('West');
    expect(drilled.children[1].value).toBe(30);
  });

  it('excludes null-like values when excludeNulls is true', () => {
    const rows = [
      { Region: 'East', Sales: 10 },
      { Region: 'Null', Sales: 5 },
      { Region: '(null)', Sales: 3 }
    ];
    const root = buildRootNode(rows, encMap);
    const drilled = drillDown(root, 'Region', encMap, 20, true, 'desc');
    const labels = drilled.children.map(c => c.label);
    expect(labels).not.toContain('Null');
    expect(labels).not.toContain('(null)');
    expect(labels).toContain('East');
    expect(drilled.children.find(c => c.label === 'East').value).toBe(10);
  });
});

describe('serializeExpansion', () => {
  it('returns null when node has no children', () => {
    const root = buildRootNode(makeRows([['East', 10]]), encMap);
    expect(serializeExpansion(root)).toBeNull();
    expect(serializeExpansion({ children: null })).toBeNull();
    expect(serializeExpansion({ children: [] })).toBeNull();
  });

  it('returns recipe with d, s, c for one level', () => {
    const rows = makeRows([['East', 10], ['West', 20]]);
    const root = buildRootNode(rows, encMap);
    const drilled = drillDown(root, 'Region', encMap, 20, false, 'desc');
    const recipe = serializeExpansion(drilled);
    expect(recipe).not.toBeNull();
    expect(recipe.d).toBe('Region');
    expect(recipe.s).toBe('desc');
    expect(recipe.c).toHaveLength(2);
    expect(recipe.c.map(x => x.l).sort()).toEqual(['East', 'West'].sort());
    recipe.c.forEach(child => {
      expect(child).toHaveProperty('l');
      expect(child).toHaveProperty('v');
      expect(typeof child.v).toBe('boolean');
    });
  });

  it('includes nested e when child has children', () => {
    const rows = [
      { Region: 'East', Category: 'A', Sales: 10 },
      { Region: 'East', Category: 'B', Sales: 5 },
      { Region: 'West', Sales: 20 }
    ];
    const root = buildRootNode(rows, encMap);
    let drilled = drillDown(root, 'Region', encMap, 20, false, 'desc');
    drilled = {
      ...drilled,
      children: drilled.children.map(c =>
        c.label === 'East'
          ? drillDown(c, 'Category', encMap, 20, false, 'desc')
          : c
      )
    };
    const recipe = serializeExpansion(drilled);
    expect(recipe).not.toBeNull();
    const eastRecipe = recipe.c.find(rc => rc.l === 'East');
    expect(eastRecipe).toHaveProperty('e');
    expect(eastRecipe.e.d).toBe('Category');
    expect(eastRecipe.e.c).toBeDefined();
  });
});

describe('replayExpansion', () => {
  it('returns freshNode when recipe is null or invalid', () => {
    const rows = makeRows([['East', 10], ['West', 20]]);
    const root = buildRootNode(rows, encMap);
    expect(replayExpansion(root, null, encMap, 20, false)).toBe(root);
    expect(replayExpansion(root, {}, encMap, 20, false)).toBe(root);
    expect(replayExpansion(root, { d: 'Region' }, encMap, 20, false)).toBe(root);
    expect(replayExpansion(root, { d: 'Region', s: 'desc' }, encMap, 20, false)).toBe(root);
  });

  it('returns freshNode when recipe dimension is not in encMap.breakdown', () => {
    const rows = makeRows([['East', 10], ['West', 20]]);
    const root = buildRootNode(rows, encMap);
    const recipe = { d: 'NonExistentDim', s: 'desc', c: [{ l: 'X', v: false }] };
    const result = replayExpansion(root, recipe, encMap, 20, false);
    expect(result).toBe(root);
    expect(result.children).toBeFalsy();
  });

  it('replays one level and restores _collapsed from recipe', () => {
    const rows = makeRows([['East', 10], ['West', 20]]);
    const root = buildRootNode(rows, encMap);
    const recipe = {
      d: 'Region',
      s: 'desc',
      c: [
        { l: 'West', v: false },
        { l: 'East', v: true }
      ]
    };
    const result = replayExpansion(root, recipe, encMap, 20, false);
    expect(result.children).toHaveLength(2);
    const west = result.children.find(c => c.label === 'West');
    const east = result.children.find(c => c.label === 'East');
    expect(west._collapsed).toBe(false);
    expect(east._collapsed).toBe(true);
  });

  it('round-trip: serialize then replay matches structure and collapse', () => {
    const rows = [
      { Region: 'East', Category: 'A', Sales: 10 },
      { Region: 'East', Category: 'B', Sales: 5 },
      { Region: 'West', Sales: 20 }
    ];
    const root = buildRootNode(rows, encMap);
    let tree = drillDown(root, 'Region', encMap, 20, false, 'desc');
    tree = {
      ...tree,
      children: tree.children.map(c =>
        c.label === 'East'
          ? { ...drillDown(c, 'Category', encMap, 20, false, 'desc'), _collapsed: false }
          : { ...c, _collapsed: true }
      )
    };
    const recipe = serializeExpansion(tree);
    const freshRoot = buildRootNode(rows, encMap);
    const replayed = replayExpansion(freshRoot, recipe, encMap, 20, false);
    expect(replayed.children).toBeDefined();
    const replayedEast = replayed.children.find(c => c.label === 'East');
    const replayedWest = replayed.children.find(c => c.label === 'West');
    expect(replayedWest._collapsed).toBe(true);
    expect(replayedEast._collapsed).toBe(false);
    expect(replayedEast.children).toBeDefined();
    expect(replayedEast.children.length).toBeGreaterThan(0);
  });
});

describe('toggleCollapse', () => {
  it('toggles _collapsed', () => {
    const node = { id: 'n', _collapsed: false };
    expect(toggleCollapse(node)._collapsed).toBe(true);
    expect(toggleCollapse({ ...node, _collapsed: true })._collapsed).toBe(false);
  });
});

describe('updateNodeInTree', () => {
  it('returns root unchanged when targetId not found', () => {
    const root = buildRootNode(makeRows([['East', 10]]), encMap);
    const updated = updateNodeInTree(root, 'nonexistent', n => ({ ...n, x: 1 }));
    expect(updated).toBe(root);
  });

  it('applies transform to target node', () => {
    const root = buildRootNode(makeRows([['East', 10], ['West', 20]]), encMap);
    const drilled = drillDown(root, 'Region', encMap, 20, false, 'desc');
    const targetId = drilled.children[0].id;
    const updated = updateNodeInTree(drilled, targetId, n => ({ ...n, _collapsed: true }));
    expect(updated.children[0]._collapsed).toBe(true);
  });
});

describe('findParent', () => {
  it('returns null when childId not in tree', () => {
    const root = buildRootNode(makeRows([['East', 10]]), encMap);
    expect(findParent(root, 'missing')).toBeNull();
  });

  it('returns parent of direct child', () => {
    const rows = makeRows([['East', 10], ['West', 20]]);
    const root = buildRootNode(rows, encMap);
    const drilled = drillDown(root, 'Region', encMap, 20, false, 'desc');
    const childId = drilled.children[0].id;
    const parent = findParent(drilled, childId);
    expect(parent).toBe(drilled);
  });
});

describe('getDeepestExpandedNode', () => {
  it('returns root when root has no children', () => {
    const root = buildRootNode(makeRows([['East', 10]]), encMap);
    expect(getDeepestExpandedNode(root)).toBe(root);
  });

  it('returns root when root has children but all collapsed', () => {
    const rows = makeRows([['East', 10], ['West', 20]]);
    const root = buildRootNode(rows, encMap);
    let tree = drillDown(root, 'Region', encMap, 20, false, 'desc');
    tree = { ...tree, children: tree.children.map(c => ({ ...c, _collapsed: true })) };
    expect(getDeepestExpandedNode(tree)).toBe(tree);
  });

  it('returns deepest expanded node with children', () => {
    const rows = [
      { Region: 'East', Category: 'A', Sales: 10 },
      { Region: 'East', Category: 'B', Sales: 5 },
      { Region: 'West', Sales: 20 }
    ];
    const root = buildRootNode(rows, encMap);
    let tree = drillDown(root, 'Region', encMap, 20, false, 'desc');
    tree = {
      ...tree,
      children: tree.children.map(c =>
        c.label === 'East' ? drillDown(c, 'Category', encMap, 20, false, 'desc') : c
      )
    };
    const deepest = getDeepestExpandedNode(tree);
    expect(deepest).not.toBe(tree);
    expect(deepest.children).toBeDefined();
    expect(deepest.children.length).toBeGreaterThan(0);
  });
});
