import { navigationReducer } from '../core/reducer.js';
import type { NavigationAction, NavigationState } from '../core/types.js';

type Listener = () => void;

export interface NavigationStore {
  getState(): NavigationState;
  dispatch(action: NavigationAction): void;
  subscribe(listener: Listener): () => void;
  getServerSnapshot(): NavigationState;
}

export function createNavigationStore(initialState: NavigationState): NavigationStore {
  let state = initialState;
  const listeners = new Set<Listener>();

  return {
    getState() {
      return state;
    },

    dispatch(action: NavigationAction) {
      const nextState = navigationReducer(state, action);
      if (nextState !== state) {
        state = nextState;
        for (const listener of listeners) {
          listener();
        }
      }
    },

    subscribe(listener: Listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    getServerSnapshot() {
      return state;
    },
  };
}
