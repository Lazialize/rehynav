# ReHynav

File-based navigation for React on the web and in hybrid containers (Capacitor / Tauri).

> **Status: WIP / Experimental** — API is not finalized yet.

ReHynav gives you an [Expo Router](https://docs.expo.dev/router/introduction/)-style,
**file-based** routing API for plain React web and hybrid apps. Files in an `app/`
directory become routes, `_layout` files become navigators (`Stack` / `Tabs`), and
navigation is driven by URLs — while keeping mobile-first behavior like **independent
per-tab stacks** and **native-like back**.

---

## Why ReHynav?

Mobile-style apps often need things web-first routers don't prioritize:

- **Bottom tabs that keep their own navigation history** (switching tabs preserves each stack)
- **Back behavior that feels native** (pop the deepest stack, skip tab switches)
- **A serializable navigation state** that round-trips through the History API and survives deep links
- **Hybrid container integration** (designed for Capacitor/Tauri hardware back and deep links)

If you like Expo Router's authoring model but are shipping to the **web, Capacitor, or
Tauri** (no React Native), ReHynav gives you the same conventions on the DOM.

## Installation

```bash
pnpm add rehynav   # or npm / yarn
```

React 19+ is a peer dependency.

## Quick start

### 1. Create an `app/` directory

```
src/app/
  _layout.tsx              # root navigator
  index.tsx                # "/"
  (tabs)/
    _layout.tsx            # <Tabs>
    (home)/
      _layout.tsx          # <Stack>  → the Home tab
      index.tsx            # "/"
      post/[id].tsx        # "/post/:id"
    search/
      _layout.tsx
      index.tsx            # "/search"
  +not-found.tsx           # fallback route
```

### 2. Point the provider at the directory

ReHynav is bundler-agnostic: pass it a glob of your route modules. With Vite:

```tsx
// main.tsx
import { createRoot } from 'react-dom/client';
import { RouterProvider, type RouteContextMap } from 'rehynav';

const context = import.meta.glob('./app/**/*.tsx', { eager: true }) as RouteContextMap;

createRoot(document.getElementById('root')!).render(
  <RouterProvider context={context} />,
);
```

### 3. Define navigators in `_layout.tsx`

```tsx
// app/_layout.tsx
import { Stack } from 'rehynav';
export default function RootLayout() {
  return <Stack />;
}

// app/(tabs)/_layout.tsx
import { Tabs } from 'rehynav';
export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="(home)" options={{ title: 'Home' }} />
      <Tabs.Screen name="search" options={{ title: 'Search' }} />
    </Tabs>
  );
}
```

### 4. Navigate

```tsx
import { Link, useRouter, useLocalSearchParams } from 'rehynav';

export default function PostList() {
  const router = useRouter();
  return (
    <>
      <Link href="/post/42">View post 42</Link>
      <button onClick={() => router.push({ pathname: '/post/[id]', params: { id: 7 } })}>
        Push post 7
      </button>
    </>
  );
}

// app/(tabs)/(home)/post/[id].tsx
export default function Post() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <h1>Post {id}</h1>;
}
```

You can also navigate imperatively from anywhere (event handlers, native back-button
listeners) via the global `router`:

```ts
import { router } from 'rehynav';
router.push('/search');
```

---

## Routing conventions

| File / folder    | Meaning                                                       |
| ---------------- | ------------------------------------------------------------- |
| `index.tsx`      | The index route of its navigator (`/`)                        |
| `about.tsx`      | Static route (`/about`)                                       |
| `[id].tsx`       | Dynamic segment → `params.id`                                 |
| `[...rest].tsx`  | Catch-all → `params.rest` (string array)                      |
| `_layout.tsx`    | A navigator (`<Stack>`, `<Tabs>`, or `<Slot>`) for its folder |
| `(group)/`       | Grouping folder — does **not** add a URL segment              |
| `+not-found.tsx` | Fallback route for unmatched URLs                             |

Folders without a `_layout` are flattened into their parent navigator.

## API overview

### Components

| Component        | Description                                                      |
| ---------------- | ---------------------------------------------------------------- |
| `RouterProvider` | Root of the app; builds the route tree from the `app/` context   |
| `Stack`          | Stack navigator with a default header (`<Stack.Screen>` options) |
| `Tabs`           | Tab navigator with independent per-tab stacks (`<Tabs.Screen>`)  |
| `Slot`           | Renders the active child route with no surrounding UI            |
| `Link`           | Declarative `<a>` that performs client-side navigation           |
| `Redirect`       | Replaces the current route on mount                              |

### Hooks

| Hook                              | Description                                            |
| --------------------------------- | ------------------------------------------------------ |
| `useRouter`                       | `push` / `replace` / `navigate` / `back` / `setParams` |
| `useNavigation`                   | Same, with a `goBack` alias (React Navigation style)   |
| `usePathname`                     | Current pathname                                       |
| `useSegments`                     | Active route segments                                  |
| `useLocalSearchParams`            | Params of the screen this hook is called from          |
| `useGlobalSearchParams`           | Params of the globally focused route                   |
| `useFocusEffect` / `useIsFocused` | Screen focus lifecycle                                 |
| `useRootNavigationState`          | The full navigation state tree                         |

### Imperative

`router` — a global navigation object for use outside React components.

---

## License

MIT
