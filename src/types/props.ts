import type React from 'react';
import type { NavigationState } from '../core/types';
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
  suspenseFallback?: React.ReactNode;
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

export interface ErrorFallbackProps {
  error: Error;
  route: string;
  retry: () => void;
}
