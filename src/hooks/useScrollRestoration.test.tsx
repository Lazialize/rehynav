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
import {
  clearAllScrollPositions,
  removeScrollPosition,
  useScrollRestoration,
} from './useScrollRestoration.js';

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

  describe('cleanup', () => {
    it('removes scroll position when entry is popped from state', () => {
      clearAllScrollPositions();

      const state = createInitialState(
        { tabs: ['home'], initialTab: 'home' },
        testCreateId,
        () => 1000,
      );
      const store = createTestStore(state);

      // Push a second entry onto the stack
      const pushedId = testCreateId();
      act(() => {
        store.dispatch({
          type: 'PUSH',
          route: 'home/detail',
          params: {},
          id: pushedId,
          timestamp: 2000,
        });
      });

      const wrapper = createWrapper(store, { route: 'home/detail', params: {}, entryId: pushedId });
      const mockEl = createMockElement(200);

      const { unmount } = renderHook(
        () => {
          const ref = useRef<HTMLDivElement>(null);
          (ref as { current: HTMLDivElement | null }).current = mockEl;
          useScrollRestoration(ref);
          return ref;
        },
        { wrapper },
      );

      // Save a scroll position by triggering blur
      act(() => {
        store.dispatch({
          type: 'OPEN_OVERLAY',
          route: 'dialog',
          params: {},
          id: 'overlay-cleanup-1',
          timestamp: 3000,
        });
      });

      // Pop the entry from state (removes pushedId), then unmount
      act(() => {
        store.dispatch({ type: 'CLOSE_OVERLAY' });
        store.dispatch({ type: 'POP' });
      });
      unmount();

      // Re-mount with the same entryId — scroll position should NOT be restored
      // because it was cleaned up on unmount after entry was removed from state
      const mockEl2 = createMockElement(0);
      const wrapper2 = createWrapper(store, {
        route: 'home/detail',
        params: {},
        entryId: pushedId,
      });

      renderHook(
        () => {
          const ref = useRef<HTMLDivElement>(null);
          (ref as { current: HTMLDivElement | null }).current = mockEl2;
          useScrollRestoration(ref);
          return ref;
        },
        { wrapper: wrapper2 },
      );

      // scrollTo should not have been called with the old position
      expect(mockEl2.scrollTo).not.toHaveBeenCalled();
    });

    it('preserves scroll position when component unmounts but entry still in state (tab switch)', () => {
      clearAllScrollPositions();

      const state = createInitialState(
        { tabs: ['home', 'search'], initialTab: 'home' },
        testCreateId,
        () => 1000,
      );
      const store = createTestStore(state);
      const homeEntryId = store.getState().tabs.home.stack[0].id;
      const wrapper = createWrapper(store, { route: 'home', params: {}, entryId: homeEntryId });

      const mockEl = createMockElement(250);

      const { unmount } = renderHook(
        () => {
          const ref = useRef<HTMLDivElement>(null);
          (ref as { current: HTMLDivElement | null }).current = mockEl;
          useScrollRestoration(ref);
          return ref;
        },
        { wrapper },
      );

      // Trigger blur to save scroll position
      act(() => {
        store.dispatch({
          type: 'OPEN_OVERLAY',
          route: 'dialog',
          params: {},
          id: 'overlay-tab-1',
          timestamp: 2000,
        });
      });

      // Close overlay and switch tabs — entry stays in state but component unmounts
      // (simulates preserveState=false tab behavior)
      act(() => {
        store.dispatch({ type: 'CLOSE_OVERLAY' });
      });
      unmount();

      // Re-mount (simulates switching back to the tab)
      const mockEl2 = createMockElement(0);
      const wrapper2 = createWrapper(store, { route: 'home', params: {}, entryId: homeEntryId });

      renderHook(
        () => {
          const ref = useRef<HTMLDivElement>(null);
          (ref as { current: HTMLDivElement | null }).current = mockEl2;
          useScrollRestoration(ref);
          return ref;
        },
        { wrapper: wrapper2 },
      );

      // Scroll position SHOULD be restored because entry still exists in state
      expect(mockEl2.scrollTo).toHaveBeenCalledWith({ top: 250, behavior: 'instant' });
    });

    it('removeScrollPosition removes a specific entry', () => {
      clearAllScrollPositions();

      const state = createInitialState(
        { tabs: ['home'], initialTab: 'home' },
        testCreateId,
        () => 1000,
      );
      const store = createTestStore(state);
      const topEntryId = store.getState().tabs.home.stack[0].id;
      const wrapper = createWrapper(store, { route: 'home', params: {}, entryId: topEntryId });

      const mockEl = createMockElement(300);

      renderHook(
        () => {
          const ref = useRef<HTMLDivElement>(null);
          (ref as { current: HTMLDivElement | null }).current = mockEl;
          useScrollRestoration(ref);
          return ref;
        },
        { wrapper },
      );

      // Trigger blur to save scroll position
      act(() => {
        store.dispatch({
          type: 'OPEN_OVERLAY',
          route: 'dialog',
          params: {},
          id: 'overlay-remove-1',
          timestamp: 2000,
        });
      });

      // Remove the scroll position externally
      removeScrollPosition(topEntryId);

      // Close overlay to trigger focus — should NOT restore
      act(() => {
        store.dispatch({ type: 'CLOSE_OVERLAY' });
      });

      expect(mockEl.scrollTo).not.toHaveBeenCalledWith(expect.objectContaining({ top: 300 }));
    });

    it('clearAllScrollPositions removes all entries', () => {
      const state = createInitialState(
        { tabs: ['home'], initialTab: 'home' },
        testCreateId,
        () => 1000,
      );
      const store = createTestStore(state);
      const topEntryId = store.getState().tabs.home.stack[0].id;
      const wrapper = createWrapper(store, { route: 'home', params: {}, entryId: topEntryId });

      const mockEl = createMockElement(400);

      renderHook(
        () => {
          const ref = useRef<HTMLDivElement>(null);
          (ref as { current: HTMLDivElement | null }).current = mockEl;
          useScrollRestoration(ref);
          return ref;
        },
        { wrapper },
      );

      // Trigger blur to save scroll position
      act(() => {
        store.dispatch({
          type: 'OPEN_OVERLAY',
          route: 'dialog',
          params: {},
          id: 'overlay-clear-1',
          timestamp: 2000,
        });
      });

      // Clear all
      clearAllScrollPositions();

      // Close overlay to trigger focus — should NOT restore
      act(() => {
        store.dispatch({ type: 'CLOSE_OVERLAY' });
      });

      expect(mockEl.scrollTo).not.toHaveBeenCalledWith(expect.objectContaining({ top: 400 }));
    });
  });
});
