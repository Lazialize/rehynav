import type { ComponentType } from 'react';
import type { Serializable } from './serializable.js';

/** Route params, as produced from the URL or passed to navigation methods. */
export type Params = Record<string, Serializable>;

/**
 * A single dynamic segment convention parsed from a route name, e.g. `[id]`
 * produces `{ name: 'id', deep: false }` and `[...rest]` produces
 * `{ name: 'rest', deep: true }`.
 */
export interface DynamicConvention {
  name: string;
  deep: boolean;
}

/**
 * A node in the static route tree built from the `app/` directory. There are
 * two kinds:
 * - `layout` nodes correspond to a `_layout` file and act as navigators; their
 *   `children` are the screens registered in that navigator.
 * - `screen` nodes are leaf routes rendered inside their parent navigator.
 */
export interface RouteNode {
  type: 'layout' | 'screen';
  /** Name relative to the parent navigator, e.g. `index`, `posts/[id]`, `(tabs)`. */
  name: string;
  /** Original source key (file path) or a synthetic key for generated nodes. */
  contextKey: string;
  /** Default-exported React component for this route (eager). */
  component: ComponentType<unknown> | null;
  /** Child screens, only meaningful for `layout` nodes. */
  children: RouteNode[];
  /** Parsed dynamic conventions for each path segment in `name`, or null. */
  dynamic: DynamicConvention[] | null;
  /** Optional `initialRouteName` declared by a layout's `unstable_settings` export. */
  initialRouteName?: string;
}

/** Kind of navigator a layout renders. */
export type NavigatorType = 'stack' | 'tab';

/**
 * A single live route instance inside a navigator. Mirrors React Navigation's
 * route shape so the whole state object stays serializable.
 */
export interface NavigationRoute {
  /** Unique instance key (React key + History API addressing). */
  key: string;
  /** Screen name within the owning navigator (matches `RouteNode.name`). */
  name: string;
  params?: Params;
  /** Nested navigator state when this route is itself a layout. */
  state?: NavigatorState;
}

/**
 * Live state of a single navigator. For `stack` navigators `routes` is the
 * history (last entry is the top); for `tab` navigators `routes` holds one
 * entry per tab and `index` selects the active tab.
 */
export interface NavigatorState {
  type: NavigatorType;
  key: string;
  /** Active route index within `routes`. */
  index: number;
  /** All screen names this navigator can render. */
  routeNames: string[];
  routes: NavigationRoute[];
}

/** Information about the currently focused route. */
export interface RouteInfo {
  /** Resolved URL pathname, e.g. `/posts/42`. */
  pathname: string;
  /** Path + search params merged together. */
  params: Params;
  /** URL segments of the active route, e.g. `['posts', '[id]']`. */
  segments: string[];
}

export type { Serializable };
