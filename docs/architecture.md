# rehynav - Internal Architecture Design

## Table of Contents

1. [Navigation State Model](#1-navigation-state-model)
2. [State Management Strategy](#2-state-management-strategy)
3. [Back Behavior Priority Logic](#3-back-behavior-priority-logic)
4. [URL Synchronization](#4-url-synchronization)
5. [Screen Lifecycle and Rendering](#5-screen-lifecycle-and-rendering)
6. [Error Handling](#6-error-handling)
7. [Directory Structure](#7-directory-structure)

---

## 1. Navigation State Model

### 1.1 Core Type Definitions

The entire navigation state is represented as a single serializable object. This enables state persistence (localStorage, server-side), time-travel debugging, and deep link restoration.

```typescript
// ---- Serializable Constraint ----

type Serializable =
  | string | number | boolean | null | undefined
  | Serializable[]
  | { [key: string]: Serializable };

// ---- Stack Entry ----

interface StackEntry {
  /** Unique ID for this entry (for React keys and History API state) */
  id: string;
  /** Route name (e.g., "home/detail") */
  route: string;
  /** Route params (must be serializable) */
  params: Record<string, Serializable>;
  /** Timestamp when this entry was pushed (for ordering/debugging) */
  timestamp: number;
}

// ---- Per-Tab State ----

interface TabState {
  /** Tab root route name (e.g., "home") */
  name: string;
  /** Stack of screens within this tab. Index 0 = root, last = top. */
  stack: StackEntry[];
  /** Whether this tab has been mounted at least once (for lazy loading) */
  hasBeenActive: boolean;
}

// ---- Overlay Layer ----

type OverlayType = 'modal' | 'sheet';

interface OverlayEntry {
  id: string;
  type: OverlayType;
  route: string;
  params: Record<string, Serializable>;
  timestamp: number;
}

// ---- Root Navigation State ----

interface NavigationState {
  /** All tab states, keyed by tab name */
  tabs: Record<string, TabState>;
  /** Currently active tab name */
  activeTab: string;
  /** Ordered list of tabs (for tab bar rendering) */
  tabOrder: string[];
  /** Overlay stack (modals and sheets, rendered above tabs) */
  overlays: OverlayEntry[];
  /** Tab badge values */
  badges: Record<string, string | number | undefined>;
}
```

### 1.2 Design Decisions

**Why a single `overlays` array instead of separate `modals` and `sheets`?**

Modals and sheets share the same behavioral semantics: they appear above the tab content, stack on top of each other, and are dismissed in LIFO order. A unified array preserves the true stacking order. The `type` field differentiates them for rendering purposes (modal = centered overlay, sheet = bottom-anchored). This also means that a sheet can be opened on top of a modal, or vice versa, which is a valid mobile UX pattern.

**Why `id` on StackEntry and OverlayEntry?**

Unique IDs serve three purposes:
1. React `key` prop for stable component identity across re-renders
2. History API state correlation (`history.state.entryId`)
3. Equality checks when comparing entries

IDs are generated via a `createId()` helper function at the **dispatch site** (not inside the reducer), keeping the reducer pure. The helper uses `crypto.randomUUID()` with a fallback for older environments:

```typescript
function createId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
```

**Why `timestamp`?**

Timestamps aid debugging and can be used for analytics. They are excluded from equality comparisons. Like IDs, timestamps are generated at the dispatch site, not inside the reducer.

**Why `hasBeenActive` on TabState?**

Supports lazy tab mounting. Tabs that have never been visited don't mount their root screen until the user first switches to them, reducing initial render cost.

### 1.3 State Transition Patterns

All state transitions are **pure functions**: `(state, action) => newState`. The reducer contains no side effects — all non-deterministic values (`id`, `timestamp`) are included in the action payload by the dispatch layer.

```typescript
type NavigationAction =
  | { type: 'PUSH'; route: string; params: Record<string, Serializable>; id: string; timestamp: number }
  | { type: 'POP' }
  | { type: 'POP_TO_ROOT' }
  | { type: 'REPLACE'; route: string; params: Record<string, Serializable>; id: string; timestamp: number }
  | { type: 'SWITCH_TAB'; tab: string }
  | { type: 'SWITCH_TAB_AND_RESET'; tab: string }
  | { type: 'OPEN_OVERLAY'; overlayType: OverlayType; route: string; params: Record<string, Serializable>; id: string; timestamp: number }
  | { type: 'CLOSE_OVERLAY'; route?: string }
  | { type: 'GO_BACK' }
  | { type: 'RESTORE_TO_ENTRY'; entryId: string }
  | { type: 'SET_BADGE'; tab: string; badge: string | number | undefined };

function navigationReducer(state: NavigationState, action: NavigationAction): NavigationState {
  // Pure function, returns new state (immutable updates)
}
```

**Key changes from previous design:**
- `OPEN_MODAL` / `CLOSE_MODAL` / `OPEN_SHEET` / `CLOSE_SHEET` are unified into `OPEN_OVERLAY` / `CLOSE_OVERLAY`. The overlay type is specified in the `overlayType` field.
- `RESTORE_TO_ENTRY` is added for History API forward/back navigation (replaces the old approach of always dispatching `GO_BACK` on popstate).
- All actions that create entries (`PUSH`, `REPLACE`, `OPEN_OVERLAY`) include `id` and `timestamp` in the payload.

**Transition semantics:**

| Action | Behavior |
|--------|----------|
| `PUSH` | Determine target tab from route prefix, push onto that tab's stack. If route belongs to a different tab, switch to it first. |
| `POP` | Pop the top entry from the active tab's stack. If stack has only root, no-op. |
| `POP_TO_ROOT` | Reset active tab's stack to contain only the root entry. |
| `REPLACE` | Replace the top entry of the active tab's stack. |
| `SWITCH_TAB` | Change `activeTab`. Mark target tab as `hasBeenActive = true`. Preserve stack state. |
| `SWITCH_TAB_AND_RESET` | Switch tab and reset its stack to root only. |
| `OPEN_OVERLAY` | Push a new overlay entry onto the overlays array with the specified `overlayType`. |
| `CLOSE_OVERLAY` | Remove the topmost overlay. If `route` specified, remove that specific overlay. |
| `GO_BACK` | Smart back: close topmost overlay first, then pop stack, then no-op at tab root. |
| `RESTORE_TO_ENTRY` | Find the entry by `entryId` across all tabs and overlays, restore state to match that entry as the current view. Used for browser forward/back navigation. |
| `SET_BADGE` | Update the badge value for a tab. |

**Route-to-tab resolution:**

```typescript
function resolveTabForRoute(route: string, tabOrder: string[]): string | null {
  // "home/detail/comments" -> "home"
  // "home" -> "home"
  const firstSegment = route.split('/')[0];
  return tabOrder.includes(firstSegment) ? firstSegment : null;
}
```

Note: With the nested route map, modals and sheets are no longer identified by prefix (`#`, `$`). The route category is determined by which section of the route map the route belongs to. `resolveTabForRoute` is only called for tab and stack routes.

### 1.4 Initial State Factory

```typescript
function createInitialState(
  config: { tabs: string[]; initialTab: string },
  createId: () => string,
  now: () => number,
): NavigationState {
  const tabs: Record<string, TabState> = {};
  for (const tab of config.tabs) {
    tabs[tab] = {
      name: tab,
      stack: [{
        id: createId(),
        route: tab,
        params: {},
        timestamp: now(),
      }],
      hasBeenActive: tab === config.initialTab,
    };
  }

  return {
    tabs,
    activeTab: config.initialTab,
    tabOrder: config.tabs,
    overlays: [],
    badges: {},
  };
}
```

Note: `createId` and `now` are injected parameters (not called directly), making `createInitialState` a pure function that is fully testable with deterministic values.

---

## 2. State Management Strategy

### 2.1 Options Comparison

| Approach | Re-render Control | SSR Compatible | Bundle Size | Complexity |
|----------|-------------------|----------------|-------------|------------|
| **React Context + useReducer** | Poor (all consumers re-render) | Yes | 0 KB | Low |
| **useSyncExternalStore** | Good (selector-based) | Yes | 0 KB | Medium |
| **Zustand** | Good (selector-based) | Yes | ~1.2 KB | Low |

### 2.2 Recommendation: useSyncExternalStore (External Store Pattern)

**Why:**

1. **Zero dependencies** - Uses React's built-in `useSyncExternalStore`. Since rehynav targets React 19+, this is guaranteed available.
2. **Selector-based subscriptions** - Components only re-render when the slice of state they select actually changes. This is critical for performance in navigation libraries where many components depend on navigation state but only a few are affected by each transition.
3. **Testability** - The store is a plain JavaScript object with no React dependency. Core logic can be tested in pure unit tests.
4. **SSR compatible** - `useSyncExternalStore` has a `getServerSnapshot` parameter for server-side rendering.
5. **Zustand-like DX without the dependency** - The API is essentially the same pattern Zustand uses internally, but without adding a dependency.

**Why not Context + useReducer:**

Context causes all consumers to re-render on every state change. For navigation, this means every `useRoute()`, `useTab()`, `useModal()`, and `useSheet()` hook would re-render on every navigation action, even if the specific slice they care about didn't change. React.memo and useMemo can mitigate but add complexity and are error-prone.

**Why not Zustand:**

Zustand would work well and uses the same `useSyncExternalStore` internally. However, adding a dependency for something this small is unnecessary. The store logic for rehynav is ~50 lines of code. Zustand's value is in its middleware system and devtools integration, neither of which we need at this stage. If we later want devtools, we can add a middleware hook to our store without adding a dependency.

### 2.3 Store Implementation

The store wraps the pure reducer with a dispatch method that auto-generates `id` and `timestamp` for actions that need them. This keeps the reducer pure while providing a convenient API for hooks.

```typescript
type Listener = () => void;

interface NavigationStore {
  getState(): NavigationState;
  dispatch(action: NavigationAction): void;
  subscribe(listener: Listener): () => void;
  getServerSnapshot(): NavigationState;
}

function createNavigationStore(initialState: NavigationState): NavigationStore {
  let state = initialState;
  const listeners = new Set<Listener>();

  return {
    getState() {
      return state;
    },

    dispatch(action: NavigationAction) {
      const nextState = navigationReducer(state, action);
      if (nextState !== state) {
        state = nextState;
        for (const listener of listeners) {
          listener();
        }
      }
    },

    subscribe(listener: Listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    getServerSnapshot() {
      return state;
    },
  };
}
```

The hooks layer (e.g., `useNavigation().push()`) is responsible for constructing full action objects with `id` and `timestamp` before calling `store.dispatch()`.

### 2.4 Selector-Based Hooks

Each public hook selects only the slice of state it needs, preventing unnecessary re-renders.

```typescript
import { useSyncExternalStore } from 'react';

// Internal hook: select a slice of navigation state
function useNavigationSelector<T>(selector: (state: NavigationState) => T): T {
  const store = useNavigationStore(); // from context (see below)
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(store.getServerSnapshot()),
  );
}

// Example: useTab only re-renders when activeTab or badges change
function useTab(): TabActions {
  const store = useNavigationStore();
  const activeTab = useNavigationSelector((s) => s.activeTab);
  const tabs = useNavigationSelector((s) => s.tabOrder);
  const badges = useNavigationSelector((s) => s.badges);

  return useMemo(() => ({
    activeTab,
    tabs,
    switchTab: (tab: string) => store.dispatch({ type: 'SWITCH_TAB', tab }),
    switchTabAndReset: (tab: string) => store.dispatch({ type: 'SWITCH_TAB_AND_RESET', tab }),
    setBadge: (tab: string, badge: string | number | undefined) =>
      store.dispatch({ type: 'SET_BADGE', tab, badge }),
  }), [activeTab, tabs, badges, store]);
}
```

### 2.5 Immutability Strategy

All state updates in `navigationReducer` produce new objects via spread syntax. No deep cloning -- only the changed paths are recreated.

```typescript
// Example: PUSH action (reducer is pure — id and timestamp come from action)
case 'PUSH': {
  const tab = resolveTabForRoute(action.route, state.tabOrder);
  if (!tab) return state;

  const newEntry: StackEntry = {
    id: action.id,
    route: action.route,
    params: action.params,
    timestamp: action.timestamp,
  };

  const targetTab = state.tabs[tab];
  const newTabState: TabState = {
    ...targetTab,
    stack: [...targetTab.stack, newEntry],
    hasBeenActive: true,
  };

  return {
    ...state,
    activeTab: tab,
    tabs: {
      ...state.tabs,
      [tab]: newTabState,
    },
  };
}
```

This structural sharing approach means:
- Unchanged tabs keep the same object reference (selectors comparing `state.tabs.search` won't trigger re-renders)
- Only the modified tab's state is a new object
- Array spreads for stacks are acceptable since stacks are typically small (< 10 entries)

### 2.6 Store Context

The store instance is passed through a minimal React Context. This context does NOT trigger re-renders because it holds a stable reference to the store object (the store itself never changes, only its internal state does).

```typescript
const NavigationStoreContext = createContext<NavigationStore | null>(null);

function useNavigationStore(): NavigationStore {
  const store = useContext(NavigationStoreContext);
  if (!store) {
    throw new Error('useNavigationStore must be used within NavigationProvider');
  }
  return store;
}
```

The `NavigationProvider` creates the store once and provides it:

```typescript
function NavigationProvider({ children, ...props }: NavigationProviderProps) {
  const storeRef = useRef<NavigationStore | null>(null);
  if (!storeRef.current) {
    const initial = props.initialState ?? createInitialState(routerConfig, createId, Date.now);
    storeRef.current = createNavigationStore(initial);
  }

  return (
    <NavigationStoreContext.Provider value={storeRef.current}>
      {children}
    </NavigationStoreContext.Provider>
  );
}
```

---

## 3. Back Behavior Priority Logic

### 3.1 Priority Order

When the user triggers a "back" action (browser back button, swipe gesture, Android hardware back button, or programmatic `goBack()`), the following priority chain determines the behavior:

```
1. useBeforeNavigate guards (user-defined, can prevent navigation)
2. Close topmost overlay (sheet or modal, regardless of type)
3. Pop active tab's stack (if stack depth > 1)
4. Switch to previous tab (if tab history exists) [optional/future]
5. No-op / exit signal (at the root of the initial tab)
```

Steps 2 and 3 are handled by the `GO_BACK` action in the reducer. Step 1 is handled before dispatch by the navigation guard registry.

### 3.2 Navigation Guard Registry

`useBeforeNavigate` registers guard functions that are checked before any navigation action. Guards are tracked in a ref-based registry (not in navigation state, since they are ephemeral React-lifecycle-bound callbacks).

```typescript
interface NavigationGuardRegistry {
  guards: Array<{ id: string; guard: (from: RouteInfo, to: RouteInfo, direction: NavigationDirection) => boolean }>;
  register(id: string, guard: (...args: any[]) => boolean): void;
  unregister(id: string): void;
  check(from: RouteInfo, to: RouteInfo, direction: NavigationDirection): boolean;
}

type NavigationDirection = 'back' | 'forward' | 'push' | 'replace' | 'tab-switch';

// useBeforeNavigate implementation
function useBeforeNavigate(
  guard: (from: RouteInfo, to: RouteInfo, direction: NavigationDirection) => boolean
): void {
  const registry = useNavigationGuardRegistry(); // from context
  const id = useId();

  useEffect(() => {
    registry.register(id, guard);
    return () => registry.unregister(id);
  }, [registry, id, guard]);
}

// useBackHandler is a convenience alias
function useBackHandler(handler: () => boolean): void {
  useBeforeNavigate((from, to, direction) => {
    if (direction === 'back') return !handler(); // inverted: handler returns true to PREVENT
    return true; // allow non-back navigation
  });
}
```

### 3.3 Back Handler State Machine

```typescript
interface BackResult {
  /** Whether the back action was handled */
  handled: boolean;
  /** The new navigation state after the back action */
  state: NavigationState;
}

function handleBack(state: NavigationState): BackResult {
  // Step 1: Close topmost overlay (sheet or modal)
  if (state.overlays.length > 0) {
    return {
      handled: true,
      state: {
        ...state,
        overlays: state.overlays.slice(0, -1),
      },
    };
  }

  // Step 2: Pop active tab's stack
  const activeTabState = state.tabs[state.activeTab];
  if (activeTabState.stack.length > 1) {
    return {
      handled: true,
      state: {
        ...state,
        tabs: {
          ...state.tabs,
          [state.activeTab]: {
            ...activeTabState,
            stack: activeTabState.stack.slice(0, -1),
          },
        },
      },
    };
  }

  // Step 3: At root of tab, nothing to do
  return { handled: false, state };
}
```

Note: Guard checking (step 1 in the priority order) happens in the hooks/store layer _before_ `handleBack` is called. The reducer itself does not call guards — it is pure.

### 3.4 Browser History API Integration

The navigation state is synchronized with the browser's History API using an **ID-based entry restoration** approach. This replaces the previous `isInternalNavigation` flag pattern which was susceptible to race conditions.

```typescript
// On navigation action (push/overlay open):
// history.state stores the entryId and lightweight tab state
history.pushState({
  entryId: entry.id,
  tabStacks: {
    home: ["home", "home/detail"],  // route names only, no params
    search: ["search"],
    profile: ["profile"],
  },
  activeTab: state.activeTab,
}, '', url);

// Params are stored separately in sessionStorage
sessionStorage.setItem(`rehynav:${entry.id}`, JSON.stringify(entry.params));

// On browser popstate (back/forward button):
window.addEventListener('popstate', (event) => {
  const targetEntryId = event.state?.entryId;
  if (targetEntryId) {
    // Restore to the specific entry — works for both back AND forward
    store.dispatch({ type: 'RESTORE_TO_ENTRY', entryId: targetEntryId });
  }
});
```

**Key design decisions:**

1. **`RESTORE_TO_ENTRY` instead of `GO_BACK`:** The old approach always dispatched `GO_BACK` on popstate, which only handled backward navigation. `RESTORE_TO_ENTRY` finds the target entry by ID and restores the full state, supporting both forward and backward navigation.

2. **No `isInternalNavigation` flag:** The previous boolean flag was set synchronously but `popstate` fires asynchronously, creating race conditions. The new approach doesn't need to distinguish between internal and external navigation — all popstate events use `RESTORE_TO_ENTRY`.

3. **Lightweight history.state:** Only route names (not params) are stored in `history.state` to avoid hitting browser size limits (typically 2-16MB). Route params are stored in `sessionStorage` keyed by entry ID.

4. **Fallback behavior:** If `RESTORE_TO_ENTRY` cannot find the target `entryId` in the current state (e.g., stale history from a previous session), it falls back to the `initialTab` root route.

5. **`urlSync: false` fully disables:** When URL sync is disabled, the `HistorySyncManager` is not instantiated and no `popstate` listener is registered.

### 3.5 History Sync Manager

```typescript
class HistorySyncManager {
  private store: NavigationStore;
  private basePath: string;
  private unsubscribe: (() => void) | null = null;

  constructor(store: NavigationStore, basePath: string) {
    this.store = store;
    this.basePath = basePath;
  }

  start(): void {
    // Listen for browser popstate (back/forward buttons)
    window.addEventListener('popstate', this.handlePopState);

    // Listen for store changes to push history entries
    let prevState = this.store.getState();
    this.unsubscribe = this.store.subscribe(() => {
      const nextState = this.store.getState();
      this.syncHistoryFromStateChange(prevState, nextState);
      prevState = nextState;
    });

    // Replace current history entry with initial state
    const state = this.store.getState();
    const url = stateToUrl(state, this.basePath);
    history.replaceState(
      this.createHistoryState(state),
      '',
      url,
    );
  }

  stop(): void {
    window.removeEventListener('popstate', this.handlePopState);
    this.unsubscribe?.();
  }

  private handlePopState = (event: PopStateEvent): void => {
    const targetEntryId = event.state?.entryId;
    if (!targetEntryId) return;

    this.store.dispatch({ type: 'RESTORE_TO_ENTRY', entryId: targetEntryId });
  };

  private syncHistoryFromStateChange(
    prevState: NavigationState,
    nextState: NavigationState,
  ): void {
    const url = stateToUrl(nextState, this.basePath);

    const prevDepth = this.getTotalDepth(prevState);
    const nextDepth = this.getTotalDepth(nextState);

    if (nextDepth > prevDepth) {
      // Push: add history entry
      const historyState = this.createHistoryState(nextState);
      history.pushState(historyState, '', url);
      // Store params in sessionStorage
      this.persistParams(nextState);
    } else if (nextDepth < prevDepth) {
      // Pop: go back in history
      history.back();
    } else {
      // Replace (same depth, different route)
      const historyState = this.createHistoryState(nextState);
      history.replaceState(historyState, '', url);
    }
  }

  private createHistoryState(state: NavigationState): object {
    const topEntryId = this.getTopEntryId(state);
    const tabStacks: Record<string, string[]> = {};
    for (const [tabName, tabState] of Object.entries(state.tabs)) {
      tabStacks[tabName] = tabState.stack.map(e => e.route);
    }
    return {
      entryId: topEntryId,
      tabStacks,
      activeTab: state.activeTab,
    };
  }

  private persistParams(state: NavigationState): void {
    const topEntry = this.getTopEntry(state);
    if (topEntry && Object.keys(topEntry.params).length > 0) {
      sessionStorage.setItem(`rehynav:${topEntry.id}`, JSON.stringify(topEntry.params));
    }
  }

  private getTotalDepth(state: NavigationState): number {
    const tabDepth = state.tabs[state.activeTab].stack.length;
    return tabDepth + state.overlays.length;
  }

  private getTopEntryId(state: NavigationState): string {
    if (state.overlays.length > 0) {
      return state.overlays[state.overlays.length - 1].id;
    }
    const tabState = state.tabs[state.activeTab];
    return tabState.stack[tabState.stack.length - 1].id;
  }

  private getTopEntry(state: NavigationState): StackEntry | OverlayEntry {
    if (state.overlays.length > 0) {
      return state.overlays[state.overlays.length - 1];
    }
    const tabState = state.tabs[state.activeTab];
    return tabState.stack[tabState.stack.length - 1];
  }
}
```

### 3.6 Capacitor / Android Back Button

For hybrid apps using Capacitor, the Android hardware back button fires a `backbutton` event via Capacitor's App plugin. rehynav provides a listener integration point:

```typescript
// Optional integration - users install this if they use Capacitor
async function setupCapacitorBackHandler(store: NavigationStore, guardRegistry: NavigationGuardRegistry): Promise<void> {
  const { App } = await import('@capacitor/app');
  App.addListener('backButton', () => {
    const state = store.getState();
    const result = handleBack(state);
    if (result.handled) {
      store.dispatch({ type: 'GO_BACK' });
    } else {
      // At root, exit app
      App.exitApp();
    }
  });
}
```

This is NOT bundled into the core library. It's either:
- A separate export (`rehynav/capacitor`)
- Documented as a user-side integration pattern

---

## 4. URL Synchronization

### 4.1 State-to-URL Conversion

The URL reflects the currently visible screen. Overlays are NOT reflected in the URL path (they use History API state entries instead).

```typescript
function stateToUrl(state: NavigationState, basePath: string = '/'): string {
  const activeTabState = state.tabs[state.activeTab];
  const topEntry = activeTabState.stack[activeTabState.stack.length - 1];

  // Route name -> URL path
  // "home" -> "/home"
  // "home/detail" -> "/home/detail"
  // "profile/settings" -> "/profile/settings"
  let path = basePath + topEntry.route;

  // Serialize params as query string (only non-empty params)
  const params = topEntry.params;
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      searchParams.set(key, String(value));
    }
  }

  const search = searchParams.toString();
  return search ? `${path}?${search}` : path;
}
```

**Why not encode overlays in the URL?**

Overlays (modals/sheets) are ephemeral UI states, not addressable locations. Including them in the URL would create confusing shareable links (e.g., a shared link that opens with a confirmation modal). They are tracked in History API state entries for back button support, but the URL only shows the underlying screen.

### 4.2 URL-to-State Restoration (Deep Links)

```typescript
function urlToState(
  url: string,
  config: { tabs: string[]; initialTab: string },
  basePath: string = '/',
  createId: () => string,
  now: () => number,
): NavigationState {
  const parsed = new URL(url, 'http://localhost');
  const pathname = parsed.pathname.replace(basePath, '').replace(/^\//, '');

  // Parse params from query string
  const params: Record<string, string> = {};
  for (const [key, value] of parsed.searchParams.entries()) {
    params[key] = value;
  }

  // Determine which tab this route belongs to
  const tab = resolveTabForRoute(pathname || config.initialTab, config.tabs);
  const targetTab = tab || config.initialTab;

  // Build state with the deep-linked route on the correct tab's stack
  const state = createInitialState(config, createId, now);

  if (pathname && pathname !== targetTab) {
    // Deep link to a stack screen: push it onto the tab's stack
    state.tabs[targetTab].stack.push({
      id: createId(),
      route: pathname,
      params,
      timestamp: now(),
    });
  } else if (pathname === targetTab && Object.keys(params).length > 0) {
    // Deep link to a tab root with params
    state.tabs[targetTab].stack[0].params = params;
  }

  state.activeTab = targetTab;
  state.tabs[targetTab].hasBeenActive = true;

  return state;
}
```

### 4.3 Opt-In/Opt-Out

URL sync is controlled via the `urlSync` prop on `NavigationProvider`:

```tsx
// URL sync enabled (default)
<NavigationProvider>

// URL sync disabled (useful for embedded widgets, tests)
<NavigationProvider urlSync={false}>

// Custom base path
<NavigationProvider basePath="/app">
```

When `urlSync` is `false`, the `HistorySyncManager` is simply not instantiated. All navigation still works, just without URL updates or popstate handling. No popstate listener is registered.

---

## 5. Screen Lifecycle and Rendering

### 5.1 Screen Registry

`<Screen>` components don't render anything themselves. They register route-to-component mappings into the store/context during mount via `useLayoutEffect` (not `useEffect`), ensuring registrations are available before the first paint.

```typescript
interface ScreenRegistration {
  route: string;
  component: React.ComponentType<any>;
  options?: ScreenOptions;
}

interface ScreenRegistry {
  screens: Map<string, ScreenRegistration>;
  register(registration: ScreenRegistration): void;
  unregister(route: string): void;
  get(route: string): ScreenRegistration | undefined;
}
```

The `<Screen>` component:

```typescript
function Screen<RouteName extends AllRoutes>({
  name,
  component,
  options,
}: ScreenProps<RouteName>): null {
  const registry = useScreenRegistry();

  useLayoutEffect(() => {
    registry.register({ route: name as string, component, options });
    return () => registry.unregister(name as string);
  }, [registry, name, component, options]);

  return null; // Screen renders nothing; it only registers
}
```

**Why `useLayoutEffect` instead of `useEffect`?**

`useEffect` runs asynchronously after paint, which means the first render of `TabNavigator` may occur before screens are registered, causing a brief flash of empty content. `useLayoutEffect` runs synchronously after DOM mutations but before paint, ensuring all screen registrations are available when the navigator first renders.

For SSR environments where `useLayoutEffect` produces warnings, a `typeof window !== 'undefined'` guard is used to conditionally select the appropriate effect hook.

### 5.2 Tab Content Rendering Strategy

#### Recommendation: CSS `display: none` with `display: block` for active tabs

```typescript
function TabContent({ tabName }: { tabName: string }) {
  const isActive = useNavigationSelector((s) => s.activeTab === tabName);
  const tabState = useNavigationSelector((s) => s.tabs[tabName]);
  const registry = useScreenRegistry();

  // Lazy mounting: don't render until the tab has been activated at least once
  if (!tabState.hasBeenActive) return null;

  return (
    <div
      style={{ display: isActive ? 'block' : 'none' }}
      data-rehynav-tab={tabName}
      data-route-type="tab"
    >
      <StackRenderer stack={tabState.stack} registry={registry} />
    </div>
  );
}
```

**Key change:** `display: 'contents'` has been replaced with `display: 'block'`. While `display: contents` avoids adding a wrapper div to the layout flow, it has known issues with CSS inheritance, accessibility tree representation, and unexpected behavior with certain CSS properties. `display: block` is more predictable.

Users can customize the wrapper layout via the `[data-rehynav-tab]` CSS selector:
```css
[data-rehynav-tab] {
  display: flex;
  flex-direction: column;
  flex: 1;
}
```

**`data-route-type` attribute:** Added for debugging purposes. Browser DevTools and React DevTools can use this to identify the navigation category of rendered elements.

### 5.3 Stack Rendering Strategy

Within a tab, all screens in the stack are rendered simultaneously. Only the topmost screen is visible; lower screens are hidden with `display: none`.

```typescript
function StackRenderer({
  stack,
  registry,
}: {
  stack: StackEntry[];
  registry: ScreenRegistry;
}) {
  return (
    <>
      {stack.map((entry, index) => {
        const registration = registry.get(entry.route);

        // Error handling for unregistered screens (see Section 6)
        if (!registration) {
          return <UnregisteredScreenError key={entry.id} route={entry.route} registry={registry} />;
        }

        const isTop = index === stack.length - 1;
        const Component = registration.component;

        return (
          <div
            key={entry.id}
            style={{ display: isTop ? 'block' : 'none' }}
            data-stack-index={index}
            data-route={entry.route}
            data-route-type="stack"
          >
            <Component params={entry.params} />
          </div>
        );
      })}
    </>
  );
}
```

**Why render all stack entries, not just the top?**

1. **State preservation** - Popping back to a previous screen shows it exactly as the user left it (scroll position, form state, etc.)
2. **Animation readiness** - For slide/push transitions, the previous screen must already be rendered so it can be revealed during the animation.
3. **Low cost** - `display: none` elements don't participate in layout or painting. The cost is only the React component tree in memory, which is minimal for typical stack depths (2-5 screens).

**`maxStackDepth` enforcement:** When the stack exceeds `maxStackDepth` (default: 10), the oldest non-root entries are unmounted from the DOM. Their state data is preserved in the NavigationState for potential restoration. In development mode, a warning is logged when the limit is reached.

### 5.4 Overlay Rendering

Overlays are rendered in a separate container above the tab content.

```typescript
function OverlayRenderer() {
  const overlays = useNavigationSelector((s) => s.overlays);
  const registry = useScreenRegistry();

  return (
    <>
      {overlays.map((overlay) => {
        const registration = registry.get(overlay.route);

        if (!registration) {
          return <UnregisteredScreenError key={overlay.id} route={overlay.route} registry={registry} />;
        }

        const Component = registration.component;

        return (
          <div
            key={overlay.id}
            data-overlay-type={overlay.type}
            data-route-type={overlay.type}
            className={
              overlay.type === 'modal' ? 'rehynav-modal' : 'rehynav-sheet'
            }
          >
            <Component params={overlay.params} />
          </div>
        );
      })}
    </>
  );
}
```

### 5.5 Lazy Loading

Lazy loading operates at two levels:

**Tab-level lazy loading** (via `TabNavigator.lazy` prop):
- Tabs are not mounted until first visited (`hasBeenActive` flag).
- Default: `true`.
- When `false`, all tabs mount immediately on initial render.

**Screen-level lazy loading** (via React.lazy):
- Users can pass `React.lazy(() => import('./DetailScreen'))` as the `component` prop to `<Screen>`.
- rehynav doesn't need special handling for this; React's `Suspense` boundary handles it.

```tsx
const DetailScreen = React.lazy(() => import('./screens/DetailScreen'));

<Screen name="home/detail" component={DetailScreen} />

<NavigationProvider>
  <Suspense fallback={<LoadingSpinner />}>
    <Screen name="home/detail" component={DetailScreen} />
    <TabNavigator />
  </Suspense>
</NavigationProvider>
```

### 5.6 Transition Animation Hooks (Future)

Transitions are not implemented in v0.x, but the architecture supports them through the following extension points:

1. **ScreenOptions.transition** - Already defined in the API. The `StackRenderer` can read this value to apply CSS classes or inline styles.
2. **Stack entry metadata** - `StackEntry` can be extended with a `transitionState: 'entering' | 'entered' | 'exiting' | 'exited'` field.
3. **onTransitionEnd callback** - After the CSS transition completes, update the entry's state. Exited entries can then be removed from the DOM.

The recommended approach for v1.0 transitions:
- CSS-based transitions (transform, opacity) driven by data attributes on the stack entry wrapper divs.
- `View Transition API` as a progressive enhancement for browsers that support it.

---

## 6. Error Handling

### 6.1 Unregistered Screen Detection

When a navigation action targets a route with no registered `<Screen>`, rehynav provides helpful error feedback.

**Development mode:** A red error overlay is displayed in place of the missing screen:

```typescript
function UnregisteredScreenError({ route, registry }: { route: string; registry: ScreenRegistry }) {
  if (process.env.NODE_ENV === 'production') {
    console.error(`[rehynav] Screen not found: "${route}"`);
    return null;
  }

  const registeredRoutes = Array.from(registry.screens.keys());
  const suggestion = findClosestMatch(route, registeredRoutes); // Levenshtein distance

  return (
    <div style={{ padding: 20, color: 'red', fontFamily: 'monospace' }}>
      <h2>Screen not found: "{route}"</h2>
      {suggestion && <p>Did you mean "{suggestion}"?</p>}
      <p>Did you forget to add &lt;Screen name="{route}" component=&#123;...&#125; /&gt;?</p>
      <p>Registered screens: {registeredRoutes.join(', ')}</p>
    </div>
  );
}
```

**Production mode:** Only a `console.error` is logged. No visual error overlay.

### 6.2 Navigation-time Warnings

When `push()` or `open()` is called for an unregistered route, a `console.error` is logged in development mode:

```typescript
// Inside useNavigation().push() implementation
if (process.env.NODE_ENV !== 'production') {
  const registration = registry.get(route);
  if (!registration) {
    const suggestion = findClosestMatch(route, Array.from(registry.screens.keys()));
    console.error(
      `[rehynav] Navigating to unregistered screen "${route}".` +
      (suggestion ? ` Did you mean "${suggestion}"?` : '') +
      ` Registered screens: ${Array.from(registry.screens.keys()).join(', ')}`
    );
  }
}
```

### 6.3 Registration Completeness Check

After `NavigationProvider` mounts and all `<Screen>` components have registered via `useLayoutEffect`, a deferred check verifies that all routes in the route map have corresponding screen registrations:

```typescript
// Inside NavigationProvider, after mount
useEffect(() => {
  if (process.env.NODE_ENV !== 'production') {
    // Deferred to allow all Screen useLayoutEffects to complete
    setTimeout(() => {
      const allRoutes = getAllRoutesFromRouteMap(routerConfig);
      const registeredRoutes = Array.from(registry.screens.keys());
      const missingRoutes = allRoutes.filter(r => !registeredRoutes.includes(r));

      if (missingRoutes.length > 0) {
        console.warn(
          `[rehynav] Missing Screen registrations for routes: ${missingRoutes.join(', ')}. ` +
          `Add <Screen name="..." component={...} /> for each route.`
        );
      }
    }, 0);
  }
}, []);
```

### 6.4 Stack Route Validation

`createRouter` validates that all stack route prefixes correspond to registered tab names:

```typescript
function validateStackRoutes(stacks: Record<string, unknown>, tabs: string[]): void {
  if (process.env.NODE_ENV === 'production') return;

  for (const stackRoute of Object.keys(stacks)) {
    const prefix = stackRoute.split('/')[0];
    if (!tabs.includes(prefix)) {
      console.error(
        `[rehynav] Stack route "${stackRoute}" has prefix "${prefix}" which is not a registered tab. ` +
        `Registered tabs: ${tabs.join(', ')}`
      );
    }
  }
}
```

### 6.5 Serializable Params Validation

In development mode, params passed to navigation actions are checked for non-serializable values:

```typescript
function validateSerializable(params: Record<string, unknown>, context: string): void {
  if (process.env.NODE_ENV === 'production') return;

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'function') {
      console.error(
        `[rehynav] Non-serializable value in ${context} params.${key}: function. ` +
        `Route params must be serializable (string, number, boolean, null, arrays, plain objects). ` +
        `Use the action string pattern for callbacks. See docs for recommended patterns.`
      );
    }
  }
}
```

---

## 7. Directory Structure

### 7.1 Module Layout

```
src/
  index.ts                    # Public API barrel export
  create-router.ts            # createRouter factory (returns typed hooks/components)

  core/                       # Pure logic, no React dependency
    state.ts                  # NavigationState types + createInitialState
    reducer.ts                # navigationReducer (all state transitions)
    navigation-guard.ts       # Guard checking logic
    url.ts                    # stateToUrl, urlToState conversions
    route-utils.ts            # resolveTabForRoute, route categorization helpers
    id.ts                     # createId helper with fallback
    validation.ts             # Stack route validation, serializable checks
    types.ts                  # Shared types (NavigationAction, StackEntry, etc.)

  store/                      # Store layer (minimal React bridge)
    navigation-store.ts       # createNavigationStore (useSyncExternalStore-compatible)
    screen-registry.ts        # ScreenRegistry implementation
    guard-registry.ts         # NavigationGuardRegistry for useBeforeNavigate

  components/                 # React components
    NavigationProvider.tsx     # Root provider
    TabNavigator.tsx           # Tab layout + TabContent
    Screen.tsx                 # Route-to-component registration
    Link.tsx                   # Type-safe navigation link
    StackRenderer.tsx          # Renders stack entries within a tab
    OverlayRenderer.tsx        # Renders modals and sheets
    UnregisteredScreenError.tsx # Dev-mode error display

  hooks/                      # React hooks (public API)
    useNavigation.ts           # push, pop, goBack, etc.
    useRoute.ts                # Current route info (auto-inferred in Screen context)
    useTab.ts                  # Tab actions
    useModal.ts                # Modal actions
    useSheet.ts                # Sheet actions
    useBeforeNavigate.ts       # Navigation guard (all directions)
    useBackHandler.ts          # Convenience alias (back only)
    useNavigationSelector.ts   # Internal: selector-based subscription

  sync/                        # URL and history synchronization
    history-sync.ts            # HistorySyncManager class

  types/                       # Public type definitions
    register.ts                # Register interface, RegisteredRouteMap
    props.ts                   # Component prop types
    routes.ts                  # TabRoutes, StackRoutes, ModalRoutes, SheetRoutes, AllRoutes
    serializable.ts            # Serializable type constraint
```

### 7.2 Module Responsibilities and Dependencies

```
                    ┌─────────────┐
                    │   index.ts   │  (public exports)
                    └──────┬──────┘
                           │
                    ┌──────┴──────┐
                    │create-router│  (factory: returns typed hooks/components)
                    └──────┬──────┘
           ┌───────────────┼───────────────┐
           v               v               v
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │ components/ │ │   hooks/    │ │   types/    │
    └──────┬──────┘ └──────┬──────┘ └─────────────┘
           │               │
           v               v
    ┌─────────────┐ ┌─────────────┐
    │   store/    │ │    sync/    │
    └──────┬──────┘ └──────┬──────┘
           │               │
           v               v
    ┌─────────────────────────────┐
    │           core/             │  (pure logic, zero dependencies)
    └─────────────────────────────┘
```

**Dependency rules (enforced by convention, verifiable by import analysis):**

| Module | Can depend on | Cannot depend on |
|--------|---------------|------------------|
| `core/` | Nothing (pure TS, no React) | Everything else |
| `store/` | `core/` | `components/`, `hooks/`, `sync/` |
| `sync/` | `core/`, `store/` | `components/`, `hooks/` |
| `hooks/` | `core/`, `store/`, `sync/` | `components/` |
| `components/` | `core/`, `store/`, `hooks/`, `sync/` | - |
| `types/` | Nothing (pure type definitions) | Everything else |
| `create-router.ts` | All modules (it is the factory) | - |

### 7.3 Public API Surface (index.ts)

```typescript
// src/index.ts

// Primary API
export { createRouter } from './create-router';

// Components (for advanced global registration usage)
export { NavigationProvider } from './components/NavigationProvider';
export { TabNavigator } from './components/TabNavigator';
export { Screen } from './components/Screen';
export { Link } from './components/Link';

// Hooks (for advanced global registration usage)
export { useNavigation } from './hooks/useNavigation';
export { useRoute } from './hooks/useRoute';
export { useTab } from './hooks/useTab';
export { useModal } from './hooks/useModal';
export { useSheet } from './hooks/useSheet';
export { useBeforeNavigate } from './hooks/useBeforeNavigate';
export { useBackHandler } from './hooks/useBackHandler';

// Types
export type { Register, RegisteredRouteMap } from './types/register';
export type {
  NavigationProviderProps,
  TabNavigatorProps,
  TabBarProps,
  TabInfo,
  ScreenProps,
  ScreenOptions,
  ScreenComponentProps,
} from './types/props';
export type { NavigationState, NavigationDirection } from './core/types';
export type { Serializable } from './types/serializable';
```

### 7.4 Design Rationale

**Why `create-router.ts` as a separate factory?**

The `createRouter` function is the primary entry point. It creates a router instance and returns pre-typed hooks and components. This factory pattern (similar to Zustand's `create()` and tRPC's `createTRPCReact()`) eliminates the need for `declare module` in most use cases.

**Why separate `core/` from `store/`?**

The `core/` module contains pure functions and types with zero dependencies. It can be tested with plain unit tests (no React, no JSDOM). The `store/` module wraps core logic in a `useSyncExternalStore`-compatible interface. This separation means:
- Core navigation logic targets 95% unit test coverage with fast execution
- The React integration layer is thin and has fewer potential bugs
- The core could theoretically be reused with other frameworks (Vue, Svelte) in the future

**Why a separate `sync/` module?**

URL/history synchronization is an optional feature (`urlSync` prop). Keeping it in a separate module enables tree-shaking when unused and makes the core navigation logic independent of browser APIs.

**Why `types/` as a separate module?**

Public types are used by both the library and consumers. Keeping them separate from implementation modules prevents circular dependencies and makes it clear which types are part of the public API.

---

## Summary of Key Architectural Decisions

| Decision | Choice | Primary Reason |
|----------|--------|----------------|
| State model | Single `NavigationState` object | Serializable, debuggable, enables state restoration |
| Reducer purity | id/timestamp in action payload, not generated in reducer | Testability, predictability, no side effects |
| State management | `useSyncExternalStore` | Zero deps, selector-based re-render optimization |
| Immutability | Structural sharing via spread | Good enough for small state trees, no library needed |
| Tab preservation | CSS `display: none` / `display: block` | Simple, reliable, preserves all state |
| Stack rendering | All entries mounted, hidden via CSS | State preservation + animation readiness |
| URL sync | ID-based `RESTORE_TO_ENTRY` via `HistorySyncManager` | Supports forward/back, no race conditions |
| History state | Route names in history.state, params in sessionStorage | Avoids browser size limits |
| Overlay model | Unified `OPEN_OVERLAY` / `CLOSE_OVERLAY` actions | Simpler reducer, preserves stacking order |
| Navigation guards | `useBeforeNavigate` with direction parameter | Subsumes useBackHandler, handles all navigation types |
| Back behavior | Priority chain: guards > overlays > stack > no-op | Matches user expectation from native mobile UX |
| Core logic | Pure functions in `core/` | Testable without React, potentially portable |
| Screen registration | Registry via `<Screen>` useLayoutEffect | No flash of empty content, declarative JSX API |
| Error handling | Dev-mode overlays + typo detection + registration checks | Fast debugging without breaking production |
| API pattern | `createRouter` returns typed hooks/components | No declare module needed, familiar factory pattern |
