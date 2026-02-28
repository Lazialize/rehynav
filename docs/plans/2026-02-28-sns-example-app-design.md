# SNS Example App Design

## Goal

Create a runnable example app in `examples/sns-app/` that demonstrates all major rehynav features with a SNS-like theme.

## Stack

- Vite + React 19
- Plain CSS (no framework)
- rehynav via workspace link

## Route Map

```typescript
type AppRoutes = {
  tabs: {
    home: {};
    search: {};
    profile: {};
  };
  stacks: {
    "home/post-detail": { postId: string };
    "search/post-detail": { postId: string };
    "profile/settings": {};
  };
  modals: {
    "new-post": {};
  };
  sheets: {
    share: { postId: string; title: string };
  };
};
```

## Features Demonstrated

| Feature | Where |
|---|---|
| Tab navigation | Home / Search / Profile tabs |
| Tab badges | Notification count on Home tab |
| Stack push/pop | Home → PostDetail, Profile → Settings |
| Modal overlay | New post creation dialog |
| Sheet overlay | Share sheet on post detail |
| Type-safe params | postId on PostDetail, title on ShareSheet |
| Link component | Post list items as declarative links |
| useBeforeNavigate | Unsaved changes guard on NewPostModal |
| URL sync | HistorySyncManager for browser history |
| Custom tab bar | Styled tab bar with icons |

## Directory Structure

```
examples/sns-app/
├── package.json
├── vite.config.ts
├── index.html
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── routes.ts
│   ├── data.ts              # Mock post data
│   ├── screens/
│   │   ├── HomeScreen.tsx
│   │   ├── PostDetailScreen.tsx
│   │   ├── SearchScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   └── SettingsScreen.tsx
│   ├── overlays/
│   │   ├── NewPostModal.tsx
│   │   └── ShareSheet.tsx
│   └── App.css
```

## Screen Details

- **HomeScreen**: Post feed list using Link components. FAB button to open NewPostModal.
- **PostDetailScreen**: Shows post content, share button opens ShareSheet. Reused from both home and search tabs.
- **SearchScreen**: Search input with filtered post list, links to post detail.
- **ProfileScreen**: User info, link to Settings. Sets badge on Home tab as demo.
- **SettingsScreen**: Simple settings list, demonstrates popToRoot.
- **NewPostModal**: Text input with useBeforeNavigate guard for unsaved changes.
- **ShareSheet**: Displays share options for a post.

## Design Principles

- Code readability over visual polish
- Each screen focuses on demonstrating specific rehynav APIs
- Comments in code explain which rehynav features are being used
- Minimal mock data, just enough to be realistic
