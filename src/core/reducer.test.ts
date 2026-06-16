import { getPathFromState, getStateFromPath } from './matching.js';
import {
  canGoBack,
  mergeNavigator,
  type NavigateMode,
  type NavigationAction,
  navigationReducer,
} from './reducer.js';
import { buildRouteTree, type RouteContextMap } from './route-tree.js';
import type { NavigationRoute, NavigatorState } from './types.js';

const C = () => () => null;

function ctx(keys: string[]): RouteContextMap {
  const out: RouteContextMap = {};
  for (const key of keys) out[key] = { default: C() as never };
  return out;
}

const tree = buildRouteTree(
  ctx([
    './app/_layout.tsx',
    './app/(tabs)/_layout.tsx',
    './app/(tabs)/index.tsx',
    './app/(tabs)/feed/_layout.tsx',
    './app/(tabs)/feed/index.tsx',
    './app/(tabs)/feed/[id].tsx',
  ]),
);

function tabsNavKey(state: NavigatorState): string {
  const key = state.routes[state.index].state?.key;
  if (!key) throw new Error('expected a nested tabs navigator');
  return key;
}

/** Builds initial state at `/` with the `(tabs)` navigator marked as a tab navigator. */
function initialState(): NavigatorState {
  const base = getStateFromPath('/', tree).state;
  return navigationReducer(base, {
    type: 'SET_NAVIGATOR_TYPE',
    key: tabsNavKey(base),
    navigatorType: 'tab',
  });
}

function navigate(state: NavigatorState, href: string, mode: NavigateMode): NavigatorState {
  const target = getStateFromPath(href, tree).state;
  return navigationReducer(state, { type: 'NAVIGATE', target, mode });
}

describe('navigationReducer', () => {
  it('pushes a new route onto a stack', () => {
    const state = navigate(initialState(), '/feed/5', 'push');
    expect(getPathFromState(state)).toBe('/feed/5');
  });

  it('switches tabs while preserving independent stacks', () => {
    let state = initialState();
    // Open feed tab at /feed/5.
    state = navigate(state, '/feed/5', 'push');
    // Switch back to the home (index) tab without resetting feed.
    state = navigate(state, '/', 'switch');
    expect(getPathFromState(state)).toBe('/');
    // Switch back to the feed tab: the /feed/5 stack is preserved.
    state = navigate(state, '/feed', 'switch');
    expect(getPathFromState(state)).toBe('/feed/5');
  });

  it('replace swaps the top of the active stack', () => {
    let state = initialState();
    state = navigate(state, '/feed', 'switch');
    state = navigate(state, '/feed/1', 'push');
    state = navigate(state, '/feed/2', 'replace');
    expect(getPathFromState(state)).toBe('/feed/2');
    // replace does not grow the stack, so one back returns to /feed.
    state = navigationReducer(state, { type: 'BACK' });
    expect(getPathFromState(state)).toBe('/feed');
  });

  it('navigate dedupes back to an existing entry in the stack', () => {
    let state = initialState();
    state = navigate(state, '/feed', 'switch');
    state = navigate(state, '/feed/1', 'push');
    state = navigate(state, '/feed/2', 'push');
    // Navigating to an entry already in the stack pops back to it.
    state = navigate(state, '/feed/1', 'navigate');
    expect(getPathFromState(state)).toBe('/feed/1');
    expect(canGoBack(state)).toBe(true);
  });

  it('BACK pops the deepest active stack', () => {
    let state = initialState();
    state = navigate(state, '/feed', 'switch');
    state = navigate(state, '/feed/9', 'push');
    expect(getPathFromState(state)).toBe('/feed/9');
    state = navigationReducer(state, { type: 'BACK' });
    expect(getPathFromState(state)).toBe('/feed');
  });

  it('BACK is a no-op at the root', () => {
    const state = initialState();
    expect(canGoBack(state)).toBe(false);
    expect(navigationReducer(state, { type: 'BACK' })).toBe(state);
  });

  it('SET_PARAMS merges params into the active route', () => {
    let state = initialState();
    state = navigate(state, '/feed/1', 'push');
    state = navigationReducer(state, { type: 'SET_PARAMS', params: { highlight: 'true' } });
    expect(getPathFromState(state)).toBe('/feed/1?highlight=true');
  });

  it('RESET replaces the entire state', () => {
    const state = initialState();
    const target = getStateFromPath('/feed/7', tree).state;
    const next = navigationReducer(state, { type: 'RESET', state: target });
    expect(next).toBe(target);
  });

  it('SET_NAVIGATOR_TYPE returns the same reference when unchanged', () => {
    const state = initialState();
    const same = navigationReducer(state, {
      type: 'SET_NAVIGATOR_TYPE',
      key: tabsNavKey(state),
      navigatorType: 'tab',
    });
    expect(same).toBe(state);
  });

  it('ignores unknown actions', () => {
    const state = initialState();
    expect(navigationReducer(state, { type: 'UNKNOWN' } as unknown as NavigationAction)).toBe(
      state,
    );
  });
});

// Synthetic state builders for exercising mergeNavigator branches directly.
function route(name: string, state?: NavigatorState): NavigationRoute {
  return state ? { key: `${name}-k`, name, state } : { key: `${name}-k`, name };
}
function stackOf(routes: NavigationRoute[], index = routes.length - 1): NavigatorState {
  return { type: 'stack', key: 's', index, routeNames: routes.map((r) => r.name), routes };
}
function tabOf(routes: NavigationRoute[], index = 0): NavigatorState {
  return { type: 'tab', key: 't', index, routeNames: routes.map((r) => r.name), routes };
}

describe('mergeNavigator branches', () => {
  it('pops to an existing intermediate branch that is not the top', () => {
    const current = stackOf([route('a', stackOf([route('x')])), route('b', stackOf([route('y')]))]);
    const target = stackOf([route('a', stackOf([route('x')]))]);
    const next = mergeNavigator(current, target, 'navigate');
    expect(next.index).toBe(0);
    expect(next.routes).toHaveLength(1);
  });

  it('pushes a new intermediate branch when none matches', () => {
    const current = stackOf([route('a', stackOf([route('x')]))]);
    const target = stackOf([route('c', stackOf([route('z')]))]);
    const next = mergeNavigator(current, target, 'navigate');
    expect(next.routes.map((r) => r.name)).toEqual(['a', 'c']);
    expect(next.index).toBe(1);
  });

  it('pops a leaf stack back to an existing entry of the same name', () => {
    const current = stackOf([route('index'), route('detail')]);
    const target = stackOf([route('index')]);
    const next = mergeNavigator(current, target, 'navigate');
    expect(next.routes.map((r) => r.name)).toEqual(['index']);
  });

  it('adds a new tab route when the target tab is not present', () => {
    const current = tabOf([route('home')]);
    const target = tabOf([route('profile')]);
    const next = mergeNavigator(current, target, 'navigate');
    expect(next.routes.map((r) => r.name)).toEqual(['home', 'profile']);
    expect(next.index).toBe(1);
  });

  it('merges into an existing tab without switch mode', () => {
    const current = tabOf(
      [route('home', stackOf([route('index')])), route('feed', stackOf([route('index')]))],
      0,
    );
    const target = tabOf([route('feed', stackOf([route('index'), route('[id]')]))]);
    const next = mergeNavigator(current, target, 'navigate');
    expect(next.index).toBe(1);
    expect(next.routes[1].state?.routes).toHaveLength(2);
  });

  it('returns current when the target has no active route', () => {
    const current = stackOf([route('a')]);
    const empty: NavigatorState = {
      type: 'stack',
      key: 's',
      index: -1,
      routeNames: [],
      routes: [],
    };
    expect(mergeNavigator(current, empty, 'push')).toBe(current);
  });

  it('replaces a stateless tab route with a nested target branch', () => {
    const current = tabOf([route('feed')]);
    const target = tabOf([route('feed', stackOf([route('index')]))]);
    const next = mergeNavigator(current, target, 'navigate');
    expect(next.routes[0].state?.routes).toHaveLength(1);
  });

  it('SET_PARAMS is a no-op when there is no active route', () => {
    const empty = stackOf([]);
    expect(navigationReducer(empty, { type: 'SET_PARAMS', params: { a: '1' } })).toBe(empty);
  });
});
