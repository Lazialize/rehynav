import type React from 'react';
import { createElement, useEffect, useRef } from 'react';
import { createId } from './core/id.js';
import { createNavigationGuardRegistry } from './core/navigation-guard.js';
import { parseRoutePatterns } from './core/path-params.js';
import { createInitialState } from './core/state.js';
import type { NavigationDirection, RouteInfo } from './core/types.js';
import {
  GuardRegistryContext,
  NavigationStoreContext,
  RoutePatternsContext,
  ScreenRegistryContext,
  type ScreenRegistryForHooks,
} from './hooks/context.js';
import { useBackHandler } from './hooks/useBackHandler.js';
import { useBeforeNavigate } from './hooks/useBeforeNavigate.js';
import type { ModalActions } from './hooks/useModal.js';
import { useModal } from './hooks/useModal.js';
import type { NavigationActions } from './hooks/useNavigation.js';
import { useNavigation } from './hooks/useNavigation.js';
import type { RouteInfoResult } from './hooks/useRoute.js';
import { useRoute } from './hooks/useRoute.js';
import type { SheetActions } from './hooks/useSheet.js';
import { useSheet } from './hooks/useSheet.js';
import type { TabActions } from './hooks/useTab.js';
import { useTab } from './hooks/useTab.js';
import type { OverlayDef, TabDef } from './route-helpers.js';
import { createNavigationStore } from './store/navigation-store.js';
import { createScreenRegistry, type ScreenRegistration } from './store/screen-registry.js';
import { HistorySyncManager } from './sync/history-sync.js';
import type { NavigationProviderProps } from './types/props.js';

export interface RouterConfig<
  TTabs extends TabDef[] = TabDef[],
  TModals extends OverlayDef[] = [],
  TSheets extends OverlayDef[] = [],
> {
  tabs: [...TTabs];
  modals?: [...TModals];
  sheets?: [...TSheets];
  initialTab: TTabs[number]['name'];
}

export interface RouterInstance {
  NavigationProvider: (props: NavigationProviderProps) => React.ReactElement;
  useNavigation: () => NavigationActions;
  useRoute: () => RouteInfoResult;
  useTab: () => TabActions;
  useModal: () => ModalActions;
  useSheet: () => SheetActions;
  useBeforeNavigate: (
    guard: (from: RouteInfo, to: RouteInfo, direction: NavigationDirection) => boolean,
  ) => void;
  useBackHandler: (handler: () => boolean) => void;
}

export function createRouter<
  TTabs extends TabDef[],
  TModals extends OverlayDef[],
  TSheets extends OverlayDef[],
>(config: RouterConfig<TTabs, TModals, TSheets>): RouterInstance {
  const { tabNames, registrations, routes } = parseConfig(config);
  const initialTab = config.initialTab as string;
  const routePatterns = routes.length > 0 ? parseRoutePatterns(routes) : undefined;

  function NavigationProvider(props: NavigationProviderProps): React.ReactElement {
    const { children, urlSync = false, basePath = '/', onStateChange, initialState } = props;

    const storeRef = useRef<ReturnType<typeof createNavigationStore> | null>(null);
    if (storeRef.current === null) {
      storeRef.current = createNavigationStore(
        initialState ?? createInitialState({ tabs: tabNames, initialTab }, createId, Date.now),
      );
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
      const syncManager = new HistorySyncManager(store, basePath, routePatterns);
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
    useModal,
    useSheet,
    useBeforeNavigate,
    useBackHandler,
  };
}

// --- Config parser ---

// biome-ignore lint/suspicious/noExplicitAny: accepts any config shape
function parseConfig(config: RouterConfig<any, any, any>): {
  tabNames: string[];
  registrations: ScreenRegistration[];
  routes: string[];
} {
  const tabNames: string[] = [];
  const registrations: ScreenRegistration[] = [];
  const routes: string[] = [];

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

  if (config.modals) {
    for (const modalDef of config.modals) {
      registrations.push({
        route: modalDef.name,
        component: modalDef.component,
        options: modalDef.options,
      });
    }
  }

  if (config.sheets) {
    for (const sheetDef of config.sheets) {
      registrations.push({
        route: sheetDef.name,
        component: sheetDef.component,
        options: sheetDef.options,
      });
    }
  }

  return { tabNames, registrations, routes };
}
