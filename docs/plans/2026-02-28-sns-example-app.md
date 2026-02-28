# SNS Example App Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a runnable Vite + React example app in `examples/sns-app/` that demonstrates all major rehynav features (tabs, stacks, modals, sheets, guards, URL sync, Link, badges) with an SNS-like theme.

**Architecture:** Single-page app using `createRouter` as the entry point. Three tabs (Home/Search/Profile) with stack screens, a modal for new posts, and a sheet for sharing. Plain CSS for styling. rehynav is linked via `workspace:*`.

**Tech Stack:** Vite, React 19, rehynav (workspace link), plain CSS

---

### Task 1: Project Scaffold

**Files:**
- Create: `examples/sns-app/package.json`
- Create: `examples/sns-app/vite.config.ts`
- Create: `examples/sns-app/index.html`
- Create: `examples/sns-app/tsconfig.json`
- Create: `examples/sns-app/src/main.tsx`
- Modify: `package.json` (root — add pnpm workspace config)
- Create: `pnpm-workspace.yaml`

**Step 1: Create `pnpm-workspace.yaml` in project root**

```yaml
packages:
  - "."
  - "examples/*"
```

**Step 2: Create `examples/sns-app/package.json`**

```json
{
  "name": "sns-app-example",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "rehynav": "workspace:*"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.5.2",
    "typescript": "^5.9.3",
    "vite": "^6.3.5"
  }
}
```

**Step 3: Create `examples/sns-app/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "noEmit": true
  },
  "include": ["src"]
}
```

**Step 4: Create `examples/sns-app/vite.config.ts`**

```ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
});
```

**Step 5: Create `examples/sns-app/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>rehynav SNS Example</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**Step 6: Create `examples/sns-app/src/main.tsx`**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

**Step 7: Install dependencies**

Run: `cd examples/sns-app && pnpm install`

**Step 8: Commit**

```bash
git add pnpm-workspace.yaml examples/sns-app/package.json examples/sns-app/tsconfig.json examples/sns-app/vite.config.ts examples/sns-app/index.html examples/sns-app/src/main.tsx
git commit -m "chore: scaffold sns-app example project"
```

---

### Task 2: Route Definitions and Mock Data

**Files:**
- Create: `examples/sns-app/src/routes.ts`
- Create: `examples/sns-app/src/data.ts`

**Step 1: Create `examples/sns-app/src/routes.ts`**

```ts
import type { RouteMap } from 'rehynav';

// Define all routes and their params as a single type.
// rehynav uses this for type-safe navigation throughout the app.
export type AppRoutes = {
  tabs: {
    home: {};
    search: {};
    profile: {};
  };
  stacks: {
    'home/post-detail': { postId: string };
    'search/post-detail': { postId: string };
    'profile/settings': {};
  };
  modals: {
    'new-post': {};
  };
  sheets: {
    share: { postId: string; title: string };
  };
} satisfies RouteMap;
```

**Step 2: Create `examples/sns-app/src/data.ts`**

```ts
export interface Post {
  id: string;
  author: string;
  content: string;
  likes: number;
  timestamp: string;
}

export const posts: Post[] = [
  {
    id: '1',
    author: 'alice',
    content: 'Just shipped a new feature with rehynav! Tab navigation feels so smooth.',
    likes: 12,
    timestamp: '2m ago',
  },
  {
    id: '2',
    author: 'bob',
    content: 'Anyone else building hybrid apps? Capacitor + rehynav is a great combo.',
    likes: 8,
    timestamp: '15m ago',
  },
  {
    id: '3',
    author: 'charlie',
    content: 'Type-safe routing is a game changer. No more typos in route names.',
    likes: 24,
    timestamp: '1h ago',
  },
  {
    id: '4',
    author: 'diana',
    content: 'The modal and sheet overlays work perfectly for my e-commerce app.',
    likes: 5,
    timestamp: '3h ago',
  },
];

export function getPost(id: string): Post | undefined {
  return posts.find((p) => p.id === id);
}
```

**Step 3: Commit**

```bash
git add examples/sns-app/src/routes.ts examples/sns-app/src/data.ts
git commit -m "feat(example): add route definitions and mock data"
```

---

### Task 3: Screens — HomeScreen, PostDetailScreen, SearchScreen

**Files:**
- Create: `examples/sns-app/src/screens/HomeScreen.tsx`
- Create: `examples/sns-app/src/screens/PostDetailScreen.tsx`
- Create: `examples/sns-app/src/screens/SearchScreen.tsx`

**Step 1: Create `examples/sns-app/src/screens/HomeScreen.tsx`**

Demonstrates: Link component for declarative navigation, useModal to open new-post modal.

```tsx
import { Link, useModal } from 'rehynav';
import { posts } from '../data';

export function HomeScreen() {
  // useModal — open overlays imperatively
  const modal = useModal();

  return (
    <div className="screen">
      <header className="screen-header">
        <h1>Home</h1>
        <button
          type="button"
          className="fab"
          onClick={() => modal.open('new-post')}
        >
          + New Post
        </button>
      </header>

      <ul className="post-list">
        {posts.map((post) => (
          <li key={post.id} className="post-card">
            {/* Link — declarative, type-safe navigation */}
            <Link to="home/post-detail" params={{ postId: post.id }}>
              <strong>@{post.author}</strong>
              <p>{post.content}</p>
              <span className="post-meta">
                {post.likes} likes · {post.timestamp}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

**Step 2: Create `examples/sns-app/src/screens/PostDetailScreen.tsx`**

Demonstrates: useRoute for reading params, useNavigation for goBack, useSheet for opening share sheet.

```tsx
import type { ScreenComponentProps } from 'rehynav';
import { useNavigation, useSheet } from 'rehynav';
import { getPost } from '../data';

// ScreenComponentProps gives you typed `params` based on route definition
export function PostDetailScreen({
  params,
}: ScreenComponentProps<{ postId: string }>) {
  const navigation = useNavigation();
  const sheet = useSheet();
  const post = getPost(params.postId);

  if (!post) {
    return <div className="screen">Post not found</div>;
  }

  return (
    <div className="screen">
      <header className="screen-header">
        {/* goBack — smart back: closes overlay → pops stack → switches tab */}
        <button type="button" onClick={() => navigation.goBack()}>
          ← Back
        </button>
        <h1>Post</h1>
      </header>

      <article className="post-detail">
        <h2>@{post.author}</h2>
        <p>{post.content}</p>
        <div className="post-meta">{post.likes} likes · {post.timestamp}</div>

        {/* useSheet — open a bottom sheet overlay */}
        <button
          type="button"
          className="share-button"
          onClick={() =>
            sheet.open('share', { postId: post.id, title: post.content })
          }
        >
          Share
        </button>
      </article>
    </div>
  );
}
```

**Step 3: Create `examples/sns-app/src/screens/SearchScreen.tsx`**

Demonstrates: Link with different tab prefix, useState for local state.

```tsx
import { useState } from 'react';
import { Link } from 'rehynav';
import { posts } from '../data';

export function SearchScreen() {
  const [query, setQuery] = useState('');

  const filtered = query
    ? posts.filter(
        (p) =>
          p.content.toLowerCase().includes(query.toLowerCase()) ||
          p.author.toLowerCase().includes(query.toLowerCase()),
      )
    : posts;

  return (
    <div className="screen">
      <header className="screen-header">
        <h1>Search</h1>
      </header>

      <input
        type="text"
        className="search-input"
        placeholder="Search posts..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <ul className="post-list">
        {filtered.map((post) => (
          <li key={post.id} className="post-card">
            {/* Same PostDetailScreen, but under search tab's stack */}
            <Link to="search/post-detail" params={{ postId: post.id }}>
              <strong>@{post.author}</strong>
              <p>{post.content}</p>
            </Link>
          </li>
        ))}
        {filtered.length === 0 && <li className="empty">No results</li>}
      </ul>
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add examples/sns-app/src/screens/
git commit -m "feat(example): add Home, PostDetail, and Search screens"
```

---

### Task 4: Screens — ProfileScreen, SettingsScreen

**Files:**
- Create: `examples/sns-app/src/screens/ProfileScreen.tsx`
- Create: `examples/sns-app/src/screens/SettingsScreen.tsx`

**Step 1: Create `examples/sns-app/src/screens/ProfileScreen.tsx`**

Demonstrates: useNavigation.push for imperative navigation, useTab.setBadge for tab badges.

```tsx
import { useNavigation, useTab } from 'rehynav';

export function ProfileScreen() {
  const navigation = useNavigation();
  const tab = useTab();

  return (
    <div className="screen">
      <header className="screen-header">
        <h1>Profile</h1>
      </header>

      <div className="profile-card">
        <div className="avatar">You</div>
        <h2>@you</h2>
        <p>Mobile app developer</p>
      </div>

      <div className="action-list">
        {/* push — imperative stack navigation */}
        <button
          type="button"
          onClick={() => navigation.push('profile/settings')}
        >
          Settings →
        </button>

        {/* setBadge — show a notification badge on the Home tab */}
        <button type="button" onClick={() => tab.setBadge('home', 3)}>
          Set Home badge to 3
        </button>
        <button type="button" onClick={() => tab.setBadge('home', undefined)}>
          Clear Home badge
        </button>
      </div>
    </div>
  );
}
```

**Step 2: Create `examples/sns-app/src/screens/SettingsScreen.tsx`**

Demonstrates: useNavigation.popToRoot, useNavigation.goBack.

```tsx
import { useNavigation } from 'rehynav';

export function SettingsScreen() {
  const navigation = useNavigation();

  return (
    <div className="screen">
      <header className="screen-header">
        <button type="button" onClick={() => navigation.goBack()}>
          ← Back
        </button>
        <h1>Settings</h1>
      </header>

      <div className="settings-list">
        <div className="settings-item">Notifications</div>
        <div className="settings-item">Privacy</div>
        <div className="settings-item">Account</div>
      </div>

      {/* popToRoot — jump back to the tab's root screen */}
      <button
        type="button"
        className="pop-root-button"
        onClick={() => navigation.popToRoot()}
      >
        Back to Profile (popToRoot)
      </button>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add examples/sns-app/src/screens/ProfileScreen.tsx examples/sns-app/src/screens/SettingsScreen.tsx
git commit -m "feat(example): add Profile and Settings screens"
```

---

### Task 5: Overlays — NewPostModal, ShareSheet

**Files:**
- Create: `examples/sns-app/src/overlays/NewPostModal.tsx`
- Create: `examples/sns-app/src/overlays/ShareSheet.tsx`

**Step 1: Create `examples/sns-app/src/overlays/NewPostModal.tsx`**

Demonstrates: useModal.close, useBeforeNavigate guard for unsaved changes.

```tsx
import { useCallback, useState } from 'react';
import { useBeforeNavigate, useModal } from 'rehynav';

export function NewPostModal() {
  const modal = useModal();
  const [text, setText] = useState('');

  // useBeforeNavigate — prevent navigation when there are unsaved changes.
  // Return false to block, true to allow.
  useBeforeNavigate(
    useCallback(
      (_from, _to, _direction) => {
        if (text.length > 0) {
          return window.confirm(
            'You have unsaved changes. Discard and leave?',
          );
        }
        return true;
      },
      [text],
    ),
  );

  const handleSubmit = () => {
    alert(`Post created: "${text}"`);
    setText('');
    modal.close();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <header className="screen-header">
          <button type="button" onClick={() => modal.close()}>
            Cancel
          </button>
          <h1>New Post</h1>
          <button
            type="button"
            disabled={text.length === 0}
            onClick={handleSubmit}
          >
            Post
          </button>
        </header>

        <textarea
          className="post-input"
          placeholder="What's on your mind?"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
        />
      </div>
    </div>
  );
}
```

**Step 2: Create `examples/sns-app/src/overlays/ShareSheet.tsx`**

Demonstrates: ScreenComponentProps for typed params on overlays, useSheet.close.

```tsx
import type { ScreenComponentProps } from 'rehynav';
import { useSheet } from 'rehynav';

export function ShareSheet({
  params,
}: ScreenComponentProps<{ postId: string; title: string }>) {
  const sheet = useSheet();

  const handleShare = (method: string) => {
    alert(`Shared post #${params.postId} via ${method}`);
    sheet.close();
  };

  return (
    <div className="sheet-backdrop">
      <div className="sheet-content">
        <div className="sheet-handle" />
        <h2>Share</h2>
        <p className="sheet-preview">"{params.title}"</p>

        <div className="share-options">
          <button type="button" onClick={() => handleShare('Copy Link')}>
            Copy Link
          </button>
          <button type="button" onClick={() => handleShare('Twitter')}>
            Twitter
          </button>
          <button type="button" onClick={() => handleShare('Message')}>
            Message
          </button>
        </div>

        <button
          type="button"
          className="sheet-close"
          onClick={() => sheet.close()}
        >
          Close
        </button>
      </div>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add examples/sns-app/src/overlays/
git commit -m "feat(example): add NewPostModal and ShareSheet overlays"
```

---

### Task 6: App Component and CSS

**Files:**
- Create: `examples/sns-app/src/App.tsx`
- Create: `examples/sns-app/src/App.css`

**Step 1: Create `examples/sns-app/src/App.tsx`**

Demonstrates: createRouter factory, NavigationProvider with urlSync, TabNavigator with custom tab bar, Screen registration.

```tsx
import { createRouter } from 'rehynav';
import { Screen, TabNavigator } from 'rehynav';
import type { TabBarProps } from 'rehynav';
import './App.css';

import { NewPostModal } from './overlays/NewPostModal';
import { ShareSheet } from './overlays/ShareSheet';
import { HomeScreen } from './screens/HomeScreen';
import { PostDetailScreen } from './screens/PostDetailScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { SearchScreen } from './screens/SearchScreen';
import { SettingsScreen } from './screens/SettingsScreen';

import type { AppRoutes } from './routes';

// 1. createRouter — create a typed router instance.
//    All hooks and components returned are bound to your route types.
const router = createRouter<AppRoutes>({
  tabs: ['home', 'search', 'profile'],
  initialTab: 'home',
});

// Destructure hooks and components from the router
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

// 2. Custom tab bar — receives typed TabBarProps from rehynav
function AppTabBar({ tabs, onTabPress }: TabBarProps) {
  const icons: Record<string, string> = {
    home: '🏠',
    search: '🔍',
    profile: '👤',
  };

  return (
    <nav className="tab-bar">
      {tabs.map((tab) => (
        <button
          key={tab.name}
          type="button"
          className={`tab-item ${tab.isActive ? 'active' : ''}`}
          onClick={() => onTabPress(tab.name)}
        >
          <span className="tab-icon">{icons[tab.name] ?? '•'}</span>
          <span className="tab-label">{tab.name}</span>
          {tab.badge != null && (
            <span className="tab-badge">{tab.badge}</span>
          )}
        </button>
      ))}
    </nav>
  );
}

export function App() {
  return (
    // 3. NavigationProvider — wraps the app, enables urlSync for browser history
    <NavigationProvider urlSync>
      {/* 4. Screen — register route name → component mappings */}
      <Screen name="home" component={HomeScreen} />
      <Screen name="search" component={SearchScreen} />
      <Screen name="profile" component={ProfileScreen} />
      <Screen name="home/post-detail" component={PostDetailScreen} />
      <Screen name="search/post-detail" component={PostDetailScreen} />
      <Screen name="profile/settings" component={SettingsScreen} />
      <Screen name="new-post" component={NewPostModal} />
      <Screen name="share" component={ShareSheet} />

      {/* 5. TabNavigator — renders tabs + stacks + overlays */}
      <TabNavigator tabBar={AppTabBar} />
    </NavigationProvider>
  );
}
```

**Step 2: Create `examples/sns-app/src/App.css`**

```css
/* Reset */
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f5f5f5;
  color: #333;
}

#root {
  max-width: 430px;
  margin: 0 auto;
  height: 100dvh;
  background: #fff;
  position: relative;
  overflow: hidden;
}

/* Screen layout */
.screen {
  padding: 16px;
  height: 100%;
  overflow-y: auto;
}

.screen-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.screen-header h1 {
  flex: 1;
  font-size: 20px;
}

/* Tab bar */
.tab-bar {
  display: flex;
  border-top: 1px solid #e0e0e0;
  background: #fff;
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 0;
  border: none;
  background: none;
  cursor: pointer;
  color: #999;
  font-size: 11px;
  position: relative;
}

.tab-item.active {
  color: #4a90d9;
}

.tab-icon {
  font-size: 20px;
  line-height: 1;
}

.tab-label {
  margin-top: 2px;
  text-transform: capitalize;
}

.tab-badge {
  position: absolute;
  top: 4px;
  right: calc(50% - 16px);
  background: #e74c3c;
  color: #fff;
  font-size: 10px;
  min-width: 16px;
  height: 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
}

/* Post list */
.post-list {
  list-style: none;
}

.post-card {
  border-bottom: 1px solid #eee;
}

.post-card a {
  display: block;
  padding: 12px 0;
  color: inherit;
  text-decoration: none;
}

.post-card a:hover {
  background: #f9f9f9;
}

.post-card strong {
  color: #4a90d9;
}

.post-card p {
  margin: 4px 0;
  line-height: 1.4;
}

.post-meta {
  font-size: 12px;
  color: #999;
}

/* FAB */
.fab {
  padding: 8px 16px;
  background: #4a90d9;
  color: #fff;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  white-space: nowrap;
}

/* Post detail */
.post-detail {
  padding: 16px 0;
}

.post-detail h2 {
  color: #4a90d9;
  margin-bottom: 8px;
}

.post-detail p {
  line-height: 1.6;
  margin-bottom: 12px;
}

.share-button {
  margin-top: 16px;
  padding: 10px 24px;
  background: #eee;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

/* Search */
.search-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  margin-bottom: 12px;
}

.empty {
  text-align: center;
  color: #999;
  padding: 32px 0;
}

/* Profile */
.profile-card {
  text-align: center;
  padding: 24px 0;
}

.avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #4a90d9;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 12px;
  font-size: 18px;
}

.action-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.action-list button {
  width: 100%;
  padding: 12px;
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  font-size: 14px;
}

/* Settings */
.settings-list {
  margin-bottom: 16px;
}

.settings-item {
  padding: 14px 0;
  border-bottom: 1px solid #eee;
}

.pop-root-button {
  width: 100%;
  padding: 12px;
  background: #e74c3c;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
}

/* Modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-content {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  width: 90%;
  max-width: 400px;
}

.post-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  resize: none;
  font-family: inherit;
}

/* Sheet */
.sheet-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 100;
}

.sheet-content {
  background: #fff;
  border-radius: 12px 12px 0 0;
  padding: 16px;
  width: 100%;
  max-width: 430px;
}

.sheet-handle {
  width: 36px;
  height: 4px;
  background: #ddd;
  border-radius: 2px;
  margin: 0 auto 16px;
}

.sheet-preview {
  color: #666;
  font-style: italic;
  margin: 8px 0 16px;
  font-size: 13px;
}

.share-options {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.share-options button {
  flex: 1;
  padding: 12px;
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
}

.sheet-close {
  width: 100%;
  padding: 12px;
  background: none;
  border: 1px solid #ddd;
  border-radius: 8px;
  cursor: pointer;
  color: #999;
}
```

**Step 3: Commit**

```bash
git add examples/sns-app/src/App.tsx examples/sns-app/src/App.css
git commit -m "feat(example): add App component with router setup and CSS"
```

---

### Task 7: Verify the Example App Runs

**Step 1: Install dependencies**

Run: `cd /Users/lazialize/ghq/github.com/Lazialize/rehynav && pnpm install`

**Step 2: Build rehynav (ensure dist is fresh)**

Run: `pnpm build`

**Step 3: Start the dev server**

Run: `cd examples/sns-app && pnpm dev`

Expected: Vite dev server starts, app renders with 3 tabs, navigation works.

**Step 4: Manually verify these interactions**

1. Home tab shows post list
2. Tap a post → navigates to PostDetailScreen
3. Back button returns to Home
4. FAB opens NewPostModal
5. Type text, try to close → guard shows confirmation
6. Search tab filters posts
7. Profile → Settings → popToRoot works
8. Set badge on Home tab → badge appears
9. Share sheet opens from PostDetail

**Step 5: Fix any issues found**

**Step 6: Final commit if any fixes**

```bash
git add -A examples/sns-app/
git commit -m "fix(example): polish and fix issues found during verification"
```
