import type { NavigationState, StackEntry, TabState } from './types.js';

export function createInitialState(
  config: {
    tabs: string[];
    initialTab: string;
    initialScreen?: string;
    screenNames?: string[];
  },
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

  const screens: StackEntry[] = [];
  let activeLayer: 'screens' | 'tabs' = 'tabs';

  if (config.initialScreen) {
    screens.push({
      id: createId(),
      route: config.initialScreen,
      params: {},
      timestamp: now(),
    });
    activeLayer = 'screens';
  }

  return {
    tabs,
    activeTab: config.initialTab,
    tabOrder: config.tabs,
    overlays: [],
    badges: {},
    screens,
    activeLayer,
  };
}
