import { describe, expect, it } from 'vitest';
import { handleBack, navigationReducer } from './reducer.js';
import { createInitialState } from './state.js';
import type { NavigationAction, NavigationState } from './types.js';

let idCounter = 0;
const createId = () => `id-${++idCounter}`;
const now = () => 1000;

function makeState(overrides?: Partial<Parameters<typeof createInitialState>[0]>): NavigationState {
  idCounter = 0;
  return createInitialState(
    { tabs: ['home', 'search', 'profile'], initialTab: 'home', ...overrides },
    createId,
    now,
  );
}

function makeStateWithScreens(): NavigationState {
  idCounter = 0;
  return createInitialState(
    {
      tabs: ['home', 'search', 'profile'],
      initialTab: 'home',
      initialScreen: 'login',
      screenNames: ['login'],
    },
    createId,
    now,
  );
}

function dispatch(state: NavigationState, action: NavigationAction): NavigationState {
  return navigationReducer(state, action);
}

describe('navigationReducer', () => {
  describe('PUSH', () => {
    it('pushes a route onto the active tab stack', () => {
      const state = makeState();
      const next = dispatch(state, {
        type: 'PUSH',
        route: 'home/detail',
        params: { itemId: '1' },
        id: 'push-1',
        timestamp: 2000,
      });

      expect(next.tabs.home.stack).toHaveLength(2);
      expect(next.tabs.home.stack[1]).toEqual({
        id: 'push-1',
        route: 'home/detail',
        params: { itemId: '1' },
        timestamp: 2000,
      });
    });

    it('switches to the target tab when pushing a route belonging to a different tab', () => {
      const state = makeState();
      expect(state.activeTab).toBe('home');

      const next = dispatch(state, {
        type: 'PUSH',
        route: 'search/results',
        params: {},
        id: 'push-1',
        timestamp: 2000,
      });

      expect(next.activeTab).toBe('search');
      expect(next.tabs.search.stack).toHaveLength(2);
      expect(next.tabs.search.hasBeenActive).toBe(true);
    });

    it('returns same state when route does not belong to any tab', () => {
      const state = makeState();
      const next = dispatch(state, {
        type: 'PUSH',
        route: 'unknown/route',
        params: {},
        id: 'push-1',
        timestamp: 2000,
      });

      expect(next).toBe(state);
    });

    it('preserves other tab stacks when pushing', () => {
      const state = makeState();
      const searchStack = state.tabs.search.stack;

      const next = dispatch(state, {
        type: 'PUSH',
        route: 'home/detail',
        params: {},
        id: 'push-1',
        timestamp: 2000,
      });

      expect(next.tabs.search.stack).toBe(searchStack);
    });
  });

  describe('POP', () => {
    it('pops the top entry from the active tab stack', () => {
      let state = makeState();
      state = dispatch(state, {
        type: 'PUSH',
        route: 'home/detail',
        params: {},
        id: 'push-1',
        timestamp: 2000,
      });
      expect(state.tabs.home.stack).toHaveLength(2);

      const next = dispatch(state, { type: 'POP' });
      expect(next.tabs.home.stack).toHaveLength(1);
      expect(next.tabs.home.stack[0].route).toBe('home');
    });

    it('is a no-op when stack has only the root entry', () => {
      const state = makeState();
      expect(state.tabs.home.stack).toHaveLength(1);

      const next = dispatch(state, { type: 'POP' });
      expect(next).toBe(state);
    });
  });

  describe('POP_TO_ROOT', () => {
    it('resets the active tab stack to root only', () => {
      let state = makeState();
      state = dispatch(state, {
        type: 'PUSH',
        route: 'home/detail',
        params: {},
        id: 'push-1',
        timestamp: 2000,
      });
      state = dispatch(state, {
        type: 'PUSH',
        route: 'home/detail/comments',
        params: {},
        id: 'push-2',
        timestamp: 3000,
      });
      expect(state.tabs.home.stack).toHaveLength(3);

      const next = dispatch(state, { type: 'POP_TO_ROOT' });
      expect(next.tabs.home.stack).toHaveLength(1);
      expect(next.tabs.home.stack[0].route).toBe('home');
    });

    it('is a no-op when already at root', () => {
      const state = makeState();
      const next = dispatch(state, { type: 'POP_TO_ROOT' });
      expect(next).toBe(state);
    });
  });

  describe('REPLACE', () => {
    it('replaces the top entry of the active tab stack', () => {
      let state = makeState();
      state = dispatch(state, {
        type: 'PUSH',
        route: 'home/detail',
        params: { itemId: '1' },
        id: 'push-1',
        timestamp: 2000,
      });

      const next = dispatch(state, {
        type: 'REPLACE',
        route: 'home/detail',
        params: { itemId: '2' },
        id: 'replace-1',
        timestamp: 3000,
      });

      expect(next.tabs.home.stack).toHaveLength(2);
      expect(next.tabs.home.stack[1]).toEqual({
        id: 'replace-1',
        route: 'home/detail',
        params: { itemId: '2' },
        timestamp: 3000,
      });
    });

    it('can replace the root entry', () => {
      const state = makeState();
      const next = dispatch(state, {
        type: 'REPLACE',
        route: 'home',
        params: { query: 'test' },
        id: 'replace-1',
        timestamp: 2000,
      });

      expect(next.tabs.home.stack).toHaveLength(1);
      expect(next.tabs.home.stack[0].params).toEqual({ query: 'test' });
    });
  });

  describe('SWITCH_TAB', () => {
    it('switches the active tab', () => {
      const state = makeState();
      const next = dispatch(state, { type: 'SWITCH_TAB', tab: 'search' });

      expect(next.activeTab).toBe('search');
      expect(next.tabs.search.hasBeenActive).toBe(true);
    });

    it('preserves all tab stacks', () => {
      let state = makeState();
      state = dispatch(state, {
        type: 'PUSH',
        route: 'home/detail',
        params: {},
        id: 'push-1',
        timestamp: 2000,
      });

      const next = dispatch(state, { type: 'SWITCH_TAB', tab: 'search' });
      expect(next.tabs.home.stack).toHaveLength(2);
    });

    it('is a no-op when switching to the already active tab with no overlays', () => {
      const state = makeState();
      const next = dispatch(state, { type: 'SWITCH_TAB', tab: 'home' });
      expect(next).toBe(state);
    });

    it('clears overlays when switching tabs', () => {
      let state = makeState();
      state = dispatch(state, {
        type: 'OPEN_OVERLAY',
        route: 'share',
        params: {},
        id: 'overlay-1',
        timestamp: 2000,
      });
      expect(state.overlays).toHaveLength(1);

      const next = dispatch(state, { type: 'SWITCH_TAB', tab: 'search' });
      expect(next.overlays).toHaveLength(0);
      expect(next.activeTab).toBe('search');
    });

    it('clears overlays when tapping the same tab', () => {
      let state = makeState();
      state = dispatch(state, {
        type: 'OPEN_OVERLAY',
        route: 'login',
        params: {},
        id: 'overlay-1',
        timestamp: 2000,
      });
      expect(state.overlays).toHaveLength(1);

      const next = dispatch(state, { type: 'SWITCH_TAB', tab: 'home' });
      expect(next.overlays).toHaveLength(0);
      expect(next.activeTab).toBe('home');
    });

    it('returns same state for non-existent tab', () => {
      const state = makeState();
      const next = dispatch(state, { type: 'SWITCH_TAB', tab: 'nonexistent' });
      expect(next).toBe(state);
    });
  });

  describe('SWITCH_TAB_AND_RESET', () => {
    it('switches tab and resets its stack to root', () => {
      let state = makeState();
      // Push something onto search tab
      state = dispatch(state, { type: 'SWITCH_TAB', tab: 'search' });
      state = dispatch(state, {
        type: 'PUSH',
        route: 'search/results',
        params: {},
        id: 'push-1',
        timestamp: 2000,
      });
      expect(state.tabs.search.stack).toHaveLength(2);

      // Switch back to home then switch and reset search
      state = dispatch(state, { type: 'SWITCH_TAB', tab: 'home' });
      const next = dispatch(state, { type: 'SWITCH_TAB_AND_RESET', tab: 'search' });

      expect(next.activeTab).toBe('search');
      expect(next.tabs.search.stack).toHaveLength(1);
      expect(next.tabs.search.stack[0].route).toBe('search');
    });

    it('is a no-op when already on the tab at root with no overlays', () => {
      const state = makeState();
      const next = dispatch(state, { type: 'SWITCH_TAB_AND_RESET', tab: 'home' });
      expect(next).toBe(state);
    });

    it('clears overlays when switching and resetting tabs', () => {
      let state = makeState();
      state = dispatch(state, {
        type: 'OPEN_OVERLAY',
        route: 'share',
        params: {},
        id: 'overlay-1',
        timestamp: 2000,
      });

      const next = dispatch(state, { type: 'SWITCH_TAB_AND_RESET', tab: 'search' });
      expect(next.overlays).toHaveLength(0);
      expect(next.activeTab).toBe('search');
    });

    it('clears overlays when tapping the same tab at root', () => {
      let state = makeState();
      state = dispatch(state, {
        type: 'OPEN_OVERLAY',
        route: 'login',
        params: {},
        id: 'overlay-1',
        timestamp: 2000,
      });

      const next = dispatch(state, { type: 'SWITCH_TAB_AND_RESET', tab: 'home' });
      expect(next.overlays).toHaveLength(0);
      expect(next.activeTab).toBe('home');
    });

    it('returns same state for non-existent tab', () => {
      const state = makeState();
      const next = dispatch(state, { type: 'SWITCH_TAB_AND_RESET', tab: 'nonexistent' });
      expect(next).toBe(state);
    });
  });

  describe('OPEN_OVERLAY', () => {
    it('opens an overlay', () => {
      const state = makeState();
      const next = dispatch(state, {
        type: 'OPEN_OVERLAY',
        route: 'login',
        params: {},
        id: 'overlay-1',
        timestamp: 2000,
      });

      expect(next.overlays).toHaveLength(1);
      expect(next.overlays[0]).toEqual({
        id: 'overlay-1',
        route: 'login',
        params: {},
        timestamp: 2000,
      });
    });

    it('opens an overlay with params', () => {
      const state = makeState();
      const next = dispatch(state, {
        type: 'OPEN_OVERLAY',
        route: 'share',
        params: { url: 'https://example.com' },
        id: 'overlay-1',
        timestamp: 2000,
      });

      expect(next.overlays).toHaveLength(1);
      expect(next.overlays[0].route).toBe('share');
      expect(next.overlays[0].params).toEqual({ url: 'https://example.com' });
    });

    it('stacks overlays on top of each other', () => {
      let state = makeState();
      state = dispatch(state, {
        type: 'OPEN_OVERLAY',
        route: 'login',
        params: {},
        id: 'overlay-1',
        timestamp: 2000,
      });
      state = dispatch(state, {
        type: 'OPEN_OVERLAY',
        route: 'share',
        params: {},
        id: 'overlay-2',
        timestamp: 3000,
      });

      expect(state.overlays).toHaveLength(2);
      expect(state.overlays[0].route).toBe('login');
      expect(state.overlays[1].route).toBe('share');
    });
  });

  describe('CLOSE_OVERLAY', () => {
    it('closes the topmost overlay', () => {
      let state = makeState();
      state = dispatch(state, {
        type: 'OPEN_OVERLAY',
        route: 'login',
        params: {},
        id: 'overlay-1',
        timestamp: 2000,
      });
      state = dispatch(state, {
        type: 'OPEN_OVERLAY',
        route: 'share',
        params: {},
        id: 'overlay-2',
        timestamp: 3000,
      });

      const next = dispatch(state, { type: 'CLOSE_OVERLAY' });
      expect(next.overlays).toHaveLength(1);
      expect(next.overlays[0].route).toBe('login');
    });

    it('closes a specific overlay by route', () => {
      let state = makeState();
      state = dispatch(state, {
        type: 'OPEN_OVERLAY',
        route: 'login',
        params: {},
        id: 'overlay-1',
        timestamp: 2000,
      });
      state = dispatch(state, {
        type: 'OPEN_OVERLAY',
        route: 'share',
        params: {},
        id: 'overlay-2',
        timestamp: 3000,
      });

      const next = dispatch(state, { type: 'CLOSE_OVERLAY', route: 'login' });
      expect(next.overlays).toHaveLength(1);
      expect(next.overlays[0].route).toBe('share');
    });

    it('is a no-op when no overlays exist', () => {
      const state = makeState();
      const next = dispatch(state, { type: 'CLOSE_OVERLAY' });
      expect(next).toBe(state);
    });

    it('returns same state when specified route is not found', () => {
      let state = makeState();
      state = dispatch(state, {
        type: 'OPEN_OVERLAY',
        route: 'login',
        params: {},
        id: 'overlay-1',
        timestamp: 2000,
      });

      const next = dispatch(state, { type: 'CLOSE_OVERLAY', route: 'nonexistent' });
      expect(next).toBe(state);
    });
  });

  describe('GO_BACK', () => {
    it('closes the topmost overlay first', () => {
      let state = makeState();
      state = dispatch(state, {
        type: 'OPEN_OVERLAY',
        route: 'login',
        params: {},
        id: 'overlay-1',
        timestamp: 2000,
      });

      const next = dispatch(state, { type: 'GO_BACK' });
      expect(next.overlays).toHaveLength(0);
    });

    it('pops the stack when no overlays exist', () => {
      let state = makeState();
      state = dispatch(state, {
        type: 'PUSH',
        route: 'home/detail',
        params: {},
        id: 'push-1',
        timestamp: 2000,
      });

      const next = dispatch(state, { type: 'GO_BACK' });
      expect(next.tabs.home.stack).toHaveLength(1);
    });

    it('is a no-op at the root of a tab with no overlays', () => {
      const state = makeState();
      const next = dispatch(state, { type: 'GO_BACK' });
      // handleBack returns handled: false, state unchanged
      expect(next.tabs.home.stack).toHaveLength(1);
    });

    it('respects priority: overlay > stack', () => {
      let state = makeState();
      // Push a stack entry
      state = dispatch(state, {
        type: 'PUSH',
        route: 'home/detail',
        params: {},
        id: 'push-1',
        timestamp: 2000,
      });
      // Open an overlay
      state = dispatch(state, {
        type: 'OPEN_OVERLAY',
        route: 'login',
        params: {},
        id: 'overlay-1',
        timestamp: 3000,
      });

      // GO_BACK should close overlay first
      let next = dispatch(state, { type: 'GO_BACK' });
      expect(next.overlays).toHaveLength(0);
      expect(next.tabs.home.stack).toHaveLength(2); // stack untouched

      // GO_BACK again should pop stack
      next = dispatch(next, { type: 'GO_BACK' });
      expect(next.tabs.home.stack).toHaveLength(1);
    });
  });

  describe('RESTORE_TO_ENTRY', () => {
    it('restores to a stack entry in the active tab', () => {
      let state = makeState();
      const rootId = state.tabs.home.stack[0].id;

      state = dispatch(state, {
        type: 'PUSH',
        route: 'home/detail',
        params: {},
        id: 'push-1',
        timestamp: 2000,
      });
      state = dispatch(state, {
        type: 'PUSH',
        route: 'home/detail/comments',
        params: {},
        id: 'push-2',
        timestamp: 3000,
      });

      // Restore to the root entry
      const next = dispatch(state, { type: 'RESTORE_TO_ENTRY', entryId: rootId });
      expect(next.tabs.home.stack).toHaveLength(1);
      expect(next.tabs.home.stack[0].id).toBe(rootId);
      expect(next.overlays).toHaveLength(0);
    });

    it('restores to a stack entry in a different tab', () => {
      let state = makeState();
      // Push onto search
      state = dispatch(state, {
        type: 'PUSH',
        route: 'search/results',
        params: {},
        id: 'search-push',
        timestamp: 2000,
      });
      // Switch back to home
      state = dispatch(state, { type: 'SWITCH_TAB', tab: 'home' });

      // Restore to the search entry
      const next = dispatch(state, { type: 'RESTORE_TO_ENTRY', entryId: 'search-push' });
      expect(next.activeTab).toBe('search');
      expect(next.tabs.search.stack).toHaveLength(2);
    });

    it('restores to an overlay entry', () => {
      let state = makeState();
      state = dispatch(state, {
        type: 'OPEN_OVERLAY',
        route: 'login',
        params: {},
        id: 'overlay-1',
        timestamp: 2000,
      });
      state = dispatch(state, {
        type: 'OPEN_OVERLAY',
        route: 'share',
        params: {},
        id: 'overlay-2',
        timestamp: 3000,
      });

      // Restore to the first overlay
      const next = dispatch(state, { type: 'RESTORE_TO_ENTRY', entryId: 'overlay-1' });
      expect(next.overlays).toHaveLength(1);
      expect(next.overlays[0].id).toBe('overlay-1');
    });

    it('clears overlays when restoring to a stack entry', () => {
      let state = makeState();
      const rootId = state.tabs.home.stack[0].id;

      state = dispatch(state, {
        type: 'OPEN_OVERLAY',
        route: 'login',
        params: {},
        id: 'overlay-1',
        timestamp: 2000,
      });

      const next = dispatch(state, { type: 'RESTORE_TO_ENTRY', entryId: rootId });
      expect(next.overlays).toHaveLength(0);
    });

    it('falls back to initial tab root when entry is not found', () => {
      let state = makeState();
      state = dispatch(state, {
        type: 'PUSH',
        route: 'home/detail',
        params: {},
        id: 'push-1',
        timestamp: 2000,
      });

      const next = dispatch(state, { type: 'RESTORE_TO_ENTRY', entryId: 'nonexistent' });
      expect(next.activeTab).toBe('home');
      expect(next.tabs.home.stack).toHaveLength(1);
      expect(next.overlays).toHaveLength(0);
    });
  });

  describe('RESET_STATE', () => {
    it('replaces entire state with the provided state', () => {
      const state = makeState();
      const newState = makeState();
      newState.activeTab = 'search';
      newState.tabs.search.hasBeenActive = true;
      const next = dispatch(state, { type: 'RESET_STATE', state: newState });
      expect(next).toBe(newState);
      expect(next.activeTab).toBe('search');
    });
  });

  describe('SET_BADGE', () => {
    it('sets a badge value on a tab', () => {
      const state = makeState();
      const next = dispatch(state, { type: 'SET_BADGE', tab: 'home', badge: 5 });
      expect(next.badges.home).toBe(5);
    });

    it('sets a string badge', () => {
      const state = makeState();
      const next = dispatch(state, { type: 'SET_BADGE', tab: 'home', badge: 'new' });
      expect(next.badges.home).toBe('new');
    });

    it('clears a badge by setting undefined', () => {
      let state = makeState();
      state = dispatch(state, { type: 'SET_BADGE', tab: 'home', badge: 5 });
      const next = dispatch(state, { type: 'SET_BADGE', tab: 'home', badge: undefined });
      expect(next.badges.home).toBeUndefined();
    });
  });

  describe('PUSH_SCREEN', () => {
    it('pushes a route onto the screen stack', () => {
      const state = makeStateWithScreens();
      expect(state.screens).toHaveLength(1);

      const next = dispatch(state, {
        type: 'PUSH_SCREEN',
        route: 'login/signup',
        params: { from: 'login' },
        id: 'screen-push-1',
        timestamp: 2000,
      });

      expect(next.screens).toHaveLength(2);
      expect(next.screens[1]).toEqual({
        id: 'screen-push-1',
        route: 'login/signup',
        params: { from: 'login' },
        timestamp: 2000,
      });
      expect(next.activeLayer).toBe('screens');
    });
  });

  describe('POP_SCREEN', () => {
    it('pops the top entry from the screen stack', () => {
      let state = makeStateWithScreens();
      state = dispatch(state, {
        type: 'PUSH_SCREEN',
        route: 'login/signup',
        params: {},
        id: 'screen-push-1',
        timestamp: 2000,
      });
      expect(state.screens).toHaveLength(2);

      const next = dispatch(state, { type: 'POP_SCREEN' });
      expect(next.screens).toHaveLength(1);
      expect(next.screens[0].route).toBe('login');
    });

    it('is a no-op when screen stack has only the root entry', () => {
      const state = makeStateWithScreens();
      expect(state.screens).toHaveLength(1);

      const next = dispatch(state, { type: 'POP_SCREEN' });
      expect(next).toBe(state);
    });
  });

  describe('NAVIGATE_TO_TABS', () => {
    it('switches activeLayer to tabs and clears screen stack', () => {
      const state = makeStateWithScreens();
      expect(state.activeLayer).toBe('screens');

      const next = dispatch(state, { type: 'NAVIGATE_TO_TABS' });
      expect(next.activeLayer).toBe('tabs');
      expect(next.screens).toEqual([]);
      expect(next.activeTab).toBe('home');
    });

    it('switches to a specific tab when tab is provided', () => {
      const state = makeStateWithScreens();
      const next = dispatch(state, { type: 'NAVIGATE_TO_TABS', tab: 'profile' });
      expect(next.activeLayer).toBe('tabs');
      expect(next.activeTab).toBe('profile');
      expect(next.tabs.profile.hasBeenActive).toBe(true);
    });

    it('ignores non-existent tab and uses current activeTab', () => {
      const state = makeStateWithScreens();
      const next = dispatch(state, { type: 'NAVIGATE_TO_TABS', tab: 'nonexistent' });
      expect(next.activeLayer).toBe('tabs');
      expect(next.activeTab).toBe('home');
    });
  });

  describe('NAVIGATE_TO_SCREEN', () => {
    it('switches activeLayer to screens and pushes screen entry', () => {
      let state = makeStateWithScreens();
      state = dispatch(state, { type: 'NAVIGATE_TO_TABS' });
      expect(state.activeLayer).toBe('tabs');

      const next = dispatch(state, {
        type: 'NAVIGATE_TO_SCREEN',
        route: 'login',
        params: {},
        id: 'screen-nav-1',
        timestamp: 3000,
      });
      expect(next.activeLayer).toBe('screens');
      expect(next.screens).toHaveLength(1);
      expect(next.screens[0].route).toBe('login');
      expect(next.overlays).toEqual([]);
    });

    it('clears overlays when navigating to screen', () => {
      let state = makeState();
      state = dispatch(state, {
        type: 'OPEN_OVERLAY',
        route: 'share',
        params: {},
        id: 'overlay-1',
        timestamp: 2000,
      });
      expect(state.overlays).toHaveLength(1);

      const next = dispatch(state, {
        type: 'NAVIGATE_TO_SCREEN',
        route: 'login',
        params: {},
        id: 'screen-nav-1',
        timestamp: 3000,
      });
      expect(next.overlays).toEqual([]);
      expect(next.activeLayer).toBe('screens');
    });
  });

  describe('GO_BACK with screen layer', () => {
    it('pops the screen stack when activeLayer is screens and no overlays', () => {
      let state = makeStateWithScreens();
      state = dispatch(state, {
        type: 'PUSH_SCREEN',
        route: 'login/signup',
        params: {},
        id: 'screen-push-1',
        timestamp: 2000,
      });

      const next = dispatch(state, { type: 'GO_BACK' });
      expect(next.screens).toHaveLength(1);
      expect(next.activeLayer).toBe('screens');
    });

    it('closes overlay before popping screen stack', () => {
      let state = makeStateWithScreens();
      state = dispatch(state, {
        type: 'OPEN_OVERLAY',
        route: 'share',
        params: {},
        id: 'overlay-1',
        timestamp: 2000,
      });

      const next = dispatch(state, { type: 'GO_BACK' });
      expect(next.overlays).toHaveLength(0);
      expect(next.screens).toHaveLength(1);
    });

    it('is unhandled at screen root with no overlays', () => {
      const state = makeStateWithScreens();
      expect(state.screens).toHaveLength(1);

      const result = handleBack(state);
      expect(result.handled).toBe(false);
    });
  });

  describe('RESTORE_TO_ENTRY with screen layer', () => {
    it('restores to a screen stack entry', () => {
      let state = makeStateWithScreens();
      const screenRootId = state.screens[0].id;
      state = dispatch(state, {
        type: 'PUSH_SCREEN',
        route: 'login/signup',
        params: {},
        id: 'screen-push-1',
        timestamp: 2000,
      });
      expect(state.screens).toHaveLength(2);

      const next = dispatch(state, { type: 'RESTORE_TO_ENTRY', entryId: screenRootId });
      expect(next.screens).toHaveLength(1);
      expect(next.screens[0].id).toBe(screenRootId);
      expect(next.activeLayer).toBe('screens');
      expect(next.overlays).toHaveLength(0);
    });
  });

  describe('immutability', () => {
    it('returns a new state object on changes', () => {
      const state = makeState();
      const next = dispatch(state, {
        type: 'PUSH',
        route: 'home/detail',
        params: {},
        id: 'push-1',
        timestamp: 2000,
      });

      expect(next).not.toBe(state);
      expect(next.tabs).not.toBe(state.tabs);
      expect(next.tabs.home).not.toBe(state.tabs.home);
      expect(next.tabs.home.stack).not.toBe(state.tabs.home.stack);
    });

    it('preserves unchanged tab references (structural sharing)', () => {
      const state = makeState();
      const next = dispatch(state, {
        type: 'PUSH',
        route: 'home/detail',
        params: {},
        id: 'push-1',
        timestamp: 2000,
      });

      // search and profile tabs should be the same reference
      expect(next.tabs.search).toBe(state.tabs.search);
      expect(next.tabs.profile).toBe(state.tabs.profile);
    });
  });
});

describe('handleBack', () => {
  it('closes topmost overlay first', () => {
    let state = makeState();
    state = dispatch(state, {
      type: 'OPEN_OVERLAY',
      route: 'login',
      params: {},
      id: 'overlay-1',
      timestamp: 2000,
    });

    const result = handleBack(state);
    expect(result.handled).toBe(true);
    expect(result.state.overlays).toHaveLength(0);
  });

  it('pops stack when no overlays', () => {
    let state = makeState();
    state = dispatch(state, {
      type: 'PUSH',
      route: 'home/detail',
      params: {},
      id: 'push-1',
      timestamp: 2000,
    });

    const result = handleBack(state);
    expect(result.handled).toBe(true);
    expect(result.state.tabs.home.stack).toHaveLength(1);
  });

  it('returns handled: false at tab root', () => {
    const state = makeState();
    const result = handleBack(state);
    expect(result.handled).toBe(false);
    expect(result.state).toBe(state);
  });
});
