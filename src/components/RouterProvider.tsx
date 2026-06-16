import { type ReactElement, useEffect, useMemo, useState } from 'react';
import { stripBasePath } from '../core/href.js';
import { getStateFromPath } from '../core/matching.js';
import { buildRouteTree, type RouteContextMap } from '../core/route-tree.js';
import type { NavigatorState, RouteNode } from '../core/types.js';
import {
  ControllerContext,
  NavigationStoreContext,
  NavigatorContext,
  RouteTreeContext,
} from '../hooks/context.js';
import { useRootState, useRouteTree } from '../hooks/internal.js';
import { setActiveController } from '../imperative-router.js';
import { createController, type NavigationController } from '../store/controller.js';
import { createNavigationStore, type NavigationStore } from '../store/navigation-store.js';
import { HistorySync } from '../sync/history-sync.js';
import { Slot } from './Slot.js';

export interface RouterProviderProps {
  /** Route modules, e.g. `import.meta.glob('./app/**\/*.tsx', { eager: true })`. */
  context: RouteContextMap;
  /** URL prefix the app is mounted under, e.g. `/app`. */
  basePath?: string;
  /** Initial URL to render. Defaults to the browser location (or `/` on the server). */
  initialUrl?: string;
  /** Keep the browser URL in sync with navigation state. Defaults to `true`. */
  enableUrlSync?: boolean;
}

interface RouterInstances {
  store: NavigationStore;
  controller: NavigationController;
  tree: RouteNode;
  sync: HistorySync;
  enableUrlSync: boolean;
}

function resolveInitialUrl(initialUrl: string | undefined, basePath: string): string {
  if (initialUrl !== undefined) return initialUrl;
  if (typeof window === 'undefined') return '/';
  return stripBasePath(`${window.location.pathname}${window.location.search}`, basePath);
}

/**
 * Root of a rehynav app. Builds the route tree from the `app/` directory context
 * map, sets up the store and history synchronization, and renders the root
 * layout. Equivalent in spirit to Expo Router's `ExpoRoot`.
 */
export function RouterProvider({
  context,
  basePath = '',
  initialUrl,
  enableUrlSync = true,
}: RouterProviderProps): ReactElement {
  const tree = useMemo(() => buildRouteTree(context), [context]);

  const [instances] = useState<RouterInstances>(() => {
    const url = resolveInitialUrl(initialUrl, basePath);
    const initialState: NavigatorState = getStateFromPath(url, tree).state;
    const store = createNavigationStore(initialState);
    const controller = createController(store, tree, { basePath });
    const sync = new HistorySync(store, tree, { basePath });
    setActiveController(controller);
    return { store, controller, tree, sync, enableUrlSync };
  });

  useEffect(() => {
    setActiveController(instances.controller);
    if (instances.enableUrlSync) instances.sync.start();
    return () => {
      if (instances.enableUrlSync) instances.sync.stop();
      setActiveController(null);
    };
  }, [instances]);

  return (
    <NavigationStoreContext.Provider value={instances.store}>
      <ControllerContext.Provider value={instances.controller}>
        <RouteTreeContext.Provider value={tree}>
          <RootNavigator />
        </RouteTreeContext.Provider>
      </ControllerContext.Provider>
    </NavigationStoreContext.Provider>
  );
}

/** Provides the root navigator context and renders the root layout component. */
function RootNavigator(): ReactElement {
  const tree = useRouteTree();
  const state = useRootState();
  const Layout = tree.component;
  return (
    <NavigatorContext.Provider value={{ state, layout: tree }}>
      {Layout ? <Layout /> : <Slot />}
    </NavigatorContext.Provider>
  );
}

/** Alias matching Expo Router's `ExpoRoot` naming. */
export function ExpoRoot(props: RouterProviderProps): ReactElement {
  return <RouterProvider {...props} />;
}
