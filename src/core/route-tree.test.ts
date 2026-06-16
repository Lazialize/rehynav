import { buildRouteTree, findChild, parseDynamic, type RouteContextMap } from './route-tree.js';

const C = (name: string) => {
  const fn = () => null;
  Object.defineProperty(fn, 'name', { value: name });
  return fn;
};

function ctx(map: Record<string, () => unknown>): RouteContextMap {
  const out: RouteContextMap = {};
  for (const [key, component] of Object.entries(map)) {
    out[key] = { default: component as never };
  }
  return out;
}

describe('parseDynamic', () => {
  it('returns null for static names', () => {
    expect(parseDynamic('posts')).toBeNull();
    expect(parseDynamic('posts/detail')).toBeNull();
  });

  it('parses single dynamic segments', () => {
    expect(parseDynamic('[id]')).toEqual([{ name: 'id', deep: false }]);
    expect(parseDynamic('posts/[id]')).toEqual([{ name: 'id', deep: false }]);
  });

  it('parses deep dynamic segments', () => {
    expect(parseDynamic('[...rest]')).toEqual([{ name: 'rest', deep: true }]);
  });
});

describe('buildRouteTree', () => {
  it('builds a root layout with leaf screens', () => {
    const tree = buildRouteTree(
      ctx({
        './app/_layout.tsx': C('Root'),
        './app/index.tsx': C('Home'),
        './app/about.tsx': C('About'),
      }),
    );
    expect(tree.type).toBe('layout');
    expect(tree.name).toBe('');
    expect(tree.children.map((c) => c.name).sort()).toEqual(['about', 'index']);
    expect(tree.children.every((c) => c.type === 'screen')).toBe(true);
  });

  it('orders index first and dynamic routes after static', () => {
    const tree = buildRouteTree(
      ctx({
        './app/_layout.tsx': C('Root'),
        './app/[id].tsx': C('Dyn'),
        './app/about.tsx': C('About'),
        './app/index.tsx': C('Home'),
      }),
    );
    expect(tree.children.map((c) => c.name)).toEqual(['index', 'about', '[id]']);
  });

  it('nests layouts as navigator children', () => {
    const tree = buildRouteTree(
      ctx({
        './app/_layout.tsx': C('Root'),
        './app/(tabs)/_layout.tsx': C('Tabs'),
        './app/(tabs)/home.tsx': C('TabHome'),
        './app/(tabs)/profile.tsx': C('TabProfile'),
      }),
    );
    const tabs = findChild(tree, '(tabs)');
    expect(tabs?.type).toBe('layout');
    expect(tabs?.children.map((c) => c.name).sort()).toEqual(['home', 'profile']);
  });

  it('flattens directories without a layout into compound names', () => {
    const tree = buildRouteTree(
      ctx({
        './app/_layout.tsx': C('Root'),
        './app/posts/index.tsx': C('Posts'),
        './app/posts/[id].tsx': C('Post'),
      }),
    );
    expect(tree.children.map((c) => c.name).sort()).toEqual(['posts/[id]', 'posts/index']);
    const post = findChild(tree, 'posts/[id]');
    expect(post?.dynamic).toEqual([{ name: 'id', deep: false }]);
  });

  it('reads initialRouteName from a layout unstable_settings export', () => {
    const tree = buildRouteTree({
      './app/_layout.tsx': {
        default: C('Root') as never,
        unstable_settings: { initialRouteName: 'index' },
      },
      './app/index.tsx': { default: C('Home') as never },
    });
    expect(tree.initialRouteName).toBe('index');
  });

  it('synthesizes a root layout when none is provided', () => {
    const tree = buildRouteTree(ctx({ './app/index.tsx': C('Home') }));
    expect(tree.type).toBe('layout');
    expect(tree.component).toBeNull();
    expect(tree.children.map((c) => c.name)).toEqual(['index']);
  });

  it('ignores non-route files', () => {
    const tree = buildRouteTree(ctx({ './app/index.tsx': C('Home'), './app/styles.css': C('x') }));
    expect(tree.children.map((c) => c.name)).toEqual(['index']);
  });
});
