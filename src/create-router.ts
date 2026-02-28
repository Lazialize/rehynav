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
import { createNavigationStore } from './store/navigation-store.js';
import { createScreenRegistry } from './store/screen-registry.js';
import { HistorySyncManager } from './sync/history-sync.js';
import type { NavigationProviderProps } from './types/props.js';
import type { RouteMap } from './types/routes.js';

export interface RouterConfig<R extends RouteMap> {
  tabs: Array<keyof R['tabs'] & string>;
  initialTab: keyof R['tabs'] & string;
  routes?: string[];
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

export function createRouter<R extends RouteMap>(config: RouterConfig<R>): RouterInstance {
  const tabs = config.tabs as string[];
  const initialTab = config.initialTab as string;
  const routePatterns = config.routes ? parseRoutePatterns(config.routes) : undefined;

  function NavigationProvider(props: NavigationProviderProps): React.ReactElement {
    const { children, urlSync = false, basePath = '/', onStateChange, initialState } = props;

    const storeRef = useRef<ReturnType<typeof createNavigationStore> | null>(null);
    if (storeRef.current === null) {
      storeRef.current = createNavigationStore(
        initialState ?? createInitialState({ tabs, initialTab }, createId, Date.now),
      );
    }
    const store = storeRef.current;

    const screenRegistryRef = useRef<ScreenRegistryForHooks | null>(null);
    if (screenRegistryRef.current === null) {
      screenRegistryRef.current = createScreenRegistry() as unknown as ScreenRegistryForHooks;
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
    NavigationProvider: NavigationProvider,
    useNavigation: useNavigation,
    useRoute: useRoute,
    useTab: useTab,
    useModal: useModal,
    useSheet: useSheet,
    useBeforeNavigate: useBeforeNavigate,
    useBackHandler: useBackHandler,
  };
}
