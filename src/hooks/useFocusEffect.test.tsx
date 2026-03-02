import { act, renderHook } from '@testing-library/react';
import type React from 'react';
import { useCallback } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createNavigationGuardRegistry } from '../core/navigation-guard.js';
import { navigationReducer } from '../core/reducer.js';
import { createInitialState } from '../core/state.js';
import type { NavigationAction, NavigationState } from '../core/types.js';
import type { Serializable } from '../types/serializable.js';
import type { NavigationStoreForHooks } from './context.js';
import { GuardRegistryContext, NavigationStoreContext, RouteContext } from './context.js';
import { useFocusEffect } from './useFocusEffect.js';

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
  return `test-focus-effect-id-${++idCounter}`;
}

function createWrapper(
  store: NavigationStoreForHooks,
  routeCtx: { route: string; params: Record<string, Serializable>; entryId: string },
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

describe('useFocusEffect', () => {
  it('calls effect immediately when screen is focused', () => {
    const state = createInitialState(
      { tabs: ['home'], initialTab: 'home' },
      testCreateId,
      () => 1000,
    );
    const store = createTestStore(state);
    const topEntryId = store.getState().tabs.home.stack[0].id;
    const wrapper = createWrapper(store, { route: 'home', params: {}, entryId: topEntryId });

    const effect = vi.fn();

    renderHook(
      () =>
        useFocusEffect(
          useCallback(() => {
            effect();
            return undefined;
          }, []),
        ),
      { wrapper },
    );

    expect(effect).toHaveBeenCalledTimes(1);
  });

  it('does not call effect when screen is not focused', () => {
    const state = createInitialState(
      { tabs: ['home', 'search'], initialTab: 'home' },
      testCreateId,
      () => 1000,
    );
    const store = createTestStore(state);
    // Use the search tab's root entry ID, but home is the active tab
    const searchEntryId = store.getState().tabs.search.stack[0].id;
    const wrapper = createWrapper(store, { route: 'search', params: {}, entryId: searchEntryId });

    const effect = vi.fn();

    renderHook(
      () =>
        useFocusEffect(
          useCallback(() => {
            effect();
            return undefined;
          }, []),
        ),
      { wrapper },
    );

    expect(effect).not.toHaveBeenCalled();
  });

  it('calls cleanup when screen loses focus (overlay opens)', () => {
    const state = createInitialState(
      { tabs: ['home'], initialTab: 'home' },
      testCreateId,
      () => 1000,
    );
    const store = createTestStore(state);
    const topEntryId = store.getState().tabs.home.stack[0].id;
    const wrapper = createWrapper(store, { route: 'home', params: {}, entryId: topEntryId });

    const cleanup = vi.fn();
    const effect = vi.fn(() => cleanup);

    renderHook(
      () =>
        useFocusEffect(
          useCallback(() => {
            return effect();
          }, []),
        ),
      { wrapper },
    );

    expect(effect).toHaveBeenCalledTimes(1);
    expect(cleanup).not.toHaveBeenCalled();

    // Open an overlay -> screen loses focus
    act(() => {
      store.dispatch({
        type: 'OPEN_OVERLAY',
        route: 'dialog',
        params: {},
        id: 'overlay-1',
        timestamp: 2000,
      });
    });

    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('re-calls effect when screen regains focus (overlay closes)', () => {
    const state = createInitialState(
      { tabs: ['home'], initialTab: 'home' },
      testCreateId,
      () => 1000,
    );
    const store = createTestStore(state);
    const topEntryId = store.getState().tabs.home.stack[0].id;
    const wrapper = createWrapper(store, { route: 'home', params: {}, entryId: topEntryId });

    const cleanup = vi.fn();
    const effect = vi.fn(() => cleanup);

    renderHook(
      () =>
        useFocusEffect(
          useCallback(() => {
            return effect();
          }, []),
        ),
      { wrapper },
    );

    expect(effect).toHaveBeenCalledTimes(1);

    // Open overlay -> lose focus
    act(() => {
      store.dispatch({
        type: 'OPEN_OVERLAY',
        route: 'dialog',
        params: {},
        id: 'overlay-2',
        timestamp: 2000,
      });
    });

    expect(cleanup).toHaveBeenCalledTimes(1);

    // Close overlay -> regain focus
    act(() => {
      store.dispatch({ type: 'CLOSE_OVERLAY' });
    });

    expect(effect).toHaveBeenCalledTimes(2);
  });

  it('calls cleanup on unmount', () => {
    const state = createInitialState(
      { tabs: ['home'], initialTab: 'home' },
      testCreateId,
      () => 1000,
    );
    const store = createTestStore(state);
    const topEntryId = store.getState().tabs.home.stack[0].id;
    const wrapper = createWrapper(store, { route: 'home', params: {}, entryId: topEntryId });

    const cleanup = vi.fn();
    const effect = vi.fn(() => cleanup);

    const { unmount } = renderHook(
      () =>
        useFocusEffect(
          useCallback(() => {
            return effect();
          }, []),
        ),
      { wrapper },
    );

    expect(effect).toHaveBeenCalledTimes(1);
    expect(cleanup).not.toHaveBeenCalled();

    unmount();

    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('re-runs effect when callback reference changes while focused', () => {
    const state = createInitialState(
      { tabs: ['home'], initialTab: 'home' },
      testCreateId,
      () => 1000,
    );
    const store = createTestStore(state);
    const topEntryId = store.getState().tabs.home.stack[0].id;
    const wrapper = createWrapper(store, { route: 'home', params: {}, entryId: topEntryId });

    const cleanup1 = vi.fn();
    const effect1 = vi.fn(() => cleanup1);
    const cleanup2 = vi.fn();
    const effect2 = vi.fn(() => cleanup2);

    // useCallback を意図的に使わない — レンダーごとに異なる参照を渡して
    // コールバック変更時の挙動を検証するため
    const cb1 = () => effect1();
    const cb2 = () => effect2();

    const { rerender } = renderHook(
      ({ cb }: { cb: () => (() => void) | undefined }) => useFocusEffect(cb),
      { wrapper, initialProps: { cb: cb1 } },
    );

    expect(effect1).toHaveBeenCalledTimes(1);
    expect(effect2).not.toHaveBeenCalled();

    // Change the callback reference while focused
    rerender({ cb: cb2 });

    // Old cleanup should have been called, new effect should have been called
    expect(cleanup1).toHaveBeenCalledTimes(1);
    expect(effect2).toHaveBeenCalledTimes(1);
  });
});
