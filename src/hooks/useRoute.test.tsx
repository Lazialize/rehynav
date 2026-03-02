import { renderHook } from '@testing-library/react';
import type React from 'react';
import { describe, expect, it } from 'vitest';
import { createNavigationGuardRegistry } from '../core/navigation-guard.js';
import { createInitialState } from '../core/state.js';
import type { NavigationAction, NavigationState } from '../core/types.js';
import type { NavigationStoreForHooks } from './context.js';
import { GuardRegistryContext, NavigationStoreContext } from './context.js';
import { useRoute } from './useRoute.js';

function createTestStore(initialState: NavigationState): NavigationStoreForHooks {
  const state = initialState;
  const listeners = new Set<() => void>();

  return {
    getState() {
      return state;
    },
    dispatch(action: NavigationAction) {
      // Not needed for read-only tests, but satisfies interface
      void action;
      for (const listener of listeners) {
        listener();
      }
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getServerSnapshot() {
      return state;
    },
  };
}

let idCounter = 0;
function testCreateId(): string {
  return `test-route-id-${++idCounter}`;
}

function createWrapper(store: NavigationStoreForHooks) {
  const guardRegistry = createNavigationGuardRegistry();
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <NavigationStoreContext.Provider value={store}>
        <GuardRegistryContext.Provider value={guardRegistry}>
          {children}
        </GuardRegistryContext.Provider>
      </NavigationStoreContext.Provider>
    );
  };
}

describe('useRoute', () => {
  it('returns tab route info when activeLayer is tabs', () => {
    const state = createInitialState(
      { tabs: ['home', 'search'], initialTab: 'home' },
      testCreateId,
      () => 1000,
    );
    const store = createTestStore(state);
    const wrapper = createWrapper(store);

    const { result } = renderHook(() => useRoute(), { wrapper });

    expect(result.current.name).toBe('home');
    expect(result.current.params).toEqual({});
  });

  it('returns screen route info when activeLayer is screens', () => {
    const state = createInitialState(
      { tabs: ['home', 'search'], initialTab: 'home', initialScreen: 'login' },
      testCreateId,
      () => 1000,
    );
    const store = createTestStore(state);
    const wrapper = createWrapper(store);

    const { result } = renderHook(() => useRoute(), { wrapper });

    expect(result.current.name).toBe('login');
    expect(result.current.params).toEqual({});
  });
});
