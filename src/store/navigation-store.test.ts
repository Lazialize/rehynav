import type { NavigatorState } from '../core/types.js';
import { createNavigationStore } from './navigation-store.js';

function baseState(): NavigatorState {
  return {
    type: 'stack',
    key: 's',
    index: 0,
    routeNames: ['index'],
    routes: [{ key: 'a', name: 'index' }],
  };
}

describe('createNavigationStore', () => {
  it('notifies subscribers on state change', () => {
    const store = createNavigationStore(baseState());
    let calls = 0;
    const unsub = store.subscribe(() => {
      calls += 1;
    });
    store.dispatch({ type: 'NAVIGATE', target: baseState(), mode: 'push' });
    expect(calls).toBe(1);
    unsub();
    store.dispatch({ type: 'NAVIGATE', target: baseState(), mode: 'push' });
    expect(calls).toBe(1);
  });

  it('does not notify when the state reference is unchanged', () => {
    const store = createNavigationStore(baseState());
    let calls = 0;
    store.subscribe(() => {
      calls += 1;
    });
    store.dispatch({ type: 'BACK' }); // no-op at root
    expect(calls).toBe(0);
  });

  it('exposes a stable server snapshot', () => {
    const initial = baseState();
    const store = createNavigationStore(initial);
    store.dispatch({ type: 'NAVIGATE', target: baseState(), mode: 'push' });
    expect(store.getServerSnapshot()).toBe(initial);
    expect(store.getState()).not.toBe(initial);
  });
});
