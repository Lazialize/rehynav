import { assertType, describe, it } from 'vitest';
import type { OverlayDef, StackDef, TabDef } from '../route-helpers.js';
import type { ScreenComponentProps } from './props.js';
import type { ExtractParams, InferComponentParams, InferRouteMap } from './routes.js';

describe('ExtractParams', () => {
  it('extracts single param', () => {
    assertType<{ postId: string }>({} as ExtractParams<'post-detail/:postId'>);
  });

  it('extracts multiple params', () => {
    assertType<{ userId: string } & { postId: string }>(
      {} as ExtractParams<':userId/posts/:postId'>,
    );
  });

  it('returns empty for no params', () => {
    // biome-ignore lint/complexity/noBannedTypes: testing empty params inference
    assertType<{}>({} as ExtractParams<'settings'>);
  });

  it('handles param followed by literal segment', () => {
    assertType<{ id: string }>({} as ExtractParams<':id/details'>);
  });
});

describe('InferComponentParams', () => {
  it('extracts params from ScreenComponentProps', () => {
    type C = React.FC<ScreenComponentProps<{ postId: string; title: string }>>;
    assertType<{ postId: string; title: string }>({} as InferComponentParams<C>);
  });

  it('returns empty for components without params', () => {
    type C = React.FC;
    // biome-ignore lint/complexity/noBannedTypes: testing empty params inference
    assertType<{}>({} as InferComponentParams<C>);
  });
});

describe('InferRouteMap', () => {
  it('infers tabs, stacks, modals, sheets from definitions', () => {
    type ShareSheetComponent = React.FC<ScreenComponentProps<{ postId: string; title: string }>>;
    type NoParamsComponent = React.FC;

    type Tabs = [
      TabDef<'home', NoParamsComponent, [StackDef<'post-detail/:postId', NoParamsComponent>]>,
      TabDef<'search', NoParamsComponent, []>,
    ];
    type Modals = [OverlayDef<'new-post', NoParamsComponent>];
    type Sheets = [OverlayDef<'share', ShareSheetComponent>];

    type Result = InferRouteMap<Tabs, Modals, Sheets>;

    // Tab names
    assertType<'home' | 'search'>({} as keyof Result['tabs']);
    // Stack routes with params
    assertType<{ postId: string }>({} as Result['stacks']['home/post-detail/:postId']);
    // Modal (no params)
    // biome-ignore lint/complexity/noBannedTypes: testing empty params inference
    assertType<{}>({} as Result['modals']['new-post']);
    // Sheet with params inferred from component
    assertType<{ postId: string; title: string }>({} as Result['sheets']['share']);
  });
});
