import { act, renderHook } from '@testing-library/react';
import type React from 'react';
import { describe, expect, it } from 'vitest';
import { createNavigationGuardRegistry } from '../core/navigation-guard.js';
import { navigationReducer } from '../core/reducer.js';
import { createInitialState } from '../core/state.js';
import type { NavigationAction, NavigationState } from '../core/types.js';
import type { NavigationStoreForHooks } from './context.js';
import { GuardRegistryContext, NavigationStoreContext } from './context.js';
import { useSheet } from './useSheet.js';

function createTestStore(initialState: NavigationState): NavigationStoreForHooks {
  let state = initialState;
  const listeners = new Set<() => void>();

  return {
    getState() {
      return state;
    },
    dispatch(action: NavigationAction) {
      state = navigationReducer(state, action);
      for (const listener of listeners) {
        listener();
      }
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getServerSnapshot() {
      return state;
    },
  };
}

let idCounter = 0;
function testCreateId(): string {
  return `test-sheet-id-${++idCounter}`;
}

function createWrapper(store: NavigationStoreForHooks) {
  const guardRegistry = createNavigationGuardRegistry();
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <NavigationStoreContext.Provider value={store}>
        <GuardRegistryContext.Provider value={guardRegistry}>
          {children}
        </GuardRegistryContext.Provider>
      </NavigationStoreContext.Provider>
    );
  };
}

describe('useSheet', () => {
  it('initially isOpen is false and current is null', () => {
    const state = createInitialState(
      { tabs: ['home'], initialTab: 'home' },
      testCreateId,
      () => 1000,
    );
    const store = createTestStore(state);
    const wrapper = createWrapper(store);

    const { result } = renderHook(() => useSheet(), { wrapper });

    expect(result.current.isOpen).toBe(false);
    expect(result.current.current).toBeNull();
  });

  it('open dispatches OPEN_OVERLAY with type sheet', () => {
    const state = createInitialState(
      { tabs: ['home'], initialTab: 'home' },
      testCreateId,
      () => 1000,
    );
    const store = createTestStore(state);
    const wrapper = createWrapper(store);

    const { result } = renderHook(() => useSheet(), { wrapper });

    act(() => {
      result.current.open('action-sheet', { items: 'share,copy' });
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.current).toBe('action-sheet');

    const overlays = store.getState().overlays;
    expect(overlays).toHaveLength(1);
    expect(overlays[0].type).toBe('sheet');
    expect(overlays[0].route).toBe('action-sheet');
    expect(overlays[0].params).toEqual({ items: 'share,copy' });
  });

  it('open with no params defaults to empty object', () => {
    const state = createInitialState(
      { tabs: ['home'], initialTab: 'home' },
      testCreateId,
      () => 1000,
    );
    const store = createTestStore(state);
    const wrapper = createWrapper(store);

    const { result } = renderHook(() => useSheet(), { wrapper });

    act(() => {
      result.current.open('simple-sheet');
    });

    expect(store.getState().overlays[0].params).toEqual({});
  });

  it('close removes the topmost overlay', () => {
    const state = createInitialState(
      { tabs: ['home'], initialTab: 'home' },
      testCreateId,
      () => 1000,
    );
    const store = createTestStore(state);
    const wrapper = createWrapper(store);

    const { result } = renderHook(() => useSheet(), { wrapper });

    act(() => {
      result.current.open('my-sheet');
    });
    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.close();
    });
    expect(result.current.isOpen).toBe(false);
    expect(result.current.current).toBeNull();
    expect(store.getState().overlays).toHaveLength(0);
  });

  it('close with name removes specific overlay', () => {
    const state = createInitialState(
      { tabs: ['home'], initialTab: 'home' },
      testCreateId,
      () => 1000,
    );
    const store = createTestStore(state);
    const wrapper = createWrapper(store);

    const { result } = renderHook(() => useSheet(), { wrapper });

    act(() => {
      result.current.open('sheet-a');
      result.current.open('sheet-b');
    });

    expect(store.getState().overlays).toHaveLength(2);

    act(() => {
      result.current.close('sheet-a');
    });

    expect(store.getState().overlays).toHaveLength(1);
    expect(store.getState().overlays[0].route).toBe('sheet-b');
  });

  it('current tracks the last sheet, ignoring modals', () => {
    const state = createInitialState(
      { tabs: ['home'], initialTab: 'home' },
      testCreateId,
      () => 1000,
    );
    const store = createTestStore(state);
    const wrapper = createWrapper(store);

    const { result } = renderHook(() => useSheet(), { wrapper });

    // Open a modal overlay directly via store
    act(() => {
      store.dispatch({
        type: 'OPEN_OVERLAY',
        overlayType: 'modal',
        route: 'my-modal',
        params: {},
        id: 'modal-1',
        timestamp: 1000,
      });
    });

    // useSheet should not see the modal
    expect(result.current.isOpen).toBe(false);
    expect(result.current.current).toBeNull();

    // Now open a sheet
    act(() => {
      result.current.open('my-sheet');
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.current).toBe('my-sheet');
  });

  it('throws when used outside provider', () => {
    expect(() => {
      renderHook(() => useSheet());
    }).toThrow('useNavigationStore must be used within NavigationProvider');
  });
});
