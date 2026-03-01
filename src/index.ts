// Primary API

// Components
export { Link } from './components/Link.js';
export { TabNavigator } from './components/TabNavigator.js';

export type {
  BackResult,
  NavigationAction,
  NavigationDirection,
  NavigationState,
  OverlayEntry,
  RouteInfo,
  StackEntry,
  TabState,
} from './core/types.js';
export type { RouterConfig, RouterInstance } from './create-router.js';
export { createRouter } from './create-router.js';
export { useBackHandler } from './hooks/useBackHandler.js';
export { useBeforeNavigate } from './hooks/useBeforeNavigate.js';
export { useFocusEffect } from './hooks/useFocusEffect.js';
export { useIsFocused } from './hooks/useIsFocused.js';
export type { NavigationActions } from './hooks/useNavigation.js';
// Hooks (for advanced global registration usage)
export { useNavigation } from './hooks/useNavigation.js';
// Utilities
export { shallowEqual } from './hooks/useNavigationSelector.js';
export type { OverlayActions } from './hooks/useOverlay.js';
export { useOverlay } from './hooks/useOverlay.js';
export type { RouteInfoResult } from './hooks/useRoute.js';
export { useRoute } from './hooks/useRoute.js';
export type { TabActions } from './hooks/useTab.js';
export { useTab } from './hooks/useTab.js';

export type { OverlayDef, StackDef, TabDef } from './route-helpers.js';
// Route helpers
export { overlay, stack, tab } from './route-helpers.js';

// Sync
export { HistorySyncManager } from './sync/history-sync.js';

// Types
export type {
  NavigationProviderProps,
  ScreenComponentProps,
  ScreenOptions,
  TabBarProps,
  TabInfo,
  TabNavigatorProps,
  TransitionConfig,
} from './types/props.js';
export type { ExtractParams, InferComponentParams, InferRouteMap } from './types/routes.js';
export type { Serializable } from './types/serializable.js';
