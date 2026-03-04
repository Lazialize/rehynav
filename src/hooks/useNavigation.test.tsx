import { act, renderHook } from '@testing-library/react';
import type React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createNavigationGuardRegistry,
  type NavigationGuardRegistry,
} from '../core/navigation-guard.js';
import { parseRoutePatterns, type RoutePattern } from '../core/path-params.js';
import { navigationReducer } from '../core/reducer.js';
import { createInitialState } from '../core/state.js';
import type { NavigationAction, NavigationState } from '../core/types.js';
import type { NavigationStoreForHooks } from './context.js';
import { GuardRegistryContext, NavigationStoreContext, RoutePatternsContext } from './context.js';
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

const defaultRoutePatterns = parseRoutePatterns([
  'home',
  'home/detail',
  'home/detail/:id',
  'home/a',
  'home/b',
  'home/c',
  'home/replaced',
  'search',
  'search/results/:query',
  'profile',
  'profile/settings',
]);

function createWrapper(
  store: NavigationStoreForHooks,
  guardRegistry?: NavigationGuardRegistry,
  routePatterns?: Map<string, RoutePattern> | null,
) {
  const registry = guardRegistry ?? createNavigationGuardRegistry();
  const patterns = routePatterns === undefined ? defaultRoutePatterns : routePatterns;
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <NavigationStoreContext.Provider value={store}>
        <GuardRegistryContext.Provider value={registry}>
          <RoutePatternsContext.Provider value={patterns}>{children}</RoutePatternsContext.Provider>
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
      result.current.push('/home/detail/42');
    });

    const newState = store.getState();
    expect(newState.tabs.home.stack).toHaveLength(2);
    expect(newState.tabs.home.stack[1].route).toBe('home/detail/:id');
    expect(newState.tabs.home.stack[1].params).toEqual({ id: '42' });
  });

  it('push with no params route works', () => {
    const state = createInitialState(
      { tabs: ['home', 'search'], initialTab: 'home' },
      testCreateId,
      () => 1000,
    );
    const store = createTestStore(state);
    const wrapper = createWrapper(store);

    const { result } = renderHook(() => useNavigation(), { wrapper });

    act(() => {
      result.current.push('/home/detail');
    });

    const newState = store.getState();
    expect(newState.tabs.home.stack[1].route).toBe('home/detail');
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
      result.current.push('/home/detail');
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
      result.current.push('/home/a');
      result.current.push('/home/b');
      result.current.push('/home/c');
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
      result.current.replace('/home/replaced');
    });

    const newState = store.getState();
    expect(newState.tabs.home.stack).toHaveLength(1);
    expect(newState.tabs.home.stack[0].route).toBe('home/replaced');
    expect(newState.tabs.home.stack[0].params).toEqual({});
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
      result.current.push('/home/detail');
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
      result.current.push('/home/detail');
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

  describe('screen layer navigation', () => {
    const screenPatterns = parseRoutePatterns([
      'home',
      'home/detail',
      'home/detail/:id',
      'search',
      'login',
      'login/signup',
      'login/verify',
      'login/verify/:code',
    ]);

    it('navigateToTabs switches from screens to tabs', () => {
      const state = createInitialState(
        {
          tabs: ['home', 'search'],
          initialTab: 'home',
          initialScreen: 'login',
          screenNames: ['login'],
        },
        testCreateId,
        () => 1000,
      );
      const store = createTestStore(state);
      const wrapper = createWrapper(store, undefined, screenPatterns);

      const { result } = renderHook(() => useNavigation(), { wrapper });

      expect(store.getState().activeLayer).toBe('screens');

      act(() => {
        result.current.navigateToTabs();
      });

      expect(store.getState().activeLayer).toBe('tabs');
      expect(store.getState().screens).toEqual([]);
    });

    it('navigateToTabs switches to specific tab', () => {
      const state = createInitialState(
        {
          tabs: ['home', 'search'],
          initialTab: 'home',
          initialScreen: 'login',
          screenNames: ['login'],
        },
        testCreateId,
        () => 1000,
      );
      const store = createTestStore(state);
      const wrapper = createWrapper(store, undefined, screenPatterns);

      const { result } = renderHook(() => useNavigation(), { wrapper });

      act(() => {
        result.current.navigateToTabs('search');
      });

      expect(store.getState().activeTab).toBe('search');
    });

    it('navigateToScreen switches from tabs to screen', () => {
      const state = createInitialState(
        { tabs: ['home', 'search'], initialTab: 'home' },
        testCreateId,
        () => 1000,
      );
      const store = createTestStore(state);
      const wrapper = createWrapper(store, undefined, screenPatterns);

      const { result } = renderHook(() => useNavigation(), { wrapper });

      expect(store.getState().activeLayer).toBe('tabs');

      act(() => {
        result.current.navigateToScreen('/login');
      });

      expect(store.getState().activeLayer).toBe('screens');
      expect(store.getState().screens).toHaveLength(1);
      expect(store.getState().screens[0].route).toBe('login');
    });

    it('push dispatches PUSH_SCREEN when activeLayer is screens', () => {
      const state = createInitialState(
        {
          tabs: ['home', 'search'],
          initialTab: 'home',
          initialScreen: 'login',
          screenNames: ['login'],
        },
        testCreateId,
        () => 1000,
      );
      const store = createTestStore(state);
      const wrapper = createWrapper(store, undefined, screenPatterns);

      const { result } = renderHook(() => useNavigation(), { wrapper });

      act(() => {
        result.current.push('/login/signup');
      });

      expect(store.getState().screens).toHaveLength(2);
      expect(store.getState().screens[1].route).toBe('login/signup');
    });

    it('pop dispatches POP_SCREEN when activeLayer is screens', () => {
      const state = createInitialState(
        {
          tabs: ['home', 'search'],
          initialTab: 'home',
          initialScreen: 'login',
          screenNames: ['login'],
        },
        testCreateId,
        () => 1000,
      );
      const store = createTestStore(state);
      const wrapper = createWrapper(store, undefined, screenPatterns);

      const { result } = renderHook(() => useNavigation(), { wrapper });

      act(() => {
        result.current.push('/login/signup');
      });
      expect(store.getState().screens).toHaveLength(2);

      act(() => {
        result.current.pop();
      });
      expect(store.getState().screens).toHaveLength(1);
    });

    it('replace dispatches REPLACE_SCREEN when activeLayer is screens', () => {
      const state = createInitialState(
        {
          tabs: ['home', 'search'],
          initialTab: 'home',
          initialScreen: 'login',
          screenNames: ['login'],
        },
        testCreateId,
        () => 1000,
      );
      const store = createTestStore(state);
      const wrapper = createWrapper(store, undefined, screenPatterns);

      const { result } = renderHook(() => useNavigation(), { wrapper });

      act(() => {
        result.current.push('/login/signup');
      });
      expect(store.getState().screens).toHaveLength(2);

      act(() => {
        result.current.replace('/login/verify/1234');
      });

      const newState = store.getState();
      expect(newState.screens).toHaveLength(2);
      expect(newState.screens[1].route).toBe('login/verify/:code');
      expect(newState.screens[1].params).toEqual({ code: '1234' });
    });

    it('popToRoot dispatches POP_SCREEN_TO_ROOT when activeLayer is screens', () => {
      const state = createInitialState(
        {
          tabs: ['home', 'search'],
          initialTab: 'home',
          initialScreen: 'login',
          screenNames: ['login'],
        },
        testCreateId,
        () => 1000,
      );
      const store = createTestStore(state);
      const wrapper = createWrapper(store, undefined, screenPatterns);

      const { result } = renderHook(() => useNavigation(), { wrapper });

      act(() => {
        result.current.push('/login/signup');
        result.current.push('/login/verify');
      });
      expect(store.getState().screens).toHaveLength(3);

      act(() => {
        result.current.popToRoot();
      });

      const newState = store.getState();
      expect(newState.screens).toHaveLength(1);
      expect(newState.screens[0].route).toBe('login');
    });

    it('popToRoot is a no-op when screen stack has only root', () => {
      const state = createInitialState(
        {
          tabs: ['home', 'search'],
          initialTab: 'home',
          initialScreen: 'login',
          screenNames: ['login'],
        },
        testCreateId,
        () => 1000,
      );
      const store = createTestStore(state);
      const wrapper = createWrapper(store, undefined, screenPatterns);

      const { result } = renderHook(() => useNavigation(), { wrapper });

      act(() => {
        result.current.popToRoot();
      });

      expect(store.getState().screens).toHaveLength(1);
    });

    it('replace is blocked by guard on screens layer', () => {
      const state = createInitialState(
        {
          tabs: ['home', 'search'],
          initialTab: 'home',
          initialScreen: 'login',
          screenNames: ['login'],
        },
        testCreateId,
        () => 1000,
      );
      const store = createTestStore(state);
      const guardRegistry = createNavigationGuardRegistry();
      guardRegistry.register('block-replace', () => false);
      const wrapper = createWrapper(store, guardRegistry, screenPatterns);

      const { result } = renderHook(() => useNavigation(), { wrapper });

      act(() => {
        result.current.replace('/login/verify');
      });

      expect(store.getState().screens).toHaveLength(1);
      expect(store.getState().screens[0].route).toBe('login');
    });

    it('popToRoot is blocked by guard on screens layer', () => {
      const state = createInitialState(
        {
          tabs: ['home', 'search'],
          initialTab: 'home',
          initialScreen: 'login',
          screenNames: ['login'],
        },
        testCreateId,
        () => 1000,
      );
      const store = createTestStore(state);
      const guardRegistry = createNavigationGuardRegistry();
      guardRegistry.register('block-back', (_from, _to, direction) => direction !== 'back');
      const wrapper = createWrapper(store, guardRegistry, screenPatterns);

      const { result } = renderHook(() => useNavigation(), { wrapper });

      act(() => {
        result.current.push('/login/signup');
        result.current.push('/login/verify');
      });
      expect(store.getState().screens).toHaveLength(3);

      act(() => {
        result.current.popToRoot();
      });

      expect(store.getState().screens).toHaveLength(3);
    });

    it('canGoBack returns true when screen stack has more than one entry', () => {
      const state = createInitialState(
        {
          tabs: ['home', 'search'],
          initialTab: 'home',
          initialScreen: 'login',
          screenNames: ['login'],
        },
        testCreateId,
        () => 1000,
      );
      const store = createTestStore(state);
      const wrapper = createWrapper(store, undefined, screenPatterns);

      const { result } = renderHook(() => useNavigation(), { wrapper });

      expect(result.current.canGoBack()).toBe(false);

      act(() => {
        result.current.push('/login/signup');
      });

      expect(result.current.canGoBack()).toBe(true);
    });
  });

  describe('serializable validation in development', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
      vi.restoreAllMocks();
    });

    it('push warns for unmatched path in development', () => {
      process.env.NODE_ENV = 'development';
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const state = createInitialState(
        { tabs: ['home', 'search'], initialTab: 'home' },
        testCreateId,
        () => 1000,
      );
      const store = createTestStore(state);
      const wrapper = createWrapper(store);

      const { result } = renderHook(() => useNavigation(), { wrapper });

      act(() => {
        result.current.push('/unknown/route');
      });

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('No route pattern matched'));
    });

    it('push does not warn for valid path', () => {
      process.env.NODE_ENV = 'development';
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const state = createInitialState(
        { tabs: ['home', 'search'], initialTab: 'home' },
        testCreateId,
        () => 1000,
      );
      const store = createTestStore(state);
      const wrapper = createWrapper(store);

      const { result } = renderHook(() => useNavigation(), { wrapper });

      act(() => {
        result.current.push('/home/detail/42');
      });

      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('preload warns for unmatched path in development', () => {
      process.env.NODE_ENV = 'development';
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const state = createInitialState(
        { tabs: ['home', 'search'], initialTab: 'home' },
        testCreateId,
        () => 1000,
      );
      const store = createTestStore(state);
      const wrapper = createWrapper(store);

      const { result } = renderHook(() => useNavigation(), { wrapper });

      act(() => {
        result.current.preload('/unknown/route');
      });

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('No route pattern matched'));
    });
  });

  describe('resolved path navigation', () => {
    const routePatterns = parseRoutePatterns([
      'home',
      'home/detail/:id',
      'search',
      'search/results/:query',
      'profile',
    ]);

    it('push with resolved path extracts route and params', () => {
      const state = createInitialState(
        { tabs: ['home', 'search', 'profile'], initialTab: 'home' },
        testCreateId,
        () => 1000,
      );
      const store = createTestStore(state);
      const wrapper = createWrapper(store, undefined, routePatterns);

      const { result } = renderHook(() => useNavigation(), { wrapper });

      act(() => {
        result.current.push('/home/detail/42');
      });

      const newState = store.getState();
      expect(newState.tabs.home.stack).toHaveLength(2);
      expect(newState.tabs.home.stack[1].route).toBe('home/detail/:id');
      expect(newState.tabs.home.stack[1].params).toEqual({ id: '42' });
    });

    it('replace with resolved path extracts route and params', () => {
      const state = createInitialState(
        { tabs: ['home', 'search', 'profile'], initialTab: 'home' },
        testCreateId,
        () => 1000,
      );
      const store = createTestStore(state);
      const wrapper = createWrapper(store, undefined, routePatterns);

      const { result } = renderHook(() => useNavigation(), { wrapper });

      act(() => {
        result.current.replace('/home/detail/99');
      });

      const newState = store.getState();
      expect(newState.tabs.home.stack).toHaveLength(1);
      expect(newState.tabs.home.stack[0].route).toBe('home/detail/:id');
      expect(newState.tabs.home.stack[0].params).toEqual({ id: '99' });
    });

    it('push with resolved path to non-parameterized route works', () => {
      const state = createInitialState(
        { tabs: ['home', 'search', 'profile'], initialTab: 'home' },
        testCreateId,
        () => 1000,
      );
      const store = createTestStore(state);
      const wrapper = createWrapper(store, undefined, routePatterns);

      const { result } = renderHook(() => useNavigation(), { wrapper });

      act(() => {
        result.current.push('/search');
      });

      const newState = store.getState();
      expect(newState.activeTab).toBe('search');
      expect(newState.tabs.search.stack).toHaveLength(2);
      expect(newState.tabs.search.stack[1].route).toBe('search');
      expect(newState.tabs.search.stack[1].params).toEqual({});
    });

    it('push with unmatched resolved path warns and does nothing', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const state = createInitialState(
        { tabs: ['home', 'search', 'profile'], initialTab: 'home' },
        testCreateId,
        () => 1000,
      );
      const store = createTestStore(state);
      const wrapper = createWrapper(store, undefined, routePatterns);

      const { result } = renderHook(() => useNavigation(), { wrapper });

      act(() => {
        result.current.push('/unknown/route');
      });

      expect(store.getState().tabs.home.stack).toHaveLength(1);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('No route pattern matched'));
      warnSpy.mockRestore();
    });

    it('push without routePatterns context warns', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const state = createInitialState(
        { tabs: ['home', 'search', 'profile'], initialTab: 'home' },
        testCreateId,
        () => 1000,
      );
      const store = createTestStore(state);
      const wrapper = createWrapper(store, undefined, null);

      const { result } = renderHook(() => useNavigation(), { wrapper });

      act(() => {
        result.current.push('/home/detail/42');
      });

      expect(store.getState().tabs.home.stack).toHaveLength(1);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('route patterns are not available'),
      );
      warnSpy.mockRestore();
    });

    it('navigateToScreen with resolved path extracts route and params', () => {
      const screenPatterns = parseRoutePatterns(['login', 'login/verify/:code']);
      const state = createInitialState(
        { tabs: ['home', 'search'], initialTab: 'home' },
        testCreateId,
        () => 1000,
      );
      const store = createTestStore(state);
      const wrapper = createWrapper(store, undefined, screenPatterns);

      const { result } = renderHook(() => useNavigation(), { wrapper });

      act(() => {
        result.current.navigateToScreen('/login/verify/abc123');
      });

      const newState = store.getState();
      expect(newState.activeLayer).toBe('screens');
      expect(newState.screens).toHaveLength(1);
      expect(newState.screens[0].route).toBe('login/verify/:code');
      expect(newState.screens[0].params).toEqual({ code: 'abc123' });
    });
  });
});
