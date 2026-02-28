# Screen Lifecycle Features Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add focus/blur lifecycle, scroll restoration, lazy loading, error boundaries, and screen preloading to rehynav.

**Architecture:** Each feature is implemented as an independent hook or component modification. Focus/blur is derived from existing NavigationState (no new state). RouteContext is extended with `entryId` to enable per-screen identity. Scroll restoration depends on focus/blur. Lazy loading and error boundaries modify StackRenderer/OverlayRenderer. Preloading uses a separate React context.

**Tech Stack:** React 19, TypeScript, Vitest, @testing-library/react

---

### Task 1: Extend RouteContext with entryId

The focus/blur and scroll restoration features need to know which specific entry (screen instance) is rendering. Currently `RouteContext` only has `route` and `params`. We need to add `entryId`.

**Files:**
- Modify: `src/hooks/context.ts:38-41`
- Modify: `src/components/StackRenderer.tsx:26`
- Modify: `src/components/OverlayRenderer.tsx:16`

**Step 1: Update RouteContext type**

In `src/hooks/context.ts`, change the RouteContext type to include `entryId`:

```tsx
// src/hooks/context.ts:38-41
export const RouteContext: React.Context<{
  route: string;
  params: Record<string, Serializable>;
  entryId: string;
} | null> = createContext<{ route: string; params: Record<string, Serializable>; entryId: string } | null>(null);
```

**Step 2: Update StackRenderer to pass entryId**

In `src/components/StackRenderer.tsx:26`:

```tsx
<RouteContext.Provider value={{ route: entry.route, params: entry.params, entryId: entry.id }}>
```

**Step 3: Update OverlayRenderer to pass entryId**

In `src/components/OverlayRenderer.tsx:16`:

```tsx
<RouteContext.Provider value={{ route: overlay.route, params: overlay.params, entryId: overlay.id }}>
```

**Step 4: Fix any type errors**

Run: `pnpm tsc --noEmit`
Expected: PASS (no errors)

**Step 5: Run existing tests**

Run: `pnpm test`
Expected: All existing tests still pass

**Step 6: Commit**

```
feat: extend RouteContext with entryId for screen identity
```

---

### Task 2: useIsFocused hook

**Files:**
- Create: `src/hooks/useIsFocused.ts`
- Test: `src/hooks/useIsFocused.test.tsx`

**Step 1: Write the failing tests**

Create `src/hooks/useIsFocused.test.tsx`:

```tsx
import { act, renderHook } from '@testing-library/react';
import type React from 'react';
import { describe, expect, it } from 'vitest';
import { createNavigationGuardRegistry } from '../core/navigation-guard.js';
import { navigationReducer } from '../core/reducer.js';
import { createInitialState } from '../core/state.js';
import type { NavigationAction, NavigationState } from '../core/types.js';
import type { NavigationStoreForHooks } from './context.js';
import {
  GuardRegistryContext,
  NavigationStoreContext,
  RouteContext,
} from './context.js';
import { useIsFocused } from './useIsFocused.js';

function createTestStore(initialState: NavigationState): NavigationStoreForHooks {
  let state = initialState;
  const listeners = new Set<() => void>();
  return {
    getState: () => state,
    dispatch(action: NavigationAction) {
      state = navigationReducer(state, action);
      for (const l of listeners) l();
    },
    subscribe(l: () => void) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getServerSnapshot: () => state,
  };
}

let idCounter = 0;
function testCreateId() {
  return `test-id-${++idCounter}`;
}

function createWrapper(
  store: NavigationStoreForHooks,
  entryId: string,
  route = 'home',
) {
  const guardRegistry = createNavigationGuardRegistry();
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <NavigationStoreContext.Provider value={store}>
        <GuardRegistryContext.Provider value={guardRegistry}>
          <RouteContext.Provider value={{ route, params: {}, entryId }}>
            {children}
          </RouteContext.Provider>
        </GuardRegistryContext.Provider>
      </NavigationStoreContext.Provider>
    );
  };
}

describe('useIsFocused', () => {
  it('returns true for the top screen of the active tab with no overlays', () => {
    const state = createInitialState(
      { tabs: ['home', 'search'], initialTab: 'home' },
      testCreateId,
      () => 1000,
    );
    const store = createTestStore(state);
    const topEntryId = state.tabs.home.stack[0].id;
    const wrapper = createWrapper(store, topEntryId, 'home');

    const { result } = renderHook(() => useIsFocused(), { wrapper });
    expect(result.current).toBe(true);
  });

  it('returns false for a screen in an inactive tab', () => {
    const state = createInitialState(
      { tabs: ['home', 'search'], initialTab: 'home' },
      testCreateId,
      () => 1000,
    );
    const store = createTestStore(state);
    const searchEntryId = state.tabs.search.stack[0].id;
    const wrapper = createWrapper(store, searchEntryId, 'search');

    const { result } = renderHook(() => useIsFocused(), { wrapper });
    expect(result.current).toBe(false);
  });

  it('returns false when an overlay is open (for stack screens)', () => {
    const state = createInitialState(
      { tabs: ['home'], initialTab: 'home' },
      testCreateId,
      () => 1000,
    );
    const store = createTestStore(state);
    const topEntryId = state.tabs.home.stack[0].id;
    const wrapper = createWrapper(store, topEntryId, 'home');

    const { result } = renderHook(() => useIsFocused(), { wrapper });
    expect(result.current).toBe(true);

    act(() => {
      store.dispatch({
        type: 'OPEN_OVERLAY',
        route: 'modal',
        params: {},
        id: testCreateId(),
        timestamp: 1000,
      });
    });

    expect(result.current).toBe(false);
  });

  it('returns false for non-top stack screen', () => {
    const state = createInitialState(
      { tabs: ['home'], initialTab: 'home' },
      testCreateId,
      () => 1000,
    );
    const store = createTestStore(state);
    const bottomEntryId = state.tabs.home.stack[0].id;
    const wrapper = createWrapper(store, bottomEntryId, 'home');

    // Push a new screen on top
    act(() => {
      store.dispatch({
        type: 'PUSH',
        route: 'home/detail',
        params: {},
        id: testCreateId(),
        timestamp: 1001,
      });
    });

    const { result } = renderHook(() => useIsFocused(), { wrapper });
    expect(result.current).toBe(false);
  });

  it('becomes true again when overlay closes', () => {
    const state = createInitialState(
      { tabs: ['home'], initialTab: 'home' },
      testCreateId,
      () => 1000,
    );
    const store = createTestStore(state);
    const topEntryId = state.tabs.home.stack[0].id;
    const wrapper = createWrapper(store, topEntryId, 'home');

    const { result } = renderHook(() => useIsFocused(), { wrapper });
    expect(result.current).toBe(true);

    act(() => {
      store.dispatch({
        type: 'OPEN_OVERLAY',
        route: 'modal',
        params: {},
        id: testCreateId(),
        timestamp: 1000,
      });
    });
    expect(result.current).toBe(false);

    act(() => {
      store.dispatch({ type: 'CLOSE_OVERLAY' });
    });
    expect(result.current).toBe(true);
  });

  it('returns true for the top overlay in the overlay stack', () => {
    const state = createInitialState(
      { tabs: ['home'], initialTab: 'home' },
      testCreateId,
      () => 1000,
    );
    const store = createTestStore(state);
    const overlayId = testCreateId();

    act(() => {
      store.dispatch({
        type: 'OPEN_OVERLAY',
        route: 'modal',
        params: {},
        id: overlayId,
        timestamp: 1000,
      });
    });

    const wrapper = createWrapper(store, overlayId, 'modal');
    const { result } = renderHook(() => useIsFocused(), { wrapper });
    expect(result.current).toBe(true);
  });

  it('returns false for a non-top overlay', () => {
    const state = createInitialState(
      { tabs: ['home'], initialTab: 'home' },
      testCreateId,
      () => 1000,
    );
    const store = createTestStore(state);
    const firstOverlayId = testCreateId();

    act(() => {
      store.dispatch({
        type: 'OPEN_OVERLAY',
        route: 'modal-a',
        params: {},
        id: firstOverlayId,
        timestamp: 1000,
      });
    });
    act(() => {
      store.dispatch({
        type: 'OPEN_OVERLAY',
        route: 'modal-b',
        params: {},
        id: testCreateId(),
        timestamp: 1001,
      });
    });

    const wrapper = createWrapper(store, firstOverlayId, 'modal-a');
    const { result } = renderHook(() => useIsFocused(), { wrapper });
    expect(result.current).toBe(false);
  });

  it('throws when used outside NavigationProvider', () => {
    expect(() => {
      renderHook(() => useIsFocused());
    }).toThrow('useNavigationStore must be used within NavigationProvider');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/hooks/useIsFocused.test.tsx`
Expected: FAIL — module not found

**Step 3: Implement useIsFocused**

Create `src/hooks/useIsFocused.ts`:

```tsx
import { useContext } from 'react';
import { RouteContext } from './context.js';
import { useNavigationSelector } from './useNavigationSelector.js';

export function useIsFocused(): boolean {
  const routeCtx = useContext(RouteContext);
  const entryId = routeCtx?.entryId ?? null;

  return useNavigationSelector((state) => {
    if (entryId === null) return false;

    // Check if this entry is an overlay
    const overlayIndex = state.overlays.findIndex((o) => o.id === entryId);
    if (overlayIndex !== -1) {
      // Overlay is focused only if it's the topmost overlay
      return overlayIndex === state.overlays.length - 1;
    }

    // Stack screen: must be in the active tab, on top of the stack, and no overlays open
    if (state.overlays.length > 0) return false;

    const activeTabState = state.tabs[state.activeTab];
    const topEntry = activeTabState.stack[activeTabState.stack.length - 1];
    return topEntry.id === entryId;
  });
}
```

**Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/hooks/useIsFocused.test.tsx`
Expected: All PASS

**Step 5: Commit**

```
feat: add useIsFocused hook for screen focus detection
```

---

### Task 3: useFocusEffect hook

**Files:**
- Create: `src/hooks/useFocusEffect.ts`
- Test: `src/hooks/useFocusEffect.test.tsx`

**Step 1: Write the failing tests**

Create `src/hooks/useFocusEffect.test.tsx`:

```tsx
import { act, renderHook } from '@testing-library/react';
import type React from 'react';
import { useCallback } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createNavigationGuardRegistry } from '../core/navigation-guard.js';
import { navigationReducer } from '../core/reducer.js';
import { createInitialState } from '../core/state.js';
import type { NavigationAction, NavigationState } from '../core/types.js';
import type { NavigationStoreForHooks } from './context.js';
import {
  GuardRegistryContext,
  NavigationStoreContext,
  RouteContext,
} from './context.js';
import { useFocusEffect } from './useFocusEffect.js';

function createTestStore(initialState: NavigationState): NavigationStoreForHooks {
  let state = initialState;
  const listeners = new Set<() => void>();
  return {
    getState: () => state,
    dispatch(action: NavigationAction) {
      state = navigationReducer(state, action);
      for (const l of listeners) l();
    },
    subscribe(l: () => void) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getServerSnapshot: () => state,
  };
}

let idCounter = 0;
function testCreateId() {
  return `test-focus-id-${++idCounter}`;
}

function createWrapper(
  store: NavigationStoreForHooks,
  entryId: string,
  route = 'home',
) {
  const guardRegistry = createNavigationGuardRegistry();
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <NavigationStoreContext.Provider value={store}>
        <GuardRegistryContext.Provider value={guardRegistry}>
          <RouteContext.Provider value={{ route, params: {}, entryId }}>
            {children}
          </RouteContext.Provider>
        </GuardRegistryContext.Provider>
      </NavigationStoreContext.Provider>
    );
  };
}

describe('useFocusEffect', () => {
  it('calls effect immediately when screen is focused', () => {
    const state = createInitialState(
      { tabs: ['home'], initialTab: 'home' },
      testCreateId,
      () => 1000,
    );
    const store = createTestStore(state);
    const topEntryId = state.tabs.home.stack[0].id;
    const wrapper = createWrapper(store, topEntryId);

    const effect = vi.fn();

    renderHook(
      () =>
        useFocusEffect(
          useCallback(() => {
            effect();
          }, []),
        ),
      { wrapper },
    );

    expect(effect).toHaveBeenCalledTimes(1);
  });

  it('does not call effect when screen is not focused', () => {
    const state = createInitialState(
      { tabs: ['home', 'search'], initialTab: 'home' },
      testCreateId,
      () => 1000,
    );
    const store = createTestStore(state);
    const searchEntryId = state.tabs.search.stack[0].id;
    const wrapper = createWrapper(store, searchEntryId, 'search');

    const effect = vi.fn();

    renderHook(
      () =>
        useFocusEffect(
          useCallback(() => {
            effect();
          }, []),
        ),
      { wrapper },
    );

    expect(effect).not.toHaveBeenCalled();
  });

  it('calls cleanup when screen loses focus', () => {
    const state = createInitialState(
      { tabs: ['home'], initialTab: 'home' },
      testCreateId,
      () => 1000,
    );
    const store = createTestStore(state);
    const topEntryId = state.tabs.home.stack[0].id;
    const wrapper = createWrapper(store, topEntryId);

    const cleanup = vi.fn();
    const effect = vi.fn(() => cleanup);

    renderHook(
      () =>
        useFocusEffect(
          useCallback(() => {
            return effect();
          }, []),
        ),
      { wrapper },
    );

    expect(effect).toHaveBeenCalledTimes(1);
    expect(cleanup).not.toHaveBeenCalled();

    // Open overlay -> screen loses focus
    act(() => {
      store.dispatch({
        type: 'OPEN_OVERLAY',
        route: 'modal',
        params: {},
        id: testCreateId(),
        timestamp: 1000,
      });
    });

    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('re-calls effect when screen regains focus', () => {
    const state = createInitialState(
      { tabs: ['home'], initialTab: 'home' },
      testCreateId,
      () => 1000,
    );
    const store = createTestStore(state);
    const topEntryId = state.tabs.home.stack[0].id;
    const wrapper = createWrapper(store, topEntryId);

    const cleanup = vi.fn();
    const effect = vi.fn(() => cleanup);

    renderHook(
      () =>
        useFocusEffect(
          useCallback(() => {
            return effect();
          }, []),
        ),
      { wrapper },
    );

    expect(effect).toHaveBeenCalledTimes(1);

    // Lose focus
    act(() => {
      store.dispatch({
        type: 'OPEN_OVERLAY',
        route: 'modal',
        params: {},
        id: testCreateId(),
        timestamp: 1000,
      });
    });

    // Regain focus
    act(() => {
      store.dispatch({ type: 'CLOSE_OVERLAY' });
    });

    expect(effect).toHaveBeenCalledTimes(2);
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('calls cleanup on unmount', () => {
    const state = createInitialState(
      { tabs: ['home'], initialTab: 'home' },
      testCreateId,
      () => 1000,
    );
    const store = createTestStore(state);
    const topEntryId = state.tabs.home.stack[0].id;
    const wrapper = createWrapper(store, topEntryId);

    const cleanup = vi.fn();

    const { unmount } = renderHook(
      () =>
        useFocusEffect(
          useCallback(() => {
            return cleanup;
          }, []),
        ),
      { wrapper },
    );

    unmount();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/hooks/useFocusEffect.test.tsx`
Expected: FAIL — module not found

**Step 3: Implement useFocusEffect**

Create `src/hooks/useFocusEffect.ts`:

```tsx
import { useEffect, useRef } from 'react';
import { useIsFocused } from './useIsFocused.js';

type EffectCallback = () => void | (() => void);

export function useFocusEffect(callback: EffectCallback): void {
  const isFocused = useIsFocused();
  const cleanupRef = useRef<(() => void) | void>(undefined);

  useEffect(() => {
    if (isFocused) {
      cleanupRef.current = callback();
    } else {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = undefined;
      }
    }

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = undefined;
      }
    };
  }, [isFocused]); // eslint-disable-line react-hooks/exhaustive-deps
}
```

**Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/hooks/useFocusEffect.test.tsx`
Expected: All PASS

**Step 5: Commit**

```
feat: add useFocusEffect hook for screen lifecycle callbacks
```

---

### Task 4: Export focus hooks from createRouter and index

**Files:**
- Modify: `src/create-router.ts`
- Modify: `src/index.ts`

**Step 1: Update RouterInstance and createRouter**

In `src/create-router.ts`, add imports and update `RouterInstance`:

```tsx
// Add imports
import { useFocusEffect } from './hooks/useFocusEffect.js';
import { useIsFocused } from './hooks/useIsFocused.js';

// Add to RouterInstance interface
export interface RouterInstance {
  // ... existing ...
  useFocusEffect: (callback: () => void | (() => void)) => void;
  useIsFocused: () => boolean;
}

// Add to return value of createRouter
return {
  // ... existing ...
  useFocusEffect,
  useIsFocused,
};
```

**Step 2: Update index.ts**

Add to `src/index.ts`:

```tsx
export { useFocusEffect } from './hooks/useFocusEffect.js';
export { useIsFocused } from './hooks/useIsFocused.js';
```

**Step 3: Run all tests**

Run: `pnpm test`
Expected: All PASS

**Step 4: Commit**

```
feat: export useFocusEffect and useIsFocused from router
```

---

### Task 5: useScrollRestoration hook

**Files:**
- Create: `src/hooks/useScrollRestoration.ts`
- Test: `src/hooks/useScrollRestoration.test.tsx`

**Step 1: Write the failing tests**

Create `src/hooks/useScrollRestoration.test.tsx`:

```tsx
import { act, renderHook } from '@testing-library/react';
import type React from 'react';
import { useRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createNavigationGuardRegistry } from '../core/navigation-guard.js';
import { navigationReducer } from '../core/reducer.js';
import { createInitialState } from '../core/state.js';
import type { NavigationAction, NavigationState } from '../core/types.js';
import type { NavigationStoreForHooks } from './context.js';
import {
  GuardRegistryContext,
  NavigationStoreContext,
  RouteContext,
} from './context.js';
import { useScrollRestoration } from './useScrollRestoration.js';

function createTestStore(initialState: NavigationState): NavigationStoreForHooks {
  let state = initialState;
  const listeners = new Set<() => void>();
  return {
    getState: () => state,
    dispatch(action: NavigationAction) {
      state = navigationReducer(state, action);
      for (const l of listeners) l();
    },
    subscribe(l: () => void) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getServerSnapshot: () => state,
  };
}

let idCounter = 0;
function testCreateId() {
  return `test-scroll-id-${++idCounter}`;
}

function createWrapper(
  store: NavigationStoreForHooks,
  entryId: string,
  route = 'home',
) {
  const guardRegistry = createNavigationGuardRegistry();
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <NavigationStoreContext.Provider value={store}>
        <GuardRegistryContext.Provider value={guardRegistry}>
          <RouteContext.Provider value={{ route, params: {}, entryId }}>
            {children}
          </RouteContext.Provider>
        </GuardRegistryContext.Provider>
      </NavigationStoreContext.Provider>
    );
  };
}

function createMockElement(scrollTop = 0): HTMLDivElement {
  const el = document.createElement('div');
  Object.defineProperty(el, 'scrollTop', {
    get: () => scrollTop,
    set: vi.fn(),
    configurable: true,
  });
  el.scrollTo = vi.fn();
  return el;
}

describe('useScrollRestoration', () => {
  it('saves scroll position on blur and restores on focus', () => {
    const state = createInitialState(
      { tabs: ['home'], initialTab: 'home' },
      testCreateId,
      () => 1000,
    );
    const store = createTestStore(state);
    const topEntryId = state.tabs.home.stack[0].id;
    const wrapper = createWrapper(store, topEntryId);

    const mockEl = createMockElement(250);

    const { result } = renderHook(
      () => {
        const ref = useRef<HTMLDivElement>(null);
        (ref as React.MutableRefObject<HTMLDivElement | null>).current = mockEl;
        useScrollRestoration(ref);
        return ref;
      },
      { wrapper },
    );

    // Blur: open overlay
    act(() => {
      store.dispatch({
        type: 'OPEN_OVERLAY',
        route: 'modal',
        params: {},
        id: testCreateId(),
        timestamp: 1000,
      });
    });

    // Focus: close overlay
    act(() => {
      store.dispatch({ type: 'CLOSE_OVERLAY' });
    });

    expect(mockEl.scrollTo).toHaveBeenCalledWith({ top: 250, behavior: 'instant' });
  });

  it('does nothing when ref is null', () => {
    const state = createInitialState(
      { tabs: ['home'], initialTab: 'home' },
      testCreateId,
      () => 1000,
    );
    const store = createTestStore(state);
    const topEntryId = state.tabs.home.stack[0].id;
    const wrapper = createWrapper(store, topEntryId);

    // Should not throw
    renderHook(
      () => {
        const ref = useRef<HTMLDivElement>(null);
        useScrollRestoration(ref);
        return ref;
      },
      { wrapper },
    );

    act(() => {
      store.dispatch({
        type: 'OPEN_OVERLAY',
        route: 'modal',
        params: {},
        id: testCreateId(),
        timestamp: 1000,
      });
    });

    act(() => {
      store.dispatch({ type: 'CLOSE_OVERLAY' });
    });

    // No error thrown = success
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/hooks/useScrollRestoration.test.tsx`
Expected: FAIL — module not found

**Step 3: Implement useScrollRestoration**

Create `src/hooks/useScrollRestoration.ts`:

```tsx
import { type RefObject, useContext, useRef } from 'react';
import { RouteContext } from './context.js';
import { useFocusEffect } from './useFocusEffect.js';

const scrollPositions = new Map<string, number>();

export function useScrollRestoration(ref: RefObject<HTMLElement | null>): void {
  const routeCtx = useContext(RouteContext);
  const entryId = routeCtx?.entryId ?? null;
  const entryIdRef = useRef(entryId);
  entryIdRef.current = entryId;

  useFocusEffect(() => {
    // On focus: restore scroll position
    const id = entryIdRef.current;
    if (id && ref.current) {
      const saved = scrollPositions.get(id);
      if (saved !== undefined) {
        ref.current.scrollTo({ top: saved, behavior: 'instant' });
      }
    }

    // On blur: save scroll position
    return () => {
      const id = entryIdRef.current;
      if (id && ref.current) {
        scrollPositions.set(id, ref.current.scrollTop);
      }
    };
  });
}
```

**Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/hooks/useScrollRestoration.test.tsx`
Expected: All PASS

**Step 5: Export from createRouter and index.ts**

In `src/create-router.ts`, add:
```tsx
import { useScrollRestoration } from './hooks/useScrollRestoration.js';

// Add to RouterInstance interface
useScrollRestoration: (ref: RefObject<HTMLElement | null>) => void;

// Add to return value
useScrollRestoration,
```

In `src/index.ts`, add:
```tsx
export { useScrollRestoration } from './hooks/useScrollRestoration.js';
```

**Step 6: Run all tests**

Run: `pnpm test`
Expected: All PASS

**Step 7: Commit**

```
feat: add useScrollRestoration hook
```

---

### Task 6: Suspense fallback context and TabNavigator prop

**Files:**
- Create: `src/components/SuspenseFallbackContext.ts`
- Modify: `src/types/props.ts:13-19`
- Modify: `src/components/TabNavigator.tsx`

**Step 1: Create SuspenseFallbackContext**

Create `src/components/SuspenseFallbackContext.ts`:

```tsx
import { createContext, useContext } from 'react';

export const SuspenseFallbackContext = createContext<React.ReactNode>(null);

export function useSuspenseFallback(): React.ReactNode {
  return useContext(SuspenseFallbackContext);
}
```

**Step 2: Add suspenseFallback to TabNavigatorProps**

In `src/types/props.ts`, add to `TabNavigatorProps`:

```tsx
export interface TabNavigatorProps {
  tabBar?: React.ComponentType<TabBarProps>;
  tabBarPosition?: 'top' | 'bottom';
  preserveState?: boolean;
  lazy?: boolean;
  maxStackDepth?: number;
  suspenseFallback?: React.ReactNode;
}
```

**Step 3: Provide context in TabNavigator**

In `src/components/TabNavigator.tsx`, import `SuspenseFallbackContext` and wrap `TabContent` and `OverlayRenderer`:

```tsx
import { createElement } from 'react';
import { SuspenseFallbackContext } from './SuspenseFallbackContext.js';

// In TabNavigator function, destructure suspenseFallback
export function TabNavigator({
  tabBar,
  tabBarPosition = 'bottom',
  preserveState = true,
  lazy = true,
  maxStackDepth = 10,
  suspenseFallback = null,
}: TabNavigatorProps): React.ReactElement {
  // ... existing code ...

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {tabBarPosition === 'top' && tabBarElement}
      <SuspenseFallbackContext.Provider value={suspenseFallback}>
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <TabContent preserveState={preserveState} lazy={lazy} maxStackDepth={maxStackDepth} />
        </div>
        <OverlayRenderer />
      </SuspenseFallbackContext.Provider>
      {tabBarPosition === 'bottom' && tabBarElement}
    </div>
  );
}
```

Note: Move `OverlayRenderer` inside the `SuspenseFallbackContext.Provider` and adjust the tab bar element position so the provider wraps both the content and overlays but not the tab bar.

**Step 4: Run type check and tests**

Run: `pnpm tsc --noEmit && pnpm test`
Expected: All PASS

**Step 5: Commit**

```
feat: add suspenseFallback prop and context for lazy loading
```

---

### Task 7: Add Suspense to StackRenderer and OverlayRenderer

**Files:**
- Modify: `src/components/StackRenderer.tsx`
- Modify: `src/components/OverlayRenderer.tsx`
- Test: `src/components/StackRenderer.test.tsx` (new or modify existing)
- Test: `src/components/OverlayRenderer.test.tsx` (modify existing)

**Step 1: Write failing test for lazy-loaded screen in StackRenderer**

Add a test to verify that `React.lazy` components work in StackRenderer. Create or update `src/components/StackRenderer.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import React, { Suspense } from 'react';
import { describe, expect, it } from 'vitest';
import type { StackEntry } from '../core/types.js';
import { ScreenRegistryContext, type ScreenRegistryForHooks } from '../hooks/context.js';
import { SuspenseFallbackContext } from './SuspenseFallbackContext.js';
import { StackRenderer } from './StackRenderer.js';

function createMockRegistry(
  entries: Record<string, React.ComponentType<any>>,
): ScreenRegistryForHooks {
  const screens = new Map(
    Object.entries(entries).map(([route, component]) => [
      route,
      { route, component },
    ]),
  );
  return {
    screens,
    get: (route: string) => screens.get(route),
  } as ScreenRegistryForHooks;
}

describe('StackRenderer with Suspense', () => {
  it('renders lazy-loaded components with Suspense', async () => {
    let resolveComponent: (value: { default: React.ComponentType }) => void;
    const lazyPromise = new Promise<{ default: React.ComponentType }>((resolve) => {
      resolveComponent = resolve;
    });
    const LazyComponent = React.lazy(() => lazyPromise);

    const stack: StackEntry[] = [
      { id: 'entry-1', route: 'home', params: {}, timestamp: 1000 },
    ];

    const registry = createMockRegistry({ home: LazyComponent });

    render(
      <ScreenRegistryContext.Provider value={registry}>
        <SuspenseFallbackContext.Provider value={<div>Loading...</div>}>
          <StackRenderer stack={stack} />
        </SuspenseFallbackContext.Provider>
      </ScreenRegistryContext.Provider>,
    );

    expect(screen.getByText('Loading...')).toBeDefined();

    // Resolve the lazy component
    await React.act(async () => {
      resolveComponent!({ default: () => <div>Home Screen</div> });
    });

    expect(screen.getByText('Home Screen')).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/StackRenderer.test.tsx`
Expected: FAIL — no Suspense boundary

**Step 3: Add Suspense to StackRenderer**

In `src/components/StackRenderer.tsx`:

```tsx
import { Suspense } from 'react';
import type { StackEntry } from '../core/types.js';
import { RouteContext, useScreenRegistry } from '../hooks/context.js';
import { useSuspenseFallback } from './SuspenseFallbackContext.js';
import { UnregisteredScreenError } from './UnregisteredScreenError.js';

export interface StackRendererProps {
  stack: StackEntry[];
}

export function StackRenderer({ stack }: StackRendererProps): React.ReactElement {
  const registry = useScreenRegistry();
  const suspenseFallback = useSuspenseFallback();

  return (
    <>
      {stack.map((entry, index) => {
        const isTop = index === stack.length - 1;
        const registration = registry.get(entry.route);

        return (
          <div
            key={entry.id}
            data-stack-index={index}
            data-route={entry.route}
            data-route-type="stack"
            style={{ display: isTop ? 'block' : 'none' }}
          >
            <RouteContext.Provider value={{ route: entry.route, params: entry.params, entryId: entry.id }}>
              <Suspense fallback={suspenseFallback}>
                {registration ? (
                  <registration.component params={entry.params} />
                ) : (
                  <UnregisteredScreenError route={entry.route} registry={registry} />
                )}
              </Suspense>
            </RouteContext.Provider>
          </div>
        );
      })}
    </>
  );
}
```

**Step 4: Add Suspense to OverlayRenderer**

In `src/components/OverlayRenderer.tsx`:

```tsx
import { Suspense } from 'react';
import { RouteContext, useScreenRegistry } from '../hooks/context.js';
import { useNavigationSelector } from '../hooks/useNavigationSelector.js';
import { useSuspenseFallback } from './SuspenseFallbackContext.js';
import { UnregisteredScreenError } from './UnregisteredScreenError.js';

export function OverlayRenderer(): React.ReactElement {
  const overlays = useNavigationSelector((s) => s.overlays);
  const registry = useScreenRegistry();
  const suspenseFallback = useSuspenseFallback();

  return (
    <>
      {overlays.map((overlay) => {
        const registration = registry.get(overlay.route);

        return (
          <div key={overlay.id} data-route-type="overlay" className="rehynav-overlay">
            <RouteContext.Provider value={{ route: overlay.route, params: overlay.params, entryId: overlay.id }}>
              <Suspense fallback={suspenseFallback}>
                {registration ? (
                  <registration.component params={overlay.params} />
                ) : (
                  <UnregisteredScreenError route={overlay.route} registry={registry} />
                )}
              </Suspense>
            </RouteContext.Provider>
          </div>
        );
      })}
    </>
  );
}
```

**Step 5: Run tests**

Run: `pnpm test`
Expected: All PASS

**Step 6: Commit**

```
feat: add Suspense boundaries for React.lazy screen support
```

---

### Task 8: RouteErrorBoundary component

**Files:**
- Create: `src/components/RouteErrorBoundary.tsx`
- Test: `src/components/RouteErrorBoundary.test.tsx`

**Step 1: Write the failing tests**

Create `src/components/RouteErrorBoundary.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { RouteErrorBoundary, type ErrorFallbackProps } from './RouteErrorBoundary.js';

function ThrowingComponent({ shouldThrow = true }: { shouldThrow?: boolean }) {
  if (shouldThrow) throw new Error('Test error');
  return <div>Normal content</div>;
}

describe('RouteErrorBoundary', () => {
  // Suppress console.error from React during error boundary tests
  const originalError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });
  afterEach(() => {
    console.error = originalError;
  });

  it('renders children when no error', () => {
    render(
      <RouteErrorBoundary route="home">
        <div>Hello</div>
      </RouteErrorBoundary>,
    );
    expect(screen.getByText('Hello')).toBeDefined();
  });

  it('renders default fallback on error', () => {
    render(
      <RouteErrorBoundary route="home">
        <ThrowingComponent />
      </RouteErrorBoundary>,
    );
    expect(screen.getByText(/something went wrong/i)).toBeDefined();
  });

  it('renders custom fallback on error', () => {
    const CustomFallback = ({ error, route, retry }: ErrorFallbackProps) => (
      <div>
        <p>Custom error: {error.message}</p>
        <p>Route: {route}</p>
        <button type="button" onClick={retry}>Custom Retry</button>
      </div>
    );

    render(
      <RouteErrorBoundary route="home/detail" fallback={CustomFallback}>
        <ThrowingComponent />
      </RouteErrorBoundary>,
    );

    expect(screen.getByText('Custom error: Test error')).toBeDefined();
    expect(screen.getByText('Route: home/detail')).toBeDefined();
  });

  it('retry resets error state', () => {
    let shouldThrow = true;

    function ConditionalThrow() {
      if (shouldThrow) throw new Error('Test error');
      return <div>Recovered</div>;
    }

    render(
      <RouteErrorBoundary route="home">
        <ConditionalThrow />
      </RouteErrorBoundary>,
    );

    expect(screen.getByText(/something went wrong/i)).toBeDefined();

    shouldThrow = false;
    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByText('Recovered')).toBeDefined();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/components/RouteErrorBoundary.test.tsx`
Expected: FAIL — module not found

**Step 3: Implement RouteErrorBoundary**

Create `src/components/RouteErrorBoundary.tsx`:

```tsx
import React from 'react';

export interface ErrorFallbackProps {
  error: Error;
  route: string;
  retry: () => void;
}

interface Props {
  children: React.ReactNode;
  route: string;
  fallback?: React.ComponentType<ErrorFallbackProps>;
}

interface State {
  error: Error | null;
}

function DefaultErrorFallback({ error, route, retry }: ErrorFallbackProps): React.ReactElement {
  return (
    <div style={{ padding: 16, textAlign: 'center' }}>
      <p>Something went wrong in <code>{route}</code></p>
      {process.env.NODE_ENV !== 'production' && (
        <pre style={{ fontSize: 12, color: '#c00', whiteSpace: 'pre-wrap' }}>
          {error.message}
        </pre>
      )}
      <button type="button" onClick={retry} style={{ marginTop: 8, padding: '4px 12px' }}>
        Retry
      </button>
    </div>
  );
}

export class RouteErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  retry = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      const Fallback = this.props.fallback ?? DefaultErrorFallback;
      return (
        <Fallback
          error={this.state.error}
          route={this.props.route}
          retry={this.retry}
        />
      );
    }
    return this.props.children;
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/components/RouteErrorBoundary.test.tsx`
Expected: All PASS

**Step 5: Commit**

```
feat: add RouteErrorBoundary component
```

---

### Task 9: Integrate ErrorBoundary into renderers and TabNavigator

**Files:**
- Create: `src/components/ErrorFallbackContext.ts`
- Modify: `src/types/props.ts`
- Modify: `src/components/TabNavigator.tsx`
- Modify: `src/components/StackRenderer.tsx`
- Modify: `src/components/OverlayRenderer.tsx`
- Modify: `src/index.ts`

**Step 1: Create ErrorFallbackContext**

Create `src/components/ErrorFallbackContext.ts`:

```tsx
import type React from 'react';
import { createContext, useContext } from 'react';
import type { ErrorFallbackProps } from './RouteErrorBoundary.js';

export const ErrorFallbackContext = createContext<React.ComponentType<ErrorFallbackProps> | undefined>(undefined);

export function useErrorFallback(): React.ComponentType<ErrorFallbackProps> | undefined {
  return useContext(ErrorFallbackContext);
}
```

**Step 2: Add errorFallback to TabNavigatorProps**

In `src/types/props.ts`, add (import the type):

```tsx
export interface TabNavigatorProps {
  // ... existing ...
  suspenseFallback?: React.ReactNode;
  errorFallback?: React.ComponentType<ErrorFallbackProps>;
}
```

Note: The import for `ErrorFallbackProps` will come from `../components/RouteErrorBoundary.js`. Since this creates a circular-ish reference (types importing from components), re-export the `ErrorFallbackProps` type from `src/types/props.ts` instead:

Move `ErrorFallbackProps` definition to `src/types/props.ts` and import it in `RouteErrorBoundary.tsx`.

**Step 3: Provide ErrorFallbackContext in TabNavigator**

In `src/components/TabNavigator.tsx`:

```tsx
import { ErrorFallbackContext } from './ErrorFallbackContext.js';

// Destructure errorFallback
export function TabNavigator({
  // ... existing ...
  suspenseFallback = null,
  errorFallback,
}: TabNavigatorProps): React.ReactElement {
  // ... existing ...

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {tabBarPosition === 'top' && tabBarElement}
      <ErrorFallbackContext.Provider value={errorFallback}>
        <SuspenseFallbackContext.Provider value={suspenseFallback}>
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            <TabContent preserveState={preserveState} lazy={lazy} maxStackDepth={maxStackDepth} />
          </div>
          <OverlayRenderer />
        </SuspenseFallbackContext.Provider>
      </ErrorFallbackContext.Provider>
      {tabBarPosition === 'bottom' && tabBarElement}
    </div>
  );
}
```

**Step 4: Wrap screens in StackRenderer with RouteErrorBoundary**

In `src/components/StackRenderer.tsx`, wrap each screen's `<Suspense>` with `<RouteErrorBoundary>`:

```tsx
import { RouteErrorBoundary } from './RouteErrorBoundary.js';
import { useErrorFallback } from './ErrorFallbackContext.js';

export function StackRenderer({ stack }: StackRendererProps): React.ReactElement {
  const registry = useScreenRegistry();
  const suspenseFallback = useSuspenseFallback();
  const errorFallback = useErrorFallback();

  return (
    <>
      {stack.map((entry, index) => {
        const isTop = index === stack.length - 1;
        const registration = registry.get(entry.route);

        return (
          <div
            key={entry.id}
            data-stack-index={index}
            data-route={entry.route}
            data-route-type="stack"
            style={{ display: isTop ? 'block' : 'none' }}
          >
            <RouteContext.Provider value={{ route: entry.route, params: entry.params, entryId: entry.id }}>
              <RouteErrorBoundary route={entry.route} fallback={errorFallback}>
                <Suspense fallback={suspenseFallback}>
                  {registration ? (
                    <registration.component params={entry.params} />
                  ) : (
                    <UnregisteredScreenError route={entry.route} registry={registry} />
                  )}
                </Suspense>
              </RouteErrorBoundary>
            </RouteContext.Provider>
          </div>
        );
      })}
    </>
  );
}
```

**Step 5: Same for OverlayRenderer**

Same pattern — wrap `<Suspense>` inside `<RouteErrorBoundary>`.

**Step 6: Export ErrorFallbackProps from index.ts**

```tsx
export type { ErrorFallbackProps } from './types/props.js';
```

**Step 7: Run all tests**

Run: `pnpm test`
Expected: All PASS

**Step 8: Commit**

```
feat: integrate error boundaries into screen renderers
```

---

### Task 10: Screen preloading - PreloadContext and PreloadRenderer

**Files:**
- Create: `src/components/PreloadContext.tsx`
- Create: `src/components/PreloadRenderer.tsx`
- Test: `src/components/PreloadRenderer.test.tsx`

**Step 1: Write the failing test**

Create `src/components/PreloadRenderer.test.tsx`:

```tsx
import { act, render, screen, renderHook } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';
import { ScreenRegistryContext, type ScreenRegistryForHooks } from '../hooks/context.js';
import { PreloadProvider, usePreloadContext } from './PreloadContext.js';
import { PreloadRenderer } from './PreloadRenderer.js';

function createMockRegistry(
  entries: Record<string, React.ComponentType<any>>,
): ScreenRegistryForHooks {
  const screens = new Map(
    Object.entries(entries).map(([route, component]) => [
      route,
      { route, component },
    ]),
  );
  return { screens, get: (route: string) => screens.get(route) } as ScreenRegistryForHooks;
}

describe('PreloadRenderer', () => {
  it('renders preloaded screens in hidden DOM', () => {
    const DetailScreen = () => <div>Detail Content</div>;
    const registry = createMockRegistry({ 'home/detail': DetailScreen });

    const { result } = renderHook(() => usePreloadContext(), {
      wrapper: ({ children }) => (
        <PreloadProvider>
          <ScreenRegistryContext.Provider value={registry}>
            {children}
            <PreloadRenderer />
          </ScreenRegistryContext.Provider>
        </PreloadProvider>
      ),
    });

    act(() => {
      result.current.preload('home/detail', { id: '1' });
    });

    const preloaded = document.querySelector('[data-rehynav-preload]');
    expect(preloaded).not.toBeNull();
    expect(preloaded?.getAttribute('style')).toContain('hidden');
  });

  it('limits concurrent preloads', () => {
    const Screen = () => <div>Screen</div>;
    const registry = createMockRegistry({
      'route-1': Screen,
      'route-2': Screen,
      'route-3': Screen,
      'route-4': Screen,
    });

    const { result } = renderHook(() => usePreloadContext(), {
      wrapper: ({ children }) => (
        <PreloadProvider maxPreloads={3}>
          <ScreenRegistryContext.Provider value={registry}>
            {children}
            <PreloadRenderer />
          </ScreenRegistryContext.Provider>
        </PreloadProvider>
      ),
    });

    act(() => {
      result.current.preload('route-1', {});
      result.current.preload('route-2', {});
      result.current.preload('route-3', {});
      result.current.preload('route-4', {});
    });

    const preloaded = document.querySelectorAll('[data-rehynav-preload]');
    expect(preloaded).toHaveLength(3);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/components/PreloadRenderer.test.tsx`
Expected: FAIL — module not found

**Step 3: Implement PreloadContext**

Create `src/components/PreloadContext.tsx`:

```tsx
import { createContext, useCallback, useContext, useRef, useState } from 'react';
import type { Serializable } from '../core/types.js';

export interface PreloadEntry {
  id: string;
  route: string;
  params: Record<string, Serializable>;
  createdAt: number;
}

export interface PreloadContextValue {
  entries: PreloadEntry[];
  preload(route: string, params: Record<string, Serializable>): void;
  promote(route: string, params: Record<string, Serializable>): PreloadEntry | undefined;
}

const Context = createContext<PreloadContextValue | null>(null);

let preloadIdCounter = 0;

export function PreloadProvider({
  children,
  maxPreloads = 3,
  ttl = 30000,
}: {
  children: React.ReactNode;
  maxPreloads?: number;
  ttl?: number;
}): React.ReactElement {
  const [entries, setEntries] = useState<PreloadEntry[]>([]);
  const entriesRef = useRef(entries);
  entriesRef.current = entries;

  const preload = useCallback(
    (route: string, params: Record<string, Serializable>) => {
      setEntries((prev) => {
        // Don't duplicate
        const existing = prev.find(
          (e) => e.route === route && JSON.stringify(e.params) === JSON.stringify(params),
        );
        if (existing) return prev;

        // Evict expired
        const now = Date.now();
        const fresh = prev.filter((e) => now - e.createdAt < ttl);

        const entry: PreloadEntry = {
          id: `preload-${++preloadIdCounter}`,
          route,
          params,
          createdAt: now,
        };

        const next = [...fresh, entry];
        // Enforce max limit (evict oldest)
        if (next.length > maxPreloads) {
          return next.slice(next.length - maxPreloads);
        }
        return next;
      });
    },
    [maxPreloads, ttl],
  );

  const promote = useCallback(
    (route: string, params: Record<string, Serializable>): PreloadEntry | undefined => {
      const match = entriesRef.current.find(
        (e) => e.route === route && JSON.stringify(e.params) === JSON.stringify(params),
      );
      if (match) {
        setEntries((prev) => prev.filter((e) => e.id !== match.id));
      }
      return match;
    },
    [],
  );

  return (
    <Context.Provider value={{ entries, preload, promote }}>
      {children}
    </Context.Provider>
  );
}

export function usePreloadContext(): PreloadContextValue {
  const ctx = useContext(Context);
  if (!ctx) {
    throw new Error('usePreloadContext must be used within PreloadProvider');
  }
  return ctx;
}
```

**Step 4: Implement PreloadRenderer**

Create `src/components/PreloadRenderer.tsx`:

```tsx
import { Suspense } from 'react';
import { RouteContext, useScreenRegistry } from '../hooks/context.js';
import { usePreloadContext } from './PreloadContext.js';

export function PreloadRenderer(): React.ReactElement {
  const { entries } = usePreloadContext();
  const registry = useScreenRegistry();

  return (
    <>
      {entries.map((entry) => {
        const registration = registry.get(entry.route);
        if (!registration) return null;

        return (
          <div
            key={entry.id}
            data-rehynav-preload={entry.route}
            style={{ visibility: 'hidden', position: 'absolute', pointerEvents: 'none' }}
          >
            <RouteContext.Provider
              value={{ route: entry.route, params: entry.params, entryId: entry.id }}
            >
              <Suspense fallback={null}>
                <registration.component params={entry.params} />
              </Suspense>
            </RouteContext.Provider>
          </div>
        );
      })}
    </>
  );
}
```

**Step 5: Run tests to verify they pass**

Run: `pnpm vitest run src/components/PreloadRenderer.test.tsx`
Expected: All PASS

**Step 6: Commit**

```
feat: add PreloadContext and PreloadRenderer for screen preloading
```

---

### Task 11: Add preload() to useNavigation and integrate PreloadProvider

**Files:**
- Modify: `src/hooks/useNavigation.ts`
- Modify: `src/components/TabNavigator.tsx`
- Modify: `src/create-router.ts`
- Modify: `src/index.ts`
- Test: `src/hooks/useNavigation.test.tsx` (add preload test)

**Step 1: Make PreloadContext optional in useNavigation**

The `preload` function in `useNavigation` should work when `PreloadProvider` is present (i.e., when using `TabNavigator`). If not present, `preload` should be a no-op.

Create an optional context hook:

In `src/components/PreloadContext.tsx`, add:

```tsx
export function useOptionalPreloadContext(): PreloadContextValue | null {
  return useContext(Context);
}
```

**Step 2: Add preload to NavigationActions and useNavigation**

In `src/hooks/useNavigation.ts`:

```tsx
import { useOptionalPreloadContext } from '../components/PreloadContext.js';

export interface NavigationActions {
  // ... existing ...
  preload(to: string, params?: Record<string, Serializable>): void;
}

export function useNavigation(): NavigationActions {
  const store = useNavigationStore();
  const guardRegistry = useGuardRegistry();
  const preloadCtx = useOptionalPreloadContext();

  return useMemo(
    () => ({
      // ... existing actions ...
      preload(to: string, params: Record<string, Serializable> = {}) {
        preloadCtx?.preload(to, params);
      },
    }),
    [store, guardRegistry, preloadCtx],
  );
}
```

**Step 3: Add PreloadProvider and PreloadRenderer to TabNavigator**

In `src/components/TabNavigator.tsx`:

```tsx
import { PreloadProvider } from './PreloadContext.js';
import { PreloadRenderer } from './PreloadRenderer.js';

// Wrap everything in PreloadProvider, add PreloadRenderer at the end
return (
  <PreloadProvider>
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {tabBarPosition === 'top' && tabBarElement}
      <ErrorFallbackContext.Provider value={errorFallback}>
        <SuspenseFallbackContext.Provider value={suspenseFallback}>
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            <TabContent preserveState={preserveState} lazy={lazy} maxStackDepth={maxStackDepth} />
          </div>
          <OverlayRenderer />
        </SuspenseFallbackContext.Provider>
      </ErrorFallbackContext.Provider>
      {tabBarPosition === 'bottom' && tabBarElement}
      <PreloadRenderer />
    </div>
  </PreloadProvider>
);
```

**Step 4: Run all tests**

Run: `pnpm test`
Expected: All PASS

**Step 5: Commit**

```
feat: add preload() to useNavigation and integrate into TabNavigator
```

---

### Task 12: Update README and docs

**Files:**
- Modify: `README.md`
- Modify: `docs/api-design.md`

**Step 1: Update README hooks table**

Add the new hooks to the Hooks Overview table:

```markdown
| `useFocusEffect` | Run effects when screen gains/loses focus |
| `useIsFocused` | Check if current screen is focused |
| `useScrollRestoration` | Save and restore scroll position on focus changes |
```

Add a brief section about lazy loading and error boundaries under Features or a new section.

**Step 2: Update API design doc**

Add the new hooks and `TabNavigator` props to `docs/api-design.md`.

**Step 3: Run tests to make sure nothing is broken**

Run: `pnpm test`
Expected: All PASS

**Step 4: Commit**

```
docs: add screen lifecycle features to README and API docs
```

---

### Task 13: Create changeset

**Files:**
- Create: `.changeset/screen-lifecycle.md`

**Step 1: Create changeset**

```markdown
---
'rehynav': minor
---

Add screen lifecycle features:

- `useFocusEffect`: Run effects when screen gains/loses focus
- `useIsFocused`: Check if current screen is focused
- `useScrollRestoration`: Save and restore scroll position across navigation
- Lazy loading: Pass `React.lazy()` components to `tab()`/`stack()`/`overlay()`
- Error boundaries: Per-route error catching with customizable fallback UI
- Screen preloading: `preload()` method on `useNavigation()` for pre-rendering screens
```

**Step 2: Commit**

```
chore: add changeset for screen lifecycle features
```
