# rehynav API Design Document

## 1. Competitor Analysis

### React Navigation (v7/v8)

**Good Points:**
- Static API (`createStaticNavigation`) simplifies setup and enables automatic TypeScript inference
- Mature ecosystem with well-documented patterns for tabs + stacks
- `StaticParamList` type utility auto-infers route params from navigator definition
- Global `RootParamList` declaration merging for app-wide type safety

**Areas for Improvement:**
- Dual API (static + dynamic) adds cognitive overhead
- TypeScript setup requires verbose boilerplate (global namespace declaration)
- Tab navigators don't inherently maintain independent stacks; requires manual nesting
- React Native focused; web support is secondary

### Expo Router

**Good Points:**
- File-based routing is intuitive and reduces boilerplate
- Automatic TypeScript type generation from file structure
- Route groups `(group)` for logical organization without URL impact
- Unified API for web and native

**Areas for Improvement:**
- File-based approach doesn't work well for library consumers (requires build tooling)
- Less flexible for programmatic route definition
- Tightly coupled to Expo ecosystem

### Ionic React Router

**Good Points:**
- Each tab has truly independent navigation stacks (key feature for mobile UX)
- `IonRouterOutlet` provides stacked navigation with animations
- Familiar React Router-based API for web developers
- Good model for preserving tab state across switches

**Areas for Improvement:**
- Depends on React Router (extra dependency, version coupling)
- TypeScript support is weaker than alternatives
- Verbose component nesting (`IonTabs > IonRouterOutlet + IonTabBar > IonTabButton`)
- Modal/sheet patterns not built into the router

### TanStack Router

**Good Points:**
- Best-in-class TypeScript inference via `Register` interface pattern (declaration merging)
- `Link` component and hooks auto-complete route paths and validate params
- Search params as first-class typed citizens
- Loaders and route context with full type flow

**Areas for Improvement:**
- Desktop/web focused; no mobile navigation patterns (tabs, stacks, sheets)
- Complex generic type machinery can slow TypeScript compilation
- No built-in animation or transition support

---

## 2. Design Principles

1. **Simplicity First** - Minimal API surface. A basic app should require under 30 lines of navigation code. Setup in 3 steps.
2. **Type Safety by Default** - TypeScript generics for end-to-end type safety with zero extra config. No `declare module` required for the recommended path.
3. **Mobile-First, Web-Compatible** - Independent tab stacks, native-like back behavior, and URL sync built in.
4. **Declarative JSX** - Route structure defined in JSX, not config objects. React developers feel at home.
5. **Progressive Disclosure** - Simple use cases are simple. Advanced features (modals, sheets, guards) are opt-in.
6. **Serializable State** - All navigation state (including route params) must be serializable. No functions, class instances, or other non-serializable values in params.

---

## 3. Route Definition

### 3.1 Route Map Type Definition

The route map is a **nested TypeScript type** that defines all routes organized by category. This is the single source of truth for type safety. Each category (`tabs`, `stacks`, `modals`, `sheets`) explicitly declares the type of navigation each route uses.

```typescript
// Serializable constraint for route params
type Serializable =
  | string | number | boolean | null | undefined
  | Serializable[]
  | { [key: string]: Serializable };

// User defines this type in their app
type AppRoutes = {
  // Tab routes (top-level tabs)
  tabs: {
    home: {};
    search: { query?: string };
    profile: { userId: string };
  };

  // Stack routes (pushable within tabs)
  // Keys must follow the pattern "${tabName}/${path}"
  stacks: {
    "home/detail": { itemId: string };
    "home/detail/comments": { itemId: string; sortBy?: "new" | "top" };
    "profile/settings": {};
    "profile/edit": {};
  };

  // Modal routes (overlay, centered)
  modals: {
    login: {};
    confirm: { title: string; message: string; action: string };
  };

  // Sheet routes (overlay, bottom-anchored)
  sheets: {
    share: { url: string };
    picker: { options: string[] };
  };
};
```

**Convention:**
- `tabs`: Top-level tab root screens. Each key becomes a tab.
- `stacks`: Screens pushable within a tab's stack. Keys must start with a tab name followed by `/` (e.g., `"home/detail"` belongs to the `home` tab). This is enforced at both the type level and runtime.
- `modals`: Overlay screens rendered centered above content.
- `sheets`: Overlay screens rendered anchored to the bottom (bottom sheets).
- Route params must conform to the `Serializable` type. Functions, class instances, and other non-serializable values will cause a compile error.
- Empty categories can be omitted. An app with no sheets simply omits the `sheets` key.

### 3.2 Router Creation

`createRouter` returns a typed router instance that includes all hooks and components pre-bound with the correct types. **No `declare module` is needed.**

```typescript
import { createRouter } from "rehynav";

// createRouter returns typed hooks and components
const router = createRouter<AppRoutes>({
  tabs: ["home", "search", "profile"],
  initialTab: "home",
});

// Destructure hooks and components for use throughout the app
const {
  NavigationProvider,
  Screen,
  Link,
  TabNavigator,
  useNavigation,
  useRoute,
  useTab,
  useModal,
  useSheet,
  useBeforeNavigate,
  useBackHandler,
} = router;
```

**Setup is 3 steps:**
1. Define route types
2. Call `createRouter` and destructure hooks/components
3. Wire up the app

**Stack route validation:** `createRouter` validates at runtime (in development mode) that all stack route prefixes correspond to registered tab names. For example, a stack route `"settings/detail"` when `"settings"` is not a registered tab will produce:
```
Error: Stack route "settings/detail" has prefix "settings" which is not a registered tab.
Registered tabs: home, search, profile
```

#### Advanced: Global Type Registration

For large apps that prefer globally importable hooks (without passing the router instance), the TanStack Router-style `declare module` pattern is supported as an **advanced option**:

```typescript
// Optional: for global hook imports in large codebases
declare module "rehynav" {
  interface Register {
    router: typeof router;
  }
}

// Now hooks can be imported directly (without router destructuring)
import { useNavigation } from "rehynav"; // typed globally
```

This is **not required** for the recommended setup path. Use it only when:
- You have a large codebase and want to avoid passing the router through modules
- You are building plugins or extensions that need access to the global route types

---

## 4. Public Components

### 4.1 `<NavigationProvider>`

Root component that provides navigation context to the entire app.

```typescript
interface NavigationProviderProps {
  children: React.ReactNode;

  // Optional: sync navigation state to URL (default: true)
  urlSync?: boolean;

  // Optional: base path for URL sync (default: "/")
  basePath?: string;

  // Optional: called when navigation state changes
  onStateChange?: (state: NavigationState) => void;

  // Optional: initial state for restoration (e.g., from localStorage)
  initialState?: NavigationState;
}
```

Note: When using the `createRouter` returned `NavigationProvider`, the `router` prop is automatically bound. The router configuration is already embedded.

**Usage:**
```tsx
function App() {
  return (
    <NavigationProvider>
      <Screen name="home" component={HomeScreen} />
      <Screen name="search" component={SearchScreen} />
      <Screen name="profile" component={ProfileScreen} />
      <TabNavigator />
    </NavigationProvider>
  );
}
```

### 4.2 `<TabNavigator>`

Renders a tab-based layout. Each tab maintains its own independent navigation stack.

```typescript
interface TabNavigatorProps {
  // Custom tab bar component (optional, default tab bar provided)
  tabBar?: React.ComponentType<TabBarProps>;

  // Tab bar position (default: "bottom")
  tabBarPosition?: "top" | "bottom";

  // Whether to preserve tab state when switching tabs (default: true)
  preserveState?: boolean;

  // Whether to lazy-mount tab content (default: true)
  lazy?: boolean;

  // Maximum stack depth per tab before oldest entries are unmounted (default: 10)
  maxStackDepth?: number;
}

interface TabBarProps {
  tabs: TabInfo[];
  activeTab: string;
  onTabPress: (tabName: string) => void;
}

interface TabInfo {
  name: string;
  isActive: boolean;
  badge?: string | number;
}
```

When `maxStackDepth` is exceeded, the oldest non-root entries are unmounted from the DOM (their state is preserved internally). In development mode, a warning is logged:
```
[rehynav] Stack depth limit (10) reached for tab "home".
Oldest non-root entry will be unmounted.
Increase maxStackDepth if this is intentional.
```

**Usage:**
```tsx
<TabNavigator
  tabBar={({ tabs, activeTab, onTabPress }) => (
    <div className="tab-bar">
      {tabs.map((tab) => (
        <button
          key={tab.name}
          className={tab.isActive ? "active" : ""}
          onClick={() => onTabPress(tab.name)}
        >
          {tab.name}
        </button>
      ))}
    </div>
  )}
/>
```

### 4.3 `<Screen>`

Registers a screen component for a route. Placed inside `<NavigationProvider>`. The route's category (tab, stack, modal, sheet) is automatically inferred from the route map — no `type` prop is needed.

```typescript
interface ScreenProps<RouteName extends AllRoutes> {
  // The route name this screen handles
  name: RouteName;

  // The component to render
  component: React.ComponentType<ScreenComponentProps<RouteName>>;

  // Screen-level options
  options?: ScreenOptions;
}

interface ScreenOptions {
  // Screen title (used in headers, accessibility)
  title?: string;

  // Custom transition animation
  transition?: "push" | "fade" | "none" | TransitionConfig;

  // Whether to enable swipe-back gesture (default: true)
  gestureEnabled?: boolean;
}

// Screen component props — params only, use useNavigation() hook for navigation
interface ScreenComponentProps<RouteName extends AllRoutes> {
  params: RouteParams<RouteName>;
}
```

**Unregistered screen error handling:** If a navigation action targets a route with no registered `<Screen>`, rehynav displays a helpful error in development mode:

```
Screen not found: "home/detial"
Did you mean "home/detail"?
Did you forget to add <Screen name="home/detial" component={...} />?
Registered screens: home, search, profile, home/detail, login, share
```

In production, the error is logged via `console.error` without a visual overlay.

Additionally, after `NavigationProvider` mounts, rehynav checks that all routes defined in the route map have a corresponding `<Screen>` registration and warns about any missing ones.

**Usage:**
```tsx
<NavigationProvider>
  {/* Tabs */}
  <Screen name="home" component={HomeScreen} />
  <Screen name="search" component={SearchScreen} />
  <Screen name="profile" component={ProfileScreen} />

  {/* Stacks */}
  <Screen name="home/detail" component={DetailScreen} />
  <Screen name="home/detail/comments" component={CommentsScreen} />
  <Screen name="profile/settings" component={SettingsScreen} />

  {/* Modals */}
  <Screen name="login" component={LoginModal} />
  <Screen name="confirm" component={ConfirmModal} />

  {/* Sheets */}
  <Screen name="share" component={ShareSheet} />

  <TabNavigator />
</NavigationProvider>
```

### 4.4 `<Link>`

Type-safe navigation link component. Renders an `<a>` tag for web semantics. **Only accepts tab and stack routes** — modal and sheet routes cannot be used with `Link` (use `useModal().open()` or `useSheet().open()` instead).

```typescript
// LinkableRoutes excludes modals and sheets
type LinkableRoutes = TabRoutes | StackRoutes;

// For routes with no params
interface LinkPropsNoParams<RouteName extends LinkableRoutes> {
  to: RouteName;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  replace?: boolean;
  // All standard anchor attributes
}

// For routes with required params
interface LinkPropsWithParams<RouteName extends LinkableRoutes> {
  to: RouteName;
  params: RouteParams<RouteName>;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  replace?: boolean;
}

// Union type that requires params only when the route has required params
type LinkProps<RouteName extends LinkableRoutes> =
  RequiredKeys<RouteParams<RouteName>> extends never
    ? LinkPropsNoParams<RouteName> & { params?: RouteParams<RouteName> }
    : LinkPropsWithParams<RouteName>;
```

**Usage:**
```tsx
{/* Route with no params - params prop is optional */}
<Link to="home">Go Home</Link>

{/* Route with required params - TypeScript enforces params */}
<Link to="home/detail" params={{ itemId: "123" }}>
  View Detail
</Link>

{/* Route with optional params */}
<Link to="search" params={{ query: "react" }}>
  Search React
</Link>

{/* Modal routes cause a compile error */}
{/* <Link to="login">Login</Link>  ← Type error! Use useModal().open("login") */}
```

**When to use Link vs useNavigation:**
- Use `<Link>` for declarative navigation in JSX (renders an `<a>` tag with proper href, accessible and SEO-friendly)
- Use `useNavigation().push()` for imperative navigation in event handlers or effects

---

## 5. Public Hooks

All hooks are obtained from the `createRouter` return value and are pre-typed with the app's route map.

### 5.1 `useNavigation()`

Primary navigation hook. Returns typed navigation actions.

```typescript
interface NavigationActions {
  // Push a new screen onto the current tab's stack
  push<RouteName extends StackRoutes>(
    ...args: RequiredKeys<RouteParams<RouteName>> extends never
      ? [to: RouteName, params?: RouteParams<RouteName>]
      : [to: RouteName, params: RouteParams<RouteName>]
  ): void;

  // Pop the current screen off the stack
  pop(): void;

  // Pop to the root of the current tab's stack
  popToRoot(): void;

  // Replace the current screen (no animation, no stack change)
  replace<RouteName extends StackRoutes>(
    ...args: RequiredKeys<RouteParams<RouteName>> extends never
      ? [to: RouteName, params?: RouteParams<RouteName>]
      : [to: RouteName, params: RouteParams<RouteName>]
  ): void;

  // Go back (smart: pops stack, closes modal/sheet, or switches tab)
  goBack(): void;

  // Check if we can go back
  canGoBack(): boolean;
}
```

**Usage:**
```tsx
function DetailScreen({ params }: ScreenComponentProps<"home/detail">) {
  const nav = useNavigation();

  return (
    <div>
      <h1>Item {params.itemId}</h1>
      <button onClick={() => nav.push("home/detail/comments", {
        itemId: params.itemId,
        sortBy: "new",
      })}>
        Comments
      </button>
      <button onClick={() => nav.pop()}>Back</button>
    </div>
  );
}
```

### 5.2 `useRoute()`

Returns information about the current route. **When used inside a Screen component, the route type is automatically inferred** from the Screen registration — no generic parameter needed.

```typescript
interface RouteInfo<RouteName extends AllRoutes = AllRoutes> {
  // Current route name
  name: RouteName;

  // Current route params (typed per-route)
  params: RouteParams<RouteName>;

  // URL path for the current route
  path: string;
}

// Auto-inferred version (inside Screen component)
function useRoute(): RouteInfo<CurrentScreenRoute>;

// Explicit generic version (outside Screen, or for narrowing)
function useRoute<RouteName extends AllRoutes>(): RouteInfo<RouteName>;
```

**Behavior by context:**
- **Inside a Screen component:** Type is automatically inferred from the Screen's route. `useRoute()` returns params typed to that specific route.
- **Outside a Screen component (e.g., layout wrapper):** Returns the union of all route types. Use `route.name` to narrow the type.
- **With explicit generic:** Returns the specified route type. Useful in utility functions.

**Usage:**
```tsx
// Inside Screen — automatic type inference
function ProfileScreen() {
  const route = useRoute();
  // route.params is typed as { userId: string } — no generic needed!
  return <div>User: {route.params.userId}</div>;
}

// Outside Screen — union type, narrow with route.name
function Layout() {
  const route = useRoute();
  if (route.name === "profile") {
    // route.params is narrowed to { userId: string }
  }
}

// Explicit generic — for utility functions
function useCurrentUserId() {
  const route = useRoute<"profile">();
  return route.params.userId;
}
```

### 5.3 `useTab()`

Hook for tab-related information and actions.

```typescript
interface TabActions {
  // Currently active tab name
  activeTab: string;

  // Switch to a specific tab
  switchTab(tabName: string): void;

  // Switch to tab and reset its stack to root
  switchTabAndReset(tabName: string): void;

  // Set badge on a tab
  setBadge(tabName: string, badge: string | number | undefined): void;

  // List of all tab names
  tabs: string[];
}
```

**Usage:**
```tsx
function SomeScreen() {
  const { activeTab, switchTab, setBadge } = useTab();

  useEffect(() => {
    // Set notification badge
    setBadge("home", 3);
  }, []);

  return (
    <button onClick={() => switchTab("profile")}>
      Go to Profile Tab
    </button>
  );
}
```

### 5.4 `useModal()`

Hook for opening and controlling modal routes.

```typescript
interface ModalActions {
  // Open a modal route
  open<RouteName extends ModalRoutes>(
    ...args: RequiredKeys<RouteParams<RouteName>> extends never
      ? [name: RouteName, params?: RouteParams<RouteName>]
      : [name: RouteName, params: RouteParams<RouteName>]
  ): void;

  // Close the current modal (or a specific one)
  close(name?: ModalRoutes): void;

  // Whether a modal is currently open
  isOpen: boolean;

  // Name of the currently open modal (if any)
  current: ModalRoutes | null;
}

// ModalRoutes is derived from the route map's modals category
type ModalRoutes = keyof RegisteredRouteMap['modals'];
```

**Usage:**
```tsx
function ProfileScreen() {
  const modal = useModal();

  return (
    <button onClick={() => modal.open("confirm", {
      title: "Delete?",
      message: "This cannot be undone.",
      action: "delete-account",
    })}>
      Delete Account
    </button>
  );
}
```

### 5.5 `useSheet()`

Hook for opening and controlling sheet (bottom sheet) routes.

```typescript
interface SheetActions {
  // Open a sheet route
  open<RouteName extends SheetRoutes>(
    ...args: RequiredKeys<RouteParams<RouteName>> extends never
      ? [name: RouteName, params?: RouteParams<RouteName>]
      : [name: RouteName, params: RouteParams<RouteName>]
  ): void;

  // Close the current sheet
  close(name?: SheetRoutes): void;

  // Whether a sheet is currently open
  isOpen: boolean;

  // Current sheet name
  current: SheetRoutes | null;
}

// SheetRoutes is derived from the route map's sheets category
type SheetRoutes = keyof RegisteredRouteMap['sheets'];
```

### 5.6 `useBeforeNavigate()`

Hook for intercepting any navigation action. This is the primary navigation guard mechanism.

```typescript
type NavigationDirection = "back" | "forward" | "push" | "replace" | "tab-switch";

function useBeforeNavigate(
  guard: (from: RouteInfo, to: RouteInfo, direction: NavigationDirection) => boolean
): void;
```

The guard is called before any navigation action. Return `true` to allow the navigation, `false` to prevent it.

**v0.x supports synchronous guards only.** Async guards (`Promise<boolean>`) are planned for v1.0.

**Usage:**
```tsx
function FormScreen() {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useBeforeNavigate((from, to, direction) => {
    if (hasUnsavedChanges) {
      return window.confirm("You have unsaved changes. Leave anyway?");
    }
    return true; // allow navigation
  });

  return <form>...</form>;
}
```

### 5.7 `useBackHandler()`

Convenience alias for `useBeforeNavigate` that only intercepts "back" direction navigation. Useful when you only need to customize back button behavior.

```typescript
function useBackHandler(handler: () => boolean): void;
```

The handler is called when the user triggers a "back" action (browser back, swipe-back, Android back button via Capacitor). Return `true` to prevent the default back behavior, `false` to allow it.

Internally, `useBackHandler` is implemented as:
```typescript
function useBackHandler(handler: () => boolean): void {
  useBeforeNavigate((from, to, direction) => {
    if (direction === "back") return !handler(); // Note: inverted — handler returns true to PREVENT
    return true;
  });
}
```

**When to use which:**

| Use case | Recommended hook |
|----------|-----------------|
| Prevent back button only (unsaved form) | `useBackHandler` |
| Prevent all navigation (auth guard) | `useBeforeNavigate` |
| Prevent specific routes (access control) | `useBeforeNavigate` with `to.name` check |

**Usage:**
```tsx
function FormScreen() {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const modal = useModal();

  useBackHandler(() => {
    if (hasUnsavedChanges) {
      modal.open("confirm", {
        title: "Discard changes?",
        message: "You have unsaved changes.",
        action: "discard-form",
      });
      return true; // prevent back
    }
    return false; // allow back
  });

  return <form>...</form>;
}
```

---

## 6. Internal Type Utilities

```typescript
// Route map structure
interface RouteMap {
  tabs: Record<string, Serializable>;
  stacks?: Record<string, Serializable>;
  modals?: Record<string, Serializable>;
  sheets?: Record<string, Serializable>;
}

// Serializable constraint for all route params
type Serializable =
  | string | number | boolean | null | undefined
  | Serializable[]
  | { [key: string]: Serializable };

// Registered route map (populated via declaration merging — advanced usage)
interface Register {}
type RegisteredRouteMap = Register extends { router: Router<infer R> } ? R : never;

// Extract keys that have required properties
type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];

// Route categories derived from route map structure
type TabRoutes = keyof RegisteredRouteMap['tabs'];
type StackRoutes = keyof RegisteredRouteMap['stacks'];
type ModalRoutes = keyof RegisteredRouteMap['modals'];
type SheetRoutes = keyof RegisteredRouteMap['sheets'];

// All route names (union of all categories)
type AllRoutes = TabRoutes | StackRoutes | ModalRoutes | SheetRoutes;

// Linkable routes (only tabs and stacks — modals/sheets excluded)
type LinkableRoutes = TabRoutes | StackRoutes;

// Route params accessor (resolves params from the nested route map)
type RouteParams<RouteName extends AllRoutes> =
  RouteName extends TabRoutes ? RegisteredRouteMap['tabs'][RouteName] :
  RouteName extends StackRoutes ? RegisteredRouteMap['stacks'][RouteName] :
  RouteName extends ModalRoutes ? RegisteredRouteMap['modals'][RouteName] :
  RouteName extends SheetRoutes ? RegisteredRouteMap['sheets'][RouteName] :
  never;

// Stack route key validation: must start with a tab name
type ValidStackKey<Tabs extends string> = `${Tabs}/${string}`;
```

---

## 7. Usage Examples

### 7.1 Basic 3-Tab App

```tsx
import { createRouter } from "rehynav";

// 1. Define route types
type AppRoutes = {
  tabs: {
    home: {};
    search: { query?: string };
    profile: {};
  };
};

// 2. Create router and get typed hooks/components
const router = createRouter<AppRoutes>({
  tabs: ["home", "search", "profile"],
  initialTab: "home",
});

const { NavigationProvider, Screen, TabNavigator } = router;

// 3. Define screens and wire it up
function HomeScreen() {
  return <div><h1>Home</h1></div>;
}

function SearchScreen({ params }: { params: { query?: string } }) {
  return <div><h1>Search: {params.query}</h1></div>;
}

function ProfileScreen() {
  return <div><h1>Profile</h1></div>;
}

function App() {
  return (
    <NavigationProvider>
      <Screen name="home" component={HomeScreen} />
      <Screen name="search" component={SearchScreen} />
      <Screen name="profile" component={ProfileScreen} />
      <TabNavigator />
    </NavigationProvider>
  );
}
```

### 7.2 Stack Push/Pop within a Tab

```tsx
type AppRoutes = {
  tabs: {
    home: {};
    search: {};
    profile: {};
  };
  stacks: {
    "home/detail": { itemId: string };
    "home/detail/comments": { itemId: string };
  };
};

const router = createRouter<AppRoutes>({
  tabs: ["home", "search", "profile"],
  initialTab: "home",
});

const { NavigationProvider, Screen, TabNavigator, Link, useNavigation } = router;

function HomeScreen() {
  const items = ["item-1", "item-2", "item-3"];

  return (
    <ul>
      {items.map((id) => (
        <li key={id}>
          {/* Type-safe: params must include itemId */}
          <Link to="home/detail" params={{ itemId: id }}>
            Item {id}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function DetailScreen({ params }: { params: { itemId: string } }) {
  const nav = useNavigation();

  return (
    <div>
      <h1>Detail: {params.itemId}</h1>
      <button onClick={() => nav.push("home/detail/comments", {
        itemId: params.itemId,
      })}>
        View Comments
      </button>
      <button onClick={() => nav.pop()}>Back</button>
      <button onClick={() => nav.popToRoot()}>Back to Home</button>
    </div>
  );
}
```

### 7.3 Modal with Action Pattern

```tsx
type AppRoutes = {
  tabs: {
    home: {};
    profile: {};
    search: {};
  };
  modals: {
    login: {};
    confirm: { title: string; message: string; action: string };
  };
};

const router = createRouter<AppRoutes>({
  tabs: ["home", "profile", "search"],
  initialTab: "home",
});

const { NavigationProvider, Screen, TabNavigator, useModal } = router;

function ProfileScreen() {
  const modal = useModal();

  const handleDeleteAccount = () => {
    modal.open("confirm", {
      title: "Delete Account",
      message: "Are you sure? This action cannot be undone.",
      action: "delete-account",
    });
  };

  return (
    <div>
      <h1>Profile</h1>
      <button onClick={handleDeleteAccount}>Delete Account</button>
    </div>
  );
}

function ConfirmModal({ params }: { params: { title: string; message: string; action: string } }) {
  const modal = useModal();

  const handleConfirm = () => {
    switch (params.action) {
      case "delete-account":
        // Call your delete account API
        break;
      case "delete-post":
        // Call your delete post API
        break;
    }
    modal.close();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>{params.title}</h2>
        <p>{params.message}</p>
        <button onClick={() => modal.close()}>Cancel</button>
        <button onClick={handleConfirm}>Confirm</button>
      </div>
    </div>
  );
}
```

> **Future (v1.0):** Promise-based modal results are planned, enabling patterns like:
> ```typescript
> const result = await modal.prompt("confirm", { title: "Delete?", message: "..." });
> if (result.confirmed) { deleteAccount(); }
> ```

### 7.4 Tab Switching

```tsx
function HomeScreen() {
  const { switchTab } = useTab();
  const nav = useNavigation();

  return (
    <div>
      <h1>Home</h1>

      {/* Switch tab (preserves profile tab's stack state) */}
      <button onClick={() => switchTab("profile")}>
        Go to Profile Tab
      </button>

      {/* Switch tab and reset its stack */}
      <button onClick={() => switchTab("search")}>
        New Search
      </button>

      {/* Push within current tab's stack */}
      <button onClick={() => nav.push("home/detail", { itemId: "42" })}>
        View Item
      </button>
    </div>
  );
}
```

### 7.5 Full App Example (Combined)

```tsx
import { createRouter } from "rehynav";

type AppRoutes = {
  tabs: {
    home: {};
    search: { query?: string };
    profile: { userId: string };
  };
  stacks: {
    "home/detail": { itemId: string };
    "profile/settings": {};
  };
  modals: {
    login: {};
  };
  sheets: {
    share: { url: string };
  };
};

const router = createRouter<AppRoutes>({
  tabs: ["home", "search", "profile"],
  initialTab: "home",
});

const {
  NavigationProvider,
  Screen,
  TabNavigator,
  useNavigation,
  useModal,
  useSheet,
  useTab,
  useRoute,
  useBeforeNavigate,
  useBackHandler,
} = router;

function App() {
  return (
    <NavigationProvider>
      {/* Tabs */}
      <Screen name="home" component={HomeScreen} />
      <Screen name="search" component={SearchScreen} />
      <Screen name="profile" component={ProfileScreen} />

      {/* Stacks */}
      <Screen name="home/detail" component={DetailScreen} />
      <Screen name="profile/settings" component={SettingsScreen} />

      {/* Modals */}
      <Screen name="login" component={LoginModal} />

      {/* Sheets */}
      <Screen name="share" component={ShareSheet} />

      <TabNavigator />
    </NavigationProvider>
  );
}
```

---

## 8. Export Summary

### From `createRouter()` return value (recommended)

| Member | Description |
|---|---|
| `NavigationProvider` | Root provider, wraps entire app |
| `TabNavigator` | Renders tab layout with independent stacks |
| `Screen` | Maps a route name to a component |
| `Link` | Type-safe navigation link (`<a>` on web, tabs/stacks only) |
| `useNavigation()` | `push`, `pop`, `popToRoot`, `replace`, `goBack`, `canGoBack` |
| `useRoute()` | Current route name, params, path (auto-inferred in Screen) |
| `useTab()` | `activeTab`, `switchTab`, `setBadge`, `tabs` |
| `useModal()` | `open`, `close`, `isOpen`, `current` |
| `useSheet()` | `open`, `close`, `isOpen`, `current` |
| `useBeforeNavigate()` | Intercept any navigation (navigation guard) |
| `useBackHandler()` | Convenience alias: intercept back navigation only |

### Package exports (for advanced global registration)

| Export | Description |
|---|---|
| `createRouter()` | Creates a typed router instance with all hooks/components |
| `Register` | Declaration merging interface for global type registration (advanced) |

### Types

| Type | Description |
|---|---|
| `ScreenComponentProps<RouteName>` | Props type for screen components (`{ params }`) |
| `NavigationProviderProps` | Props for NavigationProvider |
| `TabNavigatorProps` | Props for TabNavigator |
| `TabBarProps` | Props for custom tab bar component |
| `ScreenOptions` | Options for screen configuration |
| `NavigationState` | Serializable navigation state |
| `NavigationDirection` | `"back" \| "forward" \| "push" \| "replace" \| "tab-switch"` |
| `Serializable` | Constraint type for route params |

---

## 9. Design Decisions & Rationale

### Why nested route map instead of prefix conventions?

**Previous design** used prefix conventions (`#` for modals, `$` for sheets, `/` for stacks) in a flat route map. This was replaced with a nested structure (`tabs`, `stacks`, `modals`, `sheets`) for the following reasons:

1. **Clarity:** The nested structure is self-documenting. A new developer reading the route map immediately understands the navigation structure without learning prefix conventions.
2. **No symbol conflicts:** `#` conflicts with URL fragments and TypeScript private fields. `$` is associated with jQuery and template literals. Nested keys avoid all such associations.
3. **IDE support:** Typing `modals.` in an IDE shows only modal routes. The flat prefix approach required memorizing symbols.
4. **Extensibility:** Adding a new overlay category (e.g., `drawers`) requires only adding a new key to the route map. Prefix conventions would require inventing new symbols.
5. **Type extraction:** `keyof RouteMap['modals']` is simpler than `Extract<keyof RouteMap, '#${string}'>`.

The one `Screen` component still handles all route types, and the category is auto-inferred from the route map.

### Why `createRouter` returns hooks instead of relying on `declare module`?

The `declare module` pattern (inspired by TanStack Router) is powerful but has DX issues:

1. **Unfamiliar to most React developers.** Declaration merging is an advanced TypeScript feature.
2. **Easy to forget.** Omitting it produces confusing type errors.
3. **Dual import paths.** Both `import { useNavigation } from "rehynav"` and router-instance-based access exist, confusing users about which to use.

By returning hooks from `createRouter`, we achieve the same type safety with a more familiar pattern (similar to Zustand's `create()` and tRPC's `createTRPCReact()`). The `declare module` pattern remains available as an advanced option for large codebases.

### Why independent tab stacks by default?

Ionic's model of independent per-tab stacks is the correct mobile UX pattern. Users expect that switching tabs preserves their navigation position within each tab. This is the default in rehynav, unlike React Navigation where it requires manual setup.

### Why JSX-based Screen registration?

Flat `<Screen>` components inside `<NavigationProvider>` are simpler than nested navigator structures. The route hierarchy is already encoded in the route names (`"home/detail/comments"`), so nesting components would be redundant. This is a deliberate departure from React Navigation's nested navigator pattern.

### Why `Serializable` constraint on params?

Navigation state must be fully serializable for:
- State persistence (localStorage, sessionStorage)
- History API state storage
- Deep link restoration from URLs
- Time-travel debugging

Functions, class instances, Dates, and other non-serializable values would break these features. The `Serializable` type constraint catches violations at compile time rather than at runtime.

For patterns that need callbacks (e.g., confirmation modals), use the **action string pattern**: pass an action identifier as a serializable param, and resolve the actual callback on the receiving end. See Section 7.3 for an example.

### Why `useBeforeNavigate` subsumes `useBackHandler`?

Originally, `useBackHandler` was the only navigation interception mechanism. However, many use cases (form protection, auth guards) need to intercept _all_ navigation, not just back. `useBeforeNavigate` provides a superset of `useBackHandler`'s functionality via the `direction` parameter.

`useBackHandler` is retained as a convenience alias because:
1. The name clearly communicates intent for the most common use case
2. The simpler callback signature (`() => boolean`) is easier for the "just prevent back" case
3. Migrating users don't need to rewrite existing code

### Why React 19+ only?

rehynav v0.x targets React 19+ to:
- Reduce maintenance burden during the experimental phase
- Leverage React 19 improvements without compatibility shims
- Keep the codebase focused on a single React version

React 18 support may be added in v1.0 based on community demand.
