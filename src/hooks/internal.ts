import { useContext, useSyncExternalStore } from 'react';
import type { NavigatorState, RouteNode } from '../core/types.js';
import type { NavigationController } from '../store/controller.js';
import type { NavigationStore } from '../store/navigation-store.js';
import { ControllerContext, NavigationStoreContext, RouteTreeContext } from './context.js';

export function useNavigationStore(): NavigationStore {
  const store = useContext(NavigationStoreContext);
  if (!store) {
    throw new Error('rehynav: navigation hooks must be used inside <RouterProvider>.');
  }
  return store;
}

export function useController(): NavigationController {
  const controller = useContext(ControllerContext);
  if (!controller) {
    throw new Error('rehynav: navigation hooks must be used inside <RouterProvider>.');
  }
  return controller;
}

export function useRouteTree(): RouteNode {
  const tree = useContext(RouteTreeContext);
  if (!tree) {
    throw new Error('rehynav: navigation hooks must be used inside <RouterProvider>.');
  }
  return tree;
}

/** Subscribes to the full navigation state. */
export function useRootState(): NavigatorState {
  const store = useNavigationStore();
  return useSyncExternalStore(store.subscribe, store.getState, store.getServerSnapshot);
}
