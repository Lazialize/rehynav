import { getPathFromState } from '../core/matching.js';
import { useRootState } from './internal.js';

/**
 * Returns the current app-relative pathname (without the base path or query
 * string). Navigation state is already base-path-relative.
 */
export function usePathname(): string {
  const state = useRootState();
  return getPathFromState(state).split('?')[0];
}
