import type React from 'react';
import { useEffect, useRef } from 'react';
import { createId } from '../core/id.js';
import { createNavigationGuardRegistry } from '../core/navigation-guard.js';
import { createInitialState } from '../core/state.js';
import type { NavigationState } from '../core/types.js';
import type { ScreenRegistryForHooks } from '../hooks/context.js';
import {
  GuardRegistryContext,
  NavigationStoreContext,
  ScreenRegistryContext,
} from '../hooks/context.js';
import { createNavigationStore } from '../store/navigation-store.js';
import { createScreenRegistry } from '../store/screen-registry.js';

export interface NavigationProviderProps {
  children: React.ReactNode;
  routerConfig: { tabs: string[]; initialTab: string };
  urlSync?: boolean;
  basePath?: string;
  onStateChange?: (state: NavigationState) => void;
  initialState?: NavigationState;
}

export function NavigationProvider({
  children,
  routerConfig,
  urlSync: _urlSync,
  basePath: _basePath,
  onStateChange,
  initialState,
}: NavigationProviderProps): React.ReactElement {
  const storeRef = useRef<ReturnType<typeof createNavigationStore> | null>(null);
  const screenRegistryRef = useRef<ReturnType<typeof createScreenRegistry> | null>(null);
  const guardRegistryRef = useRef<ReturnType<typeof createNavigationGuardRegistry> | null>(null);

  if (storeRef.current === null) {
    storeRef.current = createNavigationStore(
      initialState ?? createInitialState(routerConfig, createId, Date.now),
    );
  }
  if (screenRegistryRef.current === null) {
    screenRegistryRef.current = createScreenRegistry();
  }
  if (guardRegistryRef.current === null) {
    guardRegistryRef.current = createNavigationGuardRegistry();
  }

  const store = storeRef.current;
  const screenRegistry = screenRegistryRef.current;
  const guardRegistry = guardRegistryRef.current;

  // Subscribe to state changes
  useEffect(() => {
    if (!onStateChange) return;
    return store.subscribe(() => {
      onStateChange(store.getState());
    });
  }, [store, onStateChange]);

  // Dev mode: check registration completeness
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;

    const timer = setTimeout(() => {
      const state = store.getState();
      const allRoutes = new Set<string>();

      for (const tab of state.tabOrder) {
        for (const entry of state.tabs[tab].stack) {
          allRoutes.add(entry.route);
        }
      }

      for (const route of allRoutes) {
        if (!screenRegistry.get(route)) {
          console.warn(
            `[rehynav] Route "${route}" is in the navigation state but has no registered Screen component.`,
          );
        }
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [store, screenRegistry]);

  return (
    <NavigationStoreContext.Provider value={store}>
      <ScreenRegistryContext.Provider value={screenRegistry as unknown as ScreenRegistryForHooks}>
        <GuardRegistryContext.Provider value={guardRegistry}>
          {children}
        </GuardRegistryContext.Provider>
      </ScreenRegistryContext.Provider>
    </NavigationStoreContext.Provider>
  );
}
