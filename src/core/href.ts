import type { Params } from './types.js';

/** A navigation target: either a path string or an object with params. */
export type Href = string | { pathname: string; params?: Params };

/**
 * Resolves an {@link Href} to a URL string, substituting `[param]` / `[...param]`
 * placeholders in the pathname and appending any leftover params as a query
 * string.
 */
export function resolveHref(href: Href): string {
  if (typeof href === 'string') return href;

  const { pathname, params = {} } = href;
  const consumed = new Set<string>();
  const path = pathname
    .split('/')
    .map((segment) => {
      const deep = segment.match(/^\[\.\.\.(.+)\]$/);
      if (deep) {
        consumed.add(deep[1]);
        const value = params[deep[1]];
        if (Array.isArray(value)) return value.map((v) => encodeURIComponent(String(v))).join('/');
        return value != null ? encodeURIComponent(String(value)) : '';
      }
      const dynamic = segment.match(/^\[(.+)\]$/);
      if (dynamic) {
        consumed.add(dynamic[1]);
        const value = params[dynamic[1]];
        return value != null ? encodeURIComponent(String(value)) : '';
      }
      return segment;
    })
    .join('/');

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (consumed.has(key) || value == null) continue;
    query.set(key, String(value));
  }
  const queryString = query.toString();
  return queryString ? `${path}?${queryString}` : path;
}

/** Prefixes a href with the configured base path. */
export function withBasePath(href: string, basePath: string): string {
  if (!basePath) return href;
  const [path, query] = href.split('?');
  const normalized = `${basePath.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  return query ? `${normalized}?${query}` : normalized;
}

/** Strips the configured base path from a full pathname. */
export function stripBasePath(pathname: string, basePath: string): string {
  if (!basePath) return pathname;
  const base = basePath.replace(/\/$/, '');
  if (pathname === base) return '/';
  if (pathname.startsWith(`${base}/`)) return pathname.slice(base.length);
  return pathname;
}
