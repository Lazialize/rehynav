import { useMemo } from 'react';
import { createId } from '../core/id.js';
import { getCurrentRouteInfo } from '../core/route-utils.js';
import type { RouteInfo, Serializable } from '../core/types.js';
import { useGuardRegistry, useNavigationStore } from './context.js';

export interface NavigationActions {
  push(to: string, params?: Record<string, Serializable>): void;
  pop(): void;
  popToRoot(): void;
  replace(to: string, params?: Record<string, Serializable>): void;
  goBack(): void;
  canGoBack(): boolean;
}

export function useNavigation(): NavigationActions {
  const store = useNavigationStore();
  const guardRegistry = useGuardRegistry();

  return useMemo(
    () => ({
      push(to: string, params: Record<string, Serializable> = {}) {
        const from = getCurrentRouteInfo(store.getState());
        const toInfo: RouteInfo = { route: to, params };
        if (!guardRegistry.check(from, toInfo, 'push')) return;
        store.dispatch({
          type: 'PUSH',
          route: to,
          params,
          id: createId(),
          timestamp: Date.now(),
        });
      },
      pop() {
        const state = store.getState();
        const activeTab = state.tabs[state.activeTab];
        if (activeTab.stack.length <= 1) return;
        const from = getCurrentRouteInfo(state);
        const prevEntry = activeTab.stack[activeTab.stack.length - 2];
        const toInfo: RouteInfo = { route: prevEntry.route, params: prevEntry.params };
        if (!guardRegistry.check(from, toInfo, 'back')) return;
        store.dispatch({ type: 'POP' });
      },
      popToRoot() {
        const state = store.getState();
        const activeTab = state.tabs[state.activeTab];
        if (activeTab.stack.length <= 1) return;
        const from = getCurrentRouteInfo(state);
        const rootEntry = activeTab.stack[0];
        const toInfo: RouteInfo = { route: rootEntry.route, params: rootEntry.params };
        if (!guardRegistry.check(from, toInfo, 'back')) return;
        store.dispatch({ type: 'POP_TO_ROOT' });
      },
      replace(to: string, params: Record<string, Serializable> = {}) {
        const from = getCurrentRouteInfo(store.getState());
        const toInfo: RouteInfo = { route: to, params };
        if (!guardRegistry.check(from, toInfo, 'replace')) return;
        store.dispatch({
          type: 'REPLACE',
          route: to,
          params,
          id: createId(),
          timestamp: Date.now(),
        });
      },
      goBack() {
        const state = store.getState();
        const from = getCurrentRouteInfo(state);
        let toInfo: RouteInfo;

        if (state.overlays.length > 0) {
          // Closing overlay: destination is either previous overlay or top stack entry
          if (state.overlays.length > 1) {
            const prevOverlay = state.overlays[state.overlays.length - 2];
            toInfo = { route: prevOverlay.route, params: prevOverlay.params };
          } else {
            const activeTab = state.tabs[state.activeTab];
            const topEntry = activeTab.stack[activeTab.stack.length - 1];
            toInfo = { route: topEntry.route, params: topEntry.params };
          }
        } else {
          const activeTab = state.tabs[state.activeTab];
          if (activeTab.stack.length <= 1) return;
          const prevEntry = activeTab.stack[activeTab.stack.length - 2];
          toInfo = { route: prevEntry.route, params: prevEntry.params };
        }

        if (!guardRegistry.check(from, toInfo, 'back')) return;
        store.dispatch({ type: 'GO_BACK' });
      },
      canGoBack(): boolean {
        const state = store.getState();
        return state.overlays.length > 0 || state.tabs[state.activeTab].stack.length > 1;
      },
    }),
    [store, guardRegistry],
  );
}
