import { useMemo } from 'react';
import { useOptionalPreloadContext } from '../components/PreloadContext.js';
import { createId } from '../core/id.js';
import { getCurrentRouteInfo } from '../core/route-utils.js';
import type { RouteInfo, Serializable } from '../core/types.js';
import { validateSerializable } from '../core/validation.js';
import { useGuardRegistry, useNavigationStore } from './context.js';

export interface NavigationActions {
  push(to: string, params?: Record<string, Serializable>): void;
  pop(): void;
  popToRoot(): void;
  replace(to: string, params?: Record<string, Serializable>): void;
  goBack(): void;
  canGoBack(): boolean;
  preload(to: string, params?: Record<string, Serializable>): void;
  navigateToTabs(tab?: string): void;
  navigateToScreen(route: string, params?: Record<string, Serializable>): void;
}

export function useNavigation(): NavigationActions {
  const store = useNavigationStore();
  const guardRegistry = useGuardRegistry();
  const preloadCtx = useOptionalPreloadContext();

  return useMemo(
    () => ({
      push(to: string, params: Record<string, Serializable> = {}) {
        validateSerializable(params as Record<string, unknown>, `push("${to}")`);
        const state = store.getState();
        const from = getCurrentRouteInfo(state);
        const toInfo: RouteInfo = { route: to, params };
        if (!guardRegistry.check(from, toInfo, 'push')) return;

        if (state.activeLayer === 'screens') {
          store.dispatch({
            type: 'PUSH_SCREEN',
            route: to,
            params,
            id: createId(),
            timestamp: Date.now(),
          });
        } else {
          store.dispatch({
            type: 'PUSH',
            route: to,
            params,
            id: createId(),
            timestamp: Date.now(),
          });
        }
      },
      pop() {
        const state = store.getState();

        if (state.activeLayer === 'screens') {
          if (state.screens.length <= 1) return;
          const from = getCurrentRouteInfo(state);
          const prevEntry = state.screens[state.screens.length - 2];
          const toInfo: RouteInfo = { route: prevEntry.route, params: prevEntry.params };
          if (!guardRegistry.check(from, toInfo, 'back')) return;
          store.dispatch({ type: 'POP_SCREEN' });
        } else {
          const activeTab = state.tabs[state.activeTab];
          if (activeTab.stack.length <= 1) return;
          const from = getCurrentRouteInfo(state);
          const prevEntry = activeTab.stack[activeTab.stack.length - 2];
          const toInfo: RouteInfo = { route: prevEntry.route, params: prevEntry.params };
          if (!guardRegistry.check(from, toInfo, 'back')) return;
          store.dispatch({ type: 'POP' });
        }
      },
      popToRoot() {
        const state = store.getState();
        const from = getCurrentRouteInfo(state);

        if (state.activeLayer === 'screens') {
          if (state.screens.length <= 1) return;
          const rootEntry = state.screens[0];
          const toInfo: RouteInfo = { route: rootEntry.route, params: rootEntry.params };
          if (!guardRegistry.check(from, toInfo, 'back')) return;
          store.dispatch({ type: 'POP_SCREEN_TO_ROOT' });
        } else {
          const activeTab = state.tabs[state.activeTab];
          if (activeTab.stack.length <= 1) return;
          const rootEntry = activeTab.stack[0];
          const toInfo: RouteInfo = { route: rootEntry.route, params: rootEntry.params };
          if (!guardRegistry.check(from, toInfo, 'back')) return;
          store.dispatch({ type: 'POP_TO_ROOT' });
        }
      },
      replace(to: string, params: Record<string, Serializable> = {}) {
        validateSerializable(params as Record<string, unknown>, `replace("${to}")`);
        const state = store.getState();
        const from = getCurrentRouteInfo(state);
        const toInfo: RouteInfo = { route: to, params };
        if (!guardRegistry.check(from, toInfo, 'replace')) return;

        if (state.activeLayer === 'screens') {
          store.dispatch({
            type: 'REPLACE_SCREEN',
            route: to,
            params,
            id: createId(),
            timestamp: Date.now(),
          });
        } else {
          store.dispatch({
            type: 'REPLACE',
            route: to,
            params,
            id: createId(),
            timestamp: Date.now(),
          });
        }
      },
      goBack() {
        const state = store.getState();
        const from = getCurrentRouteInfo(state);
        let toInfo: RouteInfo;

        if (state.overlays.length > 0) {
          if (state.overlays.length > 1) {
            const prevOverlay = state.overlays[state.overlays.length - 2];
            toInfo = { route: prevOverlay.route, params: prevOverlay.params };
          } else if (state.activeLayer === 'screens' && state.screens.length > 0) {
            const topScreen = state.screens[state.screens.length - 1];
            toInfo = { route: topScreen.route, params: topScreen.params };
          } else {
            const activeTab = state.tabs[state.activeTab];
            const topEntry = activeTab.stack[activeTab.stack.length - 1];
            toInfo = { route: topEntry.route, params: topEntry.params };
          }
        } else if (state.activeLayer === 'screens') {
          if (state.screens.length <= 1) return;
          const prevEntry = state.screens[state.screens.length - 2];
          toInfo = { route: prevEntry.route, params: prevEntry.params };
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
        if (state.overlays.length > 0) return true;
        if (state.activeLayer === 'screens') return state.screens.length > 1;
        return state.tabs[state.activeTab].stack.length > 1;
      },
      preload(to: string, params: Record<string, Serializable> = {}) {
        preloadCtx?.preload(to, params);
      },
      navigateToTabs(tab?: string) {
        const from = getCurrentRouteInfo(store.getState());
        const toRoute = tab ?? store.getState().activeTab;
        const toInfo: RouteInfo = { route: toRoute, params: {} };
        if (!guardRegistry.check(from, toInfo, 'push')) return;
        store.dispatch({ type: 'NAVIGATE_TO_TABS', tab });
      },
      navigateToScreen(route: string, params: Record<string, Serializable> = {}) {
        validateSerializable(params as Record<string, unknown>, `navigateToScreen("${route}")`);
        const from = getCurrentRouteInfo(store.getState());
        const toInfo: RouteInfo = { route, params };
        if (!guardRegistry.check(from, toInfo, 'push')) return;
        store.dispatch({
          type: 'NAVIGATE_TO_SCREEN',
          route,
          params,
          id: createId(),
          timestamp: Date.now(),
        });
      },
    }),
    [store, guardRegistry, preloadCtx],
  );
}
