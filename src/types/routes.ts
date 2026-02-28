import type { OverlayDef, StackDef, TabDef } from '../route-helpers.js';
import type { ScreenComponentProps } from './props.js';
import type { Serializable } from './serializable.js';

// --- Type inference utilities ---

// Extract path params: 'post-detail/:postId' -> { postId: string }
export type ExtractParams<T extends string> = T extends `${string}:${infer Param}/${infer Rest}`
  ? { [K in Param]: string } & ExtractParams<Rest>
  : T extends `${string}:${infer Param}`
    ? { [K in Param]: string }
    : // biome-ignore lint/complexity/noBannedTypes: empty object represents no params
      {};

// Infer overlay params from component's ScreenComponentProps props type
export type InferComponentParams<C> =
  C extends React.ComponentType<ScreenComponentProps<infer P>>
    ? P extends Record<string, Serializable>
      ? P
      : // biome-ignore lint/complexity/noBannedTypes: empty object represents no params
        {}
    : // biome-ignore lint/complexity/noBannedTypes: empty object represents no params
      {};

// Infer full RouteMap from definition arrays
export type InferRouteMap<
  TTabs extends TabDef[] = [],
  TModals extends OverlayDef[] = [],
  TSheets extends OverlayDef[] = [],
> = {
  // biome-ignore lint/complexity/noBannedTypes: empty object represents no params for tabs
  tabs: { [T in TTabs[number] as T['name']]: {} };
  stacks: InferStacksFromTabs<TTabs>;
  modals: { [D in TModals[number] as D['name']]: InferComponentParams<D['component']> };
  sheets: { [D in TSheets[number] as D['name']]: InferComponentParams<D['component']> };
};

// Infer stacks from tab definitions
type InferStacksFromTabs<T extends TabDef[]> = UnionToIntersection<
  {
    // biome-ignore lint/suspicious/noExplicitAny: infer pattern requires any for component type
    [I in keyof T]: T[I] extends TabDef<infer N extends string, any, infer S extends StackDef[]>
      ? S extends []
        ? never
        : { [SD in S[number] as `${N}/${SD['path']}`]: ExtractParams<SD['path']> }
      : never;
  }[number]
>;

// biome-ignore lint/suspicious/noExplicitAny: conditional type distribution requires any
type UnionToIntersection<U> = (U extends any ? (x: U) => void : never) extends (x: infer I) => void
  ? I
  : never;
