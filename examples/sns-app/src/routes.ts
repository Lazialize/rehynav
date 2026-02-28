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
};
satisfies;
RouteMap;
