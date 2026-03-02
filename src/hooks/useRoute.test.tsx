import { renderHook } from '@testing-library/react';
import type React from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { createNavigationGuardRegistry } from '../core/navigation-guard.js';
import { createInitialState } from '../core/state.js';
import type { NavigationAction, NavigationState, Serializable } from '../core/types.js';
import type { NavigationStoreForHooks } from './context.js';
import { GuardRegistryContext, NavigationStoreContext, RouteContext } from './context.js';
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

function createWrapper(
  store: NavigationStoreForHooks,
  routeCtx?: { route: string; params: Record<string, Serializable>; entryId: string },
) {
  const guardRegistry = createNavigationGuardRegistry();
  return function Wrapper({ children }: { children: React.ReactNode }) {
    const inner = (
      <NavigationStoreContext.Provider value={store}>
        <GuardRegistryContext.Provider value={guardRegistry}>
          {children}
        </GuardRegistryContext.Provider>
      </NavigationStoreContext.Provider>
    );
    if (routeCtx) {
      return <RouteContext.Provider value={routeCtx}>{inner}</RouteContext.Provider>;
    }
    return inner;
  };
}

describe('useRoute', () => {
  beforeEach(() => {
    idCounter = 0;
  });

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
    expect(result.current.path).toBe('/home');
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
    expect(result.current.path).toBe('/login');
  });

  it('uses RouteContext for name/params but selector for path when screens layer is active', () => {
    const state = createInitialState(
      { tabs: ['home', 'search'], initialTab: 'home', initialScreen: 'login' },
      testCreateId,
      () => 1000,
    );
    const store = createTestStore(state);
    const routeCtx = { route: 'signup', params: { step: 2 }, entryId: 'ctx-entry' };
    const wrapper = createWrapper(store, routeCtx);

    const { result } = renderHook(() => useRoute(), { wrapper });

    // name/params come from RouteContext
    expect(result.current.name).toBe('signup');
    expect(result.current.params).toEqual({ step: 2 });
    // path comes from the selector (based on actual state, not context)
    expect(result.current.path).toBe('/login');
  });

  it('uses RouteContext for name/params but selector for path when tabs layer is active', () => {
    const state = createInitialState(
      { tabs: ['home', 'search'], initialTab: 'home' },
      testCreateId,
      () => 1000,
    );
    const store = createTestStore(state);
    const routeCtx = { route: 'home/detail', params: { id: 'abc' }, entryId: 'ctx-entry' };
    const wrapper = createWrapper(store, routeCtx);

    const { result } = renderHook(() => useRoute(), { wrapper });

    // name/params come from RouteContext
    expect(result.current.name).toBe('home/detail');
    expect(result.current.params).toEqual({ id: 'abc' });
    // path comes from the selector (based on actual state, not context)
    expect(result.current.path).toBe('/home');
  });

  it('falls back to tab stack when activeLayer is screens but screens stack is empty', () => {
    const state = createInitialState(
      { tabs: ['home', 'search'], initialTab: 'home' },
      testCreateId,
      () => 1000,
    );
    // Force activeLayer to screens while keeping screens stack empty
    const stateWithEmptyScreens: NavigationState = {
      ...state,
      activeLayer: 'screens',
      screens: [],
    };
    const store = createTestStore(stateWithEmptyScreens);
    const wrapper = createWrapper(store);

    const { result } = renderHook(() => useRoute(), { wrapper });

    expect(result.current.name).toBe('home');
    expect(result.current.params).toEqual({});
    expect(result.current.path).toBe('/home');
  });
});
