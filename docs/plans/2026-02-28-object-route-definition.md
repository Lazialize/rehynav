# Object-Based Route Definition Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the three-layer route definition (manual RouteMap type + createRouter config + JSX Screen components) with a single Record-based config object that auto-infers route types.

**Architecture:** The new `createRouter` accepts a Record-based config with components embedded. Type utilities extract route names and path params from the config object keys. The ScreenRegistry is pre-populated at creation time instead of requiring JSX Screen components.

**Tech Stack:** TypeScript (template literal types for param extraction), React, Vitest

---

### Task 1: Add type utilities for path param extraction and route inference

**Files:**
- Modify: `src/types/routes.ts`
- Create: `src/types/routes.test-d.ts` (type-level tests)
- Reference: `docs/plans/2026-02-28-object-route-definition-design.md`

**Step 1: Write the failing type test**

Create `src/types/routes.test-d.ts` with type-level assertions:

```typescript
import { assertType, describe, it } from 'vitest';
import type { ExtractParams, InferRouteMap, OverlayRouteConfig, StackRouteConfig, TabRouteConfig } from './routes.js';

describe('ExtractParams', () => {
  it('extracts single param', () => {
    assertType<{ postId: string }>({} as ExtractParams<'post-detail/:postId'>);
  });

  it('extracts multiple params', () => {
    assertType<{ userId: string; postId: string }>({} as ExtractParams<':userId/posts/:postId'>);
  });

  it('returns empty for no params', () => {
    assertType<Record<string, never>>({} as ExtractParams<'settings'>);
  });
});

describe('InferRouteMap', () => {
  it('infers tabs, stacks, modals, sheets from config', () => {
    type Tabs = {
      home: {
        component: React.ComponentType<any>;
        children: {
          'post-detail/:postId': StackRouteConfig;
        };
      };
      search: TabRouteConfig;
    };
    type Modals = { 'new-post': OverlayRouteConfig };
    type Sheets = { share: OverlayRouteConfig };

    type Result = InferRouteMap<Tabs, Modals, Sheets>;

    // Tab names
    assertType<'home' | 'search'>({} as keyof Result['tabs']);
    // Stack routes with params
    assertType<{ postId: string }>({} as Result['stacks']['home/post-detail/:postId']);
    // Modal and sheet names
    assertType<'new-post'>({} as keyof Result['modals']);
    assertType<'share'>({} as keyof Result['sheets']);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/types/routes.test-d.ts --typecheck`
Expected: FAIL — `ExtractParams`, `InferRouteMap`, `TabRouteConfig`, `StackRouteConfig`, `OverlayRouteConfig` not exported

**Step 3: Implement the type utilities**

Add to `src/types/routes.ts`:

```typescript
// --- Config types for object-based route definition ---

export interface TabRouteConfig {
  component: React.ComponentType<any>;
  children?: Record<string, StackRouteConfig>;
}

export interface StackRouteConfig {
  component: React.ComponentType<any>;
  options?: import('./props.js').ScreenOptions;
}

export interface OverlayRouteConfig {
  component: React.ComponentType<any>;
}

// --- Type inference utilities ---

// Extract path params: 'post-detail/:postId' → { postId: string }
export type ExtractParams<T extends string> =
  T extends `${string}:${infer Param}/${infer Rest}`
    ? { [K in Param | keyof ExtractParams<Rest>]: string }
    : T extends `${string}:${infer Param}`
      ? { [K in Param]: string }
      : Record<string, never>;

// Infer full RouteMap from config types
export type InferRouteMap<
  TTabs extends Record<string, TabRouteConfig>,
  TModals extends Record<string, OverlayRouteConfig> = Record<string, never>,
  TSheets extends Record<string, OverlayRouteConfig> = Record<string, never>,
> = {
  tabs: { [K in keyof TTabs & string]: Record<string, never> };
  stacks: InferStacks<TTabs>;
  modals: { [K in keyof TModals & string]: Record<string, never> };
  sheets: { [K in keyof TSheets & string]: Record<string, never> };
};

// Helper: infer stacks from tab children
type InferStacks<TTabs extends Record<string, TabRouteConfig>> = UnionToIntersection<
  {
    [Tab in keyof TTabs & string]: TTabs[Tab] extends { children: infer C }
      ? C extends Record<string, StackRouteConfig>
        ? { [Path in keyof C & string as `${Tab}/${Path}`]: ExtractParams<Path> }
        : Record<string, never>
      : Record<string, never>;
  }[keyof TTabs & string]
>;

// Helper: convert union to intersection for merging stack records
type UnionToIntersection<U> = (U extends any ? (x: U) => void : never) extends (x: infer I) => void
  ? I
  : never;
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/types/routes.test-d.ts --typecheck`
Expected: PASS

**Step 5: Commit**

```bash
git add src/types/routes.ts src/types/routes.test-d.ts
git commit -m "feat: add type utilities for object-based route definition"
```

---

### Task 2: Add new RouterConfig type and update createRouter signature

**Files:**
- Modify: `src/create-router.ts`
- Modify: `src/create-router.test.tsx`

**Step 1: Write the failing test**

Add a new test block in `src/create-router.test.tsx` for the new config format. Keep existing tests passing (backward compat for now):

```typescript
import type React from 'react';

// Dummy components for testing
const HomeScreen: React.FC = () => null;
const SearchScreen: React.FC = () => null;
const ProfileScreen: React.FC = () => null;
const DetailScreen: React.FC = () => null;
const LoginModal: React.FC = () => null;
const ActionSheet: React.FC = () => null;

describe('createRouter with object config', () => {
  it('should accept Record-based config and return RouterInstance', () => {
    const router = createRouter({
      tabs: {
        home: {
          component: HomeScreen,
          children: {
            'detail/:id': { component: DetailScreen },
          },
        },
        search: { component: SearchScreen },
        profile: { component: ProfileScreen },
      },
      modals: {
        login: { component: LoginModal },
      },
      sheets: {
        'action-sheet': { component: ActionSheet },
      },
      initialTab: 'home',
      tabOrder: ['home', 'search', 'profile'],
    });

    expect(router.NavigationProvider).toBeDefined();
    expect(router.useNavigation).toBeDefined();
    expect(router.useRoute).toBeDefined();
    expect(router.useTab).toBeDefined();
    expect(router.useModal).toBeDefined();
    expect(router.useSheet).toBeDefined();
  });

  it('should pre-populate screen registry from config', () => {
    const router = createRouter({
      tabs: {
        home: {
          component: HomeScreen,
          children: {
            'detail/:id': { component: DetailScreen },
          },
        },
        search: { component: SearchScreen },
      },
      modals: {
        login: { component: LoginModal },
      },
      initialTab: 'home',
      tabOrder: ['home', 'search'],
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <router.NavigationProvider>{children}</router.NavigationProvider>
    );

    const { result } = renderHook(() => router.useNavigation(), { wrapper });

    // Push to a child route — should work without <Screen> registration
    act(() => {
      result.current.push('home/detail/:id', { id: '42' });
    });

    expect(result.current.canGoBack()).toBe(true);
  });

  it('should use tabOrder for tab ordering', () => {
    const router = createRouter({
      tabs: {
        home: { component: HomeScreen },
        search: { component: SearchScreen },
        profile: { component: ProfileScreen },
      },
      initialTab: 'search',
      tabOrder: ['home', 'search', 'profile'],
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <router.NavigationProvider>{children}</router.NavigationProvider>
    );

    const { result } = renderHook(() => router.useTab(), { wrapper });

    expect(result.current.activeTab).toBe('search');
    expect(result.current.tabs).toEqual(['home', 'search', 'profile']);
  });

  it('should auto-generate route patterns for path params', () => {
    const router = createRouter({
      tabs: {
        home: {
          component: HomeScreen,
          children: {
            'post/:postId': { component: DetailScreen },
          },
        },
      },
      initialTab: 'home',
      tabOrder: ['home'],
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <router.NavigationProvider urlSync>{children}</router.NavigationProvider>
    );

    const { result } = renderHook(() => router.useNavigation(), { wrapper });

    // Should be able to push with path params
    act(() => {
      result.current.push('home/post/:postId', { postId: '123' });
    });

    expect(result.current.canGoBack()).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/create-router.test.tsx`
Expected: FAIL — createRouter doesn't accept the new config format

**Step 3: Implement the new createRouter overload**

Modify `src/create-router.ts`. Use function overloading to support both old and new config:

```typescript
import type { InferRouteMap, OverlayRouteConfig, StackRouteConfig, TabRouteConfig } from './types/routes.js';

// --- New config type ---
export interface ObjectRouterConfig<
  TTabs extends Record<string, TabRouteConfig>,
  TModals extends Record<string, OverlayRouteConfig> = Record<string, never>,
  TSheets extends Record<string, OverlayRouteConfig> = Record<string, never>,
> {
  tabs: TTabs;
  modals?: TModals;
  sheets?: TSheets;
  initialTab: keyof TTabs & string;
  tabOrder: Array<keyof TTabs & string>;
}

// --- Overloads ---
// New: object-based config
export function createRouter<
  TTabs extends Record<string, TabRouteConfig>,
  TModals extends Record<string, OverlayRouteConfig>,
  TSheets extends Record<string, OverlayRouteConfig>,
>(config: ObjectRouterConfig<TTabs, TModals, TSheets>): RouterInstance;

// Legacy: array-based config
export function createRouter<R extends RouteMap>(config: RouterConfig<R>): RouterInstance;

// Implementation
export function createRouter(config: any): RouterInstance {
  // Detect config type: new format has object `tabs`, old format has array `tabs`
  const isObjectConfig = !Array.isArray(config.tabs);

  let tabs: string[];
  let initialTab: string;
  let routePatterns: Map<string, RoutePattern> | undefined;
  let preRegistrations: ScreenRegistration[] | undefined;

  if (isObjectConfig) {
    // New object-based config
    tabs = config.tabOrder as string[];
    initialTab = config.initialTab as string;

    // Build screen registrations and route patterns from config
    const { registrations, routes } = parseObjectConfig(config);
    preRegistrations = registrations;
    routePatterns = routes.length > 0 ? parseRoutePatterns(routes) : undefined;
  } else {
    // Legacy array-based config
    tabs = config.tabs as string[];
    initialTab = config.initialTab as string;
    routePatterns = config.routes ? parseRoutePatterns(config.routes) : undefined;
  }

  // ... rest of createRouter unchanged, but pass preRegistrations to NavigationProvider
}
```

Add a helper function `parseObjectConfig`:

```typescript
import type { ScreenRegistration } from './store/screen-registry.js';

function parseObjectConfig(config: ObjectRouterConfig<any, any, any>): {
  registrations: ScreenRegistration[];
  routes: string[];
} {
  const registrations: ScreenRegistration[] = [];
  const routes: string[] = [];

  // Process tabs and their children
  for (const [tabName, tabConfig] of Object.entries(config.tabs) as [string, TabRouteConfig][]) {
    registrations.push({ route: tabName, component: tabConfig.component });
    routes.push(tabName);

    if (tabConfig.children) {
      for (const [path, stackConfig] of Object.entries(tabConfig.children) as [string, StackRouteConfig][]) {
        const fullRoute = `${tabName}/${path}`;
        registrations.push({
          route: fullRoute,
          component: stackConfig.component,
          options: stackConfig.options,
        });
        routes.push(fullRoute);
      }
    }
  }

  // Process modals
  if (config.modals) {
    for (const [name, overlayConfig] of Object.entries(config.modals) as [string, OverlayRouteConfig][]) {
      registrations.push({ route: name, component: overlayConfig.component });
    }
  }

  // Process sheets
  if (config.sheets) {
    for (const [name, overlayConfig] of Object.entries(config.sheets) as [string, OverlayRouteConfig][]) {
      registrations.push({ route: name, component: overlayConfig.component });
    }
  }

  return { registrations, routes };
}
```

Modify the `NavigationProvider` function to pre-populate the screen registry:

```typescript
function NavigationProvider(props: NavigationProviderProps): React.ReactElement {
  // ... existing code ...

  const screenRegistryRef = useRef<ScreenRegistryForHooks | null>(null);
  if (screenRegistryRef.current === null) {
    const registry = createScreenRegistry();
    // Pre-populate from config if available
    if (preRegistrations) {
      for (const reg of preRegistrations) {
        registry.register(reg);
      }
    }
    screenRegistryRef.current = registry as unknown as ScreenRegistryForHooks;
  }

  // ... rest unchanged ...
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/create-router.test.tsx`
Expected: PASS (both old and new tests)

**Step 5: Commit**

```bash
git add src/create-router.ts src/create-router.test.tsx
git commit -m "feat: support object-based route config in createRouter"
```

---

### Task 3: Mark Screen component as deprecated and update exports

**Files:**
- Modify: `src/components/Screen.tsx`
- Modify: `src/index.ts`

**Step 1: Add deprecation JSDoc to Screen**

In `src/components/Screen.tsx`, add a deprecation notice:

```typescript
/**
 * @deprecated Use object-based route config in `createRouter()` instead.
 * Components are now registered via the config object, making Screen unnecessary.
 * This component is kept for backward compatibility and dynamic registration use cases.
 */
export function Screen({ name, component, options }: ScreenProps): null {
```

**Step 2: Update exports in `src/index.ts`**

Add the new config types to exports:

```typescript
export type {
  // ... existing exports ...
  TabRouteConfig,
  StackRouteConfig,
  OverlayRouteConfig,
  ExtractParams,
  InferRouteMap,
} from './types/routes.js';

export type { ObjectRouterConfig } from './create-router.js';
```

**Step 3: Run all tests to ensure nothing is broken**

Run: `npx vitest run`
Expected: All PASS

**Step 4: Commit**

```bash
git add src/components/Screen.tsx src/index.ts
git commit -m "feat: deprecate Screen component, export new config types"
```

---

### Task 4: Migrate example app to new API

**Files:**
- Modify: `examples/sns-app/src/App.tsx`
- Delete: `examples/sns-app/src/routes.ts`

**Step 1: Rewrite App.tsx to use new config format**

Replace the current three-part definition with:

```typescript
import type { TabBarProps } from 'rehynav';
import { createRouter, TabNavigator } from 'rehynav';
import './App.css';

import { NewPostModal } from './overlays/NewPostModal';
import { ShareSheet } from './overlays/ShareSheet';
import { HomeScreen } from './screens/HomeScreen';
import { PostDetailScreen } from './screens/PostDetailScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { SearchScreen } from './screens/SearchScreen';
import { SettingsScreen } from './screens/SettingsScreen';

const router = createRouter({
  tabs: {
    home: {
      component: HomeScreen,
      children: {
        'post-detail/:postId': { component: PostDetailScreen },
      },
    },
    search: {
      component: SearchScreen,
      children: {
        'post-detail/:postId': { component: PostDetailScreen },
      },
    },
    profile: {
      component: ProfileScreen,
      children: {
        settings: { component: SettingsScreen },
      },
    },
  },
  modals: {
    'new-post': { component: NewPostModal },
  },
  sheets: {
    share: { component: ShareSheet },
  },
  initialTab: 'home',
  tabOrder: ['home', 'search', 'profile'],
});

export const {
  NavigationProvider,
  useNavigation,
  useRoute,
  useTab,
  useModal,
  useSheet,
  useBeforeNavigate,
  useBackHandler,
} = router;

function AppTabBar({ tabs, onTabPress }: TabBarProps) {
  // ... unchanged ...
}

export function App() {
  return (
    <NavigationProvider urlSync>
      <TabNavigator tabBar={AppTabBar} />
    </NavigationProvider>
  );
}
```

**Step 2: Delete `examples/sns-app/src/routes.ts`**

The manual `AppRoutes` type is no longer needed.

**Step 3: Verify the example app builds**

Run: `cd examples/sns-app && npm run build`
Expected: Build succeeds

**Step 4: Verify the example app runs**

Run: `cd examples/sns-app && npm run dev`
Expected: App starts, navigation works

**Step 5: Commit**

```bash
git add examples/sns-app/src/App.tsx
git rm examples/sns-app/src/routes.ts
git commit -m "refactor: migrate sns-app example to object-based route config"
```

---

### Task 5: Verify all tests pass and run final check

**Files:** (none — verification only)

**Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS

**Step 2: Run type checking**

Run: `npx tsc --noEmit`
Expected: No type errors

**Step 3: Run linter**

Run: `npx biome check src/`
Expected: No errors

**Step 4: Commit if any fixes needed**

Only if previous steps required adjustments.
