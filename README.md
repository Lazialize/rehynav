# ReHynav

React navigation library for mobile web and hybrid apps.

> **Status: WIP / Experimental** — API is not finalized yet.

---

## Why ReHynav?

ReHynav is built for mobile-style navigation patterns—**tab-based apps with independent stacks**, **predictable back behavior**, and **modal flows**—while still running on the web and in hybrid containers like Capacitor or Tauri.

Many React routers are optimized for "web-first" navigation (URL-driven, single history stack). That's great for classic websites, but mobile-style apps often need:

- **Bottom tabs that keep their own navigation history**
- **Back behavior that feels native** (modal → stack → exit, matching iOS/Android conventions)
- **Modal / sheet routes** that behave consistently across web + hybrid
- **State persistence** when switching tabs
- **Hybrid container integration** (designed for Capacitor/Tauri integration)

## Features

- **Tab = Independent Stack**
  Each tab maintains its own stack history, so switching tabs doesn't destroy navigation context.

- **Native-like Back Behavior**
  Back prioritizes what users expect on mobile: close modal/sheet → pop stack → exit, matching iOS/Android conventions.

- **Modal / Sheet Routes**
  Present routes as overlays (modal, bottom sheet) without breaking stack flow.

- **State Persistence**
  Screens and tab stacks can keep state across tab switches and app lifecycle events.

- **Hybrid-friendly**
  Designed to integrate with Capacitor/Tauri: hardware back, lifecycle, and deep links.

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
import { createRouter, tab, stack, modal, sheet } from 'rehynav';

const router = createRouter({
  tabs: [
    tab('home', HomeScreen, [
      stack('post-detail/:postId', PostDetailScreen),
    ]),
    tab('search', SearchScreen),
    tab('profile', ProfileScreen, [
      stack('settings', SettingsScreen),
    ]),
  ],
  modals: [modal('new-post', NewPostModal)],
  sheets: [sheet('share', ShareSheet)],
  initialTab: 'home',
});

export const {
  NavigationProvider,
  useNavigation,
  useRoute,
  useTab,
  useModal,
  useSheet,
  useBeforeNavigate,
  useBackHandler,
} = router;
```

### 2. Mount the Provider

```tsx
import { TabNavigator } from 'rehynav';
import { NavigationProvider } from './router';

function App() {
  return (
    <NavigationProvider urlSync>
      <TabNavigator tabBar={AppTabBar} />
    </NavigationProvider>
  );
}
```

### 3. Navigate

```tsx
import { useNavigation, useModal } from './router';

function HomeScreen() {
  const { push, goBack } = useNavigation();
  const modal = useModal();

  return (
    <div>
      <button onClick={() => push('post-detail/:postId', { postId: '1' })}>
        View Post
      </button>
      <button onClick={() => modal.open('new-post')}>
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
| `useModal` | `open` / `close` modals |
| `useSheet` | `open` / `close` sheets |
| `useBeforeNavigate` | Navigation guard before route changes |
| `useBackHandler` | Custom back button handling |

## Components

| Component | Description |
|-----------|-------------|
| `TabNavigator` | Tab navigation container with customizable tab bar |
| `Link` | Declarative navigation link |

---

## License

MIT
