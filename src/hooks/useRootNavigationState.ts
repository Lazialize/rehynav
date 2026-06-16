import type { NavigatorState } from '../core/types.js';
import { useRootState } from './internal.js';

/** Returns the full navigation state tree. Useful for debugging or persistence. */
export function useRootNavigationState(): NavigatorState {
  return useRootState();
}
