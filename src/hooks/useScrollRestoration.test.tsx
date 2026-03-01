import { act, renderHook } from '@testing-library/react';
import type React from 'react';
import { useRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createNavigationGuardRegistry } from '../core/navigation-guard.js';
import { navigationReducer } from '../core/reducer.js';
import { createInitialState } from '../core/state.js';
import type { NavigationAction, NavigationState } from '../core/types.js';
import type { Serializable } from '../types/serializable.js';
import type { NavigationStoreForHooks } from './context.js';
import { GuardRegistryContext, NavigationStoreContext, RouteContext } from './context.js';
import { useScrollRestoration } from './useScrollRestoration.js';

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
  return `test-scroll-id-${++idCounter}`;
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

function createMockElement(scrollTop = 0): HTMLDivElement {
  const el = document.createElement('div');
  Object.defineProperty(el, 'scrollTop', {
    get: () => scrollTop,
    set: vi.fn(),
    configurable: true,
  });
  el.scrollTo = vi.fn();
  return el;
}

describe('useScrollRestoration', () => {
  it('saves scroll position on blur and restores on focus', () => {
    const state = createInitialState(
      { tabs: ['home'], initialTab: 'home' },
      testCreateId,
      () => 1000,
    );
    const store = createTestStore(state);
    const topEntryId = store.getState().tabs.home.stack[0].id;
    const wrapper = createWrapper(store, { route: 'home', params: {}, entryId: topEntryId });

    const mockEl = createMockElement(150);

    const { result } = renderHook(
      () => {
        const ref = useRef<HTMLDivElement>(null);
        // Assign mock element to ref
        (ref as { current: HTMLDivElement | null }).current = mockEl;
        useScrollRestoration(ref);
        return ref;
      },
      { wrapper },
    );

    // Screen is focused, no saved position yet, scrollTo should not be called with a saved value
    // (no position was saved before)

    // Open overlay -> screen loses focus -> should save scroll position
    act(() => {
      store.dispatch({
        type: 'OPEN_OVERLAY',
        route: 'dialog',
        params: {},
        id: 'overlay-1',
        timestamp: 2000,
      });
    });

    // scrollTop was 150, so it should have been saved
    // Now close overlay -> screen regains focus -> should restore
    act(() => {
      store.dispatch({ type: 'CLOSE_OVERLAY' });
    });

    expect(mockEl.scrollTo).toHaveBeenCalledWith({ top: 150, behavior: 'instant' });
  });

  it('does nothing when ref is null (no throw)', () => {
    const state = createInitialState(
      { tabs: ['home'], initialTab: 'home' },
      testCreateId,
      () => 1000,
    );
    const store = createTestStore(state);
    const topEntryId = store.getState().tabs.home.stack[0].id;
    const wrapper = createWrapper(store, { route: 'home', params: {}, entryId: topEntryId });

    // Should not throw even when ref.current is null
    expect(() => {
      renderHook(
        () => {
          const ref = useRef<HTMLDivElement>(null);
          // ref.current remains null
          useScrollRestoration(ref);
          return ref;
        },
        { wrapper },
      );
    }).not.toThrow();
  });
});
