import type { Serializable } from './serializable';

// Route map structure that users define
export interface RouteMap {
  tabs: Record<string, Record<string, Serializable>>;
  stacks?: Record<string, Record<string, Serializable>>;
  modals?: Record<string, Record<string, Serializable>>;
  sheets?: Record<string, Record<string, Serializable>>;
}

// Extract keys that have required properties
export type RequiredKeys<T> = {
  [K in keyof T]-?: object extends Pick<T, K> ? never : K;
}[keyof T];

// Route categories derived from route map
export type TabRoutes<R extends RouteMap> = Extract<keyof R['tabs'], string>;
export type StackRoutes<R extends RouteMap> =
  R['stacks'] extends Record<string, unknown> ? Extract<keyof R['stacks'], string> : never;
export type ModalRoutes<R extends RouteMap> =
  R['modals'] extends Record<string, unknown> ? Extract<keyof R['modals'], string> : never;
export type SheetRoutes<R extends RouteMap> =
  R['sheets'] extends Record<string, unknown> ? Extract<keyof R['sheets'], string> : never;

// All route names
export type AllRoutes<R extends RouteMap> =
  | TabRoutes<R>
  | StackRoutes<R>
  | ModalRoutes<R>
  | SheetRoutes<R>;

// Linkable routes (only tabs and stacks)
export type LinkableRoutes<R extends RouteMap> = TabRoutes<R> | StackRoutes<R>;

// Route params accessor
export type RouteParams<R extends RouteMap, RouteName extends AllRoutes<R>> =
  RouteName extends TabRoutes<R>
    ? R['tabs'][RouteName]
    : RouteName extends StackRoutes<R>
      ? R['stacks'] extends Record<string, unknown>
        ? R['stacks'][RouteName]
        : never
      : RouteName extends ModalRoutes<R>
        ? R['modals'] extends Record<string, unknown>
          ? R['modals'][RouteName]
          : never
        : RouteName extends SheetRoutes<R>
          ? R['sheets'] extends Record<string, unknown>
            ? R['sheets'][RouteName]
            : never
          : never;

// Stack route key validation
export type ValidStackKey<Tabs extends string> = `${Tabs}/${string}`;
