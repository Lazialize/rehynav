import { getPathFromState, getStateFromPath } from './matching.js';
import { canGoBack, type NavigateMode, navigationReducer } from './reducer.js';
import { buildRouteTree, type RouteContextMap } from './route-tree.js';
import type { NavigatorState } from './types.js';

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

/** Builds initial state at `/` with the `(tabs)` navigator marked as a tab navigator. */
function initialState(): NavigatorState {
  let state = getStateFromPath('/', tree).state;
  const tabsKey = state.routes[state.index].state?.key;
  state = navigationReducer(state, {
    type: 'SET_NAVIGATOR_TYPE',
    key: tabsKey!,
    navigatorType: 'tab',
  });
  return state;
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
    const tabsKey = state.routes[state.index].state?.key;
    const same = navigationReducer(state, {
      type: 'SET_NAVIGATOR_TYPE',
      key: tabsKey!,
      navigatorType: 'tab',
    });
    expect(same).toBe(state);
  });
});
