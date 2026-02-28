# Screen Lifecycle Features Design

5 features to enhance rehynav's mobile UX: focus/blur lifecycle, scroll restoration, lazy loading, route-level error boundaries, and screen preloading.

## Decisions

| Feature | Approach |
|---------|----------|
| Focus/blur | Derived from existing state (no new state). Overlay open = blur for underlying screen. |
| Scroll restoration | Hook-based (`useScrollRestoration(ref)`). User specifies target element. |
| Lazy loading | `React.lazy` passed directly to `tab()`/`stack()`/`overlay()`. Suspense added in renderers. |
| Error boundary | Default fallback UI + customizable via `errorFallback` prop on TabNavigator. |
| Preloading | Imperative API only (`preload()` on useNavigation). No auto-preload. |

## 1. Focus/Blur Lifecycle

### API

```tsx
useFocusEffect(
  useCallback(() => {
    const sub = api.subscribe();
    return () => sub.unsubscribe();
  }, [])
);

const isFocused = useIsFocused();
```

### Focus conditions

A screen is focused when ALL of:
1. Its tab is the active tab
2. It is the top of its tab's stack
3. No overlays are open

For overlay screens: focused when it is the last entry in the overlays array.

### Implementation

- `useIsFocused()`: uses `useNavigationSelector` to check the 3 conditions above. Gets own entry ID from `RouteContext`.
- `useFocusEffect(callback)`: watches `useIsFocused()` via `useEffect`. Runs callback when `true`, runs cleanup when `false`.
- No new state in NavigationState. Focus is fully derived.
- Exported from `createRouter`.

## 2. Scroll Restoration

### API

```tsx
const scrollRef = useRef<HTMLDivElement>(null);
useScrollRestoration(scrollRef);
```

### Behavior

- On blur: saves `ref.current.scrollTop` keyed by entry ID (from RouteContext).
- On focus: restores saved scroll position via `scrollTo`.
- Storage: in-memory `Map<string, number>` (React ref). Lost on page reload (intentional).
- Entry ID as key means different entries of the same route have independent scroll positions.

### Dependencies

- Uses `useIsFocused()` internally. Must be implemented after focus/blur.

## 3. Lazy Loading

### Usage

```tsx
tab('home', React.lazy(() => import('./HomeScreen')), [
  stack('detail/:id', React.lazy(() => import('./DetailScreen'))),
])
```

### Implementation

- Wrap each screen render in `<Suspense>` in StackRenderer and OverlayRenderer.
- `TabNavigator` gets `suspenseFallback?: React.ReactNode` prop.
- Default fallback: `null` (previous screen stays visible during load).
- Pass fallback via context or prop drilling to renderers.
- Fully backwards-compatible: non-lazy components render through Suspense transparently.

## 4. Route-level Error Boundary

### API

```tsx
<TabNavigator
  errorFallback={({ error, route, retry }) => (
    <div>
      <p>Error in {route}: {error.message}</p>
      <button onClick={retry}>Retry</button>
    </div>
  )}
/>
```

### ErrorFallbackProps

```tsx
interface ErrorFallbackProps {
  error: Error;
  route: string;
  retry: () => void;
}
```

### Implementation

- New `RouteErrorBoundary` class component (Error Boundary requires class).
- Wraps each screen in StackRenderer and OverlayRenderer.
- Default fallback: simple "Something went wrong" + retry button.
- `retry` resets Error Boundary state to re-render.
- Placed outside Suspense to also catch lazy load failures.

### Render order

```
<RouteErrorBoundary>
  <Suspense fallback={...}>
    <screen.component />
  </Suspense>
</RouteErrorBoundary>
```

## 5. Screen Preloading

### API

```tsx
const { push, preload } = useNavigation();

<div
  onTouchStart={() => preload('home/post-detail/:postId', { postId })}
  onClick={() => push('home/post-detail/:postId', { postId })}
>
```

### Implementation

- New `PreloadContext`: manages preloaded screen entries (React state, not NavigationState).
- `preload(route, params)` adds entry to PreloadContext.
- `PreloadRenderer` component renders preloaded screens in hidden DOM (`visibility: hidden; position: absolute`).
- On `push`, if a matching preload exists, promote it (avoid re-render).
- Auto-cleanup after 30 seconds.
- Max concurrent preloads: 3 (configurable).
- Overlay preloading not supported.
- NavigationState is not affected.

## Implementation Order

1. Focus/blur lifecycle (no dependencies)
2. Scroll restoration (depends on focus/blur)
3. Lazy loading (independent)
4. Error boundary (independent, but render order matters with Suspense)
5. Preloading (independent, but uses renderers modified by 3 and 4)

Features 3 and 4 can be implemented in parallel. Feature 5 is the most complex and should be last.
