import { useSyncExternalStore } from 'react';
import type { NavigationState } from '../core/types.js';
import { useNavigationStore } from './context.js';

export function useNavigationSelector<T>(selector: (state: NavigationState) => T): T {
  const store = useNavigationStore();
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(store.getServerSnapshot()),
  );
}
