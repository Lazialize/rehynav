import { createId } from './id.js';
import { findChild } from './route-tree.js';
import type { NavigationRoute, NavigatorState, Params, RouteNode } from './types.js';

/** A parsed URL split into its pathname segments and search params. */
export interface ParsedUrl {
  segments: string[];
  search: Params;
}

function isGroup(segment: string): boolean {
  return segment.startsWith('(') && segment.endsWith(')');
}

function isDeepDynamic(segment: string): RegExpMatchArray | null {
  return segment.match(/^\[\.\.\.(.+)\]$/);
}

function isDynamic(segment: string): RegExpMatchArray | null {
  return segment.match(/^\[(.+)\]$/);
}

/** Parses a href into pathname segments and a search-param object. */
export function parseUrl(href: string): ParsedUrl {
  const [path, query = ''] = href.split('?');
  const segments = path.split('/').filter(Boolean).map(decodeURIComponent);
  const search: Params = {};
  if (query) {
    const usp = new URLSearchParams(query);
    for (const [key, value] of usp.entries()) {
      search[key] = value;
    }
  }
  return { segments, search };
}

interface ChildMatch {
  params: Params;
  rest: string[];
}

/**
 * Attempts to match a route node's (possibly multi-segment) name against the
 * leading URL segments. Returns captured params and the unconsumed segments,
 * or `null` when the node does not match.
 */
function matchNodeName(node: RouteNode, segments: string[]): ChildMatch | null {
  const nameSegments = node.name.split('/');
  const params: Params = {};
  let rest = segments;

  for (const nameSegment of nameSegments) {
    if (nameSegment === 'index' || isGroup(nameSegment)) {
      // Index and group segments contribute nothing to the URL.
      continue;
    }
    const deep = isDeepDynamic(nameSegment);
    if (deep) {
      params[deep[1]] = rest.slice();
      rest = [];
      continue;
    }
    const dynamic = isDynamic(nameSegment);
    if (dynamic) {
      if (rest.length === 0) return null;
      params[dynamic[1]] = rest[0];
      rest = rest.slice(1);
      continue;
    }
    // Static segment.
    if (rest.length === 0 || rest[0] !== nameSegment) return null;
    rest = rest.slice(1);
  }

  return { params, rest };
}

function newRoute(name: string, params: Params, state?: NavigatorState): NavigationRoute {
  const route: NavigationRoute = { key: createId('route'), name };
  if (Object.keys(params).length > 0) route.params = params;
  if (state) route.state = state;
  return route;
}

function emptyNavigatorState(layout: RouteNode, routes: NavigationRoute[]): NavigatorState {
  return {
    type: 'stack',
    key: createId('nav'),
    index: routes.length - 1,
    routeNames: layout.children.map((child) => child.name),
    routes,
  };
}

/**
 * Builds the navigator state for a layout that satisfies the given URL segments.
 * Returns `null` when no child route can satisfy the remaining path.
 */
function buildNavigatorState(
  layout: RouteNode,
  segments: string[],
  search: Params,
): NavigatorState | null {
  for (const child of layout.children) {
    const match = matchNodeName(child, segments);
    if (!match) continue;

    if (child.type === 'layout') {
      const nested = buildNavigatorState(child, match.rest, search);
      if (!nested) continue;
      return emptyNavigatorState(layout, [newRoute(child.name, match.params, nested)]);
    }

    // Leaf: the route only matches when every segment has been consumed.
    if (match.rest.length > 0) continue;
    return emptyNavigatorState(layout, [newRoute(child.name, { ...match.params, ...search })]);
  }

  return null;
}

/** Result of resolving a URL against the route tree. */
export interface MatchResult {
  state: NavigatorState;
  notFound: boolean;
}

/** Resolves a href into a navigation state for the root navigator. */
export function getStateFromPath(href: string, root: RouteNode): MatchResult {
  const { segments, search } = parseUrl(href);
  const state = buildNavigatorState(root, segments, search);
  if (state) return { state, notFound: false };

  // Fall back to a `+not-found` route at the root if present.
  const notFoundNode = root.children.find((child) => child.name.startsWith('+not-found'));
  const params: Params = { 'not-found': segments, ...search };
  const fallbackName = notFoundNode ? notFoundNode.name : '+not-found';
  return {
    state: emptyNavigatorState(root, [newRoute(fallbackName, params)]),
    notFound: true,
  };
}

function nameToUrlSegments(name: string, params: Params | undefined): string[] {
  const out: string[] = [];
  for (const segment of name.split('/')) {
    if (segment === 'index' || isGroup(segment)) continue;
    const deep = isDeepDynamic(segment);
    if (deep) {
      const value = params?.[deep[1]];
      if (Array.isArray(value)) out.push(...value.map((v) => encodeURIComponent(String(v))));
      else if (value != null) out.push(encodeURIComponent(String(value)));
      continue;
    }
    const dynamic = isDynamic(segment);
    if (dynamic) {
      const value = params?.[dynamic[1]];
      if (value != null) out.push(encodeURIComponent(String(value)));
      continue;
    }
    out.push(segment);
  }
  return out;
}

/** Collects the param names consumed by a route name as URL path params. */
function pathParamNames(name: string): string[] {
  const names: string[] = [];
  for (const segment of name.split('/')) {
    const deep = isDeepDynamic(segment);
    if (deep) names.push(deep[1]);
    const dynamic = isDynamic(segment);
    if (dynamic) names.push(dynamic[1]);
  }
  return names;
}

/** Serializes the active route chain of a navigation state back into a href. */
export function getPathFromState(state: NavigatorState): string {
  const segments: string[] = [];
  const consumedParams = new Set<string>();
  let nav: NavigatorState | undefined = state;
  let leafParams: Params = {};

  while (nav) {
    const route: NavigationRoute | undefined = nav.routes[nav.index];
    if (!route) break;
    segments.push(...nameToUrlSegments(route.name, route.params));
    for (const param of pathParamNames(route.name)) consumedParams.add(param);
    leafParams = route.params ?? {};
    nav = route.state;
  }

  const pathname = `/${segments.join('/')}`;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(leafParams)) {
    if (consumedParams.has(key) || value == null) continue;
    query.set(key, String(value));
  }
  const queryString = query.toString();
  return queryString ? `${pathname}?${queryString}` : pathname;
}

/** Merges the captured params of every route along the active chain. */
export function collectActiveParams(state: NavigatorState): Params {
  const params: Params = {};
  let nav: NavigatorState | undefined = state;
  while (nav) {
    const route: NavigationRoute | undefined = nav.routes[nav.index];
    if (!route) break;
    Object.assign(params, route.params);
    nav = route.state;
  }
  return params;
}

/** Collects the route keys along the active chain (used to determine focus). */
export function collectActiveKeys(state: NavigatorState): Set<string> {
  const keys = new Set<string>();
  let nav: NavigatorState | undefined = state;
  while (nav) {
    const route: NavigationRoute | undefined = nav.routes[nav.index];
    if (!route) break;
    keys.add(route.key);
    nav = route.state;
  }
  return keys;
}

/** Returns the URL segments (route names) of the active chain, groups stripped. */
export function collectActiveSegments(state: NavigatorState): string[] {
  const segments: string[] = [];
  let nav: NavigatorState | undefined = state;
  while (nav) {
    const route: NavigationRoute | undefined = nav.routes[nav.index];
    if (!route) break;
    for (const segment of route.name.split('/')) {
      if (!isGroup(segment) && segment !== 'index') segments.push(segment);
    }
    nav = route.state;
  }
  return segments;
}

/** Locates the layout node that owns a given navigator route name from the root. */
export function resolveLayoutNode(root: RouteNode, name: string): RouteNode | undefined {
  return findChild(root, name);
}
