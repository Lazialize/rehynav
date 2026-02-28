import type { RouteMap } from 'rehynav';

// Define all routes and their params as a single type.
// rehynav uses this for type-safe navigation throughout the app.
export type AppRoutes = {
  tabs: {
    home: Record<string, never>;
    search: Record<string, never>;
    profile: Record<string, never>;
  };
  stacks: {
    'home/post-detail': { postId: string };
    'search/post-detail': { postId: string };
    'profile/settings': Record<string, never>;
  };
  modals: {
    'new-post': Record<string, never>;
  };
  sheets: {
    share: { postId: string; title: string };
  };
};
satisfies;
RouteMap;
