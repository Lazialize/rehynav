import { type NavigationAction, navigationReducer } from '../core/reducer.js';
import type { NavigatorState } from '../core/types.js';

type Listener = () => void;

/** Minimal observer store compatible with `useSyncExternalStore`. */
export interface NavigationStore {
  getState(): NavigatorState;
  dispatch(action: NavigationAction): void;
  subscribe(listener: Listener): () => void;
  getServerSnapshot(): NavigatorState;
}

export function createNavigationStore(initialState: NavigatorState): NavigationStore {
  let state = initialState;
  const initial = initialState;
  const listeners = new Set<Listener>();

  return {
    getState() {
      return state;
    },

    dispatch(action: NavigationAction) {
      const next = navigationReducer(state, action);
      if (next !== state) {
        state = next;
        for (const listener of listeners) listener();
      }
    },

    subscribe(listener: Listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    getServerSnapshot() {
      return initial;
    },
  };
}
