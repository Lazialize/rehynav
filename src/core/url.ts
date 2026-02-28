import { resolveTabForRoute } from './route-utils.js';
import { createInitialState } from './state.js';
import type { NavigationState, Serializable } from './types.js';

export function stateToUrl(state: NavigationState, basePath: string = '/'): string {
  const activeTabState = state.tabs[state.activeTab];
  const topEntry = activeTabState.stack[activeTabState.stack.length - 1];

  // Route name -> URL path
  const path = basePath + topEntry.route;

  // Serialize params as query string (only non-empty params)
  const params = topEntry.params;
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      searchParams.set(key, String(value));
    }
  }

  const search = searchParams.toString();
  return search ? `${path}?${search}` : path;
}

export function urlToState(
  url: string,
  config: { tabs: string[]; initialTab: string },
  basePath: string = '/',
  createId: () => string,
  now: () => number,
): NavigationState {
  const parsed = new URL(url, 'http://localhost');
  const pathname = parsed.pathname.replace(basePath, '').replace(/^\//, '');

  // Parse params from query string
  const params: Record<string, Serializable> = {};
  for (const [key, value] of parsed.searchParams.entries()) {
    params[key] = value;
  }

  // Determine which tab this route belongs to
  const tab = resolveTabForRoute(pathname || config.initialTab, config.tabs);
  const targetTab = tab || config.initialTab;

  // Build state with the deep-linked route on the correct tab's stack
  const baseState = createInitialState(config, createId, now);
  const baseTab = baseState.tabs[targetTab];

  if (pathname && pathname !== targetTab) {
    // Deep link to a stack screen: push it onto the tab's stack
    return {
      ...baseState,
      activeTab: targetTab,
      tabs: {
        ...baseState.tabs,
        [targetTab]: {
          ...baseTab,
          stack: [...baseTab.stack, { id: createId(), route: pathname, params, timestamp: now() }],
          hasBeenActive: true,
        },
      },
    };
  }

  if (pathname === targetTab && Object.keys(params).length > 0) {
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
