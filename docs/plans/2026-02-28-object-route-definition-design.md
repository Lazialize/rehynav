# Function-Based Route Definition Design

## Summary

Replace the current three-layer route definition (manual RouteMap type + createRouter config + JSX Screen components) with helper functions (`tab`, `stack`, `modal`, `sheet`) that define routes and pass them to `createRouter`. Route types are automatically inferred from the config — path params from route path strings, overlay params from component prop types. This is a breaking change — no backward compatibility is maintained.

## Motivation

Current route definition requires the same information in three places:

1. `RouteMap` type — manual TypeScript type with route names and params
2. `RouterConfig` — `tabs` array and `routes` array passed to `createRouter`
3. `Screen` components — JSX elements registering route-to-component mappings

This causes maintenance burden and risk of drift between type definitions and runtime config.

## Design

### New API

```typescript
import { createRouter, tab, stack, modal, sheet } from 'rehynav';

const router = createRouter({
  tabs: [
    tab('home', HomeScreen, [
      stack('post-detail/:postId', PostDetailScreen),
    ]),
    tab('search', SearchScreen, [
      stack('post-detail/:postId', PostDetailScreen),
    ]),
    tab('profile', ProfileScreen, [
      stack('settings', SettingsScreen),
    ]),
  ],
  modals: [
    modal('new-post', NewPostModal),
  ],
  sheets: [
    sheet('share', ShareSheet),  // params inferred from ShareSheet's props
  ],
  initialTab: 'home',
});
```

### Helper Functions

```typescript
// Define a tab with optional stack children
function tab<N extends string, C extends React.ComponentType<any>, S extends StackDef[]>(
  name: N,
  component: C,
  children?: [...S],
): TabDef<N, C, S>;

// Define a stack route under a tab
function stack<P extends string, C extends React.ComponentType<any>>(
  path: P,
  component: C,
  options?: ScreenOptions,
): StackDef<P, C>;

// Define a modal overlay
function modal<N extends string, C extends React.ComponentType<any>>(
  name: N,
  component: C,
  options?: ScreenOptions,
): OverlayDef<N, C>;

// Define a sheet overlay
function sheet<N extends string, C extends React.ComponentType<any>>(
  name: N,
  component: C,
  options?: ScreenOptions,
): OverlayDef<N, C>;
```

### Internal Definition Types

Returned by helper functions. Users do not construct these directly:

```typescript
interface TabDef<
  N extends string = string,
  C extends React.ComponentType<any> = React.ComponentType<any>,
  S extends StackDef[] = StackDef[],
> {
  readonly _tag: 'tab';
  readonly name: N;
  readonly component: C;
  readonly children: S;
}

interface StackDef<
  P extends string = string,
  C extends React.ComponentType<any> = React.ComponentType<any>,
> {
  readonly _tag: 'stack';
  readonly path: P;
  readonly component: C;
  readonly options?: ScreenOptions;
}

interface OverlayDef<
  N extends string = string,
  C extends React.ComponentType<any> = React.ComponentType<any>,
> {
  readonly _tag: 'overlay';
  readonly name: N;
  readonly component: C;
  readonly options?: ScreenOptions;
}
```

### RouterConfig

```typescript
interface RouterConfig<
  TTabs extends TabDef[] = TabDef[],
  TModals extends OverlayDef[] = [],
  TSheets extends OverlayDef[] = [],
> {
  tabs: [...TTabs];      // Tuple spread for literal type inference
  modals?: [...TModals];
  sheets?: [...TSheets];
  initialTab: TTabs[number]['name'];  // Autocompletes to valid tab names
}
```

Key: `tabOrder` is eliminated. The array order of `tabs` IS the display order.

### Type Inference

```typescript
// Extract path params: 'post-detail/:postId' -> { postId: string }
type ExtractParams<T extends string> =
  T extends `${string}:${infer Param}/${infer Rest}`
    ? { [K in Param]: string } & ExtractParams<Rest>
    : T extends `${string}:${infer Param}`
      ? { [K in Param]: string }
      : {};

// Infer overlay params from component's ScreenComponentProps type
// ShareSheet: FC<ScreenComponentProps<{ postId: string; title: string }>>
//   -> InferComponentParams = { postId: string; title: string }
// HomeScreen: FC (no params prop)
//   -> InferComponentParams = {}
type InferComponentParams<C> =
  C extends React.ComponentType<ScreenComponentProps<infer P>>
    ? P extends Record<string, Serializable>
      ? P
      : {}
    : {};

// Infer full RouteMap from config
type InferRouteMap<
  TTabs extends TabDef[],
  TModals extends OverlayDef[],
  TSheets extends OverlayDef[],
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
      ? { [SD in S[number] as `${N}/${SD['path']}`]: ExtractParams<SD['path']> }
      : never
  }[number]
>;

type UnionToIntersection<U> = (U extends any ? (x: U) => void : never) extends (x: infer I) => void
  ? I
  : never;
```

### Overlay Params — Automatic Inference from Component Props

The key advantage of the function-based API. Overlay params are inferred directly from the component's `ScreenComponentProps<P>` type. No phantom fields or `as` casts:

```typescript
// ShareSheet accepts typed params via ScreenComponentProps:
function ShareSheet({ params }: ScreenComponentProps<{ postId: string; title: string }>) {
  // params.postId, params.title are typed
}

// sheet() infers P = { postId: string; title: string } from ShareSheet's props
sheet('share', ShareSheet)

// NewPostModal has no params:
function NewPostModal() { ... }

// modal() infers P = {} (no params required)
modal('new-post', NewPostModal)
```

This eliminates the `params: {} as { postId: string; title: string }` hack from the object-based approach.

### Screen Registry Change

The `ScreenRegistry` is pre-populated from the config inside `createRouter`:

- `createRouter` iterates over `tabs` (and their `children`), `modals`, and `sheets` definitions
- Each entry is registered in the `ScreenRegistry` at router creation time
- The `Screen` component is **deleted** (no backward compatibility)

### Lazy Loading

`React.lazy()` works because helper functions take component references, not rendered elements:

```typescript
const PostDetailScreen = React.lazy(() => import('./screens/PostDetailScreen'));

const router = createRouter({
  tabs: [
    tab('home', HomeScreen, [
      stack('post-detail/:postId', PostDetailScreen),  // Lazy-loaded
    ]),
  ],
  initialTab: 'home',
});
```

Note: `StackRenderer` and `OverlayRenderer` should wrap component rendering in `<Suspense>` to support `React.lazy()`.

### Config Splitting

Helper functions naturally preserve type information without `satisfies`:

```typescript
// home-routes.ts
import { tab, stack } from 'rehynav';
export const homeTab = tab('home', HomeScreen, [
  stack('post-detail/:postId', PostDetailScreen),
  stack('user/:userId', UserProfileScreen),
]);

// router.ts
import { homeTab } from './home-routes';
import { searchTab } from './search-routes';

const router = createRouter({
  tabs: [homeTab, searchTab],
  initialTab: 'home',
});
```

Shared routes across tabs:

```typescript
const postDetail = stack('post-detail/:postId', PostDetailScreen);

const router = createRouter({
  tabs: [
    tab('home', HomeScreen, [postDetail]),
    tab('search', SearchScreen, [postDetail]),
  ],
  initialTab: 'home',
});
```

### Route Naming Convention

Stack routes defined via `stack(path, component)` are prefixed with their parent tab name at runtime:

- Definition: `stack('post-detail/:postId', PostDetailScreen)` under `tab('home', ...)`
- Navigation: `push('home/post-detail/:postId', { postId: '123' })`

### JSX Usage (After)

```tsx
function App() {
  return (
    <router.NavigationProvider urlSync>
      <router.TabNavigator tabBar={AppTabBar} />
    </router.NavigationProvider>
  );
}
```

## Comparison: Before / After

### Before (Current — 3 layers)

```typescript
// Layer 1: Manual type
type AppRoutes = {
  tabs: { home: Record<string, never>; search: Record<string, never>; profile: Record<string, never> };
  stacks: {
    'home/post-detail/:postId': { postId: string };
    'search/post-detail/:postId': { postId: string };
    'profile/settings': Record<string, never>;
  };
  modals: { 'new-post': Record<string, never> };
  sheets: { share: { postId: string; title: string } };
};

// Layer 2: Router config
const router = createRouter<AppRoutes>({
  tabs: ['home', 'search', 'profile'],
  initialTab: 'home',
  routes: ['home/post-detail/:postId', 'search/post-detail/:postId', 'profile/settings'],
});

// Layer 3: JSX Screen registration
<NavigationProvider urlSync>
  <Screen name="home" component={HomeScreen} />
  <Screen name="home/post-detail/:postId" component={PostDetailScreen} />
  <Screen name="search" component={SearchScreen} />
  <Screen name="search/post-detail/:postId" component={PostDetailScreen} />
  <Screen name="profile" component={ProfileScreen} />
  <Screen name="profile/settings" component={SettingsScreen} />
  <Screen name="new-post" component={NewPostModal} />
  <Screen name="share" component={ShareSheet} />
  <TabNavigator tabBar={AppTabBar} />
</NavigationProvider>
```

### After (Function-based — 1 layer)

```typescript
const router = createRouter({
  tabs: [
    tab('home', HomeScreen, [
      stack('post-detail/:postId', PostDetailScreen),
    ]),
    tab('search', SearchScreen, [
      stack('post-detail/:postId', PostDetailScreen),
    ]),
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

// JSX
<router.NavigationProvider urlSync>
  <router.TabNavigator tabBar={AppTabBar} />
</router.NavigationProvider>
```

## Affected Files

| File | Change |
|------|--------|
| `src/types/routes.ts` | Replace old types with `ExtractParams`, `InferRouteMap`, `InferComponentParams`, definition types |
| `src/types/register.ts` | **Delete** |
| `src/types/props.ts` | Delete `ScreenProps<R, RouteName>`, generic `LinkProps<R, RouteName>` |
| `src/create-router.ts` | Replace `RouterConfig`, single signature, add `parseConfig` |
| `src/route-helpers.ts` | **Create** — `tab()`, `stack()`, `modal()`, `sheet()` helper functions |
| `src/components/Screen.tsx` | **Delete** |
| `src/components/Screen.test.tsx` | **Delete** |
| `src/components/NavigationProvider.tsx` | Delete standalone provider (replaced by `createRouter`'s internal provider) |
| `src/index.ts` | Remove old exports, add `tab`, `stack`, `modal`, `sheet`, new types |
| `src/create-router.test.tsx` | **Rewrite** all tests |
| `examples/sns-app/` | Migrate to new API, delete `routes.ts` |

## Design Decisions

- **Functions over plain objects** — `tab()`, `stack()`, `modal()`, `sheet()` capture generic types from arguments, enabling automatic param inference and eliminating the need for `satisfies` or `as const`
- **Array-based tabs** — Tab display order is the array order. `tabOrder` property is eliminated entirely
- **Overlay params from component props** — `InferComponentParams<C>` extracts `P` from `ScreenComponentProps<P>` in the component's props type. No phantom fields or `as` casts needed
- **`ExtractParams` uses intersection (`&`)** — Avoids the `keyof Record<string, never>` = `string` bug
- **`InferStacksFromTabs` uses `never` for childless tabs** — Prevents `UnionToIntersection` poisoning
- **Screen deleted** — Config-based registration replaces JSX-based registration
- **Old types deleted** — `RouteMap`, `RouterConfig<R>`, `Register`, `Router<R>`, etc.
- **Existing hooks unchanged** — `useNavigation`, `useTab`, `useModal`, `useSheet`, `useRoute`, `useBeforeNavigate`, `useBackHandler` remain the same

## Known Limitations

- **No nested stacks** — `stack()` children cannot have their own children. The runtime stack model is flat
- **Path params are always `string`** — Extracted from URL path segments
- **No optional path params** — `:param?` syntax is not supported
- **No catch-all routes** — `/*` or `/:path*` patterns are not supported
- **Component props inference depends on `ScreenComponentProps`** — Overlay params are only inferred when the component uses `ScreenComponentProps<P>` as its props type. Components with non-standard props structures will infer `{}`
