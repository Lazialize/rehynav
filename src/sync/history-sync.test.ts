import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createId } from '../core/id.js';
import { parseRoutePatterns } from '../core/path-params.js';
import { createInitialState } from '../core/state.js';
import type { NavigationStore } from '../store/navigation-store.js';
import { createNavigationStore } from '../store/navigation-store.js';
import { type HistorySyncConfig, HistorySyncManager } from './history-sync.js';

const defaultConfig = { tabs: ['home', 'search', 'profile'], initialTab: 'home' };

const defaultSyncConfig: HistorySyncConfig = {
  tabs: defaultConfig.tabs,
  initialTab: defaultConfig.initialTab,
  createId,
  now: Date.now,
};

function createTestStore(config = defaultConfig): NavigationStore {
  return createNavigationStore(createInitialState(config, createId, Date.now));
}

describe('HistorySyncManager', () => {
  let store: NavigationStore;
  let manager: HistorySyncManager;
  let pushStateSpy: ReturnType<typeof vi.spyOn>;
  let replaceStateSpy: ReturnType<typeof vi.spyOn>;
  let addEventSpy: ReturnType<typeof vi.spyOn>;
  let removeEventSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    store = createTestStore();
    manager = new HistorySyncManager(store, '/');

    pushStateSpy = vi.spyOn(window.history, 'pushState').mockImplementation(() => {});
    replaceStateSpy = vi.spyOn(window.history, 'replaceState').mockImplementation(() => {});
    vi.spyOn(window.history, 'go').mockImplementation(() => {});
    addEventSpy = vi.spyOn(window, 'addEventListener');
    removeEventSpy = vi.spyOn(window, 'removeEventListener');

    // Clear sessionStorage
    sessionStorage.clear();
  });

  afterEach(() => {
    manager.stop();
    vi.restoreAllMocks();
  });

  describe('start()', () => {
    it('should replaceState with initial state', () => {
      manager.start();

      expect(replaceStateSpy).toHaveBeenCalledTimes(1);
      const [historyState, , url] = replaceStateSpy.mock.calls[0];
      expect(url).toBe('/home');
      expect(historyState).toEqual(
        expect.objectContaining({
          activeTab: 'home',
          entryId: expect.any(String),
        }),
      );
    });

    it('should add popstate listener', () => {
      manager.start();
      expect(addEventSpy).toHaveBeenCalledWith('popstate', expect.any(Function));
    });

    it('should persist initial params to sessionStorage', () => {
      manager.start();
      const state = store.getState();
      const topEntry = state.tabs[state.activeTab].stack[0];
      const stored = sessionStorage.getItem(`rehynav:${topEntry.id}`);
      expect(stored).toBe(JSON.stringify(topEntry.params));
    });
  });

  describe('stop()', () => {
    it('should remove popstate listener', () => {
      manager.start();
      manager.stop();
      expect(removeEventSpy).toHaveBeenCalledWith('popstate', expect.any(Function));
    });

    it('should unsubscribe from store', () => {
      manager.start();

      // Reset after start
      pushStateSpy.mockClear();
      replaceStateSpy.mockClear();

      manager.stop();

      // Dispatch an action: nothing should happen in history
      store.dispatch({
        type: 'PUSH',
        route: 'home/detail',
        params: {},
        id: createId(),
        timestamp: Date.now(),
      });

      expect(pushStateSpy).not.toHaveBeenCalled();
      expect(replaceStateSpy).not.toHaveBeenCalled();
    });
  });

  describe('syncHistoryFromStateChange()', () => {
    it('should pushState when stack depth increases (PUSH action)', () => {
      manager.start();
      pushStateSpy.mockClear();

      store.dispatch({
        type: 'PUSH',
        route: 'home/detail',
        params: { id: '42' },
        id: createId(),
        timestamp: Date.now(),
      });

      expect(pushStateSpy).toHaveBeenCalledTimes(1);
      const [historyState, , url] = pushStateSpy.mock.calls[0];
      expect(url).toBe('/home/detail?id=42');
      expect(historyState.activeTab).toBe('home');
    });

    it('should replaceState when depth stays same (REPLACE action)', () => {
      manager.start();
      replaceStateSpy.mockClear();

      store.dispatch({
        type: 'REPLACE',
        route: 'home/other',
        params: {},
        id: createId(),
        timestamp: Date.now(),
      });

      expect(replaceStateSpy).toHaveBeenCalledTimes(1);
      const [, , url] = replaceStateSpy.mock.calls[0];
      expect(url).toBe('/home/other');
    });

    it('should go back when stack depth decreases (POP action)', () => {
      manager.start();

      // Push first to increase depth
      store.dispatch({
        type: 'PUSH',
        route: 'home/detail',
        params: {},
        id: createId(),
        timestamp: Date.now(),
      });

      const goSpy = vi.spyOn(window.history, 'go');

      store.dispatch({ type: 'POP' });

      expect(goSpy).toHaveBeenCalledWith(-1);
    });

    it('should replaceState on tab switch (tabs are parallel, not sequential)', () => {
      manager.start();
      replaceStateSpy.mockClear();

      store.dispatch({ type: 'SWITCH_TAB', tab: 'search' });

      expect(replaceStateSpy).toHaveBeenCalledTimes(1);
      const [historyState, , url] = replaceStateSpy.mock.calls[0];
      expect(url).toBe('/search');
      expect(historyState.activeTab).toBe('search');
      expect(pushStateSpy).not.toHaveBeenCalled();
    });

    it('should replaceState on tab switch even when switching to deeper stack', () => {
      manager.start();

      // Push a screen onto search tab (via PUSH which also switches tab)
      store.dispatch({
        type: 'PUSH',
        route: 'search/detail',
        params: {},
        id: createId(),
        timestamp: Date.now(),
      });

      // Switch back to home (shallower stack)
      store.dispatch({ type: 'SWITCH_TAB', tab: 'home' });

      replaceStateSpy.mockClear();
      pushStateSpy.mockClear();

      // Switch to search (deeper stack) - should replaceState, not pushState or go()
      store.dispatch({ type: 'SWITCH_TAB', tab: 'search' });

      expect(replaceStateSpy).toHaveBeenCalledTimes(1);
      const [historyState] = replaceStateSpy.mock.calls[0];
      expect(historyState.activeTab).toBe('search');
      expect(pushStateSpy).not.toHaveBeenCalled();
    });

    it('should preserve tab stacks during tab switching', () => {
      manager.start();

      // Push onto Home stack
      store.dispatch({
        type: 'PUSH',
        route: 'home/detail',
        params: { id: '1' },
        id: createId(),
        timestamp: Date.now(),
      });

      // Switch to Search
      store.dispatch({ type: 'SWITCH_TAB', tab: 'search' });

      // Home stack should still have 2 entries
      const state = store.getState();
      expect(state.tabs.home.stack).toHaveLength(2);
      expect(state.tabs.home.stack[1].route).toBe('home/detail');
      expect(state.activeTab).toBe('search');
    });
  });

  describe('handlePopState()', () => {
    it('should dispatch RESTORE_TO_ENTRY when popstate fires with valid state', () => {
      manager.start();

      // Push to get a second entry
      store.dispatch({
        type: 'PUSH',
        route: 'home/detail',
        params: {},
        id: createId(),
        timestamp: Date.now(),
      });

      const initialState = store.getState();
      const rootEntryId = initialState.tabs.home.stack[0].id;

      const dispatchSpy = vi.spyOn(store, 'dispatch');

      // Simulate popstate
      const event = new PopStateEvent('popstate', {
        state: { entryId: rootEntryId, activeTab: 'home', tabStacks: {} },
      });
      window.dispatchEvent(event);

      expect(dispatchSpy).toHaveBeenCalledWith({
        type: 'RESTORE_TO_ENTRY',
        entryId: rootEntryId,
      });
    });

    it('should ignore popstate with null state', () => {
      manager.start();

      const dispatchSpy = vi.spyOn(store, 'dispatch');
      dispatchSpy.mockClear();

      const event = new PopStateEvent('popstate', { state: null });
      window.dispatchEvent(event);

      expect(dispatchSpy).not.toHaveBeenCalled();
    });

    it('should ignore popstate when isSyncing (programmatic go)', () => {
      manager.start();

      // Push to increase depth
      store.dispatch({
        type: 'PUSH',
        route: 'home/detail',
        params: {},
        id: createId(),
        timestamp: Date.now(),
      });

      const rootEntryId = store.getState().tabs.home.stack[0].id;

      // POP triggers go(-1) which sets isSyncing=true
      store.dispatch({ type: 'POP' });

      // At this point isSyncing is true (go is mocked, no actual popstate)
      const dispatchSpy = vi.spyOn(store, 'dispatch');
      dispatchSpy.mockClear();

      // Simulate the popstate that would fire from go(-1)
      const event = new PopStateEvent('popstate', {
        state: { entryId: rootEntryId, activeTab: 'home', tabStacks: {} },
      });
      window.dispatchEvent(event);

      // handlePopState should skip because isSyncing is true
      expect(dispatchSpy).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'RESTORE_TO_ENTRY' }),
      );
    });
  });

  describe('createHistoryState()', () => {
    it('should create history state with entryId, activeTab, and tabStacks', () => {
      const state = store.getState();
      const result = manager.createHistoryState(state);

      expect(result.entryId).toBe(state.tabs.home.stack[0].id);
      expect(result.activeTab).toBe('home');
      expect(result.tabStacks).toEqual({
        home: ['home'],
        search: ['search'],
        profile: ['profile'],
      });
    });
  });

  describe('getTotalDepth()', () => {
    it('should return stack length + overlays length', () => {
      const state = store.getState();
      expect(manager.getTotalDepth(state)).toBe(1); // just root entry

      // Push a screen
      store.dispatch({
        type: 'PUSH',
        route: 'home/detail',
        params: {},
        id: createId(),
        timestamp: Date.now(),
      });
      expect(manager.getTotalDepth(store.getState())).toBe(2);

      // Open overlay
      store.dispatch({
        type: 'OPEN_OVERLAY',
        route: 'login',
        params: {},
        id: createId(),
        timestamp: Date.now(),
      });
      expect(manager.getTotalDepth(store.getState())).toBe(3);
    });
  });

  describe('getTopEntry()', () => {
    it('should return top stack entry when no overlays', () => {
      const state = store.getState();
      const topEntry = manager.getTopEntry(state);
      expect(topEntry.route).toBe('home');
    });

    it('should return top overlay when overlays exist', () => {
      store.dispatch({
        type: 'OPEN_OVERLAY',
        route: 'settings',
        params: {},
        id: createId(),
        timestamp: Date.now(),
      });
      const topEntry = manager.getTopEntry(store.getState());
      expect(topEntry.route).toBe('settings');
    });
  });

  describe('persistParams()', () => {
    it('should save params to sessionStorage', () => {
      manager.persistParams('entry-1', { foo: 'bar' });
      const stored = sessionStorage.getItem('rehynav:entry-1');
      expect(stored).toBe(JSON.stringify({ foo: 'bar' }));
    });

    it('should not throw when sessionStorage fails', () => {
      // Override sessionStorage with a throwing implementation
      const originalSetItem = sessionStorage.setItem.bind(sessionStorage);
      sessionStorage.setItem = () => {
        throw new Error('QuotaExceeded');
      };
      try {
        expect(() => manager.persistParams('entry-1', { foo: 'bar' })).not.toThrow();
      } finally {
        sessionStorage.setItem = originalSetItem;
      }
    });
  });

  describe('overlay depth tracking', () => {
    it('should pushState for overlay open and go back for overlay close', () => {
      manager.start();
      pushStateSpy.mockClear();

      store.dispatch({
        type: 'OPEN_OVERLAY',
        route: 'details-sheet',
        params: {},
        id: createId(),
        timestamp: Date.now(),
      });

      expect(pushStateSpy).toHaveBeenCalledTimes(1);

      const goSpy = vi.spyOn(window.history, 'go');
      store.dispatch({ type: 'CLOSE_OVERLAY' });
      expect(goSpy).toHaveBeenCalledWith(-1);
    });
  });

  describe('tab switch with overlays', () => {
    it('should go back silently (replaceState) when tab switch closes overlays', () => {
      manager.start();

      // Open an overlay
      store.dispatch({
        type: 'OPEN_OVERLAY',
        route: 'details-sheet',
        params: {},
        id: createId(),
        timestamp: Date.now(),
      });

      const goSpy = vi.spyOn(window.history, 'go');
      pushStateSpy.mockClear();

      // Switch tab — should close overlay and replaceState (not push)
      store.dispatch({ type: 'SWITCH_TAB', tab: 'search' });

      // Should go back by 1 (overlay delta) then replaceState (via goBackSilently)
      expect(goSpy).toHaveBeenCalledWith(-1);
      // pushState should NOT be called (tab switch uses replace, not push)
      expect(pushStateSpy).not.toHaveBeenCalled();
    });

    it('should go back by overlay count silently for multiple overlays', () => {
      manager.start();

      // Open two overlays
      store.dispatch({
        type: 'OPEN_OVERLAY',
        route: 'sheet-1',
        params: {},
        id: createId(),
        timestamp: Date.now(),
      });
      store.dispatch({
        type: 'OPEN_OVERLAY',
        route: 'modal-1',
        params: {},
        id: createId(),
        timestamp: Date.now(),
      });

      const goSpy = vi.spyOn(window.history, 'go');
      pushStateSpy.mockClear();

      // Switch tab — should close both overlays
      store.dispatch({ type: 'SWITCH_TAB', tab: 'search' });

      expect(goSpy).toHaveBeenCalledWith(-2);
      expect(pushStateSpy).not.toHaveBeenCalled();
    });
  });

  describe('non-linear routing scenarios', () => {
    it('should not corrupt state when switching from deep tab to shallow tab', () => {
      manager.start();

      // Push onto Home stack (depth 1 → 2)
      store.dispatch({
        type: 'PUSH',
        route: 'home/detail',
        params: {},
        id: createId(),
        timestamp: Date.now(),
      });

      // Switch to Search (which has stack depth 1)
      // This should replaceState, NOT go() or pushState
      const goSpy = vi.spyOn(window.history, 'go');
      replaceStateSpy.mockClear();
      pushStateSpy.mockClear();

      store.dispatch({ type: 'SWITCH_TAB', tab: 'search' });

      expect(goSpy).not.toHaveBeenCalled();
      expect(pushStateSpy).not.toHaveBeenCalled();
      expect(replaceStateSpy).toHaveBeenCalledTimes(1);

      // Home stack should still have 2 entries
      const state = store.getState();
      expect(state.tabs.home.stack).toHaveLength(2);
      expect(state.tabs.home.stack[1].route).toBe('home/detail');
    });

    it('should handle full non-linear routing flow', () => {
      manager.start();

      // 1. Push onto Home: Home stack = [home, home/detail]
      store.dispatch({
        type: 'PUSH',
        route: 'home/detail',
        params: { id: '1' },
        id: createId(),
        timestamp: Date.now(),
      });

      // 2. Switch to Search
      store.dispatch({ type: 'SWITCH_TAB', tab: 'search' });

      // 3. Push onto Search: Search stack = [search, search/detail]
      store.dispatch({
        type: 'PUSH',
        route: 'search/detail',
        params: { id: '2' },
        id: createId(),
        timestamp: Date.now(),
      });

      // 4. Switch to Profile
      store.dispatch({ type: 'SWITCH_TAB', tab: 'profile' });

      // Verify all stacks are preserved
      const state = store.getState();
      expect(state.activeTab).toBe('profile');
      expect(state.tabs.home.stack).toHaveLength(2);
      expect(state.tabs.home.stack[1].route).toBe('home/detail');
      expect(state.tabs.search.stack).toHaveLength(2);
      expect(state.tabs.search.stack[1].route).toBe('search/detail');
      expect(state.tabs.profile.stack).toHaveLength(1);
    });

    it('should replaceState for SWITCH_TAB_AND_RESET', () => {
      manager.start();

      // Push onto search first
      store.dispatch({
        type: 'PUSH',
        route: 'search/detail',
        params: {},
        id: createId(),
        timestamp: Date.now(),
      });
      // Go back to home
      store.dispatch({ type: 'SWITCH_TAB', tab: 'home' });

      pushStateSpy.mockClear();
      replaceStateSpy.mockClear();
      const goSpy = vi.spyOn(window.history, 'go');

      // SWITCH_TAB_AND_RESET changes activeTab → should replaceState
      store.dispatch({ type: 'SWITCH_TAB_AND_RESET', tab: 'search' });

      expect(goSpy).not.toHaveBeenCalled();
      expect(pushStateSpy).not.toHaveBeenCalled();
      expect(replaceStateSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('browser forward after back (URL reconstruction)', () => {
    it('should reconstruct state from URL when entry not found after forward navigation', () => {
      const patterns = parseRoutePatterns([
        'home',
        'search',
        'search/post-detail/:postId',
        'profile',
      ]);

      // Start with a store where search stack is at root only
      // (simulating state after a back navigation that trimmed the stack)
      store = createTestStore();
      manager = new HistorySyncManager(store, '/', patterns, defaultSyncConfig);

      // Mock window.location to the forward URL the browser would show
      Object.defineProperty(window, 'location', {
        value: { pathname: '/search/post-detail/1', search: '' },
        writable: true,
        configurable: true,
      });

      manager.start();

      // Simulate browser forward: popstate with an entryId that no longer
      // exists (it was removed by a previous back navigation's stack trim)
      const event = new PopStateEvent('popstate', {
        state: {
          entryId: 'deleted-entry-id',
          activeTab: 'search',
          tabStacks: {
            home: ['home'],
            search: ['search', 'search/post-detail/:postId'],
            profile: ['profile'],
          },
        },
      });
      window.dispatchEvent(event);

      // State should be reconstructed from URL
      const state = store.getState();
      expect(state.activeTab).toBe('search');
      expect(state.tabs.search.stack).toHaveLength(2);
      expect(state.tabs.search.stack[1].route).toBe('search/post-detail/:postId');
      expect(state.tabs.search.stack[1].params.postId).toBe('1');
    });

    it('should update history entry with new IDs after reconstruction', () => {
      store = createTestStore();
      manager = new HistorySyncManager(store, '/', undefined, defaultSyncConfig);

      Object.defineProperty(window, 'location', {
        value: { pathname: '/search/detail', search: '' },
        writable: true,
        configurable: true,
      });

      manager.start();

      const replaceSpy = vi.mocked(window.history.replaceState);
      replaceSpy.mockClear();

      // Simulate forward with non-existent entry
      const event = new PopStateEvent('popstate', {
        state: {
          entryId: 'deleted-entry-id',
          activeTab: 'search',
          tabStacks: { home: ['home'], search: ['search', 'search/detail'], profile: ['profile'] },
        },
      });
      window.dispatchEvent(event);

      // replaceState should have been called to update history with new entry IDs
      expect(replaceSpy).toHaveBeenCalled();
    });

    it('should reconstruct to correct tab when forward navigates to non-initial tab', () => {
      store = createTestStore();
      manager = new HistorySyncManager(store, '/', undefined, defaultSyncConfig);

      Object.defineProperty(window, 'location', {
        value: { pathname: '/profile', search: '' },
        writable: true,
        configurable: true,
      });

      manager.start();

      const event = new PopStateEvent('popstate', {
        state: {
          entryId: 'deleted-entry-id',
          activeTab: 'profile',
          tabStacks: { home: ['home'], search: ['search'], profile: ['profile'] },
        },
      });
      window.dispatchEvent(event);

      const state = store.getState();
      expect(state.activeTab).toBe('profile');
    });
  });

  describe('with routePatterns', () => {
    const patterns = parseRoutePatterns(['home', 'home/post-detail/:postId', 'search', 'profile']);

    it('should generate URLs with path params embedded', () => {
      store = createTestStore();
      manager = new HistorySyncManager(store, '/', patterns);

      vi.spyOn(window.history, 'replaceState').mockImplementation(() => {});
      const localPushSpy = vi.spyOn(window.history, 'pushState').mockImplementation(() => {});

      manager.start();

      store.dispatch({
        type: 'PUSH',
        route: 'home/post-detail/:postId',
        params: { postId: '42' },
        id: createId(),
        timestamp: Date.now(),
      });

      expect(localPushSpy).toHaveBeenCalledTimes(1);
      const [, , url] = localPushSpy.mock.calls[0];
      expect(url).toBe('/home/post-detail/42');
    });

    it('should put non-path params in query string', () => {
      store = createTestStore();
      manager = new HistorySyncManager(store, '/', patterns);

      vi.spyOn(window.history, 'replaceState').mockImplementation(() => {});
      const localPushSpy = vi.spyOn(window.history, 'pushState').mockImplementation(() => {});

      manager.start();

      store.dispatch({
        type: 'PUSH',
        route: 'home/post-detail/:postId',
        params: { postId: '42', tab: 'comments' },
        id: createId(),
        timestamp: Date.now(),
      });

      expect(localPushSpy).toHaveBeenCalledTimes(1);
      const [, , url] = localPushSpy.mock.calls[0];
      expect(url).toBe('/home/post-detail/42?tab=comments');
    });

    it('should work normally for routes without path params', () => {
      store = createTestStore();
      manager = new HistorySyncManager(store, '/', patterns);

      const localReplaceSpy = vi.spyOn(window.history, 'replaceState').mockImplementation(() => {});

      manager.start();

      expect(localReplaceSpy).toHaveBeenCalledTimes(1);
      const [, , url] = localReplaceSpy.mock.calls[0];
      expect(url).toBe('/home');
    });
  });
});
