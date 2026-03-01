import type React from 'react';
import { createElement, type RefObject, useEffect, useRef } from 'react';
import { createId } from './core/id.js';
import { createNavigationGuardRegistry } from './core/navigation-guard.js';
import { parseRoutePatterns } from './core/path-params.js';
import { createInitialState } from './core/state.js';
import type { NavigationDirection, NavigationState, RouteInfo } from './core/types.js';
import { urlToState } from './core/url.js';
import {
  GuardRegistryContext,
  NavigationStoreContext,
  RoutePatternsContext,
  ScreenRegistryContext,
  type ScreenRegistryForHooks,
} from './hooks/context.js';
import { useBackHandler } from './hooks/useBackHandler.js';
import { useBeforeNavigate } from './hooks/useBeforeNavigate.js';
import { useFocusEffect } from './hooks/useFocusEffect.js';
import { useIsFocused } from './hooks/useIsFocused.js';
import type { NavigationActions } from './hooks/useNavigation.js';
import { useNavigation } from './hooks/useNavigation.js';
import type { OverlayActions } from './hooks/useOverlay.js';
import { useOverlay } from './hooks/useOverlay.js';
import type { RouteInfoResult } from './hooks/useRoute.js';
import { useRoute } from './hooks/useRoute.js';
import { useScrollRestoration } from './hooks/useScrollRestoration.js';
import type { TabActions } from './hooks/useTab.js';
import { useTab } from './hooks/useTab.js';
import type { OverlayDef, ScreenDef, TabDef } from './route-helpers.js';
import { createNavigationStore } from './store/navigation-store.js';
import { createScreenRegistry, type ScreenRegistration } from './store/screen-registry.js';
import { HistorySyncManager } from './sync/history-sync.js';
import type { NavigationProviderProps } from './types/props.js';

export interface RouterConfig<
  TTabs extends TabDef[] = TabDef[],
  TOverlays extends OverlayDef[] = [],
  TScreens extends ScreenDef[] = [],
> {
  tabs: [...TTabs];
  overlays?: [...TOverlays];
  screens?: [...TScreens];
  initialTab: TTabs[number]['name'];
  initialScreen?: string;
}

export interface RouterInstance {
  NavigationProvider: (props: NavigationProviderProps) => React.ReactElement;
  useNavigation: () => NavigationActions;
  useRoute: () => RouteInfoResult;
  useTab: () => TabActions;
  useOverlay: () => OverlayActions;
  useBeforeNavigate: (
    guard: (from: RouteInfo, to: RouteInfo, direction: NavigationDirection) => boolean,
  ) => void;
  useBackHandler: (handler: () => boolean) => void;
  useFocusEffect: (callback: () => undefined | (() => void)) => void;
  useIsFocused: () => boolean;
  useScrollRestoration: (ref: RefObject<HTMLElement | null>) => void;
}

export function createRouter<
  TTabs extends TabDef[],
  TOverlays extends OverlayDef[],
  TScreens extends ScreenDef[],
>(config: RouterConfig<TTabs, TOverlays, TScreens>): RouterInstance {
  const { tabNames, screenNames, registrations, routes } = parseConfig(config);
  const initialTab = config.initialTab as string;
  const initialScreen = config.initialScreen as string | undefined;
  const routePatterns = routes.length > 0 ? parseRoutePatterns(routes) : undefined;

  function NavigationProvider(props: NavigationProviderProps): React.ReactElement {
    const { children, urlSync = false, basePath = '/', onStateChange, initialState } = props;

    const storeRef = useRef<ReturnType<typeof createNavigationStore> | null>(null);
    if (storeRef.current === null) {
      let resolvedInitialState: NavigationState;
      if (initialState) {
        resolvedInitialState = initialState;
      } else if (urlSync && typeof window !== 'undefined') {
        resolvedInitialState = urlToState(
          window.location.pathname + window.location.search,
          { tabs: tabNames, initialTab, initialScreen, screenNames },
          basePath,
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
      if (!onStateChange) return;
      return store.subscribe(() => {
        onStateChange(store.getState());
      });
    }, [store, onStateChange]);

    useEffect(() => {
      if (!urlSync) return;
      const syncManager = new HistorySyncManager(store, basePath, routePatterns, {
        tabs: tabNames,
        initialTab,
        createId,
        now: Date.now,
        initialScreen,
        screenNames,
      });
      syncManager.start();
      return () => syncManager.stop();
    }, [store, urlSync, basePath]);

    return createElement(
      NavigationStoreContext.Provider,
      { value: store },
      createElement(
        ScreenRegistryContext.Provider,
        { value: screenRegistry },
        createElement(
          GuardRegistryContext.Provider,
          { value: guardRegistry },
          createElement(RoutePatternsContext.Provider, { value: routePatterns ?? null }, children),
        ),
      ),
    );
  }

  return {
    NavigationProvider,
    useNavigation,
    useRoute,
    useTab,
    useOverlay,
    useBeforeNavigate,
    useBackHandler,
    useFocusEffect,
    useIsFocused,
    useScrollRestoration,
  };
}

// --- Config parser ---

// biome-ignore lint/suspicious/noExplicitAny: accepts any config shape
function parseConfig(config: RouterConfig<any, any, any>): {
  tabNames: string[];
  screenNames: string[];
  registrations: ScreenRegistration[];
  routes: string[];
} {
  const tabNames: string[] = [];
  const screenNames: string[] = [];
  const registrations: ScreenRegistration[] = [];
  const routes: string[] = [];

  // Parse screens
  if (config.screens) {
    for (const screenDef of config.screens) {
      screenNames.push(screenDef.name);
      registrations.push({ route: screenDef.name, component: screenDef.component });
      routes.push(screenDef.name);

      for (const stackDef of screenDef.children) {
        const fullRoute = `${screenDef.name}/${stackDef.path}`;
        registrations.push({
          route: fullRoute,
          component: stackDef.component,
          options: stackDef.options,
        });
        routes.push(fullRoute);
      }
    }
  }

  // Parse tabs
  for (const tabDef of config.tabs) {
    tabNames.push(tabDef.name);
    registrations.push({ route: tabDef.name, component: tabDef.component });
    routes.push(tabDef.name);

    for (const stackDef of tabDef.children) {
      const fullRoute = `${tabDef.name}/${stackDef.path}`;
      registrations.push({
        route: fullRoute,
        component: stackDef.component,
        options: stackDef.options,
      });
      routes.push(fullRoute);
    }
  }

  // Parse overlays
  if (config.overlays) {
    for (const overlayDef of config.overlays) {
      registrations.push({
        route: overlayDef.name,
        component: overlayDef.component,
        options: overlayDef.options,
      });
    }
  }

  return { tabNames, screenNames, registrations, routes };
}
