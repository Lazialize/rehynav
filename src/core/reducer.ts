import { resolveTabForRoute } from './route-utils.js';
import type {
  BackResult,
  NavigationAction,
  NavigationState,
  OverlayEntry,
  StackEntry,
  TabState,
} from './types.js';

export function handleBack(state: NavigationState): BackResult {
  // Step 1: Close topmost overlay (sheet or modal)
  if (state.overlays.length > 0) {
    return {
      handled: true,
      state: {
        ...state,
        overlays: state.overlays.slice(0, -1),
      },
    };
  }

  // Step 2: Pop active tab's stack
  const activeTabState = state.tabs[state.activeTab];
  if (activeTabState.stack.length > 1) {
    return {
      handled: true,
      state: {
        ...state,
        tabs: {
          ...state.tabs,
          [state.activeTab]: {
            ...activeTabState,
            stack: activeTabState.stack.slice(0, -1),
          },
        },
      },
    };
  }

  // Step 3: At root of tab, nothing to do
  return { handled: false, state };
}

export function navigationReducer(
  state: NavigationState,
  action: NavigationAction,
): NavigationState {
  switch (action.type) {
    case 'PUSH': {
      const tab = resolveTabForRoute(action.route, state.tabOrder);
      if (!tab) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn(
            `[rehynav] PUSH failed: route "${action.route}" does not match any registered tab. ` +
              `Tab prefixes: ${state.tabOrder.join(', ')}. ` +
              `Routes must start with a tab name (e.g., "${state.tabOrder[0]}/screen-name").`,
          );
        }
        return state;
      }

      const newEntry: StackEntry = {
        id: action.id,
        route: action.route,
        params: action.params,
        timestamp: action.timestamp,
      };

      const targetTab = state.tabs[tab];
      const newTabState: TabState = {
        ...targetTab,
        stack: [...targetTab.stack, newEntry],
        hasBeenActive: true,
      };

      return {
        ...state,
        activeTab: tab,
        tabs: {
          ...state.tabs,
          [tab]: newTabState,
        },
      };
    }

    case 'POP': {
      const activeTabState = state.tabs[state.activeTab];
      if (activeTabState.stack.length <= 1) return state;

      return {
        ...state,
        tabs: {
          ...state.tabs,
          [state.activeTab]: {
            ...activeTabState,
            stack: activeTabState.stack.slice(0, -1),
          },
        },
      };
    }

    case 'POP_TO_ROOT': {
      const activeTabState = state.tabs[state.activeTab];
      if (activeTabState.stack.length <= 1) return state;

      return {
        ...state,
        tabs: {
          ...state.tabs,
          [state.activeTab]: {
            ...activeTabState,
            stack: [activeTabState.stack[0]],
          },
        },
      };
    }

    case 'REPLACE': {
      const activeTabState = state.tabs[state.activeTab];
      if (activeTabState.stack.length === 0) return state;

      const routeTab = resolveTabForRoute(action.route, state.tabOrder);
      if (routeTab && routeTab !== state.activeTab) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn(
            `[rehynav] REPLACE failed: route "${action.route}" belongs to tab "${routeTab}", ` +
              `but the active tab is "${state.activeTab}". ` +
              `Use PUSH to navigate to a different tab's route.`,
          );
        }
        return state;
      }

      const newEntry: StackEntry = {
        id: action.id,
        route: action.route,
        params: action.params,
        timestamp: action.timestamp,
      };

      return {
        ...state,
        tabs: {
          ...state.tabs,
          [state.activeTab]: {
            ...activeTabState,
            stack: [...activeTabState.stack.slice(0, -1), newEntry],
          },
        },
      };
    }

    case 'SWITCH_TAB': {
      if (!state.tabs[action.tab]) return state;
      if (state.activeTab === action.tab && state.overlays.length === 0) return state;

      return {
        ...state,
        activeTab: action.tab,
        overlays: [],
        tabs: {
          ...state.tabs,
          [action.tab]: {
            ...state.tabs[action.tab],
            hasBeenActive: true,
          },
        },
      };
    }

    case 'SWITCH_TAB_AND_RESET': {
      if (!state.tabs[action.tab]) return state;

      const targetTab = state.tabs[action.tab];
      const isAlreadyActive = state.activeTab === action.tab;
      const isAlreadyAtRoot = targetTab.stack.length === 1;

      if (isAlreadyActive && isAlreadyAtRoot && state.overlays.length === 0) return state;

      return {
        ...state,
        activeTab: action.tab,
        overlays: [],
        tabs: {
          ...state.tabs,
          [action.tab]: {
            ...targetTab,
            stack: [targetTab.stack[0]],
            hasBeenActive: true,
          },
        },
      };
    }

    case 'OPEN_OVERLAY': {
      const newOverlay: OverlayEntry = {
        id: action.id,
        type: action.overlayType,
        route: action.route,
        params: action.params,
        timestamp: action.timestamp,
      };

      return {
        ...state,
        overlays: [...state.overlays, newOverlay],
      };
    }

    case 'CLOSE_OVERLAY': {
      if (state.overlays.length === 0) return state;

      if (action.route) {
        const index = state.overlays.findIndex((o) => o.route === action.route);
        if (index === -1) return state;

        return {
          ...state,
          overlays: [...state.overlays.slice(0, index), ...state.overlays.slice(index + 1)],
        };
      }

      return {
        ...state,
        overlays: state.overlays.slice(0, -1),
      };
    }

    case 'GO_BACK': {
      const result = handleBack(state);
      return result.state;
    }

    case 'RESTORE_TO_ENTRY': {
      // Search overlays first (reverse order, most recent first)
      for (let i = state.overlays.length - 1; i >= 0; i--) {
        if (state.overlays[i].id === action.entryId) {
          // Restore to this overlay: keep overlays up to and including this one
          return {
            ...state,
            overlays: state.overlays.slice(0, i + 1),
          };
        }
      }

      // Search tab stacks
      for (const tabName of state.tabOrder) {
        const tabState = state.tabs[tabName];
        for (let i = tabState.stack.length - 1; i >= 0; i--) {
          if (tabState.stack[i].id === action.entryId) {
            // Restore to this stack entry: trim stack, clear overlays, switch tab
            return {
              ...state,
              activeTab: tabName,
              tabs: {
                ...state.tabs,
                [tabName]: {
                  ...tabState,
                  stack: tabState.stack.slice(0, i + 1),
                  hasBeenActive: true,
                },
              },
              overlays: [],
            };
          }
        }
      }

      // Entry not found: fallback to initial tab root
      const initialTab = state.tabOrder[0];
      const initialTabState = state.tabs[initialTab];
      return {
        ...state,
        activeTab: initialTab,
        tabs: {
          ...state.tabs,
          [initialTab]: {
            ...initialTabState,
            stack: [initialTabState.stack[0]],
            hasBeenActive: true,
          },
        },
        overlays: [],
      };
    }

    case 'RESET_STATE': {
      return action.state;
    }

    case 'SET_BADGE': {
      return {
        ...state,
        badges: {
          ...state.badges,
          [action.tab]: action.badge,
        },
      };
    }

    default:
      return state;
  }
}
