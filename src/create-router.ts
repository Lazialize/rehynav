import { parseRoutePatterns, type RoutePattern } from './core/path-params.js';
import { findClosestMatch } from './core/route-utils.js';
import type { NavigationState } from './core/types.js';
import type { OverlayDef, ScreensLayerDef, TabsLayerDef } from './route-helpers.js';
import type { ScreenRegistration } from './store/screen-registry.js';

export type RouteEntry = TabsLayerDef | ScreensLayerDef | OverlayDef;

export interface GlobalRouterOptions {
  urlSync?: boolean;
  basePath?: string;
  onStateChange?: (state: NavigationState) => void;
  initialState?: NavigationState;
}

export interface ParsedRouterConfig {
  tabsLayer: TabsLayerDef;
  screensLayer?: ScreensLayerDef;
  overlays: OverlayDef[];
  global: GlobalRouterOptions;
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
    config: ParsedRouterConfig;
  };
}

export function createRouter(routes: RouteEntry[], options?: GlobalRouterOptions): RouterInstance {
  const config = buildParsedConfig(routes, options);
  const { tabNames, screenNames, registrations, routePaths } = parseRoutes(config);
  const initialTab = config.tabsLayer.options.initialTab;
  const initialScreen = config.screensLayer?.options.initialScreen;
  const routePatterns = routePaths.length > 0 ? parseRoutePatterns(routePaths) : undefined;

  // Validate initialTab
  if (!tabNames.includes(initialTab)) {
    const suggestion = findClosestMatch(initialTab, tabNames, 2);
    const hint = suggestion ? ` Did you mean "${suggestion}"?` : '';
    throw new Error(
      `createRouter: initialTab "${initialTab}" does not match any defined tab. Available tabs: [${tabNames.join(', ')}].${hint}`,
    );
  }

  // Validate initialScreen
  if (initialScreen && !screenNames.includes(initialScreen)) {
    const suggestion = findClosestMatch(initialScreen, screenNames, 2);
    const hint = suggestion ? ` Did you mean "${suggestion}"?` : '';
    throw new Error(
      `createRouter: initialScreen "${initialScreen}" does not match any defined screen. Available screens: [${screenNames.join(', ')}].${hint}`,
    );
  }

  return {
    _internal: {
      tabNames,
      screenNames,
      registrations,
      routePatterns,
      initialTab,
      initialScreen,
      config,
    },
  };
}

// --- Config builder ---

function buildParsedConfig(
  routes: RouteEntry[],
  options?: GlobalRouterOptions,
): ParsedRouterConfig {
  let tabsLayer: TabsLayerDef | undefined;
  let screensLayer: ScreensLayerDef | undefined;
  const overlays: OverlayDef[] = [];

  for (const entry of routes) {
    switch (entry._tag) {
      case 'tabs':
        if (tabsLayer) {
          throw new Error('createRouter: only one tabs() layer is allowed');
        }
        tabsLayer = entry;
        break;
      case 'screens':
        if (screensLayer) {
          throw new Error('createRouter: only one screens() layer is allowed');
        }
        screensLayer = entry;
        break;
      case 'overlay':
        overlays.push(entry);
        break;
    }
  }

  if (!tabsLayer) {
    throw new Error('createRouter: a tabs() layer is required');
  }

  return {
    tabsLayer,
    screensLayer,
    overlays,
    global: options ?? {},
  };
}

// --- Route parser ---

function parseRoutes(config: ParsedRouterConfig): {
  tabNames: string[];
  screenNames: string[];
  registrations: ScreenRegistration[];
  routePaths: string[];
} {
  const tabNames: string[] = [];
  const screenNames: string[] = [];
  const registrations: ScreenRegistration[] = [];
  const routePaths: string[] = [];

  // Track route names → category for duplicate detection
  type RouteCategory = 'tab' | 'tab-stack' | 'screen' | 'screen-stack' | 'overlay';
  const seen = new Map<string, RouteCategory>();

  function trackRoute(route: string, category: RouteCategory): void {
    const existing = seen.get(route);
    if (existing) {
      throw new Error(
        `createRouter: duplicate route "${route}" found in ${existing} and ${category}. Route names must be unique across all tabs, screens, stacks, and overlays.`,
      );
    }
    seen.set(route, category);
  }

  // Parse screens
  if (config.screensLayer) {
    for (const screenDef of config.screensLayer.children) {
      trackRoute(screenDef.name, 'screen');
      screenNames.push(screenDef.name);
      registrations.push({ route: screenDef.name, component: screenDef.component });
      routePaths.push(screenDef.name);

      for (const stackDef of screenDef.children) {
        const fullRoute = `${screenDef.name}/${stackDef.path}`;
        trackRoute(fullRoute, 'screen-stack');
        registrations.push({
          route: fullRoute,
          component: stackDef.component,
          options: stackDef.options,
        });
        routePaths.push(fullRoute);
      }
    }
  }

  // Parse tabs
  for (const tabDef of config.tabsLayer.children) {
    trackRoute(tabDef.name, 'tab');
    tabNames.push(tabDef.name);
    registrations.push({ route: tabDef.name, component: tabDef.component });
    routePaths.push(tabDef.name);

    for (const stackDef of tabDef.children) {
      const fullRoute = `${tabDef.name}/${stackDef.path}`;
      trackRoute(fullRoute, 'tab-stack');
      registrations.push({
        route: fullRoute,
        component: stackDef.component,
        options: stackDef.options,
      });
      routePaths.push(fullRoute);
    }
  }

  // Parse overlays
  for (const overlayDef of config.overlays) {
    trackRoute(overlayDef.name, 'overlay');
    registrations.push({
      route: overlayDef.name,
      component: overlayDef.component,
      options: overlayDef.options,
    });
  }

  return { tabNames, screenNames, registrations, routePaths };
}
