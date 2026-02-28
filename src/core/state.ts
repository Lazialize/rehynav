import type { NavigationState, TabState } from './types.js';

export function createInitialState(
  config: { tabs: string[]; initialTab: string },
  createId: () => string,
  now: () => number,
): NavigationState {
  const tabs: Record<string, TabState> = {};
  for (const tab of config.tabs) {
    tabs[tab] = {
      name: tab,
      stack: [
        {
          id: createId(),
          route: tab,
          params: {},
          timestamp: now(),
        },
      ],
      hasBeenActive: tab === config.initialTab,
    };
  }

  return {
    tabs,
    activeTab: config.initialTab,
    tabOrder: config.tabs,
    overlays: [],
    badges: {},
  };
}
