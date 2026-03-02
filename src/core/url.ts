import { matchUrl, type RoutePattern } from './path-params.js';
import { resolveScreenForRoute, resolveTabForRoute } from './route-utils.js';
import { createInitialState } from './state.js';
import type { NavigationState, Serializable, StackEntry } from './types.js';

export function stateToUrl(
  state: NavigationState,
  basePath: string = '/',
  routePatterns?: Map<string, RoutePattern>,
): string {
  let topEntry: StackEntry;
  if (state.activeLayer === 'screens' && state.screens.length > 0) {
    topEntry = state.screens.at(-1)!;
  } else {
    const activeTabState = state.tabs[state.activeTab];
    topEntry = activeTabState.stack.at(-1)!;
  }

  const params = topEntry.params;
  const pattern = routePatterns?.get(topEntry.route);

  // Build URL path: use toPath() for parameterized routes, plain route name otherwise
  let urlPath: string;
  if (pattern && pattern.paramNames.length > 0) {
    const pathParams: Record<string, string> = {};
    for (const name of pattern.paramNames) {
      if (params[name] !== undefined && params[name] !== null) {
        pathParams[name] = String(params[name]);
      }
    }
    urlPath = basePath + pattern.toPath(pathParams);
  } else {
    urlPath = basePath + topEntry.route;
  }

  // Remaining params (not in path) go to query string
  const pathParamSet = pattern ? new Set(pattern.paramNames) : new Set<string>();
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && !pathParamSet.has(key)) {
      searchParams.set(key, String(value));
    }
  }

  const search = searchParams.toString();
  return search ? `${urlPath}?${search}` : urlPath;
}

export function urlToState(
  url: string,
  config: { tabs: string[]; initialTab: string; initialScreen?: string; screenNames?: string[] },
  basePath: string = '/',
  createId: () => string,
  now: () => number,
  routePatterns?: Map<string, RoutePattern>,
): NavigationState {
  const parsed = new URL(url, 'http://localhost');
  const pathname = parsed.pathname.replace(basePath, '').replace(/^\//, '');

  // Parse params from query string
  const params: Record<string, Serializable> = {};
  for (const [key, value] of parsed.searchParams.entries()) {
    params[key] = value;
  }

  // Try to match against route patterns to extract path params and resolve route name
  let routeName = pathname;
  if (routePatterns && pathname) {
    const matched = matchUrl(pathname, routePatterns);
    if (matched) {
      routeName = matched.route;
      // Merge path params with query params (path params take precedence)
      for (const [key, value] of Object.entries(matched.params)) {
        params[key] = value;
      }
    }
  }

  // Check if this route belongs to a screen
  const screenNames = config.screenNames ?? [];
  const screenName = resolveScreenForRoute(routeName || '', screenNames);

  if (screenName) {
    const baseState = createInitialState(
      { tabs: config.tabs, initialTab: config.initialTab, initialScreen: screenName, screenNames },
      createId,
      now,
    );

    if (routeName && routeName !== screenName) {
      // Deep link to a screen stack entry
      return {
        ...baseState,
        screens: [
          ...baseState.screens,
          { id: createId(), route: routeName, params, timestamp: now() },
        ],
      };
    }

    if (routeName === screenName && Object.keys(params).length > 0) {
      return {
        ...baseState,
        screens: [{ ...baseState.screens[0], params }],
      };
    }

    return baseState;
  }

  // Determine which tab this route belongs to
  const tab = resolveTabForRoute(routeName || config.initialTab, config.tabs);
  const targetTab = tab || config.initialTab;

  // Build state with the deep-linked route on the correct tab's stack
  const baseState = createInitialState(config, createId, now);
  const baseTab = baseState.tabs[targetTab];

  if (routeName && routeName !== targetTab) {
    // Deep link to a stack screen: push it onto the tab's stack
    return {
      ...baseState,
      activeTab: targetTab,
      tabs: {
        ...baseState.tabs,
        [targetTab]: {
          ...baseTab,
          stack: [...baseTab.stack, { id: createId(), route: routeName, params, timestamp: now() }],
          hasBeenActive: true,
        },
      },
    };
  }

  if (routeName === targetTab && Object.keys(params).length > 0) {
    // Deep link to a tab root with params
    return {
      ...baseState,
      activeTab: targetTab,
      tabs: {
        ...baseState.tabs,
        [targetTab]: {
          ...baseTab,
          stack: [{ ...baseTab.stack[0], params }],
          hasBeenActive: true,
        },
      },
    };
  }

  // Tab root with no params
  return {
    ...baseState,
    activeTab: targetTab,
    tabs: {
      ...baseState.tabs,
      [targetTab]: {
        ...baseTab,
        hasBeenActive: true,
      },
    },
  };
}
