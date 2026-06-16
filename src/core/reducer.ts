import type { NavigationRoute, NavigatorState, Params } from './types.js';

/** How a navigation target should be merged into the current state. */
export type NavigateMode = 'navigate' | 'push' | 'replace' | 'switch';

export type NavigationAction =
  | { type: 'NAVIGATE'; target: NavigatorState; mode: NavigateMode }
  | { type: 'BACK' }
  | { type: 'SET_PARAMS'; params: Params }
  | { type: 'RESET'; state: NavigatorState }
  | { type: 'SET_NAVIGATOR_TYPE'; key: string; navigatorType: NavigatorState['type'] };

function replaceAt<T>(arr: T[], index: number, value: T): T[] {
  const next = arr.slice();
  next[index] = value;
  return next;
}

/** Merges a freshly-built target route into an existing one, preserving its key. */
function mergeRoute(
  current: NavigationRoute,
  target: NavigationRoute,
  mode: NavigateMode,
): NavigationRoute {
  if (target.state) {
    const state = current.state ? mergeNavigator(current.state, target.state, mode) : target.state;
    return { ...current, params: target.params ?? current.params, state };
  }
  return { ...current, params: target.params };
}

/**
 * Merges a target navigator state (typically produced by `getStateFromPath`)
 * into the current navigator state according to the navigation mode.
 */
export function mergeNavigator(
  current: NavigatorState,
  target: NavigatorState,
  mode: NavigateMode,
): NavigatorState {
  const targetRoute = target.routes[target.index];
  if (!targetRoute) return current;

  // A target route that continues into a nested navigator means this navigator
  // is an intermediate level on the path: reuse the matching branch and recurse,
  // letting the navigation `mode` apply only at the deepest (leaf) navigator.
  const isIntermediate = targetRoute.state !== undefined;

  if (current.type === 'tab') {
    const existingIndex = current.routes.findIndex((r) => r.name === targetRoute.name);
    if (existingIndex >= 0) {
      // Switching tabs preserves each tab's independent nested stack.
      if (mode === 'switch') {
        return { ...current, index: existingIndex };
      }
      const merged = mergeRoute(current.routes[existingIndex], targetRoute, mode);
      return {
        ...current,
        index: existingIndex,
        routes: replaceAt(current.routes, existingIndex, merged),
      };
    }
    const routes = [...current.routes, targetRoute];
    return { ...current, routes, index: routes.length - 1 };
  }

  // Stack navigator on an intermediate level: reuse the branch by name, recurse.
  if (isIntermediate) {
    const top = current.routes[current.index];
    if (top && top.name === targetRoute.name) {
      const merged = mergeRoute(top, targetRoute, mode);
      return { ...current, routes: replaceAt(current.routes, current.index, merged) };
    }
    const existingIndex = current.routes.findIndex((r) => r.name === targetRoute.name);
    if (existingIndex >= 0) {
      const merged = mergeRoute(current.routes[existingIndex], targetRoute, mode);
      const routes = current.routes.slice(0, existingIndex + 1);
      routes[existingIndex] = merged;
      return { ...current, routes, index: routes.length - 1 };
    }
    const routes = [...current.routes, targetRoute];
    return { ...current, routes, index: routes.length - 1 };
  }

  // Leaf target on a stack: the navigation mode decides how it lands.
  if (mode === 'push') {
    const routes = [...current.routes, targetRoute];
    return { ...current, routes, index: routes.length - 1 };
  }

  if (mode === 'replace') {
    const routes = replaceAt(current.routes, current.index, targetRoute);
    return { ...current, routes, index: routes.length - 1 };
  }

  // navigate / switch on a stack: update in place if the top matches, otherwise
  // pop back to an existing entry of the same name, otherwise push.
  const top = current.routes[current.index];
  if (top && top.name === targetRoute.name) {
    const merged = mergeRoute(top, targetRoute, mode);
    return { ...current, routes: replaceAt(current.routes, current.index, merged) };
  }
  const existingIndex = current.routes.findIndex((r) => r.name === targetRoute.name);
  if (existingIndex >= 0) {
    const merged = mergeRoute(current.routes[existingIndex], targetRoute, mode);
    const routes = current.routes.slice(0, existingIndex + 1);
    routes[existingIndex] = merged;
    return { ...current, routes, index: routes.length - 1 };
  }
  const routes = [...current.routes, targetRoute];
  return { ...current, routes, index: routes.length - 1 };
}

/** Pops the deepest active stack that has more than one entry. */
function popActive(nav: NavigatorState): [NavigatorState, boolean] {
  const route = nav.routes[nav.index];
  if (route?.state) {
    const [nested, didPop] = popActive(route.state);
    if (didPop) {
      const merged: NavigationRoute = { ...route, state: nested };
      return [{ ...nav, routes: replaceAt(nav.routes, nav.index, merged) }, true];
    }
  }
  if (nav.type === 'stack' && nav.routes.length > 1) {
    const routes = nav.routes.slice(0, -1);
    return [{ ...nav, routes, index: routes.length - 1 }, true];
  }
  return [nav, false];
}

/** Merges params into the deepest active route. */
function setActiveParams(nav: NavigatorState, params: Params): NavigatorState {
  const route = nav.routes[nav.index];
  if (!route) return nav;
  if (route.state) {
    const nested = setActiveParams(route.state, params);
    return { ...nav, routes: replaceAt(nav.routes, nav.index, { ...route, state: nested }) };
  }
  const merged: NavigationRoute = { ...route, params: { ...route.params, ...params } };
  return { ...nav, routes: replaceAt(nav.routes, nav.index, merged) };
}

/** Sets the navigator `type` on the navigator with the matching key. */
function setNavigatorType(
  nav: NavigatorState,
  key: string,
  navigatorType: NavigatorState['type'],
): NavigatorState {
  let changed = false;
  let next: NavigatorState = nav;
  if (nav.key === key && nav.type !== navigatorType) {
    next = { ...nav, type: navigatorType };
    changed = true;
  }
  const routes = next.routes.map((route) => {
    if (!route.state) return route;
    const nested = setNavigatorType(route.state, key, navigatorType);
    if (nested !== route.state) {
      changed = true;
      return { ...route, state: nested };
    }
    return route;
  });
  if (changed) return { ...next, routes };
  return nav;
}

/** Pure reducer for the navigation state tree. */
export function navigationReducer(state: NavigatorState, action: NavigationAction): NavigatorState {
  switch (action.type) {
    case 'NAVIGATE':
      return mergeNavigator(state, action.target, action.mode);
    case 'BACK': {
      const [next] = popActive(state);
      return next;
    }
    case 'SET_PARAMS':
      return setActiveParams(state, action.params);
    case 'RESET':
      return action.state;
    case 'SET_NAVIGATOR_TYPE':
      return setNavigatorType(state, action.key, action.navigatorType);
    default:
      return state;
  }
}

/** Returns true when `BACK` would change the state. */
export function canGoBack(state: NavigatorState): boolean {
  const [, didPop] = popActive(state);
  return didPop;
}
