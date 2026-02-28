import type React from 'react';
import type { NavigationState } from '../core/types';
import type { AllRoutes, LinkableRoutes, RequiredKeys, RouteMap, RouteParams } from './routes';
import type { Serializable } from './serializable';

export interface NavigationProviderProps {
  children: React.ReactNode;
  urlSync?: boolean;
  basePath?: string;
  onStateChange?: (state: NavigationState) => void;
  initialState?: NavigationState;
}

export interface TabNavigatorProps {
  tabBar?: React.ComponentType<TabBarProps>;
  tabBarPosition?: 'top' | 'bottom';
  preserveState?: boolean;
  lazy?: boolean;
  maxStackDepth?: number;
}

export interface TabBarProps {
  tabs: TabInfo[];
  activeTab: string;
  onTabPress: (tabName: string) => void;
}

export interface TabInfo {
  name: string;
  isActive: boolean;
  badge?: string | number;
}

export interface TransitionConfig {
  enter?: string;
  exit?: string;
  duration?: number;
}

export interface ScreenOptions {
  title?: string;
  transition?: 'push' | 'fade' | 'none' | TransitionConfig;
  gestureEnabled?: boolean;
}

export interface ScreenComponentProps<
  Params extends Record<string, Serializable> = Record<string, Serializable>,
> {
  params: Params;
}

// Screen props - generic version for use with createRouter
export interface ScreenProps<R extends RouteMap, RouteName extends AllRoutes<R>> {
  name: RouteName;
  component: React.ComponentType<ScreenComponentProps<RouteParams<R, RouteName>>>;
  options?: ScreenOptions;
}

// Link props
export type LinkProps<R extends RouteMap, RouteName extends LinkableRoutes<R>> =
  RequiredKeys<RouteParams<R, RouteName>> extends never
    ? LinkPropsNoParams<RouteName> & { params?: RouteParams<R, RouteName> }
    : LinkPropsWithParams<R, RouteName>;

interface LinkPropsNoParams<RouteName> {
  to: RouteName;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  replace?: boolean;
}

interface LinkPropsWithParams<R extends RouteMap, RouteName extends LinkableRoutes<R>> {
  to: RouteName;
  params: RouteParams<R, RouteName>;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  replace?: boolean;
}
