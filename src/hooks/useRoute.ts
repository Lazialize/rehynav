import { useContext } from 'react';
import type { Serializable } from '../core/types.js';
import { stateToUrl } from '../core/url.js';
import { RouteContext } from './context.js';
import { shallowEqual, useNavigationSelector } from './useNavigationSelector.js';

export interface RouteInfoResult {
  name: string;
  params: Record<string, Serializable>;
  path: string;
}

export function useRoute(): RouteInfoResult {
  const routeCtx = useContext(RouteContext);

  // Always call useNavigationSelector to satisfy the rules of hooks
  const stateRoute = useNavigationSelector((state) => {
    const topEntry =
      state.activeLayer === 'screens' && state.screens.length > 0
        ? state.screens[state.screens.length - 1]
        : state.tabs[state.activeTab].stack[state.tabs[state.activeTab].stack.length - 1];
    return {
      name: topEntry.route,
      params: topEntry.params,
      path: stateToUrl(state),
    };
  }, shallowEqual);

  // If inside a Screen component, use the route context for name/params
  if (routeCtx) {
    return {
      name: routeCtx.route,
      params: routeCtx.params,
      path: stateRoute.path,
    };
  }

  return stateRoute;
}
