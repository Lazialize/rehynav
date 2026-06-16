import { type Href, resolveHref, withBasePath } from '../core/href.js';
import { getStateFromPath } from '../core/matching.js';
import { canGoBack as canGoBackState } from '../core/reducer.js';
import type { Params, RouteNode } from '../core/types.js';
import type { NavigationStore } from './navigation-store.js';

export interface ControllerConfig {
  basePath: string;
}

/**
 * Imperative navigation API bound to a store and route tree. Backs both the
 * `useRouter` hook and the global `router` object.
 */
export interface NavigationController {
  navigate(href: Href, params?: Params): void;
  push(href: Href, params?: Params): void;
  replace(href: Href, params?: Params): void;
  /** Switches to the navigator branch for `href`, preserving existing nested stacks (tab switch). */
  jumpTo(href: Href, params?: Params): void;
  back(): void;
  canGoBack(): boolean;
  setParams(params: Params): void;
  readonly store: NavigationStore;
  readonly tree: RouteNode;
  readonly config: ControllerConfig;
}

function combine(href: Href, params?: Params): Href {
  if (params && typeof href === 'string') return { pathname: href, params };
  if (params && typeof href === 'object') return { ...href, params: { ...href.params, ...params } };
  return href;
}

export function createController(
  store: NavigationStore,
  tree: RouteNode,
  config: ControllerConfig,
): NavigationController {
  function build(href: Href, params?: Params) {
    const url = withBasePath(resolveHref(combine(href, params)), config.basePath);
    return getStateFromPath(url, tree).state;
  }

  return {
    store,
    tree,
    config,
    navigate(href, params) {
      store.dispatch({ type: 'NAVIGATE', target: build(href, params), mode: 'navigate' });
    },
    push(href, params) {
      store.dispatch({ type: 'NAVIGATE', target: build(href, params), mode: 'push' });
    },
    replace(href, params) {
      store.dispatch({ type: 'NAVIGATE', target: build(href, params), mode: 'replace' });
    },
    jumpTo(href, params) {
      store.dispatch({ type: 'NAVIGATE', target: build(href, params), mode: 'switch' });
    },
    back() {
      store.dispatch({ type: 'BACK' });
    },
    canGoBack() {
      return canGoBackState(store.getState());
    },
    setParams(params) {
      store.dispatch({ type: 'SET_PARAMS', params });
    },
  };
}
