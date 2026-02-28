// Primary API

// Components
export { Link } from './components/Link.js';
export { Screen } from './components/Screen.js';
export { TabNavigator } from './components/TabNavigator.js';

export type {
  BackResult,
  NavigationAction,
  NavigationDirection,
  NavigationState,
  OverlayEntry,
  OverlayType,
  RouteInfo,
  StackEntry,
  TabState,
} from './core/types.js';
export type { RouterConfig, RouterInstance } from './create-router.js';
export { createRouter } from './create-router.js';
export { useBackHandler } from './hooks/useBackHandler.js';
export { useBeforeNavigate } from './hooks/useBeforeNavigate.js';
export type { ModalActions } from './hooks/useModal.js';
export { useModal } from './hooks/useModal.js';
export type { NavigationActions } from './hooks/useNavigation.js';
// Hooks (for advanced global registration usage)
export { useNavigation } from './hooks/useNavigation.js';
// Utilities
export { shallowEqual } from './hooks/useNavigationSelector.js';
export type { RouteInfoResult } from './hooks/useRoute.js';
export { useRoute } from './hooks/useRoute.js';
export type { SheetActions } from './hooks/useSheet.js';
export { useSheet } from './hooks/useSheet.js';
export type { TabActions } from './hooks/useTab.js';
export { useTab } from './hooks/useTab.js';
// Sync
export { HistorySyncManager } from './sync/history-sync.js';
export type {
  LinkProps,
  NavigationProviderProps,
  ScreenComponentProps,
  ScreenOptions,
  ScreenProps,
  TabBarProps,
  TabInfo,
  TabNavigatorProps,
  TransitionConfig,
} from './types/props.js';
export type { Register, RegisteredRouteMap, Router } from './types/register.js';
export type {
  AllRoutes,
  LinkableRoutes,
  ModalRoutes,
  RequiredKeys,
  RouteMap,
  RouteParams,
  SheetRoutes,
  StackRoutes,
  TabRoutes,
  ValidStackKey,
} from './types/routes.js';
// Types
export type { Serializable } from './types/serializable.js';
