# Path Parameter Support Design

## Overview

Add path parameter support to rehynav's URL sync. Routes can define `:param` segments (e.g. `home/post-detail/:postId`) that embed parameter values directly in the URL path instead of query strings.

**Before:** `/home/post-detail?postId=42`
**After:** `/home/post-detail/42`

## Route Definition

Use colon notation in route names, matching React Router / Express conventions:

```typescript
type AppRoutes = {
  tabs: { home: Record<string, never> };
  stacks: {
    'home/post-detail/:postId': { postId: string };
  };
};
```

## Query Parameter Coexistence

Params defined with `:param` go into the URL path. All other params become query parameters:

```
route: 'home/post-detail/:postId'
params: { postId: '42', tab: 'comments' }
URL:    /home/post-detail/42?tab=comments
```

## Architecture

### New Module: `src/core/path-params.ts`

Parses route patterns at `createRouter` initialization time and caches the results.

```typescript
type RoutePattern = {
  paramNames: string[];
  regex: RegExp;
  toPath: (params: Record<string, string>) => string;
};

function parseRoutePatterns(routes: string[]): Map<string, RoutePattern>;
```

For `home/post-detail/:postId`:
- `paramNames`: `['postId']`
- `regex`: `/^home\/post-detail\/([^/]+)$/`
- `toPath({ postId: '42' })`: `'home/post-detail/42'`

Routes without `:param` segments get `paramNames: []` and work exactly as before.

### URL Generation (`stateToUrl`)

Accepts `routePatterns` map. Uses `pattern.toPath()` to embed path params, then serializes remaining params as query string.

### URL Parsing (`urlToState`)

Accepts `routePatterns` map. Iterates patterns to find a regex match, extracts path params, merges with query params.

### `HistorySyncManager`

Receives `routePatterns` from `NavigationProvider` and passes it through to `stateToUrl` / `urlToState`.

### `Link` Component

`href` generation uses `toPath()` for correct path param URLs.

### `resolveTabForRoute`

No changes needed. Tab resolution uses the first path segment, which is always a literal (e.g. `home` in `home/post-detail/:postId`).

## Backward Compatibility

Fully backward compatible. Routes without `:param` segments behave identically to current implementation (`paramNames: []`, all params go to query string).

## Files Changed

| File | Change |
|------|--------|
| `src/core/path-params.ts` | **New** — pattern parsing and route matching |
| `src/core/url.ts` | Update `stateToUrl` / `urlToState` signatures and logic |
| `src/sync/history-sync.ts` | Pass `routePatterns` to URL functions |
| `src/create-router.ts` | Parse patterns at init, pass to `HistorySyncManager` |
| `src/components/Link.tsx` | Use `toPath()` for href generation |
| `examples/sns-app/src/routes.ts` | Update route names with `:postId` |
| `examples/sns-app/src/App.tsx` | Update Screen names |
| `examples/sns-app/src/screens/*.tsx` | Update navigation calls and Link `to` props |
