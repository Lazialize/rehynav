// rehynav — file-based navigation for React on web and hybrid containers
// (Capacitor / Tauri). Expo Router-compatible API surface.

// Components
export { Link, type LinkProps } from './components/Link.js';
export { Redirect, type RedirectProps } from './components/Redirect.js';
export {
  ExpoRoot,
  RouterProvider,
  type RouterProviderProps,
} from './components/RouterProvider.js';
export { Slot } from './components/Slot.js';
export {
  Stack,
  type StackProps,
  type StackScreenOptions,
  type StackScreenProps,
} from './components/Stack.js';
export {
  type TabDescriptor,
  Tabs,
  type TabsProps,
  type TabsScreenOptions,
  type TabsScreenProps,
} from './components/Tabs.js';
// Core types and helpers (advanced / custom setups)
export type { Href } from './core/href.js';
export {
  collectActiveParams,
  collectActiveSegments,
  getPathFromState,
  getStateFromPath,
} from './core/matching.js';
export {
  buildRouteTree,
  type RouteContextMap,
  type RouteModule,
} from './core/route-tree.js';
export type { Serializable } from './core/serializable.js';
export type {
  DynamicConvention,
  NavigationRoute,
  NavigatorState,
  NavigatorType,
  Params,
  RouteInfo,
  RouteNode,
} from './core/types.js';
// Hooks
export { useFocusEffect } from './hooks/useFocusEffect.js';
export { useIsFocused } from './hooks/useIsFocused.js';
export { type NavigationApi, useNavigation } from './hooks/useNavigation.js';
export { usePathname } from './hooks/usePathname.js';
export { useRootNavigationState } from './hooks/useRootNavigationState.js';
export { type RouterApi, useRouter } from './hooks/useRouter.js';
export { useGlobalSearchParams, useLocalSearchParams } from './hooks/useSearchParams.js';
export { useSegments } from './hooks/useSegments.js';
// Imperative navigation
export { type Router, router } from './imperative-router.js';

// URL synchronization
export { HistorySync, type HistorySyncConfig } from './sync/history-sync.js';
