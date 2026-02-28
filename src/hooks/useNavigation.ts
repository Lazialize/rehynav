import { useMemo } from 'react';
import { createId } from '../core/id.js';
import type { Serializable } from '../core/types.js';
import { useNavigationStore } from './context.js';

export interface NavigationActions {
  push(to: string, params?: Record<string, Serializable>): void;
  pop(): void;
  popToRoot(): void;
  replace(to: string, params?: Record<string, Serializable>): void;
  goBack(): void;
  canGoBack(): boolean;
}

export function useNavigation(): NavigationActions {
  const store = useNavigationStore();

  return useMemo(
    () => ({
      push(to: string, params: Record<string, Serializable> = {}) {
        store.dispatch({
          type: 'PUSH',
          route: to,
          params,
          id: createId(),
          timestamp: Date.now(),
        });
      },
      pop() {
        store.dispatch({ type: 'POP' });
      },
      popToRoot() {
        store.dispatch({ type: 'POP_TO_ROOT' });
      },
      replace(to: string, params: Record<string, Serializable> = {}) {
        store.dispatch({
          type: 'REPLACE',
          route: to,
          params,
          id: createId(),
          timestamp: Date.now(),
        });
      },
      goBack() {
        store.dispatch({ type: 'GO_BACK' });
      },
      canGoBack(): boolean {
        const state = store.getState();
        return state.overlays.length > 0 || state.tabs[state.activeTab].stack.length > 1;
      },
    }),
    [store],
  );
}
