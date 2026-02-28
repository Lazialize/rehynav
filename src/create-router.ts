import type React from 'react';
import { createElement, useEffect, useMemo, useRef } from 'react';
import { createId } from './core/id.js';
import { createNavigationGuardRegistry } from './core/navigation-guard.js';
import { createInitialState } from './core/state.js';
import type { NavigationDirection, RouteInfo } from './core/types.js';
import {
  GuardRegistryContext,
  NavigationStoreContext,
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

  function NavigationProvider(props: NavigationProviderProps): React.ReactElement {
    const { children, urlSync = false, basePath = '/', onStateChange, initialState } = props;

    const storeRef = useRef<ReturnType<typeof createNavigationStore> | null>(null);
    if (storeRef.current === null) {
      storeRef.current = createNavigationStore(
        initialState ?? createInitialState({ tabs, initialTab }, createId, Date.now),
      );
    }
    const store = storeRef.current;

    const screenRegistry = useMemo(
      () => createScreenRegistry() as unknown as ScreenRegistryForHooks,
      [],
    );
    const guardRegistry = useMemo(() => createNavigationGuardRegistry(), []);

    useEffect(() => {
      if (!onStateChange) return;
      return store.subscribe(() => {
        onStateChange(store.getState());
      });
    }, [store, onStateChange]);

    useEffect(() => {
      if (!urlSync) return;
      const syncManager = new HistorySyncManager(store, basePath);
      syncManager.start();
      return () => syncManager.stop();
    }, [store, urlSync, basePath]);

    return createElement(
      NavigationStoreContext.Provider,
      { value: store },
      createElement(
        ScreenRegistryContext.Provider,
        { value: screenRegistry },
        createElement(GuardRegistryContext.Provider, { value: guardRegistry }, children),
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
