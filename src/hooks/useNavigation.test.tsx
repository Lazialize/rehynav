import { act, renderHook } from '@testing-library/react';
import type React from 'react';
import { describe, expect, it } from 'vitest';
import { createNavigationGuardRegistry } from '../core/navigation-guard.js';
import { navigationReducer } from '../core/reducer.js';
import { createInitialState } from '../core/state.js';
import type { NavigationAction, NavigationState } from '../core/types.js';
import type { NavigationStoreForHooks } from './context.js';
import { GuardRegistryContext, NavigationStoreContext } from './context.js';
import { useNavigation } from './useNavigation.js';

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
  return `test-id-${++idCounter}`;
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

describe('useNavigation', () => {
  it('push dispatches PUSH action and adds to stack', () => {
    const state = createInitialState(
      { tabs: ['home', 'search', 'profile'], initialTab: 'home' },
      testCreateId,
      () => 1000,
    );
    const store = createTestStore(state);
    const wrapper = createWrapper(store);

    const { result } = renderHook(() => useNavigation(), { wrapper });

    act(() => {
      result.current.push('home/detail', { id: '42' });
    });

    const newState = store.getState();
    expect(newState.tabs.home.stack).toHaveLength(2);
    expect(newState.tabs.home.stack[1].route).toBe('home/detail');
    expect(newState.tabs.home.stack[1].params).toEqual({ id: '42' });
  });

  it('push with no params defaults to empty object', () => {
    const state = createInitialState(
      { tabs: ['home', 'search'], initialTab: 'home' },
      testCreateId,
      () => 1000,
    );
    const store = createTestStore(state);
    const wrapper = createWrapper(store);

    const { result } = renderHook(() => useNavigation(), { wrapper });

    act(() => {
      result.current.push('home/detail');
    });

    const newState = store.getState();
    expect(newState.tabs.home.stack[1].params).toEqual({});
  });

  it('pop removes top entry from stack', () => {
    const state = createInitialState(
      { tabs: ['home', 'search'], initialTab: 'home' },
      testCreateId,
      () => 1000,
    );
    const store = createTestStore(state);
    const wrapper = createWrapper(store);

    const { result } = renderHook(() => useNavigation(), { wrapper });

    act(() => {
      result.current.push('home/detail');
    });
    expect(store.getState().tabs.home.stack).toHaveLength(2);

    act(() => {
      result.current.pop();
    });
    expect(store.getState().tabs.home.stack).toHaveLength(1);
  });

  it('popToRoot resets to root entry', () => {
    const state = createInitialState(
      { tabs: ['home', 'search'], initialTab: 'home' },
      testCreateId,
      () => 1000,
    );
    const store = createTestStore(state);
    const wrapper = createWrapper(store);

    const { result } = renderHook(() => useNavigation(), { wrapper });

    act(() => {
      result.current.push('home/a');
      result.current.push('home/b');
      result.current.push('home/c');
    });
    expect(store.getState().tabs.home.stack).toHaveLength(4);

    act(() => {
      result.current.popToRoot();
    });
    expect(store.getState().tabs.home.stack).toHaveLength(1);
    expect(store.getState().tabs.home.stack[0].route).toBe('home');
  });

  it('replace replaces the top entry', () => {
    const state = createInitialState(
      { tabs: ['home', 'search'], initialTab: 'home' },
      testCreateId,
      () => 1000,
    );
    const store = createTestStore(state);
    const wrapper = createWrapper(store);

    const { result } = renderHook(() => useNavigation(), { wrapper });

    act(() => {
      result.current.replace('home/replaced', { key: 'val' });
    });

    const newState = store.getState();
    expect(newState.tabs.home.stack).toHaveLength(1);
    expect(newState.tabs.home.stack[0].route).toBe('home/replaced');
    expect(newState.tabs.home.stack[0].params).toEqual({ key: 'val' });
  });

  it('goBack dispatches GO_BACK action', () => {
    const state = createInitialState(
      { tabs: ['home', 'search'], initialTab: 'home' },
      testCreateId,
      () => 1000,
    );
    const store = createTestStore(state);
    const wrapper = createWrapper(store);

    const { result } = renderHook(() => useNavigation(), { wrapper });

    act(() => {
      result.current.push('home/detail');
    });
    expect(store.getState().tabs.home.stack).toHaveLength(2);

    act(() => {
      result.current.goBack();
    });
    expect(store.getState().tabs.home.stack).toHaveLength(1);
  });

  it('canGoBack returns false at tab root with no overlays', () => {
    const state = createInitialState(
      { tabs: ['home', 'search'], initialTab: 'home' },
      testCreateId,
      () => 1000,
    );
    const store = createTestStore(state);
    const wrapper = createWrapper(store);

    const { result } = renderHook(() => useNavigation(), { wrapper });

    expect(result.current.canGoBack()).toBe(false);
  });

  it('canGoBack returns true when stack has more than one entry', () => {
    const state = createInitialState(
      { tabs: ['home', 'search'], initialTab: 'home' },
      testCreateId,
      () => 1000,
    );
    const store = createTestStore(state);
    const wrapper = createWrapper(store);

    const { result } = renderHook(() => useNavigation(), { wrapper });

    act(() => {
      result.current.push('home/detail');
    });

    expect(result.current.canGoBack()).toBe(true);
  });

  it('canGoBack returns true when overlays are open', () => {
    const state = createInitialState(
      { tabs: ['home', 'search'], initialTab: 'home' },
      testCreateId,
      () => 1000,
    );
    const store = createTestStore(state);
    const wrapper = createWrapper(store);

    const { result } = renderHook(() => useNavigation(), { wrapper });

    act(() => {
      store.dispatch({
        type: 'OPEN_OVERLAY',
        route: 'settings',
        params: {},
        id: 'overlay-1',
        timestamp: Date.now(),
      });
    });

    expect(result.current.canGoBack()).toBe(true);
  });

  it('throws when used outside provider', () => {
    expect(() => {
      renderHook(() => useNavigation());
    }).toThrow('useNavigationStore must be used within NavigationProvider');
  });
});
