import { getPathFromState, getStateFromPath } from '../core/matching.js';
import { buildRouteTree, type RouteContextMap } from '../core/route-tree.js';
import { router, setActiveController } from '../imperative-router.js';
import { createController } from './controller.js';
import { createNavigationStore } from './navigation-store.js';

const C = () => () => null;
function ctx(keys: string[]): RouteContextMap {
  const out: RouteContextMap = {};
  for (const key of keys) out[key] = { default: C() as never };
  return out;
}

const tree = buildRouteTree(
  ctx(['./app/_layout.tsx', './app/index.tsx', './app/posts/[id].tsx', './app/about.tsx']),
);

function setup(basePath = '') {
  const store = createNavigationStore(getStateFromPath('/', tree).state);
  const controller = createController(store, tree, { basePath });
  return { store, controller };
}

describe('createController', () => {
  it('pushes, replaces and navigates', () => {
    const { store, controller } = setup();
    controller.push('/posts/1');
    expect(getPathFromState(store.getState())).toBe('/posts/1');
    controller.push('/posts/2');
    controller.replace('/posts/3');
    expect(getPathFromState(store.getState())).toBe('/posts/3');
    controller.back();
    expect(getPathFromState(store.getState())).toBe('/posts/1');
  });

  it('accepts object hrefs and a params argument', () => {
    const { store, controller } = setup();
    controller.push({ pathname: '/posts/[id]', params: { id: 9 } });
    expect(getPathFromState(store.getState())).toBe('/posts/9');
    controller.navigate('/posts/[id]', { id: 10 });
    expect(getPathFromState(store.getState())).toBe('/posts/10');
    // Object href merged with an extra params argument.
    controller.push({ pathname: '/posts/[id]', params: { id: 11 } }, { ref: 'a' });
    expect(getPathFromState(store.getState())).toBe('/posts/11?ref=a');
  });

  it('keeps navigation state base-path-relative', () => {
    const { store, controller } = setup('/app');
    controller.push('/about');
    // The base path affects the browser URL, not the internal state.
    expect(getPathFromState(store.getState())).toBe('/about');
    expect(controller.config.basePath).toBe('/app');
  });

  it('reports canGoBack and sets params', () => {
    const { store, controller } = setup();
    expect(controller.canGoBack()).toBe(false);
    controller.push('/posts/1');
    expect(controller.canGoBack()).toBe(true);
    controller.setParams({ ref: 'x' });
    expect(getPathFromState(store.getState())).toBe('/posts/1?ref=x');
  });
});

describe('global router', () => {
  it('throws when no controller is active', () => {
    setActiveController(null);
    expect(() => router.push('/x')).toThrow(/no active router/);
    expect(router.canGoBack()).toBe(false);
  });

  it('proxies to the active controller', () => {
    const { store, controller } = setup();
    setActiveController(controller);
    router.push('/posts/5');
    expect(getPathFromState(store.getState())).toBe('/posts/5');
    expect(router.canGoBack()).toBe(true);
    router.setParams({ a: '1' });
    router.navigate('/about');
    router.replace('/');
    router.back();
    setActiveController(null);
  });
});
