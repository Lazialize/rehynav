import { act, render, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { getPathFromState, getStateFromPath } from '../core/matching.js';
import { buildRouteTree, type RouteContextMap } from '../core/route-tree.js';
import type { NavigationRoute, RouteNode } from '../core/types.js';
import { createController } from '../store/controller.js';
import { createNavigationStore, type NavigationStore } from '../store/navigation-store.js';
import {
  ControllerContext,
  NavigationStoreContext,
  RouteContext,
  type RouteContextValue,
  RouteTreeContext,
} from './context.js';
import { useNavigationStore, useRouteTree } from './internal.js';
import { useIsFocused } from './useIsFocused.js';
import { useRouter } from './useRouter.js';
import { useLocalSearchParams } from './useSearchParams.js';

const C = () => () => null;
function ctx(keys: string[]): RouteContextMap {
  const out: RouteContextMap = {};
  for (const key of keys) out[key] = { default: C() as never };
  return out;
}
const tree = buildRouteTree(
  ctx(['./app/_layout.tsx', './app/index.tsx', './app/posts/[id].tsx', './app/about.tsx']),
);

function makeWrapper(url: string, route?: RouteContextValue) {
  const store = createNavigationStore(getStateFromPath(url, tree).state);
  const controller = createController(store, tree, { basePath: '' });
  function Wrapper({ children }: { children: ReactNode }) {
    const inner = route ? (
      <RouteContext.Provider value={route}>{children}</RouteContext.Provider>
    ) : (
      children
    );
    return (
      <NavigationStoreContext.Provider value={store}>
        <ControllerContext.Provider value={controller}>
          <RouteTreeContext.Provider value={tree}>{inner}</RouteTreeContext.Provider>
        </ControllerContext.Provider>
      </NavigationStoreContext.Provider>
    );
  }
  return { store, Wrapper };
}

function node(name: string): RouteNode {
  return { type: 'screen', name, contextKey: name, component: null, children: [], dynamic: null };
}

describe('useRouter full API', () => {
  it('exposes every navigation method', () => {
    const { store, Wrapper } = makeWrapper('/');
    const { result } = renderHook(() => useRouter(), { wrapper: Wrapper });

    act(() => result.current.push('/posts/1'));
    expect(getPathFromState(store.getState())).toBe('/posts/1');
    expect(result.current.canGoBack()).toBe(true);

    act(() => result.current.replace('/posts/2'));
    expect(getPathFromState(store.getState())).toBe('/posts/2');

    act(() => result.current.setParams({ ref: 'x' }));
    expect(getPathFromState(store.getState())).toBe('/posts/2?ref=x');

    act(() => result.current.navigate('/about'));
    expect(getPathFromState(store.getState())).toBe('/about');

    act(() => result.current.back());
    expect(getPathFromState(store.getState())).toBe('/posts/2?ref=x');
  });
});

describe('useIsFocused branches', () => {
  it('returns true when used outside a screen', () => {
    const { Wrapper } = makeWrapper('/');
    const { result } = renderHook(() => useIsFocused(), { wrapper: Wrapper });
    expect(result.current).toBe(true);
  });

  it('returns false when the route is not on the active chain', () => {
    const inactive: RouteContextValue = {
      route: { key: 'not-active', name: 'about' },
      node: node('about'),
    };
    const { Wrapper } = makeWrapper('/', inactive);
    const { result } = renderHook(() => useIsFocused(), { wrapper: Wrapper });
    expect(result.current).toBe(false);
  });
});

describe('useLocalSearchParams branches', () => {
  it('returns an empty object when the route has no params', () => {
    const route: NavigationRoute = { key: 'k', name: 'index' };
    const { Wrapper } = makeWrapper('/', { route, node: node('index') });
    const { result } = renderHook(() => useLocalSearchParams(), { wrapper: Wrapper });
    expect(result.current).toEqual({});
  });
});

describe('provider guards', () => {
  it('throws from internal hooks without a provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<NavStoreProbe />)).toThrow(/inside <RouterProvider>/);
    expect(() => render(<TreeProbe />)).toThrow(/inside <RouterProvider>/);
    spy.mockRestore();
  });
});

function NavStoreProbe() {
  useNavigationStore();
  return null;
}
function TreeProbe() {
  useRouteTree();
  return null;
}
