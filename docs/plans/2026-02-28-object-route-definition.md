# Function-Based Route Definition Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the three-layer route definition with helper functions (`tab`, `stack`, `modal`, `sheet`) and a single `createRouter` call. Route types auto-inferred. **No backward compatibility.**

**Architecture:** Helper functions create typed definition objects. `createRouter` accepts arrays of these definitions. Path params inferred from route strings via `ExtractParams`. Overlay params inferred from component `ScreenComponentProps<P>` props via `InferComponentParams`. ScreenRegistry pre-populated at creation time.

**Tech Stack:** TypeScript (template literal types, generic inference), React, Vitest

**Breaking change:** Bump version to `0.2.0`. All old types and `Screen` component deleted. Single `createRouter` signature.

---

### Task 1: Create helper functions and new type system

> **Note:** Tasks 1-3 are tightly coupled. The codebase will not compile between them. All three must be completed before running tests.

**Files:**
- Create: `src/route-helpers.ts`
- Create: `src/route-helpers.test.ts`
- Modify: `src/types/routes.ts` (gut and rebuild)
- Delete: `src/types/register.ts`
- Modify: `src/types/props.ts` (remove dead generic types)
- Create: `src/types/routes.test-d.ts` (type-level tests)

**Step 1: Write the type tests**

Create `src/types/routes.test-d.ts`:

```typescript
import { assertType, describe, it } from 'vitest';
import type { ScreenComponentProps } from './props.js';
import type { ExtractParams, InferComponentParams, InferRouteMap } from './routes.js';
import type { TabDef, StackDef, OverlayDef } from '../route-helpers.js';

describe('ExtractParams', () => {
  it('extracts single param', () => {
    assertType<{ postId: string }>({} as ExtractParams<'post-detail/:postId'>);
  });

  it('extracts multiple params', () => {
    assertType<{ userId: string } & { postId: string }>({} as ExtractParams<':userId/posts/:postId'>);
  });

  it('returns empty for no params', () => {
    assertType<{}>({} as ExtractParams<'settings'>);
  });

  it('handles param followed by literal segment', () => {
    assertType<{ id: string }>({} as ExtractParams<':id/details'>);
  });
});

describe('InferComponentParams', () => {
  it('extracts params from ScreenComponentProps', () => {
    type C = React.FC<ScreenComponentProps<{ postId: string; title: string }>>;
    assertType<{ postId: string; title: string }>({} as InferComponentParams<C>);
  });

  it('returns empty for components without params', () => {
    type C = React.FC;
    assertType<{}>({} as InferComponentParams<C>);
  });
});

describe('InferRouteMap', () => {
  it('infers tabs, stacks, modals, sheets from definitions', () => {
    type ShareSheetComponent = React.FC<ScreenComponentProps<{ postId: string; title: string }>>;
    type NoParamsComponent = React.FC;

    type Tabs = [
      TabDef<'home', NoParamsComponent, [StackDef<'post-detail/:postId', NoParamsComponent>]>,
      TabDef<'search', NoParamsComponent, []>,
    ];
    type Modals = [OverlayDef<'new-post', NoParamsComponent>];
    type Sheets = [OverlayDef<'share', ShareSheetComponent>];

    type Result = InferRouteMap<Tabs, Modals, Sheets>;

    // Tab names
    assertType<'home' | 'search'>({} as keyof Result['tabs']);
    // Stack routes with params
    assertType<{ postId: string }>({} as Result['stacks']['home/post-detail/:postId']);
    // Modal (no params)
    assertType<{}>({} as Result['modals']['new-post']);
    // Sheet with params inferred from component
    assertType<{ postId: string; title: string }>({} as Result['sheets']['share']);
  });
});
```

**Step 2: Create `src/route-helpers.ts`**

```typescript
import type { ScreenOptions } from './store/screen-registry.js';

// --- Definition types (returned by helper functions) ---

export interface TabDef<
  N extends string = string,
  C extends React.ComponentType<any> = React.ComponentType<any>,
  S extends StackDef[] = StackDef[],
> {
  readonly _tag: 'tab';
  readonly name: N;
  readonly component: C;
  readonly children: S;
}

export interface StackDef<
  P extends string = string,
  C extends React.ComponentType<any> = React.ComponentType<any>,
> {
  readonly _tag: 'stack';
  readonly path: P;
  readonly component: C;
  readonly options?: ScreenOptions;
}

export interface OverlayDef<
  N extends string = string,
  C extends React.ComponentType<any> = React.ComponentType<any>,
> {
  readonly _tag: 'overlay';
  readonly name: N;
  readonly component: C;
  readonly options?: ScreenOptions;
}

// --- Helper functions ---

export function tab<
  N extends string,
  C extends React.ComponentType<any>,
  S extends StackDef[],
>(name: N, component: C, children?: [...S]): TabDef<N, C, S> {
  return {
    _tag: 'tab',
    name,
    component,
    children: (children ?? []) as S,
  };
}

export function stack<
  P extends string,
  C extends React.ComponentType<any>,
>(path: P, component: C, options?: ScreenOptions): StackDef<P, C> {
  return { _tag: 'stack', path, component, options };
}

export function modal<
  N extends string,
  C extends React.ComponentType<any>,
>(name: N, component: C, options?: ScreenOptions): OverlayDef<N, C> {
  return { _tag: 'overlay', name, component, options };
}

export function sheet<
  N extends string,
  C extends React.ComponentType<any>,
>(name: N, component: C, options?: ScreenOptions): OverlayDef<N, C> {
  return { _tag: 'overlay', name, component, options };
}
```

**Step 3: Create `src/route-helpers.test.ts`**

```typescript
import { describe, expect, it } from 'vitest';
import { tab, stack, modal, sheet } from './route-helpers.js';

const DummyComponent: React.FC = () => null;

describe('tab', () => {
  it('creates a tab definition', () => {
    const def = tab('home', DummyComponent);
    expect(def._tag).toBe('tab');
    expect(def.name).toBe('home');
    expect(def.component).toBe(DummyComponent);
    expect(def.children).toEqual([]);
  });

  it('creates a tab with children', () => {
    const child = stack('detail/:id', DummyComponent);
    const def = tab('home', DummyComponent, [child]);
    expect(def.children).toHaveLength(1);
    expect(def.children[0].path).toBe('detail/:id');
  });
});

describe('stack', () => {
  it('creates a stack definition', () => {
    const def = stack('detail/:id', DummyComponent);
    expect(def._tag).toBe('stack');
    expect(def.path).toBe('detail/:id');
  });

  it('accepts options', () => {
    const def = stack('detail/:id', DummyComponent, { transition: 'fade' });
    expect(def.options?.transition).toBe('fade');
  });
});

describe('modal', () => {
  it('creates an overlay definition', () => {
    const def = modal('login', DummyComponent);
    expect(def._tag).toBe('overlay');
    expect(def.name).toBe('login');
  });
});

describe('sheet', () => {
  it('creates an overlay definition', () => {
    const def = sheet('share', DummyComponent);
    expect(def._tag).toBe('overlay');
    expect(def.name).toBe('share');
  });
});
```

**Step 4: Replace `src/types/routes.ts`**

Delete all old types and replace with:

```typescript
import type { Serializable } from './serializable.js';
import type { ScreenComponentProps } from './props.js';
import type { TabDef, StackDef, OverlayDef } from '../route-helpers.js';

// --- Type inference utilities ---

// Extract path params: 'post-detail/:postId' -> { postId: string }
export type ExtractParams<T extends string> =
  T extends `${string}:${infer Param}/${infer Rest}`
    ? { [K in Param]: string } & ExtractParams<Rest>
    : T extends `${string}:${infer Param}`
      ? { [K in Param]: string }
      : {};

// Infer overlay params from component's ScreenComponentProps props type
export type InferComponentParams<C> =
  C extends React.ComponentType<ScreenComponentProps<infer P>>
    ? P extends Record<string, Serializable>
      ? P
      : {}
    : {};

// Infer full RouteMap from definition arrays
export type InferRouteMap<
  TTabs extends TabDef[] = [],
  TModals extends OverlayDef[] = [],
  TSheets extends OverlayDef[] = [],
> = {
  tabs: { [T in TTabs[number] as T['name']]: {} };
  stacks: InferStacksFromTabs<TTabs>;
  modals: { [D in TModals[number] as D['name']]: InferComponentParams<D['component']> };
  sheets: { [D in TSheets[number] as D['name']]: InferComponentParams<D['component']> };
};

// Infer stacks from tab definitions
type InferStacksFromTabs<T extends TabDef[]> = UnionToIntersection<
  {
    [I in keyof T]: T[I] extends TabDef<infer N extends string, any, infer S extends StackDef[]>
      ? S extends []
        ? never
        : { [SD in S[number] as `${N}/${SD['path']}`]: ExtractParams<SD['path']> }
      : never
  }[number]
>;

type UnionToIntersection<U> = (U extends any ? (x: U) => void : never) extends (x: infer I) => void
  ? I
  : never;
```

**Step 5: Delete `src/types/register.ts`**

Delete the entire file.

**Step 6: Clean up `src/types/props.ts`**

- Delete `ScreenProps<R, RouteName>` (lines 52-57)
- Delete generic `LinkProps<R, RouteName>` (lines 59-80) and its helper interfaces `LinkPropsNoParams`, `LinkPropsWithParams`
- Keep: `NavigationProviderProps`, `TabNavigatorProps`, `TabBarProps`, `TabInfo`, `TransitionConfig`, `ScreenOptions`, `ScreenComponentProps`
- Remove the `import type { AllRoutes, LinkableRoutes, RequiredKeys, RouteMap, RouteParams } from './routes'` import

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: add route helper functions and new type system"
```

---

### Task 2: Rewrite createRouter — single signature, array-based config

**Files:**
- Modify: `src/create-router.ts`
- Rewrite: `src/create-router.test.tsx`

**Step 1: Write new tests**

Rewrite `src/create-router.test.tsx` entirely:

```typescript
import type React from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createRouter } from './create-router.js';
import { tab, stack, modal, sheet } from './route-helpers.js';

const HomeScreen: React.FC = () => null;
const SearchScreen: React.FC = () => null;
const ProfileScreen: React.FC = () => null;
const DetailScreen: React.FC = () => null;
const LoginModal: React.FC = () => null;
const ActionSheet: React.FC = () => null;

describe('createRouter', () => {
  it('should accept function-based config and return RouterInstance', () => {
    const router = createRouter({
      tabs: [
        tab('home', HomeScreen, [
          stack('detail/:id', DetailScreen),
        ]),
        tab('search', SearchScreen),
        tab('profile', ProfileScreen),
      ],
      modals: [
        modal('login', LoginModal),
      ],
      sheets: [
        sheet('action-sheet', ActionSheet),
      ],
      initialTab: 'home',
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
      tabs: [
        tab('home', HomeScreen, [
          stack('detail/:id', DetailScreen),
        ]),
        tab('search', SearchScreen),
      ],
      modals: [
        modal('login', LoginModal),
      ],
      initialTab: 'home',
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <router.NavigationProvider>{children}</router.NavigationProvider>
    );

    const { result } = renderHook(() => router.useNavigation(), { wrapper });

    act(() => {
      result.current.push('home/detail/:id', { id: '42' });
    });

    expect(result.current.canGoBack()).toBe(true);
  });

  it('should use array order as tab order', () => {
    const router = createRouter({
      tabs: [
        tab('profile', ProfileScreen),
        tab('home', HomeScreen),
        tab('search', SearchScreen),
      ],
      initialTab: 'home',
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <router.NavigationProvider>{children}</router.NavigationProvider>
    );

    const { result } = renderHook(() => router.useTab(), { wrapper });

    expect(result.current.activeTab).toBe('home');
    expect(result.current.tabs).toEqual(['profile', 'home', 'search']);
  });

  it('should auto-generate route patterns for path params', () => {
    const router = createRouter({
      tabs: [
        tab('home', HomeScreen, [
          stack('post/:postId', DetailScreen),
        ]),
      ],
      initialTab: 'home',
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <router.NavigationProvider urlSync>{children}</router.NavigationProvider>
    );

    const { result } = renderHook(() => router.useNavigation(), { wrapper });

    act(() => {
      result.current.push('home/post/:postId', { postId: '123' });
    });

    expect(result.current.canGoBack()).toBe(true);
  });
});
```

**Step 2: Rewrite `src/create-router.ts`**

Replace the old `RouterConfig<R>` with the new function-based config:

```typescript
import type { TabDef, StackDef, OverlayDef } from './route-helpers.js';
// ... other existing imports (keep unchanged)

// Remove: import type { RouteMap } from './types/routes.js';
// Remove: old RouterConfig<R extends RouteMap>

export interface RouterConfig<
  TTabs extends TabDef[] = TabDef[],
  TModals extends OverlayDef[] = [],
  TSheets extends OverlayDef[] = [],
> {
  tabs: [...TTabs];
  modals?: [...TModals];
  sheets?: [...TSheets];
  initialTab: TTabs[number]['name'];
}

export interface RouterInstance {
  // ... unchanged from current
}

export function createRouter<
  TTabs extends TabDef[],
  TModals extends OverlayDef[],
  TSheets extends OverlayDef[],
>(config: RouterConfig<TTabs, TModals, TSheets>): RouterInstance {
  const { tabNames, registrations, routes } = parseConfig(config);
  const initialTab = config.initialTab as string;
  const routePatterns = routes.length > 0 ? parseRoutePatterns(routes) : undefined;

  function NavigationProvider(props: NavigationProviderProps): React.ReactElement {
    const { children, urlSync = false, basePath = '/', onStateChange, initialState } = props;

    const storeRef = useRef<ReturnType<typeof createNavigationStore> | null>(null);
    if (storeRef.current === null) {
      storeRef.current = createNavigationStore(
        initialState ?? createInitialState({ tabs: tabNames, initialTab }, createId, Date.now),
      );
    }
    const store = storeRef.current;

    const screenRegistryRef = useRef<ScreenRegistryForHooks | null>(null);
    if (screenRegistryRef.current === null) {
      const registry = createScreenRegistry();
      for (const reg of registrations) {
        registry.register(reg);
      }
      screenRegistryRef.current = registry as unknown as ScreenRegistryForHooks;
    }
    const screenRegistry = screenRegistryRef.current;

    // ... guardRegistry, useEffect for onStateChange, useEffect for urlSync — unchanged

    return createElement(
      NavigationStoreContext.Provider,
      { value: store },
      createElement(
        ScreenRegistryContext.Provider,
        { value: screenRegistry },
        createElement(
          GuardRegistryContext.Provider,
          { value: guardRegistry },
          createElement(RoutePatternsContext.Provider, { value: routePatterns ?? null }, children),
        ),
      ),
    );
  }

  return {
    NavigationProvider,
    useNavigation,
    useRoute,
    useTab,
    useModal,
    useSheet,
    useBeforeNavigate,
    useBackHandler,
  };
}

// --- Config parser ---

function parseConfig(config: RouterConfig<any, any, any>): {
  tabNames: string[];
  registrations: ScreenRegistration[];
  routes: string[];
} {
  const tabNames: string[] = [];
  const registrations: ScreenRegistration[] = [];
  const routes: string[] = [];

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

  if (config.modals) {
    for (const modalDef of config.modals) {
      registrations.push({
        route: modalDef.name,
        component: modalDef.component,
        options: modalDef.options,
      });
    }
  }

  if (config.sheets) {
    for (const sheetDef of config.sheets) {
      registrations.push({
        route: sheetDef.name,
        component: sheetDef.component,
        options: sheetDef.options,
      });
    }
  }

  return { tabNames, registrations, routes };
}
```

**Step 3: Run tests**

Run: `npx vitest run src/create-router.test.tsx src/route-helpers.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add src/create-router.ts src/create-router.test.tsx
git commit -m "feat: rewrite createRouter with function-based config"
```

---

### Task 3: Delete Screen component, clean up exports

**Files:**
- Delete: `src/components/Screen.tsx`
- Delete: `src/components/Screen.test.tsx`
- Modify: `src/components/NavigationProvider.tsx` — delete standalone provider
- Delete: `src/components/NavigationProvider.test.tsx`
- Modify: `src/index.ts`

**Step 1: Delete Screen component and tests**

```bash
rm src/components/Screen.tsx src/components/Screen.test.tsx
```

**Step 2: Delete standalone NavigationProvider**

The standalone `NavigationProvider` at `src/components/NavigationProvider.tsx` uses the old config format (`tabs: string[]`). Since `createRouter` is the only entry point, delete it and its tests.

```bash
rm src/components/NavigationProvider.tsx src/components/NavigationProvider.test.tsx
```

**Step 3: Update exports in `src/index.ts`**

Remove:
```typescript
export { Screen } from './components/Screen.js';
export type { ScreenProps } from './types/props.js';
export type { Register, RegisteredRouteMap, Router } from './types/register.js';
export type {
  AllRoutes, LinkableRoutes, ModalRoutes, RequiredKeys,
  RouteMap, RouteParams, SheetRoutes, StackRoutes, TabRoutes, ValidStackKey,
} from './types/routes.js';
// Also remove LinkProps from props.ts export (the generic version is deleted)
```

Add:
```typescript
// Route helpers
export { tab, stack, modal, sheet } from './route-helpers.js';
export type { TabDef, StackDef, OverlayDef } from './route-helpers.js';

// Type utilities
export type { RouterConfig } from './create-router.js';
export type { ExtractParams, InferRouteMap, InferComponentParams } from './types/routes.js';
```

Keep unchanged: `Link`, `TabNavigator`, `createRouter`, `RouterInstance`, all hooks, `ScreenComponentProps`, `ScreenOptions`, `NavigationProviderProps`, `TabBarProps`, `TabInfo`, `TabNavigatorProps`, `TransitionConfig`, `Serializable`, core types, `HistorySyncManager`, `shallowEqual`.

**Step 4: Run all tests**

Run: `npx vitest run`
Expected: All PASS

**Step 5: Run type checking**

Run: `npx tsc --noEmit`
Expected: No type errors

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: delete Screen, clean up exports, add route helper exports"
```

---

### Task 4: Migrate example app to new API

**Files:**
- Modify: `examples/sns-app/src/App.tsx`
- Delete: `examples/sns-app/src/routes.ts`

**Step 1: Rewrite App.tsx**

```typescript
import type { TabBarProps } from 'rehynav';
import { createRouter, tab, stack, modal, sheet, TabNavigator } from 'rehynav';
import './App.css';

import { NewPostModal } from './overlays/NewPostModal';
import { ShareSheet } from './overlays/ShareSheet';
import { HomeScreen } from './screens/HomeScreen';
import { PostDetailScreen } from './screens/PostDetailScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { SearchScreen } from './screens/SearchScreen';
import { SettingsScreen } from './screens/SettingsScreen';

const postDetail = stack('post-detail/:postId', PostDetailScreen);

const router = createRouter({
  tabs: [
    tab('home', HomeScreen, [postDetail]),
    tab('search', SearchScreen, [postDetail]),
    tab('profile', ProfileScreen, [
      stack('settings', SettingsScreen),
    ]),
  ],
  modals: [
    modal('new-post', NewPostModal),
  ],
  sheets: [
    sheet('share', ShareSheet),
  ],
  initialTab: 'home',
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
  const icons: Record<string, string> = {
    home: '🏠',
    search: '🔍',
    profile: '👤',
  };

  return (
    <nav className="tab-bar">
      {tabs.map((t) => (
        <button
          key={t.name}
          type="button"
          className={`tab-item ${t.isActive ? 'active' : ''}`}
          onClick={() => onTabPress(t.name)}
        >
          <span className="tab-icon">{icons[t.name] ?? '•'}</span>
          <span className="tab-label">{t.name}</span>
          {t.badge != null && <span className="tab-badge">{t.badge}</span>}
        </button>
      ))}
    </nav>
  );
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

```bash
git rm examples/sns-app/src/routes.ts
```

**Step 3: Verify the example app builds**

Run: `cd examples/sns-app && npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add examples/sns-app/src/App.tsx
git rm examples/sns-app/src/routes.ts
git commit -m "refactor: migrate sns-app example to function-based route config"
```

---

### Task 5: Full verification and version bump

**Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS

**Step 2: Run type checking (including type-level tests)**

Run: `npx vitest run --typecheck && npx tsc --noEmit`
Expected: No errors

**Step 3: Run linter**

Run: `npx biome check src/`
Expected: No errors

**Step 4: Build the package**

Run: `pnpm build`
Expected: Build succeeds

**Step 5: Create changeset**

Run: `pnpm changeset`
Type: `minor`
Description: "Replace three-layer route definition with function-based API (`tab`, `stack`, `modal`, `sheet`). Breaking change: Screen component removed, old RouteMap types removed, createRouter signature changed."

**Step 6: Commit if any fixes needed**

---

## Test Impact Summary

| Test File | Action | Reason |
|-----------|--------|--------|
| `src/create-router.test.tsx` | **Rewrite** | Old config format |
| `src/route-helpers.test.ts` | **Create** | New helper functions |
| `src/types/routes.test-d.ts` | **Create** | New type-level tests |
| `src/components/Screen.test.tsx` | **Delete** | Component deleted |
| `src/components/NavigationProvider.test.tsx` | **Delete** | Standalone provider deleted |
| `src/components/StackRenderer.test.tsx` | **Keep** | Uses createScreenRegistry directly |
| `src/components/TabNavigator.test.tsx` | **Keep** | Same |
| `src/components/OverlayRenderer.test.tsx` | **Keep** | Same |
| `src/components/Link.test.tsx` | **Keep** | Same |
| `src/hooks/useNavigation.test.tsx` | **Keep** | Uses test helper, not createRouter |
| `src/hooks/useTab.test.tsx` | **Keep** | Same |
| `src/hooks/useModal.test.tsx` | **Keep** | Same |
| `src/hooks/useSheet.test.tsx` | **Keep** | Same |
| `src/store/screen-registry.test.ts` | **Keep** | Tests registry directly |
| `test/helpers/renderWithNav.tsx` | **Keep** | Constructs providers directly |
