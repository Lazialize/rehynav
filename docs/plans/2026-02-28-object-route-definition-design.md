# Object-Based Route Definition Design

## Summary

Replace the current three-layer route definition (manual RouteMap type + createRouter config + JSX Screen components) with a single Record-based config object passed to `createRouter`. Route types are automatically inferred from the config, eliminating manual type definitions.

## Motivation

Current route definition requires the same information in three places:

1. `RouteMap` type — manual TypeScript type with route names and params
2. `RouterConfig` — `tabs` array and `routes` array passed to `createRouter`
3. `Screen` components — JSX elements registering route-to-component mappings

This causes maintenance burden and risk of drift between type definitions and runtime config.

## Design

### New Config Structure (Record-based)

```typescript
const router = createRouter({
  tabs: {
    home: {
      component: HomeScreen,
      children: {
        'post-detail/:postId': { component: PostDetailScreen },
      },
    },
    search: { component: SearchScreen },
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
```

### Config Type Definitions

```typescript
interface TabRouteConfig {
  component: React.ComponentType<any>;
  children?: Record<string, StackRouteConfig>;
}

interface StackRouteConfig {
  component: React.ComponentType<any>;
  options?: ScreenOptions;
}

interface OverlayRouteConfig {
  component: React.ComponentType<any>;
}

interface RouterConfig<
  TTabs extends Record<string, TabRouteConfig>,
  TModals extends Record<string, OverlayRouteConfig> = {},
  TSheets extends Record<string, OverlayRouteConfig> = {},
> {
  tabs: TTabs;
  modals?: TModals;
  sheets?: TSheets;
  initialTab: keyof TTabs & string;
  tabOrder: Array<keyof TTabs & string>;
}
```

### Type Inference

Route types are automatically inferred from the config object. Object keys are naturally inferred as string literal types, so `as const` is not required.

```typescript
// Extract path params: 'post-detail/:postId' → { postId: string }
type ExtractParams<T extends string> =
  T extends `${string}:${infer Param}/${infer Rest}`
    ? { [K in Param | keyof ExtractParams<Rest>]: string }
    : T extends `${string}:${infer Param}`
      ? { [K in Param]: string }
      : Record<string, never>;

// Infer tab names from config
type InferTabNames<T extends Record<string, TabRouteConfig>> = Extract<keyof T, string>;

// Infer stack routes: tab/childPath
type InferStackRoutes<T extends Record<string, TabRouteConfig>> = {
  [Tab in keyof T & string]: T[Tab] extends { children: infer C }
    ? C extends Record<string, StackRouteConfig>
      ? { [Path in keyof C & string]: `${Tab}/${Path}` }[keyof C & string]
      : never
    : never;
}[keyof T & string];

// Infer full RouteMap from config
type InferRouteMap<
  TTabs extends Record<string, TabRouteConfig>,
  TModals extends Record<string, OverlayRouteConfig>,
  TSheets extends Record<string, OverlayRouteConfig>,
> = {
  tabs: { [K in keyof TTabs & string]: Record<string, never> };
  stacks: {
    [Tab in keyof TTabs & string]: TTabs[Tab] extends { children: infer C }
      ? C extends Record<string, StackRouteConfig>
        ? { [Path in keyof C & string as `${Tab}/${Path}`]: ExtractParams<Path> }
        : never
      : never;
  }[keyof TTabs & string];
  modals: { [K in keyof TModals & string]: Record<string, never> };
  sheets: { [K in keyof TSheets & string]: Record<string, never> };
};
```

### Screen Registry Change

The `ScreenRegistry` is pre-populated from the config inside `createRouter`, replacing the current dynamic JSX-based registration:

- `createRouter` iterates over config.tabs (and their children), config.modals, and config.sheets
- Each entry is registered in the `ScreenRegistry` at router creation time
- The `Screen` component is marked as deprecated but kept for backward compatibility (lazy loading use cases)

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

## Affected Files

| File | Change |
|------|--------|
| `src/types/routes.ts` | Add `InferRouteMap`, `ExtractParams`, and related type utilities |
| `src/create-router.ts` | Change `RouterConfig` to Record-based, pre-populate screen registry from config |
| `src/components/Screen.tsx` | Mark as deprecated |
| `examples/sns-app/` | Migrate to new API |
| Tests | Update to new API |

## Design Decisions

- **Record keys over arrays** — Object keys are naturally inferred as literal types, avoiding the need for `as const`
- **`tabOrder` for ordering** — Since Record key order is not guaranteed, tab display order is explicitly specified via `tabOrder`
- **Screen kept as deprecated** — Not removed for backward compatibility and dynamic registration use cases
- **Existing hooks unchanged** — `useNavigation`, `useTab`, `useModal`, `useSheet`, `useRoute`, `useBeforeNavigate`, `useBackHandler` remain the same
