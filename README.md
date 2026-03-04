# ReHynav

React navigation library for mobile web and hybrid apps.

> **Status: WIP / Experimental** — API is not finalized yet.

---

## Why ReHynav?

ReHynav is built for mobile-style navigation patterns—**tab-based apps with independent stacks**, **predictable back behavior**, and **overlay flows**—while still running on the web and in hybrid containers like Capacitor or Tauri.

Many React routers are optimized for "web-first" navigation (URL-driven, single history stack). That's great for classic websites, but mobile-style apps often need:

- **Bottom tabs that keep their own navigation history**
- **Back behavior that feels native** (overlay → stack → exit, matching iOS/Android conventions)
- **Overlay routes** that behave consistently across web + hybrid
- **State persistence** when switching tabs
- **Hybrid container integration** (designed for Capacitor/Tauri integration)

## Features

- **Tab = Independent Stack**
  Each tab maintains its own stack history, so switching tabs doesn't destroy navigation context.

- **Native-like Back Behavior**
  Back prioritizes what users expect on mobile: close overlay → pop stack → exit, matching iOS/Android conventions.

- **Overlay Routes**
  Present routes as overlays (modals, bottom sheets, etc.) without breaking stack flow. Overlays are navigation states that participate in the back stack—the user explicitly opens and closes them. Transient UI like toasts or snackbars is outside rehynav's scope.

- **State Persistence**
  Screens and tab stacks can keep state across tab switches and app lifecycle events.

- **Hybrid-friendly**
  Designed to integrate with Capacitor/Tauri: hardware back, lifecycle, and deep links.

- **Screen Lifecycle**
  Detect when screens gain or lose focus with `useFocusEffect` and `useIsFocused`. Automatically save and restore scroll position with `useScrollRestoration`.

- **Lazy Loading & Error Boundaries**
  Pass `React.lazy()` components directly to route definitions. Per-route error boundaries catch crashes without breaking the whole app.

- **Screen Preloading**
  Pre-render screens before navigation with `preload()` for instant transitions.

- **Resolved Path Navigation**
  Navigate with resolved paths like `push('/home/detail/42')` instead of route patterns. Params are automatically extracted from the URL. The existing pattern + params API (`push('home/detail/:id', { id: '42' })`) remains fully supported.

---

## Installation

```bash
npm install rehynav
# or
pnpm add rehynav
# or
yarn add rehynav
```

## Quick Start

### 1. Define Routes

```tsx
// router.ts
import { createRouter, tabs, tab, stack, overlay } from 'rehynav';

export const router = createRouter(
  [
    tabs(
      [
        tab('home', HomeScreen, [
          stack('post-detail/:postId', PostDetailScreen),
        ]),
        tab('search', SearchScreen),
        tab('profile', ProfileScreen, [
          stack('settings', SettingsScreen),
        ]),
      ],
      { initialTab: 'home', tabBar: AppTabBar },
    ),
    overlay('new-post', NewPostModal),
    overlay('share', ShareSheet),
  ],
  { urlSync: true },
);
```

### 2. Mount the Provider

```tsx
// main.tsx
import { RouterProvider } from 'rehynav';
import { router } from './router';

createRoot(document.getElementById('root')!).render(
  <RouterProvider router={router} />
);
```

### 3. Navigate

```tsx
import { useNavigation, useOverlay } from 'rehynav';

function HomeScreen() {
  const { push, goBack } = useNavigation();
  const overlay = useOverlay();

  return (
    <div>
      <button onClick={() => push('/home/post-detail/1')}>
        View Post
      </button>
      <button onClick={() => overlay.open('new-post')}>
        New Post
      </button>
      <button onClick={() => goBack()}>Back</button>
    </div>
  );
}
```

---

## Hooks Overview

| Hook | Description |
|------|-------------|
| `useNavigation` | Navigation actions: `push`, `goBack`, `replace`, etc. |
| `useRoute` | Access current route info and params |
| `useTab` | Switch tabs and get the active tab |
| `useOverlay` | `open` / `close` overlays |
| `useBeforeNavigate` | Navigation guard before route changes |
| `useBackHandler` | Custom back button handling |
| `useFocusEffect` | Run effects when screen gains/loses focus |
| `useIsFocused` | Check if current screen is focused |
| `useScrollRestoration` | Save and restore scroll position on focus changes |

## Components

| Component | Description |
|-----------|-------------|
| `RouterProvider` | Root provider — renders tabs, stacks, and overlays from a router instance |
| `TabNavigator` | Tab navigation container (used internally by `RouterProvider`, or standalone for advanced use) |
| `Link` | Declarative navigation link |

---

## License

MIT
