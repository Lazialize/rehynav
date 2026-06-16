# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ReHynav is a mobile-first, **file-based** React navigation library for web and hybrid apps (Capacitor/Tauri). It mirrors Expo Router's API surface (`app/` directory, `<Stack>`/`<Tabs>` layouts, `useRouter`, `useLocalSearchParams`, `<Link>`, global `router`) but renders to the DOM, with mobile-first behavior like independent per-tab stacks and native-like back. Status: WIP/Experimental, API not finalized. React 19+ peer dependency.

## Commands

```bash
pnpm build          # Build library (tsup → dist/ with ESM + CJS)
pnpm dev            # Build in watch mode
pnpm test           # Run tests once (vitest)
pnpm test:watch     # Run tests in watch mode
pnpm test:coverage  # Run tests with coverage report
pnpm typecheck      # Type-check only (tsc, no emit)
pnpm lint           # Lint + format check (biome)
pnpm lint:fix       # Lint + format with auto-fix
pnpm format         # Format only with auto-fix
```

Run a single test file: `pnpm vitest run src/core/reducer.test.ts`

## Architecture

The pipeline is: **route tree (static, from files) → navigation state (dynamic, serializable) → React rendering**.

### Route tree

`buildRouteTree()` (`src/core/route-tree.ts`) turns a glob context map (`Record<filePath, module>`, e.g. `import.meta.glob('./app/**/*.tsx', { eager: true })`) into a tree of `RouteNode`s. Conventions: `index`, `[param]`, `[...rest]`, `_layout` (navigator), `(group)` (URL-invisible folder), `+not-found`. Folders without a `_layout` are flattened into the parent navigator with slash-joined names.

### State model

Navigation state is a recursive, serializable `NavigatorState` tree (React Navigation-shaped), defined in `src/core/types.ts`:

- `NavigatorState` — `{ type: 'stack' | 'tab', key, index, routeNames, routes }`. For stacks `routes` is the history (top = last); for tabs `routes` holds one entry per visited tab and `index` selects the active tab (this is what gives **independent per-tab stacks**).
- `NavigationRoute` — `{ key, name, params?, state? }`; `state` is the nested navigator when a route is itself a layout.

`getStateFromPath()` / `getPathFromState()` (`src/core/matching.ts`) convert between URLs and this tree.

### State flow

1. **Pure reducer** (`src/core/reducer.ts`): `navigationReducer(state, action) → newState`. Actions: `NAVIGATE` (with mode `navigate`/`push`/`replace`/`switch`), `BACK`, `SET_PARAMS`, `RESET`, `SET_NAVIGATOR_TYPE`. `mergeNavigator` applies the navigation mode at the deepest (leaf) navigator and reuses/switches intermediate navigators. Keys/timestamps are generated outside the reducer (`src/core/id.ts`).
2. **Store** (`src/store/navigation-store.ts`): observer store compatible with `useSyncExternalStore`.
3. **Controller** (`src/store/controller.ts`): binds store + tree, builds targets from hrefs, and backs both `useRouter` and the global `router` (`src/imperative-router.ts`).
4. **Rendering** (`src/components/`): `RouterProvider` builds the tree and renders the root layout. Navigators (`Stack`, `Tabs`, `Slot`) read their slice via `NavigatorContext` and render the active route(s) through `RouteRenderer`, providing `RouteContext` per screen. `Tabs` declares its navigator type via `SET_NAVIGATOR_TYPE` in a layout effect.

### Back behavior

`BACK` pops the **deepest active stack** with more than one entry; tab navigators are skipped (switching tabs is not "back"). No-op at the root.

### URL synchronization

`HistorySync` (`src/sync/history-sync.ts`) stores the full serializable `NavigatorState` in `history.state`, so browser back/forward restores the exact tree (including each tab's stack). The base path applies only to the browser URL and rendered `Link` hrefs — navigation state is always base-path-relative.

## Code Style

- **Biome** for linting and formatting (no eslint/prettier)
- Single quotes, trailing commas, semicolons, 2-space indent, 100 char line width
- `useExhaustiveDependencies` and `useHookAtTopLevel` are enforced as errors
- All route params must satisfy the `Serializable` type constraint (JSON-compatible, no functions/classes)
- Tests are colocated with source files (`*.test.ts` / `*.test.tsx` in `src/`)
- Test globals enabled (no need to import `describe`, `it`, `expect`)

## Monorepo

pnpm workspaces: root library + `examples/*`. Example app at `examples/sns-app/`.

## Coverage Thresholds

Statements/functions/lines: `core/` 95% | `store/` 90% | `hooks/` 85% | `components/` 80% | `sync/` 70% | global 80%. Branch thresholds are a notch lower per directory (`core/` 90, `components/` 75) because the navigator tree relies on defensive optional-chaining guards.
