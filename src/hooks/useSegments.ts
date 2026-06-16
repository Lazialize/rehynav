import { collectActiveSegments } from '../core/matching.js';
import { useRootState } from './internal.js';

/**
 * Returns the URL segments of the active route (route-name segments, with groups
 * and `index` stripped), like Expo Router's `useSegments`.
 */
export function useSegments(): string[] {
  const state = useRootState();
  return collectActiveSegments(state);
}
