# rehynav Playground

A minimal file-based app for trying out the rehynav API and inspecting navigation state.

## Setup

```bash
# From repository root
pnpm install
pnpm build       # Build rehynav first
cd examples/playground
pnpm dev
```

## What it demonstrates

- **File-based routing** via `import.meta.glob('./app/**/*.tsx')` in `main.tsx`
- **`<Stack>`** layout with a default header (`app/_layout.tsx`)
- **Dynamic routes** (`app/detail/[id].tsx`) read with `useLocalSearchParams`
- **Imperative + declarative navigation** (`useRouter`, `<Link>`, object hrefs)
- **State probes** (`app/probes.tsx`) showing `usePathname`, `useSegments`,
  `useGlobalSearchParams`, and the full `useRootNavigationState` tree

## Structure

```
src/
  main.tsx             — Entry point (RouterProvider + import.meta.glob)
  App.css              — Styles
  app/
    _layout.tsx        — Root <Stack>
    index.tsx          — "/" home with navigation controls
    detail/[id].tsx    — "/detail/:id" dynamic route
    probes.tsx         — "/probes" live navigation-state inspector
```
