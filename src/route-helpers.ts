import type { ScreenOptions } from './store/screen-registry.js';

// --- Definition types (returned by helper functions) ---

export interface TabDef<
  N extends string = string,
  // biome-ignore lint/suspicious/noExplicitAny: generic constraint requires any for ComponentType
  C extends React.ComponentType<any> = React.ComponentType<any>,
  S extends StackDef[] = StackDef[],
> {
  readonly _tag: 'tab';
  readonly name: N;
  readonly component: C;
  readonly children: S;
}

export interface StackDef<
  P extends string = string,
  // biome-ignore lint/suspicious/noExplicitAny: generic constraint requires any for ComponentType
  C extends React.ComponentType<any> = React.ComponentType<any>,
> {
  readonly _tag: 'stack';
  readonly path: P;
  readonly component: C;
  readonly options?: ScreenOptions;
}

export interface OverlayDef<
  N extends string = string,
  // biome-ignore lint/suspicious/noExplicitAny: generic constraint requires any for ComponentType
  C extends React.ComponentType<any> = React.ComponentType<any>,
> {
  readonly _tag: 'overlay';
  readonly name: N;
  readonly component: C;
  readonly options?: ScreenOptions;
}

// --- Helper functions ---

export function tab<
  N extends string,
  // biome-ignore lint/suspicious/noExplicitAny: generic constraint requires any for ComponentType
  C extends React.ComponentType<any>,
  S extends StackDef[],
>(name: N, component: C, children?: [...S]): TabDef<N, C, S> {
  return {
    _tag: 'tab',
    name,
    component,
    children: (children ?? []) as S,
  };
}

export function stack<
  P extends string,
  // biome-ignore lint/suspicious/noExplicitAny: generic constraint requires any for ComponentType
  C extends React.ComponentType<any>,
>(path: P, component: C, options?: ScreenOptions): StackDef<P, C> {
  return { _tag: 'stack', path, component, options };
}

export function overlay<
  N extends string,
  // biome-ignore lint/suspicious/noExplicitAny: generic constraint requires any for ComponentType
  C extends React.ComponentType<any>,
>(name: N, component: C, options?: ScreenOptions): OverlayDef<N, C> {
  return { _tag: 'overlay', name, component, options };
}
