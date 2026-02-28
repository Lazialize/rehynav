import { useMemo } from 'react';
import type { RouteInfo } from '../core/types.js';
import { useGuardRegistry, useNavigationStore } from './context.js';
import { useNavigationSelector } from './useNavigationSelector.js';

export interface TabActions {
  activeTab: string;
  tabs: string[];
  switchTab(tabName: string): void;
  switchTabAndReset(tabName: string): void;
  setBadge(tabName: string, badge: string | number | undefined): void;
}

export function useTab(): TabActions {
  const store = useNavigationStore();
  const guardRegistry = useGuardRegistry();
  const activeTab = useNavigationSelector((s) => s.activeTab);
  const tabs = useNavigationSelector((s) => s.tabOrder);

  return useMemo(
    () => ({
      activeTab,
      tabs,
      switchTab: (tab: string) => {
        const state = store.getState();
        const currentTab = state.tabs[state.activeTab];
        const from: RouteInfo = {
          route: currentTab.stack[currentTab.stack.length - 1].route,
          params: currentTab.stack[currentTab.stack.length - 1].params,
        };
        const targetTab = state.tabs[tab];
        if (!targetTab) return;
        const to: RouteInfo = {
          route: targetTab.stack[targetTab.stack.length - 1].route,
          params: targetTab.stack[targetTab.stack.length - 1].params,
        };
        if (!guardRegistry.check(from, to, 'tab-switch')) return;
        store.dispatch({ type: 'SWITCH_TAB', tab });
      },
      switchTabAndReset: (tab: string) => {
        const state = store.getState();
        const currentTab = state.tabs[state.activeTab];
        const from: RouteInfo = {
          route: currentTab.stack[currentTab.stack.length - 1].route,
          params: currentTab.stack[currentTab.stack.length - 1].params,
        };
        const targetTab = state.tabs[tab];
        if (!targetTab) return;
        const to: RouteInfo = {
          route: targetTab.stack[0].route,
          params: targetTab.stack[0].params,
        };
        if (!guardRegistry.check(from, to, 'tab-switch')) return;
        store.dispatch({ type: 'SWITCH_TAB_AND_RESET', tab });
      },
      setBadge: (tab: string, badge: string | number | undefined) =>
        store.dispatch({ type: 'SET_BADGE', tab, badge }),
    }),
    [activeTab, tabs, store, guardRegistry],
  );
}
