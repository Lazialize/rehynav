import {
  collectActiveParams,
  collectActiveSegments,
  getPathFromState,
  getStateFromPath,
  parseUrl,
} from './matching.js';
import { buildRouteTree, type RouteContextMap } from './route-tree.js';

const C = () => () => null;

function ctx(keys: string[]): RouteContextMap {
  const out: RouteContextMap = {};
  for (const key of keys) out[key] = { default: C() as never };
  return out;
}

const tabsTree = buildRouteTree(
  ctx([
    './app/_layout.tsx',
    './app/(tabs)/_layout.tsx',
    './app/(tabs)/index.tsx',
    './app/(tabs)/search.tsx',
    './app/(tabs)/posts/[id].tsx',
    './app/+not-found.tsx',
  ]),
);

describe('parseUrl', () => {
  it('splits pathname and search params', () => {
    expect(parseUrl('/posts/42?sort=desc')).toEqual({
      segments: ['posts', '42'],
      search: { sort: 'desc' },
    });
  });

  it('decodes path segments', () => {
    expect(parseUrl('/posts/hello%20world').segments).toEqual(['posts', 'hello world']);
  });
});

describe('getStateFromPath', () => {
  it('matches the index route through groups', () => {
    const { state, notFound } = getStateFromPath('/', tabsTree);
    expect(notFound).toBe(false);
    const tabsRoute = state.routes[state.index];
    expect(tabsRoute.name).toBe('(tabs)');
    expect(tabsRoute.state?.routes[tabsRoute.state.index].name).toBe('index');
  });

  it('matches a static nested route', () => {
    const { state } = getStateFromPath('/search', tabsTree);
    const nested = state.routes[state.index].state;
    expect(nested?.routes[nested.index].name).toBe('search');
  });

  it('captures dynamic params', () => {
    const { state } = getStateFromPath('/posts/42', tabsTree);
    const params = collectActiveParams(state);
    expect(params.id).toBe('42');
  });

  it('merges search params onto the leaf route', () => {
    const { state } = getStateFromPath('/posts/42?ref=home', tabsTree);
    const params = collectActiveParams(state);
    expect(params).toMatchObject({ id: '42', ref: 'home' });
  });

  it('falls back to +not-found for unmatched paths', () => {
    const { state, notFound } = getStateFromPath('/nope/nope', tabsTree);
    expect(notFound).toBe(true);
    expect(state.routes[state.index].name).toBe('+not-found');
  });
});

describe('getPathFromState', () => {
  it('round-trips a static path', () => {
    const { state } = getStateFromPath('/search', tabsTree);
    expect(getPathFromState(state)).toBe('/search');
  });

  it('round-trips a dynamic path', () => {
    const { state } = getStateFromPath('/posts/42', tabsTree);
    expect(getPathFromState(state)).toBe('/posts/42');
  });

  it('round-trips the index path', () => {
    const { state } = getStateFromPath('/', tabsTree);
    expect(getPathFromState(state)).toBe('/');
  });

  it('serializes extra params as a query string', () => {
    const { state } = getStateFromPath('/posts/42?ref=home', tabsTree);
    expect(getPathFromState(state)).toBe('/posts/42?ref=home');
  });
});

describe('collectActiveSegments', () => {
  it('returns segments with groups and index stripped', () => {
    const { state } = getStateFromPath('/posts/42', tabsTree);
    expect(collectActiveSegments(state)).toEqual(['posts', '[id]']);
  });
});

describe('deep dynamic (catch-all) routes', () => {
  const tree = buildRouteTree(
    ctx(['./app/_layout.tsx', './app/index.tsx', './app/files/[...path].tsx']),
  );

  it('captures the remaining segments as an array', () => {
    const { state } = getStateFromPath('/files/a/b/c', tree);
    expect(collectActiveParams(state).path).toEqual(['a', 'b', 'c']);
  });

  it('round-trips the catch-all path', () => {
    const { state } = getStateFromPath('/files/a/b', tree);
    expect(getPathFromState(state)).toBe('/files/a/b');
  });

  it('serializes a scalar catch-all param', () => {
    const { state } = getStateFromPath('/files/x', tree);
    state.routes[state.index].params = { path: 'single' };
    expect(getPathFromState(state)).toBe('/files/single');
  });
});
