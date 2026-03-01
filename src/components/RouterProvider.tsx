import type React from 'react';
import { createElement, useEffect, useRef } from 'react';
import { createId } from '../core/id.js';
import { createNavigationGuardRegistry } from '../core/navigation-guard.js';
import { createInitialState } from '../core/state.js';
import type { NavigationState } from '../core/types.js';
import { urlToState } from '../core/url.js';
import type { RouterInstance } from '../create-router.js';
import {
  GuardRegistryContext,
  NavigationStoreContext,
  RoutePatternsContext,
  ScreenRegistryContext,
  type ScreenRegistryForHooks,
} from '../hooks/context.js';
import { createNavigationStore } from '../store/navigation-store.js';
import { createScreenRegistry } from '../store/screen-registry.js';
import { HistorySyncManager } from '../sync/history-sync.js';
import { TabNavigator } from './TabNavigator.js';

export interface RouterProviderProps {
  router: RouterInstance;
}

export function RouterProvider({ router }: RouterProviderProps): React.ReactElement {
  const { tabNames, screenNames, registrations, routePatterns, initialTab, initialScreen, config } =
    router._internal;

  const storeRef = useRef<ReturnType<typeof createNavigationStore> | null>(null);
  if (storeRef.current === null) {
    let resolvedInitialState: NavigationState;
    if (config.global.initialState) {
      resolvedInitialState = config.global.initialState;
    } else if (config.global.urlSync && typeof window !== 'undefined') {
      resolvedInitialState = urlToState(
        window.location.pathname + window.location.search,
        { tabs: tabNames, initialTab, initialScreen, screenNames },
        config.global.basePath ?? '/',
        createId,
        Date.now,
        routePatterns,
      );
    } else {
      resolvedInitialState = createInitialState(
        { tabs: tabNames, initialTab, initialScreen, screenNames },
        createId,
        Date.now,
      );
    }
    storeRef.current = createNavigationStore(resolvedInitialState);
  }
  const store = storeRef.current;

  const screenRegistryRef = useRef<ScreenRegistryForHooks | null>(null);
  if (screenRegistryRef.current === null) {
    const registry = createScreenRegistry();
    for (const reg of registrations) {
      registry.register(reg);
    }
    screenRegistryRef.current = registry as unknown as ScreenRegistryForHooks;
  }
  const screenRegistry = screenRegistryRef.current;

  const guardRegistryRef = useRef<ReturnType<typeof createNavigationGuardRegistry> | null>(null);
  if (guardRegistryRef.current === null) {
    guardRegistryRef.current = createNavigationGuardRegistry();
  }
  const guardRegistry = guardRegistryRef.current;

  useEffect(() => {
    if (!config.global.onStateChange) return;
    return store.subscribe(() => {
      config.global.onStateChange?.(store.getState());
    });
  }, [store, config.global.onStateChange]);

  useEffect(() => {
    if (!config.global.urlSync) return;
    const syncManager = new HistorySyncManager(
      store,
      config.global.basePath ?? '/',
      routePatterns,
      {
        tabs: tabNames,
        initialTab,
        createId,
        now: Date.now,
        initialScreen,
        screenNames,
      },
    );
    syncManager.start();
    return () => syncManager.stop();
  }, [
    store,
    config.global.urlSync,
    config.global.basePath,
    routePatterns,
    tabNames,
    initialTab,
    initialScreen,
    screenNames,
  ]);

  const tabsOptions = config.tabsLayer.options;

  return createElement(
    NavigationStoreContext.Provider,
    { value: store },
    createElement(
      ScreenRegistryContext.Provider,
      { value: screenRegistry },
      createElement(
        GuardRegistryContext.Provider,
        { value: guardRegistry },
        createElement(
          RoutePatternsContext.Provider,
          { value: routePatterns ?? null },
          createElement(TabNavigator, {
            tabBar: tabsOptions.tabBar,
            tabBarPosition: tabsOptions.tabBarPosition,
            preserveState: tabsOptions.preserveState,
            lazy: tabsOptions.lazy,
            maxStackDepth: tabsOptions.maxStackDepth,
            suspenseFallback: tabsOptions.suspenseFallback,
            errorFallback: tabsOptions.errorFallback,
          }),
        ),
      ),
    ),
  );
}
