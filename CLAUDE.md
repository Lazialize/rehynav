# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ReHynav is a mobile-first React navigation library for web and hybrid apps (Capacitor/Tauri). It provides tab-based navigation with independent stacks per tab, native-like back behavior, overlay flows, and a standalone screen layer for auth flows. Status: WIP/Experimental (v0.1.0), API not finalized. React 19+ peer dependency.

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

### State Model

All navigation state lives in a single serializable `NavigationState` object (`src/core/types.ts`). Key shape:

- `tabs` — per-tab stacks (`Record<string, TabState>`), each tab has its own `StackEntry[]`
- `screens` — standalone screen stack (`StackEntry[]`) for flows like auth that replace the tab layer
- `activeLayer` — `'tabs' | 'screens'` determines which layer renders
- `overlays` — overlay stack (`OverlayEntry[]`) rendered above everything
- `activeTab`, `tabOrder`, `badges`

### State Flow

1. **Pure reducer** (`src/core/reducer.ts`): `navigationReducer(state, action) → newState`. Immutable updates, no side effects. IDs and timestamps are generated at the dispatch site, not in the reducer.
2. **Store** (`src/store/navigation-store.ts`): Minimal observer-pattern store wrapping the reducer. Exposes `getState`, `dispatch`, `subscribe` (compatible with `useSyncExternalStore`).
3. **Hooks** (`src/hooks/`): React hooks consume the store. `useNavigation` is the primary navigation hook (push, pop, replace, goBack). `useOverlay`, `useTab`, `useRoute` provide focused APIs.

### Back Behavior Priority

Close overlay → pop screen stack (if active) → pop active tab stack → no-op at root. Implemented in `handleBack()` in the reducer.

### Router Configuration

`createRouter()` (`src/create-router.ts`) accepts an array of route definitions built with helper functions (`tabs()`, `tab()`, `stack()`, `overlay()`, `screens()`, `screen()` from `src/route-helpers.ts`). It parses this into a `ParsedRouterConfig` and produces a `RouterInstance` consumed by `RouterProvider`.

### URL Synchronization

`HistorySyncManager` (`src/sync/history-sync.ts`) provides bidirectional sync between browser History API and navigation state. Tab switches use `replaceState` so browser back skips tab navigation.

### Screen Registry

`src/store/screen-registry.ts` maps route names to React components. Populated by `RouterProvider` from the router instance's registrations.

### Two Navigation Layers

- **Tabs layer**: Standard tab-based navigation, each tab has independent stack
- **Screens layer**: Standalone screen stack (e.g., login/signup flow) that replaces the tabs layer when `activeLayer === 'screens'`

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

`core/` 95% | `store/` 90% | `hooks/` 85% | `components/` 80% | `sync/` 70% | global 80%
