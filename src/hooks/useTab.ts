import { useMemo } from 'react';
import { useNavigationStore } from './context.js';
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
  const activeTab = useNavigationSelector((s) => s.activeTab);
  const tabs = useNavigationSelector((s) => s.tabOrder);

  return useMemo(
    () => ({
      activeTab,
      tabs,
      switchTab: (tab: string) => store.dispatch({ type: 'SWITCH_TAB', tab }),
      switchTabAndReset: (tab: string) => store.dispatch({ type: 'SWITCH_TAB_AND_RESET', tab }),
      setBadge: (tab: string, badge: string | number | undefined) =>
        store.dispatch({ type: 'SET_BADGE', tab, badge }),
    }),
    [activeTab, tabs, store],
  );
}
