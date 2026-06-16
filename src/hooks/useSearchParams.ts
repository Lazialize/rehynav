import { useContext } from 'react';
import { collectActiveParams } from '../core/matching.js';
import type { Params } from '../core/types.js';
import { RouteContext } from './context.js';
import { useRootState } from './internal.js';

/**
 * Returns the params of the route this component is rendered under (its own
 * dynamic segment params plus search params), like Expo Router's
 * `useLocalSearchParams`. Falls back to the globally focused route's params when
 * used outside of a screen.
 */
export function useLocalSearchParams<T extends Params = Params>(): T {
  const routeContext = useContext(RouteContext);
  const state = useRootState();
  if (routeContext) {
    return (routeContext.route.params ?? {}) as T;
  }
  return collectActiveParams(state) as T;
}

/**
 * Returns the params of the globally focused (deepest active) route, like Expo
 * Router's `useGlobalSearchParams`. Updates regardless of which screen reads it.
 */
export function useGlobalSearchParams<T extends Params = Params>(): T {
  const state = useRootState();
  return collectActiveParams(state) as T;
}
