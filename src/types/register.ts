import type { RouteMap } from './routes';

// biome-ignore lint/suspicious/noEmptyInterface: Register must be an interface for declaration merging
export interface Register {}

// Router type placeholder
export interface Router<R extends RouteMap> {
  _routes: R;
}

// Resolve registered route map
export type RegisteredRouteMap = Register extends { router: Router<infer R> } ? R : RouteMap;
