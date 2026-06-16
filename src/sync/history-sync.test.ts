import { getStateFromPath } from '../core/matching.js';
import { buildRouteTree, type RouteContextMap } from '../core/route-tree.js';
import { createController } from '../store/controller.js';
import { createNavigationStore } from '../store/navigation-store.js';
import { HistorySync } from './history-sync.js';

const C = () => () => null;
function ctx(keys: string[]): RouteContextMap {
  const out: RouteContextMap = {};
  for (const key of keys) out[key] = { default: C() as never };
  return out;
}

const tree = buildRouteTree(ctx(['./app/_layout.tsx', './app/index.tsx', './app/posts/[id].tsx']));

function setup(basePath = '') {
  const store = createNavigationStore(getStateFromPath('/', tree).state);
  const controller = createController(store, tree, { basePath });
  const sync = new HistorySync(store, tree, { basePath });
  return { store, controller, sync };
}

describe('HistorySync', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('pushes a new history entry on forward navigation', () => {
    const { controller, sync } = setup();
    sync.start();
    expect(window.location.pathname).toBe('/');
    controller.push('/posts/1');
    expect(window.location.pathname).toBe('/posts/1');
    sync.stop();
  });

  it('restores saved state on popstate', () => {
    const { store, controller, sync } = setup();
    sync.start();
    controller.push('/posts/1');
    const savedState = store.getState();
    controller.push('/posts/2');
    expect(window.location.pathname).toBe('/posts/2');

    // Simulate the browser back button restoring the previous entry's state.
    window.history.replaceState(null, '', '/posts/1');
    window.dispatchEvent(new PopStateEvent('popstate', { state: { rehynav: savedState } }));
    expect(store.getState()).toBe(savedState);
    sync.stop();
  });

  it('rebuilds state from the URL when no saved state is present', () => {
    const { store, sync } = setup();
    sync.start();
    window.history.replaceState(null, '', '/posts/42');
    window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
    const active = store.getState().routes[store.getState().index];
    expect(active.name).toBe('posts/[id]');
    expect(active.params?.id).toBe('42');
    sync.stop();
  });

  it('applies the base path to the browser URL', () => {
    const { controller, sync } = setup('/app');
    sync.start();
    expect(window.location.pathname).toBe('/app');
    controller.push('/posts/1');
    expect(window.location.pathname).toBe('/app/posts/1');
    sync.stop();
  });

  it('does not echo a pushState while applying a popstate', () => {
    const { store, sync } = setup();
    sync.start();
    const target = getStateFromPath('/posts/7', tree).state;
    window.dispatchEvent(new PopStateEvent('popstate', { state: { rehynav: target } }));
    expect(store.getState()).toBe(target);
    sync.stop();
  });
});
