import type { ComponentType } from 'react';
import type { DynamicConvention, RouteNode } from './types.js';

/** Shape of a module exported by a route file in the `app/` directory. */
export interface RouteModule {
  default?: ComponentType<unknown>;
  unstable_settings?: { initialRouteName?: string };
}

/** A map of file path -> module, e.g. the result of `import.meta.glob(..., { eager: true })`. */
export type RouteContextMap = Record<string, RouteModule>;

const ROUTE_FILE_RE = /\.(tsx|ts|jsx|js)$/;

/**
 * Parses the dynamic conventions out of a route name. Returns `null` when the
 * name contains no dynamic segments.
 *
 * - `[id]`     -> `{ name: 'id', deep: false }`
 * - `[...rest]`-> `{ name: 'rest', deep: true }`
 */
export function parseDynamic(name: string): DynamicConvention[] | null {
  const conventions: DynamicConvention[] = [];
  for (const segment of name.split('/')) {
    const deep = segment.match(/^\[\.\.\.(.+)\]$/);
    if (deep) {
      conventions.push({ name: deep[1], deep: true });
      continue;
    }
    const single = segment.match(/^\[(.+)\]$/);
    if (single) {
      conventions.push({ name: single[1], deep: false });
    }
  }
  return conventions.length > 0 ? conventions : null;
}

/** Strips the leading path up to and including the `app/` directory and the file extension. */
function normalizeKey(key: string): string | null {
  if (!ROUTE_FILE_RE.test(key)) return null;
  const withoutExt = key.replace(ROUTE_FILE_RE, '');
  const segments = withoutExt.split('/').filter((s) => s !== '' && s !== '.');
  const appIndex = segments.indexOf('app');
  const relevant = appIndex >= 0 ? segments.slice(appIndex + 1) : segments;
  return relevant.join('/');
}

interface DirNode {
  layout?: RouteModule;
  routes: Map<string, RouteModule>;
  dirs: Map<string, DirNode>;
}

function emptyDir(): DirNode {
  return { routes: new Map(), dirs: new Map() };
}

function join(prefix: string, name: string): string {
  return prefix ? `${prefix}/${name}` : name;
}

/** Specificity ranking used to order sibling screens so matching is deterministic. */
function specificity(node: RouteNode): number {
  if (node.name === 'index') return 0;
  if (node.name.startsWith('+not-found')) return 100;
  if (!node.dynamic) return 1;
  return node.dynamic.some((d) => d.deep) ? 20 : 10;
}

function sortChildren(children: RouteNode[]): RouteNode[] {
  return [...children].sort(
    (a, b) => specificity(a) - specificity(b) || a.name.localeCompare(b.name),
  );
}

function collectScreens(dir: DirNode, prefix: string): RouteNode[] {
  const screens: RouteNode[] = [];

  for (const [segment, module] of dir.routes) {
    const name = join(prefix, segment);
    screens.push({
      type: 'screen',
      name,
      contextKey: name,
      component: module.default ?? null,
      children: [],
      dynamic: parseDynamic(name),
    });
  }

  for (const [dirName, child] of dir.dirs) {
    const name = join(prefix, dirName);
    if (child.layout) {
      screens.push(buildLayoutNode(child, name));
    } else {
      screens.push(...collectScreens(child, name));
    }
  }

  return sortChildren(screens);
}

function buildLayoutNode(dir: DirNode, name: string): RouteNode {
  return {
    type: 'layout',
    name,
    contextKey: name === '' ? '_layout' : `${name}/_layout`,
    component: dir.layout?.default ?? null,
    children: collectScreens(dir, ''),
    dynamic: null,
    initialRouteName: dir.layout?.unstable_settings?.initialRouteName,
  };
}

/**
 * Builds the static route tree from a glob context map of the `app/` directory.
 * The returned node is always the root layout navigator.
 */
export function buildRouteTree(context: RouteContextMap): RouteNode {
  const root = emptyDir();

  for (const [key, module] of Object.entries(context)) {
    const normalized = normalizeKey(key);
    if (normalized === null) continue;

    const segments = normalized.split('/').filter(Boolean);
    const fileName = segments.pop();
    if (fileName === undefined) continue;

    let dir = root;
    for (const segment of segments) {
      let next = dir.dirs.get(segment);
      if (!next) {
        next = emptyDir();
        dir.dirs.set(segment, next);
      }
      dir = next;
    }

    if (fileName === '_layout') {
      dir.layout = module;
    } else {
      dir.routes.set(fileName, module);
    }
  }

  return buildLayoutNode(root, '');
}

/** Flattens a route tree into a list of every reachable node (depth-first). */
export function flattenRouteTree(node: RouteNode, acc: RouteNode[] = []): RouteNode[] {
  acc.push(node);
  for (const child of node.children) {
    flattenRouteTree(child, acc);
  }
  return acc;
}

/** Finds a direct or nested layout child of a navigator node by screen name. */
export function findChild(layout: RouteNode, name: string): RouteNode | undefined {
  return layout.children.find((child) => child.name === name);
}
