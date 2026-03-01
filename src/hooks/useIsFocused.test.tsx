import { act, renderHook } from '@testing-library/react';
import type React from 'react';
import { describe, expect, it } from 'vitest';
import { createNavigationGuardRegistry } from '../core/navigation-guard.js';
import { navigationReducer } from '../core/reducer.js';
import { createInitialState } from '../core/state.js';
import type { NavigationAction, NavigationState } from '../core/types.js';
import type { NavigationStoreForHooks } from './context.js';
import { GuardRegistryContext, NavigationStoreContext, RouteContext } from './context.js';
import { useIsFocused } from './useIsFocused.js';

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
  return `test-focus-id-${++idCounter}`;
}

function createWrapper(
  store: NavigationStoreForHooks,
  routeCtx: { route: string; params: Record<string, unknown>; entryId: string },
) {
  const guardRegistry = createNavigationGuardRegistry();
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <NavigationStoreContext.Provider value={store}>
        <GuardRegistryContext.Provider value={guardRegistry}>
          <RouteContext.Provider value={routeCtx}>{children}</RouteContext.Provider>
        </GuardRegistryContext.Provider>
      </NavigationStoreContext.Provider>
    );
  };
}

describe('useIsFocused', () => {
  it('returns true for top screen of active tab with no overlays', () => {
    const state = createInitialState(
      { tabs: ['home'], initialTab: 'home' },
      testCreateId,
      () => 1000,
    );
    const store = createTestStore(state);
    const topEntryId = store.getState().tabs.home.stack[0].id;
    const wrapper = createWrapper(store, { route: 'home', params: {}, entryId: topEntryId });

    const { result } = renderHook(() => useIsFocused(), { wrapper });

    expect(result.current).toBe(true);
  });

  it('returns false for screen in inactive tab', () => {
    const state = createInitialState(
      { tabs: ['home', 'search'], initialTab: 'home' },
      testCreateId,
      () => 1000,
    );
    const store = createTestStore(state);
    // Use the search tab's root entry ID, but home is the active tab
    const searchEntryId = store.getState().tabs.search.stack[0].id;
    const wrapper = createWrapper(store, { route: 'search', params: {}, entryId: searchEntryId });

    const { result } = renderHook(() => useIsFocused(), { wrapper });

    expect(result.current).toBe(false);
  });

  it('returns false when overlay is open (for stack screens)', () => {
    const state = createInitialState(
      { tabs: ['home'], initialTab: 'home' },
      testCreateId,
      () => 1000,
    );
    const store = createTestStore(state);
    const topEntryId = store.getState().tabs.home.stack[0].id;
    const wrapper = createWrapper(store, { route: 'home', params: {}, entryId: topEntryId });

    const { result } = renderHook(() => useIsFocused(), { wrapper });

    // Open an overlay
    act(() => {
      store.dispatch({
        type: 'OPEN_OVERLAY',
        route: 'dialog',
        params: {},
        id: 'overlay-1',
        timestamp: 2000,
      });
    });

    expect(result.current).toBe(false);
  });

  it('returns false for non-top stack screen', () => {
    const state = createInitialState(
      { tabs: ['home'], initialTab: 'home' },
      testCreateId,
      () => 1000,
    );
    const store = createTestStore(state);
    const rootEntryId = store.getState().tabs.home.stack[0].id;
    const wrapper = createWrapper(store, { route: 'home', params: {}, entryId: rootEntryId });

    // Push a second screen on top
    act(() => {
      store.dispatch({
        type: 'PUSH',
        route: 'home/detail',
        params: {},
        id: 'pushed-entry',
        timestamp: 2000,
      });
    });

    const { result } = renderHook(() => useIsFocused(), { wrapper });

    // The root screen is no longer on top
    expect(result.current).toBe(false);
  });

  it('becomes true again when overlay closes', () => {
    const state = createInitialState(
      { tabs: ['home'], initialTab: 'home' },
      testCreateId,
      () => 1000,
    );
    const store = createTestStore(state);
    const topEntryId = store.getState().tabs.home.stack[0].id;
    const wrapper = createWrapper(store, { route: 'home', params: {}, entryId: topEntryId });

    const { result } = renderHook(() => useIsFocused(), { wrapper });

    // Open an overlay
    act(() => {
      store.dispatch({
        type: 'OPEN_OVERLAY',
        route: 'dialog',
        params: {},
        id: 'overlay-1',
        timestamp: 2000,
      });
    });

    expect(result.current).toBe(false);

    // Close the overlay
    act(() => {
      store.dispatch({ type: 'CLOSE_OVERLAY' });
    });

    expect(result.current).toBe(true);
  });

  it('returns true for top overlay in overlay stack', () => {
    const state = createInitialState(
      { tabs: ['home'], initialTab: 'home' },
      testCreateId,
      () => 1000,
    );
    const store = createTestStore(state);

    // Open an overlay
    act(() => {
      store.dispatch({
        type: 'OPEN_OVERLAY',
        route: 'dialog',
        params: {},
        id: 'overlay-1',
        timestamp: 2000,
      });
    });

    // Wrap with the overlay's entryId
    const wrapper = createWrapper(store, { route: 'dialog', params: {}, entryId: 'overlay-1' });

    const { result } = renderHook(() => useIsFocused(), { wrapper });

    expect(result.current).toBe(true);
  });

  it('returns false for non-top overlay', () => {
    const state = createInitialState(
      { tabs: ['home'], initialTab: 'home' },
      testCreateId,
      () => 1000,
    );
    const store = createTestStore(state);

    // Open two overlays
    act(() => {
      store.dispatch({
        type: 'OPEN_OVERLAY',
        route: 'dialog-a',
        params: {},
        id: 'overlay-a',
        timestamp: 2000,
      });
      store.dispatch({
        type: 'OPEN_OVERLAY',
        route: 'dialog-b',
        params: {},
        id: 'overlay-b',
        timestamp: 3000,
      });
    });

    // Wrap with the first (non-top) overlay's entryId
    const wrapper = createWrapper(store, {
      route: 'dialog-a',
      params: {},
      entryId: 'overlay-a',
    });

    const { result } = renderHook(() => useIsFocused(), { wrapper });

    expect(result.current).toBe(false);
  });

  it('throws when used outside NavigationProvider', () => {
    expect(() => {
      renderHook(() => useIsFocused());
    }).toThrow('useNavigationStore must be used within NavigationProvider');
  });
});
