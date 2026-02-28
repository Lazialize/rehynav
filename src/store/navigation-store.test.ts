import { describe, expect, it, vi } from 'vitest';
import { createInitialState } from '../core/state.js';
import type { NavigationState } from '../core/types.js';
import { createNavigationStore } from './navigation-store.js';

let idCounter = 0;
const createId = () => `id-${++idCounter}`;
const now = () => 1000;

function makeState(): NavigationState {
  idCounter = 0;
  return createInitialState(
    { tabs: ['home', 'search', 'profile'], initialTab: 'home' },
    createId,
    now,
  );
}

describe('createNavigationStore', () => {
  it('creates a store with initial state', () => {
    const initial = makeState();
    const store = createNavigationStore(initial);

    expect(store.getState()).toBe(initial);
  });

  it('getState returns current state', () => {
    const initial = makeState();
    const store = createNavigationStore(initial);

    expect(store.getState().activeTab).toBe('home');
    expect(store.getState().tabOrder).toEqual(['home', 'search', 'profile']);
  });

  it('dispatch updates state via reducer', () => {
    const initial = makeState();
    const store = createNavigationStore(initial);

    store.dispatch({
      type: 'PUSH',
      route: 'home/detail',
      params: { itemId: '1' },
      id: 'push-1',
      timestamp: 2000,
    });

    const state = store.getState();
    expect(state).not.toBe(initial);
    expect(state.tabs.home.stack).toHaveLength(2);
    expect(state.tabs.home.stack[1].route).toBe('home/detail');
  });

  it('dispatch does NOT notify listeners when state is unchanged', () => {
    const initial = makeState();
    const store = createNavigationStore(initial);
    const listener = vi.fn();
    store.subscribe(listener);

    // POP at root is a no-op — returns same reference
    store.dispatch({ type: 'POP' });

    expect(listener).not.toHaveBeenCalled();
    expect(store.getState()).toBe(initial);
  });

  it('subscribe/unsubscribe works correctly', () => {
    const initial = makeState();
    const store = createNavigationStore(initial);
    const listener = vi.fn();

    const unsubscribe = store.subscribe(listener);

    store.dispatch({
      type: 'PUSH',
      route: 'home/detail',
      params: {},
      id: 'push-1',
      timestamp: 2000,
    });
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();

    store.dispatch({
      type: 'PUSH',
      route: 'home/detail/comments',
      params: {},
      id: 'push-2',
      timestamp: 3000,
    });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('multiple listeners are all notified', () => {
    const initial = makeState();
    const store = createNavigationStore(initial);
    const listener1 = vi.fn();
    const listener2 = vi.fn();
    const listener3 = vi.fn();

    store.subscribe(listener1);
    store.subscribe(listener2);
    store.subscribe(listener3);

    store.dispatch({
      type: 'PUSH',
      route: 'home/detail',
      params: {},
      id: 'push-1',
      timestamp: 2000,
    });

    expect(listener1).toHaveBeenCalledTimes(1);
    expect(listener2).toHaveBeenCalledTimes(1);
    expect(listener3).toHaveBeenCalledTimes(1);
  });

  it('getServerSnapshot returns state', () => {
    const initial = makeState();
    const store = createNavigationStore(initial);

    expect(store.getServerSnapshot()).toBe(initial);

    store.dispatch({
      type: 'SWITCH_TAB',
      tab: 'search',
    });

    const updated = store.getState();
    expect(store.getServerSnapshot()).toBe(updated);
  });
});
