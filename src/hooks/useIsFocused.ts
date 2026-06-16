import { useContext } from 'react';
import { collectActiveKeys } from '../core/matching.js';
import { RouteContext } from './context.js';
import { useRootState } from './internal.js';

/**
 * Returns whether the screen this hook is called from is currently focused
 * (on the active route chain). Returns `true` when called outside of a screen.
 */
export function useIsFocused(): boolean {
  const routeContext = useContext(RouteContext);
  const state = useRootState();
  if (!routeContext) return true;
  return collectActiveKeys(state).has(routeContext.route.key);
}
