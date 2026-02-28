import { act, renderHook } from '@testing-library/react';
import type React from 'react';
import { describe, expect, it } from 'vitest';
import { createNavigationGuardRegistry } from '../core/navigation-guard.js';
import { navigationReducer } from '../core/reducer.js';
import { createInitialState } from '../core/state.js';
import type { NavigationAction, NavigationState } from '../core/types.js';
import type { NavigationStoreForHooks } from './context.js';
import { GuardRegistryContext, NavigationStoreContext } from './context.js';
import { useTab } from './useTab.js';

function createTestStore(initialState: NavigationState): NavigationStoreForHooks {
  let state = initialState;
  const listeners = new Set<() => void>();

  return {
    getState() {
      return state;
    },
    dispatch(action: NavigationAction) {
      state = navigationReducer(state, action);
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
  return `test-tab-id-${++idCounter}`;
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

describe('useTab', () => {
  it('returns the active tab and tab list', () => {
    const state = createInitialState(
      { tabs: ['home', 'search', 'profile'], initialTab: 'home' },
      testCreateId,
      () => 1000,
    );
    const store = createTestStore(state);
    const wrapper = createWrapper(store);

    const { result } = renderHook(() => useTab(), { wrapper });

    expect(result.current.activeTab).toBe('home');
    expect(result.current.tabs).toEqual(['home', 'search', 'profile']);
  });

  it('switchTab changes the active tab', () => {
    const state = createInitialState(
      { tabs: ['home', 'search', 'profile'], initialTab: 'home' },
      testCreateId,
      () => 1000,
    );
    const store = createTestStore(state);
    const wrapper = createWrapper(store);

    const { result } = renderHook(() => useTab(), { wrapper });

    act(() => {
      result.current.switchTab('search');
    });

    expect(result.current.activeTab).toBe('search');
  });

  it('switchTabAndReset changes tab and resets stack', () => {
    const state = createInitialState(
      { tabs: ['home', 'search'], initialTab: 'home' },
      testCreateId,
      () => 1000,
    );
    const store = createTestStore(state);
    const wrapper = createWrapper(store);

    // Push a screen onto search tab first
    act(() => {
      store.dispatch({
        type: 'SWITCH_TAB',
        tab: 'search',
      });
      store.dispatch({
        type: 'PUSH',
        route: 'search/results',
        params: {},
        id: 'extra-entry',
        timestamp: 1000,
      });
      store.dispatch({
        type: 'SWITCH_TAB',
        tab: 'home',
      });
    });

    expect(store.getState().tabs.search.stack).toHaveLength(2);

    const { result } = renderHook(() => useTab(), { wrapper });

    act(() => {
      result.current.switchTabAndReset('search');
    });

    expect(result.current.activeTab).toBe('search');
    expect(store.getState().tabs.search.stack).toHaveLength(1);
    expect(store.getState().tabs.search.stack[0].route).toBe('search');
  });

  it('setBadge sets a badge on a tab', () => {
    const state = createInitialState(
      { tabs: ['home', 'search'], initialTab: 'home' },
      testCreateId,
      () => 1000,
    );
    const store = createTestStore(state);
    const wrapper = createWrapper(store);

    const { result } = renderHook(() => useTab(), { wrapper });

    act(() => {
      result.current.setBadge('home', 5);
    });

    expect(store.getState().badges.home).toBe(5);
  });

  it('setBadge with string badge', () => {
    const state = createInitialState(
      { tabs: ['home', 'search'], initialTab: 'home' },
      testCreateId,
      () => 1000,
    );
    const store = createTestStore(state);
    const wrapper = createWrapper(store);

    const { result } = renderHook(() => useTab(), { wrapper });

    act(() => {
      result.current.setBadge('search', 'new');
    });

    expect(store.getState().badges.search).toBe('new');
  });

  it('setBadge with undefined clears badge', () => {
    const state = createInitialState(
      { tabs: ['home', 'search'], initialTab: 'home' },
      testCreateId,
      () => 1000,
    );
    const store = createTestStore(state);
    const wrapper = createWrapper(store);

    const { result } = renderHook(() => useTab(), { wrapper });

    act(() => {
      result.current.setBadge('home', 3);
    });
    expect(store.getState().badges.home).toBe(3);

    act(() => {
      result.current.setBadge('home', undefined);
    });
    expect(store.getState().badges.home).toBeUndefined();
  });

  it('throws when used outside provider', () => {
    expect(() => {
      renderHook(() => useTab());
    }).toThrow('useNavigationStore must be used within NavigationProvider');
  });
});
