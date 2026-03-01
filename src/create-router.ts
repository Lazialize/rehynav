import type React from 'react';
import { parseRoutePatterns, type RoutePattern } from './core/path-params.js';
import type { NavigationState } from './core/types.js';
import type { OverlayDef, ScreenDef, TabDef } from './route-helpers.js';
import type { ScreenRegistration } from './store/screen-registry.js';
import type { ErrorFallbackProps, TabBarProps } from './types/props.js';

export interface RouterConfig<
  TTabs extends TabDef[] = TabDef[],
  TOverlays extends OverlayDef[] = [],
  TScreens extends ScreenDef[] = [],
> {
  tabs: [...TTabs];
  overlays?: [...TOverlays];
  screens?: [...TScreens];
  initialTab: TTabs[number]['name'];
  initialScreen?: string;

  // Provider options (moved from NavigationProviderProps)
  urlSync?: boolean;
  basePath?: string;
  onStateChange?: (state: NavigationState) => void;
  initialState?: NavigationState;

  // TabNavigator options (moved from TabNavigatorProps)
  tabBar?: React.ComponentType<TabBarProps>;
  tabBarPosition?: 'top' | 'bottom';
  preserveState?: boolean;
  lazy?: boolean;
  maxStackDepth?: number;
  suspenseFallback?: React.ReactNode;
  errorFallback?: React.ComponentType<ErrorFallbackProps>;
}

export interface RouterInstance {
  /** @internal — consumed by RouterProvider */
  _internal: {
    tabNames: string[];
    screenNames: string[];
    registrations: ScreenRegistration[];
    routePatterns: Map<string, RoutePattern> | undefined;
    initialTab: string;
    initialScreen: string | undefined;
    config: RouterConfig;
  };
}

export function createRouter<
  TTabs extends TabDef[],
  TOverlays extends OverlayDef[],
  TScreens extends ScreenDef[],
>(config: RouterConfig<TTabs, TOverlays, TScreens>): RouterInstance {
  const { tabNames, screenNames, registrations, routes } = parseConfig(config);
  const initialTab = config.initialTab as string;
  const initialScreen = config.initialScreen as string | undefined;
  const routePatterns = routes.length > 0 ? parseRoutePatterns(routes) : undefined;

  return {
    _internal: {
      tabNames,
      screenNames,
      registrations,
      routePatterns,
      initialTab,
      initialScreen,
      config: config as unknown as RouterConfig,
    },
  };
}

// --- Config parser ---

// biome-ignore lint/suspicious/noExplicitAny: accepts any config shape
function parseConfig(config: RouterConfig<any, any, any>): {
  tabNames: string[];
  screenNames: string[];
  registrations: ScreenRegistration[];
  routes: string[];
} {
  const tabNames: string[] = [];
  const screenNames: string[] = [];
  const registrations: ScreenRegistration[] = [];
  const routes: string[] = [];

  // Parse screens
  if (config.screens) {
    for (const screenDef of config.screens) {
      screenNames.push(screenDef.name);
      registrations.push({ route: screenDef.name, component: screenDef.component });
      routes.push(screenDef.name);

      for (const stackDef of screenDef.children) {
        const fullRoute = `${screenDef.name}/${stackDef.path}`;
        registrations.push({
          route: fullRoute,
          component: stackDef.component,
          options: stackDef.options,
        });
        routes.push(fullRoute);
      }
    }
  }

  // Parse tabs
  for (const tabDef of config.tabs) {
    tabNames.push(tabDef.name);
    registrations.push({ route: tabDef.name, component: tabDef.component });
    routes.push(tabDef.name);

    for (const stackDef of tabDef.children) {
      const fullRoute = `${tabDef.name}/${stackDef.path}`;
      registrations.push({
        route: fullRoute,
        component: stackDef.component,
        options: stackDef.options,
      });
      routes.push(fullRoute);
    }
  }

  // Parse overlays
  if (config.overlays) {
    for (const overlayDef of config.overlays) {
      registrations.push({
        route: overlayDef.name,
        component: overlayDef.component,
        options: overlayDef.options,
      });
    }
  }

  return { tabNames, screenNames, registrations, routes };
}
